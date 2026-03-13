---
description: npm 패키지 도입 전 npmx.dev 데이터를 기반으로 평가합니다
allowed-tools: Bash(node:*), Bash(find:*), Bash(gh:*), Bash(npm view:*), Read, Glob, Grep
---

## ⛔ 절대 금지

- 평가 없이 패키지를 설치하지 말 것
- 평가 결과에 "by Claude Code", "Generated with Claude" 등 Claude 관련 문구를 **절대 포함하지 말 것**

# 패키지 도입 평가

npm 패키지 도입 여부를 판단하기 위해 npmx.dev에서 메트릭을 수집하고 평가합니다.

## 인자

- `$ARGUMENTS`: 평가할 패키지명 (공백 구분, 1개 이상)
- 예: `/evaluate-package lodash-es` 또는 `/evaluate-package lodash-es @naverpay/hidash`

## 사전조건

Chrome/Chromium이 CDP 모드로 실행 중이어야 합니다. 실행 중이 아니라면 사용자에게 아래 명령어를 안내하고 실행을 요청합니다:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --remote-debugging-port=9222 --no-first-run --disable-gpu --no-sandbox
```

## 프로세스

### 1. 스크립트 실행으로 메트릭 수집

플러그인 디렉토리 내 `scripts/scrape-npmx.mjs` 스크립트를 실행하여 npmx.dev에서 데이터를 수집합니다.
스크립트는 DOM 셀렉터 대신 **CDP Accessibility Tree**를 사용하여 CSS 클래스 변경에 영향받지 않습니다.

```bash
# 플러그인 스크립트 경로 찾기
find ~/.claude -name "scrape-npmx.mjs" -path "*/package-evaluator/*" 2>/dev/null | head -1

# 스크립트 실행 (패키지명을 인자로 전달)
node <스크립트경로>/scrape-npmx.mjs $ARGUMENTS
```

스크립트가 JSON으로 다음 메트릭을 반환합니다:

| 카테고리 | 항목 |
|---|---|
| **Performance** | Package Size, Install Size, Direct Deps, Total Deps |
| **Health** | Downloads/wk, Likes, Published, Deprecated |
| **Compatibility** | Engines, Types, Module Format |
| **Security** | License, Vulnerabilities |

### 2. 기존 설치 패키지 확인

프로젝트의 `package.json`에서 `dependencies`/`devDependencies`를 확인하여, 이미 설치된 패키지로 해결 가능한지 검토합니다.

- 동일 패키지가 이미 설치되어 있는 경우 → 중복 설치 경고
- 유사 기능의 패키지가 이미 있는 경우 → 기존 패키지 활용 권장

### 3. peerDependencies 호환성 확인

평가 대상 패키지의 `peerDependencies`가 현재 프로젝트와 호환되는지 확인합니다.

```bash
# 대상 패키지의 peerDependencies 조회
npm view <패키지명> peerDependencies --json
```

프로젝트의 패키지 매니페스트에서 현재 설치된 버전을 확인합니다:

- `package.json` (npm/yarn/pnpm)
- `bun.lockb` 또는 `bun.lock` 존재 시 Bun 환경
- `deno.json` 또는 `deno.jsonc` 존재 시 Deno 환경 (`imports` 필드 확인)

확인 항목:

- **미충족 peer**: peerDependencies에 명시된 패키지가 프로젝트에 없는 경우 → ⚠️ 경고 (설치 필요)
- **버전 불일치**: peerDependencies 범위와 프로젝트의 설치 버전이 호환되지 않는 경우 → ❌ 거부
- **선택적 peer**: `peerDependenciesMeta`에서 `optional: true`인 경우 → 미설치여도 무시

### 4. GitHub 이슈 분석 (가능한 경우)

`npm view <패키지명> repository.url --json`으로 GitHub 저장소 URL을 가져옵니다.
GitHub 저장소가 확인되면 아래 정보를 추가 수집합니다:

```bash
# 저장소 기본 정보 (stars, open issues 수)
gh api repos/{owner}/{repo} --jq '{stars: .stargazers_count, open_issues: .open_issues_count}'

# 최근 이슈 20개 (bug 비율, 응답 속도 파악)
gh api "repos/{owner}/{repo}/issues?state=all&per_page=20&sort=created&direction=desc" \
  --jq '.[] | {title, state, labels: [.labels[].name], created_at, closed_at, comments}'
