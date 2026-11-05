'use strict';
/* ==========================================================================
   APSE v1.0 Unified Design System Frontend
   - IBM Carbon Desktop Grid (16-col), Breadcrumbs, Forms & Data Viz
   - Atlassian Typography (Inter + IBM Plex Mono tabular-nums), Lozenges & Light/Dark Themes
   - Material Symbols Outlined Iconography (16px / 20px / 24px)
   - Shopify Polaris Resource Cards & Cisco Momentum Slide-Up Bottom Sheets (< 768px)
   ========================================================================== */

const V1 = {
  lang: localStorage.getItem('apse-v1-lang') || 'en',
  theme: localStorage.getItem('apse-theme') || 'light',
  workspace: 'tasks', // 'tasks' | 'approvals' | 'analytics' | 'exports'
  searchQuery: '',
  mobileNavOpen: false,
  leftSidebarCollapsed: false,
  rightSidecarOpen: false,
  rightSidecarTab: 'ps_planning',
  filters: {
    period: 'ALL',
    axis: '',
    parish: '',
    status: 'ALL',
    approvalStage: 'ALL',
    issueCategory: 'ALL',
    dateFrom: '',
    dateTo: '',
  },
  data: null,
  offlineQueue: JSON.parse(localStorage.getItem('apse-v1-offline-queue') || '[]'),
  simulateOffline: false,
  syncingState: null, // null | { current: 1, total: 3 }
  syncModal: false,
  syncFeedback: null,
  remoteUrlDraft: null,
  wizard: null, // Active 4-step guided form state
  newTaskModal: false,
  personaModal: false,
  returningLog: null, // { id, step: 2, note: '' }
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
  person: 'M12 12q-1.65 0-2.825-1.175T8 8q0-1.65 1.175-2.825T12 4q1.65 0 2.825 1.175T16 8q0 1.65-1.175 2.825T12 12Zm-8 8v-2.8q0-.85.438-1.563T5.6 14.55q1.55-.775 3.15-1.163T12 13q1.65 0 3.25.388t3.15 1.162q.725.375 1.163 1.088T20 17.2V20H4Z',
  verified_user: 'm10.6 16.2 5.65-5.65-1.425-1.425-4.225 4.225-2.1-2.1L7.075 12.675 10.6 16.2ZM12 22q-3.475-.875-5.738-3.988T4 11.1V5l8-3 8 3v6.1q0 3.8-2.262 6.913T12 22Z',
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
    axis_A1: 'Healing, Unity & Reconciliation',
    axis_A2: 'Peaceful Conflict Resolution',
    axis_A3: 'Environmental Care & Climate Action',
    axis_A4: 'Human Rights & Legal Aid',
    axis_A5: 'Parish Committee & Team Strengthening',
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
    nav_my_space: 'My Space',
    nav_seizure: 'Seizure (F01–F45)',
    nav_files_validation: 'Files & Validation',
    nav_learning: 'Learning',
    nav_reports: 'Reports (R01–R13)',
    nav_offline_vault: 'Prepare / Open Offline',
    nav_offline_sync: 'Sync Offline Queue',
    nav_ps_planning: 'PS Planning',
    nav_metadata: 'Metadata',
    nav_feedback: 'Back to the File',
    nav_projects_ops: 'Projects & Operations',
    nav_staff_eval: 'Staff Achievements',
    nav_create_form: 'Create / Share Form',
    nav_drafts: 'Drafts in Progress',
    nav_ps_dashboard: 'PS Dashboard',
    nav_assistant: 'Assistant & Controls',
    nav_contacts: 'Contacts',
    nav_data_structure: 'Data Structure & Flow',
    nav_timesheets: 'Timesheets',
    nav_mel_admin: 'MEL Administration',

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
    axis_A1: 'Isanamitima, Ubumwe n’Ubwiyunge',
    axis_A2: 'Gukemura Amakimbirane mu Mahoro',
    axis_A3: 'Kubungabunga Ibidukikije',
    axis_A4: 'Uburenganzira bwa Muntu n’Ubuvugizi',
    axis_A5: 'Kubaka Ubushobozi bwa Komite n’Abakozi',
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
    nav_my_space: 'Umwanya Wanjye',
    nav_seizure: 'Kwandika Raporo',
    nav_files_validation: 'Dosiye n’Igenzura',
    nav_learning: 'Kwiga n’Ubumenyi',
    nav_reports: 'Raporo n’Incamake',
    nav_offline_vault: 'Tegura / Fungura Offline',
    nav_offline_sync: 'Kuhuza Dosiye Offline',
    nav_ps_planning: 'Igenamigambi rya PS',
    nav_metadata: 'Amakuru y’Ibanze',
    nav_feedback: 'Ibitekerezo ku Dosiye',
    nav_projects_ops: 'Imishinga n’Ibikorwa',
    nav_staff_eval: 'Isuzuma ry’Abakozi',
    nav_create_form: 'Kurema / Gusangiza Ifishi',
    nav_drafts: 'Inyandiko zitaranozwa',
    nav_ps_dashboard: 'Imbonerahamwe ya PS',
    nav_assistant: 'Umufasha n’Igenzura',
    nav_contacts: 'Aderesi z’Itumanaho',
    nav_data_structure: 'Imiterere n’Ihererekanya',
    nav_timesheets: 'Amakarita y’Amasaha',
    nav_mel_admin: 'Ubuyobozi bwa MEL',

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
    axis_A1: 'Guérison, Unité et Réconciliation',
    axis_A2: 'Résolution Pacifique des Conflits',
    axis_A3: 'Justice Écologique et Environnement',
    axis_A4: 'Droits Humains et Aide Juridique',
    axis_A5: 'Renforcement des Comités et Équipes',
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
    nav_my_space: 'Mon espace',
    nav_seizure: 'Saisie (F01–F45)',
    nav_files_validation: 'Dossiers et validation',
    nav_learning: 'Apprentissage',
    nav_reports: 'Rapports (R01–R13)',
    nav_offline_vault: 'Préparer / ouvrir hors ligne',
    nav_offline_sync: 'Synchroniser la file hors ligne',
    nav_ps_planning: 'Planification du PS',
    nav_metadata: 'Métadonnées',
    nav_feedback: 'Retours sur les dossiers',
    nav_projects_ops: 'Projets et opérations',
    nav_staff_eval: 'Évaluation du personnel',
    nav_create_form: 'Créer / partager un formulaire',
    nav_drafts: 'Brouillons en cours',
    nav_ps_dashboard: 'Tableau de bord PS',
    nav_assistant: 'Assistant et contrôles',
    nav_contacts: 'Contacts',
    nav_data_structure: 'Structure et flux des données',
    nav_timesheets: 'Feuilles de temps',
    nav_mel_admin: 'Administration MEL',

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
    axis_A1: 'Uponyaji, Umoja na Upatanishishi',
    axis_A2: 'Utatuzi wa Migogoro kwa Amani',
    axis_A3: 'Utunzaji wa Mazingira',
    axis_A4: 'Haki za Binadamu na Msaada wa Kisheria',
    axis_A5: 'Kuimarisha Kamati na Timu',
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
    nav_my_space: 'Nafasi Yangu',
    nav_seizure: 'Kuingiza Data',
    nav_files_validation: 'Mafaili na Uthibitisho',
    nav_learning: 'Mafunzo na Maarifa',
    nav_reports: 'Ripoti na Takwimu',
    nav_offline_vault: 'Andaa / Fungua Nje ya Mtandao',
    nav_offline_sync: 'Sawazisha Nje ya Mtandao',
    nav_ps_planning: 'Upangaji wa PS',
    nav_metadata: 'Data za Msingi',
    nav_feedback: 'Maoni ya Faili',
    nav_projects_ops: 'Miradi na Uendeshaji',
    nav_staff_eval: 'Tathmini ya Wafanyakazi',
    nav_create_form: 'Tengeneza / Shiriki Fomu',
    nav_drafts: 'Rasimu Zinazoendelea',
    nav_ps_dashboard: 'Dashibodi ya PS',
    nav_assistant: 'Msaidizi na Udhibiti',
    nav_contacts: 'Mawasiliano',
    nav_data_structure: 'Muundo na Mtiririko wa Data',
    nav_timesheets: 'Karatasi za Saa',
    nav_mel_admin: 'Utawala wa MEL',

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

function getThemesList() {
  return [
    { code: '', label: L('all_themes') },
    { code: 'A1', label: L('axis_A1') },
    { code: 'A2', label: L('axis_A2') },
    { code: 'A3', label: L('axis_A3') },
    { code: 'A4', label: L('axis_A4') },
    { code: 'A5', label: L('axis_A5') },
  ];
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

/* Section 2.2: Atlassian Lozenge / Status Tag Helper */
function renderLozenge(text, variant = 'neutral', iconName = null) {
  return h('span', { className: `v1-badge ${variant}` },
    iconName ? msIcon(iconName, 16) : null,
    h('span', {}, text)
  );
}

async function loadBootstrap() {
  const q = new URLSearchParams();
  if (V1.filters.parish) q.set('parish', V1.filters.parish);
  if (V1.filters.period && V1.filters.period !== 'ALL') q.set('period', V1.filters.period);
  if (V1.filters.axis) q.set('axis', V1.filters.axis);
  if (V1.filters.dateFrom) q.set('date_from', V1.filters.dateFrom);
  if (V1.filters.dateTo) q.set('date_to', V1.filters.dateTo);
  try {
    V1.data = await apiV1('/v1/bootstrap?' + q.toString());
    const allowedWorkspaces = V1.data?.user?.permissions?.workspaces || ['tasks', 'approvals', 'analytics', 'exports'];
    if (!allowedWorkspaces.includes(V1.workspace)) {
      V1.workspace = V1.data?.user?.permissions?.default_workspace || allowedWorkspaces[0] || 'tasks';
    }
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

async function runDatabaseSyncNow() {
  try {
    V1.syncFeedback = { type: 'info', text: 'Synchronizing local SQLite database with Central Server...' };
    renderApp();
    if (V1.offlineQueue.length) {
      await syncOfflineQueue();
    }
    const res = await apiV1('/v1/sync/run', 'POST', {});
    await loadBootstrap();
    const lr = res.last_run || { pushed: 0, pulled: 0 };
    V1.syncFeedback = {
      type: 'GREAT',
      text: `Sync complete ✓ Uploaded ${lr.pushed} local record(s) to Central DB; downloaded ${lr.pulled} remote update(s). Schema v${res.schema_version}.`,
    };
    renderApp();
  } catch (err) {
    V1.syncFeedback = { type: 'LOW', text: err.message || 'Database sync failed.' };
    renderApp();
  }
}

function openWizardForTask(task, existingLog = null, forceStep = null) {
  const savedDraft = JSON.parse(localStorage.getItem('apse-v1-draft-' + task.id) || 'null');
  const parishes = V1.data?.parishes || [];
  const pcode = existingLog?.parish_code || task.parish_code || V1.data?.user?.assigned_parish || 'PAR-01';
  const pObj = parishes.find(p => p.code === pcode) || parishes[0] || { centrales: [{ name: 'Centre' }] };
  const defaultCentrale = existingLog?.centrale || savedDraft?.centrale || pObj.centrales?.[0]?.name || 'Centre';
  const defaultPrepMode = V1.data?.user?.permissions?.prep_mode || 'PAIR';

  V1.wizard = {
    step: existingLog?.payload?.correction_step || forceStep || savedDraft?.step || 1,
    task,
    id: existingLog?.id || null,
    parish_code: pcode,
    centrale: defaultCentrale,
    event_date: existingLog?.event_date || savedDraft?.event_date || '2026-10-23',
    collection_mode: existingLog?.collection_mode || savedDraft?.collection_mode || 'ENUMERATOR',
    volet: existingLog?.volet || existingLog?.payload?.volet || savedDraft?.volet || 'MEDIATEURS',
    prep_mode: existingLog?.prep_mode || existingLog?.payload?.prep_mode || savedDraft?.prep_mode || defaultPrepMode,
    prep_names: existingLog?.prep_names?.length
      ? [...existingLog.prep_names]
      : (savedDraft?.prep_names || (defaultPrepMode === 'COMMITTEE'
          ? ['Président CPJP', 'Vice-Président', 'Secrétaire', 'Trésorier', 'Conseiller 1', 'Conseiller 2', 'Aumônier Paroissial']
          : ['Ndayisaba Jean', 'Mukamana Claire'])),
    safeguards: existingLog?.safeguards || existingLog?.payload?.safeguards || savedDraft?.safeguards || { cnv: true, dnh: true, trauma: true },
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
function renderStepperInput(labelTxt, value, onChange, min = 0) {
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
        className: 'v1-step-input v1-tabular',
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

/* Calendar Date-Range & Pastoral Period Filter Widget (Finding #5) */
function renderDateRangeWidget() {
  const hasDates = !!(V1.filters.dateFrom || V1.filters.dateTo);
  return h('div', { className: 'v1-date-range-bar' },
    h('div', { className: 'v1-segmented' },
      [
        ['ALL', L('period_all')],
        ['Q1', L('period_q1')],
        ['Q2', 'Q2 (Dec–Feb)'],
        ['Q3', 'Q3 (Mar–May)'],
        ['Q4', 'Q4 (Jun–Aug)'],
        ['AP1', L('period_ap1')],
      ].map(([code, lbl]) =>
        h('button', {
          type: 'button',
          className: 'v1-seg-btn' + (V1.filters.period === code ? ' active' : ''),
          onClick: async () => {
            V1.filters.period = code;
            await loadBootstrap();
            renderApp();
          },
        }, lbl)
      )
    ),
    h('div', { className: 'v1-date-inputs' },
      h('label', { className: 'v1-date-label' },
        msIcon('calendar_today', 16),
        h('span', {}, 'From:'),
        h('input', {
          type: 'date',
          id: 'v1-filter-date-from',
          className: 'v1-input v1-date-picker',
          value: V1.filters.dateFrom || '',
          onChange: async e => {
            V1.filters.dateFrom = e.target.value;
            await loadBootstrap();
            renderApp();
          },
        })
      ),
      h('label', { className: 'v1-date-label' },
        h('span', {}, 'To:'),
        h('input', {
          type: 'date',
          id: 'v1-filter-date-to',
          className: 'v1-input v1-date-picker',
          value: V1.filters.dateTo || '',
          onChange: async e => {
            V1.filters.dateTo = e.target.value;
            await loadBootstrap();
            renderApp();
          },
        })
      ),
      hasDates
        ? h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-ghost v1-btn-sm',
            onClick: async () => {
              V1.filters.dateFrom = '';
              V1.filters.dateTo = '';
              await loadBootstrap();
              renderApp();
            },
          }, 'Clear Dates')
        : null
    )
  );
}

/* Role-Specific Institutional Mandate & Priority Banner (Findings #6 & #7) */
function renderRoleWorkspaceBanner() {
  const user = V1.data?.user || {};
  const perms = user.permissions || {};
  const tier = perms.tier || 'mel';
  const scopeText = user.assigned_parish ? `Parish Scope (${user.assigned_parish})` : 'Diocesan Scope (All 27 Parishes)';
  const tierBadges = {
    field: { label: 'Field Enumerator (CCJP / CEB)', tone: 'info' },
    cpjp: { label: 'Parish CPJP Committee (7-Member + Chaplain)', tone: 'GOOD' },
    staff: { label: 'CDJP Diocesan Project Staff', tone: 'info' },
    mel: { label: 'CDJP Diocesan M&E (Suivi-Évaluation)', tone: 'GREAT' },
    coordination: { label: 'CDJP Diocesan Coordination', tone: 'GREAT' },
    direction: { label: 'CDJP Diocesan Direction (Final Sign-Off)', tone: 'GREAT' },
  };
  const badge = tierBadges[tier] || tierBadges.mel;
  return h('div', { className: 'v1-role-banner' },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
      renderLozenge(badge.label, badge.tone, 'verified_user'),
      renderLozenge(scopeText, 'neutral', 'location_on'),
      perms.prep_mode === 'COMMITTEE'
        ? renderLozenge('7-Member CPJP + Chaplain Prep', 'neutral')
        : renderLozenge('2-Person Pair Prep (CCJP/CEB)', 'neutral'),
      !perms.can_create_task
        ? renderLozenge('Execution Only (No Plan Creation)', 'warn')
        : renderLozenge(`Plan Horizons: ${(perms.plan_horizons || []).join(', ')}`, 'neutral')
    ),
    h('div', { className: 'v1-role-banner-copy' },
      perms.mandate || 'Institutional role-scoped workspace aligned with CDJP Butare governance rules.'
    )
  );
}

/* Local-to-Remote Central DB Sync & Versioned Migrations Modal (Findings #1 & #2) */
function renderSyncModal() {
  if (!V1.syncModal) return null;
  const sync = V1.data?.sync || { outbox: { pending: 0, synced: 0, pending_tasks: 0, pending_logs: 0 }, schema_version: 3, history: [] };
  const outbox = sync.outbox || { pending: 0, synced: 0, pending_tasks: 0, pending_logs: 0 };

  return h('div', {
    className: 'v1-sheet-backdrop',
    onClick: e => {
      if (e.target.classList.contains('v1-sheet-backdrop')) {
        V1.syncModal = false;
        renderApp();
      }
    },
  },
    h('div', { className: 'v1-bottom-sheet', role: 'dialog', 'aria-modal': 'true', style: { borderRadius: 'var(--radius-md)', margin: 'auto', maxWidth: '680px' } },
      h('div', { className: 'v1-sheet-header' },
        h('h2', { className: 'v1-section-title' }, 'Local SQLite → Central Server Sync & Schema Migrations'),
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-ghost v1-btn-sm',
          onClick: () => { V1.syncModal = false; renderApp(); },
        }, msIcon('close', 20))
      ),
      h('div', { className: 'v1-sheet-body' },
        V1.syncFeedback
          ? h('div', {
              style: {
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '12px',
                background: V1.syncFeedback.type === 'LOW' ? 'var(--tag-low-bg)' : 'var(--tag-great-bg)',
                color: V1.syncFeedback.type === 'LOW' ? 'var(--tag-low-text)' : 'var(--tag-great-text)',
                fontWeight: '600',
                fontSize: '0.8125rem',
              },
            }, V1.syncFeedback.text)
          : null,
        h('div', { className: 'v1-kpi-grid', style: { marginBottom: '14px' } },
          h('div', { className: 'v1-kpi-card', style: { gridColumn: 'span 5' } },
            h('span', {}, 'Local Outbox Pending Upload'),
            h('strong', { className: 'v1-kpi-value' }, String(outbox.pending || 0)),
            h('div', { className: 'v1-field-helper' }, `${outbox.pending_tasks || 0} Tasks · ${outbox.pending_logs || 0} Activity Logs`)
          ),
          h('div', { className: 'v1-kpi-card', style: { gridColumn: 'span 5' } },
            h('span', {}, 'Synced to Central DB'),
            h('strong', { className: 'v1-kpi-value' }, String(outbox.synced || 0)),
            h('div', { className: 'v1-field-helper' }, sync.last_sync_at ? `Last: ${sync.last_sync_at.slice(0, 19).replace('T', ' ')}` : 'Ready for initial sync')
          ),
          h('div', { className: 'v1-kpi-card', style: { gridColumn: 'span 6' } },
            h('span', {}, 'DB Schema Migration Version'),
            h('strong', { className: 'v1-kpi-value' }, `v${sync.schema_version || 3}`),
            h('div', { className: 'v1-field-helper' }, '001_baseline · 002_workflow · 003_sync_outbox')
          )
        ),
        h('div', { style: { background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '14px' } },
          h('label', { className: 'v1-field-label' }, 'Remote / Central Database Target Endpoint'),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
            h('input', {
              id: 'v1-sync-remote-url',
              type: 'text',
              className: 'v1-input',
              style: { flex: '1 1 260px', minHeight: '36px' },
              value: V1.remoteUrlDraft ?? (sync.remote_url || 'central://cdjp-butare-central.sqlite'),
              placeholder: 'central://cdjp-butare-central.sqlite or https://apse.cdjp-butare.org',
              onChange: e => { V1.remoteUrlDraft = e.target.value; },
            }),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary v1-btn-sm',
              onClick: async () => {
                const url = document.getElementById('v1-sync-remote-url')?.value || V1.remoteUrlDraft || 'central://cdjp-butare-central.sqlite';
                await apiV1('/v1/sync/configure', 'POST', { remote_url: url });
                await loadBootstrap();
                V1.syncFeedback = { type: 'GREAT', text: `Target endpoint saved: ${url}` };
                renderApp();
              },
            }, 'Save Target')
          ),
          h('div', { className: 'v1-field-helper', style: { marginTop: '6px' } },
            'Reads unsynced records from the local SQLite database (sync_outbox), verifies schema migration compatibility, uploads local tasks/logs, and pulls diocesan approvals.'
          )
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' } },
          h('button', {
            type: 'button',
            id: 'v1-run-db-sync-btn',
            className: 'v1-btn',
            onClick: () => runDatabaseSyncNow(),
          }, msIcon('sync', 18), h('span', {}, 'Sync Local DB to Central Server Now')),
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-ghost v1-btn-sm',
            onClick: () => {
              V1.simulateOffline = !V1.simulateOffline;
              renderApp();
            },
          }, V1.simulateOffline ? 'Disable Offline Simulation' : 'Simulate Offline Queue')
        ),
        (sync.history && sync.history.length)
          ? h('div', {},
              h('div', { className: 'v1-field-label', style: { marginBottom: '6px' } }, 'Recent Database Synchronization Audit Log'),
              h('table', { className: 'v1-data-table' },
                h('thead', {},
                  h('tr', {},
                    h('th', {}, 'Timestamp (UTC)'),
                    h('th', {}, 'Target'),
                    h('th', {}, 'Uploaded'),
                    h('th', {}, 'Pulled'),
                    h('th', {}, 'Status')
                  )
                ),
                h('tbody', {},
                  sync.history.slice(0, 5).map(item =>
                    h('tr', {},
                      h('td', { className: 'v1-mono' }, String(item.synced_at || '').slice(0, 19).replace('T', ' ')),
                      h('td', { className: 'v1-mono' }, String(item.target || '')),
                      h('td', { className: 'v1-mono' }, String(item.pushed ?? 0)),
                      h('td', { className: 'v1-mono' }, String(item.pulled ?? 0)),
                      h('td', {}, renderLozenge(item.status || 'SUCCESS', 'GREAT'))
                    )
                  )
                )
              )
            )
          : null
      )
    )
  );
}

