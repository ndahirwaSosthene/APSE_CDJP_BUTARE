'use strict';
/* APSE v1.0 Redesign Frontend — Task-Driven To-Do Workflow, 4-Step Guided Capture,
   Auto-Calculated Totals, 3-Tier Approvals, Outcome Accordions, Regional Parish Map & Transfers */

const V1 = {
  lang: localStorage.getItem('apse-v1-lang') || 'en',
  theme: localStorage.getItem('apse-theme') || 'cdjp',
  workspace: 'tasks', // 'tasks' | 'approvals' | 'analytics' | 'exports'
  searchQuery: '',
  filters: {
    period: 'ALL',
    axis: '',
    parish: '',
    status: 'ALL',
    approvalStage: 'ALL',
    issueCategory: 'ALL',
  },
  data: null,
  offlineQueue: JSON.parse(localStorage.getItem('apse-v1-offline-queue') || '[]'),
  simulateOffline: false,
  syncingState: null, // null | { current: 1, total: 3 }
  wizard: null, // Active 4-step guided form state
  newTaskModal: false,
  exportOptions: {
    reportType: 'impact_summary',
    format: 'xlsx',
    preset: 'natural',
  },
  csvImportState: null,
};

const I18N = {
  en: {
    nav_tasks: 'My Tasks',
    nav_approvals: 'Approvals',
    nav_analytics: 'Impact & Analytics',
    nav_exports: 'Exports',
    nav_confidential: 'Log Confidential Case',
    search_placeholder: 'Search tasks, parishes, or outcomes...',
    sync_synced: 'All Data Synced',
    sync_offline: n => `Saved on Device (${n} waiting for internet)`,
    sync_updating: (c, t) => `Updating Central Database (${c} of ${t})...`,
    add_planned: '+ Add Planned Activity',
    log_completed: 'Log Completed Activity',
    log_progress: 'Log Progress →',
    fix_step: s => `Fix Step ${s} →`,
    view_summary: 'View / Update',
    period_all: 'All Dates',
    period_q1: 'This Quarter (Q1)',
    period_ap1: '2026–2027 Year',
    all_themes: 'All Themes',
    all_parishes: 'All Parishes',
    status_all: 'All',
    status_pending: 'Pending',
    status_progress: 'In Progress',
    status_done: 'Completed',
    stage_submitted: 'Waiting for Parish Review',
    stage_parish: 'Approved by Parish',
    stage_diocese: 'Approved by Diocese',
    stage_correction: 'Needs Correction',
    impact_GREAT: 'Great Impact',
    impact_GOOD: 'Good Impact',
    impact_LOW: 'Low Impact',
    impact_PENDING: 'Pending Log',
    step1_title: 'Step 1: When & Where',
    step2_title: 'Step 2: Attendance & Activity',
    step3_title: 'Step 3: Outcome & Challenges',
    step4_title: 'Step 4: Summary & Submit',
    submit_parish: 'Submit to Parish Reviewer',
    save_offline_btn: 'Save Offline on Device',
    strategy_report: 'Strategy & Impact Summary Report',
  },
  rw: {
    nav_tasks: 'Ibikorwa Byanjye',
    nav_approvals: ' Kwemeza Raporo',
    nav_analytics: 'Ibyagezweho n’Isesengura',
    nav_exports: 'Raporo n’ Kohereza',
    nav_confidential: "Andika Ikibazo cy'Ibanga",
    search_placeholder: 'Shakisha igikorwa, paruwasi cyangwa intego...',
    sync_synced: 'Amakuru Yose Yarabitswe',
    sync_offline: n => `Byabitswe kuri Mudasobwa (${n} bitegereje murandasi)`,
    sync_updating: (c, t) => ` kohereza mu bubiko bukuru (${c} muri ${t})...`,
    add_planned: '+ Shyiramo Igikorwa Giteganyijwe',
    log_completed: 'Uzuza Igikorwa Cyakozwe',
    log_progress: 'Uzuza Ibyakozwe →',
    fix_step: s => `Kosora Intambwe ya ${s} →`,
    view_summary: 'Reba / Hindura',
    period_all: 'Ibihe Byose',
    period_q1: 'Igihembwe (Q1)',
    period_ap1: 'Umwaka wa 2026–2027',
    all_themes: 'Insanganyamatsiko Zose',
    all_parishes: 'Paruwasi Zose',
    status_all: 'Byose',
    status_pending: 'Bitegereje',
    status_progress: 'Biri gukorwa',
    status_done: 'Byarangiye',
    stage_submitted: 'Iri gusuzumwa na Paruwasi',
    stage_parish: 'Yemejwe na Paruwasi',
    stage_diocese: 'Cyemejwe na Diyosezi',
    stage_correction: 'Igomba Gukosorwa',
    impact_GREAT: 'Ingaruka Nziza Cyane',
    impact_GOOD: 'Ingaruka Nziza',
    impact_LOW: 'Ingaruka Nto',
    impact_PENDING: ' Ntiruzuzwa',
    step1_title: 'Intambwe 1: Igihe n’Aho Byabereye',
    step2_title: 'Intambwe 2: Abitabiriye n’Ibyakozwe',
    step3_title: 'Intambwe 3: Impinduka n’Imbogamizi',
    step4_title: 'Intambwe 4: Incamake no Kohereza',
    submit_parish: 'Ohereza kuri Paruwasi ngo Isuzumwe',
    save_offline_btn: 'Bika kuri Mudasobwa (Offline)',
    strategy_report: "Raporo rusange y'Ibyagezweho",
  },
  fr: {
    nav_tasks: 'Mes Tâches',
    nav_approvals: 'Approbations',
    nav_analytics: 'Impact et Analyses',
    nav_exports: 'Exports et Transferts',
    nav_confidential: 'Enregistrer un Cas Confidentiel',
    search_placeholder: 'Rechercher une tâche, paroisse ou résultat...',
    sync_synced: 'Toutes les données synchronisées',
    sync_offline: n => `Enregistré sur l'appareil (${n} en attente)`,
    sync_updating: (c, t) => `Mise à jour de la base centrale (${c} sur ${t})...`,
    add_planned: '+ Ajouter une Activité Prévue',
    log_completed: 'Saisir une Activité Réalisée',
    log_progress: 'Saisir l’avancement →',
    fix_step: s => `Corriger l'étape ${s} →`,
    view_summary: 'Voir / Modifier',
    period_all: 'Toutes périodes',
    period_q1: 'Ce Trimestre (T1)',
    period_ap1: 'Année 2026–2027',
    all_themes: 'Tous les thèmes',
    all_parishes: 'Toutes les paroisses',
    status_all: 'Tous',
    status_pending: 'À faire',
    status_progress: 'En cours',
    status_done: 'Terminé',
    stage_submitted: 'En attente de revue Paroisse',
    stage_parish: 'Approuvé par la Paroisse',
    stage_diocese: 'Approuvé par le Diocèse',
    stage_correction: 'À corriger',
    impact_GREAT: 'Impact Élevé',
    impact_GOOD: 'Bon Impact',
    impact_LOW: 'Impact Faible',
    impact_PENDING: 'En attente',
    step1_title: 'Étape 1 : Quand et Où',
    step2_title: 'Étape 2 : Participation et Activité',
    step3_title: 'Étape 3 : Résultats et Défis',
    step4_title: 'Étape 4 : Résumé et Envoi',
    submit_parish: 'Soumettre au réviseur paroissial',
    save_offline_btn: 'Enregistrer hors ligne',
    strategy_report: 'Rapport Synthèse Stratégie et Impact',
  },
  sw: {
    nav_tasks: 'Kazi Zangu',
    nav_approvals: 'Uidhinishaji',
    nav_analytics: 'Matokeo na Uchambuzi',
    nav_exports: 'Ripoti na Uhamishaji',
    nav_confidential: 'Rekodi Kesi ya Siri',
    search_placeholder: 'Tafuta kazi, parokia au matokeo...',
    sync_synced: 'Data Zote Zimesawazishwa',
    sync_offline: n => `Imehifadhiwa kwenye Kifaa (${n} zinasubiri mtandao)`,
    sync_updating: (c, t) => `Inasasisha Hifadhidata Kuu (${c} kati ya ${t})...`,
    add_planned: '+ Ongeza Shughuli Iliyopangwa',
    log_completed: 'Jaza Shughuli Iliyokamilika',
    log_progress: 'Jaza Maendeleo →',
    fix_step: s => `Rekebisha Hatua ${s} →`,
    view_summary: 'Tazama / Badili',
    period_all: 'Vipindi Vyote',
    period_q1: 'Robo Hii (Q1)',
    period_ap1: 'Mwaka 2026–2027',
    all_themes: 'Mada Zote',
    all_parishes: 'Parokia Zote',
    status_all: 'Zote',
    status_pending: 'Inasubiri',
    status_progress: 'Inaendelea',
    status_done: 'Imekamilika',
    stage_submitted: 'Inasubiri Uhakiki wa Parokia',
    stage_parish: 'Imeidhinishwa na Parokia',
    stage_diocese: 'Imeidhinishwa na Jimbo',
    stage_correction: 'Inahitaji Marekebisho',
    impact_GREAT: 'Athari Kubwa',
    impact_GOOD: 'Athari Nzuri',
    impact_LOW: 'Athari Ndogo',
    impact_PENDING: 'Inasubiri',
    step1_title: 'Hatua 1: Lini na Wapi',
    step2_title: 'Hatua 2: Mahudhurio na Shughuli',
    step3_title: 'Hatua 3: Matokeo na Changamoto',
    step4_title: 'Hatua 4: Muhtasari na Wasilisha',
    submit_parish: 'Wasilisha kwa Mhakiki wa Parokia',
    save_offline_btn: 'Hifadhi Nje ya Mtandao',
    strategy_report: 'Ripoti ya Muhtasari wa Mkakati na Athari',
  },
};

