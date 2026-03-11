#!/usr/bin/env node

/**
 * npmx.dev Compare 페이지에서 패키지 메트릭을 CDP로 스크래핑합니다.
 *
 * 사전조건:
 *   Chrome/Chromium이 --remote-debugging-port=9222로 실행 중이어야 합니다.
 *   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *     --headless=new --remote-debugging-port=9222 --no-first-run --disable-gpu --no-sandbox
 *
 * 사용법:
 *   node scrape-npmx.mjs <패키지명> [패키지명2 ...]
 *
 * 단일 패키지인 경우 비교 대상으로 react를 더미로 추가하고,
 * 결과에서 대상 패키지 데이터만 추출합니다.
 *
 * 요구사항: Node.js 22+, Chrome/Chromium (9222 포트)
 *
 * 출력: JSON (stdout)
 */

import http from 'node:http'

// --- 설정 ---
const CDP_PORT = 9222
const NPMX_COMPARE_URL = 'https://npmx.dev/compare'
const DUMMY_PACKAGE = 'react'
const PAGE_LOAD_TIMEOUT = 15_000
const RENDER_WAIT = 5_000

// --- CDP 통신 ---
async function getPageWebSocketUrl() {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
            let data = ''
            res.on('data', (chunk) => (data += chunk))
            res.on('end', () => {
                try {
                    const targets = JSON.parse(data)
                    const page = targets.find((t) => t.type === 'page')
                    if (page?.webSocketDebuggerUrl) {
                        resolve(page.webSocketDebuggerUrl)
                    } else {
                        reject(new Error('페이지 타겟을 찾을 수 없습니다'))
                    }
                } catch (e) {
                    reject(new Error(`CDP 응답 파싱 실패: ${e.message}`))
                }
            })
        })
        req.on('error', (e) => {
            reject(
                new Error(
                    `CDP 연결 실패 (127.0.0.1:${CDP_PORT}). Chrome이 --remote-debugging-port=${CDP_PORT}로 실행 중인지 확인하세요.\n${e.message}`,
                ),
            )
        })
        req.setTimeout(5000, () => {
            req.destroy()
            reject(new Error('CDP 연결 타임아웃'))
        })
    })
}

async function cdpSend(ws, method, params = {}) {
    const id = Math.floor(Math.random() * 100000)
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`CDP 타임아웃: ${method}`)), 30_000)

        const handler = (event) => {
            const msg = JSON.parse(event.data)
            if (msg.id === id) {
                clearTimeout(timeout)
                ws.removeEventListener('message', handler)
                if (msg.error) {
                    reject(new Error(`CDP 에러: ${JSON.stringify(msg.error)}`))
                } else {
                    resolve(msg.result)
                }
            }
        }

        ws.addEventListener('message', handler)
        ws.send(JSON.stringify({id, method, params}))
    })
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- 메인 ---
async function main() {
    const args = process.argv.slice(2)

    if (args.length === 0) {
        console.error('사용법: node scrape-npmx.mjs <패키지명> [패키지명2 ...]')
        process.exit(1)
    }

    const targetPackages = [...args]
    const comparePackages = args.length === 1 ? [...args, DUMMY_PACKAGE] : [...args]
    const compareUrl = `${NPMX_COMPARE_URL}?packages=${comparePackages.map(encodeURIComponent).join(',')}`

    // 1. 실행 중인 Chrome의 페이지 타겟에 연결
    const wsUrl = await getPageWebSocketUrl()

    const ws = new WebSocket(wsUrl)
    await new Promise((resolve, reject) => {
        ws.onopen = resolve
        ws.onerror = reject
    })

    try {
        // 2. 페이지 이동
        await cdpSend(ws, 'Page.enable')
        await cdpSend(ws, 'Page.navigate', {url: compareUrl})

        // 페이지 로드 완료 대기
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('페이지 로드 타임아웃')), PAGE_LOAD_TIMEOUT)
            const handler = (event) => {
                const msg = JSON.parse(event.data)
                if (msg.method === 'Page.loadEventFired') {
                    clearTimeout(timeout)
                    ws.removeEventListener('message', handler)
                    resolve()
                }
            }
            ws.addEventListener('message', handler)
        })

        // JS 렌더링 대기
        await sleep(RENDER_WAIT)

        // 3. DOM에서 데이터 추출
        const extractScript = `
        (() => {
            const result = {};
            const grid = document.querySelector('.comparison-grid');
            if (!grid) {
                return JSON.stringify({ error: 'comparison-grid를 찾을 수 없습니다', rawText: document.body?.innerText?.substring(0, 3000) || '' });
            }

            // 패키지명 헤더 추출 (.comparison-cell-header 내 a 태그의 title)
            // title은 "lodash-es@4.17.23" 형태이므로 마지막 @버전을 제거
            const packageNames = [...grid.querySelectorAll('.comparison-cell-header')]
                .map(cell => {
                    const link = cell.querySelector('a[title]');
                    const raw = link?.title || cell.textContent?.trim() || '';
                    // @scope/pkg@version → @scope/pkg, pkg@version → pkg
                    return raw.replace(/@[^@/]+$/, '');
                })
                .filter(Boolean);

            // 각 .contents 블록에서 메트릭 추출
            const metrics = {};
            grid.querySelectorAll('.contents').forEach(block => {
                // 메트릭명: .comparison-label > span
                const label = block.querySelector('.comparison-label span')?.textContent?.trim();
                if (!label) return;

                // 값: 각 .comparison-cell 에서 추출
                const values = [...block.querySelectorAll('.comparison-cell:not(.comparison-cell-header)')].map(cell => {
                    // time 요소 우선 (Published 등)
                    const time = cell.querySelector('time');
                    if (time) return time.getAttribute('title') || time.textContent?.trim() || 'N/A';

                    // span[dir="auto"] (일반 값)
                    const valueSpan = cell.querySelector('span[dir="auto"]');
                    if (valueSpan) return valueSpan.textContent?.trim() || 'N/A';

                    // "-" 표시 (데이터 없음)
                    const muted = cell.querySelector('.text-fg-subtle');
                    if (muted) return muted.textContent?.trim() || '-';

                    return 'N/A';
                });

                metrics[label] = values;
            });

            // 패키지별로 구조화
            const packages = {};
            packageNames.forEach((pkg, idx) => {
                packages[pkg] = {};
                for (const [key, values] of Object.entries(metrics)) {
                    packages[pkg][key] = values[idx] || 'N/A';
                }
            });

            result.packages = packages;
            result.url = window.location.href;
            return JSON.stringify(result);
        })()
        `

        const evalResult = await cdpSend(ws, 'Runtime.evaluate', {
            expression: extractScript,
            returnByValue: true,
        })

        const data = JSON.parse(evalResult.result.value)

        // 단일 패키지 평가인 경우 더미 패키지 제거
        if (args.length === 1 && data.packages) {
            delete data.packages[DUMMY_PACKAGE]
        }

        // 대상 패키지만 필터
        if (data.packages) {
            const filtered = {}
            for (const pkg of targetPackages) {
                if (data.packages[pkg]) {
                    filtered[pkg] = data.packages[pkg]
                }
            }
            data.packages = filtered
        }

        // 4. 결과 출력
        console.log(JSON.stringify(data, null, 2))
    } finally {
        ws.close()
    }
}

main().catch((err) => {
    console.error(JSON.stringify({error: err.message}))
    process.exit(1)
})
