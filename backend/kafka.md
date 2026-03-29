# Apache Kafka

Apache Kafka는 LinkedIn에서 개발하고 Apache Software Foundation에 기부한 **분산 이벤트 스트리밍 플랫폼**이다.
대용량의 실시간 데이터를 높은 처리량(high throughput)과 낮은 지연(low latency)으로 전송·저장·처리할 수 있다.

</br>

## 왜 Kafka인가?

기존 메시징 시스템(RabbitMQ 등)은 주로 메시지 큐 방식으로 동작하지만, Kafka는 **로그 기반 메시지 브로커**로 설계되어 다음과 같은 차별점이 있다.

| 특성 | 전통적 메시지 큐 (RabbitMQ 등) | Kafka |
|------|-------------------------------|-------|
| 메시지 소비 후 | 삭제됨 | **보존됨** (retention 기간 동안) |
| 소비 방식 | Push (브로커 → 컨슈머) | **Pull** (컨슈머 → 브로커) |
| 처리량 | 중간 (수만 msg/s) | **매우 높음** (수백만 msg/s) |
| 재처리 | 불가 (DLQ로 우회) | **오프셋 리셋으로 재처리 가능** |
| 확장성 | 제한적 | **파티션 기반 수평 확장** |
| 메시지 라우팅 | 유연 (Exchange, Routing Key) | 단순 (Topic 기반) |
| 적합한 상황 | 작업 큐, 복잡한 라우팅 | 대용량 스트리밍, 이벤트 소싱 |

</br>

## 핵심 구성 요소

### 1. Topic
메시지가 발행되는 논리적 채널(카테고리)이다.
예: `order-created`, `user-signup`, `payment-completed`

### 2. Partition
Topic은 하나 이상의 **Partition**으로 나뉜다.
- 각 Partition은 순서가 보장되는 append-only 로그
- 메시지는 Partition 내에서만 순서 보장 (Topic 전체로는 보장되지 않음)
- Partition 수 = 병렬 처리의 단위

```
Topic: order-created
├── Partition 0: [msg0, msg1, msg2, msg3, ...]
├── Partition 1: [msg0, msg1, msg2, ...]
└── Partition 2: [msg0, msg1, ...]
```

### 3. Producer
메시지를 Topic에 발행하는 주체이다.
- 메시지의 Key를 기반으로 어떤 Partition에 보낼지 결정 (Key가 없으면 라운드로빈)
- 같은 Key의 메시지는 항상 같은 Partition으로 → **Key 단위 순서 보장**

#### 왜 같은 Key는 같은 Partition으로 보내야 하는가?
핵심 이유는 **순서 보장**이다. Kafka는 Partition 내에서만 순서를 보장하기 때문에, 논리적으로 순서가 중요한 메시지들은 반드시 같은 Partition에 있어야 한다.

예를 들어 주문 상태 변경 이벤트를 발행한다면:
```
Key: order-123
  → msg1: 주문 생성
  → msg2: 결제 완료
  → msg3: 배송 시작
```
이 메시지들이 서로 다른 Partition에 들어가면 각각 다른 Consumer가 처리할 수 있고, `배송 시작`이 `주문 생성`보다 먼저 처리되어 데이터 정합성이 깨질 수 있다.
같은 Key로 같은 Partition에 들어가면, 하나의 Consumer가 순서대로 처리하므로 정합성이 보장된다.

#### Partition 결정 방식
```
partition = hash(key) % partition 수
```
동일한 Key는 항상 같은 해시값을 가지므로 항상 같은 Partition으로 전송된다.

> **주의**: Partition 수가 변경되면 해시 결과가 달라져서 같은 Key라도 다른 Partition으로 갈 수 있다. 그래서 운영 중 Partition 수 변경은 신중해야 한다.

### 4. Consumer
Topic에서 메시지를 가져와 처리하는 주체이다.
- **Pull 방식**으로 동작: Consumer가 `poll()`을 호출하여 직접 메시지를 가져감
  - 자신의 처리 속도에 맞춰 가져오므로 **백프레셔(backpressure) 문제가 없음**
  - 배치로 한번에 여러 메시지를 가져올 수 있어 처리 효율이 높음
  - 메시지가 없을 때 불필요한 요청이 발생할 수 있지만, **Long Polling**으로 해결 (메시지가 올 때까지 일정 시간 대기 후 응답)
- **Offset**: Consumer가 현재 어디까지 읽었는지를 나타내는 위치 값

### 5. Consumer Group
같은 `group.id`를 가진 Consumer들의 집합이다.
- 각 Partition은 그룹 내 **하나의 Consumer에게만** 할당
- Consumer 수 > Partition 수이면 일부 Consumer는 놀게 됨
- Consumer 수 < Partition 수이면 하나의 Consumer가 여러 Partition을 담당