function L(key, ...args) {
  const dict = I18N[V1.lang] || I18N.en;
  const val = dict[key] ?? I18N.en[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

function localize(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[V1.lang] || obj.en || obj.rw || obj.fr || Object.values(obj)[0] || '';
}

function calcPastoralClient(dateStr) {
  const d = new Date((dateStr || '2026-10-23') + 'T12:00:00Z');
  if (Number.isNaN(d.valueOf())) return { valid: false };
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const startY = m >= 9 ? y : y - 1;
  if (startY < 2026 || startY > 2030) return { valid: false, startY };
  const q = m >= 9 && m <= 11 ? 1 : m === 12 || m <= 2 ? 2 : m <= 5 ? 3 : 4;
  return {
    valid: true,
    ap: `AP${startY - 2025}`,
    yearLabel: `${startY}–${startY + 1} Year`,
    quarter: `Q${q}`,
  };
}

function calcImpactClient(val, minT, targT) {
  const n = Number(val || 0);
  if (n >= Number(targT || 1)) return 'GREAT';
  if (n >= Number(minT || 1)) return 'GOOD';
  return 'LOW';
}

async function apiV1(path, method = 'GET', body = null) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-APSE-Client': 'web' },
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch('/apse-service' + path, opts);
  if (!res.ok) {
    let err = await res.json().catch(() => ({ error: 'Request could not be completed.' }));
    throw new Error(err.details || err.error || 'Action could not be completed.');
  }
  return res.json();
}

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'className') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

async function loadBootstrap() {
  const q = new URLSearchParams();
  if (V1.filters.parish) q.set('parish', V1.filters.parish);
  if (V1.filters.period && V1.filters.period !== 'ALL') q.set('period', V1.filters.period);
  if (V1.filters.axis) q.set('axis', V1.filters.axis);
  try {
    V1.data = await apiV1('/v1/bootstrap?' + q.toString());
    localStorage.setItem('apse-v1-snapshot', JSON.stringify(V1.data));
  } catch (e) {
    const cached = localStorage.getItem('apse-v1-snapshot');
    if (cached) {
      V1.data = JSON.parse(cached);
      V1.simulateOffline = true;
    } else {
      throw e;
    }
  }
}

async function syncOfflineQueue() {
  if (!V1.offlineQueue.length) return;
  const total = V1.offlineQueue.length;
  for (let i = 0; i < total; i++) {
    V1.syncingState = { current: i + 1, total };
    renderApp();
    const item = V1.offlineQueue[0];
    await apiV1('/v1/logs', 'POST', item);
    V1.offlineQueue.shift();
    localStorage.setItem('apse-v1-offline-queue', JSON.stringify(V1.offlineQueue));
  }
  V1.syncingState = null;
  V1.simulateOffline = false;
  await loadBootstrap();
  renderApp();
}

function openWizardForTask(task, existingLog = null, forceStep = 1) {
  const savedDraft = JSON.parse(localStorage.getItem('apse-v1-draft-' + task.id) || 'null');
  const parishes = V1.data?.parishes || [];
  const pcode = existingLog?.parish_code || task.parish_code || V1.data?.user?.assigned_parish || 'PAR-01';
  const pObj = parishes.find(p => p.code === pcode) || parishes[0] || { centrales: [{ name: 'Centre' }] };
  const defaultCentrale = existingLog?.centrale || savedDraft?.centrale || pObj.centrales?.[0]?.name || 'Centre';

  V1.wizard = {
    step: existingLog?.payload?.correction_step || forceStep || savedDraft?.step || 1,
    task,
    id: existingLog?.id || null,
    parish_code: pcode,
    centrale: defaultCentrale,
    event_date: existingLog?.event_date || savedDraft?.event_date || '2026-10-23',
    collection_mode: existingLog?.collection_mode || savedDraft?.collection_mode || 'ENUMERATOR',
    women: existingLog?.women ?? savedDraft?.women ?? 12,
    men: existingLog?.men ?? savedDraft?.men ?? 8,
    age_u18: existingLog?.age_u18 ?? savedDraft?.age_u18 ?? 2,
    age_18_35: existingLog?.age_18_35 ?? savedDraft?.age_18_35 ?? 10,
    age_36_64: existingLog?.age_36_64 ?? savedDraft?.age_36_64 ?? 6,
    age_65: existingLog?.age_65 ?? savedDraft?.age_65 ?? 2,
    disability: existingLog?.disability ?? savedDraft?.disability ?? 1,
    sessions_done: existingLog?.sessions_done ?? savedDraft?.sessions_done ?? task.planned_target,
    outcome_value: existingLog?.outcome_value ?? savedDraft?.outcome_value ?? task.min_threshold,
    issue_severity: existingLog?.issue_severity || savedDraft?.issue_severity || 'NONE',
    issue_categories: existingLog ? [...existingLog.issue_categories] : (savedDraft?.issue_categories || []),
    issue_note: existingLog?.issue_note || savedDraft?.issue_note || '',
    duration_hours: existingLog?.payload?.duration_hours ?? savedDraft?.duration_hours ?? 2,
    consensus_notes: existingLog?.payload?.consensus_notes ?? savedDraft?.consensus_notes ?? '',
    respondents: existingLog?.payload?.respondents ?? savedDraft?.respondents ?? [{ code: 'RESP-01', score: 85, resolved_case: true }],
    forms_distributed: existingLog?.payload?.forms_distributed ?? savedDraft?.forms_distributed ?? 25,
    forms_returned: existingLog?.payload?.forms_returned ?? savedDraft?.forms_returned ?? 20,
    checklist: existingLog?.payload?.checklist ?? savedDraft?.checklist ?? ['Attendance verified', 'Safeguarding & inclusion respected'],
    observation_notes: existingLog?.payload?.observation_notes ?? savedDraft?.observation_notes ?? '',
    story_of_change: existingLog?.payload?.story_of_change ?? savedDraft?.story_of_change ?? '',
    attachments: existingLog?.payload?.attachments ? [...existingLog.payload.attachments] : (savedDraft?.attachments || []),
    privacy_confirmed: existingLog?.payload?.privacy_confirmed ?? savedDraft?.privacy_confirmed ?? !task.is_sensitive,
    correction_note: existingLog?.payload?.correction_note || '',
    correction_step: existingLog?.payload?.correction_step || null,
    error: '',
  };
  renderApp();
}

function saveWizardDraftLocal() {
  if (!V1.wizard) return;
  localStorage.setItem('apse-v1-draft-' + V1.wizard.task.id, JSON.stringify(V1.wizard));
}

function validateWizardStep(w, step) {
  w.error = '';
  const period = calcPastoralClient(w.event_date);
  if (step >= 1) {
    if (!period.valid) {
      w.error = 'Pick a date between 1 Sept 2026 and 31 Aug 2031.';
      return false;
    }
    if (!w.centrale) {
      w.error = 'Select a Centrale or community location in Step 1.';
      return false;
    }
  }
  if (step >= 2) {
    const total = Number(w.women || 0) + Number(w.men || 0);
    const ageSum = Number(w.age_u18 || 0) + Number(w.age_18_35 || 0) + Number(w.age_36_64 || 0) + Number(w.age_65 || 0);
    if (total > 0 && ageSum !== total) {
      const diff = total - ageSum;
      const act = diff > 0 ? `Add ${diff} more.` : `Remove ${Math.abs(diff)}.`;
      w.error = `Age group numbers add up to ${ageSum}, but you entered ${total} total participants. ${act}`;
      return false;
    }
    if (Number(w.disability || 0) > total) {
      w.error = `Participants with disabilities (${w.disability}) cannot be higher than total participants (${total}).`;
      return false;
    }
  }
  if (step >= 3) {
    const minT = Number(w.task.min_threshold || 0);
    if (Number(w.outcome_value || 0) < minT && (w.issue_severity === 'NONE' || !String(w.issue_note || '').trim())) {
      w.error = `Target not reached (${w.outcome_value} of ${minT}). Please select an issue level and add a short note.`;
      return false;
    }
    if (w.task.is_sensitive && !w.privacy_confirmed) {
      w.error = 'Please check the box confirming no victim names or private medical details are in the notes.';
      return false;
    }
  }
  return true;
}

/* Reusable Stepper Input Control (- / + with Direct Number Pad) */
function renderStepperInput(labelTxt, value, onChange, min = 0) {
  return h('div', { className: 'v1-stepper-box' },
    h('label', {}, labelTxt),
    h('div', { className: 'v1-stepper-controls' },
      h('button', {
        type: 'button',
        className: 'v1-step-btn',
        onClick: () => {
          const next = Math.max(min, Number(value || 0) - 1);
          onChange(next);
        },
      }, '−'),
      h('input', {
        type: 'number',
        className: 'v1-step-input',
        min: String(min),
        value: String(value ?? 0),
        onChange: e => onChange(Math.max(min, Number(e.target.value || 0))),
      }),
      h('button', {
        type: 'button',
        className: 'v1-step-btn',
        onClick: () => {
          const next = Math.max(min, Number(value || 0) + 1);
          onChange(next);
        },
      }, '+')
    )
  );
}

/* Scoped Searchable Combobox for 9+ Parishes */
function renderParishCombobox(selectedCode, onSelect, allowAll = true) {
  const parishes = V1.data?.parishes || [];
  if (parishes.length <= 4 && !allowAll) {
    return h('div', { className: 'v1-chips' },
      parishes.map(p =>
        h('button', {
          type: 'button',
          className: 'v1-chip' + (selectedCode === p.code ? ' active' : ''),
          onClick: () => onSelect(p.code),
        }, p.name)
      )
    );
  }
  const current = parishes.find(p => p.code === selectedCode);
  const listId = 'v1-parish-dl-' + Math.random().toString(36).slice(2, 7);
  return h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
    h('input', {
      type: 'search',
      list: listId,
      className: 'v1-search-input',
      style: { width: '210px', paddingLeft: '12px', height: '36px' },
      placeholder: current ? `${current.name} (${current.district})` : L('all_parishes'),
      value: current ? current.name : '',
      onChange: e => {
        const val = e.target.value.trim().toLowerCase();
        if (!val && allowAll) {
          onSelect('');
          return;
        }
        const match = parishes.find(p => p.name.toLowerCase() === val || p.code.toLowerCase() === val || p.name.toLowerCase().includes(val));
        if (match) onSelect(match.code);
      },
    }),
    selectedCode && allowAll
      ? h('button', { type: 'button', className: 'v1-btn v1-btn-secondary v1-btn-sm', onClick: () => onSelect('') }, 'Clear')
      : null,
    h('datalist', { id: listId },
      parishes.map(p => h('option', { value: p.name }, `${p.name} · ${p.district} District`))
    )
  );
}

