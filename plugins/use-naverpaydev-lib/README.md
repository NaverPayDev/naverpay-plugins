# use-naverpaydev-lib Plugin

`@naverpay/*` 및 `@pie/*` 패키지의 `llms.txt`를 **node_modules에서 직접 읽어** 정확한 API 사용법을 컨텍스트에 주입하는 스킬입니다.

## 설치

```bash
/plugin install naverpay-use-naverpaydev-lib@naverpay-plugins
```

## 사용법

```
/use-naverpaydev-lib
```

스킬 실행 후 Claude는 설치된 `@naverpay/*`, `@pie/*` 패키지의 `llms.txt`를 읽고, 이후 해당 패키지 코드 작성 시 llms.txt에 명시된 API 명세를 기반으로 정확한 함수명과 시그니처를 사용합니다.

## 지원 패키지 매니저

| 패키지 매니저 | node_modules 구조 | symlink 처리 |
| ------------- | ----------------- | ------------ |
| npm           | 표준 hoisted      | 불필요       |
| bun           | 표준 hoisted      | 불필요       |
| yarn (hoisted)| 표준 hoisted      | 불필요       |
| pnpm          | symlink → `.pnpm/`| `find -L` 사용 |
| yarn PnP      | `.yarn/unplugged/`| `find -L` 사용 |

## 동작 방식

1. 현재 프로젝트의 패키지 매니저 자동 감지 (락 파일 기반)
2. `node_modules/@naverpay/*` 및 `node_modules/@pie/*`에서 `llms.txt` 탐색
3. 발견된 모든 `llms.txt` 내용을 읽어 Claude 컨텍스트에 주입
4. 이후 해당 패키지 관련 코드 작성 시 주입된 API 명세 자동 참조

## llms.txt가 포함된 패키지

- [`@naverpay/hidash`](https://github.com/NaverPayDev/hidash) — hidash 유틸 라이브러리
- `@pie/*` — NaverPay 컴포넌트/유틸 패키지 모음

llms.txt가 없는 패키지는 조용히 건너뜁니다.
