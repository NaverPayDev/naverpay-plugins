# Commit Commands Plugin

## 설치

```
/plugin install naverpay-commit@naverpay-plugins
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
/naverpay-commit:commit
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
/naverpay-commit:pr
/naverpay-commit:pr develop  # 특정 브랜치로 PR 생성
```
