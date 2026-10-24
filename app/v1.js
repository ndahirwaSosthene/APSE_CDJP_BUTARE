'use strict';
/* ==========================================================================
   APSE v1.0 Unified Design System Frontend
   - IBM Carbon Desktop Grid (16-col), Breadcrumbs, Forms & Data Viz
   - Atlassian Typography (Inter + IBM Plex Mono tabular-nums) & Light/Dark Themes
   - Neutral Badges (--bg-badge) with 8px Circular Status Dots (--dot-*)
   - Neutral Outline Buttons (.btn-outline) & Neutral Issue Callout Boxes
   - Red (--color-error) Restricted Strictly to Form Validation Blockers
   - Material Symbols Outlined Iconography (16px / 20px / 24px)
   - Shopify Polaris Resource Cards & Cisco Momentum Slide-Up Bottom Sheets (< 768px)
   ========================================================================== */

const V1 = {
  lang: localStorage.getItem('apse-v1-lang') || 'en',
  theme: localStorage.getItem('apse-theme') || 'light',
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
  mobileSheet: null, // null | 'filters' | 'location'
  exportOptions: {
    reportType: 'impact_summary',
    format: 'xlsx',
    preset: 'natural',
  },
  csvImportState: null,
};

/* Section 4: Material Symbols Outlined Vector Paths (weight: 400, grade: 0, 24x24 viewBox) */
const MATERIAL_SYMBOLS = {
  check_box: 'M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21H5Zm0-2h14V5H5v14Zm5.6-2.8 7.05-7.05-1.4-1.4-5.65 5.65-2.85-2.85-1.4 1.4 4.25 4.25Z',
  assignment: 'M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h4.2q.325-.9 1.088-1.45T12 1q.95 0 1.713.55T14.8 3H19q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21H5Zm0-2h14V5H5v14Zm2-2h7v-2H7v2Zm0-4h10v-2H7v2Zm0-4h10V7H7v2Zm5-4.75q.325 0 .538-.213t.212-.537q0-.325-.212-.537T12 2.75q-.325 0-.537.213T11.25 3.5q0 .325.213.537T12 4.25Z',
  fact_check: 'M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20H4Zm0-2h16V6H4v12Zm1.5-3h5v-2h-5v2Zm0-4h5V9h-5v2Zm0-4h5V5h-5v2Zm9.35 8 4.25-4.25-1.4-1.425-2.85 2.85-1.425-1.425-1.4 1.425L14.85 15Z',
  insights: 'm3.5 18.5-1.5-1.5 6-6 4 4 8.5-9.5 1.5 1.35L12 18l-4-4-4.5 4.5ZM19 9l-.95-2.05L16 6l2.05-.95L19 3l.95 2.05L22 6l-2.05.95L19 9ZM6 11l-.65-1.35L4 9l1.35-.65L6 7l.65 1.35L8 9l-1.35.65L6 11Z',
  monitoring: 'M3 21v-2l2-2v4H3Zm4 0v-6l2-2v8H7Zm4 0v-8l2 2.025V21h-2Zm4 0v-5.975l2-2V21h-2Zm4 0V11l2-2v12h-2ZM3 15.825V13l7-7 4 4 7-7v2.825l-7 7-4-4-7 7Z',
  download: 'M12 16 7 11l1.4-1.45 2.6 2.6V4h2v8.15l2.6-2.6L17 11l-5 5Zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20H6Z',
  upload_file: 'M11 18h2v-4.175l1.6 1.6L16 14l-4-4-4 4 1.425 1.4L11 13.825V18ZM6 22q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h8l6 6v12q0 .825-.587 1.413T18 22H6Zm7-13V4H6v16h12V9h-5Z',
  cloud_done: 'm10.6 16.2 5.65-5.65-1.425-1.425-4.225 4.225-2.1-2.1L7.075 12.675 10.6 16.2ZM6.5 20q-2.275 0-3.887-1.575T1 14.575q0-1.95 1.175-3.475T5.25 9.15q.625-2.3 2.5-3.725T12 4q2.925 0 4.963 2.038T19 11q1.725.2 2.863 1.488T23 15.5q0 1.875-1.312 3.188T18.5 20H6.5Z',
  sync: 'M4 20v-2h2.75l-.4-.35q-1.3-1.15-1.825-2.625T4 12.05q0-2.775 1.663-4.938T10 4.25v2.1Q8.2 7 7.1 8.563T6 12.05q0 1.125.425 2.188T7.75 16.2l.25.25V14h2v6H4Zm10-.25v-2.1q1.8-.65 2.9-2.212T18 11.95q0-1.125-.425-2.187T16.25 7.8L16 7.55V10h-2V4h6v2h-2.75l.4.35q1.225 1.225 1.788 2.663T20 11.95q0 2.775-1.662 4.938T14 19.75Z',
  cloud_off: 'm19.9 22.6-3.15-3.15H6.5q-2.275 0-3.887-1.575T1 14.025q0-1.85 1.1-3.325T4.925 8.8L1.4 5.275 2.8 3.85l18.5 18.5-1.4 1.25ZM6.5 17.45h8.25L6.8 9.5q-1.6.175-2.7 1.35T3 13.75q0 1.55 1.075 2.625T6.5 17.45Zm14.95-.625-1.45-1.45q.5-.375.75-.913t.25-1.212q0-1.05-.725-1.775T18.5 10.75H17v-1.5q0-2.075-1.463-3.537T12 4.25q-.95 0-1.787.35T8.75 5.65L7.3 4.2q1.025-.9 2.263-1.375T12 2.35q2.725 0 4.688 1.813T18.95 8.75q1.725.15 2.888 1.4T23 13.25q0 1.075-.413 2.025t-1.137 1.55Z',
  info: 'M11 17h2v-6h-2v6Zm1-8q.425 0 .713-.288T13 8q0-.425-.288-.712T12 7q-.425 0-.712.288T11 8q0 .425.288.713T12 9Zm0 13q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-3.35-2.325-5.675T12 4Q8.65 4 6.325 6.325T4 12q0 3.35 2.325 5.675T12 20Z',
  warning: 'M1 21 12 2l11 19H1Zm3.45-2h15.1L12 6 4.45 19ZM12 18q.425 0 .713-.288T13 17q0-.425-.288-.712T12 16q-.425 0-.712.288T11 17q0 .425.288.713T12 18Zm-1-3h2v-5h-2v5Z',
  error: 'M12 17q.425 0 .713-.288T13 16q0-.425-.288-.712T12 15q-.425 0-.712.288T11 16q0 .425.288.713T12 17Zm-1-4h2V7h-2v6Zm1 9q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-3.35-2.325-5.675T12 4Q8.65 4 6.325 6.325T4 12q0 3.35 2.325 5.675T12 20Z',
  search: 'M19.6 21 13.3 14.7q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5q0-2.725 1.888-4.612T9.5 3q2.725 0 4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3-1.4 1.4ZM9.5 14q1.875 0 3.188-1.312T14 9.5q0-1.875-1.312-3.187T9.5 5Q7.625 5 6.313 6.313T5 9.5q0 1.875 1.313 3.188T9.5 14Z',
  calendar_today: 'M5 22q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V2h2v2h8V2h2v2h1q.825 0 1.413.588T21 6v14q0 .825-.587 1.413T19 22H5Zm0-2h14V10H5v10ZM5 8h14V6H5v2Z',
  filter_list: 'M10 18v-2h4v2h-4Zm-4-5v-2h12v2H6ZM3 8V6h18v2H3Z',
  chevron_right: 'M12.6 12 8 7.4 9.4 6l6 6-6 6L8 16.6l4.6-4.6Z',
  chevron_left: 'm14 18-6-6 6-6 1.4 1.4-4.6 4.6 4.6 4.6L14 18Z',
  arrow_forward: 'm12 20-1.425-1.4 5.6-5.6H4v-2h12.175l-5.6-5.6L12 4l8 8-8 8Z',
  arrow_back: 'm7.825 13 5.6 5.6L12 20l-8-8 8-8 1.425 1.4-5.6 5.6H20v2H7.825Z',
  add: 'M11 13H5v-2h6V5h2v6h6v2h-6v6h-2v-6Z',
  lock: 'M6 22q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.537T12 1q2.075 0 3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22H6Zm6-5q.825 0 1.413-.587T14 15q0-.825-.587-1.412T12 13q-.825 0-1.412.588T10 15q0 .825.588 1.413T12 17ZM9 8h6V6q0-1.25-.875-2.125T12 3q-1.25 0-2.125.875T9 6v2Z',
  close: 'm6.4 19-1.4-1.4 5.6-5.6-5.6-5.6L6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19Z',
  check: 'M9.55 18 3.85 12.3l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4 9.55 18Z',
  undo: 'M7 19v-2h7.1q1.575 0 2.738-1T18 13.5q0-1.5-1.162-2.5T14.1 10H7.8l2.6 2.6L9 14 4 9l5-5 1.4 1.4L7.8 8h6.3q2.425 0 4.163 1.575T20 13.5q0 2.35-1.737 3.925T14.1 19H7Z',
  light_mode: 'M12 17q-2.075 0-3.537-1.463T7 12q0-2.075 1.463-3.537T12 7q2.075 0 3.538 1.463T17 12q0 2.075-1.462 3.538T12 17ZM2 13v-2h3v2H2Zm17 0v-2h3v2h-3ZM11 5V2h2v3h-2Zm0 17v-3h2v3h-2ZM6.4 7.8 4.25 5.65l1.4-1.4L7.8 6.4 6.4 7.8Zm12.35 12.35L16.6 18l1.4-1.4 2.15 2.15-1.4 1.4ZM16.6 6.4l2.15-2.15 1.4 1.4L18 7.8l-1.4-1.4ZM4.25 18.75 6.4 16.6l1.4 1.4-2.15 2.15-1.4-1.4Z',
  dark_mode: 'M12 21q-3.75 0-6.375-2.625T3 12q0-3.75 2.625-6.375T12 3q.35 0 .688.025t.662.075q-1.025.725-1.638 1.888T11.1 7.5q0 2.25 1.575 3.825T16.5 12.9q1.375 0 2.525-.613T20.9 10.65q.05.325.075.662T21 12q0 3.75-2.625 6.375T12 21Z',
  location_on: 'M12 12q.825 0 1.413-.587T14 10q0-.825-.587-1.412T12 8q-.825 0-1.412.588T10 10q0 .825.588 1.413T12 12Zm0 10q-4.025-3.425-6.012-6.362T4 10.2q0-3.75 2.413-5.975T12 2q3.175 0 5.588 2.225T20 10.2q0 2.5-1.987 5.438T12 22Z',
  attach_file: 'M11.5 22q-2.3 0-3.9-1.6T6 16.5V6q0-1.65 1.175-2.825T10 2q1.65 0 2.825 1.175T14 6v9.5q0 1.05-.725 1.775T11.5 18q-1.05 0-1.775-.725T9 15.5V6h1.5v9.5q0 .425.288.713T11.5 16.5q.425 0 .713-.287T12.5 15.5V6q0-1.05-.725-1.775T10 3.5q-1.05 0-1.775.725T7.5 6v10.5q0 1.65 1.175 2.825T11.5 20.5q1.65 0 2.825-1.175T15.5 16.5V6H17v10.5q0 2.3-1.6 3.9T11.5 22Z',
  description: 'M8 18h8v-2H8v2Zm0-4h8v-2H8v2Zm-2 8q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h8l6 6v12q0 .825-.587 1.413T18 22H6Zm7-13V4H6v16h12V9h-5Z',
};

