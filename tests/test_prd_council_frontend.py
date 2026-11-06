#!/usr/bin/env python3
"""
CDJP Butare APSE v1.0 — Multi-Viewport Frontend & Interactive E2E Test Suite
Generated & Executed for the 5-Agent PRD Test Council.

Tests the live frontend UI via Headless Chrome DevTools Protocol (CDP) across:
  1. Desktop Viewport: 1440x900 (mobile=False)
  2. Tablet Portrait:  768x1024 (mobile=True)
  3. Tablet Landscape: 1024x768 (mobile=True)
  4. Mobile Android:   360x800  (mobile=True)
  5. Mobile iPhone:    390x844  (mobile=True)

Plus Themes, Design Tokens, Print Media Emulation, and Interactive End-to-End Flows.
"""

import asyncio
import base64
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import websockets

ROOT = Path(__file__).resolve().parents[1]
BOOT_SCRIPT = ROOT / "run.py"
CHROME_EXE = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
if not CHROME_EXE.exists():
    CHROME_EXE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")

PARENT_ARTIFACT_DIR = Path(r"C:\Users\indah\.gemini\antigravity\brain\153a4561-1c61-4c3d-b9fe-43ed1d186c63")
OWN_ARTIFACT_DIR = Path(r"C:\Users\indah\.gemini\antigravity\brain\b8e8e53f-2716-4d3f-a88d-24e6cf9af15b")


def get_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class CDPClient:
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 0
        self.pending = {}
        self._recv_task = None

    async def __aenter__(self):
        self.ws = await websockets.connect(self.ws_url, max_size=50 * 1024 * 1024)
        self._recv_task = asyncio.create_task(self._receiver())
        await self.send("Page.enable")
        await self.send("Runtime.enable")
        await self.send("DOM.enable")
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self._recv_task:
            self._recv_task.cancel()
        if self.ws:
            await self.ws.close()

    async def _receiver(self):
        try:
            async for raw in self.ws:
                msg = json.loads(raw)
                mid = msg.get("id")
                if mid in self.pending:
                    fut = self.pending.pop(mid)
                    if not fut.done():
                        fut.set_result(msg)
        except Exception:
            pass

    async def send(self, method: str, params: dict = None) -> dict:
        self.msg_id += 1
        mid = self.msg_id
        fut = asyncio.get_running_loop().create_future()
        self.pending[mid] = fut
        payload = {"id": mid, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        resp = await asyncio.wait_for(fut, timeout=20.0)
        if "error" in resp:
            raise RuntimeError(f"CDP error in {method}: {resp['error']}")
        return resp.get("result", {})

    async def evaluate(self, expression: str, await_promise: bool = True):
        res = await self.send(
            "Runtime.evaluate",
            {
                "expression": expression,
                "returnByValue": True,
                "awaitPromise": await_promise,
            },
        )
        if "exceptionDetails" in res:
            raise RuntimeError(f"JS Exception: {res['exceptionDetails']}")
        return res.get("result", {}).get("value")

    async def set_viewport(self, width: int, height: int, mobile: bool = False, scale: float = 1.0):
        await self.send(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": width,
                "height": height,
                "deviceScaleFactor": scale,
                "mobile": mobile,
            },
        )
        await asyncio.sleep(0.15)

    async def screenshot(self, filename: str):
        res = await self.send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
        png_bytes = base64.b64decode(res["data"])
        for out_dir in (PARENT_ARTIFACT_DIR, OWN_ARTIFACT_DIR):
            if out_dir.exists():
                (out_dir / filename).write_bytes(png_bytes)
        return len(png_bytes)


class TestRecorder:
    def __init__(self):
        self.results = []
        self.discrepancies = []

    def record(self, test_id: str, viewport: str, title: str, passed: bool, details: str, is_prd_discrepancy: bool = False):
        status = "PASS" if passed else ("PRD_DISCREPANCY" if is_prd_discrepancy else "FAIL")
        entry = {
            "test_id": test_id,
            "viewport": viewport,
            "title": title,
            "status": status,
            "passed": passed,
            "details": details,
        }
        self.results.append(entry)
        if not passed or is_prd_discrepancy:
            self.discrepancies.append(entry)
        icon = "✅" if passed else ("⚠️" if is_prd_discrepancy else "❌")
        print(f"{icon} [{test_id}] ({viewport}) {title}: {details}")


async def wait_for_app_ready(cdp: CDPClient, app_url: str):
    await cdp.send("Page.navigate", {"url": app_url})
    for _ in range(80):
        ready = await cdp.evaluate("Boolean(typeof V1 !== 'undefined' && V1.data && document.querySelector('.v1-topbar'))")
        if ready:
            return
        await asyncio.sleep(0.15)
    body_txt = await cdp.evaluate("document.body ? document.body.innerText : 'no body'")
    raise RuntimeError(f"APSE v1.0 frontend did not finish loading bootstrap data in time. Body: {body_txt}")


