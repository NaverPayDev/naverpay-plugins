---
description: 스테이징된 변경사항을 분석하고 원자적 커밋 생성
allowed-tools: Bash(git:*), Bash(find:*), Read, Write, Glob, Grep
---

## ⛔ 절대 금지

- 커밋 메시지에 "by Claude Code", "Generated with Claude", "Co-Authored-By: Claude" 등 Claude 관련 문구를 **절대 포함하지 말 것**
- 커밋 메시지 끝에 서명이나 출처를 추가하지 말 것

# 원자적 커밋 명령어

당신은 git 커밋 도우미입니다. 이 명령어가 실행되면:

## 프로세스

1. **변경사항 확인 및 자동 스테이징**

   - `git status`를 실행하여 현재 상태 확인
   - 스테이징된 변경사항이 없고, 스테이징되지 않은 변경사항이 있는 경우:
     - `git add -A`를 실행하여 모든 변경사항을 자동으로 스테이징
   - `git diff --cached`를 실행하여 스테이징된 변경사항 확인

2. **변경사항 분석**

   - 다음 기준으로 논리적인 원자적 커밋 그룹화:
     - 관련 기능 (기능끼리, 수정끼리 함께)
     - 단일 책임 (하나의 커밋 = 하나의 명확한 목적)
     - 파일 관계 (관련된 파일들은 같은 커밋에)
   - 관련 없는 변경사항은 다른 커밋으로 분리
   - 동일 파일에서 발생한 변경이더라도 서로 관련이 없다면 다른 커밋으로 분리

3. **커밋 그룹 제안**
   각 그룹에 대해 다음을 제공:

   - 포함할 파일
   - Conventional Commits 형식의 커밋 메시지: `type: description`
   - 이 변경사항들이 함께 속하는 이유
   - 설명은 한국어로 작성할 것

   타입: feat, fix, refactor, docs, style, test, chore, perf

4. **커밋 실행**

   - 승인된 각 커밋에 대해:
     - `git reset HEAD` (모두 언스테이징)
     - `git add <files>` (그룹의 파일들만 스테이징)
     - `git commit -m "<message>"` (Claude 관련 문구 없이!)
   - 진행 상황과 결과 표시

5. **원격 저장소에 푸시**
   - 모든 커밋 완료 후 `git push origin <branch>` 실행
   - 푸시 결과 표시

## 출력 형식

```txt
📋 스테이징된 변경사항 분석
━━━━━━━━━━━━━━━━━━━━━━━━

X개의 스테이징된 파일 발견

제안된 원자적 커밋:

1️⃣ :sparkles: feat: 사용자 로그인 검증 구현
   파일: src/auth/validation.ts
   이유: 새로운 검증 로직은 독립적인 기능

2️⃣ :sparkles: feat: JWT 토큰 생성 기능 추가
   파일: src/auth/token.ts, src/utils/crypto.ts
   이유: 토큰 생성과 암호화 유틸리티는 함께 작동

3️⃣ :white_check_mark: test: 인증 테스트 추가
   파일: tests/auth.test.ts
   이유: 테스트는 별도로 커밋되어야 함

━━━━━━━━━━━━━━━━━━━━━━━━
이 커밋들을 진행합니다.
```

## 규칙

**중요: "by Claude Code"나 "Co-Authored-By: Claude" 같은 Claude 관련 문구 포함하지 말 것**

- 항상 논리적 목적에 따라 그룹화
- 작업 범위를 가능한 가장 작은 단위로 나누고 원자적 커밋 생성
- 절대 기능과 수정을 한 커밋에 혼합하지 말 것
- 절대 리팩토링과 새 기능을 혼합하지 말 것
- 테스트는 구현과 함께 또는 별도로 가능 (사용자 선호도 물어볼 것)
- 커밋 메시지는 명확하고 50자 이하로 유지
- 현재 시제 사용 ("add feature" not "added feature")
- 커밋 메시지에 적절한 gitmoji 접두사 추가
- 동일 파일 내에서도 논리적으로 다른 목적의 변경사항은 `git add -p`를 사용하여 분리 커밋
- Gitmoji 사용:
  - `:sparkles: feat:` - 새 기능
  - `:bug: fix:` - 버그 수정
  - `:wrench: chore:` - 설정/도구 변경
  - `:memo: docs:` - 문서 추가/수정
  - `:white_check_mark: test` - 테스트 추가/수정
  - `:recycle: refactor` - 코드 리팩토링
  - `:lipstick: style` - UI/스타일 파일 추가/수정
  - `:zap: perf` - 성능 개선

## 검증

각 커밋 실행 전:

- 모든 파일이 존재하고 스테이징되었는지 확인
- 커밋 메시지가 Conventional Commits를 따르는지 확인
- 병합 충돌이 발생하지 않을지 확인
