---
description: 현재 브랜치에서 드래프트 PR 생성
allowed-tools: Bash(git:*), Bash(find:*), Bash(command:*), Read, Write, Glob, Grep
---

## ⛔ 절대 금지

- PR 제목/설명에 "by Claude Code", "Generated with Claude", "Co-Authored-By: Claude" 등 Claude 관련 문구를 **절대 포함하지 말 것**
- PR 내용 끝에 서명이나 출처를 추가하지 말 것

# Pull Request 명령어

현재 브랜치에서 현재 저장소의 대상 브랜치로 **드래프트 Pull Request**를 생성합니다.

## 프로세스

1. **현재 저장소 및 브랜치 정보 가져오기**

   - `git rev-parse --show-toplevel`을 실행하여 저장소 루트 가져오기
   - `git branch --show-current`를 실행하여 현재 브랜치명 가져오기
   - `git remote get-url origin`을 실행하여 저장소 URL 가져오기
   - origin URL에서 owner/organization과 저장소명 파싱
   - 현재 디렉토리가 git 저장소 내부인지 확인
   - 대상 브랜치가 아닌지 확인 (같은 브랜치로 PR 불가)

2. **저장소 식별자 파싱**

   - 지원 형식:
     - HTTPS: `https://{host}/{owner}/{repo}.git`
     - HTTPS (.git 없음): `https://{host}/{owner}/{repo}`
     - SSH: `git@{host}:{owner}/{repo}.git`
   - `{owner}` 추출 (사용자 또는 organization 가능)
   - `{repo}` 추출 (저장소명)

3. **대상 브랜치 결정**

   - 인자: `$ARGUMENTS` (예: `/pr develop` → `$ARGUMENTS`는 `develop`)
   - 인자가 있으면 해당 브랜치를 대상으로 사용
   - 인자가 없으면 기본값 사용: `main`
   - 대상 브랜치가 원격에 존재하는지 확인

4. **GitHub 토큰 확인**

   - `gh`cli가 사용 가능하다면
     - `gh auth status --hostname {host}` 으로 로그인 상태 조회
     - `gh auth token --hostname {host}` 으로 로그인 토큰 조회
   - `gh` cli가 사용 불가능하다면 github token 찾기
     - .env 파일의 환경 변수에서 토큰 찾기: `GITHUB_PERSONAL_ACCESS_TOKEN`
     - git config에서 토큰 찾기: `git config --global github.token`
     - 찾을 수 없으면 Personal Access Token 생성 안내

5. **변경사항 분석**

   - `git fetch origin <target>`을 실행하여 최신 상태 확인
   - `git log origin/<target>..<current> --oneline`을 실행하여 커밋 확인
   - `git diff origin/<target>...<current> --stat`으로 파일 변경사항 확인
   - `git diff origin/<target>...<current>`로 상세 diff 확인
   - 변경사항을 분석하여 PR 제목과 설명 생성

6. **PR 내용 생성**

   **중요: "by Claude Code"나 "Co-Authored-By: Claude" 같은 Claude 관련 문구 포함하지 말아야 합니다**
   **중요: 모든 PR 내용은 한국어로 작성해야 합니다**

   **중요: 반드시 `.github/PULL_REQUEST_TEMPLATE.md`를 읽고 해당 형식에 맞춰 PR 본문을 작성해야 합니다.**

   **제목 형식:**

   - 단일 커밋인 경우: 해당 커밋 메시지를 제목으로 사용
   - 여러 관련 커밋인 경우: 주요 목적 요약
   - 50자 이하로 유지
   - **설명은 한국어로 작성** (예: `사용자 인증 시스템 구현`)

   **설명 형식:**

   `.github/PULL_REQUEST_TEMPLATE.md` 형식에 맞게 pr 본문을 작성합니다.
   template이 없다면 아래의 형식으로 작성합니다.

   ```markdown
   ## Issue

   커밋 메시지를 분석해 태깅되어있는 이슈가 있다면 본문에 작성합니다.

   ## Summary

   PR이 수행하는 작업에 대한 간략한 개요 (한국어로 2-3문장)

   ## Changes

   - 주요 변경사항 1 (한국어로)
   - 주요 변경사항 2 (한국어로)
   - 주요 변경사항 3 (한국어로)
   ```

   **한국어 콘텐츠 규칙:**

   - PR 제목 설명은 한국어로 작성
   - 모든 섹션은 한국어로 작성
   - 기술 용어는 영어로 가능하지만 주변 텍스트는 모두 한국어로 작성
   - 제목 예시: `JWT 기반 인증 시스템 추가`
   - 설명 예시: "JWT 토큰을 사용한 로그인, 로그아웃 기능을 구현합니다."