/* 4-Step Guided Data Collection Wizard View */
function renderWizardView() {
  const w = V1.wizard;
  const task = w.task;
  const parishes = V1.data?.parishes || [];
  const currentParish = parishes.find(p => p.code === w.parish_code) || parishes[0] || { name: 'Gakoma', centrales: [{ name: 'Kizenga' }], cebs: ['CEB Kizenga 1'] };
  const period = calcPastoralClient(w.event_date);
  const totalParticipants = Number(w.women || 0) + Number(w.men || 0);
  const ageSum = Number(w.age_u18 || 0) + Number(w.age_18_35 || 0) + Number(w.age_36_64 || 0) + Number(w.age_65 || 0);
  const ageDiff = totalParticipants - ageSum;
  const previewImpact = calcImpactClient(w.outcome_value, task.min_threshold, task.target_threshold);

  const stepsMeta = [
    { num: 1, label: L('step1_title') },
    { num: 2, label: L('step2_title') },
    { num: 3, label: L('step3_title') },
    { num: 4, label: L('step4_title') },
  ];

  let stepContent = null;

  if (w.step === 1) {
    const locations = [
      ...(currentParish.centrales || []).map(c => c.name),
      ...(currentParish.cebs || []).slice(0, 3),
    ];
    const modes = [
      { code: 'ENUMERATOR', title: 'Individual Interviews (Enumerator)', desc: 'Log individual respondent answers or post-training scores' },
      { code: 'FOCUS_GROUP', title: 'Focus Group Session', desc: 'Group dialogue duration and shared community consensus notes' },
      { code: 'SURVEY', title: 'Survey Distribution / CSV Upload', desc: 'Track distributed vs. returned forms or upload a spreadsheet' },
      { code: 'OBSERVATION', title: 'Field Observation', desc: 'Interactive field checklist and direct site verification notes' },
    ];
    stepContent = h('div', {},
      h('div', { style: { background: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: '8px', marginBottom: '18px' } },
        h('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--brand-primary)', textTransform: 'uppercase' } },
          `Assigned Goal · ${localize(task.axis_labels)} (Auto-Linked)`
        ),
        h('div', { style: { fontSize: '17px', fontWeight: '800', marginTop: '4px' } }, localize(task.titles)),
        h('div', { style: { fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' } },
          `Planned Target: ${task.planned_target} ${task.unit_label} · Minimum Impact Threshold: ${task.min_threshold}`
        )
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '18px' } },
        h('div', {},
          h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'Activity Date'),
          h('input', {
            type: 'date',
            className: 'v1-step-input',
            style: { textAlign: 'left', padding: '0 12px' },
            value: w.event_date,
            onChange: e => {
              w.event_date = e.target.value;
              saveWizardDraftLocal();
              renderApp();
            },
          }),
          period.valid
            ? h('div', { style: { marginTop: '6px', fontSize: '13px', color: 'var(--brand-primary)', fontWeight: '700' } },
                `✓ Auto-Tagged: ${period.yearLabel} · ${period.quarter}`
              )
            : h('div', { style: { marginTop: '6px', fontSize: '13px', color: '#dc2626', fontWeight: '700' } },
                'Pick a date between 1 Sept 2026 and 31 Aug 2031.'
              )
        ),
        h('div', {},
          h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'Parish (Auto-Scoped to Your Account)'),
          renderParishCombobox(w.parish_code, newCode => {
            if (!newCode) return;
            w.parish_code = newCode;
            const np = parishes.find(p => p.code === newCode);
            w.centrale = np?.centrales?.[0]?.name || 'Centre';
            saveWizardDraftLocal();
            renderApp();
          }, false)
        )
      ),
      h('div', { style: { marginBottom: '18px' } },
        h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '8px' } },
          `Select Local Centrale or CEB in ${currentParish.name} Parish:`
        ),
        h('div', { className: 'v1-chips' },
          locations.map(loc =>
            h('button', {
              type: 'button',
              className: 'v1-chip' + (w.centrale === loc ? ' active' : ''),
              onClick: () => {
                w.centrale = loc;
                saveWizardDraftLocal();
                renderApp();
              },
            }, loc)
          )
        )
      ),
      h('div', {},
        h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '8px' } }, 'Collection Mode (Choose How Data Was Gathered):'),
        h('div', { className: 'v1-radio-cards' },
          modes.map(m =>
            h('button', {
              type: 'button',
              className: 'v1-radio-card' + (w.collection_mode === m.code ? ' active' : ''),
              onClick: () => {
                w.collection_mode = m.code;
                saveWizardDraftLocal();
                renderApp();
              },
            },
              h('strong', {}, m.title),
              h('span', {}, m.desc)
            )
          )
        )
      )
    );
  } else if (w.step === 2) {
    stepContent = h('div', {},
      h('h3', { style: { marginTop: 0 } }, 'Participant Counts (Auto-Calculated Total)'),
      h('div', { className: 'v1-number-grid' },
        renderStepperInput('Women Participants', w.women, val => {
          w.women = val;
          saveWizardDraftLocal();
          renderApp();
        }),
        renderStepperInput('Men Participants', w.men, val => {
          w.men = val;
          saveWizardDraftLocal();
          renderApp();
        }),
        renderStepperInput(`Completed Units (${task.unit_label})`, w.sessions_done, val => {
          w.sessions_done = val;
          saveWizardDraftLocal();
          renderApp();
        })
      ),
      h('div', { className: 'v1-total-banner' },
        h('span', {}, 'Total Participants (Women + Men Automatically Calculated)'),
        h('span', { style: { fontSize: '22px' } }, `${totalParticipants} Participants`)
      ),
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '18px' } },
        h('h4', { style: { margin: 0 } }, 'Age Group Breakdown & Inclusion'),
        ageDiff === 0
          ? h('span', { className: 'v1-badge GREAT' }, `${ageSum} of ${totalParticipants} participants assigned to age groups ✓`)
          : h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              h('span', { className: 'v1-badge LOW' },
                `Age group numbers add up to ${ageSum}, but you entered ${totalParticipants} total participants. ${ageDiff > 0 ? `Add ${ageDiff} more.` : `Remove ${Math.abs(ageDiff)}.`}`
              ),
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-secondary v1-btn-sm',
                onClick: () => {
                  w.age_18_35 = Math.max(0, Number(w.age_18_35 || 0) + ageDiff);
                  saveWizardDraftLocal();
                  renderApp();
                },
              }, 'Auto-Fit Age Groups')
            )
      ),
      h('div', { className: 'v1-number-grid' },
        renderStepperInput('Under 18 Years', w.age_u18, v => { w.age_u18 = v; saveWizardDraftLocal(); renderApp(); }),
        renderStepperInput('18–35 Years', w.age_18_35, v => { w.age_18_35 = v; saveWizardDraftLocal(); renderApp(); }),
        renderStepperInput('36–64 Years', w.age_36_64, v => { w.age_36_64 = v; saveWizardDraftLocal(); renderApp(); }),
        renderStepperInput('65+ Years', w.age_65, v => { w.age_65 = v; saveWizardDraftLocal(); renderApp(); }),
        renderStepperInput('Persons with Disabilities', w.disability, v => { w.disability = v; saveWizardDraftLocal(); renderApp(); })
      ),
      h('hr', { style: { border: 0, borderTop: '1px solid var(--border-color)', margin: '20px 0' } }),
      w.collection_mode === 'ENUMERATOR'
        ? h('div', {},
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
              h('strong', {}, 'Individual Respondent Quick-Entry Cards'),
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-secondary v1-btn-sm',
                onClick: () => {
                  w.respondents.push({ code: `RESP-0${w.respondents.length + 1}`, score: 80, resolved_case: true });
                  saveWizardDraftLocal();
                  renderApp();
                },
              }, '+ Add Respondent')
            ),
            w.respondents.map((r, idx) =>
              h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: '6px' } },
                h('span', { style: { fontWeight: '700', minWidth: '80px' } }, r.code),
                h('label', { style: { fontSize: '13px' } }, 'Score (%): '),
                h('input', {
                  type: 'number',
                  className: 'v1-step-input',
                  style: { width: '90px', height: '34px' },
                  value: String(r.score),
                  onChange: e => { r.score = Number(e.target.value); saveWizardDraftLocal(); },
                }),
                h('button', {
                  type: 'button',
                  className: 'v1-chip' + (r.resolved_case ? ' active' : ''),
                  onClick: () => { r.resolved_case = !r.resolved_case; saveWizardDraftLocal(); renderApp(); },
                }, r.resolved_case ? '✓ Outcome Met' : 'Not Yet'),
                w.respondents.length > 1
                  ? h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-secondary v1-btn-sm',
                      onClick: () => { w.respondents.splice(idx, 1); saveWizardDraftLocal(); renderApp(); },
                    }, 'Remove')
                  : null
              )
            )
          )
        : w.collection_mode === 'FOCUS_GROUP'
        ? h('div', {},
            renderStepperInput('Focus Group Duration (Hours)', w.duration_hours, v => { w.duration_hours = v; saveWizardDraftLocal(); renderApp(); }, 1),
            h('label', { style: { fontWeight: '700', display: 'block', margin: '12px 0 6px' } }, 'Group Consensus Findings & Key Takeaways'),
            h('textarea', {
              rows: '3',
              style: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' },
              placeholder: 'Summarize the main agreements reached by the group...',
              value: w.consensus_notes,
              onChange: e => { w.consensus_notes = e.target.value; saveWizardDraftLocal(); },
            })
          )
        : w.collection_mode === 'SURVEY'
        ? h('div', {},
            h('div', { className: 'v1-number-grid' },
              renderStepperInput('Paper/Digital Forms Distributed', w.forms_distributed, v => { w.forms_distributed = v; saveWizardDraftLocal(); renderApp(); }),
              renderStepperInput('Completed Forms Returned', w.forms_returned, v => { w.forms_returned = v; saveWizardDraftLocal(); renderApp(); })
            )
          )
        : h('div', {},
            h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '8px' } }, 'Field Observation Checklist:'),
            h('div', { className: 'v1-chips', style: { marginBottom: '12px' } },
              ['Attendance verified', 'Safeguarding & inclusion respected', 'Action plan signed by participants', 'Follow-up date scheduled'].map(item =>
                h('button', {
                  type: 'button',
                  className: 'v1-chip' + (w.checklist.includes(item) ? ' active' : ''),
                  onClick: () => {
                    if (w.checklist.includes(item)) w.checklist = w.checklist.filter(x => x !== item);
                    else w.checklist.push(item);
                    saveWizardDraftLocal();
                    renderApp();
                  },
                }, (w.checklist.includes(item) ? '✓ ' : '') + item)
              )
            ),
            h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'Direct Field Observation Notes'),
            h('textarea', {
              rows: '3',
              style: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' },
              value: w.observation_notes,
              onChange: e => { w.observation_notes = e.target.value; saveWizardDraftLocal(); },
            })
          )
    );
  } else if (w.step === 3) {
    const severities = [
      { code: 'NONE', label: 'No Issues' },
      { code: 'MINOR', label: 'Minor' },
      { code: 'MEDIUM', label: 'Medium' },
      { code: 'MAJOR', label: 'Major' },
    ];
    stepContent = h('div', {},
      h('div', { style: { background: 'var(--bg-subtle)', padding: '16px', borderRadius: '10px', marginBottom: '18px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' } },
          h('div', {},
            h('strong', { style: { fontSize: '15px', display: 'block' } }, localize(task.outcome_prompt)),
            h('span', { style: { fontSize: '13px', color: 'var(--ink-secondary)' } },
              `Minimum Threshold for Good Impact: ${task.min_threshold} · Great Impact Target: ${task.target_threshold}`
            )
          ),
          h('span', { className: 'v1-badge ' + previewImpact }, L('impact_' + previewImpact))
        ),
        h('div', { style: { maxWidth: '260px', marginTop: '12px' } },
          renderStepperInput('Measured Outcome Achieved', w.outcome_value, val => {
            w.outcome_value = val;
            saveWizardDraftLocal();
            renderApp();
          })
        )
      ),
      h('div', { style: { marginBottom: '18px' } },
        h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '8px' } }, 'Did you face any field issues or delays?'),
        h('div', { className: 'v1-segmented' },
          severities.map(s =>
            h('button', {
              type: 'button',
              className: 'v1-seg-btn' + (w.issue_severity === s.code ? ' active' : ''),
              onClick: () => {
                w.issue_severity = s.code;
                saveWizardDraftLocal();
                renderApp();
              },
            }, s.label)
          )
        )
      ),
      (w.issue_severity !== 'NONE' || Number(w.outcome_value || 0) < Number(task.min_threshold || 0))
        ? h('div', { style: { background: 'var(--warn-bg)', color: 'var(--warn-ink)', padding: '16px', borderRadius: '10px', marginBottom: '18px' } },
            h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '8px' } }, 'Select Issue Categories (5–6 Filter Chips):'),
            h('div', { className: 'v1-chips', style: { marginBottom: '12px' } },
              (V1.data?.issue_categories || ['Transport', 'Turnout', 'Budget', 'Weather', 'Security', 'Other']).map(cat =>
                h('button', {
                  type: 'button',
                  className: 'v1-chip' + (w.issue_categories.includes(cat) ? ' active' : ''),
                  onClick: () => {
                    if (w.issue_categories.includes(cat)) w.issue_categories = w.issue_categories.filter(c => c !== cat);
                    else w.issue_categories.push(cat);
                    saveWizardDraftLocal();
                    renderApp();
                  },
                }, cat)
              )
            ),
            h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'Short Explanation (What happened and what support is needed?):'),
            h('textarea', {
              rows: '3',
              style: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d97706' },
              placeholder: 'Example: Heavy rain delayed transport from distant CEBs...',
              value: w.issue_note,
              onChange: e => { w.issue_note = e.target.value; saveWizardDraftLocal(); },
            })
          )
        : null,
      h('div', { style: { marginBottom: '16px' } },
        h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'Qualitative Story of Change or Key Observation (Optional)'),
        h('textarea', {
          rows: '2',
          style: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' },
          placeholder: 'Brief real-world example of impact...',
          value: w.story_of_change,
          onChange: e => { w.story_of_change = e.target.value; saveWizardDraftLocal(); },
        })
      ),
      h('div', { style: { marginBottom: '16px' } },
        h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'Attach Attendance Sheet or Photo Receipt'),
        h('input', {
          type: 'file',
          accept: '.pdf,.png,.jpg,.jpeg',
          onChange: e => {
            const f = e.target.files?.[0];
            if (f && !w.attachments.includes(f.name)) {
              w.attachments.push(f.name);
              saveWizardDraftLocal();
              renderApp();
            }
          },
        }),
        w.attachments.length
          ? h('div', { className: 'v1-chips', style: { marginTop: '8px' } },
              w.attachments.map(a => h('span', { className: 'v1-badge GOOD' }, `📎 ${a}`))
            )
          : null
      ),
      task.is_sensitive
        ? h('label', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' } },
            h('input', {
              type: 'checkbox',
              checked: w.privacy_confirmed,
              style: { width: '20px', height: '20px' },
              onChange: e => { w.privacy_confirmed = e.target.checked; saveWizardDraftLocal(); renderApp(); },
            }),
            'I confirm no victim names or private medical details are written in the general notes.'
          )
        : null
    );
  } else if (w.step === 4) {
    const actionPct = Math.min(100, Math.round((Number(w.sessions_done || 0) / Number(task.planned_target || 1)) * 100));
    stepContent = h('div', {},
      h('h3', { style: { marginTop: 0 } }, 'Quick Summary Before Submitting'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '18px' } },
        h('div', { className: 'v1-kpi-card' },
          h('span', {}, 'Location & Pastoral Period'),
          h('strong', { style: { fontSize: '18px' } }, `${currentParish.name} · ${w.centrale}`),
          h('div', { style: { fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' } },
            `${w.event_date} (${period.yearLabel} · ${period.quarter})`
          )
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', {}, 'Total Participants'),
          h('strong', {}, String(totalParticipants)),
          h('div', { style: { fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' } },
            `${w.women} Women · ${w.men} Men · ${w.disability} with Disabilities`
          )
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', {}, 'Action Completion & Impact Badge'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' } },
            h('strong', { style: { margin: 0, fontSize: '22px' } }, `${actionPct}%`),
            h('span', { className: 'v1-badge ' + previewImpact }, L('impact_' + previewImpact))
          ),
          h('div', { style: { fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' } },
            `Outcome Achieved: ${w.outcome_value} (Target: ${task.target_threshold})`
          )
        )
      ),
      w.issue_severity !== 'NONE'
        ? h('div', { style: { padding: '12px 16px', background: 'var(--warn-bg)', color: 'var(--warn-ink)', borderRadius: '8px', marginBottom: '16px' } },
            h('strong', {}, `Logged Field Issue (${w.issue_severity}): `),
            `${w.issue_categories.join(', ') || 'General'} — ${w.issue_note}`
          )
        : null
    );
  }

  return h('div', { className: 'v1-wizard-card' },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
      h('button', {
        type: 'button',
        className: 'v1-btn v1-btn-secondary v1-btn-sm',
        onClick: () => {
          saveWizardDraftLocal();
          V1.wizard = null;
          renderApp();
        },
      }, '← Back to My Tasks'),
      h('span', { style: { fontSize: '13px', color: 'var(--ink-secondary)', fontWeight: '600' } },
        `Step ${w.step} of 4 · Draft Saved Automatically`
      )
    ),
    w.correction_note
      ? h('div', { className: 'v1-error-alert' },
          `Reviewer Requested Correction (Step ${w.correction_step || 1}): "${w.correction_note}"`
        )
      : null,
    h('div', { className: 'v1-stepper-bar' },
      stepsMeta.map(s =>
        h('button', {
          type: 'button',
          className: 'v1-step-indicator' + (w.step === s.num ? ' active' : (w.step > s.num ? ' done' : '')),
          onClick: () => {
            if (s.num < w.step || validateWizardStep(w, w.step)) {
              w.step = s.num;
              saveWizardDraftLocal();
              renderApp();
            } else {
              renderApp();
            }
          },
        }, s.label)
      )
    ),
    w.error ? h('div', { className: 'v1-error-alert', role: 'alert' }, w.error) : null,
    stepContent,
    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' } },
      w.step > 1
        ? h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-secondary',
            onClick: () => {
              w.step -= 1;
              w.error = '';
              saveWizardDraftLocal();
              renderApp();
            },
          }, '← Previous Step')
        : h('div'),
      w.step < 4
        ? h('button', {
            type: 'button',
            className: 'v1-btn',
            onClick: () => {
              if (validateWizardStep(w, w.step)) {
                w.step += 1;
                saveWizardDraftLocal();
              }
              renderApp();
            },
          }, 'Next Step →')
        : h('button', {
            type: 'button',
            className: 'v1-btn',
            onClick: async () => {
              if (!validateWizardStep(w, 3)) {
                renderApp();
                return;
              }
              const payload = {
                id: w.id,
                task_id: task.id,
                parish_code: w.parish_code,
                centrale: w.centrale,
                event_date: w.event_date,
                collection_mode: w.collection_mode,
                women: w.women,
                men: w.men,
                age_u18: w.age_u18,
                age_18_35: w.age_18_35,
                age_36_64: w.age_36_64,
                age_65: w.age_65,
                disability: w.disability,
                sessions_done: w.sessions_done,
                outcome_value: w.outcome_value,
                issue_severity: w.issue_severity,
                issue_categories: w.issue_categories,
                issue_note: w.issue_note,
                duration_hours: w.duration_hours,
                consensus_notes: w.consensus_notes,
                respondents: w.respondents,
                forms_distributed: w.forms_distributed,
                forms_returned: w.forms_returned,
                checklist: w.checklist,
                observation_notes: w.observation_notes,
                story_of_change: w.story_of_change,
                attachments: w.attachments,
                privacy_confirmed: w.privacy_confirmed,
              };
              try {
                if (V1.simulateOffline) throw new Error('offline');
                await apiV1('/v1/logs', 'POST', payload);
                localStorage.removeItem('apse-v1-draft-' + task.id);
                V1.wizard = null;
                await loadBootstrap();
                renderApp();
              } catch (err) {
                if (V1.simulateOffline || err.message === 'offline' || err.message.includes('Failed to fetch')) {
                  V1.offlineQueue.push(payload);
                  localStorage.setItem('apse-v1-offline-queue', JSON.stringify(V1.offlineQueue));
                  localStorage.removeItem('apse-v1-draft-' + task.id);
                  V1.wizard = null;
                  renderApp();
                } else {
                  w.error = err.message;
                  renderApp();
                }
              }
            },
          }, V1.simulateOffline ? L('save_offline_btn') : L('submit_parish'))
    )
  );
}