```
Consumer Group: order-service
├── Consumer A ← Partition 0, Partition 1
├── Consumer B ← Partition 2
└── Consumer C ← (idle, Partition이 부족)
```

### 6. Broker
Kafka 클러스터를 구성하는 개별 서버(노드)이다.
- 각 Broker는 여러 Partition의 데이터를 저장
- 클러스터 내 Broker끼리 데이터를 복제(replication)하여 장애에 대비

### 7. ZooKeeper / KRaft
- **ZooKeeper**: 기존에 클러스터 메타데이터 관리, 리더 선출 등을 담당
- **KRaft** (Kafka Raft): Kafka 3.x부터 ZooKeeper 없이 자체적으로 메타데이터를 관리하는 모드 (Kafka 4.0부터 ZooKeeper 완전 제거)

</br>

## Kafka가 빠른 이유

### 1. Sequential I/O
디스크에 순차적으로 쓰기 때문에 랜덤 I/O 대비 압도적으로 빠르다.
SSD뿐 아니라 HDD에서도 높은 성능을 낸다.

### 2. Page Cache
OS의 Page Cache를 활용하여 디스크 데이터를 메모리에서 직접 읽는다.
JVM Heap이 아닌 OS 레벨 캐시를 사용하므로 GC 영향을 받지 않는다.

### 3. Zero Copy
`sendfile()` 시스템 콜을 사용하여 커널 영역에서 직접 네트워크로 데이터를 전송한다.
User Space로 데이터를 복사하는 과정을 생략하므로 CPU와 메모리 사용이 줄어든다.

```
일반적인 전송: Disk → Kernel Buffer → User Buffer → Socket Buffer → NIC
Zero Copy:  Disk → Kernel Buffer ────────────────────────────→ NIC
```

### 4. Batch 처리
Producer와 Consumer 모두 메시지를 묶어서(batch) 처리한다.
네트워크 호출 횟수를 줄여 처리량을 극대화한다.

### 5. 압축
Producer에서 메시지를 압축(gzip, snappy, lz4, zstd)하여 전송하고, Broker는 압축된 채로 저장한다.
네트워크 대역폭과 디스크 사용량을 절감한다.

</br>

## 복제(Replication)와 장애 대응

### Leader & Follower
- 각 Partition에는 **Leader**와 하나 이상의 **Follower**가 있다
- 모든 읽기/쓰기는 Leader를 통해 수행 (Kafka 2.4+ 부터 Follower 읽기 지원)
- Follower는 Leader의 데이터를 지속적으로 복제

### ISR (In-Sync Replicas)
- Leader와 동기화가 완료된 Replica 집합
- Leader 장애 시 ISR 중 하나가 새 Leader로 선출
- ISR에서 벗어난 Replica는 리더 후보에서 제외 (데이터 유실 방지)

### Replication Factor
- `replication.factor=3`이면 동일 데이터가 3개의 Broker에 복제
- 일반적으로 **3**을 권장 (Broker 2대가 죽어도 데이터는 유실되지 않음)

### acks 설정 (Producer)
| 설정 | 의미 | 특징 |
|------|------|------|
| `acks=0` | 응답을 기다리지 않음 | 가장 빠름, 유실 가능 |
| `acks=1` | Leader 기록 완료 시 응답 | Leader 장애 시 유실 가능 |
| `acks=all` | 모든 ISR 기록 완료 시 응답 | 가장 안전, 지연 증가 |

</br>

## 메시지 전달 보장 (Delivery Semantics)

### At-most-once (최대 한 번)
- 메시지가 유실될 수 있지만 중복 처리는 없음
- `acks=0` 또는 Consumer가 처리 전에 offset commit

### At-least-once (최소 한 번)
- 메시지 유실은 없지만 중복 처리 가능
- `acks=all` + Consumer가 처리 후 offset commit
- **가장 일반적으로 사용되는 방식** (멱등성 처리와 함께)

### Exactly-once (정확히 한 번)
- 유실도 중복도 없음
- Kafka의 **Idempotent Producer** + **Transactional API**로 구현
- `enable.idempotence=true`, `transactional.id` 설정 필요

### At-least-once와 멱등성 처리

실무에서는 **At-least-once + Consumer 측 멱등성 보장**이 가장 일반적인 조합이다.
Exactly-once는 Kafka 내부(Kafka → Kafka) 에서만 보장되고, 외부 시스템(DB, API 등)까지 포함하면 결국 Consumer가 중복을 직접 처리해야 한다.