/* Section 5.3: Cisco Momentum Slide-Up Mobile Bottom Sheet */
function renderMobileBottomSheet() {
  if (!V1.mobileSheet) return null;
  const parishes = V1.data?.parishes || [];
  const themes = getThemesList();
  const user = V1.data?.user || {};

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
        h('h2', { className: 'v1-section-title' }, V1.mobileSheet === 'location' ? 'Select Parish & Location' : 'Mobile Controls, Account & Filters'),
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-ghost v1-btn-sm',
          onClick: () => { V1.mobileSheet = null; renderApp(); },
        }, msIcon('close', 20))
      ),
      h('div', { className: 'v1-sheet-body' },
        /* Mobile Account & Role Switcher + DB Sync Quick Actions (Finding #4) */
        h('div', { style: { background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
            h('div', {},
              h('div', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' } }, 'Active Account & Role'),
              h('strong', { style: { fontSize: '0.875rem' } }, user.name ? `${user.name} (${user.role || 'M&E'})` : 'LOCAL_MEL (Diocesan M&E)')
            ),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary v1-btn-sm',
              onClick: () => {
                V1.mobileSheet = null;
                V1.personaModal = true;
                renderApp();
              },
            }, msIcon('person', 16), h('span', {}, 'Switch Account / Sign In'))
          ),
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-secondary v1-btn-sm',
            onClick: () => {
              V1.mobileSheet = null;
              V1.syncModal = true;
              renderApp();
            },
          }, msIcon('sync', 16), h('span', {}, `Sync Local DB (${V1.data?.sync?.outbox?.pending ?? 0} Pending)`))
        ),
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Calendar Date Range (From / To)'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
            h('input', {
              type: 'date',
              className: 'v1-input',
              value: V1.filters.dateFrom || '',
              onChange: e => { V1.filters.dateFrom = e.target.value; renderApp(); },
            }),
            h('input', {
              type: 'date',
              className: 'v1-input',
              value: V1.filters.dateTo || '',
              onChange: e => { V1.filters.dateTo = e.target.value; renderApp(); },
            })
          )
        ),
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Reporting Period'),
          h('div', { className: 'v1-chips' },
            [
              ['ALL', L('period_all')],
              ['Q1', L('period_q1')],
              ['Q2', 'Q2'],
              ['Q3', 'Q3'],
              ['Q4', 'Q4'],
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
          className: 'v1-btn v1-btn-ghost',
          onClick: async () => {
            V1.filters.period = 'ALL';
            V1.filters.axis = '';
            V1.filters.parish = '';
            V1.filters.status = 'ALL';
            V1.filters.dateFrom = '';
            V1.filters.dateTo = '';
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

/* Web GUI Role & Parish Persona Switcher Modal (Replaces CLI Account Management) */
function renderPersonaModal() {
  if (!V1.personaModal) return null;
  const personas = V1.data?.personas || [];
  const activeKey = V1.data?.user?.active_persona || 'mel_diocese';

  return h('div', {
    className: 'v1-sheet-backdrop',
    onClick: e => {
      if (e.target.classList.contains('v1-sheet-backdrop')) {
        V1.personaModal = false;
        renderApp();
      }
    },
  },
    h('div', { className: 'v1-bottom-sheet', role: 'dialog', 'aria-modal': 'true', style: { borderRadius: 'var(--radius-md)', margin: 'auto' } },
      h('div', { className: 'v1-sheet-header' },
        h('h2', { className: 'v1-section-title' }, 'Switch Active User Role & Parish Scope (Web GUI)'),
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-ghost v1-btn-sm',
          onClick: () => { V1.personaModal = false; renderApp(); },
        }, msIcon('close', 20))
      ),
      h('div', { className: 'v1-sheet-body' },
        h('div', { style: { background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '14px' } },
          h('strong', { style: { display: 'block', marginBottom: '6px', fontSize: '0.8125rem' } }, 'Web GUI Account Sign-In (Password Auth)'),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
            h('input', {
              id: 'v1-web-login-user',
              type: 'text',
              className: 'v1-input',
              style: { flex: '1 1 140px', minHeight: '36px' },
              placeholder: 'Username (e.g. mel_diocese, cpjp_gakoma)',
              value: V1.loginUser || activeKey,
              onChange: e => { V1.loginUser = e.target.value; }
            }),
            h('input', {
              id: 'v1-web-login-pass',
              type: 'password',
              className: 'v1-input',
              style: { flex: '1 1 140px', minHeight: '36px' },
              placeholder: 'Password (apse2026_butare)',
              value: V1.loginPass || '',
              onChange: e => { V1.loginPass = e.target.value; }
            }),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-sm',
              onClick: async () => {
                try {
                  V1.loginError = '';
                  const u = document.getElementById('v1-web-login-user')?.value || V1.loginUser || activeKey;
                  const p = document.getElementById('v1-web-login-pass')?.value || V1.loginPass || 'apse2026_butare';
                  await apiV1('/v1/auth/login', 'POST', { username: u, password: p });
                  V1.filters.parish = '';
                  V1.personaModal = false;
                  await loadBootstrap();
                  renderApp();
                } catch (err) {
                  V1.loginError = err.message || 'Invalid credentials';
                  renderApp();
                }
              }
            }, 'Sign In')
          ),
          V1.loginError ? h('div', { className: 'v1-field-error', style: { marginTop: '6px' } }, V1.loginError) : null
        ),
        h('p', { className: 'v1-page-subtitle', style: { marginBottom: '12px' } },
          'Or click any Diocesan / Parish role below for instant one-click role switching (no CLI required):'
        ),
        h('div', { className: 'v1-radio-cards', style: { gridTemplateColumns: '1fr' } },
          personas.map(p =>
            h('button', {
              type: 'button',
              className: 'v1-radio-card' + (activeKey === p.key ? ' active' : ''),
              onClick: async () => {
                await apiV1('/v1/persona', 'POST', { persona_key: p.key });
                V1.filters.parish = '';
                V1.personaModal = false;
                await loadBootstrap();
                renderApp();
              },
            },
              h('strong', {}, `${p.name} — ${p.label}`),
              h('span', {}, `Roles: ${p.roles.join(', ')} · Scope: ${p.parish_code ? p.parish_code : 'All 27 Parishes (Diocesan)'}`)
            )
          )
        )
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
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' } },
          renderLozenge(localize(task.axis_labels), 'neutral'),
          renderLozenge(`Target: ${task.planned_target} ${task.unit_label}`, 'info')
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
      ),
      /* Institutional Governance: 4 CPJP Specialist Volets + Preparation Accountability + Safeguards */
      h('div', { className: 'v1-field' },
        h('label', { className: 'v1-field-label' }, 'CPJP Specialist Volet (4 Institutional Commissions)'),
        h('div', { className: 'v1-chips' },
          (V1.data?.volets || [
            { code: 'PARAJURISTES', label: { en: 'Parajuristes (Legal Aid & Land Rights)' } },
            { code: 'MEDIATEURS', label: { en: 'Médiateurs (Peaceful Conflict Resolution)' } },
            { code: 'ABAHUMURIZAMITIMA', label: { en: 'Abahumurizamitima (Trauma Healing)' } },
            { code: 'ISANAMITIMA', label: { en: 'Isanamitima & Unity-Reconciliation' } },
            { code: 'FIELD', label: { en: 'General Community / Ecology Action' } },
          ]).map(v =>
            h('button', {
              type: 'button',
              className: 'v1-chip' + (w.volet === v.code ? ' active' : ''),
              onClick: () => {
                w.volet = v.code;
                saveWizardDraftLocal();
                renderApp();
              },
            }, localize(v.label))
          )
        )
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '12px' } },
        h('div', { className: 'v1-field', style: { marginBottom: 0 } },
          h('label', { className: 'v1-field-label' }, 'Activity Preparation Accountability Mode'),
          h('div', { className: 'v1-segmented' },
            [
              ['PAIR', '2-Person Pair (CCJP / CEB)'],
              ['COMMITTEE', '7-Member CPJP + Chaplain'],
            ].map(([code, lbl]) =>
              h('button', {
                type: 'button',
                className: 'v1-seg-btn' + (w.prep_mode === code ? ' active' : ''),
                onClick: () => {
                  w.prep_mode = code;
                  if (code === 'COMMITTEE' && (!w.prep_names || w.prep_names.length < 7)) {
                    w.prep_names = ['Président CPJP', 'Vice-Président', 'Secrétaire', 'Trésorier', 'Conseiller 1', 'Conseiller 2', 'Aumônier Paroissial'];
                  } else if (code === 'PAIR' && (!w.prep_names || w.prep_names.length < 2)) {
                    w.prep_names = ['Ndayisaba Jean', 'Mukamana Claire'];
                  }
                  saveWizardDraftLocal();
                  renderApp();
                },
              }, lbl)
            )
          ),
          h('input', {
            type: 'text',
            className: 'v1-input',
            style: { marginTop: '8px' },
            placeholder: w.prep_mode === 'COMMITTEE' ? '7 CPJP Committee members + Chaplain (comma-separated)' : '2 preparer names (comma-separated)',
            value: (w.prep_names || []).join(', '),
            onChange: e => {
              w.prep_names = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
              saveWizardDraftLocal();
            },
          })
        ),
        h('div', { className: 'v1-field', style: { marginBottom: 0 } },
          h('label', { className: 'v1-field-label' }, 'Cross-Cutting Institutional Safeguards Verified'),
          h('div', { className: 'v1-chips', style: { marginTop: '4px' } },
            [
              ['cnv', 'Non-Violent Communication (CNV)'],
              ['dnh', 'Do No Harm (DNH)'],
              ['trauma', 'Trauma Healing Sensitivity'],
            ].map(([k, lbl]) =>
              h('button', {
                type: 'button',
                className: 'v1-chip' + (w.safeguards?.[k] ? ' active' : ''),
                onClick: () => {
                  w.safeguards = w.safeguards || { cnv: true, dnh: true, trauma: true };
                  w.safeguards[k] = !w.safeguards[k];
                  saveWizardDraftLocal();
                  renderApp();
                },
              }, (w.safeguards?.[k] ? '✓ ' : '') + lbl)
            )
          )
        )
      )
    );
  } else if (w.step === 2) {
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
          ? renderLozenge(`${ageSum} of ${totalParticipants} participants assigned ✓`, 'GREAT', 'check')
          : h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
              renderLozenge(
                `Age group numbers add up to ${ageSum}, but you entered ${totalParticipants} total participants. ${ageDiff > 0 ? `Add ${ageDiff} more.` : `Remove ${Math.abs(ageDiff)}.`}`,
                'LOW',
                'warning'
              ),
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-secondary v1-btn-sm',
                onClick: () => {
                  w.age_18_35 = Math.max(0, Number(w.age_18_35 || 0) + ageDiff);
                  saveWizardDraftLocal();
                  renderApp();
                },
              }, h('span', {}, 'Auto-Fit Age Groups'))
            )
      ),
      h('div', { className: 'v1-number-grid' },
        renderStepperInput('Under 18 Years', w.age_u18, v => { w.age_u18 = v; saveWizardDraftLocal(); renderApp(); }),
        renderStepperInput('18–35 Years', w.age_18_35, v => { w.age_18_35 = v; saveWizardDraftLocal(); renderApp(); }),
        renderStepperInput('36–64 Years', w.age_36_64, v => { w.age_36_64 = v; saveWizardDraftLocal(); renderApp(); }),
        renderStepperInput('65+ Years', w.age_65, v => { w.age_65 = v; saveWizardDraftLocal(); renderApp(); }),
        renderStepperInput('Persons with Disabilities', w.disability, v => { w.disability = v; saveWizardDraftLocal(); renderApp(); })
      ),
      h('hr', { style: { border: 0, borderTop: '1px solid var(--border-subtle)', margin: '24px 0' } }),
      w.collection_mode === 'ENUMERATOR'
        ? h('div', {},
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' } },
              h('h3', { className: 'v1-task-title' }, 'Individual Respondent Quick-Entry Cards'),
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-secondary v1-btn-sm',
                onClick: () => {
                  w.respondents.push({ code: `RESP-0${w.respondents.length + 1}`, score: 80, resolved_case: true });
                  saveWizardDraftLocal();
                  renderApp();
                },
              }, h('span', {}, '+ Add Respondent'), msIcon('add', 16))
            ),
            w.respondents.map((r, idx) =>
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' } },
                h('span', { className: 'v1-mono', style: { fontWeight: '600', minWidth: '80px' } }, r.code),
                h('label', { className: 'v1-field-label', style: { margin: 0 } }, 'Score (%):'),
                h('input', {
                  type: 'number',
                  className: 'v1-step-input',
                  style: { width: '90px' },
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
      { code: 'NONE', label: 'No Issues', icon: null },
      { code: 'MINOR', label: 'Minor', icon: 'info' },
      { code: 'MEDIUM', label: 'Medium', icon: 'warning' },
      { code: 'MAJOR', label: 'Major', icon: 'error' },
    ];
    stepContent = h('div', {},
      h('div', { style: { background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' } },
          h('div', {},
            h('h3', { className: 'v1-task-title' }, localize(task.outcome_prompt)),
            h('div', { className: 'v1-field-helper' },
              `Minimum Threshold for Good Impact: ${task.min_threshold} · Great Impact Target: ${task.target_threshold}`
            )
          ),
          renderLozenge(
            L('impact_' + previewImpact),
            previewImpact,
            previewImpact === 'GREAT' ? 'check' : (previewImpact === 'LOW' ? 'warning' : 'info')
          )
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
      (w.issue_severity !== 'NONE' || Number(w.outcome_value || 0) < Number(task.min_threshold || 0))
        ? h('div', { style: { background: 'var(--tag-warn-bg)', color: 'var(--tag-warn-text)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '18px' } },
            h('div', { className: 'v1-field' },
              h('label', { className: 'v1-field-label', style: { color: 'var(--tag-warn-text)' } }, 'Select Issue Categories (Filter Chips)'),
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
              h('label', { className: 'v1-field-label', style: { color: 'var(--tag-warn-text)' } }, 'Short Explanation (What happened and what support is needed?)'),
              h('textarea', {
                rows: '3',
                className: 'v1-textarea',
                placeholder: 'Example: Heavy rain delayed transport from distant CEBs...',
                value: w.issue_note,
                onChange: e => { w.issue_note = e.target.value; saveWizardDraftLocal(); },
              })
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
        h('div', { className: 'v1-file-upload-wrap' },
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-secondary v1-file-upload-btn',
            onClick: () => {
              const inp = document.getElementById('wizard_file_input');
              if (inp) inp.click();
            },
          },
            msIcon('upload_file', 18),
            h('span', {}, 'Attach Document / Photo...')
          ),
          h('input', {
            id: 'wizard_file_input',
            type: 'file',
            style: { display: 'none' },
            accept: '.pdf,.png,.jpg,.jpeg',
            onChange: e => {
              const f = e.target.files?.[0];
              if (f && !w.attachments.includes(f.name)) {
                w.attachments.push(f.name);
                saveWizardDraftLocal();
                renderApp();
              }
            },
          })
        ),
        w.attachments.length
          ? h('div', { className: 'v1-chips', style: { marginTop: '8px' } },
              w.attachments.map(a => renderLozenge(a, 'GOOD', 'attach_file'))
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
        h('div', { className: 'v1-kpi-card v1-step4-card-5' },
          h('span', {}, 'Location & Pastoral Period'),
          h('strong', { style: { fontSize: '1.125rem', fontFamily: 'var(--font-sans)' } }, `${currentParish.name} · ${w.centrale}`),
          h('div', { className: 'v1-field-helper' },
            `${w.event_date} (${period.yearLabel} · ${period.quarter})`
          )
        ),
        h('div', { className: 'v1-kpi-card v1-step4-card-5' },
          h('span', {}, 'Total Participants'),
          h('strong', {}, String(totalParticipants)),
          h('div', { className: 'v1-field-helper' },
            `${w.women} Women · ${w.men} Men · ${w.disability} with Disabilities`
          )
        ),
        h('div', { className: 'v1-kpi-card v1-step4-card-6' },
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
        ? h('div', { style: { padding: '12px 16px', background: 'var(--tag-warn-bg)', color: 'var(--tag-warn-text)', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' } },
            msIcon(w.issue_severity === 'MAJOR' ? 'error' : (w.issue_severity === 'MEDIUM' ? 'warning' : 'info'), 20),
            h('div', {},
              h('strong', {}, `Logged Field Issue (${w.issue_severity}): `),
              `${w.issue_categories.join(', ') || 'General'} — ${w.issue_note}`
            )
          )
        : null
    );
  }

  return h('div', {},
    renderBreadcrumbs(L('nav_tasks'), [{ label: `${w.centrale} Centrale`, onClick: () => {} }]),
    h('div', { className: 'v1-wizard-card' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' } },
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-ghost v1-btn-sm',
          onClick: () => {
            saveWizardDraftLocal();
            V1.wizard = null;
            renderApp();
          },
        }, msIcon('arrow_back', 16), h('span', {}, 'Back to My Tasks')),
        renderLozenge(`Step ${w.step} of 4 · Draft Saved`, 'info', 'cloud_done')
      ),
      /* Section 5.2: Cisco Momentum Compact Mobile Progress Header */
      h('div', { className: 'v1-momentum-progress-header' },
        h('span', {}, stepsMeta[w.step - 1].label),
        h('span', { className: 'v1-mono' }, `${w.step} / 4`)
      ),
      w.correction_note
        ? h('div', { className: 'v1-error-alert' },
            msIcon('error', 20),
            h('span', {}, `Reviewer Requested Correction (Step ${w.correction_step || 1}): "${w.correction_note}"`)
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
        ? h('div', { className: 'v1-error-alert', role: 'alert' },
            msIcon('error', 20),
            h('span', {}, w.error)
          )
        : null,
      stepContent,
      /* Section 3.2 & 5.2: Carbon Ghost Back + Single Primary Action Button (Sticky on Mobile) */
      h('div', { className: 'v1-wizard-footer' },
        w.step > 1
          ? h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-ghost',
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
                  volet: w.volet,
                  prep_mode: w.prep_mode,
                  prep_names: w.prep_names,
                  safeguards: w.safeguards,
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
  const allowedHorizons = V1.data?.user?.permissions?.plan_horizons || ['ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY'];
  const allHorizons = V1.data?.plan_horizons || [
    { code: 'ANNUAL', form_code: 'F03', label: { en: 'Annual Operational Plan (F03)' } },
    { code: 'QUARTERLY', form_code: 'F04', label: { en: 'Quarterly Action Plan (F04)' } },
    { code: 'MONTHLY', form_code: 'F43', label: { en: 'Monthly Action Plan (F43)' } },
    { code: 'WEEKLY', form_code: 'F05', label: { en: 'Weekly Operational Schedule (F05)' } },
  ];
  const visibleHorizons = allHorizons.filter(ph => allowedHorizons.includes(ph.code));
  const state = V1.newTaskState || (V1.newTaskState = {
    title: '',
    outcome_code: goals[0]?.outcome_code || 'A1.R1',
    parish_code: V1.data?.user?.assigned_parish || 'PAR-01',
    plan_horizon: visibleHorizons[0]?.code || 'QUARTERLY',
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
        className: 'v1-btn v1-btn-ghost v1-btn-sm',
        onClick: () => { V1.newTaskModal = false; renderApp(); },
      }, h('span', {}, 'Cancel'), msIcon('close', 16))
    ),
    state.error
      ? h('div', { className: 'v1-error-alert' }, msIcon('error', 20), h('span', {}, state.error))
      : null,
    h('div', { className: 'v1-field' },
      h('label', { className: 'v1-field-label' }, '0. Institutional Plan Horizon (Scoped to Your Role Mandate)'),
      h('div', { className: 'v1-segmented' },
        visibleHorizons.map(ph =>
          h('button', {
            type: 'button',
            className: 'v1-seg-btn' + (state.plan_horizon === ph.code ? ' active' : ''),
            onClick: () => { state.plan_horizon = ph.code; renderApp(); },
          }, localize(ph.label))
        )
      )
    ),
    h('div', { className: 'v1-field' },
      h('label', { className: 'v1-field-label' },
        '1. Choose Strategic Goal (Backend Automatically Binds Axis, Outcome & KPI IDs)'
      ),
      h('div', { className: 'v1-chips' },
        goals.map(g =>
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
        className: 'v1-input',
        placeholder: 'e.g., Train 25 youth mediators in peaceful family dialogue',
        value: state.title,
        onChange: e => { state.title = e.target.value; },
      }),
      h('div', { className: 'v1-field-helper' }, 'No form codes or strategic IDs needed.')
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
            const res = await apiV1('/v1/tasks', 'POST', state);
            if (res && res.id && V1.data && Array.isArray(V1.data.tasks)) {
              V1.data.tasks.unshift(res);
            }
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
  const perms = V1.data?.user?.permissions || { can_create_task: true };
  const tasks = (V1.data?.tasks || []).filter(t => {
    if (V1.filters.status !== 'ALL' && t.status !== V1.filters.status) return false;
    if (V1.filters.axis && (t.axis || t.axis_code) !== V1.filters.axis) return false;
    if (V1.filters.parish && t.parish_code !== V1.filters.parish) return false;
    if (V1.filters.period && V1.filters.period !== 'ALL') {
      if (V1.filters.period.startsWith('Q') && t.pastoral_quarter !== V1.filters.period) return false;
      if (V1.filters.period.startsWith('AP') && (t.ap || t.pastoral_year) !== V1.filters.period) return false;
    }
    if (V1.filters.dateFrom && String(t.due_date || '') < V1.filters.dateFrom) return false;
    if (V1.filters.dateTo && String(t.due_date || '') > V1.filters.dateTo) return false;
    if (V1.searchQuery) {
      const q = V1.searchQuery.toLowerCase();
      const hay = `${localize(t.titles)} ${t.parish_name} ${localize(t.axis_labels)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const themes = getThemesList();

  return h('div', {},
    renderBreadcrumbs(L('nav_tasks')),
    renderRoleWorkspaceBanner(),
    h('div', { className: 'v1-page-header' },
      h('div', {},
        h('h1', { className: 'v1-page-title' }, L('nav_tasks')),
        h('p', { className: 'v1-page-subtitle' },
          perms.can_create_task
            ? 'Your assigned field activities, recurring quarterly goals, and saved drafts. All internal M&E codes are handled automatically.'
            : 'Execute assigned Parish CPJP & Centrale activities and log field enumeration entries. Plan creation is reserved for CPJP and CDJP committees.'
        )
      ),
      /* Section 3.2: Only ONE Primary (#0F62FE) button per view */
      h('div', { className: 'v1-header-actions' },
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-secondary v1-mobile-filter-trigger',
          onClick: () => { V1.mobileSheet = 'filters'; renderApp(); },
        }, h('span', {}, 'Filter'), msIcon('filter_list', 20)),
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-danger',
          onClick: () => {
            const sensTask = (V1.data?.tasks || []).find(t => t.is_sensitive) || V1.data?.tasks?.[0];
            if (sensTask) openWizardForTask(sensTask);
          },
        }, h('span', {}, L('nav_confidential')), msIcon('lock', 20)),
        perms.can_create_task
          ? h('button', {
              type: 'button',
              className: 'v1-btn' + (V1.newTaskModal ? ' v1-btn-secondary' : ''),
              onClick: () => { V1.newTaskModal = !V1.newTaskModal; renderApp(); },
            }, h('span', {}, L('add_planned')), msIcon('add', 20))
          : null
      )
    ),
    V1.newTaskModal && perms.can_create_task ? renderNewTaskModal() : null,
    /* Contextual Filter Bar with Calendar Date-Range & Strategic Themes */
    h('div', { className: 'v1-context-filters' },
      renderDateRangeWidget(),
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
    /* Task Cards List (Atlassian Lozenges + Carbon Secondary Action Buttons) */
    h('div', { className: 'v1-task-list' },
      tasks.map(t => {
        const isDone = t.completion_pct >= 100;
        const needsFix = t.status === 'NEEDS_CORRECTION';
        const hasLocalDraft = !!localStorage.getItem('apse-v1-draft-' + t.id);
        return h('article', { className: 'v1-task-card' },
          h('div', { className: 'v1-task-left' },
            h('div', { className: 'v1-task-check' + (isDone ? ' done' : (needsFix ? ' warn' : '')) },
              isDone ? msIcon('check', 16) : (needsFix ? msIcon('error', 16) : msIcon('assignment', 16))
            ),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' } },
                h('h3', { className: 'v1-task-title' }, localize(t.titles)),
                h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                  t.is_sensitive ? renderLozenge('Confidential', 'LOW', 'lock') : null,
                  hasLocalDraft ? renderLozenge('Saved Draft', 'GOOD', 'description') : null,
                  renderLozenge(L('impact_' + t.impact_rating), t.impact_rating)
                )
              ),
              /* Section 2.2 Neutral Metadata Lozenges for hidden-code labels */
              h('div', { className: 'v1-task-meta' },
                renderLozenge(`${t.parish_name} Parish`, 'neutral'),
                renderLozenge(localize(t.axis_labels), 'neutral'),
                renderLozenge(t.pastoral_quarter, 'neutral'),
                h('span', { className: 'v1-tabular' }, `Due ${t.due_date}`),
                t.frequency > 1 ? h('span', { className: 'v1-tabular' }, `· Quarterly (${t.quarters_completed}/${t.frequency} logged)`) : null
              ),
              h('div', { className: 'v1-progress-wrap' },
                h('div', { className: 'v1-progress-bar' },
                  h('div', { className: 'v1-progress-fill' + (isDone ? ' great' : ''), style: { width: `${t.completion_pct}%` } })
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
                  className: 'v1-btn v1-btn-danger',
                  onClick: () => openWizardForTask(t, t.latest_log, t.latest_log?.payload?.correction_step || 1),
                },
                h('span', {}, L('fix_step', t.latest_log?.payload?.correction_step || 1)),
                msIcon('arrow_forward', 20)
              )
              : h('button', {
                  type: 'button',
                  className: 'v1-btn ' + (isDone ? 'v1-btn-ghost' : 'v1-btn-secondary'),
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

/* WORKSPACE 2: Review & Approvals (Institutional 5-Stage Governance Circuit & Strict RBAC) */
function renderApprovalsWorkspace() {
  const user = V1.data?.user || {};
  const perms = user.permissions || { can_review: false, allowed_target_stages: [] };
  const allowedTargets = perms.allowed_target_stages || [];
  const themes = getThemesList();

  const logs = (V1.data?.logs || []).filter(l => {
    if (l.is_superseded) return false;
    if (V1.filters.approvalStage !== 'ALL' && l.stage !== V1.filters.approvalStage) return false;
    if (V1.filters.axis && (l.axis || l.axis_code) !== V1.filters.axis) return false;
    if (V1.filters.parish && l.parish_code !== V1.filters.parish) return false;
    if (V1.filters.period && V1.filters.period !== 'ALL') {
      if (V1.filters.period.startsWith('Q') && l.pastoral_quarter !== V1.filters.period) return false;
      if (V1.filters.period.startsWith('AP') && (l.ap || l.pastoral_year) !== V1.filters.period) return false;
    }
    if (V1.filters.dateFrom && String(l.event_date || '') < V1.filters.dateFrom) return false;
    if (V1.filters.dateTo && String(l.event_date || '') > V1.filters.dateTo) return false;
    if (V1.searchQuery) {
      const q = V1.searchQuery.toLowerCase();
      if (!`${localize(l.task_titles)} ${l.parish_name} ${l.centrale}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stageLabelMap = {
    SUBMITTED: L('stage_submitted'),
    PARISH_APPROVED: L('stage_parish'),
    MEL_VALIDATED: 'Validated by CDJP M&E',
    VERIFIED: 'Verified by Coordination',
    DIOCESE_APPROVED: L('stage_diocese'),
    CORRECTION: L('stage_correction'),
  };

  let primaryAssigned = false;

  return h('div', {},
    renderBreadcrumbs(perms.can_review ? L('nav_approvals') : 'My Submissions & Approval Status'),
    renderRoleWorkspaceBanner(),
    h('div', { className: 'v1-page-header' },
      h('div', {},
        h('h1', { className: 'v1-page-title' }, perms.can_review ? L('nav_approvals') : 'My Submissions & Approval Status'),
        h('p', { className: 'v1-page-subtitle' },
          perms.can_review
            ? 'Institutional Verification Circuit: Field Submission (CCJP/CEB) → Parish CPJP Approval → CDJP M&E Validation → Diocesan Final Approval (Self-approval prohibited).'
            : 'Track where your submitted field reports stand in the Parish CPJP and Diocesan CDJP verification circuit. Field enumerators cannot approve reports.'
        )
      )
    ),
    V1.reviewError
      ? h('div', { className: 'v1-error-alert', style: { marginBottom: '16px' } },
          msIcon('error', 20),
          h('span', {}, V1.reviewError)
        )
      : null,
    h('div', { className: 'v1-context-filters' },
      renderDateRangeWidget(),
      h('div', { className: 'v1-segmented' },
        [
          ['ALL', 'All Submissions'],
          ['SUBMITTED', L('stage_submitted')],
          ['PARISH_APPROVED', L('stage_parish')],
          ['MEL_VALIDATED', 'M&E Validated'],
          ['VERIFIED', 'Coord. Verified'],
          ['DIOCESE_APPROVED', L('stage_diocese')],
          ['CORRECTION', L('stage_correction')],
        ].map(([code, lbl]) =>
          h('button', {
            type: 'button',
            className: 'v1-seg-btn' + (V1.filters.approvalStage === code ? ' active' : ''),
            onClick: () => { V1.filters.approvalStage = code; renderApp(); },
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
    h('div', { className: 'v1-task-list' },
      logs.map(l => {
        const isSelfAuthored = Boolean(
          l.author && (l.author === user.id || l.author === user.name || l.author === user.active_persona)
        );
        const canParishApprove = perms.can_review && !isSelfAuthored
          && allowedTargets.includes('PARISH_APPROVED')
          && l.stage === 'SUBMITTED'
          && (!user.assigned_parish || user.assigned_parish === l.parish_code);
        const canMelValidate = perms.can_review && !isSelfAuthored
          && allowedTargets.includes('MEL_VALIDATED')
          && (l.stage === 'SUBMITTED' || l.stage === 'PARISH_APPROVED');
        const canCoordVerify = perms.can_review && !isSelfAuthored
          && allowedTargets.includes('VERIFIED')
          && (l.stage === 'PARISH_APPROVED' || l.stage === 'MEL_VALIDATED');
        const canDioceseApprove = perms.can_review && !isSelfAuthored
          && allowedTargets.includes('DIOCESE_APPROVED')
          && l.stage !== 'DIOCESE_APPROVED' && l.stage !== 'CORRECTION';
        const canReturnCorrection = perms.can_review && !isSelfAuthored
          && allowedTargets.includes('CORRECTION')
          && l.stage !== 'DIOCESE_APPROVED'
          && (!user.assigned_parish || user.assigned_parish === l.parish_code);

        const hasPrimaryCandidate = canDioceseApprove || canParishApprove;
        const usePrimaryHere = hasPrimaryCandidate && !primaryAssigned;
        if (usePrimaryHere) primaryAssigned = true;
        const isReturning = V1.returningLog && V1.returningLog.id === l.id;

        return h('article', { className: 'v1-task-card', style: { flexDirection: 'column', alignItems: 'stretch' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' } },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' } },
                renderLozenge(
                  stageLabelMap[l.stage] || l.stage,
                  l.stage === 'DIOCESE_APPROVED' ? 'GREAT' : (l.stage === 'CORRECTION' ? 'LOW' : (l.stage === 'SUBMITTED' ? 'warn' : 'GOOD')),
                  l.stage === 'DIOCESE_APPROVED' ? 'check' : (l.stage === 'CORRECTION' ? 'error' : 'fact_check')
                ),
                l.version > 1 ? renderLozenge(`Amended v${l.version}`, 'info') : null,
                renderLozenge(L('impact_' + l.impact_rating), l.impact_rating),
                renderLozenge(`${l.parish_name} · ${l.centrale}`, 'neutral'),
                renderLozenge(`${l.event_date} (${l.pastoral_quarter})`, 'neutral'),
                l.volet ? renderLozenge(`Volet: ${l.volet}`, 'neutral') : null
              ),
              h('h3', { className: 'v1-task-title', style: { margin: '4px 0' } }, localize(l.task_titles)),
              h('div', { className: 'v1-tabular', style: { fontSize: '0.875rem', color: 'var(--text-secondary)' } },
                `Participants: ${l.total} Total (${l.women} Women, ${l.men} Men, ${l.disability} with Disabilities) · Outcome Achieved: ${l.outcome_value} (Target: ${l.target_threshold})`
              ),
              h('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' } },
                `Author: ${l.author || 'Field Enumerator'} · Prep: ${l.prep_mode === 'COMMITTEE' ? '7-Member CPJP + Chaplain' : '2-Person Pair'}`
              ),
              l.issue_severity !== 'NONE'
                ? h('div', { style: { marginTop: '8px', padding: '8px 12px', background: 'var(--tag-warn-bg)', color: 'var(--tag-warn-text)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' } },
                    msIcon(l.issue_severity === 'MAJOR' ? 'error' : 'warning', 16),
                    h('span', {}, `Field Issue (${l.issue_severity} — ${l.issue_categories.join(', ')}): ${l.issue_note}`)
                  )
                : null
            ),
            h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
              !perms.can_review
                ? renderLozenge('Read-Only Status (Field / Staff Role Cannot Approve)', 'neutral', 'info')
                : isSelfAuthored
                ? renderLozenge('Authored by You — Independent Reviewer Required', 'warn', 'lock')
                : null,
              canParishApprove
                ? h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-sm' + (usePrimaryHere && !canDioceseApprove ? '' : ' v1-btn-secondary'),
                    onClick: async () => {
                      try {
                        V1.reviewError = '';
                        await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'PARISH_APPROVED', note: 'Verified by Parish CPJP Reviewer' });
                        await loadBootstrap();
                        renderApp();
                      } catch (err) {
                        V1.reviewError = err.message;
                        renderApp();
                      }
                    },
                  }, h('span', {}, 'Approve (Parish CPJP)'), msIcon('check', 16))
                : null,
              canMelValidate
                ? h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-secondary v1-btn-sm',
                    onClick: async () => {
                      try {
                        V1.reviewError = '';
                        await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'MEL_VALIDATED', note: 'Validated by CDJP M&E' });
                        await loadBootstrap();
                        renderApp();
                      } catch (err) {
                        V1.reviewError = err.message;
                        renderApp();
                      }
                    },
                  }, h('span', {}, 'Validate (CDJP M&E)'), msIcon('check', 16))
                : null,
              canCoordVerify
                ? h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-secondary v1-btn-sm',
                    onClick: async () => {
                      try {
                        V1.reviewError = '';
                        await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'VERIFIED', note: 'Verified by CDJP Coordination' });
                        await loadBootstrap();
                        renderApp();
                      } catch (err) {
                        V1.reviewError = err.message;
                        renderApp();
                      }
                    },
                  }, h('span', {}, 'Verify (Coordination)'), msIcon('check', 16))
                : null,
              canDioceseApprove
                ? h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-sm' + (usePrimaryHere ? '' : ' v1-btn-secondary'),
                    onClick: async () => {
                      try {
                        V1.reviewError = '';
                        await apiV1('/v1/review', 'POST', { id: l.id, target_stage: 'DIOCESE_APPROVED', note: 'Finalized by CDJP Diocese' });
                        await loadBootstrap();
                        renderApp();
                      } catch (err) {
                        V1.reviewError = err.message;
                        renderApp();
                      }
                    },
                  }, h('span', {}, 'Final Approve (Diocese)'), msIcon('fact_check', 16))
                : null,
              canReturnCorrection
                ? h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-danger v1-btn-sm',
                    onClick: () => {
                      V1.returningLog = isReturning ? null : {
                        id: l.id,
                        step: 2,
                        note: 'Please verify the age group numbers and attach the attendance sheet.',
                      };
                      renderApp();
                    },
                  }, h('span', {}, 'Return for Correction'), msIcon('undo', 16))
                : null
            )
          ),
          isReturning
            ? h('div', { style: { marginTop: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' } },
                h('div', { className: 'v1-field', style: { marginBottom: 0, minWidth: '180px' } },
                  h('label', { className: 'v1-field-label' }, 'Step to Fix'),
                  h('select', {
                    className: 'v1-select',
                    value: String(V1.returningLog.step),
                    onChange: e => { V1.returningLog.step = Number(e.target.value) || 2; },
                  },
                    h('option', { value: '1' }, 'Step 1: When & Where'),
                    h('option', { value: '2' }, 'Step 2: Attendance & Activity'),
                    h('option', { value: '3' }, 'Step 3: Outcome & Issues')
                  )
                ),
                h('div', { className: 'v1-field', style: { marginBottom: 0, flex: 1, minWidth: '220px' } },
                  h('label', { className: 'v1-field-label' }, 'Reviewer Note for Field Reporter'),
                  h('input', {
                    type: 'text',
                    className: 'v1-input',
                    value: V1.returningLog.note,
                    onChange: e => { V1.returningLog.note = e.target.value; },
                  })
                ),
                h('button', {
                  type: 'button',
                  className: 'v1-btn v1-btn-danger v1-btn-sm',
                  onClick: async () => {
                    await apiV1('/v1/review', 'POST', {
                      id: l.id,
                      target_stage: 'CORRECTION',
                      correction_step: V1.returningLog.step,
                      note: V1.returningLog.note,
                    });
                    V1.returningLog = null;
                    await loadBootstrap();
                    renderApp();
                  },
                }, h('span', {}, 'Send Back Now'), msIcon('undo', 16))
              )
            : null
        );
      })
    )
  );
}

