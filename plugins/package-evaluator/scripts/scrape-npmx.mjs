#!/usr/bin/env node

/**
 * npmx.dev Compare 페이지에서 패키지 메트릭을 CDP Accessibility Tree로 스크래핑합니다.
 *
 * DOM 셀렉터 대신 접근성 트리(AXTree)를 사용하여
 * CSS 클래스 변경에 영향받지 않는 안정적인 데이터 추출을 합니다.
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

// --- AXTree 파싱 ---
function extractFromAXTree(nodes) {
    // COMPARISON 영역의 구조를 활용:
    //   InlineTextBox name="METRIC NAME"   ← 메트릭 라벨
    //   generic       desc="pkg@version"   ← 패키지 식별
    //   StaticText    name="value"          ← 값 (또는 time desc="date")
    //   generic       desc="pkg@version"   ← 다음 패키지
    //   StaticText    name="value"          ← 값
    //   InlineTextBox name="NEXT METRIC"   ← 다음 메트릭
    //
    // 앵커 포인트 없이, generic[desc] 패턴으로 패키지-메트릭-값을 직접 매핑

    // COMPARISON heading 이후 노드만 탐색
    const compIdx = nodes.findIndex(
        (n) => n.role?.value === 'heading' && n.name?.value === 'COMPARISON',
    )
    if (compIdx === -1) {
        return {error: 'AXTree에서 COMPARISON 영역을 찾을 수 없습니다'}
    }

    const packages = {}
    let currentMetric = null

    for (let i = compIdx + 1; i < nodes.length; i++) {
        const node = nodes[i]
        const role = node.role?.value
        const name = node.name?.value || ''
        const desc = node.description?.value || ''

        // 다음 heading이 나오면 COMPARISON 영역 종료
        if (role === 'heading') break

        // InlineTextBox = 메트릭 라벨
        if (role === 'InlineTextBox' && name) {
            currentMetric = name
            continue
        }

        // generic + desc="pkg@version" = 패키지 셀 시작
        if (role === 'generic' && desc && /@\d/.test(desc)) {
            const pkgName = desc.replace(/@[^@/]+$/, '')
            if (!packages[pkgName]) packages[pkgName] = {}

            // 이후 노드에서 값 추출 (StaticText 또는 time, 빈 노드 건너뜀)
            for (let j = i + 1; j < Math.min(i + 5, nodes.length); j++) {
                const vNode = nodes[j]
                const vRole = vNode.role?.value
                const vName = vNode.name?.value || ''
                const vDesc = vNode.description?.value || ''

                if (vRole === 'time') {
                    packages[pkgName][currentMetric] = vDesc || vName || 'N/A'
                    break
                } else if (vRole === 'StaticText' && vName) {
                    packages[pkgName][currentMetric] = vName
                    break
                }
            }
        }
    }

    return {packages}
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

    // 1. Chrome 페이지 타겟 연결
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

        // 3. Accessibility Tree 추출
        await cdpSend(ws, 'Accessibility.enable')
        const axResult = await cdpSend(ws, 'Accessibility.getFullAXTree')

        // 4. 패키지 데이터 추출
        const data = extractFromAXTree(axResult.nodes)
        data.url = compareUrl
        data.method = 'accessibility-tree'

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

        // 5. 결과 출력
        console.log(JSON.stringify(data, null, 2))
    } finally {
        ws.close()
    }
}

main().catch((err) => {
    console.error(JSON.stringify({error: err.message}))
    process.exit(1)
})
