# try-with-resources & kotlin의 대체 방식

## try-catch-finally
전통적인 자바의 try-catch-finally 패턴
```java
FileInputStream fis = null;
try {
    fis = new FileInputStream("test.txt");
    // ... 파일 읽기 작업
} catch (IOException e) {
    e.printStackTrace();
} finally {
    if (fis != null) {
        try {
            fis.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```
- close() 호출 누락 위험(자원 누수)
- finally 블록이 장황하고 가독성이 떨어짐
- close()에서도 예외를 던져 추가적인 예외 처리가 필요해 코드 복잡도 증가
  
## try-with-resources
java 7 부터 추가된 문법. 기존에는 `try-finally` 블록에서 직접 close를 호출해야 했는데, 이를 간소화하고 예외 처리 안정성을 높여줌.

```java
try (FileInputStream fis = new FileInputStream("test.txt")) {
    // ... 파일 읽기
} catch (IOException e) {
    e.printStackTrace();
}
```
- AutoCloseable 인터페이스 구현 객체만 사용 가능 
  - JDBC Connection, PreparedStatement, ResultSet, FileInputStream, BufferedReader 등
- 여러 자원도 한 번에 처리 가능
- 실행 중 예외 + 자원 해제 중 예외를 모두 안전하게 관리

### Suppressed Exception (억제된 예외)
Suppressed Exception은 예외가 발생했지만 무시되는 예외를 의미한다.  
원래 예외(Primary Exception)를 유지하면서 추가 예외도 함께 추적할 수 있고, 자원을 안전하게 해제하면서 예외를 효율적으로 처리할 수 있다.
```java
Throwable[] suppressed = e.getSuppressed(); // 억제된 예외 조회 가능
```

## kotliin의 자원 관리 - use {}
Kotlin에는 try-with-resources 문법이 없다.  
대신 Kotlin 표준 라이브러리의 `확장 함수` use()를 활용한다.  
AutoCloseable 또는 Closeable 을 구현한 객체에 적용 가능하다.
```kotlin
FileInputStream("test.txt").use { fis ->
    // ... 파일 처리
}
```
- 블록이 종료되면 자동으로 close() 호출
- null-safe한 자원 관리
- I/O, JDBC 등 명시적인 자원 관리가 필요한 작업에서 매우 유용

### 동작방식
use() 내부에서 다음 흐름을 자동으로 처리한다.
```kotlin
try {
    // block 실행
} catch (e: Throwable) {
    // block 내부 오류
} finally {
    resource.close() // 자동 close
}
```
즉, try-with-resources와 동일한 안정성을 보장함

### 스프링 + Jpa 환경에서는?
- EntityManager, Connection을 직접 다루지 않는다면
- 스프링이 트랜잭션 종료 시 자원 자동 정리
- use {}를 직접 사용할 일이 거의 없음
  - (단, File, Stream, Socket 같은 I/O 작업을 할 때는 여전히 필요)