function msIcon(name, size = 20) {
  const span = document.createElement('span');
  span.className = `v1-icon v1-icon-${size} material-symbols-outlined`;
  span.setAttribute('aria-hidden', 'true');
  span.dataset.icon = name;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', MATERIAL_SYMBOLS[name] || MATERIAL_SYMBOLS.check_box);
  svg.appendChild(path);
  span.appendChild(svg);
  return span;
}

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
    log_progress: 'Log Progress',
    fix_step: s => `Fix Step ${s}`,
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
    nav_approvals: 'Kwemeza Raporo',
    nav_analytics: 'Ibyagezweho n’Isesengura',
    nav_exports: 'Raporo n’Kohereza',
    nav_confidential: "Andika Ikibazo cy'Ibanga",
    search_placeholder: 'Shakisha igikorwa, paruwasi cyangwa intego...',
    sync_synced: 'Amakuru Yose Yarabitswe',
    sync_offline: n => `Byabitswe kuri Mudasobwa (${n} bitegereje murandasi)`,
    sync_updating: (c, t) => `Kohereza mu bubiko bukuru (${c} muri ${t})...`,
    add_planned: '+ Shyiramo Igikorwa Giteganyijwe',
    log_completed: 'Uzuza Igikorwa Cyakozwe',
    log_progress: 'Uzuza Ibyakozwe',
    fix_step: s => `Kosora Intambwe ya ${s}`,
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
    impact_PENDING: 'Ntiruzuzwa',
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
    log_progress: 'Saisir l’avancement',
    fix_step: s => `Corriger l'étape ${s}`,
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
    log_progress: 'Jaza Maendeleo',
    fix_step: s => `Rekebisha Hatua ${s}`,
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

/* Section 3.1: IBM Carbon Breadcrumbs above H1 */
function renderBreadcrumbs(workspaceLabel, extraTrail = []) {
  const parishes = V1.data?.parishes || [];
  const activeParish = parishes.find(p => p.code === (V1.wizard?.parish_code || V1.filters.parish));
  const items = [
    {
      label: 'Diocese of Butare',
      onClick: async () => {
        if (V1.filters.parish || V1.wizard) {
          V1.filters.parish = '';
          V1.wizard = null;
          await loadBootstrap();
          renderApp();
        }
      },
    },
    {
      label: activeParish ? `${activeParish.name} Parish` : (parishes[0] ? `${parishes[0].name} Parish` : 'Gakoma Parish'),
      onClick: async () => {
        if (V1.wizard) {
          V1.wizard = null;
          renderApp();
        }
      },
    },
    ...extraTrail,
    { label: workspaceLabel, current: true },
  ];

  const nav = h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' });
  items.forEach((it, idx) => {
    if (idx > 0) nav.append(h('span', { className: 'v1-breadcrumb-sep', 'aria-hidden': 'true' }, '/'));
    if (it.current) {
      nav.append(h('span', { className: 'v1-breadcrumb-item current', 'aria-current': 'page' }, it.label));
    } else {
      nav.append(h('button', { type: 'button', className: 'v1-breadcrumb-item', onClick: it.onClick }, it.label));
    }
  });
  return nav;
}

/* Section 2.2: Neutral Badge with 8px Circular Status Dot (No colored backgrounds or text) */
const DOT_TOKEN_MAP = {
  GREAT: 'var(--dot-great)',
  great: 'var(--dot-great)',
  success: 'var(--dot-great)',
  synced: 'var(--dot-great)',
  GOOD: 'var(--dot-good)',
  good: 'var(--dot-good)',
  info: 'var(--dot-good)',
  syncing: 'var(--dot-good)',
  MEDIUM: 'var(--dot-warn)',
  warn: 'var(--dot-warn)',
  warning: 'var(--dot-warn)',
  offline: 'var(--dot-warn)',
  LOW: 'var(--dot-low)',
  low: 'var(--dot-low)',
  MAJOR: 'var(--dot-low)',
  danger: 'var(--dot-low)',
  MINOR: 'var(--dot-neutral)',
  PENDING: 'var(--dot-neutral)',
  neutral: 'var(--dot-neutral)',
};