7. **필요시 브랜치 푸시**

   - 현재 브랜치가 원격에 존재하는지 확인: `git ls-remote --heads origin <current>`
   - 없으면 실행: `git push -u origin <current>`
   - 푸시 성공 확인

8. **GitHub API를 통한 PR 생성**
   - GitHub REST API v3 사용
   - 엔드포인트: `POST /repos/{owner}/{repo}/pulls`
   - title, body, head, base와 함께 PR 데이터 전송 (항상 draft: true)
   - API 응답 및 오류 처리

## 출력 형식

```txt
🔍 PR 분석
━━━━━━━━━━━━━━━━━━━━━━━━

현재 브랜치: feature/user-auth
대상 브랜치: main
앞선 커밋: 5개
변경된 파일: 8개

📝 생성된 PR 내용 (한국어)
━━━━━━━━━━━━━━━━━━━━━━━━

제목: 사용자 인증 시스템 구현

설명:
## Issue
- #1

## Summary
JWT 기반 인증을 구현하여 로그인, 로그아웃, 토큰 갱신 기능을 추가합니다.
보호된 라우트를 위한 미들웨어도 포함되어 있습니다.

## Changes
- JWT 토큰 생성 및 검증 기능 추가
- 로그인 및 로그아웃 엔드포인트 구현
- 인증 미들웨어 생성
- 사용자 세션 관리 추가
- API 문서 업데이트

━━━━━━━━━━━━━━━━━━━━━━━━

이 PR을 생성합니다.
```

**토큰을 찾을 수 없는 경우:**

```txt
❌ GitHub 토큰을 찾을 수 없습니다

Pull Request를 생성하려면 GitHub Personal Access Token이 필요합니다.

토큰 생성 단계:
1. 이동: https://{host}/settings/tokens/new
2. 토큰 이름: "Claude PR Creator"
3. 만료: 90일 (또는 원하는 기간)
4. 범위 선택:
   - ✓ repo (비공개 저장소에 대한 전체 제어)
5. "Generate token" 클릭
6. 토큰 복사 (다시 볼 수 없습니다!)

토큰 설정:
옵션 1(권장):
  .env 파일에 추가
옵션 2:
  git config --global github.token "your_token_here"

옵션 3:
  export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
  (지속성을 위해 ~/.bashrc 또는 ~/.zshrc에 추가)

옵션 4:
  ~/.config/claude/github-token 생성
  토큰을 여기에 붙여넣기

토큰 설정 후 다시 시도: /pr
```

## 사용 예시

```bash
# main으로 드래프트 PR 생성 (기본값)
/pr

# develop 브랜치로 드래프트 PR 생성
/pr develop
```

## 검증 규칙

**PR 생성 전:**

1. **저장소 검증:**

   - git 저장소 내부여야 함
   - 'origin'이라는 이름의 원격이 있어야 함
   - 저장소 URL이 파싱 가능해야 함 (GitHub 형식)

2. **브랜치 검증:**

   - 현재 브랜치가 대상 브랜치가 아니어야 함
   - 현재 브랜치가 존재하고 체크아웃되어 있어야 함
   - 대상 브랜치가 원격에 존재해야 함
   - 현재 브랜치가 대상보다 앞선 커밋이 있어야 함

