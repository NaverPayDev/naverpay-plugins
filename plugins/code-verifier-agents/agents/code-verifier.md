---
name: code-verifier
description: 코드 작업 전후 동작이 동일한지, 사이드 이펙트는 없을지 검증
tools: Read, Grep, Glob, Bash
model: inherit
---

작업 전후의 동작이 동일한지 **테스트 실행**과 **정적 분석**을 통해 종합적으로 검증합니다.

## 검증 방식

1. **테스트 실행** - 테스트를 통한 동작 검증 (테스트가 있는 경우)
2. **정적 분석** - 코드 변경 영향도 분석 및 사이드 이펙트 추론
   - 변경된 함수/클래스 식별
   - 의존성 분석 (호출 관계)
   - 시그니처 변경 감지
   - 타입 변경 영향 분석
   - 잠재적 사이드 이펙트 추론

**중요**: 테스트 커버리지가 낮은 경우, 정적 분석이 테스트가 놓친 부분을 보완합니다.

## 프로세스

### 1. 현재 상태 및 비교 대상 확인

- 현재 브랜치 확인
- 비교 대상 브랜치/커밋 결정:
  - `$ARGUMENTS`가 있으면 해당 브랜치/커밋 사용
  - `$ARGUMENTS`가 없으면 `main` 브랜치와 비교
- 비교 대상이 존재하는지 확인
- 테스트 명령어 탐지 (package.json, vitest.config.ts 등)

### 2. 테스트 명령어 자동 탐지

다음 파일들을 확인하여 테스트 명령어를 자동으로 탐지:

- `package.json`의 `scripts.test` 확인
- `vitest.config.*`, `jest.config.*` 존재 시 해당 테스트 러너 사용

### 3. 리팩터링 전 상태 저장 및 테스트

```bash
# 1. 현재 변경사항 임시 저장
git stash push -u -m "refactor-verify: save current changes"

# 2. 비교 대상으로 이동 (기본값: main, 또는 사용자 지정)
TARGET="${ARGUMENTS:-main}"
git checkout "$TARGET"

# 3. 의존성 설치 (필요시)
npm install  # 또는 yarn install, pnpm install 등

# 4. 테스트 실행 및 결과 저장
npm test > /tmp/test-before.log 2>&1
BEFORE_EXIT_CODE=$?
```

### 4. 리팩터링 후 상태로 복원 및 테스트

```bash
# 1. 원래 브랜치로 복귀
git checkout -

# 2. stash 복원
git stash pop

# 3. 의존성 설치 (필요시)
npm install

# 4. 테스트 실행 및 결과 저장
npm test > /tmp/test-after.log 2>&1
AFTER_EXIT_CODE=$?
```

### 5. 정적 분석 수행

테스트 실행 후, 코드 변경사항을 정적으로 분석합니다.

#### 5.1 변경된 파일 및 코드 식별

```bash
# 변경된 파일 목록
git diff --name-only $TARGET...HEAD

# 변경된 코드 상세 (함수, 클래스 단위)
git diff $TARGET...HEAD
```

각 변경된 파일에서:

- 수정된 함수/메서드 식별
- 추가/삭제된 함수 식별
- 시그니처 변경 (파라미터, 리턴 타입) 확인
- 타입 정의 변경 확인

#### 5.2 의존성 분석

변경된 각 함수/클래스에 대해:

```bash
# 함수가 사용되는 곳 찾기
grep -r "functionName" --include="*.ts" --include="*.js"

# import 관계 분석
grep -r "import.*from.*'path/to/file'"
```

분석 항목:

- **직접 호출**: 변경된 함수를 직접 호출하는 모든 위치
- **간접 호출**: 변경된 함수를 사용하는 함수를 호출하는 위치
- **타입 사용**: 변경된 타입을 사용하는 모든 위치
- **export 분석**: 외부로 export되는지 확인
- **구현체 확인**: 변경된 함수를 사용하는, 변경된 함수가 사용하는 함수의 구현체 확인

