# 이분 탐색 패턴 (Binary Search Pattern)

이분 탐색은 탐색 범위를 절반씩 줄여가며 원하는 값을 찾는 알고리즘이다.  
배열에서 원소 찾기, 최적화 문제(조건을 만족하는 최대/최소 값 찾기) 에 많이 사용된다.

## 패턴

### 1. 단순 탐색

- 정렬된 배열에서 특정 값을 찾을 때 사용

```kotlin
while (low <= high) {
    val mid = (low + high) / 2
    if (arr[mid] == target) return mid
    else if (arr[mid] < target) low = mid + 1
    else high = mid - 1
}
```

### 2. 조건을 만족하는 최대 값 찾기

- 어떤 조건을 만족하는 범위에서 가장 큰 값을 찾고 싶을 때  
  ex) [2100](https://www.acmicpc.net/problem/2100), [2512](https://www.acmicpc.net/problem/2512)

```kotlin
var answer = 0
while (low <= high) {
    val mid = (low + high) / 2
    if (조건(mid)) {
        answer = mid    // 조건 만족 -> 정답 후보
        low = mid + 1   // 더 큰 값 탐색
    } else {
        high = mid - 1  // 조건 불만족 -> 줄여야 함
    }
}
```

### 3. 조건을 만족하는 최소 값 찾기

- 어떤 조건을 만족하는 값 중 가장 작은 값을 찾고 싶을 때
- ex) [3079](https://www.acmicpc.net/problem/3079)

```kotlin
var answer = INF
while (low <= high) {
    val mid = (low + high) / 2
    if (조건(mid)) {
        answer = mid       // 조건 만족 → 정답 후보
        high = mid - 1     // 더 작은 값 탐색
    } else {
        low = mid + 1      // 조건 불만족 → 키워야 함
    }
}
```

## 시간복잡도

- 탐색 범위 크기 = M
- 각 단계 연산 = O(N) (검증 과정)
- 총 시간 복잡도 = O(N log M)