#### 왜 중복이 발생하는가?
```
1. Consumer가 메시지를 처리 (DB 저장 등)
2. Offset commit 전에 Consumer가 죽음
3. Rebalancing 후 다른 Consumer가 같은 메시지를 다시 받음
→ 동일한 메시지가 두 번 처리됨
```

#### 멱등성 처리 방법

**1. DB Unique Key (가장 단순하고 효과적)**
```kotlin
// 메시지에 포함된 고유 ID를 DB unique key로 활용
@Entity
@Table(
    uniqueConstraints = [UniqueConstraint(columnNames = ["orderId"])]
)
data class Payment(
    @Id @GeneratedValue val id: Long? = null,
    val orderId: String,  // 메시지의 고유 식별자
    val amount: BigDecimal
)
```
중복 메시지가 오면 unique constraint violation → 무시하면 됨

**2. 처리 이력 테이블 (Processed Event Table)**
```kotlin
@Transactional
fun handleMessage(eventId: String, payload: OrderPayload) {
    // 이미 처리한 이벤트인지 확인
    if (processedEventRepository.existsByEventId(eventId)) {
        return  // 중복이면 무시
    }

    // 비즈니스 로직 수행
    orderService.process(payload)

    // 처리 이력 저장 (같은 트랜잭션)
    processedEventRepository.save(ProcessedEvent(eventId = eventId))
}
```
비즈니스 로직과 이력 저장을 같은 트랜잭션으로 묶어야 안전하다.

**3. Upsert (INSERT ON CONFLICT)**
```sql
INSERT INTO inventory (product_id, quantity)
VALUES ('ABC', 10)
ON CONFLICT (product_id)
DO UPDATE SET quantity = 10;
```
같은 메시지가 여러 번 와도 결과가 동일하므로 자연스럽게 멱등성이 보장된다.

#### 어떤 방법을 선택할 것인가?
| 상황 | 추천 방법 |
|------|-----------|
| 단건 생성 (주문, 결제 등) | DB Unique Key |
| 복잡한 비즈니스 로직 | 처리 이력 테이블 |
| 상태 덮어쓰기 (재고 동기화 등) | Upsert |
- Kafka Streams에서는 `processing.guarantee=exactly_once_v2`로 활성화

</br>

## Consumer Group과 Rebalancing

### Rebalancing이란?
Consumer Group 내에서 Partition 할당을 재조정하는 과정이다.

### 발생 시점
- Consumer가 그룹에 **새로 참가**하거나 **이탈**할 때
- Consumer가 **heartbeat를 보내지 못할 때** (crash, GC pause 등)
- Topic의 **Partition 수가 변경**될 때

### Rebalancing 전략
| 전략 | 설명 |
|------|------|
| **Eager** (기본) | 모든 Partition 할당을 해제 후 재할당 → 일시적 전체 중단 |
| **Cooperative (Incremental)** | 변경이 필요한 Partition만 재할당 → 중단 최소화 |

### 주의사항
- Rebalancing 중에는 해당 Consumer Group의 메시지 소비가 일시 중단됨
- `session.timeout.ms`, `heartbeat.interval.ms`, `max.poll.interval.ms` 튜닝으로 불필요한 Rebalancing 방지
- **Static Group Membership** (`group.instance.id` 설정)으로 일시적 이탈에 의한 Rebalancing 방지 가능

</br>

## Offset 관리

### Offset이란?
Partition 내에서 각 메시지의 고유한 순번(위치)이다.
Consumer는 자신이 어디까지 읽었는지를 Offset으로 관리한다.

### Offset Commit 방식
- **자동 커밋** (`enable.auto.commit=true`): 일정 주기로 자동 커밋. 간편하지만 중복/유실 가능
- **수동 커밋** (`commitSync()`, `commitAsync()`): 처리 완료 후 명시적으로 커밋. 정밀한 제어 가능

### Offset 저장 위치
- `__consumer_offsets`라는 내부 Topic에 저장
- Consumer Group별, Topic-Partition별로 마지막 커밋된 Offset 기록

</br>

## Consumer Lag

### Consumer Lag이란?
Producer가 발행한 최신 Offset과 Consumer가 마지막으로 커밋한 Offset의 **차이**이다.
Lag이 크다는 것은 Consumer가 메시지 처리를 따라가지 못하고 있다는 의미이다.

```
Partition 0:  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                                    ↑         ↑
                              Consumer Offset  Latest Offset
                              (committed: 5)   (produced: 9)

                              → Lag = 9 - 5 = 4
```

### Lag이 중요한 이유
- Lag이 계속 증가하면 **실시간 처리가 불가능**해짐
- 메시지 retention 기간을 넘기면 **미처리 메시지가 삭제**되어 데이터 유실 발생
- 운영 환경에서 **가장 기본적으로 모니터링해야 할 지표**