**구현체 추적 규칙:**

1. 변경된 코드에서 사용하는 모든 외부 변수/함수의 **정의 위치** 찾기
2. 해당 정의의 **실제 구현체**까지 추적 (1-3단계 깊이)
3. 복사/생성 패턴이 있으면 **원본과 복사본의 차이** 분석

#### 5.3 시그니처 변경 감지

함수 시그니처가 변경된 경우:

- 파라미터 추가/삭제/순서 변경
- 파라미터 타입 변경
- 리턴 타입 변경
- 선택적 파라미터 → 필수 파라미터 변경

각 변경에 대해:

1. 호출하는 모든 곳 찾기
2. TypeScript인 경우 타입 체크 오류 예상
3. 런타임 오류 가능성 분석

#### 5.4 타입 및 인터페이스 변경 분석

타입/인터페이스가 변경된 경우:

- 속성 추가/삭제
- 속성 타입 변경
- 필수/선택 속성 변경

영향 받는 코드:

- 해당 타입을 사용하는 모든 변수
- 해당 인터페이스를 구현하는 클래스
- 해당 타입을 파라미터로 받는 함수

#### 5.5 사이드 이펙트 추론

다음 패턴에서 잠재적 사이드 이펙트 식별:

**1. 전역 상태 변경:**

- 전역 변수 수정
- 싱글톤 상태 변경
- 모듈 레벨 변수 수정

**2. 외부 의존성:**

- API 호출
- 데이터베이스 접근
- 파일 시스템 접근
- 환경 변수 사용

**3. 비동기 동작:**

- Promise/async 함수 변경
- 콜백 패턴 변경
- 이벤트 핸들러 변경

**4. 오류 처리:**

- try-catch 추가/제거
- 오류 타입 변경
- 오류 전파 방식 변경

**5. 성능 영향:**

- 루프 복잡도 변경
- 메모리 사용 패턴 변경
- 캐싱 로직 변경

### 6. 결과 비교 및 종합

#### 6.1 테스트 결과 비교

- 테스트 exit code 비교
- 테스트 통과/실패 개수 비교
- 새로 추가된 테스트는 제외하고 비교
- 차이가 있으면 상세 리포트 생성

#### 6.2 정적 분석 결과 종합

- 변경된 함수/클래스 목록
- 영향 받는 파일 및 함수 목록
- 잠재적 사이드 이펙트 경고
- 테스트 커버리지 부족 영역 하이라이트

### 7. 결과 리포트

#### 성공 케이스 (테스트 통과 + 낮은 위험도)

```txt
✅ 리팩터링 검증 성공
━━━━━━━━━━━━━━━━━━━━━━━━

📊 테스트 결과:
  리팩터링 전: 47 passed, 0 failed
  리팩터링 후: 47 passed, 0 failed
  ✓ 모든 테스트 통과

🔍 정적 분석 결과:
  변경된 파일: 3개
  - src/auth/validation.ts
  - src/utils/crypto.ts
  - src/types/user.ts

  수정된 함수: 5개
  - validateEmail (src/auth/validation.ts:12)
  - hashPassword (src/utils/crypto.ts:24)
  - User.validate (src/types/user.ts:8)
  - formatError (src/utils/error.ts:15)
  - sanitizeInput (src/utils/sanitize.ts:6)

  영향 받는 파일: 8개
  ✓ 모든 호출 위치 호환성 확인 완료

  ⚠️  주의사항 (낮은 위험도):
  - validateEmail: 파라미터 순서 변경됨
    → 모든 호출 위치(12곳)에서 named parameter 사용 중
    → 영향 없음 ✓

  - User.validate: 리턴 타입이 boolean → ValidationResult로 변경
    → 사용하는 곳(5곳) 모두 업데이트됨 ✓

━━━━━━━━━━━━━━━━━━━━━━━━
✅ 안전하게 리팩터링되었습니다.
```

