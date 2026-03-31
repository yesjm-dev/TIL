# 로드밸런서 (Load Balancer)

로드밸런서는 들어오는 트래픽을 여러 서버에 **분산**하여 특정 서버에 부하가 집중되는 것을 방지하는 장치(또는 소프트웨어)이다.
고가용성(HA), 확장성, 장애 대응의 핵심 인프라이다.

<br>

## 왜 필요한가?

서버가 1대일 때:
- 트래픽 증가 → 서버 과부하 → 장애
- 서버 다운 → 서비스 전체 중단 (SPOF)

로드밸런서를 두면:
```
Client → Load Balancer → Server A (정상)
                       → Server B (정상)
                       → Server C (장애) ← 트래픽 차단
```
- 트래픽을 분산하여 **각 서버의 부하를 줄임**
- 장애 서버를 자동으로 제외하여 **서비스 연속성 보장**

<br>

## L4 vs L7 로드밸런서

OSI 계층 기준으로 어느 레벨에서 트래픽을 분산하느냐에 따라 나뉜다.

### L4 로드밸런서 (Transport Layer)

**IP + Port** 기반으로 트래픽을 분산한다. 패킷의 내용(HTTP 헤더, URL 등)은 보지 않는다.

```
Client → L4 LB (10.0.0.100:443)
           ├── 10.0.0.1:8080 (TCP 연결 전달)
           ├── 10.0.0.2:8080
           └── 10.0.0.3:8080
```

- TCP/UDP 수준에서 동작
- 패킷을 열어보지 않으므로 **빠르고 오버헤드가 적음**
- 단순한 분산만 가능 (URL, 헤더 기반 라우팅 불가)

### L7 로드밸런서 (Application Layer)

**HTTP 헤더, URL 경로, 쿠키** 등 애플리케이션 레벨 정보를 기반으로 분산한다.

```
Client → L7 LB
           ├── /api/*    → API 서버 그룹
           ├── /static/* → 정적 파일 서버
           └── /admin/*  → 관리자 서버
```

- HTTP/HTTPS 요청을 파싱하여 라우팅
- URL, 헤더, 쿠키 기반 **세밀한 분산** 가능
- SSL 종료(Termination), 압축, 캐싱 등 부가 기능
- L4 대비 **오버헤드가 큼** (패킷 내용을 읽어야 하므로)

### L4 vs L7 비교

| 비교 | L4 | L7 |
|------|-----|-----|
| 동작 계층 | Transport (TCP/UDP) | Application (HTTP) |
| 분산 기준 | IP + Port | URL, 헤더, 쿠키 등 |
| 속도 | 빠름 | 상대적으로 느림 |
| SSL 처리 | 불가 (패스스루만 가능) | SSL Termination 가능 |
| 라우팅 유연성 | 낮음 | 높음 |
| 사용 사례 | TCP 기반 서비스, DB, 게임 | 웹 서비스, API 라우팅 |

<br>

## 로드밸런싱 알고리즘

### 정적 알고리즘 (서버 상태 무관)

| 알고리즘 | 설명 |
|----------|------|
| **Round Robin** | 순서대로 돌아가며 분배. 가장 단순 |
| **Weighted Round Robin** | 서버 성능에 따라 가중치 부여. 성능 좋은 서버에 더 많이 분배 |
| **IP Hash** | 클라이언트 IP의 해시값으로 서버 결정. 같은 클라이언트는 항상 같은 서버 |

### 동적 알고리즘 (서버 상태 반영)

| 알고리즘 | 설명 |
|----------|------|
| **Least Connections** | 현재 연결 수가 가장 적은 서버에 분배 |
| **Weighted Least Connections** | 가중치 + 최소 연결 수 조합 |
| **Least Response Time** | 응답 시간이 가장 빠른 서버에 분배 |

### 어떤 알고리즘을 선택할까?

| 상황 | 추천 |
|------|------|
| 서버 스펙이 동일하고 요청이 균일 | Round Robin |
| 서버 스펙이 다름 | Weighted Round Robin |
| 요청 처리 시간 편차가 큼 | Least Connections |
| 세션 유지가 필요 | IP Hash 또는 Sticky Session |

<br>

## 헬스체크 (Health Check)

