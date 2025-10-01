# 트랜잭셔널 메시징 (Transactional Messaging)
트랜잭셔널 메시징은 데이터베이스 상태 변경과 메세지 발행을 하나의 원자적 연산처럼 다루는 개념이다.  
일반적으로 마이크로서비스 환경에서는 데이터 변경(DB 저장, 수정, 삭제) 과 동시에 이벤트 발행(메시지 큐에 Publish) 이 필요할 때가 많은데, 두 작업을 별도로 실행하면 문제가 생길 수 있다.
- DB 저장은 성공했지만 메시지 발행이 실패 &rarr; 다른 서비스가 상태를 알지 못함 (데이터 불일치 발생)
- 메시지 발행은 성공했지만 DB 저장이 실패 &rarr; 잘못된 이벤트가 흘러감 (데이터 정합성 깨짐)  

이런 상황은 `데이터 정합성(Consistency)`을 깨뜨리므로 반드시 해결해야한다.

## 트랜잭셔널 메시징을 구현하는 대표적인 방법 세가지
1.	2PC (Two-Phase Commit)
    - DB와 메시지 브로커를 분산 트랜잭션으로 묶어 원자성을 보장
    - 단점: 성능 저하, 복잡한 설정, 확장성 문제 &rarr; 실제 운영 환경에서는 잘 안 씀
2.	트랜잭셔널 아웃박스 (Transactional Outbox)
    - DB에 Outbox 테이블을 두고 비즈니스 데이터와 메시지를 함께 커밋
    - 별도 프로세스/워커가 Outbox를 읽어 메시지 브로커로 발행
    - 단순하고 가장 널리 사용됨
3.	CDC (Change Data Capture)
    - DB 변경 로그(binlog, WAL 등)를 감지해서 메시지를 브로커로 발행
    - Debezium 같은 도구를 많이 사용
    - 비즈니스 코드에 침투하지 않고 메시지 발행 가능

</br>

# 트랜잭셔널 아웃박스 패턴 (Transactional Outbox Pattern)

트랜잭셔널 아웃박스는 트랜잭셔널 메시징을 실용적으로 구현하는 패턴이다.
DB 트랜잭션 안에서 비즈니스 데이터 + 이벤트 메시지를 Outbox 테이블에 함께 저장한 뒤, 별도의 프로세스가 이를 메시지 브로커로 발행한다.

## 동작 흐름
1. 트랜잭션 실행
   - 주문을 저장 (orders 테이블)
   - 이벤트를 저장 (outbox 테이블)  
    &rarr; 두 작업이 같은 트랜잭션 안에서 커밋됨
2. 메시지 릴레이
   - 별도의 워커(혹은 스케줄러)가 Outbox 테이블을 polling/CDC
   - 이벤트를 메시지 브로커(Kafka, RabbitMQ 등)로 발행
   - 발행 성공 시 Outbox 상태 업데이트 (ex: success)
3.	소비자 처리
    - 다른 서비스는 브로커로부터 이벤트를 구독해 동작 수행

## DB 스키마 예시
```database
CREATE TABLE outbox_event (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  aggregate_type VARCHAR(100),
  aggregate_id VARCHAR(100),
  type VARCHAR(100),
  payload TEXT,               -- JSON 문자열
  occurred_at TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  attempts INT DEFAULT 0
);
```

주요 컬럼
- payload: 직렬화된 이벤트 데이터(JSON)
- processed / processed_at : 전송 여부 표시
- attempts: 재시도 횟수 추적
- 인덱스: processed, occurred_at 기준 인덱스 필요(폴링 성능)

## Spring Boot + Kotlin 구현 예제
1. Outbox 엔티티
```kotlin
@Entity
@Table(name = "outbox_event")
data class OutboxEvent(
    @Id @GeneratedValue
    val id: Long? = null,
    val aggregateType: String,
    val aggregateId: String,
    val type: String,
    @Lob
    val payload: String,
    val occurredAt: Instant = Instant.now(),
    var processed: Boolean = false,
    var processedAt: Instant? = null,
    var attempts: Int = 0
)
```

2. 비즈니스 로직 (트랜잭션 안에서 아웃박스 작성)
```kotlin
@Service
class OrderService(
    private val orderRepository: OrderRepository,
    private val outboxRepository: OutboxRepository
) {

    @Transactional
    fun createOrder(req: CreateOrderRequest) {
        val order = Order(...) // business entity
        orderRepository.save(order)

        val event = OutboxEvent(
            aggregateType = "Order",
            aggregateId = order.id.toString(),
            type = "OrderCreated",
            payload = objectMapper.writeValueAsString(OrderCreatedPayload(...))
        )
        outboxRepository.save(event)
        // both saved in same tx -> atomic
    }
}
```

3. 폴러(배치/스케줄러)
```kotlin
@Component
class OutboxPublisher(
    private val outboxRepository: OutboxRepository,
    private val kafkaTemplate: KafkaTemplate<String, String>
) {

    @Scheduled(fixedDelayString = "\${outbox.poll.interval:5000}")
    fun publishPending() {
        val pending = outboxRepository.findTop100ByProcessedFalseOrderByOccurredAtAsc()
        pending.forEach { event ->
            try {
                kafkaTemplate.send(event.type, event.aggregateId, event.payload).get(5, TimeUnit.SECONDS)
                event.processed = true
                event.processedAt = Instant.now()
                outboxRepository.save(event)
            } catch (ex: Exception) {
                event.attempts += 1
                outboxRepository.save(event)
                // 로그, 백오프, 알림 등 처리
            }
        }
    }
}
```
주의: .get() 처럼 블로킹 호출을 쓰거나 Async 콜백을 써서 전송 성공 여부를 확인해야 하며, 대량 처리에서는 배치/파이프라인 설계 필요.

## 장단점
장점
- DB와 메시지 발행의 정합성 보장 (항상 함께 성공/실패)
- 분산 트랜잭션 불필요 (XA, 2PC 안 써도 됨)
- Kafka, RabbitMQ 등 다양한 메시징 시스템에 적용 가능  

단점
- Outbox 테이블 관리 필요 (용량 관리, 인덱스 관리)
- 지연(latency): 메시지가 실시간으로 발행되지 않을 수 있음 (polling 주기 의존)
- 운영 복잡도: Outbox 테이블 청소 정책, 재시도 로직 필요


## 참고할 내용들
- https://blog.gangnamunni.com/post/transactional-outbox
- https://medium.com/@greg.shiny82/%ED%8A%B8%EB%9E%9C%EC%9E%AD%EC%85%94%EB%84%90-%EC%95%84%EC%9B%83%EB%B0%95%EC%8A%A4-%ED%8C%A8%ED%84%B4%EC%9D%98-%EC%8B%A4%EC%A0%9C-%EA%B5%AC%ED%98%84-%EC%82%AC%EB%A1%80-29cm-0f822fc23edb
- https://youtu.be/uk5fRLUsBfk?si=KilLwDgbGBicckD_