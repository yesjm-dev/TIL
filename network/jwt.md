# JWT (Json Web Token)

JSON 객체를 안전하게 전송하기 위한 토큰 기반 인증 방식  
디지털 서명(HMAC, RSA, ECDSA 등)을 포함하여 토큰이 위조되지 않았음을 보장한다.  
주로 REST API + SPA 환경에서 인증/인가에 많이 사용된다.

## 구조
JWT는 Header.Payload.Signature 의 3부분으로 구성  
각각 Base64Url로 인코딩되어 . 으로 연결  
`xxxxx.yyyyy.zzzzz`. 
- **Header**: 토큰 타입(JWT), 서명 알고리즘(HS256, RS256 등)
    ```json
    {
        "alg": "HS256",
        "typ": "JWT"
    }
    ```
- **Payload** (claims): 사용자와 관련된 데이터(iss, exp, sub, role 등)
    ```json
    {
        "sub": "1234567890",
        "name": "yesjm",
        "role": "admin",
        "exp": 1735689600
    }
    ```
- **Signature**: Header + Payload 를 비밀키로 서명한 값 &rarr; 위변조 방지

## 동작 방식
1. 사용자가 로그인 요청을 보냄
2. 서버가 사용자 검증 후 JWT 발급
3. 클라이언트는 JWT를 Authorization 헤더(Bearer <token>)에 담아 요청
4. 서버는 토큰의 서명 검증 및 유효기간 확인 후 권한 처리

## 장점
- `Stateless` &rarr; 서버에 세션 저장 불필요 (확장성 up)
- 다양한 플랫폼/언어에서 쉽게 사용 가능
- HTTP Header에 포함되므로 API 서버와 잘 어울린다

## 단점
- 토큰이 길어져 네트워크 비용 증가할 수 있다
- 발급 후 무효화 어려움 (DB나 Redis로 블랙리스트 관리 필요)
- 탈취 시 위험 (XSS, 로컬스토리지 보관 문제)

## JWT 사용 시 주의사항
JWT는 편리하지만 보안과 운영 측면에서 몇 가지 함정이 있다. 이를 이해하고 대비하는 것이 중요하다.

### 1. 페이로드(Claims) 노출
- JWT는 Base64Url 인코딩이라 누구나 디코딩해서 내용을 볼 수 있다.
- 비밀번호, 주민번호 같은 민감한 정보는 넣지 않는다.
- 필요한 경우 식별자(id)만 넣고, 실제 데이터는 서버에서 조회하는 방식으로 설계한다.

### 2. 시크릿 키 관리
- 시크릿 키가 약하거나 유출되면 토큰 위조가 가능하다.
- 충분히 길고 무작위성이 있는 키를 사용해야 한다.
- 대칭 키(HS256)보다는 공개키 기반 알고리즘(RS256, ES256)을 쓰면 더 안전하다.
- 키는 환경 변수나 비밀 관리 도구(Vault, KMS 등)에 보관하고, 주기적으로 교체한다.

### 3. 토큰 탈취 위험
- 토큰이 유출되면 만료 전까지 누구나 사용할 수 있다.
- 브라우저 환경에서는 HttpOnly, Secure 쿠키 사용을 권장한다.
- Access Token은 만료 시간을 짧게 두고, Refresh Token으로 재발급 구조를 갖춘다.
- Refresh Token Rotation을 적용하면 탈취 여부를 감지할 수 있다.

### 4. 만료와 사용자 경험
- 토큰이 만료되면 사용자가 작업 중인 데이터가 사라질 수 있다.
- Access Token은 짧게, Refresh Token은 길게 두는 구조가 일반적이다.
- 필요하다면 슬라이딩 세션(sliding expiration)을 적용해 사용자가 활동하는 동안 만료 시간을 연장한다.
- 클라이언트에서 입력값을 자동 저장하는 기능을 두는 것도 방법이다.

### 5. none 알고리즘 공격
- 공격자가 alg 값을 none으로 바꿔 서명 검증을 우회하는 방식.
- 서버는 허용할 알고리즘을 직접 지정해야 한다.
- 오래된 JWT 라이브러리나 검증을 제대로 하지 않는 코드는 쓰지 않는다.

### 6. 토큰 무효화
- JWT는 기본적으로 상태가 없기 때문에 발급 후 무효화가 어렵다.
- 즉시 무효화가 필요하다면 블랙리스트를 Redis 같은 저장소에 두고 관리한다.
- 블랙리스트 TTL은 토큰 만료와 맞춰서 관리한다.
- 로그아웃 시 Refresh Token 삭제, 세션 종료 등을 병행해야 한다.

### 7. 기타 운영 고려사항
- HTTPS는 필수다.
- 토큰에는 최소한의 정보만 담는다.
- 로그와 모니터링을 통해 토큰의 이상 사용을 감시한다.

## 요약
JWT는 편리하지만 `페이로드 노출`, `시크릿 유출`, `탈취 위험`, `무효화 문제`, `none 알고리즘 공격` 등 여러 보안 함정을 갖는다. 따라서 강력한 키 관리, 짧은 만료 정책 + 리프레시 전략, 안전한 저장(원칙적으로 HttpOnly 쿠키), 토큰 회전·무효화 메커니즘, 알고리즘 검증 강화 등을 반드시 적용해야 한다.

## 구현 예시 (Spring Security + Kotlin)
### 1. JWT 유틸 클래스
```kotlin
@Component
class JwtProvider(
    @Value("\${jwt.secret}") private val secret: String,
    @Value("\${jwt.expiration}") private val expiration: Long
) {
    private val key = Keys.hmacShaKeyFor(secret.toByteArray())

    fun generateToken(userId: String, role: String): String {
        val now = Date()
        val expiry = Date(now.time + expiration)
        return Jwts.builder()
            .setSubject(userId)
            .claim("role", role)
            .setIssuedAt(now)
            .setExpiration(expiry)
            .signWith(key, SignatureAlgorithm.HS256)
            .compact()
    }

    fun validateToken(token: String): Boolean =
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token)
            true
        } catch (e: Exception) {
            false
        }

    fun getUserId(token: String): String =
        Jwts.parserBuilder().setSigningKey(key).build()
            .parseClaimsJws(token).body.subject
}
```

### 2. JWT 필터
```kotlin
class JwtAuthFilter(
    private val jwtProvider: JwtProvider
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val header = request.getHeader("Authorization")
        if (header != null && header.startsWith("Bearer ")) {
            val token = header.removePrefix("Bearer ")
            if (jwtProvider.validateToken(token)) {
                val userId = jwtProvider.getUserId(token)
                val auth = UsernamePasswordAuthenticationToken(userId, null, emptyList())
                SecurityContextHolder.getContext().authentication = auth
            }
        }
        filterChain.doFilter(request, response)
    }
}
```

### 3. Security 설정
```kotlin 
@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtProvider: JwtProvider
) {
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http.csrf { it.disable() }
            .authorizeHttpRequests {
                it.requestMatchers("/auth/**").permitAll()
                    .anyRequest().authenticated()
            }
            .addFilterBefore(JwtAuthFilter(jwtProvider), UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }
}
```