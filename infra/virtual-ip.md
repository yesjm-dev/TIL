# VIP (Virtual IP)

VIP(Virtual IP)는 실제 물리적 네트워크 인터페이스에 직접 할당되지 않은 **가상의 IP 주소**이다.
여러 서버 앞에 하나의 대표 IP를 두고, 클라이언트는 이 VIP로만 요청하면 뒤에 있는 실제 서버로 트래픽이 분산되는 구조다.

<br>

## 왜 필요한가?

서버가 여러 대일 때 클라이언트가 특정 서버의 IP를 직접 알고 있으면:
- 해당 서버가 죽으면 **클라이언트가 직접 다른 IP로 변경**해야 함
- 서버 추가/제거 시마다 **클라이언트 설정을 변경**해야 함
- 트래픽 분산이 불가능

VIP를 사용하면 클라이언트는 **하나의 IP만 알면 되고**, 뒤에서 서버가 바뀌어도 영향을 받지 않는다.

```
클라이언트 → VIP (10.0.0.100)
                 ├── Server A (10.0.0.1)
                 ├── Server B (10.0.0.2)
                 └── Server C (10.0.0.3)
```

<br>

## 동작 방식

### 1. 로드밸런서 기반 (L4/L7)
가장 일반적인 방식이다. 로드밸런서가 VIP를 소유하고, 트래픽을 뒤의 실제 서버(Real Server)로 분산한다.

- **L4 (Transport Layer)**: IP + Port 기반으로 분산. TCP/UDP 수준에서 동작
- **L7 (Application Layer)**: HTTP 헤더, URL 경로 등 애플리케이션 레벨에서 분산

```
Client → VIP:443 (L4 LB) → Real Server A:8080
                          → Real Server B:8080
                          → Real Server C:8080
```

### 2. Floating IP 방식 (HA 구성)
Active-Standby 구성에서 Active 서버가 VIP를 점유하고, Active가 죽으면 Standby가 VIP를 인계받는다.

```
정상 상태:
  Active Server (VIP 보유) ← 클라이언트 요청
  Standby Server (대기)

장애 발생:
  Active Server (죽음)
  Standby Server (VIP 인계) ← 클라이언트 요청 (IP 변경 없음)
```

- **Keepalived** + **VRRP** 프로토콜로 구현하는 것이 일반적
- 클라이언트는 장애를 인지하지 못함 (같은 VIP로 계속 요청)

<br>

## VIP와 로드밸런싱 방식

| 방식 | 설명 | 특징 |
|------|------|------|
| **DSR (Direct Server Return)** | 응답을 로드밸런서를 거치지 않고 서버가 직접 클라이언트에 반환 | LB 부하 감소, 대용량 트래픽에 유리 |
| **NAT** | LB가 요청/응답 모두 중계, IP를 변환 | 구성이 단순, LB에 부하 집중 |
| **Proxy** | LB가 클라이언트와 서버 사이에서 TCP 연결을 각각 맺음 | L7 기능(헤더 조작 등) 가능, 오버헤드 있음 |

<br>

## Kubernetes에서의 VIP

### ClusterIP (Service)
Kubernetes의 Service는 내부적으로 **VIP(ClusterIP)**를 생성한다.
Pod이 여러 개여도 하나의 ClusterIP로 접근하면 kube-proxy가 트래픽을 분산한다.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

```
Client (Pod) → ClusterIP (VIP) → Pod A
                                → Pod B
                                → Pod C
```

### Ingress
외부 트래픽을 클러스터 내부 Service로 라우팅하는 L7 수준의 진입점이다.
도메인/경로 기반으로 여러 Service에 트래픽을 분배한다.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 80
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 80
```

### LoadBalancer (Service)
클라우드 환경에서 외부 VIP(공인 IP)를 자동 생성하여 외부 트래픽을 받는다.

```
외부 Client → External VIP (공인 IP) → NodePort → Pod
```

<br>

## AWS에서의 VIP

| 서비스 | VIP 역할 | 계층 |
|--------|----------|------|
| **ALB** (Application Load Balancer) | L7 로드밸런서, DNS 기반 VIP | HTTP/HTTPS |
| **NLB** (Network Load Balancer) | L4 로드밸런서, 고정 IP 할당 가능 | TCP/UDP |
| **EIP** (Elastic IP) | EC2에 연결 가능한 고정 공인 IP | L3 |

> AWS ALB는 고정 IP가 아닌 DNS로 접근한다. 고정 IP가 필요하면 NLB를 사용하거나 NLB + ALB 조합을 사용한다.

<br>

## VIP vs DNS 기반 로드밸런싱

| 비교 | VIP | DNS |
|------|-----|-----|
| 전환 속도 | 즉시 (IP 인계) | 느림 (TTL 만료 대기) |
| 클라이언트 캐싱 | 영향 없음 | DNS 캐시로 인해 지연 |
| 구현 복잡도 | 네트워크 레벨 설정 필요 | 간단 (DNS 레코드만 변경) |
| 헬스체크 | LB가 직접 수행 | DNS 서비스에 의존 |
| 적합한 상황 | 빠른 장애 전환, 실시간 트래픽 분산 | 글로벌 분산, CDN |