/* Modal to Add a New Planned Activity (Auto-Inherits Strategic Metadata) */
function renderNewTaskModal() {
  const goals = V1.data?.goals || [];
  const state = V1.newTaskState || (V1.newTaskState = {
    title: '',
    outcome_code: goals[0]?.outcome_code || 'A1.R1',
    parish_code: V1.data?.user?.assigned_parish || 'PAR-01',
    due_date: '2026-12-15',
    planned_target: 25,
    min_threshold: 15,
    target_threshold: 22,
    frequency: 4,
    unit_label: 'participants',
    is_sensitive: false,
    error: '',
  });

  return h('div', { className: 'v1-wizard-card', style: { marginBottom: '24px' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
      h('h3', { style: { margin: 0 } }, L('add_planned')),
      h('button', {
        type: 'button',
        className: 'v1-btn v1-btn-secondary v1-btn-sm',
        onClick: () => { V1.newTaskModal = false; renderApp(); },
      }, 'Cancel')
    ),
    state.error ? h('div', { className: 'v1-error-alert' }, state.error) : null,
    h('div', { style: { marginBottom: '14px' } },
      h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } },
        '1. Choose Strategic Goal (Backend Automatically Binds Axis, Outcome & KPI IDs):'
      ),
      h('div', { className: 'v1-chips' },
        goals.slice(0, 6).map(g =>
          h('button', {
            type: 'button',
            className: 'v1-chip' + (state.outcome_code === g.outcome_code ? ' active' : ''),
            onClick: () => { state.outcome_code = g.outcome_code; renderApp(); },
          }, `${localize(g.axis_labels)}: ${localize(g.labels).slice(0, 58)}...`)
        )
      )
    ),
    h('div', { style: { marginBottom: '14px' } },
      h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, '2. Natural Activity Title (Plain Action Statement):'),
      h('input', {
        type: 'text',
        className: 'v1-step-input',
        style: { textAlign: 'left', padding: '0 12px' },
        placeholder: 'e.g., Train 25 youth mediators in peaceful family dialogue',
        value: state.title,
        onChange: e => { state.title = e.target.value; },
      })
    ),
    h('div', { className: 'v1-number-grid', style: { marginBottom: '16px' } },
      h('div', {},
        h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'Assigned Parish'),
        renderParishCombobox(state.parish_code, code => { if (code) state.parish_code = code; renderApp(); }, false)
      ),
      h('div', {},
        h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'Target Due Date'),
        h('input', {
          type: 'date',
          className: 'v1-step-input',
          value: state.due_date,
          onChange: e => { state.due_date = e.target.value; },
        })
      ),
      renderStepperInput('Planned Target', state.planned_target, v => {
        state.planned_target = v;
        state.min_threshold = Math.max(1, Math.round(v * 0.6));
        state.target_threshold = Math.max(state.min_threshold, Math.round(v * 0.9));
        renderApp();
      }, 1),
      renderStepperInput('Good Impact Threshold (Min)', state.min_threshold, v => { state.min_threshold = v; renderApp(); }, 1),
      renderStepperInput('Great Impact Threshold', state.target_threshold, v => { state.target_threshold = v; renderApp(); }, 1)
    ),
    h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '10px' } },
      h('button', {
        type: 'button',
        className: 'v1-btn',
        onClick: async () => {
          try {
            await apiV1('/v1/tasks', 'POST', state);
            V1.newTaskModal = false;
            V1.newTaskState = null;
            await loadBootstrap();
            renderApp();
          } catch (err) {
            state.error = err.message;
            renderApp();
          }
        },
      }, 'Save Activity to To-Do List')
    )
  );
}

