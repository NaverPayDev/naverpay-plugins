# Package Evaluator Plugin

npm 패키지 도입 전 npmx.dev 데이터를 기반으로 자동 평가합니다.

## 주요 기능

- npmx.dev에서 CDP(Chrome DevTools Protocol)를 통해 패키지 메트릭 자동 수집
- 단일 패키지 평가 및 패키지 간 비교 지원
- 신뢰성, 보안, 라이센스 기준 자동 판정
- PR 기재용 도입 근거 템플릿 생성

## 설치

```
/plugin install naverpay-package-evaluator@naverpay-plugins
```

## 사용법

```bash
# 단일 패키지 평가
/naverpay-package-evaluator:evaluate-package lodash-es

# 여러 패키지 비교 평가
/naverpay-package-evaluator:evaluate-package lodash-es es-toolkit
```

## 사전 요구사항

- Google Chrome 또는 Chromium이 설치되어 있어야 합니다
- Chrome을 CDP 모드로 실행해야 합니다:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --remote-debugging-port=9222 --no-first-run --disable-gpu --no-sandbox
```

- Node.js 22+ (글로벌 WebSocket 빌트인 사용)

## 수집 메트릭

| 카테고리 | 항목 |
|---|---|
| Performance | Package Size, Install Size, Direct Deps, Total Deps |
| Health | Downloads/wk, Likes, Published, Deprecated |
| Compatibility | Engines, Types, Module Format |
| Security & Compliance | License, Vulnerabilities |