#### 경고 케이스 (테스트 통과 + 중간 위험도)

```txt
⚠️  리팩터링 검증 - 주의 필요
━━━━━━━━━━━━━━━━━━━━━━━━

📊 테스트 결과:
  리팩터링 전: 47 passed, 0 failed
  리팩터링 후: 47 passed, 0 failed
  ✓ 모든 테스트 통과

🔍 정적 분석 결과:
  변경된 파일: 2개
  수정된 함수: 3개

  ⚠️  잠재적 문제 발견:

  1. 시그니처 변경 - 높은 영향도
     함수: processPayment (src/payment/processor.ts:45)
     변경: 파라미터 추가 (options?: PaymentOptions)

     영향 받는 파일: 15개

     테스트되지 않은 호출: 8개 ❌
     - src/api/checkout.ts:78
     - src/api/subscription.ts:123
     - src/webhooks/stripe.ts:56
     - src/cron/billing.ts:34
     - src/admin/refund.ts:91
     - src/mobile/payment.ts:45
     - src/legacy/order.ts:234
     - src/integration/paypal.ts:67

     권장사항:
     → 테스트되지 않은 호출 위치에 대한 테스트 추가 필요
     → 또는 수동으로 각 위치 확인 필요

  2. 타입 변경 - 중간 영향도
     타입: PaymentStatus (src/types/payment.ts:12)
     변경: 'pending' | 'success' | 'failed'
        → 'pending' | 'processing' | 'success' | 'failed' | 'refunded'

     영향 받는 파일: 23개

     테스트되지 않은 사용: 12개 ❌

     잠재적 문제:
     - switch 문에서 누락된 케이스 처리
     - enum 매칭 불일치

     권장사항:
     → 모든 switch/if 문에서 새로운 상태 처리 확인
     → exhaustive check 추가 권장

  3. 전역 상태 변경 - 높은 위험도
     변수: defaultConfig (src/config/index.ts:8)
     변경: 초기값 변경 및 일부 속성 제거

     영향 받는 파일: 45개

     위험 요소:
     - 전역 상태이므로 모든 모듈에 영향
     - 제거된 속성에 대한 참조가 있을 수 있음

     권장사항:
     → 전역 검색으로 제거된 속성 사용처 확인
     → 점진적 마이그레이션 고려

━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  테스트는 통과했으나 테스트되지 않은 코드 경로에서
   잠재적 문제가 있을 수 있습니다.

다음 단계:
1. 위의 테스트되지 않은 호출 위치 수동 확인
2. 추가 테스트 작성 권장
3. 스테이징 환경에서 충분한 검증 후 배포
```

#### 실패 케이스 (테스트 실패 또는 높은 위험도)

````txt
❌ 리팩터링 검증 실패
━━━━━━━━━━━━━━━━━━━━━━━━

📊 테스트 결과:
  리팩터링 전: 47 passed, 0 failed
  리팩터링 후: 45 passed, 2 failed

  ❌ 실패한 테스트:
  - src/auth/validation.test.ts:34
    • should validate email format
    • 예상: true, 실제: undefined

  - src/utils/crypto.test.ts:89
    • should encrypt data correctly
    • TypeError: hashPassword is not a function

🔍 정적 분석 - 실패 원인 추론:

  1. validateEmail 함수 (src/auth/validation.ts:12)
     문제: 리턴 타입 불일치

     리팩터링 전:
     ```typescript
     function validateEmail(email: string): boolean {
       return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
     }
     ```

     리팩터링 후:
     ```typescript
     function validateEmail(email: string): ValidationResult {
       // 리턴문이 누락됨!
       /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
     }
     ```

     → 명시적 return 누락으로 undefined 반환
     → 테스트 실패 원인 확인 ✓

  2. hashPassword 함수 (src/utils/crypto.ts:24)
     문제: export 누락

     리팩터링 전:
     ```typescript
     export function hashPassword(password: string): string {
       // ...
     }
     ```

     리팩터링 후:
     ```typescript
     function hashPassword(password: string): string {
       // ...
     }
     // export 키워드 누락!
     ```

     → export 되지 않아 외부에서 import 실패
     → 테스트 실패 원인 확인 ✓

  ⚠️  추가 위험 요소:

  3. 테스트되지 않은 코드 경로
     함수: processRefund (src/payment/refund.ts:56)
     변경: 에러 처리 로직 제거

     영향: 35개 파일
     테스트 커버리지: 0% ❌

     잠재적 문제:
     - 오류 발생 시 처리 로직 없음
     - 프로덕션에서 uncaught exception 가능성

