const fs = require("fs");
const path = require("path");
const { marked } = require("../node_modules/marked");

// 플러그인 디렉토리 경로
const PLUGINS_DIR = path.join(__dirname, "..", "..", "plugins");
const TEMPLATE_PATH = path.join(__dirname, "..", "template.html");
const OUTPUT_PATH = path.join(__dirname, "..", "index.html");

/**
 * README를 파싱하여 플러그인 정보 추출 (marked 활용)
 */
function parseReadme(readmePath, pluginDir) {
  const content = fs.readFileSync(readmePath, "utf-8");
  const pluginName = path.basename(pluginDir);
  const basePluginId = pluginName.replace("-commands", "").replace(/-/g, "");

  // marked.lexer()를 사용하여 마크다운을 토큰으로 파싱
  const tokens = marked.lexer(content);

  let title = "";
  let description = "";
  let features = [];
  let commands = [];
  let currentSection = "";
  let contentTokens = []; // 상세 페이지용 토큰들 (h1, 첫 paragraph, 설치 섹션 제외)
  let skipUntilNextSection = false;
  let foundTitle = false;
  let skipNextParagraph = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // 제목 찾기 (h1)
    if (token.type === "heading" && token.depth === 1 && !title) {
      title = token.text;
      foundTitle = true;

      // 제목 다음 단락을 설명으로 추출
      if (i + 1 < tokens.length && tokens[i + 1].type === "paragraph") {
        description = tokens[i + 1].text;
        skipNextParagraph = true; // 다음 paragraph는 contentTokens에 추가하지 않음
      }
      continue;
    }

    // 첫 paragraph는 설명으로 사용했으므로 스킵
    if (skipNextParagraph && token.type === "paragraph") {
      skipNextParagraph = false;
      continue;
    }

    // 섹션 감지 (h2, h3 모두 추적)
    if (token.type === "heading" && (token.depth === 2 || token.depth === 3)) {
      currentSection = token.text.toLowerCase();

      // h2 레벨의 "설치" 섹션만 상세 페이지에서 제외 (커스텀 HTML로 만들 예정)
      if (token.depth === 2 && (currentSection.includes("설치") || currentSection.includes("install"))) {
        skipUntilNextSection = true;
      } else {
        skipUntilNextSection = false;
        contentTokens.push(token);
      }
      continue;
    }

    // 설치 섹션이 아니면 contentTokens에 추가
    if (!skipUntilNextSection && foundTitle) {
      contentTokens.push(token);
    }

    // 리스트 처리
    if (token.type === "list") {
      // 주요 기능 섹션의 리스트 아이템 추출
      if (currentSection.includes("주요 기능") || currentSection.includes("features")) {
        token.items.forEach((item) => {
          features.push(item.text);
        });
      }
    }

    // 사용법 섹션의 명령어 추출 (코드 블록이나 단락에서)
    if (currentSection.includes("사용법") || currentSection.includes("usage")) {
      if (token.type === "paragraph" || token.type === "code") {
        const text = token.text || token.raw;
        const lines = text.split("\n");
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("/")) {
            commands.push(trimmed);
          }
        });
      }
    }
  }

  // 커스텀 렌더러 설정: "주요 기능" 섹션의 리스트에만 특별한 클래스 추가
  const renderer = new marked.Renderer();
  let currentHeading = "";

  const originalHeading = renderer.heading.bind(renderer);
  renderer.heading = (text, level, raw) => {
    currentHeading = text.toLowerCase();
    return originalHeading(text, level, raw);
  };

  const originalList = renderer.list.bind(renderer);
  renderer.list = (body, ordered, start) => {
    // "주요 기능" 또는 "features" 섹션의 리스트에만 특별한 클래스 추가
    if (currentHeading.includes("주요 기능") || currentHeading.includes("features")) {
      const tag = ordered ? 'ol' : 'ul';
      const startAttr = (ordered && start !== 1) ? ` start="${start}"` : '';
      return `<${tag}${startAttr} class="feature-list">\n${body}</${tag}>\n`;
    }
    return originalList(body, ordered, start);
  };

  // contentTokens를 marked.parser()로 HTML로 변환
  const detailContentHtml = contentTokens.length > 0
    ? marked.parser(contentTokens, { renderer })
    : "";

  return {
    title: title || pluginName,
    description: description,
    features,
    commands,
    pluginId: `naverpay-${basePluginId}`,
    detailContentHtml, // 상세 페이지용 HTML 추가
  };
}