로드밸런서가 뒤에 있는 서버의 상태를 **주기적으로 확인**하여, 장애 서버를 자동으로 제외한다.

### 헬스체크 방식

| 방식 | 설명 | 계층 |
|------|------|------|
| **TCP** | 포트 연결 가능 여부 확인 | L4 |
| **HTTP** | 특정 엔드포인트에 요청, 상태 코드 확인 (예: 200 OK) | L7 |
| **커스텀** | 애플리케이션의 DB 연결, 외부 의존성까지 확인 | L7 |

### 일반적인 설정

```
Health Check:
  Path: /health
  Interval: 30초
  Timeout: 5초
  Healthy threshold: 3회 연속 성공 → 정상
  Unhealthy threshold: 2회 연속 실패 → 제외
```

### Spring Boot 헬스체크 엔드포인트

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-actuator")
}
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      show-details: always
```

→ `GET /actuator/health` 로 헬스체크 가능

<br>

## SSL Termination

L7 로드밸런서에서 **SSL/TLS 암호화를 해제**하고, 뒤의 서버에는 평문(HTTP)으로 전달하는 방식이다.

```
Client ──HTTPS──→ LB (SSL 해제) ──HTTP──→ Server
```

### 장점
- 서버가 SSL 처리를 안 해도 됨 → **서버 부하 감소**
- 인증서 관리를 LB 한 곳에서 → **운영 편의성**
- LB에서 HTTP 내용을 읽을 수 있으므로 **L7 라우팅 가능**

### SSL Passthrough
LB가 암호화를 해제하지 않고 그대로 서버에 전달한다.
- 서버가 직접 SSL 처리
- L4 로드밸런서에서 사용
- End-to-End 암호화가 필요한 경우 (금융, 의료 등)

<br>

## Sticky Session (세션 고정)

같은 클라이언트의 요청을 **항상 같은 서버**로 보내는 기능이다.

### 왜 필요한가?
서버에 세션을 저장하는 경우, 다른 서버로 요청이 가면 세션을 찾을 수 없다.

```
요청 1: Client → Server A (세션 생성)
요청 2: Client → Server B (세션 없음 → 로그아웃됨!)
```

### 구현 방식
- **쿠키 기반**: LB가 응답에 서버 식별 쿠키를 삽입 (예: `AWSALB` 쿠키)
- **IP Hash**: 클라이언트 IP로 서버 결정

### 단점
- 특정 서버에 부하가 집중될 수 있음
- 해당 서버 장애 시 세션 유실

### 더 나은 대안
- **세션 외부 저장** (Redis, DB) → Sticky Session 불필요
- **토큰 기반 인증** (JWT) → 서버가 Stateless

<br>

## 트래픽 분산 구조

### 단일 LB

```
Client → LB → Server A
             → Server B
```

가장 기본적인 구조. LB 자체가 SPOF가 될 수 있다.

### Active-Standby LB

```
Client → Active LB (VIP) → Server A
         Standby LB (대기)  → Server B
```

Active LB 장애 시 Standby가 VIP를 인계받아 서비스 지속.

### 글로벌 분산 (DNS + LB)

```
Client → DNS (지역 기반 라우팅)
           ├── 서울 리전 → LB → Servers
           └── 도쿄 리전 → LB → Servers
```

DNS로 리전을 선택하고, 리전 내에서 LB로 트래픽 분산.

<br>

## AWS에서의 로드밸런서

| 서비스 | 계층 | 특징 |
|--------|------|------|
| **ALB** (Application LB) | L7 | HTTP/HTTPS, URL 기반 라우팅, WebSocket |
| **NLB** (Network LB) | L4 | TCP/UDP, 고성능, 고정 IP 지원 |
| **CLB** (Classic LB) | L4/L7 | 레거시, 신규 사용 비권장 |
| **GWLB** (Gateway LB) | L3 | 방화벽, IDS 등 네트워크 어플라이언스 앞단 |

### ALB vs NLB 선택 기준

| 상황 | 추천 |
|------|------|
| 웹 서비스, API 서버 | ALB |
| URL/경로 기반 라우팅 필요 | ALB |
| 고정 IP 필요 | NLB |
| 극한의 성능 (수백만 RPS) | NLB |
| TCP/UDP 기반 서비스 (게임, IoT) | NLB |
| gRPC | ALB (HTTP/2 지원) |