/* WORKSPACE 1: My Tasks (To-Do List) */
function renderTasksWorkspace() {
  if (V1.wizard) return renderWizardView();
  const tasks = (V1.data?.tasks || []).filter(t => {
    if (V1.filters.status !== 'ALL' && t.status !== V1.filters.status) return false;
    if (V1.searchQuery) {
      const q = V1.searchQuery.toLowerCase();
      const hay = `${localize(t.titles)} ${t.parish_name} ${localize(t.axis_labels)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const themes = [
    { code: '', label: L('all_themes') },
    { code: 'A1', label: 'Healing & Unity' },
    { code: 'A2', label: 'Conflict Resolution' },
    { code: 'A3', label: 'Environmental Care' },
    { code: 'A4', label: 'Human Rights' },
    { code: 'A5', label: 'Committee Support' },
  ];

  return h('div', {},
    h('div', { className: 'v1-page-header' },
      h('div', {},
        h('h1', { className: 'v1-page-title' }, L('nav_tasks')),
        h('p', { className: 'v1-page-subtitle' },
          'Your assigned field activities, recurring quarterly goals, and saved drafts. All internal M&E codes are handled automatically.'
        )
      ),
      h('div', { className: 'v1-header-actions' },
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-sensitive',
          onClick: () => {
            const sensTask = (V1.data?.tasks || []).find(t => t.is_sensitive) || V1.data?.tasks?.[0];
            if (sensTask) openWizardForTask(sensTask);
          },
        }, '🔒 ' + L('nav_confidential')),
        h('button', {
          type: 'button',
          className: 'v1-btn',
          onClick: () => { V1.newTaskModal = !V1.newTaskModal; renderApp(); },
        }, L('add_planned'))
      )
    ),
    V1.newTaskModal ? renderNewTaskModal() : null,
    /* Contextual Filter Bar */
    h('div', { className: 'v1-context-filters' },
      h('div', { className: 'v1-segmented' },
        [
          ['ALL', L('period_all')],
          ['Q1', L('period_q1')],
          ['AP1', L('period_ap1')],
        ].map(([code, lbl]) =>
          h('button', {
            type: 'button',
            className: 'v1-seg-btn' + (V1.filters.period === code ? ' active' : ''),
            onClick: async () => { V1.filters.period = code; await loadBootstrap(); renderApp(); },
          }, lbl)
        )
      ),
      renderParishCombobox(V1.filters.parish, async code => {
        V1.filters.parish = code;
        await loadBootstrap();
        renderApp();
      }, true),
      h('div', { className: 'v1-segmented' },
        [
          ['ALL', L('status_all')],
          ['PENDING', L('status_pending')],
          ['IN_PROGRESS', L('status_progress')],
          ['COMPLETED', L('status_done')],
        ].map(([code, lbl]) =>
          h('button', {
            type: 'button',
            className: 'v1-seg-btn' + (V1.filters.status === code ? ' active' : ''),
            onClick: () => { V1.filters.status = code; renderApp(); },
          }, lbl)
        )
      ),
      h('div', { className: 'v1-chips', style: { width: '100%' } },
        themes.map(th =>
          h('button', {
            type: 'button',
            className: 'v1-chip' + (V1.filters.axis === th.code ? ' active' : ''),
            onClick: async () => { V1.filters.axis = th.code; await loadBootstrap(); renderApp(); },
          }, th.label)
        )
      )
    ),
    /* Task Cards List */
    h('div', { className: 'v1-task-list' },
      tasks.map(t => {
        const isDone = t.completion_pct >= 100;
        const needsFix = t.status === 'NEEDS_CORRECTION';
        const hasLocalDraft = !!localStorage.getItem('apse-v1-draft-' + t.id);
        return h('article', { className: 'v1-task-card' },
          h('div', { className: 'v1-task-left' },
            h('div', { className: 'v1-task-check' + (isDone ? ' done' : (needsFix ? ' warn' : '')) },
              isDone ? '✓' : (needsFix ? '!' : '')
            ),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h3', { className: 'v1-task-title' },
                localize(t.titles),
                t.is_sensitive ? h('span', { className: 'v1-badge LOW', style: { marginLeft: '8px' } }, 'Confidential') : null,
                hasLocalDraft ? h('span', { className: 'v1-badge GOOD', style: { marginLeft: '8px' } }, 'Saved Draft') : null
              ),
              h('div', { className: 'v1-task-meta' },
                h('span', {}, `📍 ${t.parish_name} Parish`),
                h('span', {}, `· 📅 Due: ${t.due_date} (${t.pastoral_quarter})`),
                h('span', {}, `· 🎯 ${localize(t.axis_labels)}`),
                t.frequency > 1 ? h('span', {}, `· 🔄 Quarterly (${t.quarters_completed} of ${t.frequency} logged)`) : null
              ),
              h('div', { className: 'v1-progress-wrap' },
                h('div', { className: 'v1-progress-bar' },
                  h('div', { className: 'v1-progress-fill', style: { width: `${t.completion_pct}%` } })
                ),
                h('span', { style: { fontSize: '12px', fontWeight: '700' } },
                  `Action: ${t.completion_pct}% (${t.completed_units}/${t.planned_target} ${t.unit_label})`
                ),
                h('span', { className: 'v1-badge ' + t.impact_rating }, L('impact_' + t.impact_rating))
              )
            )
          ),
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
            needsFix
              ? h('button', {
                  type: 'button',
                  className: 'v1-btn v1-btn-sensitive',
                  onClick: () => openWizardForTask(t, t.latest_log, t.latest_log?.payload?.correction_step || 1),
                }, L('fix_step', t.latest_log?.payload?.correction_step || 1))
              : h('button', {
                  type: 'button',
                  className: 'v1-btn' + (isDone ? ' v1-btn-secondary' : ''),
                  onClick: () => openWizardForTask(t, t.latest_log),
                }, isDone ? L('view_summary') : L('log_progress'))
          )
        );
      })
    )
  );
}

/* WORKSPACE 2: Review & Approvals (Streamlined 3-Tier Flow) */
function renderApprovalsWorkspace() {
  const logs = (V1.data?.logs || []).filter(l => {
    if (l.parent_id) return false;
    if (V1.filters.approvalStage !== 'ALL' && l.stage !== V1.filters.approvalStage) return false;
    if (V1.searchQuery) {
      const q = V1.searchQuery.toLowerCase();
      if (!`${localize(l.task_titles)} ${l.parish_name} ${l.centrale}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stageLabelMap = {
    SUBMITTED: L('stage_submitted'),
    PARISH_APPROVED: L('stage_parish'),
    DIOCESE_APPROVED: L('stage_diocese'),
    CORRECTION: L('stage_correction'),
  };

  return h('div', {},
    h('div', { className: 'v1-page-header' },
      h('div', {},
        h('h1', { className: 'v1-page-title' }, L('nav_approvals')),
        h('p', { className: 'v1-page-subtitle' },
          'Streamlined 3-Tier Verification: Field Submission → Parish Approval (CPJP) → Diocese Final Approval (CDJP).'
        )
      )
    ),
    h('div', { className: 'v1-context-filters' },
      h('div', { className: 'v1-segmented' },
        [
          ['ALL', 'All Submissions'],
          ['SUBMITTED', L('stage_submitted')],
          ['PARISH_APPROVED', L('stage_parish')],
          ['DIOCESE_APPROVED', L('stage_diocese')],
          ['CORRECTION', L('stage_correction')],
        ].map(([code, lbl]) =>
          h('button', {
            type: 'button',
            className: 'v1-seg-btn' + (V1.filters.approvalStage === code ? ' active' : ''),
            onClick: () => { V1.filters.approvalStage = code; renderApp(); },
          }, lbl)
        )
      )
    ),
    h('div', { className: 'v1-task-list' },
      logs.map(l =>
        h('article', { className: 'v1-panel', style: { marginBottom: '4px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' } },
            h('div', {},
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
                h('span', { className: 'v1-badge ' + (l.stage === 'DIOCESE_APPROVED' ? 'GREAT' : (l.stage === 'CORRECTION' ? 'LOW' : 'GOOD')) },
                  stageLabelMap[l.stage] || l.stage
                ),
                h('span', { className: 'v1-badge ' + l.impact_rating }, L('impact_' + l.impact_rating)),
                h('span', { style: { fontSize: '13px', color: 'var(--ink-secondary)' } },
                  `📍 ${l.parish_name} · ${l.centrale} · 📅 ${l.event_date} (${l.pastoral_quarter})`
                )
              ),
              h('h3', { style: { margin: '4px 0 8px', fontSize: '17px' } }, localize(l.task_titles)),
              h('div', { style: { fontSize: '14px', color: 'var(--ink-secondary)' } },
                `Participants: ${l.total} Total (${l.women} Women, ${l.men} Men, ${l.disability} with Disabilities) · Outcome Achieved: ${l.outcome_value} (Target: ${l.target_threshold})`
              ),
              l.issue_severity !== 'NONE'
                ? h('div', { style: { marginTop: '8px', padding: '8px 12px', background: 'var(--warn-bg)', color: 'var(--warn-ink)', borderRadius: '6px', fontSize: '13px' } },
                    `⚠ Field Issue (${l.issue_severity} — ${l.issue_categories.join(', ')}): ${l.issue_note}`
                  )
                : null
            ),
            h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              l.stage === 'SUBMITTED'
                ? h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-sm',
                    onClick: async () => {
                      await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'PARISH_APPROVED', note: 'Verified by Parish CPJP Reviewer' });
                      await loadBootstrap();
                      renderApp();
                    },
                  }, '✓ Approve (Parish CPJP)')
                : null,
              l.stage in { SUBMITTED: 1, PARISH_APPROVED: 1 }
                ? h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-sm',
                    onClick: async () => {
                      await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'DIOCESE_APPROVED', note: 'Finalized by CDJP Diocese' });
                      await loadBootstrap();
                      renderApp();
                    },
                  }, '✓✓ Final Approve (Diocese)')
                : null,
              l.stage !== 'DIOCESE_APPROVED'
                ? h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-secondary v1-btn-sm',
                    onClick: async () => {
                      const stepStr = prompt('Which step needs fixing? Enter 1 (When/Where), 2 (Attendance), or 3 (Outcome/Issues):', '2');
                      if (!stepStr) return;
                      const note = prompt('Write a short, clear instruction for the field reporter:', 'Please verify the age group numbers and attach the attendance sheet.');
                      if (!note) return;
                      await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'CORRECTION', correction_step: Number(stepStr) || 2, note });
                      await loadBootstrap();
                      renderApp();
                    },
                  }, '↩ Return for Correction')
                : null
            )
          )
        )
      )
    )
  );
}