/**
 * 메인 페이지용 간단한 플러그인 카드 생성
 */
function generatePluginCard(plugin) {
  return `        <div class="plugin-card" onclick="window.location.href='plugins/${plugin.pluginId}.html'" style="cursor: pointer;">
          <div class="plugin-header">
            <h2 class="plugin-name">${plugin.title}</h2>
            <p class="plugin-description">
              ${plugin.description}
            </p>
          </div>

          <div class="installation-section">
            <h3>설치</h3>
            <div class="code-wrapper"><div class="install-command">/plugin install ${plugin.pluginId}@naverpay-plugins</div><button class="copy-button" onclick="event.stopPropagation(); copyCode(this)">Copy</button></div>
          </div>

          <div class="card-footer">
            <span class="view-details">자세히 보기 →</span>
          </div>
        </div>`;
}

/**
 * 상세 페이지용 전체 플러그인 내용 생성
 */
function generatePluginDetailPage(plugin) {
  return `        <div class="plugin-card">
          <div class="plugin-header">
            <h2 class="plugin-name">${plugin.title}</h2>
            <p class="plugin-description">
              ${plugin.description}
            </p>
          </div>

          <div class="installation-section">
            <h3>설치</h3>
            <div class="code-wrapper"><div class="install-command">/plugin install ${plugin.pluginId}@naverpay-plugins</div><button class="copy-button" onclick="copyCode(this)">Copy</button></div>
          </div>

          <div class="plugin-content">
            ${plugin.detailContentHtml}
          </div>
        </div>`;
}

/**
 * 메인 빌드 함수
 */
function buildDocs() {
  console.log("🚀 Building documentation...");

  // 플러그인 디렉토리 읽기
  const pluginDirs = fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => path.join(PLUGINS_DIR, dirent.name));

  console.log(`📦 Found ${pluginDirs.length} plugins`);

  // 각 플러그인의 README 파싱
  const plugins = pluginDirs
    .map((pluginDir) => {
      const readmePath = path.join(pluginDir, "README.md");
      if (!fs.existsSync(readmePath)) {
        console.warn(`⚠️  No README.md found in ${pluginDir}`);
        return null;
      }

      console.log(`📖 Parsing ${path.basename(pluginDir)}/README.md`);
      return parseReadme(readmePath, pluginDir);
    })
    .filter(Boolean);

  // 메인 페이지용 간단한 카드 HTML 생성
  const pluginsHtml = plugins.map(generatePluginCard).join("\n\n");

  // 메인 페이지 템플릿 파일 읽기
  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

  // 템플릿에 플러그인 HTML 삽입
  const finalHtml = template.replace("{{PLUGINS}}", pluginsHtml);

  // 메인 페이지 HTML 파일 저장
  fs.writeFileSync(OUTPUT_PATH, finalHtml, "utf-8");

  console.log(`✅ Main page built successfully at ${OUTPUT_PATH}`);

  // 상세 페이지 디렉토리 생성
  const pluginsDir = path.join(__dirname, "..", "plugins");
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  // 상세 페이지 템플릿 파일 읽기
  const DETAIL_TEMPLATE_PATH = path.join(__dirname, "..", "detail-template.html");
  const detailTemplate = fs.readFileSync(DETAIL_TEMPLATE_PATH, "utf-8");

  // 각 플러그인의 상세 페이지 생성
  plugins.forEach((plugin) => {
    const detailContent = generatePluginDetailPage(plugin);
    const detailHtml = detailTemplate
      .replace("{{PLUGIN_TITLE}}", plugin.title)
      .replace("{{PLUGIN_CONTENT}}", detailContent);

    const detailPath = path.join(pluginsDir, `${plugin.pluginId}.html`);
    fs.writeFileSync(detailPath, detailHtml, "utf-8");
    console.log(`📄 Generated detail page: ${plugin.pluginId}.html`);
  });

  console.log(`📝 Generated ${plugins.length} plugin pages`);
}

// 실행
try {
  buildDocs();
} catch (error) {
  console.error("❌ Build failed:", error);
  process.exit(1);
}