function renderLozenge(text, variant = 'neutral') {
  const dotColor = DOT_TOKEN_MAP[variant] || 'var(--dot-neutral)';
  return h('span', { className: `badge v1-badge ${variant}` },
    h('span', {
      className: `badge-dot ${variant}`,
      style: { backgroundColor: dotColor },
      'aria-hidden': 'true',
    }),
    h('span', {}, text)
  );
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

/* Section 5.4: Touch Stepper Input Control (- / + 44x44px hit areas with tabular-nums) */
function renderStepperInput(labelTxt, value, onChange, min = 0, hasError = false) {
  return h('div', { className: 'v1-stepper-box' },
    h('label', { className: 'v1-field-label' }, labelTxt),
    h('div', { className: 'v1-stepper-controls' },
      h('button', {
        type: 'button',
        className: 'v1-step-btn',
        'aria-label': `Decrease ${labelTxt}`,
        onClick: () => {
          const next = Math.max(min, Number(value || 0) - 1);
          onChange(next);
        },
      }, '−'),
      h('input', {
        type: 'number',
        className: 'v1-step-input v1-tabular' + (hasError ? ' has-error' : ''),
        min: String(min),
        value: String(value ?? 0),
        onChange: e => onChange(Math.max(min, Number(e.target.value || 0))),
      }),
      h('button', {
        type: 'button',
        className: 'v1-step-btn',
        'aria-label': `Increase ${labelTxt}`,
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
  return h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' } },
    h('span', { className: 'v1-search-icon' }, msIcon('location_on', 16)),
    h('input', {
      type: 'search',
      list: listId,
      className: 'v1-search-input',
      style: { width: '220px', paddingLeft: '32px', height: '36px' },
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
      ? h('button', { type: 'button', className: 'v1-btn v1-btn-ghost v1-btn-sm', onClick: () => onSelect('') }, 'Clear')
      : null,
    h('datalist', { id: listId },
      parishes.map(p => h('option', { value: p.name }, `${p.name} · ${p.district} District`))
    )
  );
}

/* Section 5.3: Cisco Momentum Slide-Up Mobile Bottom Sheet */
function renderMobileBottomSheet() {
  if (!V1.mobileSheet) return null;
  const parishes = V1.data?.parishes || [];
  const themes = [
    { code: '', label: L('all_themes') },
    { code: 'A1', label: 'Healing & Unity' },
    { code: 'A2', label: 'Conflict Resolution' },
    { code: 'A3', label: 'Environmental Care' },
    { code: 'A4', label: 'Human Rights' },
    { code: 'A5', label: 'Committee Support' },
  ];

  return h('div', {
    className: 'v1-sheet-backdrop',
    onClick: e => {
      if (e.target.classList.contains('v1-sheet-backdrop')) {
        V1.mobileSheet = null;
        renderApp();
      }
    },
  },
    h('div', { className: 'v1-bottom-sheet', role: 'dialog', 'aria-modal': 'true' },
      h('div', { className: 'v1-sheet-handle' }),
      h('div', { className: 'v1-sheet-header' },
        h('h2', { className: 'v1-section-title' }, V1.mobileSheet === 'location' ? 'Select Parish & Location' : 'Filter Workspace'),
        h('button', {
          type: 'button',
          className: 'v1-btn btn-outline v1-btn-outline v1-btn-sm',
          onClick: () => { V1.mobileSheet = null; renderApp(); },
        }, msIcon('close', 20))
      ),
      h('div', { className: 'v1-sheet-body' },
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Reporting Period'),
          h('div', { className: 'v1-chips' },
            [
              ['ALL', L('period_all')],
              ['Q1', L('period_q1')],
              ['AP1', L('period_ap1')],
            ].map(([code, lbl]) =>
              h('button', {
                type: 'button',
                className: 'v1-chip' + (V1.filters.period === code ? ' active' : ''),
                onClick: () => { V1.filters.period = code; renderApp(); },
              }, lbl)
            )
          )
        ),
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Strategic Theme'),
          h('div', { className: 'v1-chips' },
            themes.map(th =>
              h('button', {
                type: 'button',
                className: 'v1-chip' + (V1.filters.axis === th.code ? ' active' : ''),
                onClick: () => { V1.filters.axis = th.code; renderApp(); },
              }, th.label)
            )
          )
        ),
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Parish Location'),
          h('div', { className: 'v1-chips' },
            h('button', {
              type: 'button',
              className: 'v1-chip' + (!V1.filters.parish ? ' active' : ''),
              onClick: () => { V1.filters.parish = ''; renderApp(); },
            }, L('all_parishes')),
            ...parishes.slice(0, 12).map(p =>
              h('button', {
                type: 'button',
                className: 'v1-chip' + (V1.filters.parish === p.code ? ' active' : ''),
                onClick: () => { V1.filters.parish = p.code; renderApp(); },
              }, p.name)
            )
          )
        )
      ),
      h('div', { className: 'v1-sheet-footer' },
        h('button', {
          type: 'button',
          className: 'v1-btn btn-outline v1-btn-outline',
          onClick: async () => {
            V1.filters.period = 'ALL';
            V1.filters.axis = '';
            V1.filters.parish = '';
            V1.filters.status = 'ALL';
            await loadBootstrap();
            V1.mobileSheet = null;
            renderApp();
          },
        }, 'Reset'),
        h('button', {
          type: 'button',
          className: 'v1-btn',
          style: { flex: 1 },
          onClick: async () => {
            await loadBootstrap();
            V1.mobileSheet = null;
            renderApp();
          },
        }, h('span', {}, 'Apply Filters'), msIcon('check', 20))
      )
    )
  );
}

/* 4-Step Guided Data Collection Wizard View (Carbon Desktop + Momentum Mobile Focused View) */
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
      h('div', { style: { background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
          renderLozenge(localize(task.axis_labels), 'neutral'),
          renderLozenge(`Target: ${task.planned_target} ${task.unit_label}`, 'GOOD')
        ),
        h('h2', { className: 'v1-section-title' }, localize(task.titles)),
        h('div', { className: 'v1-field-helper' },
          `Minimum threshold for Good Impact: ${task.min_threshold} · Great Impact target: ${task.target_threshold}`
        )
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' } },
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Activity Date'),
          h('input', {
            type: 'date',
            className: 'v1-input' + (!period.valid ? ' has-error' : ''),
            value: w.event_date,
            onChange: e => {
              w.event_date = e.target.value;
              saveWizardDraftLocal();
              renderApp();
            },
          }),
          period.valid
            ? h('div', { className: 'v1-field-helper' },
                msIcon('calendar_today', 16),
                h('span', {}, `Auto-Tagged: ${period.yearLabel} · ${period.quarter}`)
              )
            : h('div', { className: 'v1-field-error' },
                msIcon('warning', 16),
                h('span', {}, 'Pick a date between 1 Sept 2026 and 31 Aug 2031.')
              )
        ),
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Parish (Auto-Scoped to Your Account)'),
          renderParishCombobox(w.parish_code, newCode => {
            if (!newCode) return;
            w.parish_code = newCode;
            const np = parishes.find(p => p.code === newCode);
            w.centrale = np?.centrales?.[0]?.name || 'Centre';
            saveWizardDraftLocal();
            renderApp();
          }, false),
          h('div', { className: 'v1-field-helper' }, 'Automatically displays Centrales and CEBs in this parish.')
        )
      ),
      h('div', { className: 'v1-field' },
        h('label', { className: 'v1-field-label' },
          `Select Local Centrale or CEB in ${currentParish.name} Parish`
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
      h('div', { className: 'v1-field' },
        h('label', { className: 'v1-field-label' }, 'Collection Mode (Choose How Data Was Gathered)'),
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
    const hasAgeError = totalParticipants > 0 && ageDiff !== 0;
    const hasDisError = Number(w.disability || 0) > totalParticipants;
    stepContent = h('div', {},
      h('h2', { className: 'v1-section-title', style: { marginBottom: '12px' } }, 'Participant Counts (Auto-Calculated Total)'),
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
        h('span', { className: 'v1-mono', style: { fontSize: '1.25rem', fontWeight: '700' } }, `${totalParticipants} Participants`)
      ),
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '20px', marginBottom: '8px' } },
        h('h3', { className: 'v1-task-title' }, 'Age Group Breakdown & Inclusion'),
        ageDiff === 0
          ? renderLozenge(`${ageSum} of ${totalParticipants} participants assigned`, 'GREAT')
          : h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
              renderLozenge(`${ageSum} of ${totalParticipants} assigned`, 'LOW'),
              h('button', {
                type: 'button',
                className: 'v1-btn btn-outline v1-btn-outline v1-btn-sm',
                onClick: () => {
                  w.age_18_35 = Math.max(0, Number(w.age_18_35 || 0) + ageDiff);
                  saveWizardDraftLocal();
                  renderApp();
                },
              }, h('span', {}, 'Auto-Fit Age Groups'))
            )
      ),
      h('div', { className: 'v1-number-grid' },
        renderStepperInput('Under 18 Years', w.age_u18, v => { w.age_u18 = v; saveWizardDraftLocal(); renderApp(); }, 0, hasAgeError),
        renderStepperInput('18–35 Years', w.age_18_35, v => { w.age_18_35 = v; saveWizardDraftLocal(); renderApp(); }, 0, hasAgeError),
        renderStepperInput('36–64 Years', w.age_36_64, v => { w.age_36_64 = v; saveWizardDraftLocal(); renderApp(); }, 0, hasAgeError),
        renderStepperInput('65+ Years', w.age_65, v => { w.age_65 = v; saveWizardDraftLocal(); renderApp(); }, 0, hasAgeError),
        renderStepperInput('Persons with Disabilities', w.disability, v => { w.disability = v; saveWizardDraftLocal(); renderApp(); }, 0, hasDisError)
      ),
      /* Section 3: Inline red validation error directly underneath the invalid age/disability inputs */
      hasAgeError
        ? h('div', { className: 'v1-field-error', role: 'alert' },
            msIcon('warning', 16),
            h('span', {}, `Age group numbers add up to ${ageSum}, but you entered ${totalParticipants} total participants. ${ageDiff > 0 ? `Add ${ageDiff} more.` : `Remove ${Math.abs(ageDiff)}.`}`)
          )
        : null,
      hasDisError
        ? h('div', { className: 'v1-field-error', role: 'alert' },
            msIcon('warning', 16),
            h('span', {}, `Participants with disabilities (${w.disability}) cannot be higher than total participants (${totalParticipants}).`)
          )
        : null,
      h('hr', { style: { border: 0, borderTop: '1px solid var(--border-subtle)', margin: '24px 0' } }),
      w.collection_mode === 'ENUMERATOR'
        ? h('div', {},
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
              h('h3', { className: 'v1-task-title' }, 'Individual Respondent Quick-Entry Cards'),
              h('button', {
                type: 'button',
                className: 'v1-btn btn-outline v1-btn-outline v1-btn-sm',
                onClick: () => {
                  w.respondents.push({ code: `RESP-0${w.respondents.length + 1}`, score: 80, resolved_case: true });
                  saveWizardDraftLocal();
                  renderApp();
                },
              }, h('span', {}, '+ Add Respondent'), msIcon('add', 16))
            ),
            w.respondents.map((r, idx) =>
              h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' } },
                h('span', { className: 'v1-mono', style: { fontWeight: '600', minWidth: '80px' } }, r.code),
                h('label', { className: 'v1-field-label', style: { margin: 0 } }, 'Score (%):'),
                h('input', {
                  type: 'number',
                  className: 'v1-step-input',
                  style: { width: '90px', height: '36px', minHeight: '36px' },
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
                      className: 'v1-btn v1-btn-ghost v1-btn-sm',
                      onClick: () => { w.respondents.splice(idx, 1); saveWizardDraftLocal(); renderApp(); },
                    }, 'Remove')
                  : null
              )
            )
          )
        : w.collection_mode === 'FOCUS_GROUP'
        ? h('div', {},
            renderStepperInput('Focus Group Duration (Hours)', w.duration_hours, v => { w.duration_hours = v; saveWizardDraftLocal(); renderApp(); }, 1),
            h('div', { className: 'v1-field', style: { marginTop: '16px' } },
              h('label', { className: 'v1-field-label' }, 'Group Consensus Findings & Key Takeaways'),
              h('textarea', {
                rows: '3',
                className: 'v1-textarea',
                placeholder: 'Summarize the main agreements reached by the group...',
                value: w.consensus_notes,
                onChange: e => { w.consensus_notes = e.target.value; saveWizardDraftLocal(); },
              })
            )
          )
        : w.collection_mode === 'SURVEY'
        ? h('div', {},
            h('div', { className: 'v1-number-grid' },
              renderStepperInput('Paper/Digital Forms Distributed', w.forms_distributed, v => { w.forms_distributed = v; saveWizardDraftLocal(); renderApp(); }),
              renderStepperInput('Completed Forms Returned', w.forms_returned, v => { w.forms_returned = v; saveWizardDraftLocal(); renderApp(); })
            )
          )
        : h('div', {},
            h('div', { className: 'v1-field' },
              h('label', { className: 'v1-field-label' }, 'Field Observation Checklist'),
              h('div', { className: 'v1-chips' },
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
              )
            ),
            h('div', { className: 'v1-field' },
              h('label', { className: 'v1-field-label' }, 'Direct Field Observation Notes'),
              h('textarea', {
                rows: '3',
                className: 'v1-textarea',
                value: w.observation_notes,
                onChange: e => { w.observation_notes = e.target.value; saveWizardDraftLocal(); },
              })
            )
          )
    );
  } else if (w.step === 3) {
    const severities = [
      { code: 'NONE', label: 'No Issues' },
      { code: 'MINOR', label: 'Minor' },
      { code: 'MEDIUM', label: 'Medium' },
      { code: 'MAJOR', label: 'Major' },
    ];
    const minT = Number(task.min_threshold || 0);
    const targetMissed = Number(w.outcome_value || 0) < minT;
    const missingIssueExplanation = targetMissed && (w.issue_severity === 'NONE' || !String(w.issue_note || '').trim());

    stepContent = h('div', {},
      h('div', { style: { background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' } },
          h('div', {},
            h('h3', { className: 'v1-task-title' }, localize(task.outcome_prompt)),
            h('div', { className: 'v1-field-helper' },
              `Minimum Threshold for Good Impact: ${task.min_threshold} · Great Impact Target: ${task.target_threshold}`
            )
          ),
          renderLozenge(L('impact_' + previewImpact), previewImpact)
        ),
        h('div', { style: { maxWidth: '260px', marginTop: '12px' } },
          renderStepperInput('Measured Outcome Achieved', w.outcome_value, val => {
            w.outcome_value = val;
            saveWizardDraftLocal();
            renderApp();
          })
        )
      ),
      h('div', { className: 'v1-field' },
        h('label', { className: 'v1-field-label' }, 'Did you face any field issues or delays?'),
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
      /* Section 4: Neutral Issue Callout Box (--bg-input, 1px subtle border, 3px slate left border) */
      (w.issue_severity !== 'NONE' || targetMissed)
        ? h('div', { className: 'v1-issue-callout', style: { flexDirection: 'column', alignItems: 'stretch', marginBottom: '18px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('span', { className: 'v1-field-label', style: { margin: 0 } }, 'Field Challenge & Support Details'),
              renderLozenge(
                w.issue_severity === 'NONE' ? 'Explanation Needed' : `${w.issue_severity} Issue`,
                w.issue_severity === 'NONE' ? 'warn' : w.issue_severity
              )
            ),
            h('div', { className: 'v1-field', style: { marginTop: '8px' } },
              h('label', { className: 'v1-field-label' }, 'Select Issue Categories (Filter Chips)'),
              h('div', { className: 'v1-chips' },
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
              )
            ),
            h('div', { className: 'v1-field', style: { marginBottom: 0 } },
              h('label', { className: 'v1-field-label' }, 'Short Explanation (What happened and what support is needed?)'),
              h('textarea', {
                rows: '3',
                className: 'v1-textarea' + (missingIssueExplanation ? ' has-error' : ''),
                placeholder: 'Example: Heavy rain delayed transport from distant CEBs...',
                value: w.issue_note,
                onChange: e => { w.issue_note = e.target.value; saveWizardDraftLocal(); },
              }),
              missingIssueExplanation
                ? h('div', { className: 'v1-field-error', role: 'alert' },
                    msIcon('warning', 16),
                    h('span', {}, `Target not reached (${w.outcome_value} of ${minT}). Please select an issue level and add a short note.`)
                  )
                : null
            )
          )
        : null,
      h('div', { className: 'v1-field' },
        h('label', { className: 'v1-field-label' }, 'Qualitative Story of Change or Key Observation (Optional)'),
        h('textarea', {
          rows: '2',
          className: 'v1-textarea',
          placeholder: 'Brief real-world example of impact...',
          value: w.story_of_change,
          onChange: e => { w.story_of_change = e.target.value; saveWizardDraftLocal(); },
        }),
        h('div', { className: 'v1-field-helper' }, 'Entered narrative remains in its original source language.')
      ),
      h('div', { className: 'v1-field' },
        h('label', { className: 'v1-field-label' }, 'Attach Attendance Sheet or Photo Receipt'),
        h('input', {
          type: 'file',
          className: 'v1-input',
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
              w.attachments.map(a => renderLozenge(a, 'GOOD'))
            )
          : null
      ),
      task.is_sensitive
        ? h('label', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' } },
            h('input', {
              type: 'checkbox',
              checked: w.privacy_confirmed,
              style: { width: '18px', height: '18px', borderRadius: 'var(--radius-xs)' },
              onChange: e => { w.privacy_confirmed = e.target.checked; saveWizardDraftLocal(); renderApp(); },
            }),
            'I confirm no victim names or private medical details are written in the general notes.'
          )
        : null
    );
  } else if (w.step === 4) {
    const actionPct = Math.min(100, Math.round((Number(w.sessions_done || 0) / Number(task.planned_target || 1)) * 100));
    stepContent = h('div', {},
      h('h2', { className: 'v1-section-title', style: { marginBottom: '14px' } }, 'Quick Summary Before Submitting'),
      h('div', { className: 'v1-kpi-grid', style: { marginBottom: '18px' } },
        h('div', { className: 'v1-kpi-card', style: { gridColumn: 'span 5' } },
          h('span', {}, 'Location & Pastoral Period'),
          h('strong', { style: { fontSize: '1.125rem', fontFamily: 'var(--font-sans)' } }, `${currentParish.name} · ${w.centrale}`),
          h('div', { className: 'v1-field-helper' },
            `${w.event_date} (${period.yearLabel} · ${period.quarter})`
          )
        ),
        h('div', { className: 'v1-kpi-card', style: { gridColumn: 'span 5' } },
          h('span', {}, 'Total Participants'),
          h('strong', {}, String(totalParticipants)),
          h('div', { className: 'v1-field-helper' },
            `${w.women} Women · ${w.men} Men · ${w.disability} with Disabilities`
          )
        ),
        h('div', { className: 'v1-kpi-card', style: { gridColumn: 'span 6' } },
          h('span', {}, 'Action Completion & Impact Badge'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' } },
            h('strong', { style: { margin: 0, fontSize: '1.5rem' } }, `${actionPct}%`),
            renderLozenge(L('impact_' + previewImpact), previewImpact)
          ),
          h('div', { className: 'v1-field-helper' },
            `Outcome Achieved: ${w.outcome_value} (Target: ${task.target_threshold})`
          )
        )
      ),
      w.issue_severity !== 'NONE'
        ? h('div', { className: 'v1-issue-callout', style: { marginBottom: '16px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
              renderLozenge(`${w.issue_severity} Issue`, w.issue_severity),
              h('span', {}, `${w.issue_categories.join(', ') || 'General'} — ${w.issue_note}`)
            )
          )
        : null
    );
  }

  return h('div', {},
    renderBreadcrumbs(L('nav_tasks'), [{ label: `${w.centrale} Centrale`, onClick: () => {} }]),
    h('div', { className: 'v1-wizard-card' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-ghost v1-btn-sm',
          onClick: () => {
            saveWizardDraftLocal();
            V1.wizard = null;
            renderApp();
          },
        }, msIcon('arrow_back', 16), h('span', {}, 'Back to My Tasks')),
        renderLozenge(`Step ${w.step} of 4 · Draft Saved`, 'GOOD')
      ),
      /* Section 5.2: Cisco Momentum Compact Mobile Progress Header */
      h('div', { className: 'v1-momentum-progress-header' },
        h('span', {}, stepsMeta[w.step - 1].label),
        h('span', { className: 'v1-mono' }, `${w.step} / 4`)
      ),
      /* Section 4: Neutral Reviewer Comment Callout Box */
      w.correction_note
        ? h('div', { className: 'v1-issue-callout', style: { marginBottom: '16px' } },
            renderLozenge(`Fix Step ${w.correction_step || 1}`, 'warn'),
            h('span', {}, `Reviewer Note: "${w.correction_note}"`)
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
      w.error
        ? h('div', { className: 'v1-field-error', role: 'alert', style: { marginBottom: '12px' } },
            msIcon('warning', 16),
            h('span', {}, w.error)
          )
        : null,
      stepContent,
      /* Section 3.2 & 5.2: Neutral Outline Back + Single Primary Action Button (Sticky on Mobile) */
      h('div', { className: 'v1-wizard-footer' },
        w.step > 1
          ? h('button', {
              type: 'button',
              className: 'v1-btn btn-outline v1-btn-outline',
              onClick: () => {
                w.step -= 1;
                w.error = '';
                saveWizardDraftLocal();
                renderApp();
              },
            }, msIcon('arrow_back', 20), h('span', {}, 'Back'))
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
            }, h('span', {}, 'Next Step'), msIcon('arrow_forward', 20))
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
            },
            h('span', {}, V1.simulateOffline ? L('save_offline_btn') : L('submit_parish')),
            msIcon('check', 20)
          )
      )
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
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
      h('h2', { className: 'v1-section-title' }, L('add_planned')),
      h('button', {
        type: 'button',
        className: 'v1-btn btn-outline v1-btn-outline v1-btn-sm',
        onClick: () => { V1.newTaskModal = false; renderApp(); },
      }, h('span', {}, 'Cancel'), msIcon('close', 16))
    ),
    h('div', { className: 'v1-field' },
      h('label', { className: 'v1-field-label' },
        '1. Choose Strategic Goal (Backend Automatically Binds Axis, Outcome & KPI IDs)'
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
    h('div', { className: 'v1-field' },
      h('label', { className: 'v1-field-label' }, '2. Natural Activity Title (Plain Action Statement)'),
      h('input', {
        type: 'text',
        className: 'v1-input' + (state.error ? ' has-error' : ''),
        placeholder: 'e.g., Train 25 youth mediators in peaceful family dialogue',
        value: state.title,
        onChange: e => { state.title = e.target.value; },
      }),
      state.error
        ? h('div', { className: 'v1-field-error', role: 'alert' }, msIcon('warning', 16), h('span', {}, state.error))
        : h('div', { className: 'v1-field-helper' }, 'No form codes or strategic IDs needed.')
    ),
    h('div', { className: 'v1-number-grid', style: { marginBottom: '16px' } },
      h('div', { className: 'v1-field', style: { marginBottom: 0 } },
        h('label', { className: 'v1-field-label' }, 'Assigned Parish'),
        renderParishCombobox(state.parish_code, code => { if (code) state.parish_code = code; renderApp(); }, false)
      ),
      h('div', { className: 'v1-field', style: { marginBottom: 0 } },
        h('label', { className: 'v1-field-label' }, 'Target Due Date'),
        h('input', {
          type: 'date',
          className: 'v1-input',
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
      }, h('span', {}, 'Save Activity to To-Do List'), msIcon('check', 20))
    )
  );
}

/* WORKSPACE 1: My Tasks (To-Do List — Carbon Desktop + Polaris Mobile Cards) */
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
    renderBreadcrumbs(L('nav_tasks')),
    h('div', { className: 'v1-page-header' },
      h('div', {},
        h('h1', { className: 'v1-page-title' }, L('nav_tasks')),
        h('p', { className: 'v1-page-subtitle' },
          'Your assigned field activities, recurring quarterly goals, and saved drafts. All internal M&E codes are handled automatically.'
        )
      ),
      /* Section 3.2: Only ONE Primary (#0F62FE) button per view; supporting actions use .btn-outline */
      h('div', { className: 'v1-header-actions' },
        h('button', {
          type: 'button',
          className: 'v1-btn btn-outline v1-btn-outline v1-mobile-filter-trigger',
          onClick: () => { V1.mobileSheet = 'filters'; renderApp(); },
        }, h('span', {}, 'Filter'), msIcon('filter_list', 20)),
        h('button', {
          type: 'button',
          className: 'v1-btn btn-outline v1-btn-outline',
          onClick: () => {
            const sensTask = (V1.data?.tasks || []).find(t => t.is_sensitive) || V1.data?.tasks?.[0];
            if (sensTask) openWizardForTask(sensTask);
          },
        }, h('span', {}, L('nav_confidential')), msIcon('lock', 20)),
        h('button', {
          type: 'button',
          className: 'v1-btn' + (V1.newTaskModal ? ' btn-outline v1-btn-outline' : ''),
          onClick: () => { V1.newTaskModal = !V1.newTaskModal; renderApp(); },
        }, h('span', {}, L('add_planned')), msIcon('add', 20))
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
    /* Task Cards List (Neutral Badges + 8px Status Dots + Uniform Carbon Blue Progress Bar) */
    h('div', { className: 'v1-task-list' },
      tasks.map(t => {
        const isDone = t.completion_pct >= 100;
        const needsFix = t.status === 'NEEDS_CORRECTION';
        const hasLocalDraft = !!localStorage.getItem('apse-v1-draft-' + t.id);
        return h('article', { className: 'v1-task-card' },
          h('div', { className: 'v1-task-left' },
            h('div', { className: 'v1-task-check' + (isDone ? ' done' : (needsFix ? ' warn' : '')) },
              isDone ? msIcon('check', 16) : (needsFix ? msIcon('undo', 16) : msIcon('assignment', 16))
            ),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' } },
                h('h3', { className: 'v1-task-title' }, localize(t.titles)),
                h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                  t.is_sensitive ? renderLozenge('Confidential', 'neutral') : null,
                  hasLocalDraft ? renderLozenge('Saved Draft', 'neutral') : null,
                  needsFix ? renderLozenge('Waiting Fix', 'warn') : null,
                  renderLozenge(L('impact_' + t.impact_rating), t.impact_rating)
                )
              ),
              /* Section 2.2 Neutral Metadata Badges for hidden-code labels */
              h('div', { className: 'v1-task-meta' },
                renderLozenge(`${t.parish_name} Parish`, 'neutral'),
                renderLozenge(localize(t.axis_labels), 'neutral'),
                renderLozenge(t.pastoral_quarter, 'neutral'),
                h('span', { className: 'v1-tabular' }, `Due ${t.due_date}`),
                t.frequency > 1 ? h('span', { className: 'v1-tabular' }, `· Quarterly (${t.quarters_completed}/${t.frequency} logged)`) : null
              ),
              /* Section 4: Uniform Carbon Blue Progress Bar on Neutral Track */
              h('div', { className: 'v1-progress-wrap' },
                h('div', { className: 'v1-progress-bar' },
                  h('div', { className: 'v1-progress-fill', style: { width: `${t.completion_pct}%` } })
                ),
                h('span', { className: 'v1-progress-stat', style: { fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' } },
                  `${t.completion_pct}% (${t.completed_units}/${t.planned_target} ${t.unit_label})`
                )
              )
            )
          ),
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
            needsFix
              ? h('button', {
                  type: 'button',
                  className: 'v1-btn btn-outline v1-btn-outline',
                  onClick: () => openWizardForTask(t, t.latest_log, t.latest_log?.payload?.correction_step || 1),
                },
                h('span', {}, L('fix_step', t.latest_log?.payload?.correction_step || 1)),
                msIcon('arrow_forward', 20)
              )
              : h('button', {
                  type: 'button',
                  className: 'v1-btn ' + (isDone ? 'btn-outline v1-btn-outline' : 'v1-btn-secondary'),
                  onClick: () => openWizardForTask(t, t.latest_log),
                },
                h('span', {}, isDone ? L('view_summary') : L('log_progress')),
                msIcon('chevron_right', 20)
              )
          )
        );
      })
    )
  );
}

