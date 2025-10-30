# Spring 트랜잭션

## 트랜잭션 전파(Propagation)
스프링에서 하나의 트랜잭션이 진행 중일 때, 다른 메서드가 트랜잭션을 어떻게 이어받거나 새로 시작할지를 결정하는 속성.  
즉, `이미 트랜잭션이 존재하는 상황에서 새로운 메서드가 호출되면 어떻게 할까?`를 정의하는 것

> 스프링은 `@Transactional(propagation = Propagation.XXX)` 형태로 전파 속성을 지정할 수 있다.  
> 전파 속성은 트랜잭션 경계를 중첩하거나 분리할 때의 동작을 제어한다.

### 전파 속성 종류
|속성 |설명 |요약
|--|--|--
|REQUIRED (default)|이미 트랜잭션이 있으면 참여, 없으면 새로 시작|가장 일반적
|REQUIRES_NEW|항상 새로운 트랜잭션 시작 (기존 트랜잭션 일시 정지)|독립 트랜잭션
|SUPPORTS|트랜잭션이 있으면 참여, 없으면 비트랜잭션 실행|선택적 참여
|MANDATORY|반드시 기존 트랜잭션이 있어야 함, 없으면 예외 발생|강제 참여
|NOT_SUPPORTED|트랜잭션을 사용하지 않음 (있어도 일시 정지)|비트랜잭션
|NEVER|트랜잭션이 있으면 예외 발생|트랜잭션 금지
|NESTED|부모 트랜잭션 내에 중첩 트랜잭션 생성 (Rollback 분리 가능)|savepoint 기반 중첩

### 주요 속성 예시

#### REQUIRED (기본)
```kotlin
@Transactional
fun serviceA() {
    serviceB() // serviceB도 REQUIRED라면 같은 트랜잭션 안에서 실행
}
```
- 같은 트랜잭션으로 묶임 &rarr; 하나라도 실패 시 전체 롤백


#### REQUIRES_NEW
```kotlin
@Transactional
fun mainTx() {
    serviceA() // 기존 트랜잭션
    serviceB() // REQUIRES_NEW -> 별도 트랜잭션
}
```
- 독립적인 트랜잭션으로 실행됨
- serviceB() 실패해도 mainTx()는 커밋 가능
- 보상 트랜잭션, 로그 저장(로그는 실패해도 본 트랜잭션은 유지) 등에 자주 사용

#### NESTED
```kotlin
@Transactional
fun parent() {
    nestedService() // @Transactional(propagation = Propagation.NESTED)
}
```
- 부모 트랜잭션 내에서 savepoint 기반 부분 트랜잭션 생성
- 중첩 트랜잭션만 롤백 가능 (부모는 유지)

---

## 트랜잭션  격리 수준 (Isolation Level)
격리 수준은 `동시에 여러 트랜잭션이 수행될 때, 서로의 데이터 접근을 얼마나 허용할지`를 결정한다.  
즉, 트랜잭션 간 데이터 일관성의 보장 정도를 나타낸다.

> 스프링은 @Transactional(isolation = Isolation.XXX) 형태로 격리 수준을 지정할 수 있다.

### 격리 수준 종류
|격리 수준|설명|허용되는 이상 현상
|--|--|--
|READ_UNCOMMITTED|커밋되지 않은 데이터 읽기 허용|Dirty Read, Non-repeatable Read, Phantom Read
|READ_COMMITTED|커밋된 데이터만 읽기|Non-repeatable Read, Phantom Read
|REPEATABLE_READ|같은 트랜잭션 내에서 같은 쿼리 결과 보장|Phantom Read
|SERIALIZABLE|완전한 직렬 실행 (가장 엄격, 느림)|없음

### 이상 현상(Anomaly) 종류
|이름|설명|예시
|--|--|--
|Dirty Read|다른 트랜잭션이 아직 커밋하지 않은 데이터를 읽음|A가 수정 중인데 B가 읽음
|Non-repeatable Read|같은 쿼리를 두 번 실행했는데 결과가 다름|중간에 다른 Tx가 수정
|Phantom Read|조건에 맞는 행의 개수가 바뀜|중간에 행이 추가됨

### DBMS 기본 격리 수준
|DBMS|기본 수준
|--|--
|MySQL (InnoDB)|REPEATABLE_READ
|PostgreSQL|READ_COMMITTED
|Oracle|READ_COMMITTED
|SQL Server|READ_COMMITTE


### 성능과 일관성의 Trade-off
- 격리 수준이 높을수록 데이터 일관성은 높지만 성능은 저하
- 일반적인 API 서버는 READ_COMMITTED 사용
- 금융/정산 시스템 등 정합성이 중요한 경우 REPEATABLE_READ 또는 SERIALIZABLE 고려