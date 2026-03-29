# Char.isDigit()

## 정의

- 코틀린 표준 라이브러리 함수
- `Char.isDigit(): Boolean`
- 문자가 숫자(0~9)인지 판별

## 예시

```kotlin
println('1'.isDigit()) // true
println('a'.isDigit()) // false
```

## 활용 사례

[백준 1620 - 나는야 포켓몬 마스터 이다솜](https://www.acmicpc.net/problem/1620)

- 입력이 숫자인지 문자열인지 구분할 때 사용

```kotlin
val q = reader.readLine()
if (q[0].isDigit()) {
    println(numToName[q.toInt()])
} else {
    println(nameToNum[q])
}
```