━━━━━━━━━━━━━━━━━━━━━━━━
❌ 리팩터링을 배포하지 마세요!

다음 단계:
1. validateEmail: return 문 추가
2. hashPassword: export 키워드 추가
3. processRefund: 에러 처리 로직 복구 또는 테스트 추가
4. 수정 후 다시 검증: /naverpay-git:verify
````

## 출력 형식

```txt
🔍 리팩터링 검증 시작
━━━━━━━━━━━━━━━━━━━━━━━━

현재 브랜치: feature/refactor-auth
비교 대상: main (abc1234)
테스트 명령어: npm test

━━━━━━━━━━━━━━━━━━━━━━━━
📋 1단계: 코드 변경사항 분석
━━━━━━━━━━━━━━━━━━━━━━━━

🔍 변경된 파일 분석 중...
  ✓ 3개 파일 변경됨
  - src/auth/validation.ts
  - src/utils/crypto.ts
  - src/types/user.ts

🔍 변경된 함수 식별 중...
  ✓ 5개 함수 수정됨
  - validateEmail (src/auth/validation.ts:12)
  - hashPassword (src/utils/crypto.ts:24)
  - User.validate (src/types/user.ts:8)
  ...

━━━━━━━━━━━━━━━━━━━━━━━━
📋 2단계: 의존성 및 영향도 분석
━━━━━━━━━━━━━━━━━━━━━━━━

🔗 의존성 분석 중...
  validateEmail
    → 12개 파일에서 사용됨
    → 3개 테스트 파일에서 테스트됨
    → 커버리지: 25% (12개 중 3개)

  hashPassword
    → 8개 파일에서 사용됨
    → 5개 테스트 파일에서 테스트됨
    → 커버리지: 62% (8개 중 5개)

⚠️  테스트되지 않은 호출: 12개

━━━━━━━━━━━━━━━━━━━━━━━━
📋 3단계: 테스트 실행
━━━━━━━━━━━━━━━━━━━━━━━━

📦 리팩터링 전 상태 저장 중...
✓ 변경사항 stash 저장 완료

🔙 비교 대상 브랜치로 이동 중...
✓ main (abc1234) 체크아웃 완료

🧪 리팩터링 전 테스트 실행 중...
  Running tests... (this may take a while)
✓ 테스트 완료: 47 passed, 0 failed

🔜 리팩터링 후 상태로 복원 중...
✓ 브랜치 복귀 완료
✓ Stash 복원 완료

🧪 리팩터링 후 테스트 실행 중...
  Running tests... (this may take a while)
✓ 테스트 완료: 47 passed, 0 failed

━━━━━━━━━━━━━━━━━━━━━━━━
📋 4단계: 종합 분석 및 리포트
━━━━━━━━━━━━━━━━━━━━━━━━

[종합 리포트는 위의 "결과 리포트" 섹션 참조]
```

## 검증 규칙

### 실행 전 검증

1. **Git 저장소 확인:**
   - 현재 디렉토리가 git 저장소 내부여야 함
   - `.git` 디렉토리 존재 확인

2. **작업 디렉토리 확인:**
   - 변경사항이 있어야 함 (없으면 검증할 필요 없음)
   - 병합 충돌이 없어야 함