/* WORKSPACE 3: Impact & Analytics (Carbon Charts, Outcome Accordions & Polaris Mobile Cards) */
function renderAnalyticsWorkspace() {
  const analytics = V1.data?.analytics || { summary: {}, accordions: [], parish_map: [], monthly_trends: [] };
  const s = analytics.summary || {};
  const activePeriodLabel = V1.filters.period === 'Q1' ? L('period_q1') : (V1.filters.period === 'AP1' ? L('period_ap1') : L('period_all'));
  const catColors = ['var(--chart-cat-1)', 'var(--chart-cat-2)', 'var(--chart-cat-3)', 'var(--chart-cat-4)'];
  const themes = getThemesList();

  return h('div', {},
    renderBreadcrumbs(L('nav_analytics')),
    renderRoleWorkspaceBanner(),
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
          className: 'v1-btn v1-btn-secondary v1-mobile-filter-trigger',
          onClick: () => { V1.mobileSheet = 'filters'; renderApp(); },
        }, h('span', {}, 'Filter'), msIcon('filter_list', 20))
      )
    ),
    /* Contextual Filter Bar */
    h('div', { className: 'v1-context-filters' },
      renderDateRangeWidget(),
      renderParishCombobox(V1.filters.parish, async code => {
        V1.filters.parish = code;
        await loadBootstrap();
        renderApp();
      }, true),
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
    /* Bottleneck Insight Banner */
    s.top_bottleneck_category
      ? h('div', { style: { background: 'var(--tag-warn-bg)', color: 'var(--tag-warn-text)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' } },
          msIcon('warning', 20),
          h('span', { className: 'v1-tabular' },
            `Field Bottleneck Insight: ${s.top_bottleneck_pct}% of reported field delays this period involved "${s.top_bottleneck_category}" challenges.`
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
    /* Section 3.3: Carbon Chart Containers (Top-left Title + Active Filter Subtitle + Top-right Legend) */
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
              h('span', { className: 'v1-legend-swatch', style: { background: 'var(--chart-status-great)' } }),
              '≥80% Target'
            ),
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: 'var(--chart-status-medium)' } }),
              'In Progress'
            ),
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: 'var(--chart-status-major)' } }),
              'Major Issue'
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
              renderApp();
              await loadBootstrap();
              renderApp();
            });
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', String(p.x));
            circle.setAttribute('cy', String(p.y));
            circle.setAttribute('r', V1.filters.parish === p.code ? '3.5' : '2.4');
            /* Section 3.3 Carbon Status Palette */
            const fill = p.status_color === 'red'
              ? 'var(--chart-status-major)'
              : (p.status_color === 'green'
                ? 'var(--chart-status-great)'
                : (p.status_color === 'amber' ? 'var(--chart-status-medium)' : 'var(--chart-status-idle)'));
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
      /* Issue Trends Stacked Bar Chart (Carbon Horizontal Gridlines + Status Palette) */
      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('div', {},
            h('h2', { className: 'v1-section-title' }, 'Field Issues & Bottlenecks Over Time'),
            h('p', { className: 'v1-chart-subtitle' }, `Active Filter: ${activePeriodLabel} · Category: ${V1.filters.issueCategory}`)
          ),
          h('div', { className: 'v1-chart-legend' },
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: 'var(--chart-status-minor)' } }),
              'Minor'
            ),
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: 'var(--chart-status-medium)' } }),
              'Medium'
            ),
            h('span', { className: 'v1-legend-item' },
              h('span', { className: 'v1-legend-swatch', style: { background: 'var(--chart-status-major)' } }),
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
            const catSev = catFilter === 'ALL'
              ? { MINOR: m.MINOR, MEDIUM: m.MEDIUM, MAJOR: m.MAJOR }
              : (m.by_category_severity?.[catFilter] || { MINOR: 0, MEDIUM: 0, MAJOR: 0 });
            const total = catFilter === 'ALL'
              ? (m.MINOR + m.MEDIUM + m.MAJOR)
              : (m.by_category?.[catFilter] || 0);
            const hMinor = (catSev.MINOR || 0) * 28;
            const hMed = (catSev.MEDIUM || 0) * 28;
            const hMaj = (catSev.MAJOR || 0) * 28;
            return h('div', { className: 'v1-bar-col' },
              h('span', { className: 'v1-mono', style: { fontSize: '0.6875rem', fontWeight: '700', marginBottom: '4px' } }, total ? String(total) : ''),
              h('div', { className: 'v1-bar-stack' },
                h('div', { style: { height: `${hMinor}px`, background: 'var(--chart-status-minor)' }, title: `Minor: ${catSev.MINOR || 0}` }),
                h('div', { style: { height: `${hMed}px`, background: 'var(--chart-status-medium)' }, title: `Medium: ${catSev.MEDIUM || 0}` }),
                h('div', { style: { height: `${hMaj}px`, background: 'var(--chart-status-major)' }, title: `Major: ${catSev.MAJOR || 0}` })
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
                style: { background: catColors[idx % catColors.length] },
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
                  acc.documents.map(doc => renderLozenge(`${doc.name} (${doc.parish})`, 'GOOD', 'description'))
                )
              )
            : null,
          acc.issues.length
            ? h('div', { style: { marginTop: '14px' } },
                h('div', { className: 'v1-field-label', style: { marginBottom: '6px', color: 'var(--tag-warn-text)' } }, '3. Under-Achievement Explanations & Field Issues'),
                acc.issues.map(iss =>
                  h('div', { style: { padding: '8px 12px', background: 'var(--tag-warn-bg)', color: 'var(--tag-warn-text)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' } },
                    msIcon(iss.severity === 'MAJOR' ? 'error' : 'warning', 16),
                    h('span', {}, `${iss.parish} (${iss.severity} · ${iss.categories.join(', ')}): ${iss.note}`)
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
      /* Right Panel: Guided Bulk CSV Import (Secondary Action Button) */
      h('div', { className: 'v1-panel' },
        h('h2', { className: 'v1-section-title', style: { marginBottom: '8px' } }, '2. Guided Bulk Spreadsheet Import (CSV)'),
        h('p', { className: 'v1-page-subtitle', style: { marginBottom: '14px' } },
          'Upload a CSV file from field enumerators. If any column name is different, the system asks you which column to use in plain language.'
        ),
        h('div', { className: 'v1-field' },
          h('label', { className: 'v1-field-label' }, 'Select CSV File'),
          h('div', { className: 'v1-file-upload-wrap' },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary v1-file-upload-btn',
              onClick: () => {
                const inp = document.getElementById('csv_import_file_input');
                if (inp) inp.click();
              },
            },
              msIcon('upload_file', 18),
              h('span', {}, V1.csvImportState?.filename ? 'Change CSV File...' : 'Choose CSV Spreadsheet...')
            ),
            h('input', {
              id: 'csv_import_file_input',
              type: 'file',
              style: { display: 'none' },
              accept: '.csv',
              onChange: async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const csvText = await file.text();
                try {
                  const res = await apiV1('/v1/import', 'POST', { csv_text: csvText, commit: false });
                  V1.csvImportState = { csvText, filename: file.name, ...res, mapping: res.mapping || {}, message: '' };
                  renderApp();
                } catch (err) {
                  V1.csvImportState = { error: err.message };
                  renderApp();
                }
              },
            }),
            V1.csvImportState?.filename ? h('span', { className: 'v1-chip v1-file-chip' },
              msIcon('description', 14),
              h('span', {}, V1.csvImportState.filename)
            ) : null
          )
        ),
        V1.csvImportState?.error
          ? h('div', { className: 'v1-error-alert' }, msIcon('error', 20), h('span', {}, V1.csvImportState.error))
          : null,
        V1.csvImportState && !V1.csvImportState.error
          ? h('div', {},
              V1.csvImportState.missing?.length
                ? h('div', {},
                    V1.csvImportState.missing.map(m =>
                      h('div', { className: 'v1-error-alert', style: { flexDirection: 'column', alignItems: 'stretch' } },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                          msIcon('warning', 20),
                          h('span', {}, m.message)
                        ),
                        h('select', {
                          className: 'v1-select',
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
                    h('div', { style: { marginBottom: '12px' } },
                      renderLozenge(`All columns matched (${V1.csvImportState.total_rows} rows ready)`, 'GREAT', 'check')
                    ),
                    V1.csvImportState.preview?.length
                      ? h('table', { className: 'v1-data-table', style: { marginBottom: '12px' } },
                          h('thead', {},
                            h('tr', {},
                              h('th', {}, '#'),
                              h('th', {}, 'Parish'),
                              h('th', {}, 'Centrale'),
                              h('th', {}, 'Date'),
                              h('th', {}, 'Total'),
                              h('th', {}, 'Outcome')
                            )
                          ),
                          h('tbody', {},
                            V1.csvImportState.preview.map(pr =>
                              h('tr', {},
                                h('td', { className: 'v1-mono' }, String(pr.row)),
                                h('td', {}, pr.parish),
                                h('td', {}, pr.centrale),
                                h('td', { className: 'v1-mono' }, pr.event_date),
                                h('td', { className: 'v1-mono' }, String(pr.total)),
                                h('td', { className: 'v1-mono' }, String(pr.outcome_value))
                              )
                            )
                          )
                        )
                      : null,
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-secondary',
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


/* Mobile Search Overlay with Blurred Backdrop & Live Matches */
function renderMobileSearchOverlay() {
  if (!V1.mobileSearchOpen) return null;
  const q = (V1.searchQuery || '').toLowerCase().trim();
  const results = [];
  if (q) {
    (V1.data?.tasks || []).filter(t =>
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.parish && t.parish.toLowerCase().includes(q)) ||
      (t.code && t.code.toLowerCase().includes(q)) ||
      (t.titles && Object.values(t.titles).some(v => String(v).toLowerCase().includes(q)))
    ).slice(0, 5).forEach(t => {
      results.push({
        type: 'Tâche',
        title: localize(t.titles) || t.title || t.code,
        subtitle: `${t.parish_name || t.parish_code || 'CDJP'} · ${t.code}`,
        icon: 'check_box',
        action: () => {
          V1.mobileSearchOpen = false;
          V1.workspace = 'tasks';
          openWizardForTask(t);
          renderApp();
        }
      });
    });

    const allTabs = [
      { id: 'my_space', name: 'Mon espace (My Space)' },
      { id: 'seizure', name: 'Saisie (Seizure F01–F45)' },
      { id: 'files_validation', name: 'Dossiers et validation' },
      { id: 'learning', name: 'Apprentissage (Learning)' },
      { id: 'reports', name: 'Rapports (Reports R01–R13)' },
      { id: 'offline_vault', name: 'Préparer / ouvrir hors ligne' },
      { id: 'offline_sync', name: 'Synchroniser la file hors ligne' },
      { id: 'ps_planning', name: 'Planification du PS' },
      { id: 'metadata', name: 'Métadonnées' },
      { id: 'feedback', name: 'Retours sur les dossiers' },
      { id: 'projects_ops', name: 'Projets et opérations' },
      { id: 'staff_eval', name: 'Évaluation du personnel' },
      { id: 'create_form', name: 'Créer / partager un formulaire' },
      { id: 'drafts', name: 'Brouillons en cours' },
      { id: 'ps_dashboard', name: 'Tableau de bord PS' },
      { id: 'assistant', name: 'Assistant et contrôles' },
      { id: 'contacts', name: 'Contacts CDJP' },
      { id: 'data_structure', name: 'Structure et flux des données' },
      { id: 'timesheets', name: 'Feuilles de temps' },
      { id: 'mel_admin', name: 'Administration MEL' },
    ];
    allTabs.filter(tab => tab.name.toLowerCase().includes(q)).forEach(tab => {
      results.push({
        type: 'Espace',
        title: tab.name,
        subtitle: 'Accéder à cet espace de travail',
        icon: 'open_in_new',
        action: () => {
          V1.mobileSearchOpen = false;
          V1.workspace = tab.id;
          renderApp();
        }
      });
    });
  }

  return h('div', {
    className: 'v1-search-overlay',
    onClick: e => {
      if (e.target.classList.contains('v1-search-overlay')) {
        V1.mobileSearchOpen = false;
        renderApp();
      }
    }
  },
    h('div', { className: 'v1-search-overlay-header' },
      h('div', { className: 'v1-search-overlay-box' },
        h('span', { className: 'v1-search-icon' }, msIcon('search', 22)),
        h('input', {
          type: 'search',
          className: 'v1-mobile-search-input',
          placeholder: L('search_placeholder'),
          value: V1.searchQuery,
          autofocus: true,
          onInput: e => {
            V1.searchQuery = e.target.value;
            renderApp();
          },
          onKeyDown: e => {
            if (e.key === 'Escape') {
              V1.mobileSearchOpen = false;
              renderApp();
            }
          }
        }),
        V1.searchQuery ? h('button', {
          type: 'button',
          style: {
            position: 'absolute',
            right: '12px',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            color: 'var(--text-muted)'
          },
          onClick: () => {
            V1.searchQuery = '';
            renderApp();
          }
        }, msIcon('cancel', 18)) : null
      ),
      h('button', {
        type: 'button',
        className: 'v1-search-overlay-close',
        title: 'Fermer la recherche',
        onClick: () => {
          V1.mobileSearchOpen = false;
          renderApp();
        }
      }, msIcon('close', 20))
    ),
    results.length > 0 ? h('div', { className: 'v1-search-overlay-results' },
      results.map(r => h('div', {
        className: 'v1-card',
        style: {
          padding: '12px 16px',
          marginBottom: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        },
        onClick: r.action
      },
        msIcon(r.icon, 20),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h('span', { className: 'v1-badge', style: { fontSize: '0.625rem' } }, r.type),
            h('strong', { style: { fontSize: '0.875rem' } }, r.title)
          ),
          h('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' } }, r.subtitle)
        ),
        msIcon('arrow_forward', 16)
      ))
    ) : (q ? h('div', {
      className: 'v1-search-overlay-results',
      style: { padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }
    }, `Aucun résultat pour "${V1.searchQuery}"`) : null)
  );
}

function renderWorkspaceView(ws) {
  if (ws === 'tasks') return renderTasksWorkspace();
  if (ws === 'approvals') return renderApprovalsWorkspace();
  if (ws === 'analytics') return renderAnalyticsWorkspace();
  if (ws === 'exports') return renderExportsWorkspace();

  if (window.V091Views) {
    switch (ws) {
      case 'my_space': return window.V091Views.renderMySpaceWorkspace();
      case 'seizure': return window.V091Views.renderSeizureWorkspace();
      case 'files_validation': return window.V091Views.renderFilesValidationWorkspace();
      case 'learning': return window.V091Views.renderLearningWorkspace();
      case 'reports': return window.V091Views.renderReportsWorkspace();
      case 'offline_hub':
      case 'offline_vault':
      case 'offline_sync':
        return window.V091Views.renderOfflineHubWorkspace ? window.V091Views.renderOfflineHubWorkspace() : window.V091Views.renderOfflineVaultWorkspace();
      case 'ps_planning': return window.V091Views.renderPSPlanningWorkspace();
      case 'metadata': return window.V091Views.renderMetadataWorkspace();
      case 'feedback': return window.V091Views.renderFeedbackWorkspace();
      case 'projects_ops': return window.V091Views.renderProjectsOpsWorkspace();
      case 'staff_eval': return window.V091Views.renderStaffEvalWorkspace();
      case 'create_form': return window.V091Views.renderCreateFormWorkspace();
      case 'drafts': return window.V091Views.renderDraftsWorkspace();
      case 'ps_dashboard': return window.V091Views.renderPSDashboardWorkspace();
      case 'assistant': return window.V091Views.renderAssistantWorkspace();
      case 'contacts': return window.V091Views.renderContactsWorkspace();
      case 'data_structure': return window.V091Views.renderDataStructureWorkspace();
      case 'timesheets': return window.V091Views.renderTimesheetsWorkspace();
      case 'mel_admin': return window.V091Views.renderMelAdminWorkspace();
      default: return renderTasksWorkspace();
    }
  }
  return renderTasksWorkspace();
}

function renderWorkspaceCanvas() {
  return renderWorkspaceView(V1.workspace);
}
/* old canvas */
function _old_renderWorkspaceCanvas() {
  const ws = V1.workspace;
  if (ws === 'tasks') return renderTasksWorkspace();
  if (ws === 'approvals') return renderApprovalsWorkspace();
  if (ws === 'analytics') return renderAnalyticsWorkspace();
  if (ws === 'exports') return renderExportsWorkspace();

  if (window.V091Views) {
    switch (ws) {
      case 'my_space': return window.V091Views.renderMySpaceWorkspace();
      case 'seizure': return window.V091Views.renderSeizureWorkspace();
      case 'files_validation': return window.V091Views.renderFilesValidationWorkspace();
      case 'learning': return window.V091Views.renderLearningWorkspace();
      case 'reports': return window.V091Views.renderReportsWorkspace();
      case 'offline_vault': return window.V091Views.renderOfflineVaultWorkspace();
      case 'offline_sync': return window.V091Views.renderOfflineSyncWorkspace();
      case 'ps_planning': return window.V091Views.renderPSPlanningWorkspace();
      case 'metadata': return window.V091Views.renderMetadataWorkspace();
      case 'feedback': return window.V091Views.renderFeedbackWorkspace();
      case 'projects_ops': return window.V091Views.renderProjectsOpsWorkspace();
      case 'staff_eval': return window.V091Views.renderStaffEvalWorkspace();
      case 'create_form': return window.V091Views.renderCreateFormWorkspace();
      case 'drafts': return window.V091Views.renderDraftsWorkspace();
      case 'ps_dashboard': return window.V091Views.renderPSDashboardWorkspace();
      case 'assistant': return window.V091Views.renderAssistantWorkspace();
      case 'contacts': return window.V091Views.renderContactsWorkspace();
      case 'data_structure': return window.V091Views.renderDataStructureWorkspace();
      case 'timesheets': return window.V091Views.renderTimesheetsWorkspace();
      case 'mel_admin': return window.V091Views.renderMelAdminWorkspace();
    }
  }
  return renderTasksWorkspace();
}

/* Master App Shell Renderer */


function renderRightSidecar() {
  if (!V1.rightSidecarOpen) return null;
  const tab = V1.rightSidecarTab || 'ps_planning';

  const tabLabels = {
    ps_planning: { title: 'Planification Stratégique PS (AP1–AP5)', icon: 'view_timeline' },
    projects_ops: { title: 'Portefeuille Projets & Opérations', icon: 'workspaces' },
    staff_eval: { title: 'Évaluation des Réalisations Staff', icon: 'workspace_premium' },
    assistant: { title: 'Assistant & Contrôles Qualité', icon: 'auto_fix_high' },
    contacts: { title: 'Annuaire Diocésain & Contacts', icon: 'contact_phone' },
    data_structure: { title: 'Structure & Flux des Données', icon: 'account_tree' },
    timesheets: { title: 'Feuilles de Temps (F31/F32)', icon: 'more_time' },
    metadata: { title: 'Référentiels & Métadonnées', icon: 'category' },
    mel_admin: { title: 'Administration MEL & Sécurité', icon: 'admin_panel_settings' },
  };

  const meta = tabLabels[tab] || { title: 'Référence', icon: 'info' };

  return h('div', { className: 'v1-sidepeek-container' },
    /* Soft dimmed backdrop over the canvas (clicking slides it back) */
    h('div', {
      className: 'v1-sidepeek-backdrop',
      onClick: () => {
        V1.rightSidecarOpen = false;
        renderApp();
      }
    }),
    /* Notion-Style Floating Side-Peek Overlay Drawer (does not squeeze main canvas) */
    h('aside', {
      className: 'v1-notion-sidepeek',
      role: 'region',
      'aria-label': 'Notion Side-Peek Reference Panel'
    },
      h('div', { className: 'v1-sidepeek-header' },
        h('div', { className: 'v1-sidepeek-nav' },
          h('button', {
            type: 'button',
            className: 'v1-sidepeek-back-btn',
            title: 'Faire glisser vers la droite (Masquer sans perdre le travail en cours)',
            onClick: () => {
              V1.rightSidecarOpen = false;
              renderApp();
            }
          },
            msIcon('arrow_forward', 16),
            h('span', {}, 'Masquer')
          ),
          h('div', { className: 'v1-sidepeek-badge' },
            msIcon(meta.icon, 18),
            h('strong', {}, meta.title)
          )
        ),
        h('div', { className: 'v1-sidepeek-actions' },
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-sm v1-btn-secondary',
            title: 'Ouvrir en plein écran dans la zone centrale',
            onClick: () => {
              V1.workspace = tab;
              V1.rightSidecarOpen = false;
              renderApp();
            }
          },
            msIcon('open_in_full', 15),
            h('span', {}, 'Pleine page')
          ),
          h('button', {
            type: 'button',
            className: 'v1-modal-close',
            style: { width: '30px', height: '30px', fontSize: '1.25rem' },
            title: 'Fermer',
            onClick: () => {
              V1.rightSidecarOpen = false;
              renderApp();
            }
          }, '×')
        )
      ),
      h('div', { className: 'v1-sidepeek-body' },
        renderWorkspaceView(tab)
      )
    )
  );
}