async def run_frontend_suite():
    rec = TestRecorder()
    server_port = get_free_port()
    cdp_port = get_free_port()
    temp_data_dir = tempfile.mkdtemp(prefix="apse_fe_data_")
    temp_chrome_dir = tempfile.mkdtemp(prefix="apse_fe_chrome_")

    server_proc = None
    chrome_proc = None

    try:
        # 1. Start isolated loopback APSE server
        python_bin = sys.executable
        server_cmd = [
            python_bin,
            "-X",
            "utf8",
            str(BOOT_SCRIPT),
            "--no-auth",
            "--no-browser",
            "--port",
            str(server_port),
            "--data",
            temp_data_dir,
        ]
        server_proc = subprocess.Popen(
            server_cmd,
            cwd=str(ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        app_url = f"http://127.0.0.1:{server_port}/api/apps/apse/operations.html"
        for _ in range(60):
            try:
                with urllib.request.urlopen(app_url, timeout=1) as r:
                    if r.status == 200:
                        break
            except Exception:
                await asyncio.sleep(0.15)
        else:
            raise RuntimeError("Loopback server failed to start.")

        # 2. Launch Headless Chrome with CDP
        chrome_cmd = [
            str(CHROME_EXE),
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            f"--remote-debugging-port={cdp_port}",
            f"--user-data-dir={temp_chrome_dir}",
            app_url,
        ]
        chrome_proc = subprocess.Popen(
            chrome_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        ws_url = None
        for _ in range(60):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{cdp_port}/json/list", timeout=1) as r:
                    pages = json.loads(r.read().decode("utf-8"))
                    for p in pages:
                        if p.get("type") == "page" and "webSocketDebuggerUrl" in p:
                            ws_url = p["webSocketDebuggerUrl"]
                            break
                    if ws_url:
                        break
            except Exception:
                await asyncio.sleep(0.15)
        if not ws_url:
            raise RuntimeError("Could not obtain Chrome CDP WebSocket URL.")

        async with CDPClient(ws_url) as cdp:
            await wait_for_app_ready(cdp, app_url)

            # ==================================================================
            # PHASE 1: DESKTOP VIEWPORT (1440 x 900) — TC-UI-01 to TC-UI-06
            # ==================================================================
            await cdp.set_viewport(1440, 900, mobile=False)
            await cdp.evaluate("""
                V1.lang = 'en';
                V1.theme = 'light';
                V1.workspace = 'tasks';
                V1.wizard = null;
                V1.newTaskModal = false;
                V1.mobileSheet = null;
                V1.filters = { period: 'ALL', axis: '', parish: '', status: 'ALL', approvalStage: 'ALL', issueCategory: 'ALL' };
                renderApp();
            """)
            await asyncio.sleep(0.15)
            await cdp.screenshot("desktop_1440x900.png")

            # TC-UI-01: Application Shell, 56px Topbar, 240px Sidebar, Hidden Bottom Nav
            ui01 = await cdp.evaluate("""(() => {
                const tb = document.querySelector('.v1-topbar');
                const sb = document.querySelector('.v1-sidebar');
                const bn = document.querySelector('.v1-bottom-nav');
                const up = document.querySelector('.v1-user-pill');
                const bt = document.querySelector('.v1-brand-text');
                const tbStyle = getComputedStyle(tb);
                const sbStyle = getComputedStyle(sb);
                const bnStyle = getComputedStyle(bn);
                const upStyle = getComputedStyle(up);
                const btStyle = getComputedStyle(bt);
                return {
                    topbarHeight: tb.getBoundingClientRect().height,
                    topbarPos: tbStyle.position,
                    topbarZ: tbStyle.zIndex,
                    sidebarWidth: sb.getBoundingClientRect().width,
                    sidebarDisplay: sbStyle.display,
                    bottomNavDisplay: bnStyle.display,
                    userPillDisplay: upStyle.display,
                    brandTextDisplay: btStyle.display
                };
            })()""")
            rec.record(
                "TC-UI-01",
                "Desktop 1440x900",
                "Sticky 56px Topbar, 240px Sidebar, Hidden Bottom Nav",
                ui01["topbarHeight"] == 56
                and ui01["topbarPos"] == "sticky"
                and ui01["sidebarWidth"] == 240
                and ui01["sidebarDisplay"] == "flex"
                and ui01["bottomNavDisplay"] == "none"
                and ui01["userPillDisplay"] != "none"
                and ui01["brandTextDisplay"] != "none",
                f"topbar={ui01['topbarHeight']}px ({ui01['topbarPos']}), sidebar={ui01['sidebarWidth']}px ({ui01['sidebarDisplay']}), bottomNav={ui01['bottomNavDisplay']}, userPill={ui01['userPillDisplay']}",
            )

            # Switch to Analytics to test TC-UI-02 & TC-UI-03
            await cdp.evaluate("V1.workspace = 'analytics'; renderApp();")
            await asyncio.sleep(0.1)
            await cdp.screenshot("desktop_analytics_1440x900.png")

            ui02 = await cdp.evaluate("""(() => {
                const kpis = [...document.querySelectorAll('.v1-kpi-grid .v1-kpi-card')];
                const panels = [...document.querySelectorAll('.v1-analytics-split .v1-panel')];
                const kpiTops = kpis.map(k => Math.round(k.getBoundingClientRect().top));
                const kpiWidths = kpis.map(k => Math.round(k.getBoundingClientRect().width));
                const panelTops = panels.map(p => Math.round(p.getBoundingClientRect().top));
                const panelWidths = panels.map(p => Math.round(p.getBoundingClientRect().width));
                const canvasPad = getComputedStyle(document.querySelector('.v1-canvas')).padding;
                return {
                    kpiCount: kpis.length,
                    kpiTops,
                    kpiWidths,
                    panelCount: panels.length,
                    panelTops,
                    panelWidths,
                    canvasPad
                };
            })()""")
            rec.record(
                "TC-UI-02",
                "Desktop 1440x900",
                "16-Column Carbon Grid: 4 KPI Cards in 1 Row (span 4) & 2 Split Panels (span 8)",
                ui02["kpiCount"] == 4
                and len(set(ui02["kpiTops"])) == 1
                and ui02["panelCount"] == 2
                and len(set(ui02["panelTops"])) == 1,
                f"KPI tops={ui02['kpiTops']} widths={ui02['kpiWidths']}px; Panel tops={ui02['panelTops']} widths={ui02['panelWidths']}px; canvasPad={ui02['canvasPad']}",
            )

            # TC-UI-03: Desktop Carbon Data Table visible, Polaris Resource List hidden
            ui03 = await cdp.evaluate("""(() => {
                const tbl = document.querySelector('.v1-accordion .v1-data-table');
                const pol = document.querySelector('.v1-accordion .v1-polaris-resource-list');
                return {
                    tableDisplay: getComputedStyle(tbl).display,
                    polarisDisplay: getComputedStyle(pol).display,
                    thCount: tbl.querySelectorAll('th').length
                };
            })()""")
            rec.record(
                "TC-UI-03",
                "Desktop 1440x900",
                "Desktop Carbon .v1-data-table visible (display: table), .v1-polaris-resource-list hidden",
                ui03["tableDisplay"] == "table" and ui03["polarisDisplay"] == "none" and ui03["thCount"] == 5,
                f"tableDisplay={ui03['tableDisplay']} ({ui03['thCount']} cols), polarisDisplay={ui03['polarisDisplay']}",
            )

            # TC-UI-04: Desktop 4-Step Wizard Layout (4-column stepper bar, hidden momentum header & mobile filter trigger)
            await cdp.evaluate("""
                V1.workspace = 'tasks';
                renderApp();
            """)
            filter_trigger_disp = await cdp.evaluate("getComputedStyle(document.querySelector('.v1-mobile-filter-trigger')).display")
            await cdp.evaluate("openWizardForTask(V1.data.tasks[0], V1.data.tasks[0].latest_log);")
            ui04 = await cdp.evaluate("""(() => {
                const sb = document.querySelector('.v1-stepper-bar');
                const steps = [...sb.querySelectorAll('.v1-step-indicator')];
                const stepTops = steps.map(s => Math.round(s.getBoundingClientRect().top));
                const mh = document.querySelector('.v1-momentum-progress-header');
                const wf = document.querySelector('.v1-wizard-footer');
                return {
                    stepCount: steps.length,
                    stepTops,
                    momentumDisplay: getComputedStyle(mh).display,
                    footerPos: getComputedStyle(wf).position
                };
            })()""")
            rec.record(
                "TC-UI-04",
                "Desktop 1440x900",
                "4-Col Wizard Stepper Bar, Hidden Momentum Header & Mobile Filter Trigger",
                ui04["stepCount"] == 4
                and len(set(ui04["stepTops"])) == 1
                and ui04["momentumDisplay"] == "none"
                and filter_trigger_disp == "none"
                and ui04["footerPos"] == "static",
                f"stepperTops={ui04['stepTops']}, momentumHeader={ui04['momentumDisplay']}, mobileFilterTrigger={filter_trigger_disp}, footerPos={ui04['footerPos']}",
            )

            # Close wizard and test TC-UI-05 across all 4 workspaces
            await cdp.evaluate("V1.wizard = null; renderApp();")
            ui05 = await cdp.evaluate("""(() => {
                const workspaces = ['tasks', 'approvals', 'analytics', 'exports'];
                const primaryCounts = {};
                let minBtnHeight = 999;
                let btnGap = '';
                for (const ws of workspaces) {
                    V1.workspace = ws;
                    V1.wizard = null;
                    renderApp();
                    const btns = [...document.querySelectorAll('.v1-canvas .v1-btn')].filter(b => getComputedStyle(b).display !== 'none');
                    let primaries = 0;
                    for (const b of btns) {
                        const cs = getComputedStyle(b);
                        if (cs.backgroundColor === 'rgb(35, 35, 35)') primaries++;
                        if (!b.classList.contains('v1-btn-sm')) {
                            minBtnHeight = Math.min(minBtnHeight, Math.round(b.getBoundingClientRect().height));
                            btnGap = cs.gap;
                        }
                    }
                    primaryCounts[ws] = primaries;
                }
                V1.workspace = 'tasks';
                renderApp();
                return { primaryCounts, minBtnHeight, btnGap };
            })()""")
            max_primaries = max(ui05["primaryCounts"].values())
            rec.record(
                "TC-UI-05",
                "Desktop 1440x900",
                "Kargul Pill Button Height >= 40px, 16px Gap, Max 1 Primary (#232323) CTA per Workspace View",
                ui05["minBtnHeight"] >= 40 and ui05["btnGap"] == "16px" and max_primaries <= 1,
                f"minBtnHeight={ui05['minBtnHeight']}px, gap={ui05['btnGap']}, primaryCountPerWorkspace={ui05['primaryCounts']}",
            )

            # TC-UI-06: Breadcrumbs, Kargul Capsule Lozenges, Tabular Nums, Material Symbols, Zero Overflow
            ui06 = await cdp.evaluate("""(() => {
                const bc = document.querySelector('nav.v1-breadcrumbs');
                const h1 = document.querySelector('h1.v1-page-title');
                const badge = document.querySelector('.v1-badge');
                const bStyle = getComputedStyle(badge);
                const h1Style = getComputedStyle(h1);
                const icon20 = document.querySelector('.v1-icon-20 svg');
                const icon16 = document.querySelector('.v1-icon-16 svg');
                const tabStyle = getComputedStyle(document.querySelector('.v1-tabular'));
                return {
                    bcAboveH1: bc.getBoundingClientRect().bottom <= h1.getBoundingClientRect().top + 2,
                    h1FontSize: h1Style.fontSize,
                    h1Weight: h1Style.fontWeight,
                    badgeFontSize: bStyle.fontSize,
                    badgeWeight: bStyle.fontWeight,
                    badgeTransform: bStyle.textTransform,
                    badgeRadius: bStyle.borderRadius,
                    badgeBorder: bStyle.borderWidth,
                    tabularNums: tabStyle.fontVariantNumeric,
                    icon20ViewBox: icon20 ? icon20.getAttribute('viewBox') : null,
                    icon16Width: icon16 ? icon16.getAttribute('width') : null,
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth
                };
            })()""")
            rec.record(
                "TC-UI-06",
                "Desktop 1440x900",
                "Breadcrumbs above H1 (32px/700), Kargul Capsule Lozenges (11px/700/uppercase/9999px/0px), tabular-nums, Material Symbols, Zero Overflow",
                ui06["bcAboveH1"]
                and ui06["h1FontSize"] == "32px"
                and ui06["h1Weight"] == "700"
                and ui06["badgeFontSize"] == "11px"
                and ui06["badgeWeight"] == "700"
                and ui06["badgeTransform"] == "uppercase"
                and ui06["badgeRadius"] == "9999px"
                and ui06["badgeBorder"] == "0px"
                and "tabular-nums" in ui06["tabularNums"]
                and ui06["icon20ViewBox"] == "0 0 24 24"
                and ui06["scrollWidth"] <= ui06["innerWidth"],
                f"bcAboveH1={ui06['bcAboveH1']}, h1={ui06['h1FontSize']}/{ui06['h1Weight']}, badge={ui06['badgeFontSize']}/{ui06['badgeWeight']}/{ui06['badgeTransform']}/r={ui06['badgeRadius']}/b={ui06['badgeBorder']}, tabular={ui06['tabularNums']}, scroll={ui06['scrollWidth']}/{ui06['innerWidth']}",
            )

            # ==================================================================
            # PHASE 2: TABLET VIEWPORTS (768x1024 Portrait & 1024x768 Landscape)
            # ==================================================================
            for vp_name, w_px, h_px in [("Tablet Portrait 768x1024", 768, 1024), ("Tablet Landscape 1024x768", 1024, 768)]:
                await cdp.set_viewport(w_px, h_px, mobile=True)
                await cdp.evaluate("V1.workspace = 'analytics'; V1.wizard = null; renderApp();")
                await asyncio.sleep(0.15)
                if w_px == 768:
                    await cdp.screenshot("tablet_768x1024.png")

                # TC-UI-07: Sidebar hidden, 60px Bottom Nav visible, User Pill hidden, 88px Canvas bottom padding
                ui07 = await cdp.evaluate("""(() => {
                    const sb = document.querySelector('.v1-sidebar');
                    const bn = document.querySelector('.v1-bottom-nav');
                    const up = document.querySelector('.v1-user-pill');
                    const cv = document.querySelector('.v1-canvas');
                    return {
                        sidebarDisplay: getComputedStyle(sb).display,
                        bottomNavDisplay: getComputedStyle(bn).display,
                        bottomNavHeight: bn.getBoundingClientRect().height,
                        bottomBtns: bn.querySelectorAll('.v1-bottom-btn').length,
                        userPillDisplay: getComputedStyle(up).display,
                        canvasPadBottom: getComputedStyle(cv).paddingBottom
                    };
                })()""")
                rec.record(
                    "TC-UI-07",
                    vp_name,
                    "Sidebar Hidden, 60px 4-Tab Bottom Nav Visible, User Pill Hidden, 88px Canvas Bottom Padding",
                    ui07["sidebarDisplay"] == "none"
                    and ui07["bottomNavDisplay"] == "grid"
                    and ui07["bottomNavHeight"] == 60
                    and ui07["bottomBtns"] == 4
                    and ui07["userPillDisplay"] == "none"
                    and ui07["canvasPadBottom"] == "88px",
                    f"sidebar={ui07['sidebarDisplay']}, bottomNav={ui07['bottomNavDisplay']} ({ui07['bottomNavHeight']}px, {ui07['bottomBtns']} tabs), userPill={ui07['userPillDisplay']}, padBottom={ui07['canvasPadBottom']}",
                )

                # TC-UI-08: KPI Cards 2-per-row (span 8) & Panels Stacked Full-Width (span 16)
                ui08 = await cdp.evaluate("""(() => {
                    const kpis = [...document.querySelectorAll('.v1-kpi-grid .v1-kpi-card')];
                    const panels = [...document.querySelectorAll('.v1-analytics-split .v1-panel')];
                    const kTops = kpis.map(k => Math.round(k.getBoundingClientRect().top));
                    const pTops = panels.map(p => Math.round(p.getBoundingClientRect().top));
                    const pWidths = panels.map(p => Math.round(p.getBoundingClientRect().width));
                    return { kTops, pTops, pWidths };
                })()""")
                kpi_2x2 = (ui08["kTops"][0] == ui08["kTops"][1]) and (ui08["kTops"][2] == ui08["kTops"][3]) and (ui08["kTops"][2] > ui08["kTops"][0])
                panels_stacked = ui08["pTops"][1] > ui08["pTops"][0]
                rec.record(
                    "TC-UI-08",
                    vp_name,
                    "KPI Cards Reflow to 2-per-row (span 8) & Analytics Panels Stack Full-Width (span 16)",
                    kpi_2x2 and panels_stacked,
                    f"kpiTops={ui08['kTops']} (2x2={kpi_2x2}), panelTops={ui08['pTops']} widths={ui08['pWidths']}px (stacked={panels_stacked})",
                )

                # TC-UI-09: Data Table preserved on Tablet & Zero Horizontal Overflow
                ui09 = await cdp.evaluate("""(() => {
                    const tbl = document.querySelector('.v1-accordion .v1-data-table');
                    const pol = document.querySelector('.v1-accordion .v1-polaris-resource-list');
                    return {
                        tableDisplay: getComputedStyle(tbl).display,
                        polarisDisplay: getComputedStyle(pol).display,
                        scrollWidth: document.documentElement.scrollWidth,
                        innerWidth: window.innerWidth
                    };
                })()""")
                rec.record(
                    "TC-UI-09",
                    vp_name,
                    "Desktop Data Table Preserved on Tablet & Zero Horizontal Overflow",
                    ui09["tableDisplay"] == "table" and ui09["polarisDisplay"] == "none" and ui09["scrollWidth"] <= ui09["innerWidth"],
                    f"table={ui09['tableDisplay']}, polaris={ui09['polarisDisplay']}, scroll={ui09['scrollWidth']}/{ui09['innerWidth']}",
                )

            # Check Tablet/Mobile Wizard Step 4 responsive reflow
            await cdp.set_viewport(768, 1024, mobile=True)
            await cdp.evaluate("V1.workspace = 'tasks'; openWizardForTask(V1.data.tasks[0], V1.data.tasks[0].latest_log, 4); V1.wizard.step = 4; renderApp();")
            step4_tablet = await cdp.evaluate("""(() => {
                const cards = [...document.querySelectorAll('.v1-wizard-card .v1-kpi-card')];
                return {
                    inlineCols: cards.map(c => c.style.gridColumn),
                    tops: cards.map(c => Math.round(c.getBoundingClientRect().top)),
                    widths: cards.map(c => Math.round(c.getBoundingClientRect().width))
                };
            })()""")
            step4_reflowed = len(set(step4_tablet["tops"])) > 1
            rec.record(
                "TC-UI-08-STEP4",
                "Tablet Portrait 768x1024",
                "Wizard Step 4 Summary KPI Cards Responsive Reflow (.v1-step4-card-5 / .v1-step4-card-6)",
                step4_reflowed,
                f"Wizard Step 4 cards responsive reflow: tops={step4_tablet['tops']}, widths={step4_tablet['widths']}px",
                is_prd_discrepancy=(not step4_reflowed),
            )

            # ==================================================================
            # PHASE 3: MOBILE VIEWPORTS (360x800 Android & 390x844 iPhone)
            # ==================================================================
            for vp_name, w_px, h_px in [("Mobile Android 360x800", 360, 800), ("Mobile iPhone 390x844", 390, 844)]:
                await cdp.set_viewport(w_px, h_px, mobile=True)
                await cdp.evaluate("V1.workspace = 'tasks'; V1.wizard = null; V1.mobileSheet = null; renderApp();")
                await asyncio.sleep(0.15)
                if w_px == 360:
                    await cdp.screenshot("mobile_360x800.png")

                # TC-UI-10: Brand text hidden, KPI cards 1-per-row (span 16), Task cards stacked vertically
                ui10_tasks = await cdp.evaluate("""(() => {
                    const bt = document.querySelector('.v1-brand-text');
                    const tc = document.querySelector('.v1-task-card');
                    return {
                        brandTextDisplay: getComputedStyle(bt).display,
                        taskCardFlexDir: getComputedStyle(tc).flexDirection
                    };
                })()""")
                await cdp.evaluate("V1.workspace = 'analytics'; renderApp();")
                ui10_kpis = await cdp.evaluate("""(() => {
                    const kpis = [...document.querySelectorAll('.v1-kpi-grid .v1-kpi-card')];
                    const tops = kpis.map(k => Math.round(k.getBoundingClientRect().top));
                    return { tops, strictlyIncreasing: tops.every((t, i) => i === 0 || t > tops[i - 1]) };
                })()""")
                rec.record(
                    "TC-UI-10",
                    vp_name,
                    "Brand Text Hidden, KPI Cards Stacked 1-per-row (span 16), Task Cards Column Layout",
                    ui10_tasks["brandTextDisplay"] == "none"
                    and ui10_tasks["taskCardFlexDir"] == "column"
                    and ui10_kpis["strictlyIncreasing"],
                    f"brandText={ui10_tasks['brandTextDisplay']}, taskCardFlexDir={ui10_tasks['taskCardFlexDir']}, kpiTops={ui10_kpis['tops']}",
                )

                # TC-UI-11: Data Table collapses to Shopify Polaris Resource Cards & click opens Wizard
                ui11 = await cdp.evaluate("""(() => {
                    const tbl = document.querySelector('.v1-accordion .v1-data-table');
                    const pol = document.querySelector('.v1-accordion .v1-polaris-resource-list');
                    const card = pol.querySelector('.v1-resource-card');
                    const tblDisp = getComputedStyle(tbl).display;
                    const polDisp = getComputedStyle(pol).display;
                    card.click();
                    return {
                        tableDisplay: tblDisp,
                        polarisDisplay: polDisp,
                        wizardOpened: Boolean(V1.wizard && V1.wizard.task),
                        workspaceAfterClick: V1.workspace
                    };
                })()""")
                rec.record(
                    "TC-UI-11",
                    vp_name,
                    "Data Table Collapses to Polaris Resource List & Card Click Opens Wizard",
                    ui11["tableDisplay"] == "none"
                    and ui11["polarisDisplay"] == "flex"
                    and ui11["wizardOpened"]
                    and ui11["workspaceAfterClick"] == "tasks",
                    f"table={ui11['tableDisplay']}, polaris={ui11['polarisDisplay']}, wizardOpened={ui11['wizardOpened']}",
                )

                # TC-UI-12: 48px Button Touch Targets & 44x44px Touch Steppers (Move to Step 2 in Wizard)
                await cdp.evaluate("V1.wizard.step = 2; V1.wizard.collection_mode = 'ENUMERATOR'; renderApp();")
                if w_px == 360:
                    await cdp.screenshot("mobile_wizard_360x800.png")

                ui12 = await cdp.evaluate("""(() => {
                    const primaryBtn = document.querySelector('.v1-wizard-footer .v1-btn:not(.v1-btn-ghost)');
                    const stepBtn = document.querySelector('.v1-stepper-box .v1-step-btn');
                    const stepInput = document.querySelector('.v1-stepper-box .v1-step-input');
                    const enumScoreInput = document.querySelectorAll('.v1-step-input')[document.querySelectorAll('.v1-step-input').length - 1];
                    return {
                        btnHeight: Math.round(primaryBtn.getBoundingClientRect().height),
                        stepBtnW: Math.round(stepBtn.getBoundingClientRect().width),
                        stepBtnH: Math.round(stepBtn.getBoundingClientRect().height),
                        stepInputH: Math.round(stepInput.getBoundingClientRect().height),
                        enumScoreInputH: Math.round(enumScoreInput.getBoundingClientRect().height)
                    };
                })()""")
                rec.record(
                    "TC-UI-12",
                    vp_name,
                    "48px Primary Button Touch Target & 44x44px Touch Steppers (.v1-step-btn / .v1-step-input)",
                    ui12["btnHeight"] >= 48 and ui12["stepBtnW"] == 44 and ui12["stepBtnH"] == 44 and ui12["stepInputH"] == 44 and ui12["enumScoreInputH"] == 44,
                    f"btnHeight={ui12['btnHeight']}px, stepBtn={ui12['stepBtnW']}x{ui12['stepBtnH']}px, stepInputH={ui12['stepInputH']}px, enumScoreInputH={ui12['enumScoreInputH']}px",
                )

                # TC-UI-13: Momentum Progress Header, 2x2 Stepper Bar & Sticky Footer (bottom: 60px)
                ui13 = await cdp.evaluate("""(() => {
                    const mh = document.querySelector('.v1-momentum-progress-header');
                    const sb = document.querySelector('.v1-stepper-bar');
                    const steps = [...sb.querySelectorAll('.v1-step-indicator')];
                    const sTops = steps.map(s => Math.round(s.getBoundingClientRect().top));
                    const wf = document.querySelector('.v1-wizard-footer');
                    const wfStyle = getComputedStyle(wf);
                    return {
                        mhDisplay: getComputedStyle(mh).display,
                        mhText: mh.textContent.trim(),
                        sTops,
                        twoByTwo: sTops[0] === sTops[1] && sTops[2] === sTops[3] && sTops[2] > sTops[0],
                        footerPos: wfStyle.position,
                        footerBottom: wfStyle.bottom
                    };
                })()""")
                rec.record(
                    "TC-UI-13",
                    vp_name,
                    "Cisco Momentum Progress Header, 2x2 Stepper Bar & Sticky Footer (bottom: 60px)",
                    ui13["mhDisplay"] == "flex"
                    and "2 / 4" in ui13["mhText"]
                    and ui13["twoByTwo"]
                    and ui13["footerPos"] == "sticky"
                    and ui13["footerBottom"] == "60px",
                    f"momentum={ui13['mhDisplay']} ('{ui13['mhText']}'), stepper2x2={ui13['twoByTwo']} (tops={ui13['sTops']}), footer={ui13['footerPos']} bottom={ui13['footerBottom']}",
                )

                # TC-UI-14: Mobile Filter Trigger & Slide-Up Bottom Sheet
                await cdp.evaluate("V1.wizard = null; V1.workspace = 'tasks'; renderApp();")
                ui14 = await cdp.evaluate("""(() => {
                    const trig = document.querySelector('.v1-mobile-filter-trigger');
                    const ctxFilters = document.querySelector('.v1-context-filters');
                    const trigDisp = getComputedStyle(trig).display;
                    const ctxDisp = getComputedStyle(ctxFilters).display;
                    trig.click();
                    const sheet = document.querySelector('.v1-bottom-sheet');
                    const handle = document.querySelector('.v1-sheet-handle');
                    const footerBtns = [...document.querySelectorAll('.v1-sheet-footer .v1-btn')].map(b => b.textContent.trim());
                    const sStyle = getComputedStyle(sheet);
                    const hRect = handle.getBoundingClientRect();
                    return {
                        trigDisp,
                        ctxDisp,
                        sheetRadius: sStyle.borderRadius,
                        handleW: Math.round(hRect.width),
                        handleH: Math.round(hRect.height),
                        footerBtns
                    };
                })()""")
                if w_px == 360:
                    await cdp.screenshot("mobile_bottom_sheet.png")
                await cdp.evaluate("V1.mobileSheet = null; renderApp();")

                rec.record(
                    "TC-UI-14",
                    vp_name,
                    "Mobile Filter Trigger & Slide-Up .v1-bottom-sheet (16px Top Radius, 36x4px Handle, Reset/Apply)",
                    ui14["trigDisp"] in ("flex", "inline-flex")
                    and ui14["ctxDisp"] == "none"
                    and ui14["sheetRadius"] == "16px 16px 0px 0px"
                    and ui14["handleW"] == 36
                    and ui14["handleH"] == 4
                    and "Reset" in ui14["footerBtns"][0]
                    and "Apply Filters" in ui14["footerBtns"][1],
                    f"trigger={ui14['trigDisp']}, ctxFiltersDisplay={ui14['ctxDisp']}, sheetRadius={ui14['sheetRadius']}, handle={ui14['handleW']}x{ui14['handleH']}px, buttons={ui14['footerBtns']}",
                )

                # TC-UI-15: Measure exact scrollWidth vs target viewport width (360px / 390px) across all 4 workspaces & 4 wizard steps
                await cdp.set_viewport(w_px, h_px, mobile=False)
                ui15 = await cdp.evaluate("""(() => {
                    const report = {};
                    const topbarRightRect = document.querySelector('.v1-topbar-right').getBoundingClientRect();
                    const topbarScrollW = document.querySelector('.v1-topbar').scrollWidth;
                    for (const ws of ['tasks', 'approvals', 'analytics', 'exports']) {
                        V1.wizard = null;
                        V1.workspace = ws;
                        renderApp();
                        report['ws_' + ws] = document.documentElement.scrollWidth;
                    }
                    V1.workspace = 'tasks';
                    openWizardForTask(V1.data.tasks[0], V1.data.tasks[0].latest_log, 1);
                    for (const st of [1, 2, 3, 4]) {
                        V1.wizard.step = st;
                        V1.wizard.collection_mode = 'ENUMERATOR';
                        renderApp();
                        report['wiz_step_' + st] = document.documentElement.scrollWidth;
                    }
                    V1.wizard = null;
                    renderApp();
                    return {
                        innerWidth: window.innerWidth,
                        topbarScrollW,
                        topbarRightEdge: Math.round(topbarRightRect.right),
                        report
                    };
                })()""")
                await cdp.set_viewport(w_px, h_px, mobile=True)
                max_scroll = max(ui15["report"].values())
                rec.record(
                    "TC-UI-15",
                    vp_name,
                    f"Zero Horizontal Overflow Check (scrollWidth <= {w_px}px) Across Workspaces & Wizard Steps",
                    max_scroll <= w_px,
                    f"At {w_px}px viewport, topbarScrollW={ui15['topbarScrollW']}px (rightEdge={ui15['topbarRightEdge']}px <= {w_px}px), maxScrollWidth={max_scroll}px, report={ui15['report']}",
                    is_prd_discrepancy=(max_scroll > w_px),
                )

            # ==================================================================
            # PHASE 4: THEMES, DESIGN TOKENS & PRINT MEDIA (TC-UI-16 to TC-UI-20)
            # ==================================================================
            await cdp.set_viewport(1440, 900, mobile=False)

            # TC-UI-16: Surface Themes (light, dark, soft, contrast)
            ui16 = await cdp.evaluate("""(() => {
                const themes = ['light', 'dark', 'soft', 'contrast'];
                const out = {};
                for (const th of themes) {
                    V1.theme = th;
                    renderApp();
                    const cs = getComputedStyle(document.documentElement);
                    const btn = document.querySelector('.v1-btn:not(.v1-btn-secondary):not(.v1-btn-ghost):not(.v1-btn-danger)');
                    out[th] = {
                        bgCanvas: cs.getPropertyValue('--bg-canvas').trim(),
                        bgSurface: cs.getPropertyValue('--bg-surface').trim(),
                        textPrimary: cs.getPropertyValue('--text-primary').trim(),
                        colorPrimary: cs.getPropertyValue('--color-primary').trim(),
                        btnColor: getComputedStyle(btn).color
                    };
                }
                V1.theme = 'light';
                renderApp();
                return out;
            })()""")
            rec.record(
                "TC-UI-16",
                "Desktop 1440x900",
                "4 Surface Themes (light, dark, soft, contrast) Kargul Token & Button Contrast Verification",
                ui16["light"]["bgCanvas"] == "#EFEFEF"
                and ui16["dark"]["bgCanvas"] == "#0A0A0A"
                and ui16["soft"]["bgCanvas"] == "#EAE6DF"
                and ui16["contrast"]["bgCanvas"] == "#000000"
                and ui16["dark"]["btnColor"] == "rgb(23, 23, 23)",
                f"light={ui16['light']['bgCanvas']}, dark={ui16['dark']['bgCanvas']} (btnText={ui16['dark']['btnColor']}), soft={ui16['soft']['bgCanvas']}, contrast={ui16['contrast']['bgCanvas']}",
            )

            # TC-UI-17: Form Inputs, Segmented Pills & Derived Kargul Filter Chips
            await cdp.send("Page.bringToFront")
            ui17 = await cdp.evaluate("""(async () => {
                V1.workspace = 'tasks';
                openWizardForTask(V1.data.tasks[0]);
                V1.wizard.event_date = '2025-01-01'; // trigger has-error
                renderApp();
                const errInput = document.querySelector('.v1-input.has-error');
                const errBorder = getComputedStyle(errInput).borderBottom;
                V1.wizard.event_date = '2026-10-23';
                renderApp();
                const normInput = document.querySelector('.v1-input');
                normInput.style.transition = 'none';
                const normBorder = getComputedStyle(normInput).borderBottom;
                normInput.focus();
                await new Promise(r => setTimeout(r, 50));
                const focusShadow = getComputedStyle(normInput).boxShadow;
                const chipBorder = getComputedStyle(document.querySelector('.v1-chip')).borderWidth;
                V1.wizard = null;
                renderApp();
                const segBorder = getComputedStyle(document.querySelector('.v1-segmented')).borderWidth;
                return { normBorder, focusShadow, errBorder, chipBorder, segBorder };
            })()""")
            rec.record(
                "TC-UI-17",
                "Desktop 1440x900",
                "Kargul Form Input Rest/Focus/Error Borders & 0px Border on Pills/Chips",
                "1px solid rgb(136, 136, 136)" in ui17["normBorder"]
                and "rgb(35, 35, 35) 0px 0px 0px 2px inset" in ui17["focusShadow"]
                and "2px solid rgb(228, 0, 20)" in ui17["errBorder"]
                and ui17["chipBorder"] == "0px"
                and ui17["segBorder"] == "0px",
                f"rest='{ui17['normBorder']}', focus='{ui17['focusShadow']}', error='{ui17['errBorder']}', chipBorder={ui17['chipBorder']}, segBorder={ui17['segBorder']}",
            )

            # TC-UI-18: Chart Header, Horizontal Gridlines & Status Palette
            await cdp.evaluate("V1.workspace = 'analytics'; renderApp();")
            ui18 = await cdp.evaluate("""(() => {
                const bc = document.querySelector('.v1-bar-chart');
                const bcStyle = getComputedStyle(bc);
                const headers = document.querySelectorAll('.v1-panel .v1-chart-header');
                const subtitles = document.querySelectorAll('.v1-panel .v1-chart-subtitle');
                const legends = document.querySelectorAll('.v1-panel .v1-chart-legend');
                return {
                    headerCount: headers.length,
                    subtitleCount: subtitles.length,
                    legendCount: legends.length,
                    bgImage: bcStyle.backgroundImage,
                    bgSize: bcStyle.backgroundSize,
                    borderBottom: bcStyle.borderBottom
                };
            })()""")
            rec.record(
                "TC-UI-18",
                "Desktop 1440x900",
                "Kargul Bento Chart Containers (Title, Active Filter Subtitle, Legend) & Horizontal-Only Gridlines",
                ui18["headerCount"] == 2
                and ui18["subtitleCount"] == 2
                and ui18["legendCount"] == 2
                and "linear-gradient" in ui18["bgImage"]
                and ui18["bgSize"] == "100% 44px",
                f"headers={ui18['headerCount']}, bgSize={ui18['bgSize']}, bgImage={ui18['bgImage'][:45]}...",
            )

            # TC-UI-19: Kargul Borderless Bento Surface Layering & Corner Radius Tokens
            ui19 = await cdp.evaluate("""(() => {
                const cs = getComputedStyle(document.documentElement);
                const tblShadow = getComputedStyle(document.querySelector('.v1-data-table')).boxShadow;
                const kpiShadow = getComputedStyle(document.querySelector('.v1-kpi-card')).boxShadow;
                const tbShadow = getComputedStyle(document.querySelector('.v1-topbar')).boxShadow;
                return {
                    rXs: cs.getPropertyValue('--radius-xs').trim(),
                    rSm: cs.getPropertyValue('--radius-sm').trim(),
                    rMd: cs.getPropertyValue('--radius-md').trim(),
                    rSheet: cs.getPropertyValue('--radius-sheet').trim(),
                    tblShadow,
                    kpiShadow,
                    tbShadow
                };
            })()""")
            rec.record(
                "TC-UI-19",
                "Desktop 1440x900",
                "Kargul Borderless Bento Surface Layering & Corner Radius Tokens (9999px/12px/20px/16px)",
                ui19["rXs"] == "9999px"
                and ui19["rSm"] == "12px"
                and ui19["rMd"] == "20px"
                and ui19["rSheet"] == "16px 16px 0 0"
                and ui19["tblShadow"] == "none"
                and ui19["kpiShadow"] == "none"
                and ui19["tbShadow"] == "none",
                f"radii={ui19['rXs']}/{ui19['rSm']}/{ui19['rMd']}/{ui19['rSheet']}, tblShadow={ui19['tblShadow']}",
            )

            # TC-UI-20: Stylesheet isolation & @media print emulation
            await cdp.send("Emulation.setEmulatedMedia", {"media": "print"})
            ui20 = await cdp.evaluate("""(() => {
                const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href'));
                const tb = getComputedStyle(document.querySelector('.v1-topbar')).display;
                const sb = getComputedStyle(document.querySelector('.v1-sidebar')).display;
                const bn = getComputedStyle(document.querySelector('.v1-bottom-nav')).display;
                const cf = getComputedStyle(document.querySelector('.v1-context-filters')).display;
                const ha = getComputedStyle(document.querySelector('.v1-header-actions')).display;
                return { links, tb, sb, bn, cf, ha };
            })()""")
            await cdp.send("Emulation.setEmulatedMedia", {"media": "screen"})
            rec.record(
                "TC-UI-20",
                "Print Media",
                "Stylesheet Isolation (v1.css only) & @media print Hides Topbar, Nav, Filters & Actions",
                ui20["links"] == ["v1.css"]
                and ui20["tb"] == "none"
                and ui20["sb"] == "none"
                and ui20["bn"] == "none"
                and ui20["cf"] == "none"
                and ui20["ha"] == "none",
                f"stylesheets={ui20['links']}, printDisplay(topbar={ui20['tb']}, sidebar={ui20['sb']}, filters={ui20['cf']}, actions={ui20['ha']})",
            )

            # ==================================================================
            # PHASE 5: INTERACTIVE END-TO-END PRD FLOWS
            # ==================================================================

            # 5.1 Strategy & M&E: + Add Planned Activity Modal (TC-STRAT-04 & TC-STRAT-05)
            strat04 = await cdp.evaluate("""(async () => {
                V1.workspace = 'tasks';
                V1.newTaskModal = true;
                renderApp();
                const totalCatalogueGoals = V1.data.goals.length;
                const renderedGoalChips = document.querySelectorAll('.v1-wizard-card .v1-chips .v1-chip').length;
                return { totalCatalogueGoals, renderedGoalChips };
            })()""")
            strat04_ok = strat04["renderedGoalChips"] == 13
            rec.record(
                "TC-STRAT-04",
                "Interactive E2E",
                "All 13 Strategic Outcomes Selectable in '+ Add Planned Activity' Modal",
                strat04_ok,
                f"Catalogue goals={strat04['totalCatalogueGoals']}, rendered goal chips={strat04['renderedGoalChips']}",
                is_prd_discrepancy=(not strat04_ok),
            )

            strat05 = await cdp.evaluate("""(async () => {
                const beforeCount = V1.data.tasks.length;
                V1.newTaskState.title = 'Train 30 parish youth mediators in non-violent dialogue';
                V1.newTaskState.outcome_code = 'A1.R2';
                V1.newTaskState.parish_code = 'PAR-10';
                V1.newTaskState.due_date = '2026-11-20';
                V1.newTaskState.planned_target = 30;
                const saveBtn = [...document.querySelectorAll('.v1-wizard-card .v1-btn')].find(b => b.textContent.includes('Save Activity'));
                saveBtn.click();
                for (let i = 0; i < 50; i++) {
                    await new Promise(r => setTimeout(r, 100));
                    if (!V1.newTaskModal && V1.data.tasks.length > beforeCount) break;
                }
                const created = V1.data.tasks.find(t => t.titles.en.includes('Train 30 parish youth mediators'));
                return {
                    beforeCount,
                    afterCount: V1.data.tasks.length,
                    created: created ? {
                        code: created.code,
                        axis: created.axis,
                        outcome: created.outcome,
                        intervention: created.intervention,
                        indicator: created.indicator,
                        ap: created.ap,
                        pastoral_quarter: created.pastoral_quarter,
                        min_threshold: created.min_threshold,
                        target_threshold: created.target_threshold
                    } : null
                };
            })()""")
            rec.record(
                "TC-STRAT-05",
                "Interactive E2E",
                "Zero-Code Task Creation & Automatic Strategic Metadata Binding",
                strat05["created"] is not None
                and strat05["created"]["axis"] == "A1"
                and strat05["created"]["outcome"] == "A1.R2"
                and strat05["created"]["ap"] == "AP1"
                and strat05["created"]["pastoral_quarter"] == "Q1",
                f"tasks {strat05['beforeCount']}->{strat05['afterCount']}, autoBound={strat05['created']}",
            )

            # 5.2 Field Data Capture: 4-Step Wizard Validation, Modes, Auto-Fit & Confidential Gate (TC-CAP-01 to TC-CAP-11)
            cap_flow = await cdp.evaluate("""(async () => {
                const task = V1.data.tasks.find(t => t.id === 'task-a1-gakoma-01') || V1.data.tasks[0];
                openWizardForTask(task, null, 1);

                // TC-CAP-01: Invalid date blocks Step 1 -> Step 2
                V1.wizard.event_date = '2025-05-10';
                renderApp();
                const nextBtn1 = [...document.querySelectorAll('.v1-wizard-footer .v1-btn')].find(b => b.textContent.includes('Next Step'));
                nextBtn1.click();
                const stepAfterInvalidDate = V1.wizard.step;
                const dateErr = V1.wizard.error;

                // Fix date and advance to Step 2
                V1.wizard.event_date = '2026-10-25';
                renderApp();
                const nextBtn2 = [...document.querySelectorAll('.v1-wizard-footer .v1-btn')].find(b => b.textContent.includes('Next Step'));
                nextBtn2.click();
                const stepAfterValidDate = V1.wizard.step;

                // TC-CAP-08 & TC-CAP-09: Auto-calculated Total & Age Group mismatch + Auto-Fit button
                V1.wizard.women = 15;
                V1.wizard.men = 10;
                V1.wizard.age_u18 = 2;
                V1.wizard.age_18_35 = 10;
                V1.wizard.age_36_64 = 6;
                V1.wizard.age_65 = 2; // sum=20 vs total=25
                renderApp();
                const totalBannerText = document.querySelector('.v1-total-banner').textContent;
                const nextBtnStep2 = [...document.querySelectorAll('.v1-wizard-footer .v1-btn')].find(b => b.textContent.includes('Next Step'));
                nextBtnStep2.click();
                const ageErr = V1.wizard.error;
                const autoFitBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Auto-Fit Age Groups'));
                autoFitBtn.click();
                const age18_35AfterAutoFit = V1.wizard.age_18_35;

                // TC-CAP-10: Disability > Total validation
                V1.wizard.disability = 30;
                renderApp();
                document.querySelector('.v1-wizard-footer .v1-btn:not(.v1-btn-ghost)').click();
                const disabErr = V1.wizard.error;
                V1.wizard.disability = 2;

                // TC-CAP-04 to TC-CAP-07: Collection Modes UI check
                V1.wizard.collection_mode = 'ENUMERATOR';
                renderApp();
                const addRespBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('+ Add Respondent'));
                addRespBtn.click();
                const enumCount = V1.wizard.respondents.length;

                V1.wizard.collection_mode = 'FOCUS_GROUP';
                renderApp();
                const hasFgTextarea = Boolean(document.querySelector('.v1-textarea'));

                V1.wizard.collection_mode = 'SURVEY';
                renderApp();
                const surveyLabels = [...document.querySelectorAll('.v1-stepper-box label')].map(l => l.textContent);

                V1.wizard.collection_mode = 'OBSERVATION';
                renderApp();
                const obsChip = [...document.querySelectorAll('.v1-chips .v1-chip')].find(c => c.textContent.includes('Follow-up date scheduled'));
                obsChip.click();
                const obsChecked = V1.wizard.checklist.includes('Follow-up date scheduled');

                // Advance to Step 3
                document.querySelector('.v1-wizard-footer .v1-btn:not(.v1-btn-ghost)').click();
                const step3Reached = V1.wizard.step === 3;

                // TC-CAP-11 / TC-STRAT-14: Under-achievement requires issue severity & note
                V1.wizard.outcome_value = 5; // below min_threshold
                V1.wizard.issue_severity = 'NONE';
                V1.wizard.issue_note = '';
                renderApp();
                document.querySelector('.v1-wizard-footer .v1-btn:not(.v1-btn-ghost)').click();
                const underAchErr = V1.wizard.error;

                // Provide issue severity & note, advance to Step 4
                V1.wizard.issue_severity = 'MINOR';
                V1.wizard.issue_categories = ['Weather'];
                V1.wizard.issue_note = 'Rain delayed arrival of 5 participants.';
                renderApp();
                document.querySelector('.v1-wizard-footer .v1-btn:not(.v1-btn-ghost)').click();
                const step4Reached = V1.wizard.step === 4;

                return {
                    stepAfterInvalidDate,
                    dateErr,
                    stepAfterValidDate,
                    totalBannerText,
                    ageErr,
                    age18_35AfterAutoFit,
                    disabErr,
                    enumCount,
                    hasFgTextarea,
                    hasSurveySteppers: surveyLabels.some(l => l.includes('Distributed')),
                    obsChecked,
                    step3Reached,
                    underAchErr,
                    step4Reached
                };
            })()""")
            rec.record(
                "TC-CAP-01..11",
                "Interactive E2E",
                "4-Step Wizard Validations (Date, Auto Total, Age Mismatch + Auto-Fit, Disability, 4 Modes, Under-Achievement Gate)",
                cap_flow["stepAfterInvalidDate"] == 1
                and "1 Sept 2026" in cap_flow["dateErr"]
                and cap_flow["stepAfterValidDate"] == 2
                and "25 Participants" in cap_flow["totalBannerText"]
                and "add up to 20" in cap_flow["ageErr"]
                and cap_flow["age18_35AfterAutoFit"] == 15
                and "cannot be higher" in cap_flow["disabErr"]
                and cap_flow["enumCount"] == 2
                and cap_flow["hasFgTextarea"]
                and cap_flow["hasSurveySteppers"]
                and cap_flow["obsChecked"]
                and cap_flow["step3Reached"]
                and "Target not reached" in cap_flow["underAchErr"]
                and cap_flow["step4Reached"],
                f"dateErr='{cap_flow['dateErr']}', ageAutoFit=10->{cap_flow['age18_35AfterAutoFit']}, enumResp={cap_flow['enumCount']}, obsChip={cap_flow['obsChecked']}, underAchErr='{cap_flow['underAchErr'][:42]}...'",
            )

            # TC-CAP-02: Local draft persistence & step restoration
            cap02 = await cdp.evaluate("""(() => {
                saveWizardDraftLocal();
                const taskId = V1.wizard.task.id;
                const savedStep = JSON.parse(localStorage.getItem('apse-v1-draft-' + taskId)).step;
                V1.wizard = null;
                renderApp();
                const hasSavedDraftBadge = [...document.querySelectorAll('.v1-badge')].some(b => b.textContent.includes('Saved Draft'));
                const task = V1.data.tasks.find(t => t.id === taskId);
                openWizardForTask(task, task.latest_log); // called without forceStep arg -> restores draft.step
                const reopenedStep = V1.wizard.step;
                return { savedStep, hasSavedDraftBadge, reopenedStep };
            })()""")
            cap02_ok = cap02["hasSavedDraftBadge"] and cap02["reopenedStep"] == cap02["savedStep"]
            rec.record(
                "TC-CAP-02",
                "Interactive E2E",
                "Local Draft Persistence (apse-v1-draft-*) & Resume Step Restoration",
                cap02_ok,
                f"Draft saved at step={cap02['savedStep']}, 'Saved Draft' lozenge={cap02['hasSavedDraftBadge']}, reopenedStep={cap02['reopenedStep']}",
                is_prd_discrepancy=(not cap02_ok),
            )

            # TC-GOV-09 & TC-CAP-03: Confidential Case Button & Privacy Checkbox Gate
            gov09 = await cdp.evaluate("""(() => {
                V1.wizard = null;
                V1.workspace = 'tasks';
                renderApp();
                const confBtn = [...document.querySelectorAll('.v1-header-actions .v1-btn-danger')].find(b => b.textContent.includes('Confidential'));
                confBtn.click();
                const isSens = V1.wizard.task.is_sensitive;
                const initPrivacy = V1.wizard.privacy_confirmed;
                V1.wizard.step = 3;
                V1.wizard.privacy_confirmed = false;
                renderApp();
                document.querySelector('.v1-wizard-footer .v1-btn:not(.v1-btn-ghost)').click();
                const blockedErr = V1.wizard.error;
                const chk = document.querySelector('input[type="checkbox"]');
                chk.click();
                document.querySelector('.v1-wizard-footer .v1-btn:not(.v1-btn-ghost)').click();
                const stepAfterCheck = V1.wizard.step;
                V1.wizard = null;
                renderApp();
                return { isSens, initPrivacy, blockedErr, stepAfterCheck };
            })()""")
            rec.record(
                "TC-GOV-09",
                "Interactive E2E",
                "Confidential Case Red Button & Mandatory Privacy Confirmation Checkbox Gate",
                gov09["isSens"]
                and gov09["initPrivacy"] is False
                and "confirming no victim names" in gov09["blockedErr"]
                and gov09["stepAfterCheck"] == 4,
                f"isSensitive={gov09['isSens']}, blockedErr='{gov09['blockedErr']}', stepAfterCheck={gov09['stepAfterCheck']}",
            )

            # 5.3 Offline Queue & Live Sync Pill (TC-CAP-15 & TC-CAP-16)
            cap15_16 = await cdp.evaluate("""(async () => {
                for (const k of Object.keys(localStorage)) {
                    if (k.startsWith('apse-v1-draft-')) localStorage.removeItem(k);
                }
                V1.offlineQueue = [];
                localStorage.setItem('apse-v1-offline-queue', '[]');
                V1.simulateOffline = false;
                renderApp();

                document.querySelector('.v1-sync-pill').click();
                const isSimOffline = V1.simulateOffline;
                const task = V1.data.tasks.find(t => !t.is_sensitive) || V1.data.tasks[0];
                openWizardForTask(task, null, 4);
                V1.wizard.step = 4;
                V1.wizard.event_date = '2026-10-27';
                V1.wizard.women = 14;
                V1.wizard.men = 11;
                V1.wizard.age_u18 = 3;
                V1.wizard.age_18_35 = 12;
                V1.wizard.age_36_64 = 8;
                V1.wizard.age_65 = 2;
                V1.wizard.disability = 1;
                V1.wizard.outcome_value = task.target_threshold;
                V1.wizard.issue_severity = 'NONE';
                renderApp();
                const submitBtnTextOffline = document.querySelector('.v1-wizard-footer .v1-btn:not(.v1-btn-ghost)').textContent.trim();
                document.querySelector('.v1-wizard-footer .v1-btn:not(.v1-btn-ghost)').click();
                await new Promise(r => setTimeout(r, 150));
                const queueLenAfterSave = V1.offlineQueue.length;
                const pillTextWaiting = document.querySelector('.v1-sync-pill').textContent.trim();

                await syncOfflineQueue();
                const queueLenAfterSync = V1.offlineQueue.length;
                const pillTextSynced = document.querySelector('.v1-sync-pill').textContent.trim();
                return {
                    isSimOffline,
                    submitBtnTextOffline,
                    queueLenAfterSave,
                    pillTextWaiting,
                    queueLenAfterSync,
                    pillTextSynced
                };
            })()""")
            rec.record(
                "TC-CAP-15..16",
                "Interactive E2E",
                "Offline Queueing (apse-v1-offline-queue) & Sequential Sync to Central Database",
                cap15_16["isSimOffline"]
                and "Save Offline" in cap15_16["submitBtnTextOffline"]
                and cap15_16["queueLenAfterSave"] == 1
                and "1 waiting for internet" in cap15_16["pillTextWaiting"]
                and cap15_16["queueLenAfterSync"] == 0
                and "All Data Synced" in cap15_16["pillTextSynced"],
                f"offlineBtn='{cap15_16['submitBtnTextOffline']}', waitingPill='{cap15_16['pillTextWaiting']}', syncedPill='{cap15_16['pillTextSynced']}'",
            )

            # 5.4 Live 4-Language Switching & Narrative Preservation (TC-CAP-12, TC-CAP-13, TC-STRAT-01)
            cap12_13 = await cdp.evaluate("""(() => {
                const task = V1.data.tasks[0];
                openWizardForTask(task, null, 3);
                V1.wizard.step = 3;
                const sampleNarrative = "Atelier à Ste Thérèse — Inama y'Isanamitima (100% réussite)";
                V1.wizard.story_of_change = sampleNarrative;
                const langResults = {};
                for (const code of ['rw', 'fr', 'en', 'sw']) {
                    const btn = [...document.querySelectorAll('.v1-lang-btn')].find(b => b.textContent.trim().toLowerCase() === code);
                    btn.click();
                    langResults[code] = {
                        htmlLang: document.documentElement.lang,
                        storedLang: localStorage.getItem('apse-v1-lang'),
                        navFirst: document.querySelector('.v1-sidebar .v1-nav-item').textContent.trim(),
                        narrativePreserved: V1.wizard.story_of_change === sampleNarrative
                    };
                }
                V1.wizard = null;
                V1.lang = 'fr';
                renderApp();
                const themeChipTextsFr = [...document.querySelectorAll('.v1-context-filters .v1-chips .v1-chip')].map(c => c.textContent.trim());
                V1.lang = 'en';
                localStorage.setItem('apse-v1-lang', 'en');
                renderApp();
                return { langResults, themeChipTextsFr };
            })()""")
            rec.record(
                "TC-CAP-12..13",
                "Interactive E2E",
                "4-Language Live Switching (RW, FR, EN, SW) & UTF-8 Narrative Preservation",
                all(v["htmlLang"] == k and v["narrativePreserved"] for k, v in cap12_13["langResults"].items()),
                f"langs={ {k: v['navFirst'] for k, v in cap12_13['langResults'].items()} }, narrativePreserved=True",
            )
            strat01_i18n_ok = "Healing & Unity" not in cap12_13["themeChipTextsFr"]
            rec.record(
                "TC-STRAT-01-I18N",
                "Interactive E2E",
                "Theme Filter Chips Localization in My Tasks & Mobile Filter Sheet",
                strat01_i18n_ok,
                f"When switched to French (FR), localized theme chips={cap12_13['themeChipTextsFr']}",
                is_prd_discrepancy=(not strat01_i18n_ok),
            )

            # 5.5 3-Tier Approvals & Correction Deep-Link (TC-GOV-04 & TC-GOV-06)
            gov04_06 = await cdp.evaluate("""(async () => {
                V1.workspace = 'approvals';
                V1.filters.approvalStage = 'ALL';
                renderApp();

                // 1. Parish CPJP Approval on a SUBMITTED log
                const subLog = V1.data.logs.find(l => l.stage === 'SUBMITTED' && !l.parent_id);
                const subId = subLog.id;
                await apiV1('/v1/review', 'POST', { id: subId, target_stage: 'PARISH_APPROVED', note: 'Verified by Parish CPJP' });
                await loadBootstrap();
                renderApp();
                const afterParishStage = V1.data.logs.find(l => l.id === subId).stage;

                // 2. Final Diocese Approval
                await apiV1('/v1/review', 'POST', { id: subId, target_stage: 'DIOCESE_APPROVED', note: 'Approved by CDJP Diocese' });
                await loadBootstrap();
                renderApp();
                const afterDioceseStage = V1.data.logs.find(l => l.id === subId).stage;

                // 3. Return another log for Correction at Step 2 & verify 'Fix Step 2' button in My Tasks
                const otherLog = V1.data.logs.find(l => l.id !== subId && l.stage !== 'DIOCESE_APPROVED');
                await apiV1('/v1/review', 'POST', {
                    id: otherLog.id,
                    target_stage: 'CORRECTION',
                    correction_step: 2,
                    note: 'Please recount youth attendance sheet.'
                });
                await loadBootstrap();
                V1.workspace = 'tasks';
                renderApp();
                const fixBtn = [...document.querySelectorAll('.v1-task-card .v1-btn-danger')].find(b => b.textContent.includes('Fix Step 2'));
                const hasFixBtn = Boolean(fixBtn);
                if (fixBtn) fixBtn.click();
                const openedAtStep = V1.wizard ? V1.wizard.step : null;
                const alertBannerText = document.querySelector('.v1-error-alert')?.textContent || '';
                V1.wizard = null;
                renderApp();
                return { afterParishStage, afterDioceseStage, hasFixBtn, openedAtStep, alertBannerText };
            })()""")
            rec.record(
                "TC-GOV-04..06",
                "Interactive E2E",
                "3-Tier Approvals (SUBMITTED -> PARISH_APPROVED -> DIOCESE_APPROVED) & 'Fix Step 2' Deep-Link",
                gov04_06["afterParishStage"] == "PARISH_APPROVED"
                and gov04_06["afterDioceseStage"] == "DIOCESE_APPROVED"
                and gov04_06["hasFixBtn"]
                and gov04_06["openedAtStep"] == 2
                and "Please recount youth attendance sheet" in gov04_06["alertBannerText"],
                f"stages={gov04_06['afterParishStage']}->{gov04_06['afterDioceseStage']}, fixBtn={gov04_06['hasFixBtn']}, openedStep={gov04_06['openedAtStep']}, banner='{gov04_06['alertBannerText']}'",
            )

            # 5.6 Analytics: Regional Parish SVG Map, Bottleneck Banner & Issue Category Chips (TC-ANA-02, TC-ANA-04, TC-ANA-06, TC-ANA-08)
            ana_flow = await cdp.evaluate("""(async () => {
                V1.workspace = 'analytics';
                V1.filters.parish = '';
                V1.filters.period = 'ALL';
                V1.filters.issueCategory = 'ALL';
                await loadBootstrap();
                renderApp();

                const svg = document.querySelector('.v1-panel svg');
                const circles = svg.querySelectorAll('circle');
                const regionTexts = [...svg.querySelectorAll('text')].map(t => t.textContent);

                // Click PAR-24 node on SVG map
                const par24Idx = V1.data.analytics.parish_map.findIndex(p => p.code === 'PAR-24');
                circles[par24Idx].parentElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                for (let i = 0; i < 20; i++) {
                    await new Promise(r => setTimeout(r, 100));
                    if (V1.filters.parish === 'PAR-24') break;
                }
                const activeParishAfterClick = V1.filters.parish;
                const activeCircleRadius = document.querySelectorAll('.v1-panel svg circle')[par24Idx].getAttribute('r');

                // Reset map filter
                V1.filters.parish = '';
                await loadBootstrap();
                renderApp();

                // Click 'Transport' category chip on Issue Trends chart
                const transChip = [...document.querySelectorAll('.v1-panel .v1-chips .v1-chip')].find(c => c.textContent.trim() === 'Transport');
                transChip.click();
                const octCol = [...document.querySelectorAll('.v1-bar-col')].find(c => c.textContent.includes('Oct'));
                const octSegHeights = [...octCol.querySelectorAll('.v1-bar-stack > div')].map(d => d.style.height);

                return {
                    circleCount: circles.length,
                    hasFourDistricts: ['NYANZA', 'HUYE', 'GISAGARA', 'NYARUGURU'].every(d => regionTexts.includes(d)),
                    activeParishAfterClick,
                    activeCircleRadius,
                    octSegHeights
                };
            })()""")
            rec.record(
                "TC-ANA-04..06",
                "Interactive E2E",
                "Regional Parish SVG Map (27 Parish Nodes, 4 Districts & Click-to-Filter PAR-24 -> r=3.5)",
                ana_flow["circleCount"] == 27
                and ana_flow["hasFourDistricts"]
                and ana_flow["activeParishAfterClick"] == "PAR-24"
                and ana_flow["activeCircleRadius"] == "3.5",
                f"circles={ana_flow['circleCount']}, districts4={ana_flow['hasFourDistricts']}, clickedParish={ana_flow['activeParishAfterClick']} (r={ana_flow['activeCircleRadius']})",
            )
            ana08_ok = len(set(ana_flow["octSegHeights"])) > 1
            rec.record(
                "TC-ANA-08",
                "Interactive E2E",
                "Field Issues Stacked Bar Chart Category Filter Bar Proportions",
                ana08_ok,
                f"Filtering Issue Trends by category ('Transport') severity segment heights={ana_flow['octSegHeights']}",
                is_prd_discrepancy=(not ana08_ok),
            )

            # 5.7 Exports & Guided Bulk CSV Import (TC-ANA-15 & TC-ANA-16)
            ana15_16 = await cdp.evaluate("""(async () => {
                V1.workspace = 'exports';
                renderApp();
                const csvText = "Location_Col,Centrale,Event_Date,Women,Men,Outcome_Value\\nGakoma,Kizenga,2026-10-28,18,12,26";
                const previewRes = await apiV1('/v1/import', 'POST', { csv_text: csvText, commit: false });
                V1.csvImportState = { csvText, ...previewRes, mapping: previewRes.mapping || {}, message: '' };
                renderApp();

                const missingAlertText = document.querySelector('.v1-error-alert')?.textContent || '';
                const selectEl = document.querySelector('.v1-select');
                const hasSelect = Boolean(selectEl);

                // Map Location_Col -> parish
                selectEl.value = 'Location_Col';
                selectEl.dispatchEvent(new Event('change'));
                for (let i = 0; i < 20; i++) {
                    await new Promise(r => setTimeout(r, 100));
                    if (V1.csvImportState.missing && V1.csvImportState.missing.length === 0) break;
                }
                const readyLozengeText = document.querySelector('.v1-panel:last-child .v1-badge')?.textContent || '';
                const previewDomTable = document.querySelector('.v1-panel:last-child table');

                // Click Import All Rows Now
                const importBtn = [...document.querySelectorAll('.v1-panel:last-child .v1-btn')].find(b => b.textContent.includes('Import All Rows Now'));
                importBtn.click();
                for (let i = 0; i < 20; i++) {
                    await new Promise(r => setTimeout(r, 100));
                    if (V1.csvImportState.message) break;
                }
                return {
                    missingAlertText,
                    hasSelect,
                    readyLozengeText,
                    apiReturnedPreviewCount: previewRes.preview ? previewRes.preview.length : 0,
                    previewTableRenderedInDom: Boolean(previewDomTable),
                    commitMessage: V1.csvImportState.message
                };
            })()""")
            rec.record(
                "TC-ANA-15..16",
                "Interactive E2E",
                "Guided Bulk CSV Import Missing-Column Prompt, Dropdown Mapping, Preview Table & Bulk Commit",
                "Parish_Name" in ana15_16["missingAlertText"]
                and ana15_16["hasSelect"]
                and "All columns matched" in ana15_16["readyLozengeText"]
                and ana15_16["previewTableRenderedInDom"]
                and "Imported 1 activity logs" in ana15_16["commitMessage"],
                f"missingPrompt='{ana15_16['missingAlertText'][:45]}...', ready='{ana15_16['readyLozengeText']}', previewTableRendered={ana15_16['previewTableRenderedInDom']}, commit='{ana15_16['commitMessage']}'",
            )

            # 5.8 Revision Plan Verification: DB Sync & Migrations, Axis + Calendar Filter, Mobile Auth, Strict RBAC
            await cdp.set_viewport(1440, 900, mobile=False)
            rev2 = await cdp.evaluate("""(async () => {
                // 1. Open Sync Modal & run Local SQLite -> Central DB Sync
                V1.syncModal = true;
                renderApp();
                await runDatabaseSyncNow();
                const syncFeedbackText = V1.syncFeedback?.text || '';
                const pendingAfterSync = V1.data?.sync?.outbox?.pending ?? -1;
                const schemaVer = V1.data?.sync?.schema_version ?? 0;
                V1.syncModal = false;

                // 2. Strategic Axis Filtering (A1) & Calendar Date-Range Filtering in My Tasks
                V1.workspace = 'tasks';
                V1.filters.axis = 'A1';
                V1.filters.dateFrom = '2026-10-01';
                V1.filters.dateTo = '2026-12-31';
                await loadBootstrap();
                renderApp();
                const a1TasksAllMatch = (V1.data.tasks || []).every(t => t.axis === 'A1');
                const hasDateFromInput = Boolean(document.getElementById('v1-filter-date-from'));
                const hasDateToInput = Boolean(document.getElementById('v1-filter-date-to'));
                V1.filters.axis = '';
                V1.filters.dateFrom = '';
                V1.filters.dateTo = '';

                // 3. Role-Specific Frontend: Field Enumerator (reporter_gakoma)
                await apiV1('/v1/persona', 'POST', { persona_key: 'reporter_gakoma' });
                await loadBootstrap();
                V1.workspace = 'tasks';
                renderApp();
                const fieldHasAddPlanBtn = [...document.querySelectorAll('.v1-header-actions .v1-btn')].some(b => b.textContent.includes('Add Planned'));
                V1.workspace = 'approvals';
                renderApp();
                const fieldApproveBtns = [...document.querySelectorAll('.v1-task-card .v1-btn')].filter(b => b.textContent.includes('Approve') || b.textContent.includes('Validate'));

                // 4. Role-Specific Frontend: Parish CPJP (cpjp_gakoma)
                await apiV1('/v1/persona', 'POST', { persona_key: 'cpjp_gakoma' });
                await loadBootstrap();
                V1.workspace = 'approvals';
                renderApp();
                const cpjpHasDioceseApprove = [...document.querySelectorAll('.v1-task-card .v1-btn')].some(b => b.textContent.includes('Final Approve (Diocese)'));

                // Restore mel_diocese
                await apiV1('/v1/persona', 'POST', { persona_key: 'mel_diocese' });
                await loadBootstrap();
                V1.workspace = 'tasks';
                renderApp();

                return {
                    syncFeedbackText,
                    pendingAfterSync,
                    schemaVer,
                    a1TasksAllMatch,
                    hasDateFromInput,
                    hasDateToInput,
                    fieldHasAddPlanBtn,
                    fieldApproveBtnsCount: fieldApproveBtns.length,
                    cpjpHasDioceseApprove
                };
            })()""")
            rec.record(
                "TC-REV2-01..04",
                "Interactive E2E",
                "Local-to-Central DB Sync (v3 Migrations), Axis + Calendar Date-Range Filter, & Role-Specific RBAC",
                "Sync complete" in rev2["syncFeedbackText"]
                and rev2["pendingAfterSync"] == 0
                and rev2["schemaVer"] == 3
                and rev2["a1TasksAllMatch"]
                and rev2["hasDateFromInput"]
                and rev2["hasDateToInput"]
                and (not rev2["fieldHasAddPlanBtn"])
                and rev2["fieldApproveBtnsCount"] == 0
                and (not rev2["cpjpHasDioceseApprove"]),
                f"sync='{rev2['syncFeedbackText']}', schema=v{rev2['schemaVer']}, a1Match={rev2['a1TasksAllMatch']}, dates={rev2['hasDateFromInput']}/{rev2['hasDateToInput']}, fieldAddPlan={rev2['fieldHasAddPlanBtn']}, fieldApproveBtns={rev2['fieldApproveBtnsCount']}, cpjpDioceseBtn={rev2['cpjpHasDioceseApprove']}",
            )

            # 5.9 Mobile Phone Account & Role Switcher on 360x800
            await cdp.set_viewport(360, 800, mobile=True)
            mob_auth = await cdp.evaluate("""(() => {
                renderApp();
                const mobBtn = document.querySelector('.v1-mobile-user-btn');
                const mobBtnDisplay = mobBtn ? getComputedStyle(mobBtn).display : 'none';
                if (mobBtn) mobBtn.click();
                const modalOpen = Boolean(V1.personaModal && document.getElementById('v1-web-login-user'));
                V1.personaModal = false;
                renderApp();
                return {
                    mobBtnDisplay,
                    modalOpen,
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth
                };
            })()""")
            rec.record(
                "TC-REV2-05",
                "Mobile Portrait 360x800",
                "Mobile Topbar Account Switcher Button (.v1-mobile-user-btn) & Web Login Modal on Phone",
                mob_auth["mobBtnDisplay"] in ("flex", "inline-flex")
                and mob_auth["modalOpen"]
                and mob_auth["scrollWidth"] <= mob_auth["innerWidth"],
                f"mobBtnDisplay={mob_auth['mobBtnDisplay']}, modalOpen={mob_auth['modalOpen']}, scroll={mob_auth['scrollWidth']}/{mob_auth['innerWidth']}",
            )

    finally:
        if chrome_proc:
            chrome_proc.terminate()
            try:
                chrome_proc.wait(timeout=5)
            except Exception:
                chrome_proc.kill()
        if server_proc:
            server_proc.terminate()
            try:
                server_proc.wait(timeout=5)
            except Exception:
                server_proc.kill()
        shutil.rmtree(temp_data_dir, ignore_errors=True)
        shutil.rmtree(temp_chrome_dir, ignore_errors=True)

    # Save structured JSON report
    report_path = ROOT / "tests" / "frontend_multi_viewport_report.json"
    summary = {
        "total_checks": len(rec.results),
        "passed": sum(1 for r in rec.results if r["passed"]),
        "prd_discrepancies": len(rec.discrepancies),
        "results": rec.results,
        "discrepancies": rec.discrepancies,
    }
    report_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"\n=== SUMMARY: {summary['passed']}/{summary['total_checks']} passed, {summary['prd_discrepancies']} PRD/UI discrepancies verified ===")
    return summary


if __name__ == "__main__":
    asyncio.run(run_frontend_suite())
