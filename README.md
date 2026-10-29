# CDJP Butare — APSE v2 Strategic Planning & MEL Platform (2026–2031)

Clean, modern v2 web application for the **Catholic Diocese of Butare — Commission Diocésaine Justice et Paix (CDJP)** 5-Year Strategic Plan (**AP1–AP5**, Sep 2026 – Aug 2031).

## Architecture Overview (`apse-v2-clean`)

```text
APSE_CDJP_Butare/
├── backend/                  # FastAPI + Pydantic + SQLite WAL + Fernet Backend
│   ├── __init__.py
│   ├── config.py             # Environment & directory configuration
│   ├── domain.py             # Pastoral calendar, KPI engine, Impact ratings & Analytics
│   ├── database.py           # Encrypted SQLite WAL store, RBAC, Web Auth & HMAC Audit Chain
│   ├── transfers.py          # CSV (UTF-8-SIG), XLSX (openpyxl) & DOCX (python-docx) exports/imports
│   └── main.py               # FastAPI application, CSRF/Security middleware & REST endpoints
├── frontend/                 # Clean Modular Web Application
│   ├── index.html            # Single-Page Application entry point
│   ├── styles/
│   │   └── main.css          # Atlassian + IBM Carbon + Polaris/Momentum responsive design system
│   └── js/
│       ├── i18n.js           # 4-Language dictionary (Kinyarwanda, French, English, Swahili)
│       ├── api.js            # REST client, offline sync queue & local draft persistence
│       └── app.js            # Interactive views, 4-Step Wizard, 27-Parish Map & Web GUI Login
├── data/
│   └── catalog.json          # Single unified source of truth (5 Axes, 13 Outcomes, 15 Interventions, 35 KPIs, 27 Parishes, 101 Centrales)
├── tests/                    # Automated E2E Backend & Multi-Viewport Browser Test Suites
│   ├── test_prd_council_backend.py
│   └── test_prd_council_frontend.py
├── run.py                    # Uvicorn server launcher
├── requirements.txt          # Standard Python package dependencies
└── START_APSE_WINDOWS.cmd    # One-click Windows launcher
```

## Quick Start

1. **Install dependencies** (once):
   ```powershell
   pip install -r requirements.txt
   ```
2. **Start the server**:
   ```powershell
   python run.py
   ```
   Or double-click `START_APSE_WINDOWS.cmd`.
3. **Access from Desktop or Mobile Phone on LAN**:
   - Local PC: `http://127.0.0.1:8765/`
   - Mobile / Tablet on same Wi-Fi: `http://<your-lan-ip>:8765/`
4. **Web GUI Login & Role Switcher**:
   - Click **Account / Role** in the top bar to sign in via the Web GUI (`mel_admin`, `coord_diocese`, `cpjp_gakoma`, `cpjp_save`, `cpjp_butare`, `cpjp_kibeho`, `ccjp_field`, `ceb_animator` — default demo password: `apse2026`), or use the one-click Role/Parish Persona Switcher.