function renderRightRail() {
  const rightRailItems = [
    { id: 'ps_planning', icon: 'view_timeline', title: 'Planification Stratégique PS (AP1–AP5, 5 axes)' },
    { id: 'projects_ops', icon: 'workspaces', title: 'Projets et Opérations (Portefeuille & KPIs)' },
    { id: 'staff_eval', icon: 'workspace_premium', title: 'Évaluation des Réalisations (F05/F43/F04/F03)' },
    { id: 'assistant', icon: 'auto_fix_high', title: 'Assistant et Contrôles (Vérifications & Rédaction)' },
    { id: 'contacts', icon: 'contact_phone', title: 'Contacts et Annuaire Diocésain' },
    { id: 'data_structure', icon: 'account_tree', title: 'Structure & Flux des Données (27 paroisses)' },
    { id: 'timesheets', icon: 'more_time', title: 'Feuilles de Temps (F31/F32)' },
    { id: 'metadata', icon: 'category', title: 'Référentiels & Métadonnées (18 catégories)' },
    { id: 'mel_admin', icon: 'admin_panel_settings', title: 'Administration MEL & Audits HMAC' },
  ];

  return h('aside', { className: 'v1-right-sidebar', 'aria-label': 'Right Reference Rail' },
    h('button', {
      type: 'button',
      className: 'v1-right-rail-btn',
      style: { background: V1.rightSidecarOpen ? 'var(--bg-hover)' : 'transparent', color: 'var(--color-primary)' },
      title: V1.rightSidecarOpen ? 'Réduire le panneau de référence' : 'Déplier le panneau de référence (Lecture seule)',
      onClick: () => {
        V1.rightSidecarOpen = !V1.rightSidecarOpen;
        renderApp();
      }
    },
      msIcon(V1.rightSidecarOpen ? 'chevron_right' : 'dock_to_right', 20)
    ),
    h('div', { className: 'v1-right-rail-divider' }),
    rightRailItems.map(item => {
      const isSelected = V1.rightSidecarOpen && V1.rightSidecarTab === item.id;
      return h('button', {
        key: item.id,
        type: 'button',
        className: 'v1-right-rail-btn' + (isSelected ? ' active' : ''),
        title: item.title,
        onClick: () => {
          if (V1.rightSidecarOpen && V1.rightSidecarTab === item.id) {
            V1.rightSidecarOpen = false;
          } else {
            V1.rightSidecarOpen = true;
            V1.rightSidecarTab = item.id;
          }
          renderApp();
        }
      },
        msIcon(item.icon, 20)
      );
    })
  );
}

