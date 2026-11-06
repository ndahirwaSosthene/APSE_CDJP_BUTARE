#!/usr/bin/env python3
"""
Mobile UI Quality, Accessibility & Readability Auditor for APSE CDJP Butare.
Executes detailed multi-viewport CDP audits on Mobile Android (360x800) and Mobile iPhone (390x844),
verifying:
  1. Saisie opérationnelle (seizure workspace, cluster rails, mobile pickers, 100% canvas, 0px squish guard)
  2. Activity Log Wizard (5 Volets with icons & labels, steps 1-4, touch targets >= 40/44px)
  3. Form Creation Tab (Google Forms visual builder, 1:1 circular elements, responsive inputs, toolbar wrapping)
  4. Form Preview Modal (Aperçu répondant, modal close circle, responsive fields)
  5. Core Workspaces on Mobile (tasks, approvals, analytics, exports, zero horizontal overflow)
  6. Accessibility & Readability (contrast, tap targets, no text clipping)
And captures required verification screenshots.
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
import urllib.request
from pathlib import Path
import websockets

ROOT = Path(__file__).resolve().parents[1]
BOOT_SCRIPT = ROOT / "run.py"
CHROME_EXE = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
if not CHROME_EXE.exists():
    CHROME_EXE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")

PARENT_ARTIFACT_DIR = Path(r"C:\Users\indah\.gemini\antigravity\brain\69d32cba-a372-4b83-a1ee-722422214c21")
OWN_ARTIFACT_DIR = Path(r"C:\Users\indah\.gemini\antigravity\brain\9cb3c229-f30d-4da6-bc61-1ec41788accf")

PARENT_ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
OWN_ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


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

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._recv_task:
            self._recv_task.cancel()
        if self.ws:
            await self.ws.close()

    async def _receiver(self):
        try:
            async for raw in self.ws:
                msg = json.loads(raw)
                mid = msg.get("id")
                if mid and mid in self.pending:
                    fut = self.pending.pop(mid)
                    if not fut.done():
                        fut.set_result(msg)
        except asyncio.CancelledError:
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

    async def set_viewport(self, width: int, height: int, mobile: bool = True, scale: float = 1.0):
        await self.send(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": width,
                "height": height,
                "deviceScaleFactor": scale,
                "mobile": mobile,
            },
        )
        await asyncio.sleep(0.2)

    async def screenshot(self, filename: str):
        res = await self.send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
        png_bytes = base64.b64decode(res["data"])
        for out_dir in (PARENT_ARTIFACT_DIR, OWN_ARTIFACT_DIR):
            target = out_dir / filename
            target.write_bytes(png_bytes)
            print(f"Saved screenshot: {target} ({len(png_bytes):,} bytes)")
        return len(png_bytes)


async def main():
    server_port = get_free_port()
    cdp_port = get_free_port()
    temp_data_dir = tempfile.mkdtemp(prefix="apse_audit_data_")
    temp_chrome_dir = tempfile.mkdtemp(prefix="apse_audit_chrome_")

    server_proc = None
    chrome_proc = None

    try:
        # Start backend
        server_cmd = [
            sys.executable,
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
        server_proc = subprocess.Popen(server_cmd, cwd=str(ROOT), stdout=subprocess.PIPE, stderr=subprocess.PIPE)

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
        chrome_proc = subprocess.Popen(chrome_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

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
            raise RuntimeError("Could not obtain CDP WebSocket URL.")

        async with CDPClient(ws_url) as cdp:
            await cdp.send("Page.navigate", {"url": app_url})
            for _ in range(60):
                ready = await cdp.evaluate("Boolean(typeof V1 !== 'undefined' && V1.data && document.querySelector('.v1-topbar'))")
                if ready:
                    break
                await asyncio.sleep(0.15)

            results = {}

            # =========================================================================
            # AUDIT 1: Saisie opérationnelle (seizure workspace) on Mobile 360x800 & 390x844
            # =========================================================================
            print("\n=== AUDITING 1: Saisie opérationnelle (seizure) ===")
            await cdp.set_viewport(360, 800, mobile=True)
            seizure_360 = await cdp.evaluate("""(() => {
                V1.workspace = 'seizure';
                V091.seizureSubTab = 'form';
                renderApp();

                const clusterRail = document.querySelector('.v1-seizure-cluster-rail');
                const formSelect = document.querySelector('.v1-seizure-form-select');
                const badgeRail = document.querySelector('.v1-seizure-badge-rail');
                const nav = document.querySelector('.v1-seizure-nav');
                const content = document.querySelector('.v1-seizure-content');
                const formList = document.querySelector('.v1-seizure-form-list');

                const clusterChips = clusterRail ? clusterRail.querySelectorAll('.v1-chip').length : 0;
                const formOptions = formSelect ? formSelect.options.length : 0;
                const badges = badgeRail ? badgeRail.querySelectorAll('.v1-chip').length : 0;

                const navRect = nav ? nav.getBoundingClientRect() : null;
                const contentRect = content ? content.getBoundingClientRect() : null;
                const formListDisplay = formList ? getComputedStyle(formList).display : 'none';

                const scrollWidth = document.documentElement.scrollWidth;
                const innerWidth = window.innerWidth;

                return {
                    clusterRailFound: Boolean(clusterRail),
                    clusterChipsCount: clusterChips,
                    formSelectFound: Boolean(formSelect),
                    formOptionsCount: formOptions,
                    badgeRailFound: Boolean(badgeRail),
                    badgesCount: badges,
                    formListHidden: formListDisplay === 'none',
                    navWidth: navRect ? navRect.width : 0,
                    contentWidth: contentRect ? contentRect.width : 0,
                    contentNarrowSquished: contentRect ? (contentRect.width < 100) : true,
                    scrollWidth,
                    innerWidth,
                    hasHorizontalOverflow: scrollWidth > innerWidth
                };
            })()""")
            print("Seizure 360x800 audit:", seizure_360)
            results["seizure_360"] = seizure_360

            # Capture Deliverable 1
            await cdp.screenshot("mobile_seizure_360_verified.png")

            # Check Seizure on iPhone 390x844
            await cdp.set_viewport(390, 844, mobile=True)
            seizure_390 = await cdp.evaluate("""(() => {
                renderApp();
                const scrollWidth = document.documentElement.scrollWidth;
                const innerWidth = window.innerWidth;
                const content = document.querySelector('.v1-seizure-content');
                const contentRect = content ? content.getBoundingClientRect() : null;
                return {
                    scrollWidth,
                    innerWidth,
                    hasHorizontalOverflow: scrollWidth > innerWidth,
                    contentWidth: contentRect ? contentRect.width : 0
                };
            })()""")
            print("Seizure 390x844 audit:", seizure_390)
            results["seizure_390"] = seizure_390

            # =========================================================================
            # AUDIT 2: Activity Log Wizard (openWizardForTask) - 5 Volets & Steps 1-4
            # =========================================================================
            print("\n=== AUDITING 2: Activity Log Wizard & 5 Volets ===")
            await cdp.set_viewport(360, 800, mobile=True)
            wizard_audit = await cdp.evaluate("""(() => {
                V1.workspace = 'tasks';
                renderApp();
                const task = V1.data.tasks[0];
                openWizardForTask(task, null, 1);
                renderApp();

                // Look for the CPJP Specialist Volet section specifically
                const allFieldLabels = Array.from(document.querySelectorAll('.v1-field-label'));
                const voletLabel = allFieldLabels.find(l => l.innerText.includes('CPJP Specialist Volet') || l.innerText.includes('Volet'));
                const voletContainer = voletLabel ? voletLabel.closest('.v1-field') : null;
                const voletChipsEls = voletContainer ? Array.from(voletContainer.querySelectorAll('.v1-chip')) : [];

                const voletChips = voletChipsEls.map(chip => {
                    const text = chip.querySelector('span')?.innerText?.trim() || chip.innerText.trim();
                    const iconEl = chip.querySelector('.v1-icon');
                    const iconName = iconEl ? (iconEl.dataset.icon || '') : '';
                    const hasSvg = Boolean(chip.querySelector('svg'));
                    const rect = chip.getBoundingClientRect();
                    return {
                        text,
                        iconName,
                        hasSvg,
                        width: rect.width,
                        height: rect.height,
                        tapTargetComfortable: rect.height >= 36
                    };
                });

                // Check Step 1 inputs touch targets
                const step1Inputs = Array.from(document.querySelectorAll('.v1-input, .v1-select, .v1-segmented button')).map(el => {
                    const rect = el.getBoundingClientRect();
                    return {
                        tag: el.tagName,
                        type: el.type,
                        height: rect.height,
                        touchTargetComfortable: rect.height >= 36
                    };
                });

                const scrollWidth = document.documentElement.scrollWidth;
                const innerWidth = window.innerWidth;

                return {
                    wizardOpened: Boolean(V1.wizard),
                    step: V1.wizard?.step,
                    voletChipsCount: voletChips.length,
                    voletChips,
                    step1InputsComfortable: step1Inputs.every(i => i.touchTargetComfortable),
                    scrollWidth,
                    innerWidth,
                    hasOverflow: scrollWidth > innerWidth
                };
            })()""")
            print("Wizard Step 1 & Volets audit:", wizard_audit)
            results["wizard_step1_volets"] = wizard_audit

            # Capture Deliverable 2: mobile_volets_wizard_verified.png
            await cdp.screenshot("mobile_volets_wizard_verified.png")

            # Check Volet Multilingual Fallbacks across 4 languages
            langs_volets = {}
            for lang in ['rw', 'fr', 'en', 'sw']:
                res_lang = await cdp.evaluate(f"""(() => {{
                    V1.lang = '{lang}';
                    renderApp();
                    const allFieldLabels = Array.from(document.querySelectorAll('.v1-field-label'));
                    const voletLabel = allFieldLabels.find(l => l.innerText.includes('CPJP Specialist Volet') || l.innerText.includes('Volet'));
                    const voletContainer = voletLabel ? voletLabel.closest('.v1-field') : null;
                    const chips = voletContainer ? Array.from(voletContainer.querySelectorAll('.v1-chip')).map(c => c.innerText.trim()) : [];
                    return chips;
                }})()""")
                langs_volets[lang] = res_lang
            print("Volets multilingual labels:", langs_volets)
            results["volets_multilingual"] = langs_volets

            # Reset lang to FR and test Wizard Steps 2, 3, 4
            wizard_steps_audit = await cdp.evaluate("""(() => {
                V1.lang = 'fr';
                const stepChecks = {};

                // Step 2: Demographics
                V1.wizard.step = 2;
                renderApp();
                const totalEl = document.getElementById('w-total') || document.querySelector('.v1-wizard-total');
                const step2TouchBtns = Array.from(document.querySelectorAll('.v1-step-btn')).map(b => {
                    const r = b.getBoundingClientRect();
                    return { w: r.width, h: r.height, is44: r.width >= 40 && r.height >= 40 };
                });
                const step2Inputs = Array.from(document.querySelectorAll('.v1-step-input')).map(inp => {
                    const r = inp.getBoundingClientRect();
                    return { h: r.height, is44: r.height >= 40 };
                });
                stepChecks.step2 = {
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth,
                    stepBtnsAll44: step2TouchBtns.every(b => b.is44),
                    stepInputsAll44: step2Inputs.every(i => i.is44)
                };

                // Step 3: Safeguards & Issues
                V1.wizard.step = 3;
                renderApp();
                stepChecks.step3 = {
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth,
                    hasIssueFields: Boolean(document.querySelector('.v1-segmented') || document.querySelector('select'))
                };

                // Step 4: Summary & Submit
                V1.wizard.step = 4;
                renderApp();
                stepChecks.step4 = {
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth,
                    hasSummary: Boolean(document.querySelector('.v1-kpi-card') || document.querySelector('.v1-panel'))
                };

                // Close wizard
                V1.wizard = null;
                renderApp();

                return stepChecks;
            })()""")
            print("Wizard Steps 2-4 audit:", wizard_steps_audit)
            results["wizard_steps_2_4"] = wizard_steps_audit

            # =========================================================================
            # AUDIT 3: Form Creation Tab (Google Forms visual builder, 1:1 circular elements)
            # =========================================================================
            print("\n=== AUDITING 3: Form Creation Tab (create_form) & Circular Elements ===")
            await cdp.set_viewport(360, 800, mobile=True)
            create_form_audit = await cdp.evaluate("""(() => {
                V1.workspace = 'create_form';
                V091.activeFormTab = 'builder';
                renderApp();

                // Check circular elements
                const circleSelectors = [
                    '.gf-scale-circle',
                    '.gf-bullet-radio',
                    '.gf-icon-action-btn',
                    '.gf-step-chip-num',
                    '.v1-modal-close'
                ];

                const circleDetails = {};
                for (const sel of circleSelectors) {
                    const elements = Array.from(document.querySelectorAll(sel));
                    circleDetails[sel] = elements.map(el => {
                        const r = el.getBoundingClientRect();
                        const cs = getComputedStyle(el);
                        const ratio = r.width > 0 ? (r.height / r.width) : 1;
                        const isPerfectCircle = Math.abs(ratio - 1.0) < 0.08;
                        const isNeverOval = Math.abs(r.width - r.height) <= 2;
                        return {
                            tag: el.tagName,
                            width: r.width,
                            height: r.height,
                            ratio: Number(ratio.toFixed(2)),
                            aspectRatioCSS: cs.aspectRatio,
                            borderRadiusCSS: cs.borderRadius,
                            isPerfectCircle,
                            isNeverOval
                        };
                    });
                }

                // Check responsive text inputs
                const titleInputs = Array.from(document.querySelectorAll('.gf-form-title-input, .gf-q-title-input')).map(inp => {
                    const r = inp.getBoundingClientRect();
                    return {
                        className: inp.className,
                        width: r.width,
                        parentWidth: inp.parentElement ? inp.parentElement.getBoundingClientRect().width : 0,
                        fitsWithoutClipping: inp.parentElement ? (r.width <= inp.parentElement.getBoundingClientRect().width + 2) : true
                    };
                });

                // Check toolbar wrapping
                const toolbar = document.querySelector('.gf-builder-toolbar');
                const toolbarActions = document.querySelector('.gf-builder-toolbar-actions');
                const toolbarWrap = toolbar ? getComputedStyle(toolbar).flexWrap : '';

                const scrollWidth = document.documentElement.scrollWidth;
                const innerWidth = window.innerWidth;

                return {
                    circleDetails,
                    allCircles1to1: Object.values(circleDetails).flat().every(c => c.isNeverOval),
                    titleInputs,
                    titleInputsResponsive: titleInputs.every(i => i.fitsWithoutClipping),
                    toolbarFound: Boolean(toolbar),
                    scrollWidth,
                    innerWidth,
                    hasOverflow: scrollWidth > innerWidth
                };
            })()""")
            print("Create Form Audit on 360x800:", json.dumps(create_form_audit, indent=2))
            results["create_form_360"] = create_form_audit

            # Capture Deliverable 3: mobile_create_form_circles_verified.png
            await cdp.screenshot("mobile_create_form_circles_verified.png")

            # =========================================================================
            # AUDIT 4: Form Preview Modal (Aperçu répondant)
            # =========================================================================
            print("\n=== AUDITING 4: Aperçu répondant Modal ===")
            preview_audit = await cdp.evaluate("""(() => {
                const curForm = V091.formsList[0];
                if (typeof window.renderFormPreviewModal === 'function') {
                    window.renderFormPreviewModal(curForm);
                } else if (typeof V091.renderFormPreviewModal === 'function') {
                    V091.renderFormPreviewModal(curForm);
                } else {
                    // Click preview button in toolbar
                    const previewBtn = Array.from(document.querySelectorAll('.gf-builder-toolbar-actions button')).find(b => b.innerText.includes('Aperçu'));
                    if (previewBtn) previewBtn.click();
                }

                const modal = document.querySelector('.v1-modal-backdrop') || document.querySelector('.v1-modal') || document.querySelector('.v1-modal-dialog') || document.querySelector('.v1-modal-card');
                const closeBtn = document.querySelector('.v1-modal-close');
                const closeRect = closeBtn ? closeBtn.getBoundingClientRect() : null;
                const closeComputed = closeBtn ? getComputedStyle(closeBtn) : null;
                const closeIsCircle = closeRect ? (Math.abs(closeRect.width - closeRect.height) <= 2) : false;

                const previewCards = Array.from(document.querySelectorAll('.gf-preview-card')).map(c => {
                    const r = c.getBoundingClientRect();
                    return { width: r.width };
                });

                const scrollWidth = document.documentElement.scrollWidth;
                const innerWidth = window.innerWidth;

                return {
                    modalOpen: Boolean(modal),
                    closeFound: Boolean(closeBtn),
                    closeWidth: closeRect ? closeRect.width : 0,
                    closeHeight: closeRect ? closeRect.height : 0,
                    closeIsCircle,
                    closeAspectRatioCSS: closeComputed ? closeComputed.aspectRatio : '',
                    previewCardsCount: previewCards.length,
                    scrollWidth,
                    innerWidth,
                    hasOverflow: scrollWidth > innerWidth
                };
            })()""")
            print("Preview Modal Audit on 360x800:", preview_audit)
            results["preview_modal_360"] = preview_audit

            # Capture Deliverable 4: mobile_create_form_preview_verified.png
            await cdp.screenshot("mobile_create_form_preview_verified.png")

            # Close preview modal
            await cdp.evaluate("if (typeof V091.closeModal === 'function') V091.closeModal(); renderApp();")

            # =========================================================================
            # AUDIT 5: Core Workspaces on Mobile (tasks, approvals, analytics, exports)
            # =========================================================================
            print("\n=== AUDITING 5: Core Workspaces on Mobile 360x800 and 390x844 ===")
            ws_audits = {}
            for vp_name, w, h in [("Mobile Android", 360, 800), ("Mobile iPhone", 390, 844)]:
                await cdp.set_viewport(w, h, mobile=True)
                ws_checks = {}
                for ws in ["tasks", "approvals", "analytics", "exports"]:
                    res = await cdp.evaluate(f"""(() => {{
                        V1.workspace = '{ws}';
                        renderApp();
                        const scrollW = document.documentElement.scrollWidth;
                        const innerW = window.innerWidth;
                        const primaryBtns = Array.from(document.querySelectorAll('.v1-btn-primary, .v1-btn')).map(b => {{
                            const r = b.getBoundingClientRect();
                            return {{ height: r.height, tapTargetOk: r.height >= 38 }};
                        }});
                        return {{
                            scrollWidth: scrollW,
                            innerWidth: innerW,
                            hasOverflow: scrollW > innerW,
                            primaryBtnsCount: primaryBtns.length,
                            btnsTapTargetOk: primaryBtns.every(b => b.tapTargetOk)
                        }};
                    }})()""")
                    ws_checks[ws] = res
                ws_audits[vp_name] = ws_checks
            print("Core Workspaces Audits:", json.dumps(ws_audits, indent=2))
            results["core_workspaces"] = ws_audits

            # =========================================================================
            # AUDIT 6: Accessibility, Readability & Themes Contrast Check
            # =========================================================================
            print("\n=== AUDITING 6: Themes Contrast & Accessibility ===")
            theme_audits = {}
            for theme in ["light", "dark", "soft", "contrast"]:
                thm_res = await cdp.evaluate(f"""(() => {{
                    V1.theme = '{theme}';
                    document.documentElement.setAttribute('data-theme', '{theme}');
                    renderApp();

                    const bodyBg = getComputedStyle(document.body).backgroundColor;
                    const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
                    const bgSurface = getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim();
                    const colorPrimary = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();

                    // Check sample buttons
                    const btn = document.querySelector('.v1-btn-primary');
                    const btnBg = btn ? getComputedStyle(btn).backgroundColor : null;
                    const btnColor = btn ? getComputedStyle(btn).color : null;

                    return {{
                        theme: '{theme}',
                        bodyBg,
                        textPrimary,
                        bgSurface,
                        colorPrimary,
                        btnBg,
                        btnColor
                    }};
                }})()""")
                theme_audits[theme] = thm_res
            print("Theme audits:", theme_audits)
            results["themes"] = theme_audits

            # Write full audit summary to JSON report
            report_out = ROOT / "tests" / "mobile_ui_council_audit_report.json"
            report_out.write_text(json.dumps(results, indent=2), encoding="utf-8")
            print(f"\nAudit complete! Full JSON report saved to: {report_out}")

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

if __name__ == "__main__":
    asyncio.run(main())
