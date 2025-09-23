# HTTP

## 1. HTTP 기본

- **Stateless**: 서버는 클라이언트 상태를 저장하지 않음 → 쿠키/세션으로 보완
- **Connectionless**: 요청-응답 후 연결 종료 (HTTP/1.1부터 Keep-Alive 지원)

## 2. HTTP 버전 비교

| 버전     | 특징                                                                 |
| -------- | -------------------------------------------------------------------- |
| HTTP/1.1 | 텍스트 기반, Keep-Alive 지원, Head-of-Line Blocking 문제 존재        |
| HTTP/2   | 이진(Binary) 프로토콜, Multiplexing, Header Compression, Server Push |
| HTTP/3   | QUIC/UDP 기반, 0-RTT 연결, 연결 재설정 빠름, 모바일 환경 최적화      |

## 3. 상태 코드 (Status Code)

- **1xx**: Informational
- **2xx**: 성공 (200 OK, 201 Created)
- **3xx**: 리다이렉션 (301, 302)
- **4xx**: 클라이언트 오류 (400 Bad Request, 401 Unauthorized, 404 Not Found)
- **5xx**: 서버 오류 (500 Internal Server Error, 503 Service Unavailable)

## 4. HTTP 헤더(Header)

- **요청(Request) 헤더**
  - `Content-Type`, `Accept`, `Authorization`, `User-Agent`, `Cache-Control`
- **응답(Response) 헤더**
  - `Content-Type`, `Content-Length`, `Set-Cookie`, `Cache-Control`
- **실무에서 고민해야할 부분**
  - 캐싱 전략 설정, 인증/권한 구현, CORS, 보안 정책 적용

## 5. 메시지 구조

- **Request**: Request Line + Headers + Body
- **Response**: Status Line + Headers + Body
- 예제: `curl -v`로 실제 Request/Response 확인 가능

## 6. 연결 및 성능

- **Keep-Alive vs Close**
- **HTTP Pipelining** (HTTP/1.1)
- **Head-of-Line Blocking** 문제
- **HTTP/2 Multiplexing** & **Header Compression (HPACK)**

## 7. 보안

- HTTPS / TLS Handshake
- HSTS, Content Security Policy
- 인증 방식: Basic Auth, Token, OAuth2

## 8. REST vs gRPC

| 구분   | REST     | gRPC              |
| ------ | -------- | ----------------- |
| 데이터 | JSON     | Protobuf (이진)   |
| 전송   | HTTP/1.1 | HTTP/2            |
| 속도   | 느림     | 빠름              |
| 활용   | 외부 API | 마이크로서비스 간 |

## 9. HTTP 요청/응답 예제

### GET 요청

GET /users/1 HTTP/1.1  
Host: api.example.com  
Accept: application/json

**응답**

```json
{
  "id": 1,
  "name": "홍길동",
  "email": "hong@example.com"
}
```

### POST 요청

POST /users HTTP/1.1  
Host: api.example.com  
Content-Type: application/json

```json
{
  "name": "이순신",
  "email": "lee@example.com"
}
```

**응답**

```json
{
  "id": 2,
  "name": "이순신",
  "email": "lee@example.com"
}
```