/* WORKSPACE 3: Impact & Analytics (Outcome Accordions, Regional Parish Map & Issue Trends) */
function renderAnalyticsWorkspace() {
  const analytics = V1.data?.analytics || { summary: {}, accordions: [], parish_map: [], monthly_trends: [] };
  const s = analytics.summary || {};

  return h('div', {},
    h('div', { className: 'v1-page-header' },
      h('div', {},
        h('h1', { className: 'v1-page-title' }, L('nav_analytics')),
        h('p', { className: 'v1-page-subtitle' },
          'Action Completion vs. Threshold-Based Impact Ratings, Regional Parish Map, and Field Bottleneck Trends.'
        )
      )
    ),
    /* Contextual Filter Bar */
    h('div', { className: 'v1-context-filters' },
      h('div', { className: 'v1-segmented' },
        [
          ['ALL', L('period_all')],
          ['Q1', L('period_q1')],
          ['AP1', L('period_ap1')],
        ].map(([code, lbl]) =>
          h('button', {
            type: 'button',
            className: 'v1-seg-btn' + (V1.filters.period === code ? ' active' : ''),
            onClick: async () => { V1.filters.period = code; await loadBootstrap(); renderApp(); },
          }, lbl)
        )
      ),
      renderParishCombobox(V1.filters.parish, async code => {
        V1.filters.parish = code;
        await loadBootstrap();
        renderApp();
      }, true)
    ),
    /* Bottleneck Insight Banner */
    s.top_bottleneck_category
      ? h('div', { style: { background: 'var(--warn-bg)', color: 'var(--warn-ink)', padding: '14px 18px', borderRadius: '10px', marginBottom: '18px', fontWeight: '700' } },
          `⚡ Field Bottleneck Insight: ${s.top_bottleneck_pct}% of reported field delays this period involved "${s.top_bottleneck_category}" challenges.`
        )
      : null,
    /* Top KPI Strip */
    h('div', { className: 'v1-kpi-grid' },
      h('div', { className: 'v1-kpi-card' },
        h('span', {}, 'Average Action Completion'),
        h('strong', {}, `${s.avg_completion_pct ?? 0}%`),
        h('div', { style: { fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' } },
          `${s.tasks_completed ?? 0} of ${s.tasks_total ?? 0} planned actions completed`
        )
      ),
      h('div', { className: 'v1-kpi-card' },
        h('span', {}, 'Total Participants Reached'),
        h('strong', {}, Number(s.total_participants || 0).toLocaleString()),
        h('div', { style: { fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' } },
          `${s.women || 0} Women · ${s.men || 0} Men · ${s.disability || 0} with Disabilities`
        )
      ),
      h('div', { className: 'v1-kpi-card' },
        h('span', {}, 'Outcome Impact Quality'),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' } },
          h('span', { className: 'v1-badge GREAT' }, `${s.impact_counts?.GREAT || 0} Great`),
          h('span', { className: 'v1-badge GOOD' }, `${s.impact_counts?.GOOD || 0} Good`),
          h('span', { className: 'v1-badge LOW' }, `${s.impact_counts?.LOW || 0} Low`)
        )
      ),
      h('div', { className: 'v1-kpi-card' },
        h('span', {}, 'Pending Approvals'),
        h('strong', {}, String(s.pending_approvals || 0)),
        h('div', { style: { fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' } }, 'Reports awaiting Parish or Diocese sign-off')
      )
    ),
    /* Split Grid: Interactive Regional Parish Map + Monthly Issue Trends Chart */
    h('div', { className: 'v1-analytics-split' },
      /* Regional Parish SVG Map */
      h('div', { className: 'v1-panel' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
          h('h3', { style: { margin: 0 } }, 'Diocese of Butare — Regional Parish Map'),
          h('span', { style: { fontSize: '12px', color: 'var(--ink-secondary)' } }, 'Click any Parish node to filter')
        ),
        (() => {
          const svgNS = 'http://www.w3.org/2000/svg';
          const svg = document.createElementNS(svgNS, 'svg');
          svg.setAttribute('viewBox', '0 0 100 92');
          svg.style.width = '100%';
          svg.style.height = '240px';
          svg.style.background = 'var(--bg-subtle)';
          svg.style.borderRadius = '8px';

          const regions = [
            { label: 'NYANZA', x: 46, y: 12 },
            { label: 'HUYE', x: 42, y: 45 },
            { label: 'GISAGARA', x: 70, y: 50 },
            { label: 'NYARUGURU', x: 22, y: 68 },
          ];
          for (const reg of regions) {
            const txt = document.createElementNS(svgNS, 'text');
            txt.setAttribute('x', String(reg.x));
            txt.setAttribute('y', String(reg.y));
            txt.setAttribute('fill', 'var(--ink-muted)');
            txt.setAttribute('font-size', '3.5');
            txt.setAttribute('font-weight', '800');
            txt.setAttribute('opacity', '0.45');
            txt.textContent = reg.label;
            svg.appendChild(txt);
          }

          for (const p of analytics.parish_map || []) {
            const g = document.createElementNS(svgNS, 'g');
            g.style.cursor = 'pointer';
            g.addEventListener('click', async () => {
              V1.filters.parish = V1.filters.parish === p.code ? '' : p.code;
              await loadBootstrap();
              renderApp();
            });
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', String(p.x));
            circle.setAttribute('cy', String(p.y));
            circle.setAttribute('r', V1.filters.parish === p.code ? '3.4' : '2.4');
            const fill = p.status_color === 'red' ? '#dc2626' : (p.status_color === 'green' ? '#16a34a' : (p.status_color === 'amber' ? '#d97706' : '#64748b'));
            circle.setAttribute('fill', fill);
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '0.7');
            const title = document.createElementNS(svgNS, 'title');
            title.textContent = `${p.name} (${p.district}): ${p.completion_pct ?? 0}% complete · ${p.participants} participants`;
            g.appendChild(title);
            g.appendChild(circle);

            if (p.tasks_count > 0 || V1.filters.parish === p.code) {
              const label = document.createElementNS(svgNS, 'text');
              label.setAttribute('x', String(p.x + 3));
              label.setAttribute('y', String(p.y + 1));
              label.setAttribute('fill', 'var(--ink-primary)');
              label.setAttribute('font-size', '2.8');
              label.setAttribute('font-weight', '700');
              label.textContent = p.name.split(' ')[0];
              g.appendChild(label);
            }
            svg.appendChild(g);
          }
          return svg;
        })(),
        h('div', { style: { display: 'flex', gap: '14px', fontSize: '12px', marginTop: '10px', flexWrap: 'wrap' } },
          h('span', {}, '🟢 ≥80% Action Complete'),
          h('span', {}, '🟠 In Progress (<80%)'),
          h('span', {}, '🔴 Active Major Field Issue'),
          h('span', {}, '⚪ No Active Tasks Logged')
        )
      ),
      /* Issue Trends Stacked Bar Chart */
      h('div', { className: 'v1-panel' },
        h('h3', {}, 'Field Issues & Bottlenecks Over Time'),
        h('div', { className: 'v1-chips', style: { marginBottom: '10px' } },
          ['ALL', ...(V1.data?.issue_categories || [])].map(cat =>
            h('button', {
              type: 'button',
              className: 'v1-chip' + (V1.filters.issueCategory === cat ? ' active' : ''),
              style: { padding: '4px 10px', minHeight: '28px', fontSize: '12px' },
              onClick: () => { V1.filters.issueCategory = cat; renderApp(); },
            }, cat === 'ALL' ? 'All Categories' : cat)
          )
        ),
        h('div', { className: 'v1-bar-chart' },
          (analytics.monthly_trends || []).map(m => {
            const catFilter = V1.filters.issueCategory;
            const total = catFilter === 'ALL'
              ? (m.MINOR + m.MEDIUM + m.MAJOR)
              : (m.by_category?.[catFilter] || 0);
            const hMinor = catFilter === 'ALL' ? m.MINOR * 28 : total * 14;
            const hMed = catFilter === 'ALL' ? m.MEDIUM * 28 : total * 14;
            const hMaj = catFilter === 'ALL' ? m.MAJOR * 28 : total * 14;
            return h('div', { className: 'v1-bar-col' },
              h('span', { style: { fontSize: '11px', fontWeight: '700', marginBottom: '4px' } }, total ? String(total) : ''),
              h('div', { className: 'v1-bar-stack' },
                h('div', { style: { height: `${hMinor}px`, background: '#93c5fd' }, title: `Minor: ${m.MINOR}` }),
                h('div', { style: { height: `${hMed}px`, background: '#f59e0b' }, title: `Medium: ${m.MEDIUM}` }),
                h('div', { style: { height: `${hMaj}px`, background: '#dc2626' }, title: `Major: ${m.MAJOR}` })
              ),
              h('span', { style: { fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '6px' } }, m.month)
            );
          })
        ),
        h('div', { style: { display: 'flex', gap: '14px', fontSize: '12px', marginTop: '10px' } },
          h('span', {}, '🟦 Minor Issue'),
          h('span', {}, '🟧 Medium Delay'),
          h('span', {}, '🟥 Major Bottleneck')
        )
      )
    ),
    /* Expandable Outcome & Impact Accordions */
    h('h2', { style: { fontSize: '19px', marginBottom: '12px' } },
      'Strategic Outcomes & Impact Accordions (Click to Expand Actions, Stories & Issues)'
    ),
    (analytics.accordions || []).map((acc, idx) =>
      h('details', { className: 'v1-accordion', open: idx === 0 },
        h('summary', {},
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: '12px', color: 'var(--brand-primary)', fontWeight: '800', textTransform: 'uppercase' } },
              localize(acc.axis_labels)
            ),
            h('div', { style: { fontSize: '16px', marginTop: '2px' } }, localize(acc.labels))
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
            h('div', { style: { width: '140px' } },
              h('div', { style: { fontSize: '12px', marginBottom: '4px' } }, `Actions: ${acc.completion_pct}%`),
              h('div', { className: 'v1-progress-bar' },
                h('div', { className: 'v1-progress-fill', style: { width: `${acc.completion_pct}%` } })
              )
            ),
            h('span', { className: 'v1-badge ' + acc.impact_rating }, L('impact_' + acc.impact_rating))
          )
        ),
        h('div', { className: 'v1-accordion-body' },
          h('h4', { style: { margin: '0 0 8px' } }, '1. Underlying Parish Actions'),
          acc.tasks.map(t =>
            h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '6px', marginBottom: '6px' } },
              h('span', { style: { fontWeight: '600' } }, `${localize(t.titles)} (${t.parish_name})`),
              h('span', {}, `${t.completed_units}/${t.planned_target} ${t.unit_label} (${t.completion_pct}%) · ${L('impact_' + t.impact_rating)}`)
            )
          ),
          acc.stories.length || acc.documents.length
            ? h('div', { style: { marginTop: '12px' } },
                h('h4', { style: { margin: '0 0 6px' } }, '2. Stories of Change & Attached Impact Evidence'),
                acc.stories.map(st =>
                  h('p', { style: { margin: '4px 0', fontSize: '13px', fontStyle: 'italic' } }, `"${st.text}" — ${st.parish} (${st.date})`)
                ),
                h('div', { className: 'v1-chips', style: { marginTop: '6px' } },
                  acc.documents.map(doc => h('span', { className: 'v1-badge GOOD' }, `📄 ${doc.name} (${doc.parish})`))
                )
              )
            : null,
          acc.issues.length
            ? h('div', { style: { marginTop: '12px' } },
                h('h4', { style: { margin: '0 0 6px', color: 'var(--warn-ink)' } }, '3. Under-Achievement Explanations & Field Issues'),
                acc.issues.map(iss =>
                  h('div', { style: { padding: '8px 12px', background: 'var(--warn-bg)', color: 'var(--warn-ink)', borderRadius: '6px', fontSize: '13px', marginBottom: '6px' } },
                    `${iss.parish} (${iss.severity} · ${iss.categories.join(', ')}): ${iss.note}`
                  )
                )
              )
            : null
        )
      )
    )
  );
}