```

분석 항목:

- **버그 이슈 비율**: 최근 이슈 중 bug/error/fix 라벨 또는 제목에 해당 키워드가 포함된 비율
- **이슈 응답 속도**: 최근 닫힌 이슈의 생성~종료 평균 기간
- **방치된 이슈**: 코멘트 0개이고 30일 이상 열려있는 이슈 수
- GitHub 저장소가 없거나 접근 불가한 경우 이 단계를 건너뜁니다

### 5. 평가 기준 적용

수집된 메트릭을 기준에 대입하여 판정합니다:

#### 즉시 거부 조건 (하나라도 해당되면 ❌)

- 기존 설치된 패키지로 해결 가능
- License가 GPL 계열 (소스 공개 의무)
- Deprecated 상태
- High 이상 심각도의 취약점(Vulnerabilities)이 1건 이상 존재
- peerDependencies 버전이 프로젝트의 설치 버전과 호환되지 않음

#### 경고 조건 (⚠️ 주의 필요)

- 마지막 업데이트가 1년 이상 경과
- 타입 지원 없음 (Types: None)
- 메인테이너가 1인
- CJS 전용 (ESM 미지원) — 도입은 가능하나 ESM 지원 대안이 있으면 대안 우선
- GitHub 이슈 중 버그 비율 50% 이상
- 이슈 평균 응답 기간 30일 초과
- 필수 peerDependencies가 프로젝트에 미설치 (추가 설치 필요)

#### 양호 조건 (✅)

- 위 거부/경고 조건 없음
- MIT / Apache 2.0 / BSD 라이센스
- ESM 지원 (ESM + CJS 듀얼 포함)
- TypeScript 타입 지원

### 6. 결과 출력

## 출력 형식

### 단일 패키지 평가

```txt
📦 패키지 평가: lodash-es
━━━━━━━━━━━━━━━━━━━━━━━━

📊 수집된 메트릭 (npmx.dev)
┌─────────────────┬──────────────┐
│ Package Size    │ 95.2 kB      │
│ Install Size    │ 633.9 kB     │
│ Direct Deps     │ 0            │
│ Total Deps      │ 0            │
│ Downloads/wk    │ 12,345,678   │
│ Published       │ Jan 21, 2026 │
│ Deprecated      │ No           │
│ Types           │ @types/...   │
│ Module Format   │ ESM          │
│ License         │ MIT          │
│ Vulnerabilities │ 0            │
└─────────────────┴──────────────┘

🔍 기존 설치 패키지 확인
- 동일/유사 패키지: 해당 없음

⚖️ 판정: ✅ 도입 가능
━━━━━━━━━━━━━━━━━━━━━━━━
```

### 비교 평가

```txt
📦 패키지 비교 평가
━━━━━━━━━━━━━━━━━━━━━━━━

📊 수집된 메트릭 (npmx.dev)
┌─────────────────┬──────────────┬──────────────────┐
│                 │ lodash-es    │ es-toolkit       │
├─────────────────┼──────────────┼──────────────────┤
│ Package Size    │ 95.2 kB      │ 12.3 kB          │
│ Install Size    │ 633.9 kB     │ 45.6 kB          │
│ Direct Deps     │ 0            │ 0                │
│ Downloads/wk    │ 12,345,678   │ 890,000          │
│ Types           │ @types/...   │ Built-in         │
│ Module Format   │ ESM          │ ESM              │
│ License         │ MIT          │ MIT              │
│ Vulnerabilities │ 0            │ 0                │
└─────────────────┴──────────────┴──────────────────┘

⚖️ 비교 판정
━━━━━━━━━━━━━━━━━━━━━━━━
es-toolkit 우위:
- 번들 사이즈 87% 작음
- 타입 빌트인 지원

lodash-es 우위:
- 커뮤니티 규모 (다운로드 수)
- 함수 커버리지 넓음

권장: (메트릭 기반으로 객관적 비교 제시, 최종 선택은 사용자에게 위임)
```

### 도입 승인 시 PR 템플릿

판정이 ✅인 경우, PR에 붙여넣을 수 있는 도입 근거 템플릿도 함께 출력합니다:

```markdown
## 라이브러리 도입 근거

- **패키지명**: `example-package`
- **도입 이유**: (구체적 사유)
- **주간 다운로드**: X회
- **마지막 업데이트**: YYYY-MM-DD
- **번들 사이즈**: X kB (gzip: X kB)
- **라이센스**: MIT
- **취약점**: 0건
- **타입 지원**: ✅ Built-in / @types/...
```

## 규칙

- 평가 결과는 항상 한국어로 출력
- 메트릭은 npmx.dev에서 수집한 실제 데이터를 사용 (추측하지 않음)
- 스크립트 실행 실패 시 사용자에게 오류 내용을 그대로 전달하고 중단

## 스크립트 오류 처리

```txt
❌ CDP 연결 실패

Chrome/Chromium이 CDP 모드로 실행 중이지 않습니다.
아래 명령어로 Chrome을 실행한 뒤 다시 시도하세요:

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --remote-debugging-port=9222 --no-first-run --disable-gpu --no-sandbox
```