### Lag 발생 원인
- Consumer의 처리 로직이 느림 (외부 API 호출, 무거운 연산 등)
- Consumer 수가 부족 (Partition 대비)
- Rebalancing이 빈번하게 발생
- Consumer가 장애로 중단됨

### 대응 방법
- **Consumer 수 증가** (Partition 수까지)
- 처리 로직 최적화 (비동기 처리, 배치 처리 등)
- **Partition 수 증가**로 병렬 처리 확장
- 모니터링 도구: `kafka-consumer-groups.sh --describe`, Burrow, Grafana + Prometheus

</br>

## Dead Letter Topic (DLT)

### DLT란?
Consumer가 처리에 **반복적으로 실패한 메시지**를 별도의 Topic으로 보내는 패턴이다.
실패한 메시지가 무한 재시도되며 전체 파이프라인을 막는 것을 방지한다.

### 동작 흐름
```
원본 Topic → Consumer 처리 시도 → 실패 → 재시도 (N회)
                                              ↓ (N회 모두 실패)
                                         DLT (dead letter topic)로 전송
                                              ↓
                                     이후 수동 확인 / 별도 처리
```

### 왜 필요한가?
- 메시지 포맷이 잘못된 경우 (역직렬화 실패)
- 외부 시스템 장애로 처리 불가
- 비즈니스 로직상 처리할 수 없는 데이터

이런 메시지를 무한 재시도하면 해당 Partition의 **정상 메시지까지 처리가 지연**된다.
DLT로 보내고 나머지 메시지를 계속 처리하는 것이 핵심이다.

### Spring Kafka에서의 DLT 설정
```kotlin
@Configuration
class KafkaConfig {

    @Bean
    fun errorHandler(template: KafkaTemplate<String, String>): DefaultErrorHandler {
        val recoverer = DeadLetterPublishingRecoverer(template)
        // 3번 재시도 후 DLT로 전송
        return DefaultErrorHandler(recoverer, FixedBackOff(1000L, 3L))
    }
}
```
- 기본 DLT 토픽 이름: `{원본 토픽명}.DLT`
- 재시도 간격, 횟수, 백오프 전략 등을 커스터마이징 가능

</br>

## Partition 수 결정 기준

### 기본 원칙
- Partition 수 = **최대 병렬 Consumer 수**
- Partition 수는 늘릴 수 있지만 **줄일 수 없다** → 처음에 신중하게 결정해야 함

### 고려 요소

| 요소 | 설명 |
|------|------|
| **목표 처리량** | 단일 Partition의 처리량(Consumer 1개 기준)으로 나눠 계산 |
| **Consumer 수** | 예상되는 최대 Consumer 인스턴스 수 이상이어야 함 |
| **순서 보장 범위** | Partition이 많을수록 순서 보장 범위가 좁아짐 (Key 분산) |
| **Broker 부하** | Partition이 너무 많으면 메타데이터 관리, 복제 오버헤드 증가 |
| **Rebalancing 시간** | Partition이 많을수록 Rebalancing 시간 증가 |

### 계산 예시
```
목표 처리량: 100,000 msg/s
Consumer 1개 처리 능력: 10,000 msg/s

→ 최소 Partition 수 = 100,000 / 10,000 = 10개
→ 여유를 두고 12~15개 정도로 설정
```

### 실무 가이드라인
- 소규모 서비스: **3~6개**로 시작
- 중규모 트래픽: **12~30개**
- 대규모 스트리밍: **50개 이상** (필요에 따라)
- Broker 수의 배수로 설정하면 Partition이 균등하게 분산됨
- 확신이 없다면 약간 넉넉하게 잡는 것이 안전 (줄일 수 없으므로)

</br>

## Kafka Connect

외부 시스템과 Kafka를 연결하는 프레임워크이다.

- **Source Connector**: 외부 → Kafka (예: DB → Kafka)
- **Sink Connector**: Kafka → 외부 (예: Kafka → Elasticsearch)
- 별도 코드 작성 없이 설정만으로 데이터 파이프라인 구축 가능
- 대표적인 Connector: Debezium(CDC), JDBC Connector, S3 Sink 등

</br>

## Kafka Streams

Kafka 내장 스트림 처리 라이브러리이다.

- 별도의 클러스터 필요 없이 일반 Java/Kotlin 애플리케이션으로 동작
- Stateful/Stateless 처리, Windowing, Join 등 지원
- Exactly-once 처리 보장 가능
- Spark Streaming, Flink과의 차이: 별도 인프라 불필요, 경량

</br>