/* WORKSPACE 4: Reports & Guided Data Transfer */
function renderExportsWorkspace() {
  const eo = V1.exportOptions;
  const reportTypes = [
    { code: 'impact_summary', title: L('strategy_report'), desc: 'Complete outcomes, participant disaggregation, and impact ratings across parishes.' },
    { code: 'parish_activities', title: 'Parish Activity & Attendance Report', desc: 'Detailed log of completed parish and centrale sessions with women/men/age counts.' },
    { code: 'field_challenges', title: 'Field Challenges & Bottlenecks Summary', desc: 'Aggregated Minor, Medium, and Major field delays with qualitative explanations.' },
  ];

  return h('div', {},
    h('div', { className: 'v1-page-header' },
      h('div', {},
        h('h1', { className: 'v1-page-title' }, L('nav_exports')),
        h('p', { className: 'v1-page-subtitle' },
          'One-click Word, Excel, CSV, and PDF exports with customizable column presets and guided spreadsheet import.'
        )
      )
    ),
    h('div', { className: 'v1-analytics-split' },
      /* Left Panel: One-Click Export Builder */
      h('div', { className: 'v1-panel' },
        h('h3', {}, '1. Export Clean Reports & Data'),
        h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '8px' } }, 'Choose Report Type:'),
        h('div', { className: 'v1-radio-cards', style: { gridTemplateColumns: '1fr' } },
          reportTypes.map(rt =>
            h('button', {
              type: 'button',
              className: 'v1-radio-card' + (eo.reportType === rt.code ? ' active' : ''),
              onClick: () => { eo.reportType = rt.code; renderApp(); },
            },
              h('strong', {}, rt.title),
              h('span', {}, rt.desc)
            )
          )
        ),
        h('div', { style: { marginBottom: '16px' } },
          h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'File Format:'),
          h('div', { className: 'v1-segmented' },
            [
              ['xlsx', 'Excel (.XLSX)'],
              ['docx', 'Word (.DOCX)'],
              ['csv', 'Spreadsheet (.CSV)'],
              ['pdf', 'Print / PDF'],
            ].map(([fmt, lbl]) =>
              h('button', {
                type: 'button',
                className: 'v1-seg-btn' + (eo.format === fmt ? ' active' : ''),
                onClick: () => { eo.format = fmt; renderApp(); },
              }, lbl)
            )
          )
        ),
        h('div', { style: { marginBottom: '20px' } },
          h('label', { style: { fontWeight: '700', display: 'block', marginBottom: '6px' } }, 'Column Header Preset (For Excel & CSV):'),
          h('div', { className: 'v1-segmented' },
            [
              ['natural', 'Natural Plain Labels'],
              ['donor', 'Partner / Donor Template'],
              ['dhis2', 'DHIS2 Mirror Preset'],
            ].map(([pr, lbl]) =>
              h('button', {
                type: 'button',
                className: 'v1-seg-btn' + (eo.preset === pr ? ' active' : ''),
                onClick: () => { eo.preset = pr; renderApp(); },
              }, lbl)
            )
          )
        ),
        h('button', {
          type: 'button',
          className: 'v1-btn',
          onClick: () => {
            if (eo.format === 'pdf') {
              window.print();
              return;
            }
            const q = new URLSearchParams({
              type: eo.reportType,
              format: eo.format,
              preset: eo.preset,
              language: V1.lang,
            });
            if (V1.filters.parish) q.set('parish', V1.filters.parish);
            window.location.href = '/apse-service/v1/export?' + q.toString();
          },
        }, '⬇ Download Report Now')
      ),
      /* Right Panel: Guided Bulk CSV Import */
      h('div', { className: 'v1-panel' },
        h('h3', {}, '2. Guided Bulk Spreadsheet Import (CSV)'),
        h('p', { style: { fontSize: '13px', color: 'var(--ink-secondary)', marginTop: 0 } },
          'Upload a CSV file from field enumerators. If any column name is different, the system asks you which column to use in plain language.'
        ),
        h('input', {
          type: 'file',
          accept: '.csv',
          style: { marginBottom: '14px' },
          onChange: async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const csvText = await file.text();
            try {
              const res = await apiV1('/v1/import', 'POST', { csv_text: csvText, commit: false });
              V1.csvImportState = { csvText, ...res, mapping: res.mapping || {}, message: '' };
              renderApp();
            } catch (err) {
              V1.csvImportState = { error: err.message };
              renderApp();
            }
          },
        }),
        V1.csvImportState?.error ? h('div', { className: 'v1-error-alert' }, V1.csvImportState.error) : null,
        V1.csvImportState && !V1.csvImportState.error
          ? h('div', {},
              V1.csvImportState.missing?.length
                ? h('div', {},
                    V1.csvImportState.missing.map(m =>
                      h('div', { className: 'v1-error-alert' },
                        h('div', { style: { marginBottom: '6px' } }, m.message),
                        h('select', {
                          className: 'v1-step-input',
                          style: { height: '34px', fontSize: '13px' },
                          onChange: async ev => {
                            V1.csvImportState.mapping[m.key] = ev.target.value;
                            const updated = await apiV1('/v1/import', 'POST', {
                              csv_text: V1.csvImportState.csvText,
                              mapping: V1.csvImportState.mapping,
                              commit: false,
                            });
                            Object.assign(V1.csvImportState, updated);
                            renderApp();
                          },
                        },
                          h('option', { value: '' }, 'Select matching column from your file...'),
                          V1.csvImportState.headers.map(hdr => h('option', { value: hdr }, hdr))
                        )
                      )
                    )
                  )
                : h('div', {},
                    h('p', { style: { fontWeight: '700', color: 'var(--impact-great-ink)' } },
                      `✓ All columns matched (${V1.csvImportState.total_rows} rows ready).`
                    ),
                    h('button', {
                      type: 'button',
                      className: 'v1-btn',
                      onClick: async () => {
                        const res = await apiV1('/v1/import', 'POST', {
                          csv_text: V1.csvImportState.csvText,
                          mapping: V1.csvImportState.mapping,
                          commit: true,
                        });
                        V1.csvImportState.message = `✓ Imported ${res.imported} activity logs into your queue.`;
                        await loadBootstrap();
                        renderApp();
                      },
                    }, 'Import All Rows Now')
                  ),
              V1.csvImportState.message
                ? h('div', { className: 'v1-total-banner', style: { marginTop: '12px' } }, V1.csvImportState.message)
                : null
            )
          : null
      )
    )
  );
}

