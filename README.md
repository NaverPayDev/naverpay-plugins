# naverpay-plugins

네이버페이 팀에서 제공하는 Claude Code Plugin Marketplace 입니다.

## 설치

### marketplace 추가

```
/plugin marketplace add NaverPayDev/naverpay-plugins
```

### plugin 설치

```
/plugin install changeset@naverpay-plugins
/plugin install commit@naverpay-plugins
/plugin install pr@naverpay-plugins
```

### 로컬 개발

```bash
claude --plugin-dir ./path-to-naverpay-plugins
```

### 업데이트

UI를 통해 개별 marketplace의 업데이트를 설정/진행할 수 있습니다:

- `/plugin` 명령어로 플러그인 매니저 열기
- Marketplaces 선택
- 목록에서 marketplace 선택
- Enable auto-update 또는 Update marketplace 선택

## Plugins

### changeset

변경된 패키지를 감지하고 changeset 파일을 자동으로 생성합니다.

**주요 기능:**

- `git diff`를 통해 변경된 패키지 자동 감지
- 시맨틱 버저닝(SemVer) 기반 버전 타입 추천
- `.changeset/` 디렉토리에 changeset 파일 생성

**사용법:**

```
/naverpay-plugins:changeset
```

### commit

스테이징된 변경사항을 분석하고 원자적 커밋을 생성합니다.

**주요 기능:**

- 스테이징된 변경사항 자동 분석
- 논리적 단위로 원자적 커밋 그룹화
- Conventional Commits 형식 + Gitmoji 적용
- 자동 푸시

**사용법:**

```
/naverpay-plugins:commit
```

### pr

현재 브랜치에서 드래프트 Pull Request를 생성합니다.

**주요 기능:**

- 커밋 분석을 통한 PR 제목/설명 자동 생성
- GitHub Enterprise 지원
- 브랜치 자동 푸시
- PR 내용 작성

**사용법:**

```
/naverpay-plugins:pr
/naverpay-plugins:pr develop  # 특정 브랜치로 PR 생성
```