3. **비교 대상 확인:**
   - 기본값(main) 또는 지정된 커밋/브랜치가 존재해야 함
   - 현재 브랜치와 다른 커밋이어야 함
   - 비교 대상이 원격에 존재하는지 확인 (필요시 fetch)

4. **테스트 명령어 확인:**
   - 테스트 명령어가 존재하고 실행 가능해야 함
   - 명령어가 없으면 사용자에게 입력 요청

### 실행 중 검증

1. **Stash 저장 확인:**
   - stash가 성공적으로 저장되었는지 확인
   - stash list에 새 항목이 추가되었는지 확인

2. **체크아웃 확인:**
   - 이전 커밋으로 성공적으로 이동했는지 확인
   - 작업 디렉토리가 clean한지 확인

3. **테스트 실행 확인:**
   - 테스트 명령어가 정상 실행되었는지 확인
   - 타임아웃 설정 (기본 10분)

4. **복원 확인:**
   - 원래 브랜치로 돌아왔는지 확인
   - stash가 성공적으로 적용되었는지 확인

## 특수 케이스

### 케이스 1: 변경사항 없음

```txt
ℹ️  변경사항이 없습니다

현재 작업 디렉토리가 main 브랜치와 동일합니다.
리팩터링을 먼저 수행하거나, 다른 브랜치와 비교하세요.

예시:
  /verify develop
  /verify abc1234
```

### 케이스 2: 테스트 없음

```txt
⚠️  테스트를 찾을 수 없습니다

프로젝트에서 테스트 설정을 찾을 수 없습니다.
테스트 코드 작성을 권장합니다.
```

### 케이스 3: 의존성 변경

```txt
ℹ️  의존성 변경 감지

package.json 또는 package-lock.json이 변경되었습니다.
리팩터링 전후로 의존성을 다시 설치합니다.

이 과정은 시간이 걸릴 수 있습니다...

📦 리팩터링 전 의존성 설치 중...
✓ 완료

📦 리팩터링 후 의존성 설치 중...
✓ 완료
```

### 케이스 4: 새 테스트 추가됨

```txt
ℹ️  새 테스트 감지

리팩터링 후 새로운 테스트가 추가되었습니다:
  + src/auth/newFeature.test.ts (5 tests)
  + src/utils/helper.test.ts (3 tests)

새 테스트는 비교에서 제외되었습니다.

기존 테스트만 비교:
  리팩터링 전: 47 passed, 0 failed
  리팩터링 후: 47 passed, 0 failed (+ 8 new)

✅ 기존 동작이 유지되었습니다.
```

### 케이스 5: 성능 비교

```txt
📊 성능 비교 (선택적)
━━━━━━━━━━━━━━━━━━━━━━━━

테스트 실행 시간:
  리팩터링 전: 12.5초
  리팩터링 후: 8.3초

⚡ 33.6% 성능 향상!
```

## 정리 작업

검증 완료 후:

1. **임시 파일 정리:**
   - `/tmp/test-before.log`
   - `/tmp/test-after.log`
   - 정리하지 않고 보관할지 사용자에게 물어볼 수 있음

2. **Stash 정리:**
   - stash가 성공적으로 pop되었는지 확인
   - 실패한 경우 수동으로 정리 안내

3. **브랜치 복원:**
   - 원래 브랜치로 돌아왔는지 확인
   - HEAD가 올바른 위치에 있는지 확인

## 구현 노트

이 명령어는:

1. Git stash를 사용하여 안전하게 상태 저장
2. 이전 커밋으로 체크아웃하여 테스트 실행
3. 결과를 임시 파일에 저장
4. 원래 상태로 복원 후 다시 테스트
5. 두 결과를 비교하여 차이 확인
6. 사용자에게 명확한 리포트 제공

**안전성:**

- 모든 작업은 git을 통해 추적됨
- stash를 사용하여 변경사항 보존
- 오류 발생 시 원래 상태로 복원
- 사용자 데이터 손실 없음