/* Master App Shell Renderer */
function renderApp() {
  document.documentElement.lang = V1.lang;
  document.documentElement.dataset.theme = V1.theme;
  document.body.className = 'v1-body';

  const pendingTasksCount = (V1.data?.tasks || []).filter(t => t.completion_pct < 100).length;
  const pendingApprovalsCount = V1.data?.analytics?.summary?.pending_approvals || 0;
  const qLen = V1.offlineQueue.length;

  let syncClass = 'v1-sync-pill synced';
  let syncText = '🟢 ' + L('sync_synced');
  if (V1.syncingState) {
    syncClass = 'v1-sync-pill syncing';
    syncText = '🔵 ' + L('sync_updating', V1.syncingState.current, V1.syncingState.total);
  } else if (qLen > 0 || V1.simulateOffline) {
    syncClass = 'v1-sync-pill offline';
    syncText = '🟡 ' + L('sync_offline', qLen);
  }

  const navItems = [
    { id: 'tasks', icon: '☑', label: L('nav_tasks'), badge: pendingTasksCount },
    { id: 'approvals', icon: '✓', label: L('nav_approvals'), badge: pendingApprovalsCount },
    { id: 'analytics', icon: '📊', label: L('nav_analytics'), badge: null },
    { id: 'exports', icon: '⬇', label: L('nav_exports'), badge: null },
  ];

  const shell = h('div', {},
    /* Single 56px Top Bar */
    h('header', { className: 'v1-topbar' },
      h('div', { className: 'v1-brand' },
        h('span', { className: 'v1-brand-badge' }, 'CDJP BUTARE'),
        h('span', { className: 'v1-brand-text' }, 'APSE')
      ),
      h('div', { className: 'v1-search-wrap' },
        h('span', { className: 'v1-search-icon' }, '🔍'),
        h('input', {
          type: 'search',
          className: 'v1-search-input',
          placeholder: L('search_placeholder'),
          value: V1.searchQuery,
          onInput: e => {
            V1.searchQuery = e.target.value;
            renderApp();
          },
        })
      ),
      h('div', { className: 'v1-topbar-right' },
        h('button', {
          type: 'button',
          className: syncClass,
          title: qLen > 0 ? 'Click to synchronize queued offline records now' : 'Click to toggle offline mode simulation',
          onClick: () => {
            if (qLen > 0) {
              syncOfflineQueue();
            } else {
              V1.simulateOffline = !V1.simulateOffline;
              renderApp();
            }
          },
        }, syncText),
        h('div', { className: 'v1-lang-pills', role: 'group', 'aria-label': 'Language' },
          ['rw', 'fr', 'en', 'sw'].map(code =>
            h('button', {
              type: 'button',
              className: 'v1-lang-btn' + (V1.lang === code ? ' active' : ''),
              onClick: () => {
                V1.lang = code;
                localStorage.setItem('apse-v1-lang', code);
                renderApp();
              },
            }, code.toUpperCase())
          )
        ),
        h('span', { className: 'v1-user-pill' }, `👤 ${V1.data?.user?.name || 'LOCAL_MEL'}`)
      )
    ),
    /* Main Shell: Left Navigation (220px) + Main Workspace Canvas */
    h('div', { className: 'v1-shell' },
      h('aside', { className: 'v1-sidebar' },
        navItems.map(item =>
          h('button', {
            type: 'button',
            className: 'v1-nav-item' + (V1.workspace === item.id && !V1.wizard ? ' active' : ''),
            onClick: () => {
              V1.wizard = null;
              V1.workspace = item.id;
              renderApp();
            },
          },
            h('span', { className: 'v1-nav-label' },
              h('span', {}, item.icon),
              h('span', {}, item.label)
            ),
            item.badge ? h('span', { className: 'v1-nav-badge' }, String(item.badge)) : null
          )
        ),
        h('div', { className: 'v1-nav-divider' }),
        h('button', {
          type: 'button',
          className: 'v1-nav-item',
          onClick: () => {
            const sens = (V1.data?.tasks || []).find(t => t.is_sensitive) || V1.data?.tasks?.[0];
            if (sens) {
              V1.workspace = 'tasks';
              openWizardForTask(sens);
            }
          },
        },
          h('span', { className: 'v1-nav-label' }, h('span', {}, '🔒'), h('span', {}, L('nav_confidential')))
        ),
        h('div', { className: 'v1-sidebar-footer' },
          h('label', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--ink-secondary)' } }, 'Display Theme'),
          h('div', { className: 'v1-segmented', style: { width: '100%' } },
            [
              ['cdjp', 'CDJP'],
              ['light', 'Light'],
              ['soft', 'Soft'],
              ['dark', 'Dark'],
            ].map(([th, lbl]) =>
              h('button', {
                type: 'button',
                className: 'v1-seg-btn' + (V1.theme === th ? ' active' : ''),
                style: { flex: 1, padding: '4px 6px', fontSize: '11px' },
                onClick: () => {
                  V1.theme = th;
                  localStorage.setItem('apse-theme', th);
                  renderApp();
                },
              }, lbl)
            )
          )
        )
      ),
      h('main', { className: 'v1-canvas' },
        V1.workspace === 'tasks'
          ? renderTasksWorkspace()
          : V1.workspace === 'approvals'
          ? renderApprovalsWorkspace()
          : V1.workspace === 'analytics'
          ? renderAnalyticsWorkspace()
          : renderExportsWorkspace()
      )
    ),
    /* Mobile 4-Tab Bottom Navigation Bar (360px - 1023px) */
    h('nav', { className: 'v1-bottom-nav', 'aria-label': 'Mobile Workspace Navigation' },
      navItems.map(item =>
        h('button', {
          type: 'button',
          className: 'v1-bottom-btn' + (V1.workspace === item.id ? ' active' : ''),
          onClick: () => {
            V1.wizard = null;
            V1.workspace = item.id;
            renderApp();
          },
        },
          h('span', { style: { fontSize: '16px' } }, item.icon),
          h('span', {}, item.label)
        )
      )
    )
  );

  const root = document.getElementById('v1_root') || document.body;
  root.replaceChildren(shell);
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadBootstrap();
    renderApp();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:32px;font-family:sans-serif"><h2>APSE Service Starting...</h2><p>${err.message}</p></div>`;
  }
});

