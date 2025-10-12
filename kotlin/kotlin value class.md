# Kotlin value class
value class는 값을 감싸는 타입을 정의하면서도 런타임 오버헤드 없이 동작하는 클래스다.  
&rarr; 타입 안정성을 유지하면서도 객체 생성 비용이 없는 경량 클래스를 말한다.

## 선언방법
```kotlin
@JvmInline
value class Rating(val value: Int)
```
- @JvmInline : JVM 타깃에서 인라인 최적화를 적용
- value class : 인라인 클래스 정의 키워드
- 필드는 반드시 하나만 가질 수 있다.

## 동작 방식
- 컴파일 시점: Rating은 별도의 타입으로 취급되어 타입 안정성 보장
- 런타임 시점: 감싼 값(Int)으로 인라인되어 객체 생성 없이 동작
- 불필요한 객체 생성을 막아 성능 최적화

```kotlin
@JvmInline
value class Rating(val value: Int) {
    init {
        if (value !in 1..5) {
            throw InvalidRatingException("평점은 1에서 5 사이여야 합니다. 현재: $value")
        }
    }
}

fun printRating(rating: Rating) {
    println("평점: ${rating.value}")
}

fun main() {
    val r1 = Rating(5)   // OK
    printRating(r1)

    val score: Int = 5
    // printRating(score) // 타입 불일치
}
```
- 런타임에서는 Int로 처리됨
- 컴파일 시에는 Rating 타입으로 구분되어 Int와 혼용 불가

## 장단점
| 장점| 단점
|--|--
| 런타임 오버헤드 없음| 필드 1개 제한
| 타입 안정성 향상| 상속 불가
| 의미 있는 도메인 타입 정의 용이| 일부 제네릭/리플렉션 제약 존재


## 정리
- value class는 타입 안정성을 높이면서도 성능을 유지하는 좋은 도메인 모델링 도구
- 한 필드만 감쌀 때, 특히 의미 있는 타입 구분이 필요할 때 유용
- 도메인 주도 설계(DDD) 에서 VO(Value Object)를 정의할 때 자주 사용됨