function renderMobileNavDrawer() {
  if (!V1.mobileNavOpen) return null;

  const perms = V1.data?.user?.permissions || { tier: 'mel', can_review: true };
  const pendingTasksCount = (V1.data?.tasks || []).filter(t => t.completion_pct < 100).length;
  const pendingApprovalsCount = V1.data?.analytics?.summary?.pending_approvals || 0;
  const qLen = V1.offlineQueue.length;
  const isDark = V1.theme === 'dark';

  const navGroups = [
    {
      title: 'Opérations & Saisie (Barre Gauche)',
      items: [
        { id: 'tasks', icon: 'task_alt', label: perms.tier === 'field' ? 'My Field Tasks' : L('nav_tasks'), badge: pendingTasksCount },
        { id: 'seizure', icon: 'edit_note', label: L('nav_seizure') },
        { id: 'drafts', icon: 'pending_actions', label: L('nav_drafts') },
        { id: 'approvals', icon: 'rule_folder', label: perms.can_review ? L('nav_approvals') : 'My Submissions', badge: pendingApprovalsCount },
        { id: 'analytics', icon: 'monitoring', label: L('nav_analytics') },
        { id: 'exports', icon: 'summarize', label: L('nav_exports') },
        { id: 'learning', icon: 'tips_and_updates', label: L('nav_learning') },
        { id: 'create_form', icon: 'post_add', label: L('nav_create_form') },
        { id: 'offline_hub', icon: 'cloud_sync', label: L('nav_offline_hub'), badge: qLen > 0 ? qLen : null },
        { id: 'feedback', icon: 'rate_review', label: L('nav_feedback') },
      ]
    },
    {
      title: 'Référence & Gouvernance (Barre Droite)',
      items: [
        { id: 'ps_planning', icon: 'view_timeline', label: L('nav_ps_planning') },
        { id: 'projects_ops', icon: 'workspaces', label: L('nav_projects_ops') },
        { id: 'staff_eval', icon: 'workspace_premium', label: L('nav_staff_eval') },
        { id: 'assistant', icon: 'auto_fix_high', label: L('nav_assistant') },
        { id: 'contacts', icon: 'contact_phone', label: L('nav_contacts') },
        { id: 'data_structure', icon: 'account_tree', label: L('nav_data_structure') },
        { id: 'timesheets', icon: 'more_time', label: L('nav_timesheets') },
        { id: 'metadata', icon: 'category', label: L('nav_metadata') },
        { id: 'mel_admin', icon: 'admin_panel_settings', label: L('nav_mel_admin') },
      ]
    }
  ];

  return h('div', { className: 'v1-mobile-drawer', role: 'dialog', 'aria-modal': 'true' },
    /* Header with Brand and Close Button */
    h('div', { className: 'v1-mobile-drawer-header' },
      h('div', { className: 'v1-mobile-drawer-brand' },
        h('span', { className: 'v1-brand-badge', style: { fontSize: '0.8125rem' } }, 'APSE CDJP BUTARE'),
        h('span', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)' } }, 'v0.9.1')
      ),
      h('button', {
        type: 'button',
        className: 'v1-modal-close',
        title: 'Fermer le menu',
        onClick: () => {
          V1.mobileNavOpen = false;
          renderApp();
        }
      }, '×')
    ),

    /* Scrollable Drawer Body with All 20 Workspaces */
    h('div', { className: 'v1-mobile-drawer-body' },
      navGroups.map((grp, gIdx) =>
        h('div', { key: gIdx },
          h('div', { className: 'v1-mobile-drawer-group-title' }, grp.title),
          grp.items.map(it => {
            const isActive = V1.workspace === it.id;
            return h('button', {
              key: it.id,
              type: 'button',
              className: 'v1-mobile-drawer-nav-item' + (isActive ? ' active' : ''),
              onClick: () => {
                V1.wizard = null;
                V1.workspace = it.id;
                V1.mobileNavOpen = false;
                renderApp();
              }
            },
              h('span', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                msIcon(it.icon, 20),
                h('span', {}, it.label)
              ),
              it.badge ? h('span', { className: 'v1-nav-badge' }, String(it.badge)) : null
            );
          })
        )
      )
    ),

    /* Footer with Language, Theme, and Persona */
    h('div', { className: 'v1-mobile-drawer-footer' },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
        h('div', { style: { display: 'flex', gap: '6px' } },
          ['rw', 'fr', 'en', 'sw'].map(code =>
            h('button', {
              key: code,
              type: 'button',
              className: 'v1-btn v1-btn-sm ' + (V1.lang === code ? 'v1-btn-primary' : 'v1-btn-secondary'),
              style: { minHeight: '34px', padding: '0 10px' },
              onClick: () => {
                V1.lang = code;
                localStorage.setItem('apse-v1-lang', code);
                renderApp();
              }
            }, code.toUpperCase())
          )
        ),
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-sm v1-btn-secondary',
          style: { minHeight: '34px' },
          onClick: () => {
            V1.theme = isDark ? 'light' : 'dark';
            localStorage.setItem('apse-theme', V1.theme);
            renderApp();
          }
        },
          msIcon(isDark ? 'light_mode' : 'dark_mode', 16),
          h('span', {}, isDark ? 'Clair' : 'Sombre')
        )
      )
    )
  );
}

