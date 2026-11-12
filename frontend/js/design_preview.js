/* ==========================================================================
   APSE CDJP Butare — IBM Carbon v11 Contextual Design Preview (/design-preview)
   Zero inline event handlers / strict CSP 'self' compliant.
   ========================================================================== */
(function () {
  'use strict';

  const STATE = {
    system: 'carbon',
    theme: 'light',
    density: 'standard', // 'compact' (32px) | 'standard' (40px)
    mode: 'ENUMERATOR',
    simulateError: true,
    searchQuery: '',
    statusFilter: 'ALL',
    selectedIds: new Set(['ACT-042']),
    page: 1,
    pageSize: 4,
    actionFeedback: '',
    tokensJsonText: ''
  };

  const PARISH_LEDGER = [
    {
      id: 'ACT-042',
      code: 'PAR-02 · Save',
      activity: 'Agro-pastoral seed & fertilizer distribution (Season A)',
      axis: 'SO-01 Livelihoods',
      status: 'GREAT',
      statusLabel: 'Verified · Great',
      beneficiaries: 1420,
      disbursedRwf: 18450000
    },
    {
      id: 'ACT-043',
      code: 'PAR-07 · Mugombwa',
      activity: 'Emergency WASH & borehole maintenance campaign',
      axis: 'SO-02 Health & WASH',
      status: 'GOOD',
      statusLabel: 'Reviewed · Good',
      beneficiaries: 985,
      disbursedRwf: 12900500
    },
    {
      id: 'ACT-044',
      code: 'PAR-11 · Cyanika',
      activity: 'Youth vocational tailoring & carpentry toolkit handover',
      axis: 'SO-03 Protection',
      status: 'MEDIUM',
      statusLabel: 'Pending MEL · Medium',
      beneficiaries: 410,
      disbursedRwf: 8760000
    },
    {
      id: 'ACT-045',
      code: 'PAR-19 · Kibeho',
      activity: 'School feeding & vulnerable household nutrition grant',
      axis: 'SO-01 Livelihoods',
      status: 'GREAT',
      statusLabel: 'Verified · Great',
      beneficiaries: 2310,
      disbursedRwf: 24380750
    },
    {
      id: 'ACT-046',
      code: 'PAR-22 · Nyumba',
      activity: 'Community peacebuilding & dialogue facilitation clinics',
      axis: 'SO-04 Governance',
      status: 'LOW',
      statusLabel: 'Correction Needed',
      beneficiaries: 315,
      disbursedRwf: 3420000
    },
    {
      id: 'ACT-047',
      code: 'PAR-25 · Gakoma',
      activity: 'Maternal health referral vouchers & community kit supply',
      axis: 'SO-02 Health & WASH',
      status: 'GOOD',
      statusLabel: 'Reviewed · Good',
      beneficiaries: 760,
      disbursedRwf: 9150200
    }
  ];

  const CARBON_SWATCHES = [
    { name: 'Shell Header', token: '--topbar-bg', value: '#161616' },
    { name: 'Canvas Surface', token: '--bg-canvas', value: '#F4F4F4 / #161616' },
    { name: 'Layer 01 Card', token: '--bg-surface', value: '#FFFFFF / #262626' },
    { name: 'Carbon Blue 60', token: '--color-primary', value: '#0F62FE' },
    { name: 'Secondary Gray 80', token: '--color-secondary', value: '#393939' },
    { name: 'Danger Red 60', token: '--color-danger', value: '#DA1E28' },
    { name: 'Success Green 50', token: '--success', value: '#24A148' },
    { name: 'Subtle Hairline', token: '--border-subtle', value: '#E0E0E0 / #393939' }
  ];

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatInt(num) {
    return Number(num || 0).toLocaleString('en-US');
  }

  async function ensureTokensLoaded() {
    if (STATE.tokensJsonText) return STATE.tokensJsonText;
    const res = await fetch('/tokens.figma.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    STATE.tokensJsonText = await res.text();
    return STATE.tokensJsonText;
  }

  function applyThemeAndDensity() {
    const html = document.documentElement;
    html.setAttribute('data-theme', STATE.theme);
    document.body.setAttribute('data-system', STATE.system);
    document.body.classList.toggle('dp-density-compact', STATE.density === 'compact');
    document.body.classList.toggle('dp-density-standard', STATE.density === 'standard');
  }

  function getFilteredRows() {
    const q = STATE.searchQuery.trim().toLowerCase();
    return PARISH_LEDGER.filter(function (row) {
      const matchStatus = STATE.statusFilter === 'ALL' || row.status === STATE.statusFilter;
      const matchQuery = !q ||
        row.id.toLowerCase().indexOf(q) !== -1 ||
        row.code.toLowerCase().indexOf(q) !== -1 ||
        row.activity.toLowerCase().indexOf(q) !== -1 ||
        row.axis.toLowerCase().indexOf(q) !== -1;
      return matchStatus && matchQuery;
    });
  }

  function render() {
    applyThemeAndDensity();
    const root = document.getElementById('dp_root');
    if (!root) return;

    const filtered = getFilteredRows();
    const totalPages = Math.max(1, Math.ceil(filtered.length / STATE.pageSize));
    if (STATE.page > totalPages) STATE.page = totalPages;
    const startIdx = (STATE.page - 1) * STATE.pageSize;
    const visibleRows = filtered.slice(startIdx, startIdx + STATE.pageSize);
    const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(function (r) {
      return STATE.selectedIds.has(r.id);
    });

    const themeButtons = [
      { id: 'light', label: 'Light · Gray 10' },
      { id: 'cdjp', label: 'White · UI Shell' },
      { id: 'dark', label: 'Dark · Gray 100' },
      { id: 'contrast', label: 'High Contrast' }
    ].map(function (t) {
      const active = STATE.theme === t.id ? ' active' : '';
      return '<button type="button" class="dp-shell-btn' + active + '" data-action="set-theme" data-theme-val="' + t.id + '">' + esc(t.label) + '</button>';
    }).join('');

    const swatchCards = CARBON_SWATCHES.map(function (sw) {
      return (
        '<div class="dp-swatch-item">' +
          '<span class="dp-swatch-chip" style="background: var(' + sw.token + ');"></span>' +
          '<div class="dp-swatch-meta">' +
            '<strong>' + esc(sw.name) + '</strong>' +
            '<code>' + esc(sw.token) + ' · ' + esc(sw.value) + '</code>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    const tableRowsHtml = visibleRows.map(function (r) {
      const checked = STATE.selectedIds.has(r.id) ? ' checked' : '';
      return (
        '<tr>' +
          '<td class="dp-col-check"><input type="checkbox" class="dp-checkbox" data-action="toggle-row" data-row-id="' + esc(r.id) + '" aria-label="Select ' + esc(r.id) + '"' + checked + '></td>' +
          '<td><code>' + esc(r.id) + '</code></td>' +
          '<td><strong>' + esc(r.code) + '</strong><div class="dp-cell-sub">' + esc(r.axis) + '</div></td>' +
          '<td>' + esc(r.activity) + '</td>' +
          '<td><span class="v1-badge ' + esc(r.status) + '">' + esc(r.statusLabel) + '</span></td>' +
          '<td class="dp-num-col">' + formatInt(r.beneficiaries) + '</td>' +
          '<td class="dp-num-col">' + formatInt(r.disbursedRwf) + ' RWF</td>' +
        '</tr>'
      );
    }).join('');

    const emptyRowHtml = '<tr><td colspan="7" class="dp-empty-cell">No parish disbursements match the current filter criteria.</td></tr>';

    root.innerHTML =
      '<header class="v1-topbar dp-topbar" role="banner">' +
        '<div class="dp-topbar-left">' +
          '<a class="v1-brand dp-brand-link" href="/api/apps/apse/operations.html">' +
            '<img class="v1-brand-logo" src="/assets/white.png" alt="CDJP Butare">' +
            '<span class="dp-brand-title">CDJP Butare · Design Preview</span>' +
          '</a>' +
          '<span class="dp-system-pill" data-system="carbon">SYSTEM: IBM CARBON v11</span>' +
        '</div>' +
        '<div class="dp-topbar-controls">' +
          '<div class="dp-control-group" role="group" aria-label="Surface theme selector">' +
            themeButtons +
          '</div>' +
          '<div class="dp-control-group" role="group" aria-label="Control density selector">' +
            '<button type="button" class="dp-shell-btn' + (STATE.density === 'compact' ? ' active' : '') + '" data-action="set-density" data-density-val="compact">Compact 32px</button>' +
            '<button type="button" class="dp-shell-btn' + (STATE.density === 'standard' ? ' active' : '') + '" data-action="set-density" data-density-val="standard">Standard 40px</button>' +
          '</div>' +
          '<button type="button" class="dp-shell-btn" id="dp_copy_tokens">Copy tokens.figma.json</button>' +
          '<button type="button" class="dp-shell-btn dp-shell-btn-primary" id="dp_download_tokens">Download tokens.figma.json</button>' +
        '</div>' +
      '</header>' +

      '<main class="v1-canvas dp-canvas">' +
        '<div class="v1-page-header dp-header-row">' +
          '<div>' +
            '<nav class="v1-breadcrumbs" aria-label="Breadcrumb">' +
              '<a class="v1-breadcrumb-item" href="/api/apps/apse/operations.html">APSE Operations</a>' +
              '<span class="v1-breadcrumb-sep" aria-hidden="true">/</span>' +
              '<span class="v1-breadcrumb-item current">IBM Carbon v11 Specimen Matrix</span>' +
            '</nav>' +
            '<h1 class="v1-page-title">IBM Carbon v11 Architecture &amp; Management Specimen</h1>' +
            '<p class="v1-page-subtitle">Strict 0px architectural geometry, Carbon Gray 10 / Gray 100 / Blue 60 (#0F62FE) hierarchy, 48px UI Shell header, 9999px semantic status pills, and W3C DTCG Figma tokens across real CDJP Butare workflows.</p>' +
          '</div>' +
          (STATE.actionFeedback ? '<span class="v1-badge GREAT" role="status">' + esc(STATE.actionFeedback) + '</span>' : '') +
        '</div>' +

        '<!-- 1. KPI Strip: Anti-Truncation Stress Test -->' +
        '<section class="dp-section" aria-label="KPI Strip Anti-Truncation Stress Test">' +
          '<div class="dp-section-head">' +
            '<h2>1. KPI Strip (Anti-Truncation &amp; Tabular Numerals Stress Test)</h2>' +
            '<span>Long multi-word operational labels + 9-digit RWF figures on 16-column Carbon grid</span>' +
          '</div>' +
          '<div class="v1-kpi-grid">' +
            '<article class="v1-kpi-card">' +
              '<span>Cumulative Annual Pastoral &amp; Emergency Relief Disbursed Budget</span>' +
              '<strong class="v1-tabular">148,750,420 RWF</strong>' +
            '</article>' +
            '<article class="v1-kpi-card">' +
              '<span>Verified Household Direct &amp; Indirect Programme Beneficiaries</span>' +
              '<strong class="v1-tabular">1,284,920</strong>' +
            '</article>' +
            '<article class="v1-kpi-card">' +
              '<span>Diocesan Quarter-to-Date Activity Target Execution Rate</span>' +
              '<strong class="v1-tabular">94.82%</strong>' +
            '</article>' +
            '<article class="v1-kpi-card">' +
              '<span>Active Reporting Parishes Across Southern Province Diocese</span>' +
              '<strong class="v1-tabular">27 / 27</strong>' +
            '</article>' +
          '</div>' +
        '</section>' +

        '<!-- 2. Multi-Field Form Matrix + Carbon Buttons -->' +
        '<section class="dp-section" aria-label="Multi-Field Form Matrix">' +
          '<div class="dp-section-head">' +
            '<h2>2. Multi-Field Form Matrix &amp; Carbon Interaction States</h2>' +
            '<span>Bottom-border field hierarchy, dual inset #0F62FE focus ring, and #DA1E28 validation</span>' +
          '</div>' +
          '<div class="v1-panel dp-full-panel">' +
            '<div class="dp-form-toolbar">' +
              '<div class="v1-segmented" role="group" aria-label="Collection mode switcher">' +
                ['ENUMERATOR', 'ADMIN_LOG', 'AUDIT'].map(function (m) {
                  return '<button type="button" class="v1-seg-btn' + (STATE.mode === m ? ' active' : '') + '" data-action="set-mode" data-mode-val="' + m + '">' + m.replace('_', ' ') + '</button>';
                }).join('') +
              '</div>' +
              '<button type="button" class="v1-btn v1-btn-sm v1-btn-secondary" id="dp_toggle_error">' +
                (STATE.simulateError ? 'Clear Validation Error' : 'Simulate #DA1E28 Error') +
              '</button>' +
            '</div>' +

            '<div class="dp-form-grid">' +
              '<div class="v1-field">' +
                '<label class="v1-field-label" for="dp_act_title">Planned Activity Reference</label>' +
                '<input id="dp_act_title" type="text" class="v1-input dp-ctrl" value="PAR-02 Season A Improved Bean Seed Distribution">' +
                '<div class="v1-field-helper">Matches approved annual diocesan workplan item SO-01.4</div>' +
              '</div>' +

              '<div class="v1-field">' +
                '<label class="v1-field-label" for="dp_parish_select">Implementing Parish Unit</label>' +
                '<select id="dp_parish_select" class="v1-select dp-ctrl">' +
                  '<option value="PAR-02">PAR-02 · Save Parish (Gisagara)</option>' +
                  '<option value="PAR-07">PAR-07 · Mugombwa Parish</option>' +
                  '<option value="PAR-11">PAR-11 · Cyanika Parish</option>' +
                  '<option value="PAR-19">PAR-19 · Kibeho Parish</option>' +
                '</select>' +
                '<div class="v1-field-helper">Scoped to parish financial &amp; MEL signatory</div>' +
              '</div>' +

              '<div class="v1-field">' +
                '<label class="v1-field-label" for="dp_budget_input">Disbursed Voucher Amount (RWF)</label>' +
                '<input id="dp_budget_input" type="text" class="v1-input dp-ctrl' + (STATE.simulateError ? ' has-error' : '') + '" value="' + (STATE.simulateError ? '-18450000' : '18450000') + '">' +
                (STATE.simulateError
                  ? '<div class="v1-field-error" role="alert">Amount must be greater than 0 RWF and within approved ceiling.</div>'
                  : '<div class="v1-field-helper">Validated against Q4 parish disbursement ledger</div>') +
              '</div>' +

              '<div class="v1-field">' +
                '<label class="v1-field-label" for="dp_date_start">Reporting Period Start / End</label>' +
                '<div class="dp-date-pair">' +
                  '<input id="dp_date_start" type="date" class="v1-input dp-ctrl" value="2026-10-01">' +
                  '<input id="dp_date_end" type="date" class="v1-input dp-ctrl" value="2026-12-31">' +
                '</div>' +
                '<div class="v1-field-helper">ISO-8601 fiscal quarter window (Q4-2026)</div>' +
              '</div>' +
            '</div>' +

            '<div class="dp-button-row">' +
              '<button type="button" class="v1-btn v1-btn-primary dp-ctrl" id="dp_btn_save">Submit Field Log</button>' +
              '<button type="button" class="v1-btn v1-btn-secondary dp-ctrl">Save Draft Locally</button>' +
              '<button type="button" class="v1-btn v1-btn-ghost dp-ctrl">Reset Form Fields</button>' +
              '<button type="button" class="v1-btn v1-btn-danger dp-ctrl">Flag Anomaly / Seize</button>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<!-- 3. Operational Data Table -->' +
        '<section class="dp-section" aria-label="Operational Data Table">' +
          '<div class="dp-section-head">' +
            '<h2>3. Operational Data Table (Toolbar, Selection, Pill Tags &amp; Pagination)</h2>' +
            '<span>Right-aligned tabular numerals, 0px architectural borders, 9999px status pills</span>' +
          '</div>' +
          '<div class="v1-panel dp-full-panel dp-table-panel">' +
            '<div class="dp-table-toolbar">' +
              '<div class="dp-table-search-wrap">' +
                '<input id="dp_table_search" type="search" class="v1-input dp-ctrl" placeholder="Filter by ID, parish, axis, or activity..." value="' + esc(STATE.searchQuery) + '">' +
              '</div>' +
              '<div class="dp-table-filter-pills">' +
                ['ALL', 'GREAT', 'GOOD', 'MEDIUM', 'LOW'].map(function (st) {
                  return '<button type="button" class="v1-chip' + (STATE.statusFilter === st ? ' active' : '') + '" data-action="set-status" data-status-val="' + st + '">' + st + '</button>';
                }).join('') +
              '</div>' +
              '<div class="dp-selection-badge">' + STATE.selectedIds.size + ' selected</div>' +
            '</div>' +

            '<div class="dp-table-scroll">' +
              '<table class="v1-data-table">' +
                '<thead>' +
                  '<tr>' +
                    '<th class="dp-col-check"><input type="checkbox" class="dp-checkbox" id="dp_select_all" aria-label="Select all visible rows"' + (allVisibleSelected ? ' checked' : '') + '></th>' +
                    '<th>Log ID</th>' +
                    '<th>Parish &amp; Axis</th>' +
                    '<th>Activity Deliverable</th>' +
                    '<th>Status Tag</th>' +
                    '<th class="dp-num-col">Beneficiaries</th>' +
                    '<th class="dp-num-col">Disbursed</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' + (tableRowsHtml || emptyRowHtml) + '</tbody>' +
              '</table>' +
            '</div>' +

            '<div class="dp-table-pagination">' +
              '<span>Showing ' + (filtered.length ? (startIdx + 1) : 0) + '–' + Math.min(startIdx + STATE.pageSize, filtered.length) + ' of ' + filtered.length + ' verified deliverables</span>' +
              '<div class="dp-pagination-controls">' +
                '<button type="button" class="v1-btn v1-btn-sm v1-btn-ghost" id="dp_prev_page"' + (STATE.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
                '<span class="v1-tabular">Page ' + STATE.page + ' / ' + totalPages + '</span>' +
                '<button type="button" class="v1-btn v1-btn-sm v1-btn-ghost" id="dp_next_page"' + (STATE.page >= totalPages ? ' disabled' : '') + '>Next</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<!-- 4. Action Dialogs & Carbon Color Tokens Reference -->' +
        '<section class="dp-section" aria-label="Action Dialogs and Color Matrix">' +
          '<div class="dp-section-head">' +
            '<h2>4. Workflow vs. Destructive Dialogs &amp; Active Token Matrix</h2>' +
            '<span>Strict 0px modal containers (#0F62FE workflow save vs. #DA1E28 irreversible seizure)</span>' +
          '</div>' +
          '<div class="dp-dialog-split">' +
            '<article class="dp-dialog-card">' +
              '<div class="dp-dialog-header">' +
                '<span>PRIMARY WORKFLOW CONFIRMATION</span>' +
                '<h3>Submit Quarterly Diocesan M&amp;E Dossier</h3>' +
              '</div>' +
              '<p class="dp-dialog-body">Seals 27 parish execution logs, locks HMAC-SHA256 verification digests, and queues the signed export bundle for coordinator sign-off.</p>' +
              '<div class="dp-dialog-actions">' +
                '<button type="button" class="v1-btn v1-btn-ghost dp-ctrl">Cancel</button>' +
                '<button type="button" class="v1-btn v1-btn-primary dp-ctrl">Seal &amp; Submit Dossier</button>' +
              '</div>' +
            '</article>' +

            '<article class="dp-dialog-card dp-dialog-danger">' +
              '<div class="dp-dialog-header">' +
                '<span>DESTRUCTIVE SECURITY ACTION</span>' +
                '<h3>Revoke Parish Seizure Authorization</h3>' +
              '</div>' +
              '<p class="dp-dialog-body">Immediately suspends offline Fernet key access for PAR-22 and writes an immutable entry to the diocesan audit trail. This cannot be undone.</p>' +
              '<div class="dp-dialog-actions">' +
                '<button type="button" class="v1-btn v1-btn-ghost dp-ctrl">Keep Authorization</button>' +
                '<button type="button" class="v1-btn v1-btn-danger dp-ctrl">Revoke Access Permanently</button>' +
              '</div>' +
            '</article>' +
          '</div>' +

          '<div class="v1-panel dp-full-panel dp-swatch-panel">' +
            '<div class="dp-swatch-grid">' + swatchCards + '</div>' +
          '</div>' +
        '</section>' +
      '</main>';

    bindEvents();
  }

  function bindEvents() {
    document.querySelectorAll('[data-action="set-theme"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        STATE.theme = btn.getAttribute('data-theme-val') || 'light';
        render();
      });
    });

    document.querySelectorAll('[data-action="set-density"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        STATE.density = btn.getAttribute('data-density-val') || 'standard';
        render();
      });
    });

    document.querySelectorAll('[data-action="set-mode"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        STATE.mode = btn.getAttribute('data-mode-val') || 'ENUMERATOR';
        render();
      });
    });

    document.querySelectorAll('[data-action="set-status"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        STATE.statusFilter = btn.getAttribute('data-status-val') || 'ALL';
        STATE.page = 1;
        render();
      });
    });

    const toggleErr = document.getElementById('dp_toggle_error');
    if (toggleErr) {
      toggleErr.addEventListener('click', function () {
        STATE.simulateError = !STATE.simulateError;
        render();
      });
    }

    const saveBtn = document.getElementById('dp_btn_save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        STATE.actionFeedback = STATE.simulateError
          ? 'Validation error highlighted in #DA1E28'
          : 'Specimen log validated with Carbon Blue 60';
        render();
      });
    }

    const searchInput = document.getElementById('dp_table_search');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        const pos = e.target.selectionStart || 0;
        STATE.searchQuery = e.target.value;
        STATE.page = 1;
        render();
        const nextInput = document.getElementById('dp_table_search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      });
    }

    const selectAll = document.getElementById('dp_select_all');
    if (selectAll) {
      selectAll.addEventListener('change', function () {
        const rows = getFilteredRows().slice((STATE.page - 1) * STATE.pageSize, STATE.page * STATE.pageSize);
        if (selectAll.checked) {
          rows.forEach(function (r) { STATE.selectedIds.add(r.id); });
        } else {
          rows.forEach(function (r) { STATE.selectedIds.delete(r.id); });
        }
        render();
      });
    }

    document.querySelectorAll('[data-action="toggle-row"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        const rowId = cb.getAttribute('data-row-id');
        if (cb.checked) STATE.selectedIds.add(rowId);
        else STATE.selectedIds.delete(rowId);
        render();
      });
    });

    const prevBtn = document.getElementById('dp_prev_page');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (STATE.page > 1) {
          STATE.page -= 1;
          render();
        }
      });
    }

    const nextBtn = document.getElementById('dp_next_page');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        STATE.page += 1;
        render();
      });
    }

    const copyBtn = document.getElementById('dp_copy_tokens');
    if (copyBtn) {
      copyBtn.addEventListener('click', async function () {
        try {
          const text = await ensureTokensLoaded();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          }
          STATE.actionFeedback = 'Copied tokens.figma.json (' + text.length + ' chars)';
        } catch (err) {
          STATE.actionFeedback = 'Token copy failed: ' + err.message;
        }
        render();
      });
    }

    const dlBtn = document.getElementById('dp_download_tokens');
    if (dlBtn) {
      dlBtn.addEventListener('click', async function () {
        try {
          const text = await ensureTokensLoaded();
          const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'tokens.figma.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          STATE.actionFeedback = 'Downloaded tokens.figma.json';
        } catch (err) {
          STATE.actionFeedback = 'Download failed: ' + err.message;
        }
        render();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', render);
})();
