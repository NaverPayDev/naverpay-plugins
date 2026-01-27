# Git Commands Plugin

git과 관련된 command들을 제공합니다.

## 설치

```
/plugin install naverpay-git@naverpay-plugins
```

## commit

스테이징된 변경사항을 분석하고 원자적 커밋을 생성합니다.

### 주요 기능

- 스테이징된 변경사항 자동 분석
- 논리적 단위로 원자적 커밋 그룹화
- Conventional Commits 형식 + Gitmoji 적용
- 자동 푸시

### 사용법

```
/naverpay-git:commit
```

## pr

현재 브랜치에서 드래프트 Pull Request를 생성합니다.

### 주요 기능

- 커밋 분석을 통한 PR 제목/설명 자동 생성
- GitHub Enterprise 지원
- 브랜치 자동 푸시
- PR 내용 작성

### 사용법

```
/naverpay-git:pr
/naverpay-git:pr develop  # 특정 브랜치로 PR 생성
```

## 권한 설정

`/naverpay-git:pr` command를 사용하기 위해서는 권한이 필요합니다.

### 방법 1: GitHub CLI 설치

**설치:**
- macOS: `brew install gh`
- Windows: `winget install --id GitHub.cli`

**인증:**
`gh auth login`

### 방법 2: Personal Access Token 직접 설정

1. 이동: [https:github.com/settings/tokens/new](https:github.com/settings/tokens/new)
2. 토큰 이름: "Claude PR Creator"
3. 만료: 90일 (또는 원하는 기간)
4. 범위 선택:
   - ✓ repo (비공개 저장소에 대한 전체 제어)
5. "Generate token" 클릭
6. 토큰 복사 (다시 볼 수 없습니다!)

**토큰 설정**
- 옵션 1(권장): .env 파일에 추가
- 옵션 2: `git config --global github.token "your_token_here"`

**보안 주의사항**: Personal Access Token은 비밀번호와 같이 안전하게 관리해야 합니다. 가능한 경우 GitHub CLI를 사용하거나 .env 파일을 저장소에 push하지 않도록 주의해주세요.
