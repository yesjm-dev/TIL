# 단일 장애 지점 (SPOF)과 고가용성(HA)
시스템이 안정적으로 운영되기 위해서는 일부 구성 요소에 장애가 발생하더라도 전체 서비스가 중단되지 않도록 설계되어야 한다.  
그렇지 못한 지점을 단일 장애 지점(SPOF, Single Point of Failure) 이라고 하며, 이를 제거하거나 완화하는 것이 고가용성(High Availability, HA) 설계의 핵심이다.

## 단일 장애 지점 (SPOF, Single Point of Failure)
시스템 구성 요소 중 하나라도 장애가 발생하면 전체 서비스가 중단되는 지점을 의미한다.  
ex: 
  - 하나의 웹 서버에 트래픽이 집중되어 그 서버가 죽으면 전체 서비스가 멈춤
  - 하나의 데이터베이스에만 의존하여 DB 장애 시 전체 시스템이 영향을 받음

즉, SPOF는 서비스의 가용성을 위협하는 가장 큰 요인이다.

## 가용성(Availability)
가용성은 시스템이 정상적으로 동작할 수 있는 시간의 비율을 의미한다.   
예를 들어 1년(365일) 동안 1시간만 장애가 발생했다면  
`가용성 = (1년 - 다운된 시간) / 1년 = (8760 - 1) / 8760 = 99.988%`  
흔히 99.9%(Three-Nines), 99.99%(Four-Nines) 등의 수치로 표현된다.  
높은 가용성을 유지하기 위해서는 하드웨어 장애, 네트워크 문제, 소프트웨어 오류 등 다양한 상황에 대비해야 한다.

## 고가용성을 달성하기 위한 방법
1. 이중화 (Redundancy)
   - 동일한 역할의 컴포넌트를 2개 이상 구성
   - 하나가 장애 나더라도 다른 인스턴스가 즉시 트래픽을 처리
   - ex) Active-Standby, Active-Active 구조

2. 로드 밸런싱 (Load Balancing)
   - 트래픽을 여러 서버로 분산
   - 특정 인스턴스가 다운되더라도 나머지가 처리 가능
   - ex) Nginx, AWS ALB, HAProxy

3. Failover & Health Check
   - 장애 발생 시 자동으로 대체 인스턴스로 전환
   - 주기적으로 상태 점검(health check)을 통해 비정상 노드 감지

4. 데이터 복제 (Replication)
   - DB나 스토리지의 데이터를 여러 노드에 복제
   - 한 노드 장애 시에도 데이터 손실 없이 서비스 지속 가능

5. 분산 시스템 설계
   - 단일 서버가 아닌, 수평적 확장 가능한 구조 설계
   - ex) Kafka cluster, Redis cluster, Elasticsearch node 구성 등

## 백엔드 관점에서 자주 발생하는 SPOF
|영역 | 문제 상황 |개선 방안
|--|--|--
|Auth 서버 | 로그인 서버 한 대만 운영 | 여러 Auth 서버 + Load Balancer
|DB | 단일 DB 인스턴스 | Replica 구성 + Failover
|Redis |캐시 서버 1대 |Redis Sentinel / Cluster
|Kafka |Broker 1대 구성 | 다중 Broker + Replication
|API Gateway | 단일 Gateway | Multi-instance 배포, Region 이중화

## 정리
- SPOF는 시스템의 가용성(Availability) 을 위협하는 주요 원인이다.
- HA(High Availability) 시스템을 구축하려면, SPOF를 제거하는 것이 핵심이다.
- 모든 구성 요소에 대해 `이 부분이 죽으면 서비스가 멈출까?`를 항상 고민해야 한다.


## 참고할 내용들
- https://alstn113.tistory.com/38
- https://hudi.blog/high-availability-architecture/
  