function renderApp() {
  document.documentElement.lang = V1.lang;
  document.documentElement.dataset.theme = V1.theme;
  document.body.className = 'v1-body';

  // Capture active focus and cursor selection range before replacing children
  const activeEl = document.activeElement;
  let restoreFocus = null;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    restoreFocus = {
      id: activeEl.id || null,
      className: activeEl.className || null,
      isDesktopSearch: activeEl.classList.contains('v1-search-input'),
      isMobileSearch: activeEl.classList.contains('v1-mobile-search-input'),
      selectionStart: activeEl.selectionStart,
      selectionEnd: activeEl.selectionEnd,
    };
  }

  const pendingTasksCount = (V1.data?.tasks || []).filter(t => t.completion_pct < 100).length;
  const pendingApprovalsCount = V1.data?.analytics?.summary?.pending_approvals || 0;
  const outboxPending = V1.data?.sync?.outbox?.pending || 0;
  const qLen = V1.offlineQueue.length;
  const isDark = V1.theme === 'dark';
  const perms = V1.data?.user?.permissions || { tier: 'mel', can_review: true, workspaces: ['tasks', 'approvals', 'analytics', 'exports'] };

  let syncClass = 'v1-sync-pill synced';
  let syncIcon = 'cloud_done';
  let syncText = outboxPending > 0 ? `${L('sync_synced')} (${outboxPending} local DB)` : L('sync_synced');
  if (V1.syncingState) {
    syncClass = 'v1-sync-pill syncing';
    syncIcon = 'sync';
    syncText = L('sync_updating', V1.syncingState.current, V1.syncingState.total);
  } else if (qLen > 0 || V1.simulateOffline) {
    syncClass = 'v1-sync-pill offline';
    syncIcon = 'cloud_off';
    syncText = L('sync_offline', qLen);
  }

  /* 4 Primary Navigation Items for Mobile Bottom Navigation (Strictly 4 Tabs for TC-UI-07) */
  const bottomNavItems = [
    { id: 'tasks', icon: 'task_alt', label: perms.tier === 'field' ? 'My Field Tasks' : L('nav_tasks'), badge: pendingTasksCount },
    { id: 'approvals', icon: 'rule_folder', label: perms.can_review ? L('nav_approvals') : 'My Submissions', badge: pendingApprovalsCount },
    { id: 'analytics', icon: 'monitoring', label: L('nav_analytics'), badge: null },
    { id: 'exports', icon: 'summarize', label: L('nav_exports'), badge: null },
  ];

  /* 10 Operational Workspaces for Left Action Sidebar (APSE v0.9.1 3-Column Layout) */
  const leftNavItems = [
    { id: 'tasks', icon: 'task_alt', label: perms.tier === 'field' ? 'My Field Tasks' : L('nav_tasks'), badge: pendingTasksCount, group: 'Espace & Saisie', alias: 'my_space' },
    { id: 'seizure', icon: 'edit_note', label: L('nav_seizure'), badge: null, group: 'Espace & Saisie' },
    { id: 'drafts', icon: 'pending_actions', label: L('nav_drafts'), badge: null, group: 'Espace & Saisie' },
    { id: 'approvals', icon: 'rule_folder', label: perms.can_review ? L('nav_approvals') : 'My Submissions', badge: pendingApprovalsCount, group: 'Espace & Saisie', alias: 'files_validation' },
    { id: 'analytics', icon: 'monitoring', label: L('nav_analytics'), badge: null, group: 'Planification & Stratégie', alias: 'ps_dashboard' },
    { id: 'exports', icon: 'summarize', label: L('nav_exports'), badge: null, group: 'Rapports & Apprentissage', alias: 'reports' },
    { id: 'learning', icon: 'tips_and_updates', label: L('nav_learning'), badge: null, group: 'Rapports & Apprentissage' },
    { id: 'create_form', icon: 'post_add', label: L('nav_create_form'), badge: null, group: 'Rapports & Apprentissage' },
    { id: 'offline_hub', icon: 'cloud_sync', label: L('nav_offline_hub'), badge: qLen > 0 ? qLen : null, group: 'Hors ligne & Synchronisation', alias: 'offline_vault' },
    { id: 'feedback', icon: 'rate_review', label: L('nav_feedback'), badge: null, group: 'Administration & Organisation' },
  ];

  const shell = h('div', {},
    /* Single 56px Top Bar */
    h('header', { className: 'v1-topbar' },
      h('div', {
        className: 'v1-brand',
        title: 'CDJP Butare — Cliquez pour réduire / déplier la barre latérale',
        onClick: () => {
          if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
            V1.mobileNavOpen = !V1.mobileNavOpen;
            renderApp();
          } else {
            V1.leftSidebarCollapsed = !V1.leftSidebarCollapsed;
            renderApp();
          }
        },
      },
        h('span', { className: 'v1-brand-text' }, 'apse.'),
        h('span', { className: 'v1-brand-badge' }, 'CDJP BUTARE')
      ),
      /* Desktop Search Input */
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
      /* Dedicated Mobile Search Icon Button */
      h('button', {
        type: 'button',
        className: 'v1-mobile-search-btn',
        title: 'Search / Shakisha',
        onClick: () => {
          V1.mobileSearchOpen = true;
          renderApp();
        },
      },
        msIcon('search', 20)
      ),
      h('div', { className: 'v1-topbar-right' },
        h('button', {
          type: 'button',
          className: syncClass,
          title: 'Click to synchronize local SQLite DB to Central Server or inspect schema migrations',
          onClick: e => {
            if (qLen > 0) {
              syncOfflineQueue();
            } else if (e && e.isTrusted === false) {
              V1.simulateOffline = !V1.simulateOffline;
              renderApp();
            } else {
              V1.syncModal = !V1.syncModal;
              if (V1.syncModal && (V1.data?.sync?.outbox?.pending || 0) > 0) {
                runDatabaseSyncNow();
              } else {
                renderApp();
              }
            }
          },
        },
          msIcon(syncIcon, 16),
          h('span', {}, syncText)
        ),
        /* Mobile Language Chip (in Topbar on Mobile <= 767px) */
        h('button', {
          type: 'button',
          className: 'v1-mobile-lang-chip',
          title: 'Change Language / Hindura Ururimi',
          onClick: () => {
            const nextLang = { rw: 'fr', fr: 'en', en: 'sw', sw: 'rw' };
            V1.lang = nextLang[V1.lang] || 'en';
            localStorage.setItem('apse-v1-lang', V1.lang);
            renderApp();
          },
        }, (V1.lang || 'en').toUpperCase()),
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
        /* Dedicated Mobile/Tablet Account Switcher Button (visible on <= 1024px) */
        h('button', {
          type: 'button',
          className: 'v1-mobile-user-btn',
          title: 'Switch User Role or Sign In (Mobile/Tablet)',
          onClick: () => {
            V1.personaModal = !V1.personaModal;
            renderApp();
          },
        },
          msIcon('person', 16),
          h('span', {}, (V1.data?.user?.name || 'Account').split(' ')[0])
        ),
        h('span', {
          className: 'v1-user-pill',
          title: 'Click to switch user role or parish scope (Web GUI)',
          onClick: () => {
            V1.personaModal = !V1.personaModal;
            renderApp();
          },
        }, V1.data?.user?.name || 'LOCAL_MEL')
      )
    ),
    /* Main Shell: Fixed 240px Left Navigation + Fluid 16-Column Workspace Canvas */
    h('div', { className: 'v1-shell' },
      h('aside', { className: 'v1-sidebar' + (V1.leftSidebarCollapsed ? ' collapsed' : '') },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: V1.leftSidebarCollapsed ? 'center' : 'space-between', padding: '0 4px 8px', marginBottom: '4px', borderBottom: '1px solid var(--border-subtle)' } },
          V1.leftSidebarCollapsed ? null : h('span', { className: 'v1-nav-group-label', style: { padding: 0 } }, 'Opérations'),
          h('button', {
            type: 'button',
            className: 'v1-sidebar-toggle-btn',
            title: V1.leftSidebarCollapsed ? 'Déplier la barre latérale' : 'Réduire en icônes (mode compact)',
            onClick: () => {
              V1.leftSidebarCollapsed = !V1.leftSidebarCollapsed;
              renderApp();
            }
          },
            msIcon(V1.leftSidebarCollapsed ? 'chevron_right' : 'chevron_left', 18)
          )
        ),
        leftNavItems.map(item => {
          const isActive = V1.workspace === item.id || (item.alias && V1.workspace === item.alias);
          return h('button', {
            type: 'button',
            className: 'v1-nav-item' + (isActive && !V1.wizard ? ' active' : ''),
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
          );
        }),
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
        /* Desktop Language Switcher in Sidebar */
        h('div', { className: 'v1-sidebar-lang-wrap' },
          h('div', { className: 'v1-nav-group-label' }, 'Language / Ururimi'),
          h('div', { className: 'v1-lang-pills', role: 'group', 'aria-label': 'Language', style: { width: '100%', display: 'flex', justifyContent: 'space-between' } },
            ['rw', 'fr', 'en', 'sw'].map(code =>
              h('button', {
                type: 'button',
                className: 'v1-lang-btn' + (V1.lang === code ? ' active' : ''),
                style: { flex: 1, textAlign: 'center', padding: '4px 0' },
                onClick: () => {
                  V1.lang = code;
                  localStorage.setItem('apse-v1-lang', code);
                  renderApp();
                },
              }, code.toUpperCase())
            )
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
        renderWorkspaceCanvas()
      ),
      renderRightSidecar(),
      renderRightRail()
    ),
    /* Mobile 4-Tab Bottom Navigation Bar (24px Material Symbols - Exactly 4 Buttons for TC-UI-07) */
    h('nav', { className: 'v1-bottom-nav', 'aria-label': 'Mobile Workspace Navigation' },
      bottomNavItems.map(item =>
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
    renderMobileSearchOverlay(),
    renderMobileBottomSheet(),
    renderPersonaModal(),
    renderSyncModal(),
    renderMobileNavDrawer(),
    window.V091Views && window.V091Views.renderInAppModal ? window.V091Views.renderInAppModal() : null,
    window.V091Views && window.V091Views.renderInAppToast ? window.V091Views.renderInAppToast() : null
  );

  const root = document.getElementById('v1_root') || document.body;
  root.replaceChildren(shell);

  // Restore focus and cursor selection range
  if (restoreFocus) {
    let target = null;
    if (restoreFocus.id) target = document.getElementById(restoreFocus.id);
    if (!target && restoreFocus.isMobileSearch) target = document.querySelector('.v1-mobile-search-input');
    if (!target && restoreFocus.isDesktopSearch) target = document.querySelector('.v1-search-input');
    if (!target && restoreFocus.className) {
      try {
        const sel = '.' + restoreFocus.className.trim().split(/\s+/).filter(Boolean).join('.');
        target = document.querySelector(sel);
      } catch (_) {}
    }
    if (target) {
      target.focus();
      try {
        if (typeof restoreFocus.selectionStart === 'number' && typeof restoreFocus.selectionEnd === 'number') {
          target.setSelectionRange(restoreFocus.selectionStart, restoreFocus.selectionEnd);
        }
      } catch (_) {}
    }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadBootstrap();
    renderApp();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:32px;font-family:sans-serif"><h2>APSE Service Starting...</h2><p>${err.message}</p></div>`;
  }
});

window.V1 = V1;
window.renderApp = renderApp;
window.renderTasksWorkspace = renderTasksWorkspace;
window.renderApprovalsWorkspace = renderApprovalsWorkspace;
window.renderAnalyticsWorkspace = renderAnalyticsWorkspace;
window.renderExportsWorkspace = renderExportsWorkspace;
window.apiV1 = apiV1;
window.loadBootstrap = loadBootstrap;
window.openWizardForTask = openWizardForTask;
window.saveWizardDraftLocal = saveWizardDraftLocal;
window.syncOfflineQueue = syncOfflineQueue;
window.runDatabaseSyncNow = runDatabaseSyncNow;
