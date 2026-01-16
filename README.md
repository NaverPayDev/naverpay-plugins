# naverpay-plugins

네이버페이 팀에서 제공하는 Claude Code Plugin Marketplace 입니다.

## 설치

### marketplace 추가

```
/plugin marketplace add NaverPayDev/naverpay-plugins
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

- [changeset-commands](./plugins/changeset-commands)
- [commit-commands](./plugins/commit-commands)
