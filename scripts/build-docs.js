const fs = require("fs");
const path = require("path");

// 플러그인 디렉토리 경로
const PLUGINS_DIR = path.join(__dirname, "..", "plugins");
const TEMPLATE_PATH = path.join(__dirname, "..", "docs", "template.html");
const OUTPUT_PATH = path.join(__dirname, "..", "docs", "index.html");

/**
 * README를 파싱하여 플러그인 정보 추출
 */
function parseReadme(readmePath, pluginDir) {
  const content = fs.readFileSync(readmePath, "utf-8");
  const lines = content.split("\n");

  const pluginName = path.basename(pluginDir);
  const basePluginId = pluginName.replace("-commands", "").replace(/-/g, "");

  let title = "";
  let description = "";
  let sections = [];
  let currentSection = null;
  let currentSubSection = null;
  let checkedForDescription = false;
  let titleFound = false;

  const ignoreSections = ["설치", "installation", "install", "주요 기능", "features", "사용법", "usage"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 제목 찾기
    if (line.startsWith("# ") && !titleFound) {
      title = line.replace("# ", "").trim();
      titleFound = true;
      continue;
    }

    // 설명 추출 (제목 바로 다음의 첫 비어있지 않은 줄)
    if (titleFound && !checkedForDescription && line) {
      checkedForDescription = true;
      if (!line.startsWith("#") && !line.startsWith("`")) {
        description = line;
      }
    }

    // ## 섹션 감지
    if (line.startsWith("## ")) {
      const sectionName = line.replace("## ", "").trim();

      // 무시할 섹션이면 스킵
      if (ignoreSections.includes(sectionName.toLowerCase())) {
        currentSection = null;
        continue;
      }

      // 새로운 섹션 시작
      currentSection = {
        title: sectionName,
        description: "",
        subSections: [],
        checkedForDescription: false,
      };
      sections.push(currentSection);
      currentSubSection = null;
      continue;
    }

    // ### 섹션 감지
    if (line.startsWith("### ")) {
      const subSectionName = line.replace("### ", "").trim();
      currentSubSection = {
        title: subSectionName,
        content: [],
      };
      if (currentSection) {
        if (!currentSection.subSections) {
          currentSection.subSections = [];
        }
        currentSection.subSections.push(currentSubSection);
      }
      continue;
    }

    // 현재 섹션이 있을 때만 처리
    if (currentSection) {
      // 섹션 설명 추출
      if (!currentSection.checkedForDescription && line && !line.startsWith("#") && !line.startsWith("`")) {
        currentSection.description = line;
        currentSection.checkedForDescription = true;
        continue;
      }

      // 현재 서브섹션이 있으면 내용 추가
      if (currentSubSection && line) {
        if (line.startsWith("- ")) {
          currentSubSection.content.push({ type: "list", text: line.replace("- ", "") });
        } else if (line.startsWith("/")) {
          currentSubSection.content.push({ type: "command", text: line });
        } else if (!line.startsWith("`")) {
          currentSubSection.content.push({ type: "text", text: line });
        }
      }
    }
  }

  // sections가 없으면 전체 README를 하나의 플러그인으로 처리
  if (sections.length === 0) {
    let features = [];
    let commands = [];
    let currentSubSection = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 섹션 감지
      if (line.startsWith("## ") || line.startsWith("### ")) {
        currentSubSection = line.toLowerCase();
        continue;
      }

      // 주요 기능 추출
      if (
        (currentSubSection.includes("주요 기능") || currentSubSection.includes("features")) &&
        line.startsWith("- ")
      ) {
        features.push(line.replace("- ", ""));
      }

      // 사용법 명령어 추출
      if (
        (currentSubSection.includes("사용법") || currentSubSection.includes("usage")) &&
        line.startsWith("/")
      ) {
        commands.push(line);
      }
    }

    return [
      {
        title: title || pluginName,
        description: description,
        features,
        commands,
        pluginId: `naverpay-${basePluginId}`,
      },
    ];
  }

  return [
    {
      title: title || pluginName,
      description: description,
      sections: sections,
      pluginId: `naverpay-${basePluginId}`,
    },
  ];
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
  let contentHtml = "";

  // sections가 있으면 섹션별로 렌더링
  if (plugin.sections && plugin.sections.length > 0) {
    contentHtml = plugin.sections
      .map((section) => {
        let subSectionsHtml = "";

        if (section.subSections && section.subSections.length > 0) {
          subSectionsHtml = section.subSections
            .map((subSection) => {
              // 컨텐츠를 타입별로 분류
              const listItems = subSection.content.filter((c) => c.type === "list");
              const commands = subSection.content.filter((c) => c.type === "command");
              const texts = subSection.content.filter((c) => c.type === "text");

              let subSectionContent = "";

              // 리스트가 있으면 ul로 렌더링
              if (listItems.length > 0) {
                const listHtml = listItems
                  .map((item) => `              <li>${item.text}</li>`)
                  .join("\n");
                subSectionContent += `
            <ul>
${listHtml}
            </ul>`;
              }

              // 텍스트가 있으면 p로 렌더링
              if (texts.length > 0) {
                subSectionContent += texts
                  .map((item) => `            <p>${item.text}</p>`)
                  .join("\n");
              }

              // 명령어가 있으면 command-wrapper로 렌더링
              if (commands.length > 0) {
                subSectionContent += commands
                  .map(
                    (item) =>
                      `\n            <div class="command-wrapper"><div class="command">${item.text}</div></div>`,
                  )
                  .join("");
              }

              return `
            <div class="subsection">
              <h4>${subSection.title}</h4>${subSectionContent}
            </div>`;
            })
            .join("\n");
        }

        return `
          <div class="section">
            <h3 class="section-title">${section.title}</h3>
            ${section.description ? `<p class="section-description">${section.description}</p>` : ""}
${subSectionsHtml}
          </div>`;
      })
      .join("\n");
  } else {
    // 섹션이 없으면 기존 방식으로 렌더링
    const featuresHtml = plugin.features
      .map((feature) => `              <li>${feature}</li>`)
      .join("\n");

    const commandsHtml = plugin.commands
      .map(
        (cmd) =>
          `<div class="command-wrapper"><div class="command">${cmd}</div></div>`,
      )
      .join("\n            ");

    contentHtml = `
          <div class="features">
            <h3>주요 기능</h3>
            <ul>
${featuresHtml}
            </ul>
          </div>

          <div class="usage">
            <h3 style="margin-top: 1rem">사용법</h3>
            ${commandsHtml}
          </div>`;
  }

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
${contentHtml}
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
    .flatMap((pluginDir) => {
      const readmePath = path.join(pluginDir, "README.md");
      if (!fs.existsSync(readmePath)) {
        console.warn(`⚠️  No README.md found in ${pluginDir}`);
        return [];
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
  const pluginsDir = path.join(__dirname, "..", "docs", "plugins");
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  // 상세 페이지 템플릿 파일 읽기
  const DETAIL_TEMPLATE_PATH = path.join(__dirname, "..", "docs", "detail-template.html");
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
