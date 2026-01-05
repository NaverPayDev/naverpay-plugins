---
description: 변경된 패키지를 감지하고 changeset 파일을 생성합니다
allowed-tools: Bash(git diff:*), Bash(find:*), Bash(command:*), Read, Write, Glob, Grep
---

# Changeset Generator

## 지침

1. `git diff main..HEAD`로 모든 변경사항과 변경된 파일 목록 확인
2. `packages/` 디렉토리 내 변경된 패키지 식별
3. 사용자에게 각 패키지별 버전 타입 질문 (major/minor/patch)
   1. 유의적 버전 명세에 맞게 타입을 추천
      - 기존 버전과 호환되지 않게 API가 바뀌면 "major 버전"을 올리고,
      - 기존 버전과 호환되면서 새로운 기능을 추가할 때는 "minor 버전"을 올리고,
      - 기존 버전과 호환되면서 버그를 수정한 것이라면 "patch 버전"을 올린다.
4. 커밋 메시지를 기반으로 변경 내용 요약
5. `.changeset/[random-name].md` 파일 생성
   1. 기존에 changeset 파일이 존재한다면 해당 파일을 덮어씀.

## 파일 형식

생성되는 changeset 파일 형식:

```markdown
## "[패키지 명]": patch

[변경 내용 요약]
```

## changeset 파일명 생성 방법

두 개의 랜덤 영단어를 조합해서 kebab-case로 생성합니다. (길이는 10-25자 정도로 생성합니다.)

## 패키지 명 확인 방법

변경된 패키지의 `package.json` 파일에서 `name` 필드를 읽어 사용합니다.

## 주의사항

- 변경된 패키지가 없으면 changeset 생성 불필요 안내
- `skip-detect-change` 레이블 사용 시 changeset 불필요