/* WORKSPACE 2: Review & Approvals (Streamlined 3-Tier Flow with Neutral Outline Buttons) */
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

  let primaryAssigned = false;

  return h('div', {},
    renderBreadcrumbs(L('nav_approvals')),
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
      logs.map(l => {
        const canDioceseApprove = l.stage in { SUBMITTED: 1, PARISH_APPROVED: 1 };
        const usePrimaryHere = canDioceseApprove && !primaryAssigned;
        if (usePrimaryHere) primaryAssigned = true;

        return h('article', { className: 'v1-task-card' },
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' } },
              renderLozenge(
                stageLabelMap[l.stage] || l.stage,
                l.stage === 'DIOCESE_APPROVED' ? 'GREAT' : (l.stage === 'CORRECTION' ? 'warn' : (l.stage === 'SUBMITTED' ? 'warn' : 'GOOD'))
              ),
              renderLozenge(L('impact_' + l.impact_rating), l.impact_rating),
              renderLozenge(`${l.parish_name} · ${l.centrale}`, 'neutral'),
              renderLozenge(`${l.event_date} (${l.pastoral_quarter})`, 'neutral')
            ),
            h('h3', { className: 'v1-task-title', style: { margin: '4px 0' } }, localize(l.task_titles)),
            h('div', { className: 'v1-tabular', style: { fontSize: '0.875rem', color: 'var(--text-secondary)' } },
              `Participants: ${l.total} Total (${l.women} Women, ${l.men} Men, ${l.disability} with Disabilities) · Outcome Achieved: ${l.outcome_value} (Target: ${l.target_threshold})`
            ),
            /* Section 4: Neutral Issue Callout Box with 8px dot badge */
            l.issue_severity !== 'NONE'
              ? h('div', { className: 'v1-issue-callout', style: { marginTop: '8px' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                    renderLozenge(`${l.issue_severity} Issue`, l.issue_severity),
                    h('span', {}, `${l.issue_categories.join(', ')}: ${l.issue_note}`)
                  )
                )
              : null
          ),
          /* Section 2: Neutralized Workflow Buttons (.btn-outline for "Return for Fix") */
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
            l.stage === 'SUBMITTED'
              ? h('button', {
                  type: 'button',
                  className: 'v1-btn v1-btn-secondary v1-btn-sm',
                  onClick: async () => {
                    await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'PARISH_APPROVED', note: 'Verified by Parish CPJP Reviewer' });
                    await loadBootstrap();
                    renderApp();
                  },
                }, h('span', {}, 'Approve (Parish CPJP)'), msIcon('check', 16))
              : null,
            canDioceseApprove
              ? h('button', {
                  type: 'button',
                  className: 'v1-btn v1-btn-sm' + (usePrimaryHere ? '' : ' v1-btn-secondary'),
                  onClick: async () => {
                    await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'DIOCESE_APPROVED', note: 'Finalized by CDJP Diocese' });
                    await loadBootstrap();
                    renderApp();
                  },
                }, h('span', {}, 'Final Approve (Diocese)'), msIcon('fact_check', 16))
              : null,
            l.stage !== 'DIOCESE_APPROVED'
              ? h('button', {
                  type: 'button',
                  className: 'v1-btn btn-outline v1-btn-outline v1-btn-sm',
                  onClick: async () => {
                    const stepStr = prompt('Which step needs fixing? Enter 1 (When/Where), 2 (Attendance), or 3 (Outcome/Issues):', '2');
                    if (!stepStr) return;
                    const note = prompt('Write a short, clear instruction for the field reporter:', 'Please verify the age group numbers and attach the attendance sheet.');
                    if (!note) return;
                    await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'CORRECTION', correction_step: Number(stepStr) || 2, note });
                    await loadBootstrap();
                    renderApp();
                  },
                }, h('span', {}, 'Return for Fix'), msIcon('undo', 16))
              : null
          )
        );
      })
    )
  );
}

