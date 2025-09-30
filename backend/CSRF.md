# CSRF (Cross-site Request Forgery)

## CSRF 공격
- `사이트 간 요청 위조(Cross-site Request Forgery) 공격`은 사용자가 자신의 의지와 상관없이 공격자가 의도한 행위를 특정 웹사이트에 요청하도록 하는 것을 의미한다.
- 브라우저의 인증(주로 쿠키)을 이용해 피해자가 인증된 상태에서 악의적 요청을 보냄
- 목표: 인증된 사용자의 권한으로 서버 쪽 상태 변경 (예: 비밀번호 변경, 송금, 설정 변경 등).

## 동작 원리
1. 사용자가 `bank.example.com`에 로그인하여 세션 쿠키를 갖고 있음.
2. 사용자가 공격자가 만든(악성 스크립트가 담긴) 사이트 `evil.com`을 방문.
3. `evil.com`이 `<form action="https://bank.example.com/transfer" method="POST">` 같은 요청을 자동 제출.
4. 브라우저는 동일한 도메인의 쿠키(세션)를 자동으로 전송
5. 서버는 정당한 요청으로 처리.

## 탐지 포인트
- 의심스러운 Referer/Origin 값
- 예기치 않은 POST/PUT/DELETE 요청 빈도 증가
- CSRF 토큰 누락 또는 불일치 로그

## 주요 방어 기법
1. **CSRF 토큰 (Synchronizer Token Pattern)**
   - 서버가 세션/저장소에 토큰을 생성하고, 폼/요청에 포함. 서버가 검증.
   - 안전성 높음(권장).
2. **Double Submit Cookie**
   - 토큰을 쿠키와 요청 본문(또는 헤더)에 동시에 보내고, 서버에서 비교.
3. **SameSite 쿠키 속성**
   - `SameSite=Lax|Strict|None`으로 설정해 cross-site 요청에 쿠키 자동 전송을 제한.
   - 일반적으로 `Lax` 또는 `Strict` 권장(특수한 경우 `None; Secure` 사용).
4. **Custom Header + CORS 정책**
   - AJAX 요청에만 특정 커스텀 헤더를 요구하고, 브라우저가 cross-site의 경우 preflight로 차단되도록 CORS 설정.
   - 단, 단순 폼 요청은 막지 못하므로 보조 대책으로 사용.
5. **Referrer / Origin 검증**
   - 중요한 상태 변경 요청은 `Origin` 또는 `Referer`를 확인하여 허용된 도메인에서 온 요청인지 검증.
6. **토큰 만료/무효화 정책**
   - 짧은 만료시간, 로그아웃 시 토큰 무효화 등.

## REST API / SPA 환경에서 고려사항
- SPA + API: 보통 Cookie 기반 세션 대신 **토큰 기반 인증(JWT)** 사용 권장 -> 하지만 JWT도 XSS로 토큰이 탈취되면 위험.
- Cookie를 사용한다면 `SameSite`, `HttpOnly`, `Secure` 옵션을 적절히 설정.
- 상태 변경 엔드포인트는 CSRF 토큰 또는 다른 검증 수단을 요구하도록 설계.

## 테스트 방법
- 수동 테스트: 공격자 페이지(간단한 HTML 폼, img 태그 등)로 실제 요청 유도해 서버의 응답 확인
- 자동화 도구: Burp Suite, OWASP ZAP 등으로 CSRF 취약성 탐지
- CI: 주요 상태 변경 API에 대해 CSRF 토큰 검증 테스트 케이스 추가

## 운영 체크리스트
- [ ] 상태 변경(POST/PUT/DELETE) 엔드포인트에 CSRF 방어 적용 여부 확인
- [ ] 쿠키에 `SameSite`, `HttpOnly`, `Secure` 설정
- [ ] CORS 정책이 최소 권한 원칙에 맞게 설정되어 있는지 확인
- [ ] CSRF 토큰 발급/검증 로직의 예외 케이스(동시 요청, 만료 등) 테스트
- [ ] 문서화 및 팀 교육 (프론트엔드와의 협업 포인트 문서 포함)


## Spring Security와 CSRF
### Spring Security에서 CSRF 기본 동작
- 기본값: enable (폼 기반 로그인 시 활성화됨).
- 원리:
    1.	사용자가 최초 요청 시 서버가 CSRF 토큰을 생성.
    2.	토큰을 HttpSession 또는 Cookie에 저장.
    3.	서버가 응답 HTML(form, meta 등)에 토큰을 삽입.
    4.	사용자가 POST/PUT/DELETE 요청 시, 클라이언트가 토큰을 폼 필드나 헤더로 함께 전송.
    5.	서버가 세션에 저장된 값과 비교 → 불일치 시 403 Forbidden.

즉, 쿠키만 가지고는 요청이 성공할 수 없게 만드는 것이 핵심.


### 코드 예제 (Kotlin)
1. 세션 기반
```kotlin
@Configuration
@EnableWebSecurity
class SecurityConfig {
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { csrf -> csrf.enable() } // 기본값, 생략 가능
            .authorizeHttpRequests {
                it.anyRequest().authenticated()
            }
            .formLogin { } // CSRF 토큰 자동 삽입 (Thymeleaf 폼)
        return http.build()
    }
}
```
- HTML 폼에선 자동으로 CSRF hidden field가 삽입됨:
```html
<input type="hidden" name="_csrf" value="토큰값"/>
```
</br>

2. SPA (쿠키 기반 인증)
```kotlin
@Configuration
@EnableWebSecurity
class SecurityConfig {
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf {
                it.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            }
            .authorizeHttpRequests {
                it.anyRequest().authenticated()
            }
        return http.build()
    }
}
```
- 서버가 XSRF-TOKEN 쿠키 발급.
- JS 클라이언트가 이 값을 읽어 X-XSRF-TOKEN 헤더로 매 요청에 추가.

</br>

3. REST API (JWT, Stateless)
```kotlin
@Configuration
@EnableWebSecurity
class SecurityConfig {
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() } // JWT 헤더 기반 인증 시 불필요
            .authorizeHttpRequests {
                it.anyRequest().authenticated()
            }
        return http.build()
    }
}
```
</br>

### 정리
- 세션 기반 인증 &rarr; CSRF 기본 활성화 (폼 hidden 필드 or 헤더 전송 필요).
- SPA + 세션 쿠키 &rarr; CookieCsrfTokenRepository 사용.
- JWT 기반 API &rarr; CSRF 비활성화 (csrf().disable()), 대신 XSS 방어 중요.

즉, Spring Security에서 CSRF는 세션 쿠키 기반 인증일 때만 켜져 있고, 토큰 기반 인증에서는 보통 꺼버리는 게 표준