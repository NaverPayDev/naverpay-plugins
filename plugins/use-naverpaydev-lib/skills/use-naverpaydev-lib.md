---
description: node_modules에서 @naverpay/* 패키지의 API 문서를 읽어 올바른 사용법을 컨텍스트에 주입합니다. llms.txt가 있으면 우선 사용하고, 없으면 .d.ts 타입 정의로 폴백합니다.
allowed-tools: Bash(find:*), Bash(cat:*), Bash(ls:*), Bash(node:*), Read
---

# NaverPayDev 라이브러리 사용 가이드 로더

설치된 `@naverpay/*` 패키지의 API 문서를 컨텍스트에 주입합니다.

- **1순위**: `llms.txt` — 패키지 관리자가 작성한 간결한 가이드
- **폴백**: `.d.ts` 타입 정의 — llms.txt가 없거나 누락된 경우 빌드 산출물에서 직접 추론

## 실행 절차

### 1. 패키지 매니저 및 node_modules 위치 탐지

```bash
# 패키지 매니저 감지
if [ -f "pnpm-lock.yaml" ]; then
  echo "pm=pnpm"
elif [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
  echo "pm=bun"
elif [ -f "yarn.lock" ]; then
  if [ -f ".yarnrc.yml" ] && grep -q "nodeLinker: pnp" ".yarnrc.yml" 2>/dev/null; then
    echo "pm=yarn-pnp"
  else
    echo "pm=yarn"
  fi
else
  echo "pm=npm"
fi

# node_modules 위치 탐색 (현재 디렉토리에서 상위로)
dir=$(pwd)
nm_path=""
while [ "$dir" != "/" ]; do
  if [ -d "$dir/node_modules" ]; then
    nm_path="$dir/node_modules"
    break
  fi
  dir=$(dirname "$dir")
done
echo "node_modules=$nm_path"
```

### 2. @naverpay/* 패키지 목록 수집

```bash
NM="<위에서 탐지한 node_modules 경로>"

# pnpm: 심볼릭 링크를 추적해야 하므로 -L 필수
# npm / bun / yarn hoisted: -L 없어도 동작하지만 함께 써도 무방
find -L "$NM/@naverpay" -maxdepth 1 -mindepth 1 -type d 2>/dev/null
```

yarn PnP인 경우:

```bash
find -L ".yarn/unplugged" -maxdepth 4 -path "*/@naverpay/*/package.json" 2>/dev/null \
  | sed 's|/package.json||'
```

### 3. 각 패키지별 API 문서 로드 (llms.txt → .d.ts 폴백)

수집된 패키지 경로마다 아래 순서로 시도합니다.

#### 3-1. llms.txt 시도

```bash
PKG_PATH="<패키지 경로>"  # 예: /path/to/node_modules/@naverpay/hidash

if [ -f "$PKG_PATH/llms.txt" ]; then
  cat "$PKG_PATH/llms.txt"
fi
```

llms.txt가 있으면 내용을 그대로 컨텍스트에 주입하고 해당 패키지는 완료.

#### 3-2. llms.txt 없을 때: .d.ts 폴백

```bash
# package.json의 exports 맵에서 공개 타입 파일 목록 추출
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PKG_PATH/package.json', 'utf8'));
const exp = pkg.exports || {};
const seen = new Set();   // 중복 방지 (같은 함수의 .d.ts / .d.mts)
const typeFiles = [];

// exports 맵 순회: .d.ts 우선, 없으면 .d.mts
for (const [key, val] of Object.entries(exp)) {
  if (!key.startsWith('.')) continue;
  const candidates = typeof val === 'object' ? [
    val.types,
    val.require?.types,
    val.import?.types,
  ] : [val];
  for (const t of candidates) {
    if (!t) continue;
    const rel = t.replace(/^\.\//, '');
    const base = rel.replace(/\.d\.m?ts$/, '');  // 함수명 기준 중복 제거
    if (!seen.has(base) && (rel.endsWith('.d.ts') || rel.endsWith('.d.mts'))) {
      seen.add(base);
      typeFiles.push(rel);
    }
  }
}

// exports 맵 없으면 루트 types/typings 필드 사용
if (typeFiles.length === 0) {
  const root = pkg.types || pkg.typings;
  if (root) typeFiles.push(root.replace(/^\.\//, ''));
}

// 그마저도 없으면 index.d.ts 시도
if (typeFiles.length === 0) typeFiles.push('index.d.ts');

console.log(typeFiles.join('\n'));
"
```

출력된 파일 목록을 읽어 컨텍스트에 주입:

```bash
# 위에서 나온 파일들을 순서대로 읽기 (존재하는 것만)
# 파일 수가 많은 패키지(함수별 subpath 구조)도 각 파일이 수 줄이므로 전체 읽기
for rel_path in <추출된 파일 목록>; do
  abs="$PKG_PATH/$rel_path"
  [ -f "$abs" ] && echo "// $rel_path" && cat "$abs"
done
```

### 4. 결과 출력

각 패키지 처리 후 요약:

```
✅ NaverPayDev 라이브러리 API 문서 로드 완료

로드된 패키지:
- @naverpay/hidash  →  llms.txt (가이드 문서)
- @naverpay/utils   →  .d.ts 타입 정의 (llms.txt 없음 — 폴백)

위 패키지 사용 시 로드된 API 명세에 따라 정확한 함수명·시그니처를 사용합니다.
```

`@naverpay/*` 패키지가 아예 없는 경우:

```txt
ℹ️ node_modules에서 @naverpay/* 패키지를 찾지 못했습니다.
의존성이 설치되어 있는지 확인하세요.
```

## 규칙

- `@naverpay/*` 스코프만 탐색 (다른 스코프 하드코딩 금지)
- node_modules에서 직접 읽는다 (GitHub fetch 금지) — 설치된 버전과 정확히 일치해야 함
- pnpm 환경에서 Glob 도구는 symlink를 추적하지 못하므로 반드시 Bash `find -L`을 사용
- llms.txt가 있으면 무조건 우선 사용. .d.ts는 llms.txt가 없는 패키지에만 적용
- .d.ts 폴백 시 exports 맵에 없는 내부 파일(`internal/`, `_*`)은 읽지 않음
- 읽어온 API 명세는 현재 대화 컨텍스트에 유지하며, 해당 패키지 코드 작성 시 반드시 참조
- llms.txt 또는 .d.ts 내용을 그대로 신뢰하며 추측으로 API를 변형하지 않음