3. **인증 검증:**

   - GitHub 토큰이 있어야 함
   - 토큰에 'repo' 범위가 있어야 함
   - 토큰이 유효해야 함 (API 호출로 테스트)

4. **작업 디렉토리 검증:**
   - 커밋되지 않은 변경사항이 있으면 경고 (차단하지는 않음)
   - 현재 브랜치에 푸시되지 않은 커밋이 있으면 경고

**오류 메시지:**

```txt
❌ git 저장소가 아닙니다
git 저장소 내부에서 이 명령어를 실행하세요.

❌ 이미 대상 브랜치 'main'에 있습니다
먼저 기능 브랜치로 전환하세요:
git checkout -b feature/your-feature

❌ 'main'보다 앞선 커밋이 없습니다
현재 브랜치가 최신 상태입니다. PR이 필요하지 않습니다.

❌ 대상 브랜치 'develop'을 찾을 수 없습니다
사용 가능한 브랜치: main, staging, production

⚠️  커밋되지 않은 변경사항이 감지되었습니다
커밋되지 않은 변경사항이 있습니다. 먼저 커밋하는 것을 고려하세요. 그렇지 않으면 PR에 포함되지 않습니다.

⚠️  푸시되지 않은 커밋이 감지되었습니다
먼저 브랜치를 푸시하세요:
git push -u origin feature/user-auth

⚠️  브랜치가 원격에 푸시되지 않았습니다
브랜치를 origin으로 푸시하는 중...
```

## GitHub API 통합

**PR 생성 API 요청:**

```javascript
// Claude가 실행할 의사 코드
const token = getGitHubToken(); // env 또는 git config에서
const { host, owner, repo } = parseRepoUrl(originUrl);

const response = await fetch(
  `https://${host}/api/v3/repos/${owner}/${repo}/pulls`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: generatedTitle,
      body: generatedDescription,
      head: currentBranch,
      base: targetBranch,
      draft: true,
    }),
  }
);
```

**API 응답 처리:**

```txt
✅ 201 Created
PR이 성공적으로 생성되었습니다!

❌ 401 Unauthorized
유효하지 않거나 만료된 GitHub 토큰입니다. 새로 생성하세요.

❌ 404 Not Found
저장소를 찾을 수 없거나 토큰에 액세스 권한이 없습니다.
확인: https://${host}/${owner}/${repo}

❌ 422 Unprocessable Entity
- 검증 실패 (예: PR이 이미 존재함)
- 헤드 브랜치가 원격에 존재하지 않음
- 브랜치 간 커밋 없음

❌ 403 Forbidden
토큰에 필요한 권한이 없습니다. 'repo' 범위가 필요합니다.
```

## Organization 전용 처리

**organization 저장소의 경우:**

1. **토큰 요구사항:**

   - 'repo' 범위가 있어야 함
   - organization에 대해 승인되어야 함
   - SSO 승인이 필요할 수 있음

2. **organization 액세스 확인:**

   ```javascript
   // 사용자가 organization에 액세스 권한이 있는지 확인
   const orgResponse = await fetch(
     `https://${host}/api/v3/orgs/${owner}/members/${username}`,
     {
       headers: {
         Authorization: `Bearer ${token}`,
         Accept: "application/vnd.github.v3+json",
       },
     }
   );

   if (orgResponse.status === 404) {
     console.warn("이 organization의 멤버가 아닙니다");
   }
   ```

3. **SSO 확인:**

```txt
organization이 SSO를 사용하고 API가 403을 반환하는 경우:

❌ 토큰이 organization에 대해 승인되지 않았습니다

조직에서 SAML SSO를 사용합니다. 토큰을 승인하세요:
1. 이동: https://{host}/settings/tokens
2. 토큰 찾기
3. "Configure SSO" 클릭
4. ${owner} 옆의 "Authorize" 클릭