/* WORKSPACE 3: Impact & Analytics (Restrained Carbon Blues & Neutral Slates Palette + Neutral Callouts) */
function renderAnalyticsWorkspace() {
  const analytics = V1.data?.analytics || { summary: {}, accordions: [], parish_map: [], monthly_trends: [] };
  const s = analytics.summary || {};
  const activePeriodLabel = V1.filters.period === 'Q1' ? L('period_q1') : (V1.filters.period === 'AP1' ? L('period_ap1') : L('period_all'));
  const chartBluesAndSlates = ['#0F62FE', '#4589FF', '#A6C8FF', '#8D8D8D'];

  return h('div', {},
    renderBreadcrumbs(L('nav_analytics')),
    h('div', { className: 'v1-page-header' },
      h('div', {},
        h('h1', { className: 'v1-page-title' }, L('nav_analytics')),
        h('p', { className: 'v1-page-subtitle' },
          'Action Completion vs. Threshold-Based Impact Ratings, Regional Parish Map, and Field Bottleneck Trends.'
        )
      ),
      h('div', { className: 'v1-header-actions' },
        h('button', {
          type: 'button',
          className: 'v1-btn btn-outline v1-btn-outline v1-mobile-filter-trigger',
          onClick: () => { V1.mobileSheet = 'filters'; renderApp(); },
        }, h('span', {}, 'Filter'), msIcon('filter_list', 20))
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
    /* Section 4: Neutral Bottleneck Insight Callout Box */
    s.top_bottleneck_category
      ? h('div', { className: 'v1-issue-callout', style: { marginBottom: '20px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
            renderLozenge('Bottleneck Insight', 'warn'),
            h('span', { className: 'v1-tabular' },
              `${s.top_bottleneck_pct}% of reported field delays this period involved "${s.top_bottleneck_category}" challenges.`
            )
          )
        )
      : null,
    /* Top KPI Strip (16-Column Grid, 28px IBM Plex Mono tabular-nums) */
    h('div', { className: 'v1-kpi-grid' },
      h('div', { className: 'v1-kpi-card' },
        h('span', {}, 'Average Action Completion'),
        h('strong', { className: 'v1-kpi-value' }, `${s.avg_completion_pct ?? 0}%`),
        h('div', { className: 'v1-field-helper v1-tabular' },
          `${s.tasks_completed ?? 0} of ${s.tasks_total ?? 0} planned actions completed`
        )
      ),
      h('div', { className: 'v1-kpi-card' },
        h('span', {}, 'Total Participants Reached'),
        h('strong', { className: 'v1-kpi-value' }, Number(s.total_participants || 0).toLocaleString()),
        h('div', { className: 'v1-field-helper v1-tabular' },
          `${s.women || 0} Women · ${s.men || 0} Men · ${s.disability || 0} with Disabilities`
        )
      ),
      h('div', { className: 'v1-kpi-card' },
        h('span', {}, 'Outcome Impact Quality'),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' } },
          renderLozenge(`${s.impact_counts?.GREAT || 0} Great`, 'GREAT'),
          renderLozenge(`${s.impact_counts?.GOOD || 0} Good`, 'GOOD'),
          renderLozenge(`${s.impact_counts?.LOW || 0} Low`, 'LOW')
        )
      ),
      h('div', { className: 'v1-kpi-card' },
        h('span', {}, 'Pending Approvals'),
        h('strong', { className: 'v1-kpi-value' }, String(s.pending_approvals || 0)),
        h('div', { className: 'v1-field-helper' }, 'Reports awaiting Parish or Diocese sign-off')
      )
    ),
    /* Section 3.3 & Section 4: Carbon Chart Containers (Carbon Blues & Neutral Slates Palette) */
    h('div', { className: 'v1-analytics-split' },
      /* Regional Parish SVG Map */
      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('div', {},
            h('h2', { className: 'v1-section-title' }, 'Diocese of Butare — Regional Parish Map'),
            h('p', { className: 'v1-chart-subtitle' }, `Active Filter: ${activePeriodLabel} · Click any Parish node`)
          ),
          h('div', { className: 'v1-chart-legend' },
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: '#0F62FE' } }),
              '≥80% Target'
            ),
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: '#4589FF' } }),
              'In Progress'
            ),
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: '#A6C8FF' } }),
              'Needs Support'
            ),
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: '#8D8D8D' } }),
              'No Activity'
            )
          )
        ),
        (() => {
          const svgNS = 'http://www.w3.org/2000/svg';
          const svg = document.createElementNS(svgNS, 'svg');
          svg.setAttribute('viewBox', '0 0 100 92');
          svg.style.width = '100%';
          svg.style.height = '240px';
          svg.style.background = 'var(--bg-input)';
          svg.style.borderRadius = 'var(--radius-sm)';

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
            txt.setAttribute('fill', 'var(--text-muted)');
            txt.setAttribute('font-size', '3.5');
            txt.setAttribute('font-weight', '700');
            txt.setAttribute('opacity', '0.5');
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
            circle.setAttribute('r', V1.filters.parish === p.code ? '3.5' : '2.4');
            /* Section 4: Restrained Carbon Blues & Neutral Slates Palette */
            const fill = p.status_color === 'green'
              ? '#0F62FE'
              : (p.status_color === 'amber'
                ? '#4589FF'
                : (p.status_color === 'red' ? '#A6C8FF' : '#8D8D8D'));
            circle.setAttribute('fill', fill);
            circle.setAttribute('stroke', 'var(--bg-surface)');
            circle.setAttribute('stroke-width', '0.7');
            const title = document.createElementNS(svgNS, 'title');
            title.textContent = `${p.name} (${p.district}): ${p.completion_pct ?? 0}% complete · ${p.participants} participants`;
            g.appendChild(title);
            g.appendChild(circle);

            if (p.tasks_count > 0 || V1.filters.parish === p.code) {
              const label = document.createElementNS(svgNS, 'text');
              label.setAttribute('x', String(p.x + 3));
              label.setAttribute('y', String(p.y + 1));
              label.setAttribute('fill', 'var(--text-primary)');
              label.setAttribute('font-size', '2.8');
              label.setAttribute('font-weight', '600');
              label.textContent = p.name.split(' ')[0];
              g.appendChild(label);
            }
            svg.appendChild(g);
          }
          return svg;
        })()
      ),
      /* Issue Trends Stacked Bar Chart (Carbon Blues & Neutral Slates: #0F62FE, #4589FF, #A6C8FF, #8D8D8D) */
      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('div', {},
            h('h2', { className: 'v1-section-title' }, 'Field Issues & Bottlenecks Over Time'),
            h('p', { className: 'v1-chart-subtitle' }, `Active Filter: ${activePeriodLabel} · Category: ${V1.filters.issueCategory}`)
          ),
          h('div', { className: 'v1-chart-legend' },
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: '#8D8D8D' } }),
              'Minor'
            ),
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: '#4589FF' } }),
              'Medium'
            ),
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: '#0F62FE' } }),
              'Major'
            )
          )
        ),
        h('div', { className: 'v1-chips', style: { marginBottom: '10px' } },
          ['ALL', ...(V1.data?.issue_categories || [])].map(cat =>
            h('button', {
              type: 'button',
              className: 'v1-chip' + (V1.filters.issueCategory === cat ? ' active' : ''),
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
              h('span', { className: 'v1-mono', style: { fontSize: '0.6875rem', fontWeight: '700', marginBottom: '4px' } }, total ? String(total) : ''),
              h('div', { className: 'v1-bar-stack' },
                h('div', { style: { height: `${hMinor}px`, background: '#8D8D8D' }, title: `Minor: ${m.MINOR}` }),
                h('div', { style: { height: `${hMed}px`, background: '#4589FF' }, title: `Medium: ${m.MEDIUM}` }),
                h('div', { style: { height: `${hMaj}px`, background: '#0F62FE' }, title: `Major: ${m.MAJOR}` })
              ),
              h('span', { className: 'v1-tabular', style: { fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' } }, m.month)
            );
          })
        )
      )
    ),
    /* Expandable Outcome & Impact Accordions (Carbon Table on Desktop -> Polaris Resource Cards on < 768px) */
    h('h2', { className: 'v1-section-title', style: { marginBottom: '12px' } },
      'Strategic Outcomes & Impact Accordions'
    ),
    (analytics.accordions || []).map((acc, idx) =>
      h('details', { className: 'v1-accordion', open: idx === 0 },
        h('summary', {},
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
              h('span', {
                className: 'v1-legend-swatch',
                style: { background: chartBluesAndSlates[idx % chartBluesAndSlates.length] },
              }),
              renderLozenge(localize(acc.axis_labels), 'neutral')
            ),
            h('h3', { className: 'v1-accordion-title' }, localize(acc.labels))
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
            h('div', { style: { width: '140px' } },
              h('div', { className: 'v1-tabular', style: { fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' } }, `Actions: ${acc.completion_pct}%`),
              h('div', { className: 'v1-progress-bar' },
                h('div', { className: 'v1-progress-fill', style: { width: `${acc.completion_pct}%` } })
              )
            ),
            renderLozenge(L('impact_' + acc.impact_rating), acc.impact_rating)
          )
        ),
        h('div', { className: 'v1-accordion-body' },
          h('div', { className: 'v1-field-label', style: { marginBottom: '8px' } }, '1. Underlying Parish Actions'),
          /* Desktop Carbon Table */
          h('table', { className: 'v1-data-table' },
            h('thead', {},
              h('tr', {},
                h('th', {}, 'Action Title'),
                h('th', {}, 'Parish'),
                h('th', {}, 'Completed / Target'),
                h('th', {}, 'Completion %'),
                h('th', {}, 'Impact Rating')
              )
            ),
            h('tbody', {},
              acc.tasks.map(t =>
                h('tr', {},
                  h('td', { style: { fontWeight: '600' } }, localize(t.titles)),
                  h('td', {}, t.parish_name),
                  h('td', { className: 'v1-mono' }, `${t.completed_units} / ${t.planned_target} ${t.unit_label}`),
                  h('td', { className: 'v1-mono' }, `${t.completion_pct}%`),
                  h('td', {}, renderLozenge(L('impact_' + t.impact_rating), t.impact_rating))
                )
              )
            )
          ),
          /* Section 5.1: Mobile (< 768px) Shopify Polaris Resource Cards */
          h('div', { className: 'v1-polaris-resource-list' },
            acc.tasks.map(t =>
              h('div', {
                className: 'v1-resource-card',
                onClick: () => {
                  const fullTask = (V1.data?.tasks || []).find(x => x.id === t.id);
                  if (fullTask) {
                    V1.workspace = 'tasks';
                    openWizardForTask(fullTask, fullTask.latest_log);
                  }
                },
              },
                h('div', { className: 'v1-resource-top' },
                  h('strong', { style: { fontSize: '0.875rem' } }, localize(t.titles)),
                  renderLozenge(L('impact_' + t.impact_rating), t.impact_rating)
                ),
                h('div', { className: 'v1-resource-middle' }, `${t.parish_name} Parish · Oct 2026`),
                h('div', { className: 'v1-resource-bottom' },
                  h('div', { style: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px' } },
                    h('div', { className: 'v1-progress-bar' },
                      h('div', { className: 'v1-progress-fill', style: { width: `${t.completion_pct}%` } })
                    ),
                    h('span', { className: 'v1-mono', style: { fontSize: '0.75rem' } }, `${t.completed_units}/${t.planned_target} completed`)
                  ),
                  msIcon('chevron_right', 20)
                )
              )
            )
          ),
          acc.stories.length || acc.documents.length
            ? h('div', { style: { marginTop: '14px' } },
                h('div', { className: 'v1-field-label', style: { marginBottom: '6px' } }, '2. Stories of Change & Attached Impact Evidence'),
                acc.stories.map(st =>
                  h('p', { style: { margin: '4px 0', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-primary)' } }, `"${st.text}" — ${st.parish} (${st.date})`)
                ),
                h('div', { className: 'v1-chips', style: { marginTop: '6px' } },
                  acc.documents.map(doc => renderLozenge(`${doc.name} (${doc.parish})`, 'GOOD'))
                )
              )
            : null,
          /* Section 4: Neutral Issue Callout Boxes in Accordion */
          acc.issues.length
            ? h('div', { style: { marginTop: '14px' } },
                h('div', { className: 'v1-field-label', style: { marginBottom: '6px' } }, '3. Under-Achievement Explanations & Field Issues'),
                acc.issues.map(iss =>
                  h('div', { className: 'v1-issue-callout', style: { marginBottom: '6px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                      renderLozenge(`${iss.severity} Issue`, iss.severity),
                      h('span', {}, `${iss.parish} (${iss.categories.join(', ')}): ${iss.note}`)
                    )
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
    renderBreadcrumbs(L('nav_exports')),
    h('div', { className: 'v1-page-header' },
      h('div', {},
        h('h1', { className: 'v1-page-title' }, L('nav_exports')),
        h('p', { className: 'v1-page-subtitle' },
          'One-click Word, Excel, CSV, and PDF exports with customizable column presets and guided spreadsheet import.'
        )
      )
    ),
    h('div', { className: 'v1-analytics-split' },
      /* Left Panel: One-Click Export Builder (Primary Button Here) */
      h('div', { className: 'v1-panel' },
        h('h2', { className: 'v1-section-title', style: { marginBottom: '12px' } }, '1. Export Clean Reports & Data'),
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Choose Report Type'),
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
          )
        ),
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'File Format'),
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
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Column Header Preset (For Excel & CSV)'),
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
        }, h('span', {}, 'Download Report Now'), msIcon('download', 20))
      ),
      /* Right Panel: Guided Bulk CSV Import (Neutral Outline Action Button) */
      h('div', { className: 'v1-panel' },
        h('h2', { className: 'v1-section-title', style: { marginBottom: '8px' } }, '2. Guided Bulk Spreadsheet Import (CSV)'),
        h('p', { className: 'v1-page-subtitle', style: { marginBottom: '14px' } },
          'Upload a CSV file from field enumerators. If any column name is different, the system asks you which column to use in plain language.'
        ),
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Select CSV File'),
          h('input', {
            type: 'file',
            className: 'v1-input' + (V1.csvImportState?.error ? ' has-error' : ''),
            accept: '.csv',
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
          V1.csvImportState?.error
            ? h('div', { className: 'v1-field-error', role: 'alert' }, msIcon('warning', 16), h('span', {}, V1.csvImportState.error))
            : null
        ),
        V1.csvImportState && !V1.csvImportState.error
          ? h('div', {},
              V1.csvImportState.missing?.length
                ? h('div', {},
                    V1.csvImportState.missing.map(m =>
                      /* Section 3: Invalid select input gets 2px solid #DA1E28 border + inline error message underneath */
                      h('div', { className: 'v1-field' },
                        h('label', { className: 'v1-field-label' }, `Map Column: ${m.key}`),
                        h('select', {
                          className: 'v1-select has-error',
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
                        ),
                        h('div', { className: 'v1-field-error', role: 'alert' },
                          msIcon('warning', 16),
                          h('span', {}, m.message)
                        )
                      )
                    )
                  )
                : h('div', {},
                    h('div', { style: { marginBottom: '12px' } },
                      renderLozenge(`All columns matched (${V1.csvImportState.total_rows} rows ready)`, 'GREAT')
                    ),
                    h('button', {
                      type: 'button',
                      className: 'v1-btn btn-outline v1-btn-outline',
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
                    }, h('span', {}, 'Import All Rows Now'), msIcon('upload_file', 20))
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
  const isDark = V1.theme === 'dark';

  let syncDotVariant = 'synced';
  let syncText = L('sync_synced');
  if (V1.syncingState) {
    syncDotVariant = 'syncing';
    syncText = L('sync_updating', V1.syncingState.current, V1.syncingState.total);
  } else if (qLen > 0 || V1.simulateOffline) {
    syncDotVariant = 'offline';
    syncText = L('sync_offline', qLen);
  }

  /* Section 4: Core Functional Mapping for Navigation Icons */
  const navItems = [
    { id: 'tasks', icon: 'check_box', label: L('nav_tasks'), badge: pendingTasksCount },
    { id: 'approvals', icon: 'fact_check', label: L('nav_approvals'), badge: pendingApprovalsCount },
    { id: 'analytics', icon: 'insights', label: L('nav_analytics'), badge: null },
    { id: 'exports', icon: 'download', label: L('nav_exports'), badge: null },
  ];

  const shell = h('div', {},
    /* Single 56px Top Bar */
    h('header', { className: 'v1-topbar' },
      h('div', { className: 'v1-brand' },
        h('span', { className: 'v1-brand-badge' }, 'CDJP BUTARE'),
        h('span', { className: 'v1-brand-text' }, 'APSE')
      ),
      h('div', { className: 'v1-search-wrap' },
        h('span', { className: 'v1-search-icon' }, msIcon('search', 20)),
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
        /* Section 1: Neutral Sync Badge with 8px Status Dot */
        h('button', {
          type: 'button',
          className: 'badge v1-sync-pill',
          title: qLen > 0 ? 'Click to synchronize queued offline records now' : 'Click to toggle offline mode simulation',
          onClick: () => {
            if (qLen > 0) {
              syncOfflineQueue();
            } else {
              V1.simulateOffline = !V1.simulateOffline;
              renderApp();
            }
          },
        },
          h('span', {
            className: `badge-dot ${syncDotVariant}`,
            style: { backgroundColor: DOT_TOKEN_MAP[syncDotVariant] },
            'aria-hidden': 'true',
          }),
          h('span', {}, syncText)
        ),
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
        h('button', {
          type: 'button',
          className: 'v1-theme-toggle',
          title: 'Toggle Light / Dark Theme',
          onClick: () => {
            V1.theme = isDark ? 'light' : 'dark';
            localStorage.setItem('apse-theme', V1.theme);
            renderApp();
          },
        },
          msIcon(isDark ? 'light_mode' : 'dark_mode', 16),
          h('span', {}, isDark ? 'Light' : 'Dark')
        ),
        h('span', { className: 'v1-user-pill' }, V1.data?.user?.name || 'LOCAL_MEL')
      )
    ),
    /* Main Shell: Fixed 240px Left Navigation + Fluid 16-Column Workspace Canvas */
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
              msIcon(item.icon, 20),
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
          h('span', { className: 'v1-nav-label' },
            msIcon('lock', 20),
            h('span', {}, L('nav_confidential'))
          )
        ),
        h('div', { className: 'v1-sidebar-footer' },
          h('label', { className: 'v1-field-label', style: { marginBottom: '4px' } }, 'Surface Theme'),
          h('div', { className: 'v1-segmented', style: { width: '100%' } },
            [
              ['light', 'Light'],
              ['dark', 'Dark'],
              ['soft', 'Soft'],
              ['contrast', 'Contrast'],
            ].map(([th, lbl]) =>
              h('button', {
                type: 'button',
                className: 'v1-seg-btn' + (V1.theme === th || (th === 'light' && V1.theme === 'cdjp') ? ' active' : ''),
                style: { flex: 1, padding: '4px 6px', fontSize: '0.6875rem' },
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
    /* Mobile 4-Tab Bottom Navigation Bar (24px Material Symbols) */
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
          msIcon(item.icon, 24),
          h('span', {}, item.label)
        )
      )
    ),
    renderMobileBottomSheet()
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