그런 다음 다시 시도: /pr
```

## 특수 케이스

### 케이스 1: 브랜치가 아직 푸시되지 않음

```txt
⚠️  브랜치 'feature/user-auth'를 원격에서 찾을 수 없습니다

브랜치를 origin으로 푸시하는 중...
▶ git push -u origin feature/user-auth

Counting objects: 15, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (10/10), done.
Writing objects: 100% (15/15), 2.43 KiB | 2.43 MiB/s, done.
Total 15 (delta 5), reused 0 (delta 0)

✅ 브랜치가 성공적으로 푸시되었습니다
PR 생성 중...
```

### 케이스 2: PR이 이미 존재함

```txt
⚠️  Pull Request가 이미 존재합니다

기존 PR: #42
제목: 사용자 인증 구현
URL: https://{host}/owner/repo/pull/42

옵션:
1. 기존 PR 보기 (변경 없음)
2. 새 설명으로 기존 PR 업데이트
3. 취소

선택:
```

### 케이스 3: 단일 커밋

```txt
1개의 커밋 발견:
abc1234: feat: add login endpoint

커밋 메시지를 PR 제목으로 사용합니다.
```

### 케이스 4: 브랜치가 대상보다 뒤처짐

```txt
⚠️  브랜치가 'main'보다 3개 커밋 뒤처져 있습니다

현재 상태:
  main:           A---B---C
  feature/auth:   D---E

권장: 브랜치를 리베이스하세요
  git fetch origin
  git rebase origin/main

또는 대상을 브랜치에 병합:
  git merge origin/main

그래도 계속하시겠습니까? (충돌이 있을 수 있음)
```

### 케이스 5: 병합 커밋 감지됨

```txt
⚠️  브랜치에 병합 커밋이 포함되어 있습니다:
- abc1234: Merge branch 'main' into feature/auth
- def5678: Merge pull request #40

더 깔끔한 히스토리를 위해 리베이스를 고려하세요:
  git rebase -i origin/main

그래도 계속하시겠습니까?
```

### 케이스 6: Organization 저장소 감지됨

```txt
ℹ️  Organization 저장소가 감지되었습니다

저장소: anthropics/anthropic-sdk-typescript
Organization: anthropics
Organization 저장소에 대한 PR 생성 중...

참고: 토큰이 이 organization에 대해 승인되었는지 확인하세요.
```

## PR 생성 후

```txt
✅ PR이 성공적으로 생성되었습니다!
━━━━━━━━━━━━━━━━━━━━━━━━

PR #123: 사용자 인증 시스템 구현
저장소: owner/repo
URL: https://{host}/owner/repo/pull/123

상태: Open
드래프트: No
Base: main ← Head: feature/streaming-support

액션:
- 브라우저에서 PR 열기...
- CI/CD 체크가 자동으로 실행됩니다

다음 단계:
1. PR 검토: https://{host}/owner/repo/pull/123
2. 팀 멤버에게 리뷰 요청
3. CI/CD 체크가 통과될 때까지 대기
4. 피드백 반영
5. 승인되면 병합

직접 링크:
https://{host}/owner/repo/pull/123
```

## 구현 노트

이 명령어는 다음을 수행합니다:

1. 원격 URL에서 git 저장소 정보 파싱
2. owner (사용자 또는 organization)와 저장소명 추출
3. 브랜치 및 커밋 검증
4. GitHub 토큰 확인 및 액세스 검증
5. 커밋과 diff를 분석하여 PR 제목과 설명 생성
6. 필요시 브랜치를 원격으로 푸시
7. GitHub API로 HTTP POST 요청: `/repos/{owner}/{repo}/pulls`
8. 응답을 파싱하고 PR URL 표시
9. 선택적으로 브라우저에서 PR 열기

다음 두 가지 모두에서 작동합니다:

- 개인 저장소: `username/repo`
- Organization 저장소: `organization/repo`
