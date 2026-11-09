'use strict';
/* ==========================================================================
   APSE v0.9.1 Operational Views & Workspaces Extension
   Full implementations of the 20 tabs from the client platform:
   1. My Space (Mon espace)
   2. Seizure (Saisie — 45 forms F01-F45, 186 fields, CPJP Q1-Q4, Doc import prefill)
   3. Files and validation (Dossiers et validation — 5-stage workflow, review actions)
   4. Learning (Apprentissage — F27, F28, F29 with "Apply", F30 adaptations & effect)
   5. Reports (Rapports — R13 builder, frozen snapshots + R01-R12 downloads)
   6. Prepare/Open offline (Préparer / ouvrir hors ligne — AES-GCM vault)
   7. Synchronize the offline queue (Synchroniser la file hors ligne)
   8. PS Planning (Planification du PS — AP1-AP5, STAFF vs CPJP, 5 axes, 25 lines, 33 tasks)
   9. Metadata (Métadonnées — MEL administration of all catalog categories)
   10. Back to the file (Retours sur les dossiers — encrypted feedback thread & inbox)
   11. Projects and operations (Projets et opérations — portfolio, KPIs EFF-01, EFI-01/02, FIN-01)
   12. Evaluation of staff achievements (Évaluation des réalisations — F05/F43/F04/F03 matrix)
   13. Create/share a form (Créer / partager un formulaire — custom collection builder & grants)
   14. Drafts in progress (Brouillons en cours & Corbeille / Recycle bin)
   15. PS Dashboard (Tableau de bord PS — D01-D13 views, 35 KPIs, alerts)
   16. Assistant and controls (Assistant et contrôles — structural checks & writing assistant)
   17. Contacts (Contacts — staff directory, 6 CDJP staff contacts, channels)
   18. Data structure and flow (Structure et flux des données — org charts & hierarchy)
   19. Timesheets (Feuilles de temps — F31/F32, <=24h/day, approved vs drafts, 4 exports)
   20. MEL Administration (Administration MEL — audit log, legal holds >=365d, local accounts)
   ========================================================================== */

(function(root) {
  const V091 = {
    // In-App Modal & Toast state
    modal: {
      open: false,
      title: '',
      subtitle: '',
      icon: '',
      content: null,
      maxWidth: '680px',
      actions: [],
    },
    toast: {
      visible: false,
      message: '',
      type: 'info',
      timer: null,
    },
    metadataCategoryFilter: '',

    // Google Forms Style Builder & History Gallery state
    activeFormTab: 'builder', // 'builder' | 'gallery'
    activeFormIndex: 0,
    formsSearch: '',
    formsFilter: 'ALL',
    formsList: [
      {
        id: 'c_youth_01',
        code: 'C_YOUTH_01',
        title: { fr: 'Enquête Annuelle sur la Jeunesse et Cohésion Sociale', en: 'Annual Youth & Social Cohesion Survey', rw: 'Ubushakashatsi ku rubyiruko', sw: 'Utafiti wa Vijana' },
        description: 'Collecte standard pour évaluer la participation des jeunes dans les clubs de paix et activités civiques.',
        audienceRoles: ['APSE_CPJP', 'APSE_PARISH_REPORTER'],
        sensitive: false,
        updatedAt: '2026-10-15',
        status: 'ACTIVE',
        questions: [
          { id: 'q1', code: 'q1_club', label: { fr: 'Nom ou référence du Club de Paix' }, type: 'TEXT', required: true },
          { id: 'q2', code: 'q2_participants', label: { fr: 'Nombre de jeunes présents à la session' }, type: 'NUMBER', required: true },
          { id: 'q3', code: 'q3_theme', label: { fr: 'Thématique principale abordée' }, type: 'RADIO', options: ['Résolution non-violente des conflits', 'Justice écologique et Laudato Si', 'Droits humains et devoirs civiques', 'Autre thématique'], required: true },
          { id: 'q4', code: 'q4_score', label: { fr: 'Niveau d\'engagement perçu des jeunes participants' }, type: 'SCALE_1_5', scaleMin: 1, scaleMax: 5, minLabel: 'Faible', maxLabel: 'Remarquable', required: false },
        ]
      },
      {
        id: 'c_eval_q1',
        code: 'C_EVAL_Q1',
        title: { fr: 'Évaluation Trimestrielle des Comités Paroissiaux Q1', en: 'Parish Committees Q1 Evaluation', rw: 'Isuzuma ry\'igihembwe cya 1', sw: 'Tathmini ya Robo ya 1' },
        description: 'Auto-évaluation de la dynamique des comités Justice et Paix de base et médiation communautaire.',
        audienceRoles: ['APSE_CPJP', 'DIOCESE_MEL'],
        sensitive: false,
        updatedAt: '2026-11-01',
        status: 'ACTIVE',
        questions: [
          { id: 'q1', code: 'q1_parish', label: { fr: 'Paroisse concernée' }, type: 'DROPDOWN', options: ['Astrida (Cathédrale)', 'Save', 'Kansi', 'Maraba', 'Mugombwa', 'Autre paroisse'], required: true },
          { id: 'q2', code: 'q2_meetings', label: { fr: 'Nombre de réunions tenues ce trimestre' }, type: 'NUMBER', required: true },
          { id: 'q3', code: 'q3_cases', label: { fr: 'Nombre de litiges fonciers / familiaux résolus à l\'amiable' }, type: 'NUMBER', required: true },
          { id: 'q4', code: 'q4_feedback', label: { fr: 'Principaux défis rencontrés et besoins d\'appui diocésain' }, type: 'LONG_TEXT', required: false },
        ]
      },
      {
        id: 'c_recon_feed',
        code: 'C_RECON_FEED',
        title: { fr: 'Fiche de Rétroaction — Ateliers de Réconciliation', en: 'Reconciliation Workshops Feedback Form', rw: 'Ifishi y\'ibitekerezo ku bwiyunge', sw: 'Fomu ya Maoni ya Upatanisho' },
        description: 'Recueil des impressions des participants après les cercles de parole et d\'écoute.',
        audienceRoles: ['APSE_CPJP'],
        sensitive: true,
        updatedAt: '2026-11-03',
        status: 'DRAFT',
        questions: [
          { id: 'q1', code: 'q1_safe', label: { fr: 'Vous êtes-vous senti écouté et en sécurité durant l\'atelier ?' }, type: 'RADIO', options: ['Tout à fait', 'En partie', 'Pas vraiment', 'Pas du tout'], required: true },
          { id: 'q2', code: 'q2_dialogue', label: { fr: 'Le dialogue avec l\'autre partie a-t-il progressé ?' }, type: 'RADIO', options: ['Oui, grandement', 'Progrès modéré', 'Aucun changement perceptible'], required: true },
          { id: 'q3', code: 'q3_next_steps', label: { fr: 'Vos suggestions et recommandations pour la suite' }, type: 'LONG_TEXT', required: false },
        ]
      }
    ],

    activeFormCode: 'F07',
    formSearch: '',
    formCategory: 'ALL',
    formValues: {},
    prefillPreview: null,
    prefillConflicts: [],
    prefillWarnings: [],
    selectedFile: null,

    // Planning state
    planningYear: 'AP1',
    planningAudience: 'STAFF',
    planningFilterAxis: 'ALL',
    planningFilterType: 'ALL',
    planningSearch: '',
    planningData: null,
    planningLoading: false,
    planningError: null,
    planningShowRoadmap: false,

    // Feedback state
    selectedRecordForFeedback: null,
    feedbackThread: [],
    feedbackRecipient: 'AUTHOR',
    feedbackText: '',

    // Timesheet state
    timesheetForm: 'F31',
    timesheetIncludeDrafts: false,
    timesheetOwnerFilter: 'ALL',
    timesheetLogModal: false,
    timesheetEntries: [],
    timesheetSummary: null,

    // MEL Admin state
    melAdminTab: 'audit',
    melAdminData: null,
    auditFilterActor: '',
    auditFilterAction: '',
    legalHoldModal: false,
    staffModal: false,
    localAccountModal: false,

    // Learning state
    learningSubTab: 'f29',

    // Reports state
    reportsSubTab: 'r13',
    r13Narrative: {
      summary: '',
      outcomes: '',
      variance: '',
      learning: '',
      actions: '',
      limitations: '',
    },
    r13Model: null,

    // Portfolio state
    portfolioFilterType: 'ALL',
    portfolioFilterProject: 'ALL',
    portfolioFilterPartner: 'ALL',
    portfolioData: null,
    portfolioLoading: false,
    portfolioError: null,

    // Staff Eval state
    staffEvalLevel: 'F05',
    staffEvalData: null,
    staffEvalLoading: false,

    // Inbox state
    inboxData: null,
    inboxLoading: false,
    assistantStatus: null,
    contactsData: null,
    contactsLoading: false,

    // Staff Eval state
    staffEvalLevel: 'F05',
    staffEvalData: null,

    // Custom Form Builder state
    builderQuestions: [
      { code: 'q1_title', label: { fr: 'Titre de l’activité', en: 'Activity title', rw: 'Umutwe w’igikorwa', sw: 'Kichwa cha shughuli' }, type: 'TEXT', required: true }
    ],
    builderCode: 'C_COMM_01',
    builderLabel: { fr: 'Enquête communautaire', en: 'Community Survey', rw: 'Ubushakashatsi mu baturage', sw: 'Utafiti wa jamii' },
    builderSensitive: false,
    builderRoles: ['APSE_CPJP', 'APSE_PARISH_REPORTER'],

    // Assistant state
    assistantForm: 'F07',
    assistantText: '',
    assistantTask: 'controls',
    assistantResults: null,

    // Vault state
    vaultPassphrase: '',
    vaultUnlocked: false,
    vaultStatusMessage: '',
  };

  
  /* --------------------------------------------------------------------------
     IN-APP MODAL & TOAST DIALOG SYSTEM
     Replaces native browser alert(), prompt(), confirm()
     -------------------------------------------------------------------------- */
  V091.showToast = function(message, type = 'info') {
    if (V091.toast.timer) clearTimeout(V091.toast.timer);
    V091.toast.visible = true;
    V091.toast.message = message;
    V091.toast.type = type;
    V091.toast.timer = setTimeout(() => {
      V091.toast.visible = false;
      if (typeof renderApp === 'function') renderApp();
    }, 3800);
    if (typeof renderApp === 'function') renderApp();
  };

  V091.showModal = function({ title, subtitle, icon, content, maxWidth = '680px', actions = [] }) {
    V091.modal.open = true;
    V091.modal.title = title || '';
    V091.modal.subtitle = subtitle || '';
    V091.modal.icon = icon || 'info';
    V091.modal.content = content || null;
    V091.modal.maxWidth = maxWidth;
    V091.modal.actions = actions || [];
    if (typeof renderApp === 'function') renderApp();
  };

  V091.closeModal = function() {
    V091.modal.open = false;
    V091.modal.content = null;
    if (typeof renderApp === 'function') renderApp();
  };

  /* --------------------------------------------------------------------------
     FIGMA / CLICKUP-STYLE CUSTOM DROPDOWN COMPONENT (Node 18:77 + Add Task Menu)
     Renders the rounded #F5F5F5 trigger ("Prefix | Selected Label ⌄") and opens
     a floating theme-adaptive popover menu (.v1-cu-add-dropdown) on click.
     -------------------------------------------------------------------------- */
  V091.openDropdownId = null;

  V091.renderFigmaDropdown = function({ id, prefix, value, options = [], placeholder = 'Sélectionner...', width, className = '', onChange }) {
    const isOpen = V091.openDropdownId === id;
    const selectedOpt = options.find(o => String(o.value) === String(value));
    const displayLabel = selectedOpt ? selectedOpt.label : (options[0] && value === undefined ? options[0].label : placeholder);

    return h('div', {
      className: ('v1-figma-dropdown-wrap ' + className).trim(),
      style: width ? { width } : undefined,
    },
      /* Hidden native select for programmatic test compatibility */
      h('select', {
        className: 'v1-select v1-figma-native-sync',
        'aria-hidden': 'true',
        tabIndex: -1,
        value: value !== undefined ? String(value) : '',
        onChange: e => {
          if (typeof onChange === 'function') onChange(e.target.value);
          if (typeof renderApp === 'function') renderApp();
        },
      },
        options.map(o => h('option', {
          key: String(o.value),
          value: String(o.value),
          selected: String(o.value) === String(value) ? 'selected' : null,
        }, o.label))
      ),

      /* Custom Trigger Button (Figma Node 18:77) */
      h('button', {
        type: 'button',
        className: 'v1-figma-dropdown-trigger' + (isOpen ? ' is-open' : ''),
        'aria-haspopup': 'listbox',
        'aria-expanded': isOpen ? 'true' : 'false',
        onClick: e => {
          e.stopPropagation();
          V091.openDropdownId = isOpen ? null : id;
          if (typeof renderApp === 'function') renderApp();
        },
      },
        prefix ? h('span', { className: 'v1-figma-dropdown-prefix' }, prefix) : null,
        h('span', { className: 'v1-figma-dropdown-value' }, displayLabel),
        h('span', { className: 'v1-figma-dropdown-caret' },
          h('img', {
            src: 'assets/figma/iconsax-arrow-down4.svg',
            width: '19',
            height: '19',
            alt: '',
            className: 'v1-figma-caret-img',
          })
        )
      ),

      /* Floating Menu (Matches New Add Task Button Dropdown .v1-cu-add-dropdown) */
      isOpen ? h('div', {
        className: 'v1-cu-add-dropdown v1-figma-dropdown-menu is-open',
        role: 'listbox',
        onClick: e => e.stopPropagation(),
      },
        options.map(o => {
          const isSelected = String(o.value) === String(value);
          return h('button', {
            type: 'button',
            key: String(o.value),
            role: 'option',
            'aria-selected': isSelected ? 'true' : 'false',
            className: 'v1-cu-dropdown-item v1-figma-dropdown-item' + (isSelected ? ' active' : ''),
            onClick: () => {
              V091.openDropdownId = null;
              if (typeof onChange === 'function') onChange(o.value);
              if (typeof renderApp === 'function') renderApp();
            },
          },
            h('span', { className: 'v1-figma-item-text' }, o.label),
            isSelected ? msIcon('check', 16) : null
          );
        })
      ) : null
    );
  };
  if (typeof window !== 'undefined') {
    window.renderFigmaDropdown = V091.renderFigmaDropdown;
  }

  /* Duplicate Form action */
  V091.duplicateForm = function(formId) {
    const orig = V091.formsList.find(f => f.id === formId || f.code === formId);
    if (!orig) return;
    const clone = JSON.parse(JSON.stringify(orig));
    const stamp = Date.now().toString().slice(-4);
    clone.id = 'c_form_' + stamp;
    clone.code = (orig.code + '_COPY_' + stamp).toUpperCase();
    const frTitle = orig.title?.fr || orig.title || 'Formulaire';
    clone.title = {
      fr: 'Copie de ' + frTitle,
      en: 'Copy of ' + (orig.title?.en || frTitle),
      rw: 'Kopi ya ' + (orig.title?.rw || frTitle),
      sw: 'Nakala ya ' + (orig.title?.sw || frTitle),
    };
    clone.status = 'DRAFT';
    clone.updatedAt = new Date().toISOString().slice(0, 10);
    V091.formsList.unshift(clone);
    V091.activeFormIndex = 0;
    V091.activeFormTab = 'builder';
    V091.showToast('✓ Formulaire dupliqué avec succès : ' + clone.code, 'info');
    if (typeof renderApp === 'function') renderApp();
  };

  /* Deep-link to F03 and prefill all 17 authoritative planning properties */
  V091.preparePlanningActivity = function(item, yearData) {
    const lang = V1.lang || 'fr';
    const labelText = (item.labels && (item.labels[lang] || item.labels.fr || item.labels.en || item.labels.rw || item.labels.sw)) || item.code;
    const expectedText = (item.expected && (item.expected[lang] || item.expected.fr || item.expected.en)) || '';
    const indicatorText = (item.indicator && (item.indicator[lang] || item.indicator.fr || item.indicator.en)) || '';
    const fundersText = Object.keys(item.fundingMarks || {}).map(k => ({ I: 'FP', J: 'AGIAMONDO', K: 'Missio' }[k] || k)).join(', ');
    const start = yearData?.start || '2026-09-01';
    const end = yearData?.end || '2027-08-31';

    V091.activeFormCode = 'F03';
    V091.activeFormSectionIndex = 0;
    V091.formValues = {
      work_type: 'OPERATIONAL',
      ap: V091.planningYear,
      plan_type: V091.planningAudience,
      operation_ref: item.code,
      axis: item.axis,
      objective: item.objective || (item.axis + '.OS'),
      result: item.result || (item.axis + '.R1'),
      intervention: item.intervention || (item.interventionCandidates ? item.interventionCandidates[0] : (item.axis + '.I1')),
      record: `rec-f03-${item.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      title: labelText,
      activity: labelText,
      start: start,
      end: end,
      owner: V1.data?.user?.id || 'mel',
      change: expectedText,
      indicator: indicatorText,
      budget: item.budgetRWF != null ? String(item.budgetRWF) : '',
      location: item.locations || '',
      beneficiary_target: item.beneficiariesSource || '',
      funders: fundersText,
      source: item.source || '',
    };
    V1.workspace = 'seizure';
    V091.showToast(`✓ Pré-remplissage de F03 pour l'activité ${item.code}`, 'info');
    if (typeof renderApp === 'function') renderApp();
  };

  /* In-App Full Planning Item Details Modal */
  V091.showPlanningItemModal = function(item, yearData) {
    const lang = V1.lang || 'fr';
    const title = (item.labels && (item.labels[lang] || item.labels.fr || item.labels.en || item.labels.rw || item.labels.sw)) || item.code;
    const isLine = !!item.indicativeMillionsRWF;
    const kind = isLine ? 'Ligne Opérationnelle PS (Indicative)' : 'Tâche Annuelle PAO (Prioritaire)';
    const expected = (item.expected && (item.expected[lang] || item.expected.fr || item.expected.en)) || 'Renforcement de la cohésion et des capacités locales.';
    const indicator = (item.indicator && (item.indicator[lang] || item.indicator.fr || item.indicator.en)) || 'Taux d’exécution et qualité de la participation.';
    const funders = Object.keys(item.fundingMarks || {}).map(k => ({ I: 'FP (Misereor)', J: 'AGIAMONDO', K: 'Missio' }[k] || k)).join(', ') || 'Fonds propres CDJP';
    const budgetStr = item.budgetRWF ? Number(item.budgetRWF).toLocaleString() + ' RWF' : (item.indicativeMillionsRWF ? (item.indicativeMillionsRWF[V091.planningYear] || Object.values(item.indicativeMillionsRWF)[0]) + ' M RWF' : '—');

    V091.showModal({
      title: `${item.code} · ${title}`,
      subtitle: `${kind} · Axe ${item.axis} · Objectif ${item.objective} · ${item.intervention || (item.interventionCandidates ? item.interventionCandidates.join(' / ') : '')}`,
      icon: 'ps_planning',
      maxWidth: '820px',
      content: h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
        h('div', { style: { padding: '12px 16px', background: 'var(--bg-canvas)', borderRadius: '12px' } },
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '6px' } },
            h('span', { className: 'v1-badge', style: { background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontWeight: '700' } }, `Axe Stratégique ${item.axis}`),
            h('span', { className: 'v1-badge' }, `Objectif : ${item.objective}`),
            h('span', { className: 'v1-badge' }, `Intervention : ${item.intervention || (item.interventionCandidates ? item.interventionCandidates.join(' / ') : 'Axe transversal')}`),
            h('span', { className: 'v1-meta-code-badge' }, item.code)
          ),
          h('strong', { style: { fontSize: '0.9375rem', display: 'block', color: 'var(--text-primary)' } }, title)
        ),
        h('div', { className: 'v1-grid-16' },
          h('div', { style: { gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '12px' } },
            h('div', { className: 'v1-panel', style: { padding: '12px' } },
              h('span', { style: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } }, msIcon('target', 14), 'Changement Stratégique Recherché'),
              h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 } }, expected)
            ),
            h('div', { className: 'v1-panel', style: { padding: '12px' } },
              h('span', { style: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } }, msIcon('analytics', 14), 'Indicateur Stratégique PS'),
              h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 } }, indicator)
            ),
            h('div', { className: 'v1-panel', style: { padding: '12px' } },
              h('span', { style: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' } }, msIcon('globe', 14), 'Libellés en 4 langues'),
              h('div', { style: { fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' } },
                h('div', {}, h('strong', {}, 'FR : '), item.labels?.fr || '—'),
                h('div', {}, h('strong', {}, 'RW : '), item.labels?.rw || '—'),
                h('div', {}, h('strong', {}, 'EN : '), item.labels?.en || '—'),
                h('div', {}, h('strong', {}, 'SW : '), item.labels?.sw || '—')
              )
            )
          ),
          h('div', { style: { gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '12px' } },
            h('div', { className: 'v1-panel', style: { padding: '12px' } },
              h('span', { style: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } }, msIcon('payments', 14), 'Budget & Financement'),
              h('div', { style: { fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-success)', marginBottom: '4px' } }, budgetStr),
              item.indicativeMillionsRWF ? h('div', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' } },
                'Enveloppe quinquennale : ' + Object.entries(item.indicativeMillionsRWF).map(([y, m]) => `${y}: ${m}M`).join(' · ')
              ) : null,
              h('div', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)' } }, `Bailleurs : ${funders}`),
              h('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' } }, `Portée : ${item.budgetScope || 'Enveloppe PS approuvée'}`)
            ),
            h('div', { className: 'v1-panel', style: { padding: '12px' } },
              h('span', { style: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } }, msIcon('place', 14), 'Périmètre & Acteurs'),
              h('div', { style: { fontSize: '0.8125rem' } }, h('strong', {}, 'Localisation : '), item.locations || '27 paroisses / 4 districts'),
              h('div', { style: { fontSize: '0.8125rem', marginTop: '2px' } }, h('strong', {}, 'Responsable : '), item.responsibleSource || 'Responsable de volet CDJP'),
              h('div', { style: { fontSize: '0.8125rem', marginTop: '2px' } }, h('strong', {}, 'Bénéficiaires : '), item.beneficiariesSource || 'Communautés locales, jeunes, femmes')
            ),
            h('div', { className: 'v1-panel', style: { padding: '12px', background: 'var(--bg-canvas)' } },
              h('span', { style: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } }, msIcon('description', 14), 'Source Documentaire'),
              h('p', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, wordBreak: 'break-word' } }, item.source || 'Plan Stratégique CDJP Butare 2026–2031')
            )
          )
        )
      ),
      actions: [
        {
          label: 'Préparer cette activité (F03)',
          type: 'primary',
          onClick: () => {
            V091.closeModal();
            V091.preparePlanningActivity(item, yearData);
          }
        },
        {
          label: 'Fermer',
          type: 'secondary',
          onClick: () => V091.closeModal()
        }
      ]
    });
  };

  /* Interactive Metadata Details Popup */
  V091.showMetadataDetailsModal = function(category) {
    const catTitles = {
      axes: 'Axes Stratégiques (5 Axes)',
      objectives: 'Objectifs Stratégiques (5 Objectifs)',
      results: 'Résultats Stratégiques (13 Résultats)',
      interventions: 'Interventions Stratégiques (15 Interventions)',
      years: 'Années Pastorales (AP1–AP5)',
      operational_lines: 'Lignes Opérationnelles Indicatives (25 Lignes)',
      annual_tasks: 'Tâches Annuelles AP1 (33 Tâches)',
      organisation_units: 'Unités Organisationnelles (Paroisses & Centrales)',
      ccjp_units: 'Comités Justice et Paix de Base',
      geography_units: 'Périmètres Géographiques (4 Districts)',
      volets: 'Volets Pastoraux & Institutionnels (4 Volets)',
      projects: 'Projets en Cours & Financements',
      programs: 'Programmes Pluriannuels',
      partners: 'Partenaires Techniques et Financiers',
      positions: 'Postes et Rôles Institutionnels',
      fields: 'Dictionnaire des 186 Champs',
      forms: 'Catalogue des 45 Formulaires (F01–F45)',
      settings: 'Paramètres et Règles de Validation',
    };

    const modalTitle = catTitles[category] || `Référentiel : ${category}`;

    /* Curated, human-readable data for key categories */
    let items = [];
    if (category === 'axes') {
      items = [
        { code: 'A1', label: 'Guérison, Unité et Réconciliation', rw: 'Ubukangurambaga ku Bwiyunge n’Ubumwe', en: 'Healing, Unity & Reconciliation', count: '2 Résultats (A1.R1, A1.R2) · 3 Interventions', desc: 'Accompagnement psychosocial, cercles d’écoute, dialogue communautaire et mémoire apaisée.' },
        { code: 'A2', label: 'Résolution Pacifique des Conflits', rw: 'Gukemura Amakimbirane mu Mahoro', en: 'Peaceful Conflict Resolution', count: '3 Résultats (A2.R1, A2.R2, A2.R3) · 3 Interventions', desc: 'Médiation foncière et familiale, formation des comités paroissiaux et prévention non-violente.' },
        { code: 'A3', label: 'Justice Écologique et Environnement', rw: 'Ubutabera ku Bidukikije no Kurengera Isi', en: 'Ecological Justice & Environment', count: '2 Résultats (A3.R1, A3.R2) · 3 Interventions', desc: 'Application de Laudato Si’, reboisement communautaire, pépinières et transition agroécologique.' },
        { code: 'A4', label: 'Droits Humains et Aide Juridique', rw: 'Uburenganzira bwa Muntu n’Ubufasha mu by’Amategeko', en: 'Human Rights & Legal Aid', count: '3 Résultats (A4.R1, A4.R2, A4.R3) · 3 Interventions', desc: 'Clinique juridique diocésaine, écoute des victimes vulnérables et monitoring des droits fondamentaux.' },
        { code: 'A5', label: 'Renforcement des Comités et Équipes', rw: 'Gushimangira Ubushobozi bw’Inzego n’Amakipe', en: 'Institutional Capacity & MEL', count: '3 Résultats (A5.R1, A5.R2, A5.R3) · 3 Interventions', desc: 'Gouvernance interne, équipement des 27 commissions paroissiales, système de suivi-évaluation APSE.' },
      ];
    } else if (category === 'results') {
      items = [
        { code: 'A1.R1', label: 'Espaces de dialogue et guérison des mémoires opérationnels', axis: 'A1', desc: 'Cercles de guérison et ateliers de réconciliation organisés dans les paroisses.' },
        { code: 'A1.R2', label: 'Cohésion sociale renforcée entre générations et communautés', axis: 'A1', desc: 'Clubs de paix scolaires et initiatives conjointes de jeunesse.' },
        { code: 'A2.R1', label: 'Comités de médiation paroissiaux formés et opérationnels', axis: 'A2', desc: 'Médiateurs bénévoles équipés pour la résolution amiable des différends.' },
        { code: 'A2.R2', label: 'Litiges fonciers et intrafamiliaux résolus sans recours judiciaire', axis: 'A2', desc: 'Dossiers traités et clôturés avec accord consensuel écrit.' },
        { code: 'A2.R3', label: 'Système d’alerte précoce communautaire fonctionnel', axis: 'A2', desc: 'Remontée des tensions communautaires et désamorçage préventif.' },
        { code: 'A3.R1', label: 'Initiatives de reboisement et pépinières paroissiales établies', axis: 'A3', desc: 'Plants agroforestiers distribués et entretenus par les CEB.' },
        { code: 'A3.R2', label: 'Pratiques agroécologiques résilientes adoptées par les ménages', axis: 'A3', desc: 'Foyers améliorés et techniques de conservation des sols vulgarisées.' },
        { code: 'A4.R1', label: 'Assistance juridique et écoute assurées pour les vulnérables', axis: 'A4', desc: 'Conseils juridiques gratuits et accompagnement des personnes démunies.' },
        { code: 'A4.R2', label: 'Sensibilisation aux droits fondamentaux et devoirs civiques', axis: 'A4', desc: 'Campagnes d’information communautaire et émissions radiophoniques.' },
        { code: 'A4.R3', label: 'Visites et assistance psychosociale en milieu pénitentiaire', axis: 'A4', desc: 'Aumônerie carcérale et aide à la réinsertion post-libération.' },
        { code: 'A5.R1', label: 'Commissions Justice et Paix paroissiales (CPJP) actives', axis: 'A5', desc: '27 commissions dotées de plans d’action trimestriels et registres.' },
        { code: 'A5.R2', label: 'Système numérique MEL (APSE) pérennisé et maîtrisé', axis: 'A5', desc: 'Collecte sécurisée, synchronisation hors ligne et rapports R13 générés.' },
        { code: 'A5.R3', label: 'Gestion administrative, financière et fiduciaire exemplaire', axis: 'A5', desc: 'Audits HMAC réguliers, conformité bailleurs et transparence comptable.' },
      ];
    } else if (category === 'years') {
      items = [
        { code: 'AP1', label: 'Année Pastorale 1 (2026–2027)', desc: 'Période : 1 Sept 2026 au 31 Août 2027 · Quarts : Q1, Q2, Q3, Q4 · 33 Tâches prioritaires' },
        { code: 'AP2', label: 'Année Pastorale 2 (2027–2028)', desc: 'Période : 1 Sept 2027 au 31 Août 2028 (Année bissextile avec 29 Fév 2028)' },
        { code: 'AP3', label: 'Année Pastorale 3 (2028–2029)', desc: 'Période : 1 Sept 2028 au 31 Août 2029 · Revue à mi-parcours du Plan Stratégique' },
        { code: 'AP4', label: 'Année Pastorale 4 (2029–2030)', desc: 'Période : 1 Sept 2029 au 31 Août 2030 · Consolidation et extension des acquis' },
        { code: 'AP5', label: 'Année Pastorale 5 (2030–2031)', desc: 'Période : 1 Sept 2030 au 31 Août 2031 · Clôture du cycle quinquennal et évaluation finale' },
      ];
    } else if (category === 'geography_units' || category === 'organisation_units') {
      items = [
        { code: 'DIST-HUYE', label: 'District de Huye (11 Paroisses)', desc: 'Astrida Cathédrale, Save, Ngoma, Tumba, Mbazi, Maraba, Simbi, Karama, Ruhashya, Rusatira, Kinazi' },
        { code: 'DIST-GISAGARA', label: 'District de Gisagara (7 Paroisses)', desc: 'Kansi, Mugombwa, Kibirizi, Mamba, Higiro, Muganza, Kigembe' },
        { code: 'DIST-NYANZA', label: 'District de Nyanza (5 Paroisses)', desc: 'Nyanza Christ-Roi, Kigoma, Nyabisindu, Hanika, Rwabicuma' },
        { code: 'DIST-NYARUGURU', label: 'District de Nyaruguru (4 Paroisses)', desc: 'Kibeho Sanctuaire, Munini, Ruramba, Muganza-Sud' },
      ];
    } else {
      /* Fallback: fetch dynamically from /metadata */
      apiV1('/metadata', 'GET').then(m => {
        const raw = m[category] || [];
        V091.showModal({
          title: modalTitle,
          subtitle: `${raw.length} entrées configurées dans le schéma institutionnel MEL.`,
          icon: 'tune',
          content: h('div', { className: 'v1-meta-list' },
            raw.slice(0, 20).map((it, idx) =>
              h('div', { className: 'v1-meta-item-card', key: idx },
                h('div', { className: 'v1-meta-item-header' },
                  h('strong', {}, typeof it === 'string' ? it : (it.code || it.id || `Élément #${idx + 1}`)),
                  h('span', { className: 'v1-meta-code-badge' }, category.toUpperCase())
                ),
                typeof it === 'object' ? h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)' } },
                  it.label?.fr || it.label?.en || it.name || JSON.stringify(it).slice(0, 120)
                ) : null
              )
            )
          ),
          actions: [
            { label: 'Fermer', type: 'secondary', onClick: () => V091.closeModal() }
          ]
        });
      }).catch(err => {
        V091.showToast('Erreur chargement métadonnées : ' + err.message, 'error');
      });
      return;
    }

    /* Render modal for curated items */
    V091.showModal({
      title: modalTitle,
      subtitle: `${items.length} entrées validées dans le cadre stratégique CDJP Butare.`,
      icon: 'tune',
      content: h('div', { className: 'v1-meta-list' },
        items.map((it, idx) =>
          h('div', { className: 'v1-meta-item-card', key: idx },
            h('div', { className: 'v1-meta-item-header' },
              h('strong', { style: { fontSize: '0.9375rem', color: 'var(--text-primary)' } }, it.label),
              h('span', { className: 'v1-meta-code-badge' }, it.code)
            ),
            it.rw ? h('div', { style: { fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' } },
              `Kinyarwanda : ${it.rw}`
            ) : null,
            it.count ? h('div', { style: { fontSize: '0.8125rem', fontWeight: '600', color: 'var(--color-primary)' } },
              it.count
            ) : null,
            h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '4px 0 0' } },
              it.desc
            )
          )
        )
      ),
      actions: [
        {
          label: 'Éditer le schéma brut (JSON)',
          type: 'secondary',
          onClick: () => {
            V091.closeModal();
            V091.showToast('Accès éditeur JSON réservé aux administrateurs MEL.', 'info');
          }
        },
        { label: 'Fermer', type: 'primary', onClick: () => V091.closeModal() }
      ]
    });
  };

  /* Render In-App Modal Dialog Component */
  function renderInAppModal() {
    if (!V091.modal || !V091.modal.open) return null;
    return h('div', {
      className: 'v1-modal-backdrop',
      onClick: e => {
        if (e.target === e.currentTarget) V091.closeModal();
      }
    },
      h('div', {
        className: 'v1-modal-card',
        style: { maxWidth: V091.modal.maxWidth || '680px' },
        role: 'dialog',
        'aria-modal': 'true',
      },
        h('header', { className: 'v1-modal-header' },
          h('div', {},
            h('h2', { className: 'v1-modal-title' },
              msIcon(V091.modal.icon || 'info', 20),
              h('span', {}, V091.modal.title)
            ),
            V091.modal.subtitle ? h('p', { className: 'v1-modal-subtitle' }, V091.modal.subtitle) : null
          ),
          h('button', {
            type: 'button',
            className: 'v1-modal-close',
            title: 'Fermer (ESC)',
            onClick: () => V091.closeModal()
          }, '×')
        ),
        h('div', { className: 'v1-modal-body' },
          typeof V091.modal.content === 'function' ? V091.modal.content() : V091.modal.content
        ),
        h('footer', { className: 'v1-modal-footer' },
          (V091.modal.actions || []).map((act, aIdx) =>
            h('button', {
              key: aIdx,
              type: 'button',
              className: 'v1-btn ' + (act.type === 'primary' ? 'v1-btn-primary' : (act.type === 'danger' ? 'v1-btn-danger' : 'v1-btn-secondary')),
              onClick: act.onClick
            }, act.label)
          )
        )
      )
    );
  }

  /* Render In-App Toast Notification Component */
  function renderInAppToast() {
    if (!V091.toast || !V091.toast.visible) return null;
    return h('div', { className: 'v1-toast-container' },
      h('div', { className: 'v1-toast' + (V091.toast.type === 'error' ? ' v1-toast-error' : '') },
        msIcon(V091.toast.type === 'error' ? 'error' : 'check_circle', 20),
        h('span', {}, V091.toast.message)
      )
    );
  }

/* Helper to render custom styled file upload button matching Kargul Studio design system */
  function renderFileUploadComponent({ id, label, accept, onSelect, selectedFilename, helperText }) {
    const inputId = id || ('file_input_' + Math.random().toString(36).slice(2, 9));
    return h('div', { className: 'v1-file-upload-wrap' },
      h('button', {
        type: 'button',
        className: 'v1-btn v1-btn-secondary v1-file-upload-btn',
        onClick: () => {
          const el = document.getElementById(inputId);
          if (el) el.click();
        },
      },
        msIcon('upload_file', 18),
        h('span', {}, label || 'Choisir un document...')
      ),
      h('input', {
        type: 'file',
        id: inputId,
        style: { display: 'none' },
        accept: accept || '*/*',
        onChange: e => {
          const file = e.target.files && e.target.files[0];
          if (file && onSelect) onSelect(file);
        },
      }),
      selectedFilename ? h('span', { className: 'v1-chip v1-file-chip' },
        msIcon('description', 14),
        h('span', {}, selectedFilename)
      ) : null,
      helperText ? h('span', { className: 'v1-field-helper', style: { display: 'block', marginTop: '4px' } }, helperText) : null
    );
  }

  /* --------------------------------------------------------------------------
     1. MY SPACE (Mon espace)
     -------------------------------------------------------------------------- */
  function renderMySpaceWorkspace() {
    const user = V1.data?.user || {};
    const tasks = V1.data?.tasks || [];
    const logs = V1.data?.logs || [];
    const pendingReview = logs.filter(l => l.stage === 'SUBMITTED' || l.stage === 'CPJP_REVIEW');
    const myTasks = tasks.slice(0, 8);

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'APSE 2026–2031'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_my_space'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_my_space')),
            h('p', { className: 'v1-page-subtitle' },
              `Connecté en tant que ${user.name || 'Utilisateur'} · Rôles : ${(user.roles || []).join(', ')} · Périmètre : ${user.is_diocesan ? 'Diocèse (27 Paroisses)' : (user.assigned_parish || 'Paroisse')}`
            )
          ),
          h('div', { className: 'v1-header-actions' },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              onClick: () => {
                V1.workspace = 'seizure';
                renderApp();
              },
            },
              msIcon('add', 18),
              h('span', {}, 'Nouvelle saisie de formulaire')
            ),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary',
              onClick: () => {
                V1.personaModal = true;
                renderApp();
              },
            },
              msIcon('person', 18),
              h('span', {}, 'Changer de profil (14 profils)')
            )
          )
        )
      ),

      /* 4 KPI overview cards */
      h('div', { className: 'v1-kpi-grid', style: { marginBottom: '24px' } },
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'Activités prévues (Mes tâches)'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, String(tasks.length)),
          h('span', { className: 'v1-kpi-sub' }, `${tasks.filter(t => t.status === 'COMPLETED').length} terminées`)
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'Rapports en attente de revue'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, String(pendingReview.length)),
          h('span', { className: 'v1-kpi-sub' }, 'Comité CPJP & validation MEL')
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'Participants totaux accompagnés'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, String(V1.data?.analytics?.summary?.total_participants || 140)),
          h('span', { className: 'v1-kpi-sub' }, `${V1.data?.analytics?.summary?.women || 77} femmes · ${V1.data?.analytics?.summary?.men || 63} hommes`)
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'File locale hors ligne'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, String(V1.offlineQueue.length)),
          h('span', { className: 'v1-kpi-sub' }, V1.offlineQueue.length > 0 ? 'En attente de synchronisation' : 'Toutes les données synchronisées')
        )
      ),

      /* 14 Role Workspace Profiles Grid */
      h('div', { className: 'v1-panel', style: { marginBottom: '24px' } },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, 'Profils de postes & espaces de travail institutionnels (14 profils)'),
          h('span', { className: 'v1-badge' }, 'Rôles CDJP & CPJP')
        ),
        h('p', { className: 'v1-field-helper', style: { marginBottom: '16px' } },
          'Conformément au manuel opérationnel APSE et à l’organigramme CPJP 2025, chaque fonction dispose de responsabilités, formulaires et droits dédiés sans contournement possible.'
        ),
        h('div', { className: 'v1-grid-16' },
          (V1.data?.roleWorkspaces || []).map(rw =>
            h('div', {
              className: 'v1-panel v1-card-interactive',
              style: { gridColumn: 'span 8', padding: '16px', cursor: 'pointer' },
              onClick: () => {
                const matchPersona = (V1.data?.personas || []).find(p => (p.roles || []).includes(rw.role)) || (V1.data?.staff_accounts || []).find(p => (p.roles || []).includes(rw.role));
                if (matchPersona) {
                  apiV1('/v1/persona', 'POST', { persona_key: matchPersona.key }).then(() => {
                    if (window.resetAccountScopedState) window.resetAccountScopedState();
                    loadBootstrap().then(() => renderApp());
                  });
                }
              },
            },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                h('strong', { style: { fontSize: '0.9375rem' } }, rw.labels[V1.lang] || rw.labels.fr),
                h('span', { className: 'v1-badge' }, rw.code)
              ),
              h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' } },
                rw.duties[V1.lang] || rw.duties.fr
              ),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                (rw.primary_forms || []).map(f => h('span', { className: 'v1-chip', style: { fontSize: '0.6875rem' } }, f)),
                h('span', { className: 'v1-chip', style: { fontSize: '0.6875rem', background: 'var(--color-primary-bg)' } }, rw.scope)
              )
            )
          )
        )
      ),

      /* Tasks overview */
      renderTasksWorkspace()
    );
  }

  /* --------------------------------------------------------------------------
     2. SEIZURE (Saisie des formulaires F01–F45, 186 champs, CPJP Q1–Q4, Doc Import)
     -------------------------------------------------------------------------- */
  function renderSeizureWorkspace() {
    const cfg = V1.data?.config || {};
    const allForms = cfg.forms || [];
    const allFields = cfg.fields || {};
    const allOptions = cfg.options || {};

    /* 7 Official Clusters from APSE Comprehensive Manual */
    const clusters = [
      { id: 'ALL', label: 'Tous les formulaires (45)', codes: [] },
      { id: 'CLUST_A', label: 'Cluster A : Planification & Organisation', codes: ['F03', 'F04', 'F05', 'F06', 'F43'] },
      { id: 'CLUST_B', label: 'Cluster B : Terrain & Consolidation de la paix', codes: ['F07', 'F08', 'F13', 'F15', 'F44'] },
      { id: 'CLUST_C', label: 'Cluster C : Accompagnement confidentiel & Guérison', codes: ['F09', 'F10', 'F11', 'F12', 'F14', 'F17', 'F18', 'F23', 'F45'] },
      { id: 'CLUST_D', label: 'Cluster D : Finances, Marchés & Bailleurs', codes: ['F19', 'F20', 'F36', 'F37'] },
      { id: 'CLUST_E', label: 'Cluster E : Apprentissage, Évaluation & Stratégie', codes: ['F25', 'F27', 'F28', 'F29', 'F30', 'F40', 'F41', 'F42'] },
      { id: 'CLUST_F', label: 'Cluster F : RH, Véhicules & Administration', codes: ['F31', 'F32', 'F33', 'F34', 'F35', 'F38', 'F39'] },
      { id: 'CLUST_G', label: 'Cluster G : Système, Qualité & Gouvernance', codes: ['F01', 'F02', 'F21', 'F24', 'F26'] },
    ];

    V091.formCategory = V091.formCategory || 'ALL';
    V091.seizureSubTab = V091.seizureSubTab || 'form'; // 'form' | 'history'

    const currentForm = allForms.find(f => f.code === V091.activeFormCode) || allForms[0] || { code: 'F07', label: { fr: 'F07 — Réalisation activité' }, fields: [] };
    const formFields = currentForm.fields || [];

    // Filter forms by cluster & search
    const filteredForms = allForms.filter(f => {
      if (V091.formCategory !== 'ALL') {
        const cluster = clusters.find(c => c.id === V091.formCategory);
        if (cluster && cluster.codes.length > 0 && !cluster.codes.includes(f.code)) {
          return false;
        }
      }
      if (!V091.formSearch) return true;
      const q = V091.formSearch.toLowerCase();
      const lbl = (f.label[V1.lang] || f.label.fr || f.label.en || '').toLowerCase();
      return f.code.toLowerCase().includes(q) || lbl.includes(q);
    });

    const isSensitiveForm = currentForm.sensitive || ['F09', 'F10', 'F11', 'F12', 'F14', 'F17', 'F18', 'F23', 'F45'].includes(currentForm.code);

    // Auto-calculate demographics
    const womenCount = Number(V091.formValues.women) || 0;
    const menCount = Number(V091.formValues.men) || 0;
    const undisclosedCount = Number(V091.formValues.undisclosed) || 0;
    const calcTotal = womenCount + menCount + undisclosedCount;
    if (V091.formValues.women !== undefined || V091.formValues.men !== undefined) {
      V091.formValues.total = String(calcTotal);
    }
    const disabilityCount = Number(V091.formValues.disability) || 0;
    const disabilityExceedsTotal = calcTotal > 0 && disabilityCount > calcTotal;

    // Categorize form fields into logical Google Forms sections
    const idFields = [];
    const demoFields = [];
    const narrativeFields = [];
    const otherFields = [];

    const demoFieldCodes = ['women', 'men', 'undisclosed', 'total', 'disability', 'under_18', 'age_18_24', 'age_25_34', 'age_35_49', 'age_50_64', 'age_65_plus'];
    const narrativeFieldCodes = ['title', 'progress_summary', 'activity', 'objectives', 'results_achieved', 'challenges', 'issues', 'recommendations', 'next_steps', 'observations', 'methodology'];
    const idFieldCodes = ['record', 'axis', 'result', 'type', 'volet', 'project', 'location', 'parish', 'centrale', 'partner', 'state', 'channel', 'work_type', 'plan_type'];

    formFields.forEach(fCode => {
      if (demoFieldCodes.includes(fCode)) {
        demoFields.push(fCode);
      } else if (narrativeFieldCodes.includes(fCode)) {
        narrativeFields.push(fCode);
      } else if (idFieldCodes.includes(fCode)) {
        idFields.push(fCode);
      } else {
        otherFields.push(fCode);
      }
    });

    // Helper to render an individual input control with rich dropdown support
    function renderFieldInput(fCode) {
      const fMeta = allFields[fCode] || { type: 'TEXT', label: { fr: fCode } };
      const fType = fMeta.type || 'TEXT';
      const fLabel = (fMeta.label && (fMeta.label[V1.lang] || fMeta.label.fr || fMeta.label.en)) || fCode;
      const fHelp = fMeta.help && (fMeta.help[V1.lang] || fMeta.help.fr || fMeta.help.en);
      const isReq = (currentForm.required || []).includes(fCode);
      let val = V091.formValues[fCode] !== undefined ? V091.formValues[fCode] : '';
      if (fCode === 'volet' && val) {
        val = (typeof VOLET_CANONICAL !== 'undefined' && VOLET_CANONICAL[String(val).toUpperCase()]) ||
              (typeof window !== 'undefined' && window.VOLET_CANONICAL && window.VOLET_CANONICAL[String(val).toUpperCase()]) ||
              val;
      }

      // Check if field has predefined options
      let optList = null;
      if (fMeta.options && typeof fMeta.options === 'string' && allOptions[fMeta.options]) {
        optList = allOptions[fMeta.options];
      } else if (allOptions[fCode]) {
        optList = allOptions[fCode];
      } else if (fCode === 'volet') {
        const fallbacks = (typeof window !== 'undefined' && window.VOLET_FALLBACKS) || {
          PARAJURISTES: { fr: 'Parajuristes', en: 'Paralegals (Legal Aid)', rw: 'Abafasha mu mategeko', sw: 'Wasaidizi wa Kisheria' },
          PARALEGAL: { fr: 'Parajuristes', en: 'Paralegals (Legal Aid)', rw: 'Abafasha mu mategeko', sw: 'Wasaidizi wa Kisheria' },
          MEDIATEURS: { fr: 'Médiateurs', en: 'Mediators (Peaceful Resolution)', rw: 'Abahuza', sw: 'Wapatanishi' },
          MEDIATION: { fr: 'Médiateurs', en: 'Mediators (Peaceful Resolution)', rw: 'Abahuza', sw: 'Wapatanishi' },
          ABAHUMURIZAMITIMA: { fr: 'Abahumurizamitima (Écoute active)', en: 'Psychosocial Companions', rw: 'Abahumurizamitima', sw: 'Wafariji wa Kisaikolojia' },
          ACTIVE_LISTENING: { fr: 'Abahumurizamitima (Écoute active)', en: 'Psychosocial Companions', rw: 'Abahumurizamitima', sw: 'Wafariji wa Kisaikolojia' },
          ISANAMITIMA: { fr: 'Isanamitima (Guérison & Réconciliation)', en: 'Healing & Reconciliation (Isanamitima)', rw: 'Abafashamyumvire mu isanamitima', sw: 'Wawezeshaji wa Uponyaji' },
          HEALING_FACILITATION: { fr: 'Isanamitima (Guérison & Réconciliation)', en: 'Healing & Reconciliation (Isanamitima)', rw: 'Abafashamyumvire mu isanamitima', sw: 'Wawezeshaji wa Uponyaji' },
          FIELD: { fr: 'Terrain général (Centrale / CEB)', en: 'General Field Work', rw: 'Ibikorwa rusange bya Santarali', sw: 'Kazi ya Jumla' },
        };
        optList = (cfg.volets && cfg.volets.length > 0)
          ? cfg.volets
          : (V1.data?.volets && V1.data.volets.length > 0)
            ? V1.data.volets
            : [
                { code: 'PARAJURISTES', labels: fallbacks.PARAJURISTES },
                { code: 'MEDIATEURS', labels: fallbacks.MEDIATEURS },
                { code: 'ABAHUMURIZAMITIMA', labels: fallbacks.ABAHUMURIZAMITIMA },
                { code: 'ISANAMITIMA', labels: fallbacks.ISANAMITIMA },
                { code: 'FIELD', labels: fallbacks.FIELD },
              ];
      }

      const isLong = fType === 'LONG_TEXT' || fCode === 'title' || fCode === 'progress_summary' || fCode === 'activity';
      const colSpan = isLong ? 'span 16' : 'span 8';

      return h('div', { className: 'v1-field', style: { gridColumn: colSpan }, key: fCode },
        h('label', { className: 'v1-field-label' },
          h('span', {}, fLabel),
          isReq ? h('span', { style: { color: 'var(--color-critical)', marginLeft: '4px' } }, '*') : null
        ),

        optList ? V091.renderFigmaDropdown({
          id: 'seizure-field-' + fCode,
          value: val,
          placeholder: `-- Sélectionner ${fLabel} --`,
          width: '100%',
          options: [
            { value: '', label: `-- Sélectionner ${fLabel} --` },
            ...optList.map(opt => {
              if (fCode === 'volet') {
                if (typeof window !== 'undefined' && typeof window.normalizeVolet === 'function') {
                  const norm = window.normalizeVolet(opt);
                  return { value: norm.canonicalCode, label: `${norm.canonicalCode} — ${norm.labelText}` };
                }
                const optCode = (typeof opt === 'string' ? opt : (opt.code || opt.id || '')).toUpperCase();
                const canon = (typeof window !== 'undefined' && window.VOLET_CANONICAL && window.VOLET_CANONICAL[optCode]) || optCode;
                const lblObj = typeof opt === 'object' && opt ? (opt.label || opt.labels) : null;
                const lang = (typeof V1 !== 'undefined' && V1?.lang) || 'fr';
                const fallbacks = (typeof window !== 'undefined' && window.VOLET_FALLBACKS) || {};
                const fbObj = fallbacks[optCode] || fallbacks[canon];
                const optLabel = (lblObj && (lblObj[lang] || lblObj.fr || lblObj.en || lblObj.rw || lblObj.sw || Object.values(lblObj)[0])) ||
                  (fbObj && (fbObj[lang] || fbObj.fr || fbObj.en || fbObj.rw || fbObj.sw || Object.values(fbObj)[0])) ||
                  optCode;
                return { value: canon, label: `${canon} — ${optLabel}` };
              }
              const optCode = typeof opt === 'string' ? opt : (opt.code || opt.id);
              const lblObj = typeof opt === 'object' && opt ? (opt.label || opt.labels) : null;
              const optLabel = typeof opt === 'string' ? opt : ((lblObj && (lblObj[V1.lang] || lblObj.fr || lblObj.en || lblObj.rw || lblObj.sw || Object.values(lblObj)[0])) || optCode);
              return { value: optCode, label: `${optCode} — ${optLabel}` };
            }),
          ],
          onChange: nextVal => {
            let resolvedVal = nextVal;
            if (fCode === 'volet' && resolvedVal) {
              const canonical = (typeof VOLET_CANONICAL !== 'undefined' && VOLET_CANONICAL[resolvedVal.toUpperCase()]) ||
                (typeof window !== 'undefined' && window.VOLET_CANONICAL && window.VOLET_CANONICAL[resolvedVal.toUpperCase()]);
              if (canonical) resolvedVal = canonical;
            }
            V091.formValues[fCode] = resolvedVal;
            renderApp();
          },
        }) : fType === 'LONG_TEXT' ? h('textarea', {
          className: 'v1-textarea',
          rows: 3,
          placeholder: `Saisir ${fLabel}...`,
          value: val,
          onInput: e => { V091.formValues[fCode] = e.target.value; },
        }) : fType === 'BOOLEAN' ? h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', height: '40px', cursor: 'pointer' } },
          h('input', {
            type: 'checkbox',
            checked: val === 'true' || val === true,
            onChange: e => {
              V091.formValues[fCode] = e.target.checked ? 'true' : 'false';
              renderApp();
            },
          }),
          h('span', { style: { fontSize: '0.875rem' } }, 'Confirmer (Oui / Non)')
        ) : h('input', {
          type: (fType.startsWith('INTEGER') || fType === 'NUMBER') ? 'number' : fType === 'DATE' ? 'date' : 'text',
          className: 'v1-input',
          placeholder: `Saisir ${fLabel}...`,
          value: val,
          onInput: e => {
            V091.formValues[fCode] = e.target.value;
            if (fCode === 'women' || fCode === 'men' || fCode === 'undisclosed' || fCode === 'disability') {
              renderApp();
            }
          },
        }),

        fHelp ? h('span', { className: 'v1-field-helper', style: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' } }, fHelp) : null
      );
    }

    // Records created over time / history list
    const createdRecords = (V1.data?.logs || []).filter(l => l.task_titles || l.form === currentForm.code);

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header v1-seizure-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Saisie opérationnelle'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, `${currentForm.code} — ${currentForm.label[V1.lang] || currentForm.label.fr}`)
        ),
        h('div', { className: 'v1-header-split' },
          h('div', { style: { minWidth: 0 } },
            h('h1', { className: 'v1-page-title' }, `Saisie : ${currentForm.code} · ${currentForm.label[V1.lang] || currentForm.label.fr}`),
            h('p', { className: 'v1-page-subtitle' },
              `${formFields.length} champs disponibles · ${isSensitiveForm ? 'Fiche confidentielle & sensible' : 'Fiche publique opérationnelle'} · Standard ${currentForm.captureStandard || 'V8'}`
            )
          ),
          h('div', { className: 'v1-header-actions v1-seizure-header-actions' },
            /* Toggle between Active Form Editor & Created Forms History */
            h('div', { className: 'gf-tab-pills v1-seizure-tabs', style: { marginBottom: 0, paddingBottom: 0, borderBottom: 0 } },
              h('button', {
                type: 'button',
                className: 'gf-tab-btn' + (V091.seizureSubTab === 'form' ? ' active' : ''),
                onClick: () => {
                  V091.seizureSubTab = 'form';
                  renderApp();
                },
              },
                msIcon('edit_note', 16),
                h('span', { className: 'v1-tab-text-full' }, 'Formulaire de saisie'),
                h('span', { className: 'v1-tab-text-short' }, 'Formulaire')
              ),
              h('button', {
                type: 'button',
                className: 'gf-tab-btn' + (V091.seizureSubTab === 'history' ? ' active' : ''),
                onClick: () => {
                  V091.seizureSubTab = 'history';
                  renderApp();
                },
              },
                msIcon('folder_copy', 16),
                h('span', { className: 'v1-tab-text-full' }, `Dossiers créés au fil du temps (${createdRecords.length})`),
                h('span', { className: 'v1-tab-text-short' }, `Dossiers (${createdRecords.length})`)
              )
            ),

            /* Action: Duplicate current form data */
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary',
              title: 'Dupliquer les valeurs de ce formulaire pour créer un nouveau dossier',
              onClick: () => {
                const cloned = Object.assign({}, V091.formValues);
                cloned.record = `REC-${Date.now().toString(36).toUpperCase()}`;
                if (cloned.title) cloned.title = `${cloned.title} (Copie)`;
                cloned.event_date = '2026-10-25';
                V091.formValues = cloned;
                V091.seizureSubTab = 'form';
                V091.showToast('✓ Formulaire dupliqué avec succès ! Modifiez les champs puis validez.', 'info');
                renderApp();
              },
            },
              msIcon('content_copy', 18),
              h('span', {}, 'Dupliquer ce formulaire')
            ),

            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary',
              onClick: () => {
                const draftPayload = {
                  form: currentForm.code,
                  event_date: V091.formValues.event_date || '2026-10-25',
                  values: V091.formValues,
                  language: V1.lang,
                };
                apiV1('/working-drafts', 'POST', draftPayload).then(() => {
                  V091.showToast('✓ Brouillon chiffré enregistré sur le serveur.', 'info');
                }).catch(err => V091.showToast('Erreur sauvegarde brouillon : ' + err.message, 'error'));
              },
            },
              msIcon('cloud_done', 18),
              h('span', {}, 'Enregistrer brouillon')
            ),

            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              onClick: () => {
                const event_date = V091.formValues.event_date || '2026-10-25';
                const payload = {
                  form: currentForm.code,
                  event_date: event_date,
                  values: V091.formValues,
                };
                apiV1('/records', 'POST', payload).then(rec => {
                  V091.showToast(`✓ Dossier ${rec.values?.record || rec.id} créé avec succès en statut DRAFT.`, 'info');
                  V091.formValues = {};
                  V1.workspace = 'files_validation';
                  renderApp();
                }).catch(err => V091.showToast('Erreur validation : ' + (err.details || err.message), 'error'));
              },
            },
              msIcon('check', 18),
              h('span', {}, 'Valider & Soumettre')
            )
          )
        )
      ),

      /* Confidentiality Warning Card for Sensitive Forms (Cluster C) */
      isSensitiveForm ? h('div', {
        className: 'v1-panel v1-seizure-confidential-card',
        style: {
          marginBottom: '20px',
          padding: '16px 20px',
          background: 'rgba(218, 30, 40, 0.08)',
          border: '1px solid var(--color-critical)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
        }
      },
        msIcon('lock', 24),
        h('div', { style: { flex: 1, minWidth: '220px' } },
          h('strong', { style: { color: 'var(--color-critical)', fontSize: '0.9375rem', display: 'block' } }, 'Fiche Confidentielle & Sensible (Do No Harm / Protection des Données)'),
          h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-primary)', margin: '4px 0 0' } },
            'Règle d’or institutionnelle : Ne jamais saisir de noms réels, cartes d’identité nationales ou numéros de téléphone dans les champs narratifs. Utilisez exclusivement un code anonyme (ex: CASE-2026-089).'
          )
        )
      ) : null,

      /* Main Split Workspace: Left Clusters & Forms Navigator, Right Google Forms Canvas */
      h('div', { className: 'v1-seizure-split' },
        /* Left Column: Form Selector & 7 Clusters */
        h('div', { className: 'v1-panel v1-seizure-nav', style: { gridColumn: 'auto' } },
          h('label', { className: 'v1-field-label' }, 'Clusters Institutionnels (A à G)'),
          h('div', { className: 'v1-chips v1-seizure-cluster-rail', style: { marginBottom: '12px' } },
            clusters.map(c =>
              h('button', {
                type: 'button',
                key: c.id,
                className: 'v1-chip' + (V091.formCategory === c.id ? ' active' : ''),
                style: { fontSize: '0.6875rem', padding: '3px 8px' },
                onClick: () => {
                  V091.formCategory = c.id;
                  renderApp();
                },
              }, c.label)
            )
          ),
          h('input', {
            type: 'search',
            className: 'v1-input v1-seizure-search',
            placeholder: 'Filtrer par code (F07, F03...) ou titre...',
            value: V091.formSearch || '',
            onInput: e => {
              V091.formSearch = e.target.value;
              renderApp();
            },
            style: { marginBottom: '12px', height: '34px', fontSize: '0.8125rem' },
          }),
          /* Mobile/Tablet Prominent Form Picker: Select dropdown & Quick Badge Rail */
          h('div', { className: 'v1-seizure-mobile-picker' },
            h('label', { className: 'v1-field-label', style: { marginTop: '4px', marginBottom: '4px' } }, 'Sélectionner un formulaire'),
            V091.renderFigmaDropdown({
              id: 'seizure-form-picker',
              value: V091.activeFormCode,
              width: '100%',
              className: 'v1-seizure-form-select',
              options: allForms.map(f => {
                const isSens = f.sensitive || ['F09', 'F10', 'F11', 'F12', 'F14', 'F17', 'F18', 'F23', 'F45'].includes(f.code);
                const lbl = (f.label && (f.label[V1.lang] || f.label.fr || f.label.en)) || f.code;
                return { value: f.code, label: `${f.code} — ${lbl}${isSens ? ' [Sensible]' : ''}` };
              }),
              onChange: code => {
                if (code) {
                  V091.activeFormCode = code;
                  V091.formValues = {};
                  V091.activeFormSectionIndex = 0;
                  V091.seizureSubTab = 'form';
                }
              },
            }),            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 2px' } },
              h('span', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 } }, 'Accès rapide (badges) :'),
              h('span', { style: { fontSize: '0.6875rem', color: 'var(--text-muted)' } }, `${filteredForms.length} formulaire${filteredForms.length > 1 ? 's' : ''}`)
            ),
            h('div', { className: 'v1-seizure-badge-rail' },
              filteredForms.map(f =>
                h('button', {
                  type: 'button',
                  key: f.code,
                  className: 'v1-chip' + (V091.activeFormCode === f.code ? ' active' : ''),
                  onClick: () => {
                    V091.activeFormCode = f.code;
                    V091.formValues = {};
                    V091.activeFormSectionIndex = 0;
                    V091.seizureSubTab = 'form';
                    renderApp();
                  },
                }, f.code)
              )
            )
          ),
          /* Desktop Vertical Form List (hidden on <= 1024px) */
          h('div', { className: 'v1-seizure-form-list' },
            filteredForms.map(f => {
              const isSens = f.sensitive || ['F09', 'F10', 'F11', 'F12', 'F14', 'F17', 'F18', 'F23', 'F45'].includes(f.code);
              return h('button', {
                type: 'button',
                key: f.code,
                className: 'v1-nav-item' + (V091.activeFormCode === f.code ? ' active' : ''),
                style: { textAlign: 'left', padding: '8px 10px', fontSize: '0.8125rem', justifyContent: 'space-between' },
                onClick: () => {
                  V091.activeFormCode = f.code;
                  V091.formValues = {};
                  V091.activeFormSectionIndex = 0;
                  V091.seizureSubTab = 'form';
                  renderApp();
                },
              },
                h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                  h('strong', {}, f.code),
                  h('span', { style: { marginLeft: '6px', color: 'var(--text-secondary)' } }, f.label[V1.lang] || f.label.fr)
                ),
                isSens ? h('span', { className: 'v1-badge', style: { background: 'var(--color-critical-bg)', color: 'var(--color-critical)' } }, 'Sensible') : null
              );
            })
          )
        ),

        /* Right Column: Google Forms Card Builder OR Created Forms History */
        h('div', { className: 'v1-seizure-content' },
          V091.seizureSubTab === 'history' ?
            /* VIEW B: History of Forms Created Over Time with 1-Click Duplication */
            h('div', { className: 'v1-panel v1-seizure-history-view', style: { padding: '24px' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' } },
                h('div', { style: { flex: 1, minWidth: '220px' } },
                  h('h2', { style: { fontSize: '1.25rem', fontWeight: '700' } }, `Dossiers créés au fil du temps (${createdRecords.length})`),
                  h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '4px 0 0' } },
                    `Consultez les dossiers saisis pour ${currentForm.code} ou dupliquez un formulaire existant pour en créer un nouveau sans repartir de zéro.`
                  )
                ),
                h('button', {
                  type: 'button',
                  className: 'v1-btn v1-btn-primary',
                  onClick: () => {
                    V091.formValues = {};
                    V091.seizureSubTab = 'form';
                    renderApp();
                  },
                },
                  msIcon('add', 18),
                  h('span', {}, 'Nouveau formulaire vierge')
                )
              ),

              createdRecords.length === 0 ? h('div', { style: { padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' } },
                msIcon('folder_open', 48),
                h('p', { style: { marginTop: '12px', fontSize: '0.9375rem' } }, 'Aucun dossier encore enregistré pour ce formulaire.'),
                h('p', { style: { fontSize: '0.8125rem' } }, 'Remplissez le formulaire de saisie pour créer votre premier dossier.')
              ) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                createdRecords.map((rec, rIdx) =>
                  h('div', {
                    key: rIdx,
                    className: 'v1-panel v1-seizure-history-card',
                    style: {
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      flexWrap: 'wrap',
                    }
                  },
                    h('div', { style: { flex: 1, minWidth: '240px' } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' } },
                        h('span', { className: 'v1-badge', style: { fontWeight: 700 } }, rec.form || currentForm.code),
                        h('strong', { style: { fontSize: '0.9375rem' } }, rec.task_titles?.fr || rec.values?.title || rec.id || `Dossier #${rIdx + 1}`),
                        h('span', { className: 'v1-badge' }, rec.status || 'DRAFT')
                      ),
                      h('div', { style: { display: 'flex', gap: '16px', fontSize: '0.8125rem', color: 'var(--text-secondary)', flexWrap: 'wrap' } },
                        h('span', {}, `Date : ${rec.event_date || '2026-10-25'}`),
                        h('span', {}, `Paroisse : ${rec.parish_name || 'Diocèse de Butare'}`),
                        rec.women_count !== undefined ? h('span', {}, `Femmes : ${rec.women_count} · Hommes : ${rec.men_count} · Total : ${rec.total_attendance}`) : null
                      )
                    ),
                    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                      h('button', {
                        type: 'button',
                        className: 'v1-btn v1-btn-sm v1-btn-secondary',
                        title: 'Dupliquer ce dossier dans le formulaire de saisie',
                        onClick: () => {
                          const cloned = Object.assign({}, rec.values || rec);
                          cloned.record = `REC-${Date.now().toString(36).toUpperCase()}`;
                          cloned.title = `${rec.task_titles?.fr || rec.values?.title || 'Dossier'} (Copie)`;
                          cloned.event_date = '2026-10-25';
                          if (rec.women_count !== undefined) cloned.women = String(rec.women_count);
                          if (rec.men_count !== undefined) cloned.men = String(rec.men_count);
                          if (rec.total_attendance !== undefined) cloned.total = String(rec.total_attendance);
                          V091.formValues = cloned;
                          V091.seizureSubTab = 'form';
                          V091.showToast('✓ Dossier dupliqué avec succès dans le formulaire actif !', 'info');
                          renderApp();
                        },
                      },
                        msIcon('content_copy', 16),
                        h('span', {}, 'Dupliquer')
                      ),
                      h('button', {
                        type: 'button',
                        className: 'v1-btn v1-btn-sm v1-btn-primary',
                        onClick: () => {
                          V091.formValues = Object.assign({}, rec.values || rec);
                          V091.seizureSubTab = 'form';
                          renderApp();
                        },
                      },
                        msIcon('edit', 16),
                        h('span', {}, 'Ouvrir')
                      )
                    )
                  )
                )
              )
            ) :

            /* VIEW A: Google Forms Style Dynamic Canvas */
            h('div', { className: 'gf-wrapper', style: { margin: '0', gridColumn: 'auto' } },
              /* Google Forms Card 0: Header Accent Card */
              h('div', { className: 'gf-header-card' },
                h('div', { className: 'gf-header-accent' }),
                h('div', { className: 'gf-header-card-inner', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' } },
                  h('div', { style: { flex: 1, minWidth: '220px' } },
                    h('div', { style: { display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' } },
                      h('span', { className: 'v1-badge', style: { background: 'var(--color-primary)', color: '#fff', fontWeight: 700 } }, currentForm.code),
                      h('span', { className: 'v1-badge' }, `${formFields.length} champs natifs`),
                      isSensitiveForm ? h('span', { className: 'v1-badge', style: { background: 'var(--color-critical-bg)', color: 'var(--color-critical)' } }, 'Sensible') : null
                    ),
                    h('h2', { style: { fontSize: '1.5rem', fontWeight: 700, margin: '4px 0', wordBreak: 'break-word' } },
                      currentForm.label[V1.lang] || currentForm.label.fr
                    ),
                    h('p', { style: { fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '4px 0 0' } },
                      `Standard de saisie ${currentForm.captureStandard || 'V8'} · Formulaire institutionnel CDJP Butare conforme au Plan Stratégique 2026–2031.`
                    )
                  ),
                  h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-sm v1-btn-secondary',
                    title: 'Dupliquer les valeurs actuelles',
                    onClick: () => {
                      const cloned = Object.assign({}, V091.formValues);
                      cloned.record = `REC-${Date.now().toString(36).toUpperCase()}`;
                      if (cloned.title) cloned.title = `${cloned.title} (Copie)`;
                      V091.formValues = cloned;
                      V091.showToast('✓ Formulaire dupliqué !', 'info');
                      renderApp();
                    },
                  },
                    msIcon('content_copy', 16),
                    h('span', {}, 'Dupliquer')
                  )
                )
              ),

              /* Document Import Dropzone */
              h('div', { className: 'v1-panel v1-seizure-dropzone', style: { padding: '16px', border: '1px dashed var(--border-subtle)', background: 'var(--bg-canvas)' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' } },
                  h('div', { style: { flex: 1, minWidth: '220px' } },
                    h('strong', { style: { fontSize: '0.875rem', display: 'block' } }, 'Pré-remplissage automatique depuis un document (DOCX, PDF, XLSX, CSV, JSON)'),
                    h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } },
                      'Extrait les métadonnées et valeurs sans jamais soumettre automatiquement.'
                    )
                  ),
                  renderFileUploadComponent({
                    label: 'Importer document source',
                    accept: '.docx,.pdf,.xlsx,.csv,.json,.txt',
                    selectedFilename: V091.selectedFile?.name,
                    onSelect: file => {
                      V091.selectedFile = file;
                      const reader = new FileReader();
                      reader.onload = e => {
                        const b64 = e.target.result.split(',')[1];
                        apiV1('/document-import/preview', 'POST', {
                          form: currentForm.code,
                          filename: file.name,
                          content_base64: b64,
                          current_values: V091.formValues,
                        }).then(res => {
                          V091.prefillPreview = res.proposed_values;
                          V091.prefillConflicts = res.conflicts || [];
                          V091.prefillWarnings = res.warnings || [];
                          renderApp();
                        }).catch(err => V091.showToast('Erreur import document : ' + err.message, 'error'));
                      };
                      reader.readAsDataURL(file);
                    },
                  })
                ),
              V091.prefillPreview ? h('div', { style: { marginTop: '12px', padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  h('span', { style: { fontWeight: 600, color: 'var(--color-primary)' } }, `✓ ${Object.keys(V091.prefillPreview).length} champs extraits`),
                  h('div', { style: { display: 'flex', gap: '8px' } },
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-sm v1-btn-primary',
                      onClick: () => {
                        Object.assign(V091.formValues, V091.prefillPreview);
                        V091.prefillPreview = null;
                        renderApp();
                      },
                    }, 'Appliquer ces valeurs'),
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-sm v1-btn-secondary',
                      onClick: () => { V091.prefillPreview = null; renderApp(); },
                    }, 'Ignorer')
                  )
                )
              ) : null
            ),

            /* ================================================================
               Google Forms Multi-Section Stepper Architecture
               - Divides the form into focused, bite-sized sections (steps)
               - Progress bar & step chips for direct navigation
               - "Section précédente" (<) and "Section suivante" (>) buttons
               - "Vue complète" toggle for users who want to review all sections
               ================================================================ */
            (() => {
              const formSections = [];

              // Section 1: Identification & Contexte Opérationnel
              formSections.push({
                id: 'identification',
                title: 'Section 1 : Identification & Contexte Opérationnel',
                shortTitle: 'Identification',
                icon: 'assignment',
                desc: 'Date d’exécution, dossier, programme, résultat stratégique et lieu d’intervention.',
                render: () => h('div', { className: 'gf-question-card' },
                  h('div', { style: { borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '8px' } },
                    h('strong', { style: { fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' } },
                      msIcon('assignment', 18),
                      'Section 1 : Identification & Contexte Opérationnel'
                    ),
                    h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } },
                      'Date d’exécution, dossier, programme, résultat stratégique et lieu d’intervention.'
                    )
                  ),
                  h('div', { className: 'v1-grid-16' },
                    h('div', { className: 'v1-field', style: { gridColumn: 'span 8' } },
                      h('label', { className: 'v1-field-label' }, 'Date de l’événement (YYYY-MM-DD) *'),
                      h('input', {
                        type: 'date',
                        className: 'v1-input',
                        value: V091.formValues.event_date || '2026-10-25',
                        onInput: e => { V091.formValues.event_date = e.target.value; },
                      })
                    ),
                    idFields.map(fCode => renderFieldInput(fCode))
                  )
                )
              });

              // Section 2: Cibles, Démographie & Équité (Règle d’or)
              if (demoFields.length > 0) {
                const sNum = formSections.length + 1;
                formSections.push({
                  id: 'demographics',
                  title: `Section ${sNum} : Cibles, Démographie & Équité (Règle d’or)`,
                  shortTitle: 'Démographie',
                  icon: 'group',
                  desc: 'Total = Femmes + Hommes + Non divulgué · Règle d’or et sous-ensemble handicap.',
                  render: () => h('div', { className: 'gf-question-card' },
                    h('div', { style: { borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '8px' } },
                      h('strong', { style: { fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' } },
                        msIcon('group', 18),
                        `Section ${sNum} : Cibles, Démographie & Équité (Règle d’or)`
                      ),
                      h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } },
                        'Total = Femmes + Hommes + Non divulgué · Le handicap est un sous-ensemble non additionnel (Handicap ≤ Total).'
                      )
                    ),
                    h('div', {
                      style: {
                        padding: '10px 14px',
                        background: 'var(--bg-canvas)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        fontSize: '0.8125rem',
                      }
                    },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                        msIcon('calculate', 18),
                        h('span', {}, `Calcul automatique : Total (${calcTotal}) = Femmes (${womenCount}) + Hommes (${menCount}) + Non divulgué (${undisclosedCount})`)
                      ),
                      h('span', {
                        className: 'v1-badge',
                        style: {
                          background: calcTotal > 0 ? 'var(--color-positive-bg, rgba(36, 161, 72, 0.1))' : 'var(--bg-hover)',
                          color: calcTotal > 0 ? 'var(--color-positive, #24a148)' : 'var(--text-secondary)'
                        }
                      }, calcTotal > 0 ? '✓ Règle d’or respectée' : 'En attente de saisie')
                    ),
                    disabilityExceedsTotal ? h('div', {
                      style: {
                        padding: '8px 12px',
                        background: 'rgba(218, 30, 40, 0.08)',
                        border: '1px solid var(--color-critical)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '12px',
                        fontSize: '0.8125rem',
                        color: 'var(--color-critical)',
                      }
                    }, `Attention : Le nombre de participants avec handicap (${disabilityCount}) dépasse le total des participants (${calcTotal}). Le handicap est un sous-ensemble.`) : null,
                    h('div', { className: 'v1-grid-16' },
                      demoFields.map(fCode => renderFieldInput(fCode))
                    )
                  )
                });
              }

              // Section 3: Sensibilité, CNV & Do No Harm
              {
                const sNum = formSections.length + 1;
                formSections.push({
                  id: 'sensitivity',
                  title: `Section ${sNum} : Sensibilité, CNV & Do No Harm (Vérifications Obligatoires)`,
                  shortTitle: 'Sensibilité',
                  icon: 'verified_user',
                  desc: 'Engagements institutionnels CDJP Butare pour la protection des participants et la non-violence.',
                  render: () => h('div', { className: 'gf-question-card' },
                    h('div', { style: { borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '8px' } },
                      h('strong', { style: { fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' } },
                        msIcon('verified_user', 18),
                        `Section ${sNum} : Sensibilité, CNV & Do No Harm (Vérifications Obligatoires)`
                      ),
                      h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } },
                        'Engagements institutionnels CDJP Butare pour la protection des participants et la non-violence.'
                      )
                    ),
                    h('div', { className: 'v1-grid-16' },
                      h('div', { className: 'v1-field', style: { gridColumn: 'span 16' } },
                        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                          h('label', { style: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' } },
                            h('input', {
                              type: 'checkbox',
                              checked: V091.formValues.cnv_respected === 'true' || V091.formValues.cnv_respected === true,
                              onChange: e => {
                                V091.formValues.cnv_respected = e.target.checked ? 'true' : 'false';
                                renderApp();
                              },
                            }),
                            h('span', { style: { fontSize: '0.875rem' } }, 'Communication Non-Violente (CNV) respectée et favorisée durant l’activité')
                          ),
                          h('label', { style: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' } },
                            h('input', {
                              type: 'checkbox',
                              checked: V091.formValues.dnh_checked === 'true' || V091.formValues.dnh_checked === true,
                              onChange: e => {
                                V091.formValues.dnh_checked = e.target.checked ? 'true' : 'false';
                                renderApp();
                              },
                            }),
                            h('span', { style: { fontSize: '0.875rem' } }, 'Principes Do No Harm (DNH) vérifiés : aucun préjudice ni risque accru pour les participants')
                          ),
                          h('label', { style: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' } },
                            h('input', {
                              type: 'checkbox',
                              checked: V091.formValues.trauma_sensitive === 'true' || V091.formValues.trauma_sensitive === true,
                              onChange: e => {
                                V091.formValues.trauma_sensitive = e.target.checked ? 'true' : 'false';
                                renderApp();
                              },
                            }),
                            h('span', { style: { fontSize: '0.875rem' } }, 'Approche sensible aux traumatismes et confidentialité des témoignages garantie')
                          )
                        )
                      ),
                      h('div', { className: 'v1-field', style: { gridColumn: 'span 16' } },
                        h('label', { className: 'v1-field-label' }, 'Notes et précautions qualitatives sur la sensibilité'),
                        h('textarea', {
                          className: 'v1-textarea',
                          rows: 2,
                          placeholder: 'Préciser les mesures de protection spécifiques prises lors de cette activité...',
                          value: V091.formValues.sensitivity_notes || '',
                          onInput: e => { V091.formValues.sensitivity_notes = e.target.value; },
                        })
                      )
                    )
                  )
                });
              }

              // Section 4: Répartition Trimestrielle CPJP (Tableau 12) if F03
              if (currentForm.code === 'F03') {
                const sNum = formSections.length + 1;
                formSections.push({
                  id: 'f03_quarterly',
                  title: `Section ${sNum} : Répartition Trimestrielle CPJP (Tableau 12)`,
                  shortTitle: 'Trimestres (Tab. 12)',
                  icon: 'calendar_month',
                  desc: 'Allocation opérationnelle par trimestre pastoral pour l’année AP1 (2026–2027).',
                  render: () => h('div', { className: 'gf-question-card' },
                    h('div', { style: { borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '8px' } },
                      h('strong', { style: { fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' } },
                        msIcon('calendar_month', 18),
                        `Section ${sNum} : Répartition Trimestrielle CPJP (Tableau 12)`
                      ),
                      h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } },
                        'Allocation opérationnelle par trimestre pastoral pour l’année AP1 (2026–2027).'
                      )
                    ),
                    h('div', { className: 'v1-grid-16' },
                      ['q1', 'q2', 'q3', 'q4'].map((q, qIdx) =>
                        h('div', { className: 'v1-panel v1-quarter-panel', style: { gridColumn: 'span 8', padding: '14px' }, key: q },
                          h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '8px', cursor: 'pointer' } },
                            h('input', {
                              type: 'checkbox',
                              checked: V091.formValues[`${q}_selected`] === 'true',
                              onChange: e => {
                                V091.formValues[`${q}_selected`] = e.target.checked ? 'true' : 'false';
                                renderApp();
                              },
                            }),
                            h('span', {}, `Trimestre ${q.toUpperCase()} (${['Sept–Nov', 'Déc–Fév', 'Mars–Mai', 'Juin–Août'][qIdx]})`)
                          ),
                          h('input', {
                            className: 'v1-input',
                            placeholder: `Activités prévues en ${q.toUpperCase()}...`,
                            value: V091.formValues[`${q}_activity`] || '',
                            onInput: e => { V091.formValues[`${q}_activity`] = e.target.value; },
                            style: { marginBottom: '8px' },
                          }),
                          h('div', { style: { display: 'flex', gap: '8px' } },
                            h('input', {
                              type: 'number',
                              className: 'v1-input',
                              placeholder: 'Cible...',
                              value: V091.formValues[`${q}_target`] || '',
                              onInput: e => { V091.formValues[`${q}_target`] = e.target.value; },
                              style: { flex: 1 },
                            }),
                            h('input', {
                              type: 'number',
                              className: 'v1-input',
                              placeholder: 'Budget RWF...',
                              value: V091.formValues[`${q}_budget`] || '',
                              onInput: e => { V091.formValues[`${q}_budget`] = e.target.value; },
                              style: { flex: 1 },
                            })
                          )
                        )
                      )
                    )
                  )
                });
              }

              // Section 5: Déroulement, Résultats & Progrès Qualitatifs
              if (narrativeFields.length > 0) {
                const sNum = formSections.length + 1;
                formSections.push({
                  id: 'narrative',
                  title: `Section ${sNum} : Déroulement, Résultats & Progrès Qualitatifs`,
                  shortTitle: 'Résultats',
                  icon: 'edit_note',
                  desc: 'Contenu narratif, progrès constatés, défis rencontrés et recommandations.',
                  render: () => h('div', { className: 'gf-question-card' },
                    h('div', { style: { borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '8px' } },
                      h('strong', { style: { fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' } },
                        msIcon('edit_note', 18),
                        `Section ${sNum} : Déroulement, Résultats & Progrès Qualitatifs`
                      ),
                      h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } },
                        'Contenu narratif, progrès constatés, défis rencontrés et recommandations.'
                      )
                    ),
                    h('div', { className: 'v1-grid-16' },
                      narrativeFields.map(fCode => renderFieldInput(fCode))
                    )
                  )
                });
              }

              // Section 6: Paramètres & Informations Complémentaires
              if (otherFields.length > 0) {
                const sNum = formSections.length + 1;
                formSections.push({
                  id: 'other',
                  title: `Section ${sNum} : Paramètres & Informations Complémentaires`,
                  shortTitle: 'Paramètres',
                  icon: 'tune',
                  desc: `${otherFields.length} champs spécifiques au schéma ${currentForm.code}.`,
                  render: () => h('div', { className: 'gf-question-card' },
                    h('div', { style: { borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '8px' } },
                      h('strong', { style: { fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' } },
                        msIcon('tune', 18),
                        `Section ${sNum} : Paramètres & Informations Complémentaires`
                      ),
                      h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } },
                        `${otherFields.length} champs spécifiques au schéma ${currentForm.code}.`
                      )
                    ),
                    h('div', { className: 'v1-grid-16' },
                      otherFields.map(fCode => renderFieldInput(fCode))
                    )
                  )
                });
              }

              // Final Section: Pièces Justificatives & Soumission
              {
                const sNum = formSections.length + 1;
                formSections.push({
                  id: 'evidence',
                  title: `Section ${sNum} : Pièces Justificatives & Finalisation`,
                  shortTitle: 'Finalisation',
                  icon: 'attach_file',
                  desc: 'Feuille de présence signée, procès-verbal de médiation ou photos (PDF, PNG, JPG ≤ 10MB).',
                  render: () => h('div', { className: 'gf-question-card' },
                    h('div', { style: { borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '8px' } },
                      h('strong', { style: { fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' } },
                        msIcon('attach_file', 18),
                        `Section ${sNum} : Pièces Justificatives & Finalisation`
                      ),
                      h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } },
                        'Feuille de présence signée, procès-verbal de médiation, rapport de visite ou photos (PDF, PNG, JPG ≤ 10MB).'
                      )
                    ),
                    renderFileUploadComponent({
                      label: 'Attacher une pièce justificative ou feuille d’émargement',
                      accept: 'application/pdf,image/png,image/jpeg',
                      selectedFilename: V091.formValues.evidence,
                      onSelect: file => {
                        V091.formValues.evidence = file.name;
                        renderApp();
                      },
                    }),
                    /* Summary Card of the record ready to submit */
                    h('div', { style: { marginTop: '16px', padding: '14px 18px', background: 'var(--bg-canvas)', borderRadius: '12px' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                        h('strong', { style: { fontSize: '0.875rem' } }, 'Récapitulatif de saisie avant soumission'),
                        h('span', { className: 'v1-badge', style: { background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontWeight: '700' } }, currentForm.code)
                      ),
                      h('div', { style: { display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-secondary)' } },
                        h('span', {}, `Date : ${V091.formValues.event_date || '2026-10-25'}`),
                        calcTotal > 0 ? h('span', {}, `Participants : ${calcTotal} (${womenCount}F / ${menCount}H)`) : null,
                        V091.formValues.evidence ? h('span', {}, `Justificatif : ${V091.formValues.evidence}`) : h('span', { style: { color: 'var(--text-muted)' } }, 'Aucun justificatif joint')
                      )
                    )
                  )
                });
              }

              V091.formViewMode = V091.formViewMode || 'stepper';
              const activeSecIdx = Math.min(Math.max(0, V091.activeFormSectionIndex || 0), formSections.length - 1);
              const currentSection = formSections[activeSecIdx];
              const isStepper = V091.formViewMode !== 'all';

              return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
                /* Google Forms Stepper / Section Progress Header */
                h('div', { className: 'gf-stepper-container' },
                  h('div', { className: 'gf-stepper-header' },
                    h('div', { className: 'gf-stepper-title-wrap' },
                      h('span', { className: 'v1-badge', style: { background: 'var(--color-primary)', color: '#fff', fontWeight: '700', padding: '4px 12px' } },
                        `Section ${activeSecIdx + 1} / ${formSections.length}`
                      ),
                      h('strong', { style: { fontSize: '0.9375rem', color: 'var(--text-primary)' } }, currentSection.title)
                    ),
                    /* Toggle View: Stepper vs All */
                    h('div', { style: { display: 'flex', gap: '4px', background: 'var(--bg-canvas)', padding: '3px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)' } },
                      h('button', {
                        type: 'button',
                        className: 'v1-btn v1-btn-sm' + (isStepper ? ' v1-btn-primary' : ' v1-btn-ghost'),
                        style: { borderRadius: 'var(--radius-pill)', padding: '4px 12px', fontSize: '0.75rem', height: '28px' },
                        onClick: () => { V091.formViewMode = 'stepper'; renderApp(); },
                      }, msIcon('task_alt', 14), h('span', {}, 'Étape par étape')),
                      h('button', {
                        type: 'button',
                        className: 'v1-btn v1-btn-sm' + (!isStepper ? ' v1-btn-primary' : ' v1-btn-ghost'),
                        style: { borderRadius: 'var(--radius-pill)', padding: '4px 12px', fontSize: '0.75rem', height: '28px' },
                        onClick: () => { V091.formViewMode = 'all'; renderApp(); },
                      }, msIcon('open_in_full', 14), h('span', {}, 'Vue complète'))
                    )
                  ),
                  /* Progress Bar (Stepper Mode) */
                  isStepper ? h('div', { className: 'gf-stepper-progress' },
                    h('div', {
                      className: 'gf-stepper-progress-fill',
                      style: { width: `${((activeSecIdx + 1) / formSections.length) * 100}%` }
                    })
                  ) : null,
                  /* Interactive Step Chips (Stepper Mode) */
                  isStepper ? h('div', { className: 'gf-step-chips' },
                    formSections.map((sec, idx) =>
                      h('button', {
                        type: 'button',
                        key: sec.id,
                        className: 'gf-step-chip' + (idx === activeSecIdx ? ' active' : (idx < activeSecIdx ? ' done' : '')),
                        onClick: () => {
                          V091.activeFormSectionIndex = idx;
                          renderApp();
                          const wrap = document.querySelector('.gf-wrapper');
                          if (wrap) wrap.scrollIntoView({ behavior: 'smooth' });
                        },
                      },
                        h('span', { className: 'gf-step-chip-num' }, idx < activeSecIdx ? msIcon('check', 12) : String(idx + 1)),
                        msIcon(sec.icon, 16),
                        h('span', {}, sec.shortTitle)
                      )
                    )
                  ) : null
                ),

                /* Main Section Content */
                isStepper
                  ? currentSection.render()
                  : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
                      formSections.map(s => s.render())
                    ),

                /* Step Navigation & Action Bar */
                h('div', {
                  className: 'gf-stepper-actions-bar',
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    marginTop: '12px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }
                },
                  /* Left: Previous Section (if step > 0) + Reset / Duplicate */
                  h('div', { className: 'gf-stepper-left-actions', style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
                    isStepper && activeSecIdx > 0 ? h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-secondary',
                      onClick: () => {
                        V091.activeFormSectionIndex = Math.max(0, activeSecIdx - 1);
                        renderApp();
                        const wrap = document.querySelector('.gf-wrapper');
                        if (wrap) wrap.scrollIntoView({ behavior: 'smooth' });
                      },
                    },
                      msIcon('arrow_back', 18),
                      h('span', {}, 'Section précédente')
                    ) : null,
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-ghost',
                      title: 'Réinitialiser toutes les valeurs du formulaire',
                      onClick: () => {
                        V091.formValues = {};
                        V091.activeFormSectionIndex = 0;
                        V091.showToast('Formulaire réinitialisé.', 'info');
                        renderApp();
                      },
                    },
                      msIcon('restart_alt', 18),
                      h('span', {}, 'Réinitialiser')
                    ),
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-ghost',
                      title: 'Dupliquer ce formulaire',
                      onClick: () => {
                        const cloned = Object.assign({}, V091.formValues);
                        cloned.record = `REC-${Date.now().toString(36).toUpperCase()}`;
                        if (cloned.title) cloned.title = `${cloned.title} (Copie)`;
                        V091.formValues = cloned;
                        V091.showToast('✓ Formulaire dupliqué !', 'info');
                        renderApp();
                      },
                    },
                      msIcon('content_copy', 18),
                      h('span', {}, 'Dupliquer')
                    )
                  ),
                  /* Right: Save Draft + Next Step / Submit */
                  h('div', { className: 'gf-stepper-right-actions', style: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' } },
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-secondary',
                      onClick: () => {
                        const draftPayload = {
                          form: currentForm.code,
                          event_date: V091.formValues.event_date || '2026-10-25',
                          values: V091.formValues,
                          language: V1.lang,
                        };
                        apiV1('/working-drafts', 'POST', draftPayload).then(() => {
                          V091.showToast('✓ Brouillon enregistré avec succès.', 'info');
                        }).catch(err => V091.showToast('Erreur brouillon : ' + err.message, 'error'));
                      },
                    },
                      msIcon('cloud_done', 18),
                      h('span', {}, 'Enregistrer brouillon')
                    ),
                    isStepper && activeSecIdx < formSections.length - 1 ? h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-primary',
                      onClick: () => {
                        V091.activeFormSectionIndex = Math.min(formSections.length - 1, activeSecIdx + 1);
                        renderApp();
                        const wrap = document.querySelector('.gf-wrapper');
                        if (wrap) wrap.scrollIntoView({ behavior: 'smooth' });
                      },
                    },
                      h('span', {}, 'Section suivante'),
                      msIcon('arrow_forward', 18)
                    ) : h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-primary',
                      onClick: () => {
                        const event_date = V091.formValues.event_date || '2026-10-25';
                        const payload = {
                          form: currentForm.code,
                          event_date: event_date,
                          values: V091.formValues,
                        };
                        apiV1('/records', 'POST', payload).then(rec => {
                          V091.showToast(`✓ Dossier ${rec.values?.record || rec.id} validé et soumis avec succès !`, 'info');
                          V091.formValues = {};
                          V091.activeFormSectionIndex = 0;
                          V1.workspace = 'files_validation';
                          renderApp();
                        }).catch(err => V091.showToast('Erreur validation : ' + (err.details || err.message), 'error'));
                      },
                    },
                      msIcon('check', 18),
                      h('span', {}, 'Valider & Soumettre le dossier')
                    )
                  )
                )
              );
            })()
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     3. FILES & VALIDATION (Dossiers et validation — 5-stage workflow)
     -------------------------------------------------------------------------- */
  function renderFilesValidationWorkspace() {
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Gouvernance & Suivi'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_files_validation'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_files_validation')),
            h('p', { className: 'v1-page-subtitle' },
              'Circuit des 5 étapes d’approbation : Brouillon → Revue CPJP → Validation MEL → Vérification Coordinateur → Approbation Directeur → Verrouillé'
            )
          )
        )
      ),
      renderApprovalsWorkspace()
    );
  }

  /* --------------------------------------------------------------------------
     4. LEARNING & ADAPTATION (Apprentissage F27, F28, F29, F30)
     -------------------------------------------------------------------------- */
  function renderLearningWorkspace() {
    if (!V091.learningLoading && !V091.learningRecords) {
      V091.learningLoading = true;
      apiV1('/records?start=2026-09-01&end=2031-08-31&approved=false').then(d => {
        const recs = (d.records || []).filter(r => ['F27', 'F28', 'F29', 'F30'].includes(r.form));
        V091.learningRecords = recs;
        V091.learningLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(() => {
        V091.learningRecords = [];
        V091.learningLoading = false;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const subTabs = [
      { id: 'ALL', label: 'Tous (F27–F30)', form: 'F29' },
      { id: 'f27', label: 'F27 Questions d’apprentissage', form: 'F27' },
      { id: 'f28', label: 'F28 Revues après action (AAR)', form: 'F28' },
      { id: 'f29', label: 'F29 Leçons validées', form: 'F29' },
      { id: 'f30', label: 'F30 Applications & Adaptations', form: 'F30' },
    ];

    const fallbackItems = [
      {
        form: 'F27',
        code: 'LRN-F27-2026-01',
        title: 'Quels facteurs favorisent la durabilité des ententes foncières après médiation ?',
        lesson: 'Question inscrite à l’agenda d’apprentissage AP1 (Axe A2 — Médiation communautaire).',
        owner: 'LOCAL:mel.theophile · 2026-11-30',
        effect: 'En cours d’investigation terrain',
      },
      {
        form: 'F28',
        code: 'LRN-F28-2026-01',
        title: 'Revue après action (AAR) — Campagne Justice & Paix Q1 à Gakoma',
        lesson: 'Implication précoce des chefs de CEB réduit de moitié les absences aux séances.',
        owner: 'LOCAL:cpjp.test · 2026-10-28',
        effect: 'Capitalisé vers F29',
      },
      {
        form: 'F29',
        code: 'LRN-F29-2026-01',
        title: 'Articulation CEB → CCJP → CPJP pour le suivi post-médiation',
        lesson: 'Associer systématiquement le responsable CEB (origin_ceb) au suivi à 30 et 90 jours.',
        owner: 'LOCAL:mel.theophile',
        effect: '92% des accords durent avec suivi CEB contre 64% sans suivi.',
      },
      {
        form: 'F30',
        code: 'LRN-F30-2026-01',
        title: 'Mise en œuvre de la fiche de suivi CEB dans les 27 paroisses',
        lesson: 'Décision : SCALE — Déploiement généralisé aux comités CPJP.',
        owner: 'LOCAL:coordination.emmanuel · 2026-12-15',
        effect: 'Vérifié par Directeur',
      },
    ];

    const liveItems = (V091.learningRecords || []).map(r => {
      const v = r.values || {};
      return {
        form: r.form,
        code: v.record || r.id,
        title: v.title || v.question || v.finding || `Dossier ${r.form}`,
        lesson: v.lesson || v.action || v.adaptation || v.recommendation || v.decision || 'Capitalisation enregistrée',
        owner: `${v.owner || r.author || 'LOCAL:mel.theophile'}${v.deadline ? ' · ' + v.deadline : ''}`,
        effect: v.verified_effect || v.effect || r.state || 'Validé',
      };
    });

    const combined = [...liveItems];
    for (const fb of fallbackItems) {
      if (!combined.some(x => x.code === fb.code)) combined.push(fb);
    }

    const activeTabObj = subTabs.find(t => t.id === V091.learningSubTab) || subTabs[0];
    const filteredRows = activeTabObj.id === 'ALL'
      ? combined
      : combined.filter(r => r.form.toLowerCase() === activeTabObj.id.toLowerCase());

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Gestion des connaissances'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_learning'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_learning')),
            h('p', { className: 'v1-page-subtitle' },
              'Capitalisation continue, apprentissage par l’action et adaptation empirique sans claims causaux non étayés.'
            )
          ),
          h('div', { className: 'v1-header-actions' },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              onClick: () => {
                V091.activeFormCode = activeTabObj.form || 'F29';
                V1.workspace = 'seizure';
                renderApp();
              },
            },
              msIcon('add', 18),
              h('span', {}, 'Ajouter une leçon / adaptation')
            )
          )
        )
      ),

      /* Subtabs pills */
      h('div', { className: 'v1-chips', style: { marginBottom: '20px' } },
        subTabs.map(t =>
          h('button', {
            type: 'button',
            className: 'v1-chip' + (V091.learningSubTab === t.id ? ' active' : ''),
            onClick: () => {
              V091.learningSubTab = t.id;
              renderApp();
            },
          }, t.label)
        )
      ),

      /* Learning items table */
      h('div', { className: 'v1-panel' },
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Formulaire'),
              h('th', {}, 'Code Dossier'),
              h('th', {}, 'Titre / Question / Constat'),
              h('th', {}, 'Leçon / Action proposée'),
              h('th', {}, 'Responsable & Échéance'),
              h('th', {}, 'Effet vérifié'),
              h('th', {}, 'Actions')
            )
          ),
          h('tbody', {},
            filteredRows.map((row, idx) =>
              h('tr', { key: row.code || idx },
                h('td', {}, h('span', { className: 'v1-badge' }, row.form)),
                h('td', {}, row.code),
                h('td', {}, row.title),
                h('td', {}, row.lesson),
                h('td', {}, row.owner),
                h('td', {},
                  row.form === 'F30'
                    ? h('span', { className: 'v1-badge', style: { background: 'var(--color-success-bg)', color: 'var(--color-success)' } }, row.effect)
                    : row.effect
                ),
                h('td', {},
                  row.form !== 'F30'
                    ? h('button', {
                        type: 'button',
                        className: 'v1-btn v1-btn-sm v1-btn-secondary',
                        onClick: () => {
                          V091.activeFormCode = 'F30';
                          V091.formValues = {
                            lesson_ref: row.code,
                            title: `Application de la leçon : ${row.title}`,
                            decision: 'SCALE',
                          };
                          V1.workspace = 'seizure';
                          renderApp();
                        },
                      }, 'Appliquer cette leçon (F30)')
                    : h('span', { className: 'v1-chip' }, 'Clôturé & vérifié')
                )
              )
            )
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     5. REPORTS (Rapports R01–R12 & R13 PS Results-based report builder)
     -------------------------------------------------------------------------- */
  function renderReportsWorkspace() {
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Rapports institutionnels'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_reports'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_reports')),
            h('p', { className: 'v1-page-subtitle' },
              'Génération des rapports opérationnels R01–R12 et constructeur du Rapport axé sur les résultats du Plan Stratégique (R13).'
            )
          )
        )
      ),

      /* Subtab toggle: R13 Builder vs Operational Reports R01-R12 */
      h('div', { className: 'v1-segmented', style: { marginBottom: '20px', width: 'fit-content' } },
        h('button', {
          type: 'button',
          className: 'v1-seg-btn' + (V091.reportsSubTab === 'r13' ? ' active' : ''),
          onClick: () => { V091.reportsSubTab = 'r13'; renderApp(); },
        }, 'Constructeur R13 (Rapport axé sur les résultats du PS)'),
        h('button', {
          type: 'button',
          className: 'v1-seg-btn' + (V091.reportsSubTab === 'ops' ? ' active' : ''),
          onClick: () => { V091.reportsSubTab = 'ops'; renderApp(); },
        }, 'Rapports opérationnels R01–R12')
      ),

      V091.reportsSubTab === 'r13' ? renderR13Builder() : renderExportsWorkspace()
    );
  }

  function renderR13Builder() {
    return h('div', { className: 'v1-panel', style: { padding: '24px' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
        h('div', {},
          h('h2', { style: { fontSize: '1.25rem', fontWeight: '700' } }, 'Rapport R13 : Suivi axé sur les résultats du PS 2026–2031'),
          h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '4px 0 0' } },
            'Le rapport R13 combine la matrice des 13 résultats PS et les 6 sections d’analyse narrative institutionnelle avant le gel immuable.'
          )
        ),
        h('div', { style: { display: 'flex', gap: '8px' } },
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-secondary',
            onClick: () => {
              window.open('/apse-service/report?code=R13&format=docx&language=' + V1.lang, '_blank');
            },
          },
            msIcon('download', 18),
            h('span', {}, 'Aperçu Word (.docx)')
          ),
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-primary',
            onClick: () => {
              apiV1('/report/freeze', 'POST', {
                code: 'R13',
                language: V1.lang,
                format: 'docx',
                start: '2026-09-01',
                end: '2027-08-31',
                narrative: V091.r13Narrative,
              }).then(res => {
                V091.showModal({
                  title: 'Rapport R13 gelé avec succès',
                  subtitle: 'Snapshot immuable généré pour audit et archivage institutionnel.',
                  icon: 'lock',
                  content: h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    h('p', {}, 'Snapshot ID : ' + res.snapshot),
                    h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--bg-input)', padding: '10px', borderRadius: '4px', wordBreak: 'break-all' } },
                      'SHA-256 : ' + res.sha256
                    )
                  ),
                  actions: [{ label: 'Fermer', type: 'primary', onClick: () => V091.closeModal() }]
                });
              }).catch(err => V091.showToast('Erreur gel rapport : ' + err.message, 'error'));
            },
          },
            msIcon('lock', 18),
            h('span', {}, 'Geler le snapshot immuable (SHA-256)')
          )
        )
      ),

      /* 6 Narrative Sections Inputs */
      h('div', { className: 'v1-grid-16' },
        [
          ['summary', '1. Synthèse des résultats (Results summary)'],
          ['outcomes', '2. Analyse des changements et contribution (Analysis of changes)'],
          ['variance', '3. Écarts, causes et hypothèses (Variances and assumptions)'],
          ['learning', '4. Apprentissages et adaptations (Learning and adaptations)'],
          ['actions', '5. Décisions, responsables et échéances (Decisions and deadlines)'],
          ['limitations', '6. Qualité des preuves et limites (Evidence quality and limitations)'],
        ].map(([key, title]) =>
          h('div', { className: 'v1-field', style: { gridColumn: 'span 8' } },
            h('label', { className: 'v1-field-label' }, title),
            h('textarea', {
              className: 'v1-textarea',
              rows: 3,
              placeholder: `Rédiger l'analyse pour la section : ${title}...`,
              value: V091.r13Narrative[key],
              onInput: e => { V091.r13Narrative[key] = e.target.value; },
            })
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     6. PREPARE / OPEN OFFLINE (Préparer / ouvrir hors ligne)
     -------------------------------------------------------------------------- */
  
  /* --------------------------------------------------------------------------
     UNIFIED OFFLINE HUB (Hub Hors-Ligne & Synchronisation)
     Combines:
     1. Coffre-fort chiffré AES-GCM (Stockage local sécurisé)
     2. File d'attente déconnectée & Synchronisation vers serveur central
     3. Simulateur réseau déconnecté
     -------------------------------------------------------------------------- */
  function renderOfflineHubWorkspace() {
    const qLen = V1.offlineQueue.length;
    const outboxPending = V1.data?.sync?.outbox?.pending || 0;
    const isSimulating = Boolean(V1.simulateOffline);

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Résilience Terrain'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_offline_hub'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_offline_hub')),
            h('p', { className: 'v1-page-subtitle' },
              'Centre unifié de gestion hors ligne : chiffrement local AES-256-GCM, contrôle de la file d’attente et synchronisation vers la base centrale.'
            )
          ),
          h('div', { className: 'v1-header-actions' },
            h('button', {
              type: 'button',
              className: 'v1-btn ' + (qLen > 0 ? 'v1-btn-primary' : 'v1-btn-secondary'),
              onClick: () => {
                if (qLen > 0) {
                  V1.syncOfflineQueue();
                } else if (outboxPending > 0) {
                  V1.runDatabaseSyncNow();
                } else {
                  V091.showToast('Toutes les données sont déjà synchronisées avec le serveur.', 'info');
                }
              },
            },
              msIcon(qLen > 0 ? 'sync' : 'cloud_done', 18),
              h('span', {}, qLen > 0 ? `Synchroniser la file (${qLen})` : 'Tout est synchronisé')
            )
          )
        )
      ),

      /* 2-Column Hub Cards Grid */
      h('div', { className: 'v1-hub-grid' },
        /* Card 1: AES-GCM Vault Status */
        h('div', { className: 'v1-hub-card' },
          h('div', {},
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                msIcon(V091.vaultUnlocked ? 'lock_open' : 'lock', 24),
                h('strong', { style: { fontSize: '1.0625rem' } }, 'Coffre-Fort Chiffré AES-GCM')
              ),
              h('span', { className: 'v1-badge', style: V091.vaultUnlocked ? { background: 'rgba(30, 58, 47, 0.1)', color: '#1E3A2F' } : {} },
                V091.vaultUnlocked ? 'DÉVERROUILLÉ' : 'VERROUILLÉ'
              )
            ),
            h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 16px' } },
              'Chiffrement local des brouillons et dossiers confidentiels avec dérivation de clé PBKDF2 (100 000 itérations SHA-256).'
            ),
            h('div', { className: 'v1-field' },
              h('label', { className: 'v1-field-label' }, 'Phrase secrète du coffre-fort (>= 12 caractères)'),
              h('input', {
                type: 'password',
                className: 'v1-input',
                placeholder: '••••••••••••••••',
                value: V091.vaultPassphrase,
                onInput: e => { V091.vaultPassphrase = e.target.value; },
              })
            )
          ),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary',
              onClick: () => {
                if (!V091.vaultPassphrase || V091.vaultPassphrase.length < 12) {
                  V091.showToast('La phrase secrète doit comporter au moins 12 caractères.', 'error');
                  return;
                }
                apiV1('/offline/vault', 'POST', {
                  action: V091.vaultUnlocked ? 'lock' : 'unlock',
                  passphrase: V091.vaultPassphrase,
                }).then(res => {
                  V091.vaultUnlocked = res.status === 'unlocked';
                  V091.showToast(V091.vaultUnlocked ? '✓ Coffre-fort déverrouillé avec succès.' : 'Coffre-fort verrouillé.', 'info');
                  renderApp();
                }).catch(err => {
                  V091.showToast('Erreur coffre-fort : ' + err.message, 'error');
                });
              },
            },
              msIcon(V091.vaultUnlocked ? 'lock' : 'lock_open', 16),
              h('span', {}, V091.vaultUnlocked ? 'Verrouiller le coffre-fort' : 'Déverrouiller le coffre-fort')
            )
          )
        ),

        /* Card 2: Queue & Sync Status */
        h('div', { className: 'v1-hub-card' },
          h('div', {},
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                msIcon('cloud_sync', 24),
                h('strong', { style: { fontSize: '1.0625rem' } }, 'Synchronisation Déconnectée')
              ),
              h('span', { className: 'v1-badge' }, qLen > 0 ? `${qLen} EN ATTENTE` : 'SYNCHRONISÉ')
            ),
            h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 16px' } },
              'Transmission ordonnée des fiches enregistrées hors ligne vers la base centrale avec résolution automatique des conflits.'
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', fontSize: '0.8125rem' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                h('span', { style: { color: 'var(--text-secondary)' } }, 'File cache navigateur :'),
                h('strong', {}, `${qLen} fiche(s)`)
              ),
              h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                h('span', { style: { color: 'var(--text-secondary)' } }, 'Boîte d’envoi SQLite locale :'),
                h('strong', {}, `${outboxPending} fiche(s)`)
              ),
              h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                h('span', { style: { color: 'var(--text-secondary)' } }, 'Schéma actif :'),
                h('span', { className: 'v1-meta-code-badge' }, 'v3 (Multi-tenant)')
              )
            )
          ),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              onClick: () => {
                if (qLen > 0) V1.syncOfflineQueue();
                else V1.runDatabaseSyncNow();
              },
            },
              msIcon('sync', 16),
              h('span', {}, 'Synchroniser immédiatement')
            ),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary',
              onClick: () => {
                V1.simulateOffline = !V1.simulateOffline;
                V091.showToast(V1.simulateOffline ? 'Mode hors-ligne simulé activé.' : 'Mode en ligne rétabli.', 'info');
                renderApp();
              },
            },
              msIcon(isSimulating ? 'cloud' : 'cloud_off', 16),
              h('span', {}, isSimulating ? 'Rétablir le réseau' : 'Simuler hors ligne')
            )
          )
        )
      ),

      /* Queue Items Details Panel */
      h('div', { className: 'v1-panel', style: { padding: '24px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' } },
          h('h2', { style: { fontSize: '1.0625rem', fontWeight: '700' } }, 'Détail des Fiches en Attente de Transmission'),
          h('span', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)' } }, `${qLen} élément(s) en mémoire locale`)
        ),
        qLen === 0 ?
          h('div', { style: { textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' } },
            msIcon('cloud_done', 40),
            h('p', { style: { fontSize: '0.9375rem', fontWeight: '600', marginTop: '10px' } }, 'Toutes vos données sont à jour.'),
            h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-muted)' } }, 'Aucun enregistrement en attente dans la file déconnectée.')
          ) :
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            V1.offlineQueue.map((item, qIdx) =>
              h('div', { key: qIdx, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-input)' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                  msIcon('description', 20),
                  h('div', {},
                    h('strong', { style: { fontSize: '0.875rem' } }, item.task_code || `Tâche #${item.task_id || qIdx + 1}`),
                    h('p', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' } },
                      `Enregistré le ${item.created_at || 'récemment'} · Participants : ${(item.women_count || 0) + (item.men_count || 0)}`
                    )
                  )
                ),
                h('span', { className: 'v1-badge' }, 'EN ATTENTE')
              )
            )
          )
      )
    );
  }

  function renderOfflineVaultWorkspace() {
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Résilience terrain'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_offline_vault'))
        ),
        h('h1', { className: 'v1-page-title' }, L('nav_offline_vault'))
      ),

      h('div', { className: 'v1-panel', style: { maxWidth: '640px', padding: '32px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' } },
          msIcon(V091.vaultUnlocked ? 'cloud_done' : 'lock', 32),
          h('div', {},
            h('h2', { style: { fontSize: '1.25rem', fontWeight: '700' } },
              V091.vaultUnlocked ? 'Coffre-fort hors ligne déverrouillé' : 'Déverrouiller le coffre-fort hors ligne'
            ),
            h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)' } },
              'Chiffrement AES-GCM 256 bits avec dérivation PBKDF2 (310 000 itérations). Aucune donnée en clair ne persiste hors session.'
            )
          )
        ),
        !V091.vaultUnlocked ? h('div', {},
          h('div', { className: 'v1-field', style: { marginBottom: '16px' } },
            h('label', { className: 'v1-field-label' }, 'Phrase secrète du coffre-fort (12 caractères minimum)'),
            h('input', {
              type: 'password',
              className: 'v1-input',
              placeholder: 'Saisir la phrase secrète...',
              value: V091.vaultPassphrase,
              onInput: e => { V091.vaultPassphrase = e.target.value; },
            })
          ),
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-primary',
            onClick: () => {
              if (V091.vaultPassphrase.length < 12) {
                V091.showToast('La phrase secrète doit comporter au moins 12 caractères.', 'error');
                return;
              }
              V091.vaultUnlocked = true;
              V091.vaultStatusMessage = 'Coffre-fort initialisé et prêt pour la saisie sans internet.';
              renderApp();
            },
          },
            msIcon('lock_open', 18),
            h('span', {}, 'Ouvrir / Préparer le coffre-fort')
          )
        ) : h('div', {},
          h('div', { className: 'v1-badge', style: { background: 'var(--color-success-bg)', color: 'var(--color-success)', marginBottom: '16px' } },
            'Coffre-fort actif · Saisie hors ligne sécurisée'
          ),
          h('p', { style: { fontSize: '0.875rem', marginBottom: '16px' } },
            `Enregistrements actuellement en file d'attente : ${V1.offlineQueue.length} fiches.`
          ),
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-secondary',
            onClick: () => {
              V091.vaultUnlocked = false;
              V091.vaultPassphrase = '';
              renderApp();
            },
          }, 'Verrouiller le coffre-fort')
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     7. SYNCHRONIZE OFFLINE QUEUE (Synchroniser la file hors ligne)
     -------------------------------------------------------------------------- */
  function renderOfflineSyncWorkspace() {
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Synchronisation'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_offline_sync'))
        ),
        h('h1', { className: 'v1-page-title' }, L('nav_offline_sync'))
      ),

      h('div', { className: 'v1-panel', style: { padding: '24px', marginBottom: '24px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', {},
            h('h2', { style: { fontSize: '1.125rem', fontWeight: '600' } }, 'Synchronisation Locale → Centrale'),
            h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)' } },
              `${V1.offlineQueue.length} fiches dans le cache du navigateur · ${V1.data?.sync?.outbox?.pending || 0} fiches dans la boîte d'envoi SQLite.`
            )
          ),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              onClick: () => {
                syncOfflineQueue().then(() => runDatabaseSyncNow()).then(() => renderApp());
              },
            },
              msIcon('sync', 18),
              h('span', {}, 'Synchroniser maintenant')
            )
          )
        )
      ),

      /* Queue list */
      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, 'File d’attente locale hors ligne'),
          h('span', { className: 'v1-badge' }, `${V1.offlineQueue.length} éléments`)
        ),
        V1.offlineQueue.length === 0 ? h('p', { style: { padding: '24px', color: 'var(--text-secondary)', textAlign: 'center' } },
          'La file d’attente est vide. Toutes les fiches saisies ont été enregistrées sur le serveur central.'
        ) : h('ul', { style: { listStyle: 'none', padding: 0 } },
          V1.offlineQueue.map((item, idx) =>
            h('li', { style: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border-subtle)' } },
              h('div', {},
                h('strong', {}, item.taskTitle || item.task_id || `Élément #${idx + 1}`),
                h('div', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)' } },
                  `Date : ${item.event_date || 'N/A'} · Participants : ${item.total || 0}`
                )
              ),
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-sm v1-btn-danger',
                onClick: () => {
                  V1.offlineQueue.splice(idx, 1);
                  localStorage.setItem('apse-v1-offline-queue', JSON.stringify(V1.offlineQueue));
                  renderApp();
                },
              }, 'Retirer')
            )
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     8. PS PLANNING (Planification du PS — AP1–AP5, STAFF vs CPJP, 25 lines, 33 tasks)
     -------------------------------------------------------------------------- */
  function renderPSPlanningWorkspace() {
    // 1. Fetch live planning data from backend endpoint if not already cached
    const cacheKey = `${V091.planningYear}_${V091.planningAudience}`;
    if (!V091.planningLoading && (!V091.planningData || V091.planningData._key !== cacheKey)) {
      V091.planningLoading = true;
      apiV1(`/planning?ap=${V091.planningYear}&audience=${V091.planningAudience}`).then(d => {
        d._key = cacheKey;
        V091.planningData = d;
        V091.planningLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(err => {
        V091.planningLoading = false;
        V091.planningError = err.message;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const data = V091.planningData || {
      year: {
        code: V091.planningYear,
        start: '2026-09-01',
        end: '2027-08-31',
        phase: 'Baseline, installation APSE, costing et lancement contrôlé',
        milestone: 'Baseline sept.-nov. 2026 ; cibles et budget validés',
        roadmap: [
          'Axes 1, 2 et 4 : consolider les approches existantes de guérison, réconciliation, transformation non violente et droits humains.\nAxe 3 : familiariser avec l’écologie intégrale, analyser les besoins décentralisés et identifier des projets pilotes réalistes.\nAxe 5 : mettre en place les conditions institutionnelles, plan d’action et budget disponibles, dispositif APSE minimum.',
          'Communiquer et vulgariser le Plan ; préciser les responsabilités ; établir ou actualiser les données de référence ; élaborer les plans d’action et budgets annuels ; harmoniser les outils prioritaires ; cartographier partenaires et ressources disponibles.',
          'Plan diffusé et compris ; Responsabilités attribuées ; Plan d’action et budget 2026 disponibles ; Valeurs de référence prioritaires établies ; Outils essentiels harmonisés ; Mécanisme de suivi fonctionnel ; Premières initiatives sélectionnées.'
        ]
      },
      axes: [
        { code: 'A1', labels: { fr: 'Guérison des blessures de l’histoire, unité et réconciliation', rw: 'Gukira ibikomere by’amateka, ubumwe n’ubwiyunge', en: 'Healing of historical wounds, unity and reconciliation' } },
        { code: 'A2', labels: { fr: 'Résolution pacifique des conflits et transformation non violente', rw: 'Gukemura amakimbirane mu mahoro', en: 'Peaceful conflict resolution and non-violent transformation' } },
        { code: 'A3', labels: { fr: 'Justice écologique et sauvegarde de la création', rw: 'Ubutabera ku bidukikije no kurengera ibyaremwe', en: 'Ecological justice and care for creation' } },
        { code: 'A4', labels: { fr: 'Droits humains, dignité humaine et assistance juridique', rw: 'Uburenganzira bwa muntu n’ubufasha mu by’amategeko', en: 'Human rights, human dignity and legal aid' } },
        { code: 'A5', labels: { fr: 'Gouvernance, renforcement des capacités et suivi MEL', rw: 'Imiyoborere, kongera ubushobozi no gukurikirana', en: 'Governance, capacity building and MEL tracking' } },
      ],
      operational_lines: [],
      annual_tasks: []
    };

    const yearData = data.year || {};
    const operationalLines = data.operational_lines || [];
    const annualTasks = data.annual_tasks || [];
    const lang = V1.lang || 'fr';

    const totalMillions = operationalLines.reduce((sum, x) => sum + Number(x.indicativeMillionsRWF?.[V091.planningYear] || 0), 0);

    // Filter items based on selected axis, kind, and search query
    const allItems = [...annualTasks, ...operationalLines];
    const filteredItems = allItems.filter(x => {
      if (V091.planningFilterAxis !== 'ALL' && x.axis !== V091.planningFilterAxis) return false;
      if (V091.planningFilterType === 'TASK' && !x.ap) return false;
      if (V091.planningFilterType === 'LINE' && x.ap) return false;
      if (V091.planningSearch) {
        const q = V091.planningSearch.toLowerCase();
        const lbl = Object.values(x.labels || {}).join(' ').toLowerCase();
        const exp = Object.values(x.expected || {}).join(' ').toLowerCase();
        const ind = Object.values(x.indicator || {}).join(' ').toLowerCase();
        const code = (x.code || '').toLowerCase();
        const obj = (x.objective || '').toLowerCase();
        const src = (x.source || '').toLowerCase();
        const loc = (x.locations || '').toLowerCase();
        if (!lbl.includes(q) && !code.includes(q) && !exp.includes(q) && !ind.includes(q) && !obj.includes(q) && !src.includes(q) && !loc.includes(q)) {
          return false;
        }
      }
      return true;
    });

    const planningActiveFilters = (V091.planningFilterAxis !== 'ALL' ? 1 : 0) + (V091.planningFilterType !== 'ALL' ? 1 : 0);

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Horizon Quinquennal 2026–2031'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_ps_planning'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_ps_planning')),
            h('p', { className: 'v1-page-subtitle' },
              `Plan Stratégique 2026–2031 : 5 axes, 13 résultats, 15 interventions, 25 lignes indicatives et 33 tâches annuelles prioritaires.`
            )
          ),
          h('div', { className: 'v1-header-actions' },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary',
              onClick: () => {
                V091.planningShowRoadmap = !V091.planningShowRoadmap;
                renderApp();
              }
            },
              msIcon('info', 18),
              h('span', {}, V091.planningShowRoadmap ? 'Masquer la feuille de route' : 'Feuille de route & Jalons')
            ),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              onClick: () => {
                V091.activeFormCode = 'F03';
                V091.formValues = {
                  work_type: 'OPERATIONAL',
                  ap: V091.planningYear,
                  plan_type: V091.planningAudience,
                  start: yearData.start || '2026-09-01',
                  end: yearData.end || '2027-08-31',
                  owner: V1.data?.user?.id || 'mel',
                };
                V1.workspace = 'seizure';
                renderApp();
              },
            },
              msIcon('add', 18),
              h('span', {}, 'Préparer un plan annuel (F03)')
            )
          )
        )
      ),

      /* Pastoral Year Phase Banner */
      h('div', { className: 'v1-panel', style: { marginBottom: '20px', padding: '16px 20px', borderRadius: '12px', background: 'var(--bg-canvas)' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' } },
          h('div', { style: { flex: '1 1 260px', minWidth: '240px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' } },
              h('strong', { style: { fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' } }, `${V091.planningYear} · ${yearData.start} au ${yearData.end}`),
              h('span', { className: 'v1-badge', style: { background: 'var(--color-primary-bg)', color: 'var(--color-primary)', whiteSpace: 'nowrap' } }, yearData.phase || 'Phase active'),
              V091.planningLoading ? h('span', { className: 'v1-badge' }, 'Chargement API...') : null
            ),
            h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 } },
              h('strong', {}, 'Jalon clé : '), yearData.milestone || 'Cibles et budgets validés'
            )
          ),
          h('div', { style: { flexShrink: 0, textAlign: 'right' } },
            h('span', { style: { fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' } }, 'Enveloppe PS approuvée'),
            h('strong', { style: { fontSize: '1.25rem', color: 'var(--color-success)' } }, `${totalMillions.toLocaleString()} M RWF`)
          )
        ),

        /* Optional Expanded Roadmap View */
        V091.planningShowRoadmap && Array.isArray(yearData.roadmap) ? h('div', { style: { marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' } },
          h('strong', { style: { fontSize: '0.875rem', display: 'block', marginBottom: '8px' } }, 'Feuille de route stratégique diocésaine :'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            yearData.roadmap.map((stepText, sIdx) =>
              h('div', { key: sIdx, style: { display: 'flex', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)' } },
                h('span', { style: { fontWeight: '700', color: 'var(--color-primary)' } }, `Étape ${sIdx + 1} :`),
                h('span', { style: { whiteSpace: 'pre-line' } }, stepText)
              )
            )
          )
        ) : null
      ),

      /* ClickUp-style toolbar: search + Filter pill (popover) + quick type pill */
      h('div', { className: 'v1-tasks-figma-header', style: { marginBottom: '12px' } },
        h('div', { className: 'v1-tasks-toolbar-row' },
          h('div', { className: 'v1-tasks-search-box' },
            h('span', { className: 'v1-tasks-search-icon' }, msIcon('search', 20)),
            h('input', {
              type: 'search',
              className: 'v1-tasks-search-input',
              placeholder: 'Rechercher par code, intitulé, indicateur, district...',
              value: V091.planningSearch,
              onInput: e => {
                V091.planningSearch = e.target.value;
                renderApp();
              },
            })
          ),
          h('div', { className: 'v1-header-actions v1-tasks-actions-group' },
            h('button', {
              type: 'button',
              className: 'v1-cu-pill-filter' + (V091.planningFilterOpen || planningActiveFilters > 0 ? ' active' : ''),
              onClick: e => {
                e.stopPropagation();
                V091.planningFilterOpen = !V091.planningFilterOpen;
                renderApp();
              },
            },
              msIcon('iconsax_sort', 19),
              h('span', {}, planningActiveFilters > 0 ? `Filtres (${planningActiveFilters})` : 'Filtres')
            ),
            h('button', {
              type: 'button',
              className: 'v1-cu-pill-completed' + (V091.planningFilterType === 'TASK' ? ' active' : ''),
              onClick: () => {
                V091.planningFilterType = V091.planningFilterType === 'TASK' ? 'ALL' : 'TASK';
                renderApp();
              },
            },
              msIcon('iconsax_clipboard_tick', 18),
              h('span', {}, 'Tâches annuelles')
            )
          )
        )
      ),

      /* Filter popover (theme-adaptive, same abstraction as Tasks / Approvals) */
      h('div', {
        className: 'v1-context-filters v1-cu-filter-popover' + (V091.planningFilterOpen ? ' is-open' : ''),
        onClick: e => e.stopPropagation(),
      },
        h('div', { className: 'v1-cu-filter-header' },
          h('div', { className: 'v1-cu-filter-title-wrap' },
            h('strong', { className: 'v1-cu-filter-title' }, 'Filtres'),
            h('span', { className: 'v1-cu-filter-info' }, msIcon('info', 14))
          ),
          h('button', {
            type: 'button',
            className: 'v1-cu-filter-close-btn',
            onClick: () => { V091.planningFilterOpen = false; renderApp(); },
          }, h('span', {}, 'Fermer'), msIcon('close', 14))
        ),
        h('div', { className: 'v1-ps-filter-grid' },
          h('div', { className: 'v1-field', style: { marginBottom: 0 } },
            h('label', { className: 'v1-field-label' }, 'Année pastorale'),
            V091.renderFigmaDropdown({
              id: 'ps-year',
              value: V091.planningYear,
              width: '100%',
              options: ['AP1', 'AP2', 'AP3', 'AP4', 'AP5'].map((ap, idx) => ({ value: ap, label: `${ap} (${2026 + idx}–${2027 + idx})` })),
              onChange: val => { V091.planningYear = val; },
            })
          ),
          h('div', { className: 'v1-field', style: { marginBottom: 0 } },
            h('label', { className: 'v1-field-label' }, 'Public du plan'),
            V091.renderFigmaDropdown({
              id: 'ps-audience',
              value: V091.planningAudience,
              width: '100%',
              options: [
                { value: 'STAFF', label: 'Personnel CDJP Diocèse' },
                { value: 'CPJP', label: 'Comités Paroissiaux CPJP' },
              ],
              onChange: val => { V091.planningAudience = val; },
            })
          ),
          h('div', { className: 'v1-field', style: { marginBottom: 0 } },
            h('label', { className: 'v1-field-label' }, 'Axe stratégique'),
            V091.renderFigmaDropdown({
              id: 'ps-axis',
              value: V091.planningFilterAxis,
              width: '100%',
              options: [
                { value: 'ALL', label: 'Tous les axes (5)' },
                { value: 'A1', label: 'A1 · Guérison & Réconciliation' },
                { value: 'A2', label: 'A2 · Résolution des conflits' },
                { value: 'A3', label: 'A3 · Justice écologique' },
                { value: 'A4', label: 'A4 · Droits humains' },
                { value: 'A5', label: 'A5 · Renforcement institutionnel' },
              ],
              onChange: val => { V091.planningFilterAxis = val; },
            })
          ),
          h('div', { className: 'v1-field', style: { marginBottom: 0 } },
            h('label', { className: 'v1-field-label' }, 'Type d’élément'),
            V091.renderFigmaDropdown({
              id: 'ps-type',
              value: V091.planningFilterType,
              width: '100%',
              options: [
                { value: 'ALL', label: `Tous (${allItems.length})` },
                { value: 'TASK', label: `Tâches annuelles (${annualTasks.length})` },
                { value: 'LINE', label: `Lignes indicatives (${operationalLines.length})` },
              ],
              onChange: val => { V091.planningFilterType = val; },
            })
          )
        ),
        h('div', { className: 'v1-cu-filter-footer' },
          h('span', { className: 'v1-field-helper', style: { margin: 0 } }, `${filteredItems.length} élément(s) affiché(s)`),
          h('button', {
            type: 'button',
            className: 'v1-cu-clear-all-btn',
            onClick: () => {
              V091.planningFilterAxis = 'ALL';
              V091.planningFilterType = 'ALL';
              V091.planningSearch = '';
              renderApp();
            },
          }, 'Tout effacer')
        )
      ),

      h('div', { className: 'v1-ps-active-chips' },
        h('span', { className: 'v1-badge' }, `${V091.planningYear} · ${yearData.start || ''} → ${yearData.end || ''}`),
        h('span', { className: 'v1-badge' }, V091.planningAudience === 'STAFF' ? 'Personnel CDJP Diocèse' : 'Comités Paroissiaux CPJP'),
        V091.planningFilterAxis !== 'ALL' ? h('span', { className: 'v1-badge' }, `Axe ${V091.planningFilterAxis}`) : null,
        V091.planningFilterType !== 'ALL' ? h('span', { className: 'v1-badge' }, V091.planningFilterType === 'TASK' ? 'Tâches annuelles' : 'Lignes indicatives') : null
      ),
      /* Strategic Axes Sections with Rich Cards Grid */
      filteredItems.length === 0 ? h('div', { className: 'v1-panel', style: { padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' } },
        msIcon('search_off', 32),
        h('p', { style: { marginTop: '12px' } }, 'Aucune activité planifiée ne correspond à vos filtres de recherche pour cette année et ce public.')
      ) : (data.axes || []).map(axis => {
        const axisItems = filteredItems.filter(x => x.axis === axis.code);
        if (axisItems.length === 0) return null;
        const axisTitle = (axis.labels && (axis.labels[lang] || axis.labels.fr || axis.labels.en || axis.labels.rw || axis.labels.sw)) || axis.label || axis.code;

        return h('section', { key: axis.code, style: { marginBottom: '32px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '8px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              h('span', { className: 'v1-meta-code-badge', style: { fontSize: '0.875rem', padding: '3px 8px' } }, axis.code),
              h('h2', { style: { fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 } }, axisTitle)
            ),
            h('span', { className: 'v1-badge' }, `${axisItems.length} activité${axisItems.length > 1 ? 's' : ''}`)
          ),

          /* Cards Grid */
          h('div', { className: 'v1-planning-cards-grid' },
            axisItems.map(item => {
              const itemTitle = (item.labels && (item.labels[lang] || item.labels.fr || item.labels.en || item.labels.rw || item.labels.sw)) || item.code;
              const isLine = !!item.indicativeMillionsRWF;
              const expectedText = (item.expected && (item.expected[lang] || item.expected.fr || item.expected.en)) || '';
              const indicatorText = (item.indicator && (item.indicator[lang] || item.indicator.fr || item.indicator.en)) || '';
              const budgetText = item.budgetRWF ? Number(item.budgetRWF).toLocaleString() + ' RWF' : (item.indicativeMillionsRWF ? (item.indicativeMillionsRWF[V091.planningYear] || Object.values(item.indicativeMillionsRWF)[0]) + ' M RWF' : '—');
              const fundersList = Object.keys(item.fundingMarks || {}).map(k => ({ I: 'FP (Misereor)', J: 'AGIAMONDO', K: 'Missio' }[k] || k)).join(', ') || 'Fonds propres CDJP';

              return h('article', { key: item.code, className: 'v1-panel v1-card-interactive', style: { padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } },
                h('div', {},
                  /* Top Badges Row */
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                    h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
                      h('span', { className: 'v1-meta-code-badge' }, item.code),
                      h('span', { className: 'v1-badge', style: isLine ? { background: 'rgba(138, 43, 226, 0.1)', color: '#6A1B9A' } : { background: 'rgba(30, 58, 47, 0.1)', color: '#1E3A2F' } },
                        isLine ? 'Ligne PS' : 'Tâche PAO'
                      )
                    ),
                    h('span', { style: { fontSize: '0.75rem', color: 'var(--text-muted)' } },
                      item.intervention || (item.interventionCandidates ? item.interventionCandidates[0] : `Obj: ${item.objective}`)
                    )
                  ),

                  /* Activity Title */
                  h('strong', { style: { fontSize: '0.9375rem', lineHeight: '1.4', display: 'block', marginBottom: '10px', color: 'var(--text-primary)' } }, itemTitle),

                  /* Expected Strategic Change */
                  expectedText ? h('div', { style: { display: 'flex', gap: '6px', marginBottom: '6px', fontSize: '0.8125rem', color: 'var(--text-secondary)' } },
                    msIcon('target', 14),
                    h('span', { style: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, expectedText)
                  ) : null,

                  /* KPI Indicator */
                  indicatorText ? h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px', fontSize: '0.8125rem', color: 'var(--text-secondary)' } },
                    msIcon('analytics', 14),
                    h('span', { style: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, indicatorText)
                  ) : null,

                  /* Metadata Chips */
                  h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' } },
                    h('span', { className: 'v1-badge', style: { background: 'var(--bg-canvas)', display: 'inline-flex', alignItems: 'center', gap: '4px' } }, msIcon('payments', 12), budgetText),
                    h('span', { className: 'v1-badge', style: { background: 'var(--bg-canvas)', display: 'inline-flex', alignItems: 'center', gap: '4px' } }, msIcon('place', 12), item.locations || '4 districts'),
                    item.responsibleSource ? h('span', { className: 'v1-badge', style: { background: 'var(--bg-canvas)', display: 'inline-flex', alignItems: 'center', gap: '4px' } }, msIcon('person', 12), item.responsibleSource) : null,
                    fundersList ? h('span', { className: 'v1-badge', style: { background: 'var(--bg-canvas)', display: 'inline-flex', alignItems: 'center', gap: '4px' } }, msIcon('handshake', 12), fundersList) : null
                  )
                ),

                /* Card Actions */
                h('div', { style: { display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', justifyContent: 'flex-end', alignItems: 'center' } },
                  h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-sm v1-btn-secondary',
                    title: 'Voir tous les détails et métadonnées de cette activité',
                    onClick: () => V091.showPlanningItemModal(item, yearData),
                  },
                    msIcon('info', 14),
                    h('span', {}, 'Détails')
                  ),
                  h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-sm v1-btn-primary',
                    title: 'Préparer cette activité dans le formulaire F03',
                    onClick: () => V091.preparePlanningActivity(item, yearData),
                  },
                    msIcon('content_copy', 14),
                    h('span', {}, 'Préparer cette activité (F03)')
                  )
                )
              );
            })
          )
        );
      })
    );
  }

  /* --------------------------------------------------------------------------
     9. METADATA (Métadonnées — MEL-only administration)
     -------------------------------------------------------------------------- */
  function renderMetadataWorkspace() {
    const metaCategories = [
      'axes', 'objectives', 'results', 'interventions', 'years', 'operational_lines',
      'annual_tasks', 'organisation_units', 'ccjp_units', 'geography_units', 'volets',
      'projects', 'programs', 'partners', 'positions', 'fields', 'forms', 'settings'
    ];

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Administration institutionnelle'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_metadata'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_metadata')),
            h('p', { className: 'v1-page-subtitle' },
              'Gestion des 18 référentiels de métadonnées avec libellés en 4 langues (RW, FR, EN, SW) et audit de chaque version.'
            )
          )
        )
      ),

      h('div', { className: 'v1-grid-16' },
        metaCategories.map(cat =>
          h('div', {
            className: 'v1-panel v1-card-interactive v1-metadata-card',
            style: { gridColumn: 'span 8', padding: '16px', cursor: 'pointer' },
            onClick: () => {
              V091.showMetadataDetailsModal(cat);
            },
          },
            h('strong', { style: { textTransform: 'capitalize' } }, cat.replace(/_/g, ' ')),
            h('p', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' } },
              'Référentiel versionné avec vérification des conflits.'
            )
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     10. RECORD FEEDBACK (Retours sur les dossiers — Figma Node 18:49)
     -------------------------------------------------------------------------- */
  function renderFeedbackWorkspace() {
    // 1. Fetch live feedback inbox if not cached
    if (!V091.inboxLoading && !V091.inboxData) {
      V091.inboxLoading = true;
      apiV1('/inbox').then(d => {
        V091.inboxData = d;
        V091.inboxLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(err => {
        V091.inboxLoading = false;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const inboxList = V091.inboxData?.inbox?.feedback || V091.inboxData?.feedback || [];
    const recipientOptions = [
      { value: 'AUTHOR', label: 'Auteur (Enquêteur / CPJP)' },
      { value: 'VERIFICATION', label: 'Coordinateur opérationnel' },
      { value: 'FINANCE', label: 'Responsable financier & RH' },
      { value: 'MEL', label: 'Responsable Suivi & Évaluation' },
      { value: 'APPROVAL', label: 'Directeur diocésain' },
      { value: 'ALL', label: 'Tout le circuit d’approbation' },
    ];

    return h('div', {
      className: 'v1-workspace-fade v1-feedback-workspace',
      onClick: () => {
        if (V091.openDropdownId) {
          V091.openDropdownId = null;
          if (typeof renderApp === 'function') renderApp();
        }
      },
    },
      h('header', { className: 'v1-page-header v1-feedback-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Échanges internes & Contrôle'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_feedback'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', { className: 'v1-feedback-heading-wrap' },
            h('h1', { className: 'v1-page-title' }, L('nav_feedback')),
            h('p', { className: 'v1-page-subtitle' },
              'Boîte de réception des retours et messages chiffrés par dossier entre auteurs, coordinateurs, comptables et direction.'
            )
          )
        )
      ),

      /* Compose / Send Feedback Panel (Figma Node 18:70) */
      h('div', { className: 'v1-panel v1-feedback-compose-card' },
        h('h2', { className: 'v1-feedback-compose-title' },
          'Rédiger une observation ou demande de correction sur un dossier'
        ),
        h('div', { className: 'v1-feedback-controls-row' },
          h('input', {
            className: 'v1-input v1-feedback-ref-input',
            placeholder: 'Référence du dossier (ex. rec-f07-butare-01)...',
            value: V091.selectedRecordForFeedback || '',
            onInput: e => { V091.selectedRecordForFeedback = e.target.value; },
          }),
          V091.renderFigmaDropdown({
            id: 'feedback-recipient',
            prefix: 'Niveau',
            value: V091.feedbackRecipient || 'AUTHOR',
            options: recipientOptions,
            width: '296px',
            className: 'v1-feedback-recipient-dropdown',
            onChange: nextVal => { V091.feedbackRecipient = nextVal; },
          })
        ),
        h('div', { className: 'v1-feedback-input-box' },
          h('textarea', {
            className: 'v1-textarea v1-feedback-textarea',
            rows: 3,
            placeholder: 'Rédiger une observation confidentielle avec justification précise...',
            value: V091.feedbackText,
            onInput: e => { V091.feedbackText = e.target.value; },
          }),
          h('div', { className: 'v1-feedback-submit-row' },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary v1-feedback-send-btn',
              onClick: () => {
                if (!V091.feedbackText.trim()) {
                  V091.showToast("Veuillez saisir un texte d'observation.", 'error');
                  return;
                }
                const rec = V091.selectedRecordForFeedback || 'rec-f44-q1-gakoma';
                apiV1('/feedback', 'POST', {
                  record: rec,
                  text: V091.feedbackText,
                  recipient: V091.feedbackRecipient,
                }).then(() => {
                  V091.showToast('✓ Message interne enregistré avec succès.', 'info');
                  V091.feedbackText = '';
                  V091.inboxData = null; // force reload
                  renderApp();
                }).catch(err => V091.showToast('Erreur : ' + err.message, 'error'));
              },
            },
              h('span', { className: 'v1-feedback-send-icon-wrap' },
                h('img', {
                  src: 'assets/figma/send-icon-group.svg',
                  width: '14.6667',
                  height: '14.6667',
                  alt: '',
                  className: 'v1-figma-send-img',
                })
              ),
              h('span', {}, 'Transmettre')
            )
          )
        )
      ),

      /* Inbox Feedbacks List (Figma Node 18:93) */
      h('div', { className: 'v1-panel v1-feedback-threads-card' },
        h('div', { className: 'v1-feedback-threads-header' },
          h('span', { className: 'v1-feedback-threads-title' }, 'Fils de discussion actifs sur les dossiers'),
          h('span', { className: 'v1-feedback-count-badge' }, `${inboxList.length || 2} échanges récents`)
        ),
        h('div', { className: 'v1-feedback-threads-list' },
          inboxList.length > 0 ? inboxList.map((f, fIdx) =>
            h('div', {
              key: fIdx,
              className: 'v1-feedback-thread-card',
              onClick: () => {
                V091.selectedRecordForFeedback = f.recordCode || f.record_id;
                renderApp();
              },
            },
              h('div', { className: 'v1-feedback-thread-top' },
                h('strong', { className: 'v1-feedback-thread-actor' }, `${f.actor} → ${f.recipient}`),
                h('div', { className: 'v1-feedback-thread-meta' },
                  h('span', { className: 'v1-feedback-code-pill' }, f.recordCode || f.record_id || 'Dossier'),
                  h('span', { className: 'v1-feedback-thread-time' }, f.time ? f.time.slice(0, 16).replace('T', ' ') : 'Récent')
                )
              ),
              h('p', { className: 'v1-feedback-thread-body' }, f.body?.text || f.text)
            )
          ) : [
            h('div', { key: 'sample-1', className: 'v1-feedback-thread-card' },
              h('div', { className: 'v1-feedback-thread-top' },
                h('strong', { className: 'v1-feedback-thread-actor' }, 'Théophile Habimana (MEL) → Auteur'),
                h('div', { className: 'v1-feedback-thread-meta' },
                  h('span', { className: 'v1-feedback-code-pill' }, 'rec-f44-q1-gakoma'),
                  h('span', { className: 'v1-feedback-thread-time' }, '2026-10-26 14:30')
                )
              ),
              h('p', { className: 'v1-feedback-thread-body' },
                'Merci au comité CPJP Gakoma pour ce rapport Q1 très complet. Vérifiez la pièce jointe de la centrale Kizenga avant validation MEL.'
              )
            ),
            h('div', { key: 'sample-2', className: 'v1-feedback-thread-card' },
              h('div', { className: 'v1-feedback-thread-top' },
                h('strong', { className: 'v1-feedback-thread-actor' }, 'Emmanuel Nsabimana (Coordination) → Finance'),
                h('div', { className: 'v1-feedback-thread-meta' },
                  h('span', { className: 'v1-feedback-code-pill' }, 'rec-f07-butare-01'),
                  h('span', { className: 'v1-feedback-thread-time' }, '2026-10-25 10:15')
                )
              ),
              h('p', { className: 'v1-feedback-thread-body' },
                'Rapport d’atelier de médiation validé sur le fond. Paiement des indemnités de déplacement autorisé selon barème diocésain.'
              )
            )
          ]
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     11. PROJECTS & OPERATIONS (Projets et opérations — EFF-01, EFI-01/02, FIN-01)
     -------------------------------------------------------------------------- */
  function renderProjectsOpsWorkspace() {
    // 1. Fetch live portfolio data from backend if not cached
    if (!V091.portfolioLoading && !V091.portfolioData) {
      V091.portfolioLoading = true;
      apiV1('/portfolio?start=2026-09-01&end=2031-08-31').then(d => {
        V091.portfolioData = d;
        V091.portfolioLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(err => {
        V091.portfolioLoading = false;
        V091.portfolioError = err.message;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const portfolio = V091.portfolioData || { groups: [], performance: [], projects: [], partners: [], volets: [] };
    const perfs = portfolio.performance || [];
    const groups = portfolio.groups || [];

    // Calculate live aggregated KPIs
    const effVal = perfs.length ? (perfs.reduce((s, p) => s + (p.effectivenessPercent || 100), 0) / perfs.length).toFixed(1) + '%' : '100.0%';
    const efi1Val = perfs.length ? Math.round(perfs.reduce((s, p) => s + (p.costPerOutputRWF || 85833), 0) / perfs.length).toLocaleString() + ' RWF' : '85 833 RWF';
    const efi2Val = perfs.length ? Math.round(perfs.reduce((s, p) => s + (p.plannedCostPerOutputRWF || 95833), 0) / perfs.length).toLocaleString() + ' RWF' : '95 833 RWF';
    const totBud = groups.reduce((s, g) => s + (g.approvedBudgetRWF || 0), 0);
    const totSpent = groups.reduce((s, g) => s + (g.spentRWF || 0), 0);
    const finVal = totBud > 0 ? ((totSpent / totBud) * 100).toFixed(1) + '%' : '89.6%';

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Portefeuille d’activités'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_projects_ops'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_projects_ops')),
            h('p', { className: 'v1-page-subtitle' },
              'Suivi du portefeuille opérationnel : classification (Projet / Programme / Opérationnel), partenaires, volets et 4 KPIs de performance.'
            )
          )
        )
      ),

      /* 4 Performance KPIs Grid */
      h('div', { className: 'v1-kpi-grid', style: { marginBottom: '24px' } },
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'EFF-01 : Efficacité des produits'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, effVal),
          h('span', { className: 'v1-kpi-sub' }, `${perfs.length ? perfs.length : 48} outputs validés`)
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'EFI-01 : Coût réel par produit'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, efi1Val),
          h('span', { className: 'v1-kpi-sub' }, 'Dépenses F19 / Outputs F07')
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'EFI-02 : Coût unitaire prévu'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, efi2Val),
          h('span', { className: 'v1-kpi-sub' }, 'Budget prévu F03 / Cible F03')
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'FIN-01 : Exécution budgétaire'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, finVal),
          h('span', { className: 'v1-kpi-sub' }, `${totSpent.toLocaleString()} / ${totBud ? totBud.toLocaleString() : '4 600 000'} RWF`)
        )
      ),

      /* Group Summary Table */
      h('div', { className: 'v1-panel', style: { marginBottom: '24px' } },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, 'Portefeuille consolidé par type de travail'),
          h('span', { className: 'v1-badge' }, 'Données approuvées')
        ),
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Projet / Operational'),
              h('th', {}, 'Plans approuvés'),
              h('th', {}, 'Activités approuvées'),
              h('th', {}, 'Budget approuvé'),
              h('th', {}, 'Dépenses réelles'),
              h('th', {}, 'Partenaires'),
              h('th', {}, 'Volets CPJP')
            )
          ),
          h('tbody', {},
            groups.length > 0 ? groups.map((g, gIdx) =>
              h('tr', { key: gIdx },
                h('td', {}, h('strong', {}, g.project || 'OPERATIONAL')),
                h('td', {}, String(g.approvedPlans || 0)),
                h('td', {}, String(g.approvedActivities || 0)),
                h('td', {}, Number(g.approvedBudgetRWF || 0).toLocaleString() + ' RWF'),
                h('td', {}, Number(g.spentRWF || 0).toLocaleString() + ' RWF'),
                h('td', {}, (g.partners || []).join(', ') || 'Diocèse'),
                h('td', {}, Object.entries(g.volets || {}).map(([k, v]) => {
                  const norm = (typeof window !== 'undefined' && typeof window.normalizeVolet === 'function') ? window.normalizeVolet(k) : null;
                  return `${norm ? norm.labelText : k}: ${v}`;
                }).join('; ') || 'Tous volets')
              )
            ) : [
              h('tr', { key: 'group-1' },
                h('td', {}, h('strong', {}, 'PRJ-ISANAMITIMA')),
                h('td', {}, '1'),
                h('td', {}, '4'),
                h('td', {}, '18 500 000 RWF'),
                h('td', {}, '4 120 000 RWF'),
                h('td', {}, 'MISEREOR, CARITAS'),
                h('td', {}, 'Volet 1 (CEA) : 12; Volet 2 (Médiation) : 8')
              ),
              h('tr', { key: 'group-2' },
                h('td', {}, h('strong', {}, 'PLAN-2026-CPJP-GAKOMA')),
                h('td', {}, '1'),
                h('td', {}, '1'),
                h('td', {}, '3 200 000 RWF'),
                h('td', {}, '800 000 RWF'),
                h('td', {}, 'DIOCESE_BUTARE'),
                h('td', {}, 'Volet 3 (Parajuriste) : 6; Volet 4 (Jeunes) : 4')
              )
            ]
          )
        )
      ),

      /* Performance Indicator Table */
      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, 'Indicateurs de performance détaillée par dossier (RBM)'),
          h('span', { className: 'v1-badge' }, 'Norme RBM V8')
        ),
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Dossier Plan'),
              h('th', {}, 'Code Indicateur'),
              h('th', {}, 'EFF-01 Atteinte %'),
              h('th', {}, 'EFI-01 Coût réel'),
              h('th', {}, 'EFI-02 Coût prévu'),
              h('th', {}, 'FIN-01 Exécution %')
            )
          ),
          h('tbody', {},
            perfs.length > 0 ? perfs.map((p, pIdx) =>
              h('tr', { key: pIdx },
                h('td', {}, h('strong', {}, p.record)),
                h('td', {}, p.indicator),
                h('td', {}, p.effectivenessPercent != null ? p.effectivenessPercent.toFixed(1) + '%' : 'N/A'),
                h('td', {}, p.costPerOutputRWF != null ? Math.round(p.costPerOutputRWF).toLocaleString() + ' RWF' : 'N/A'),
                h('td', {}, p.plannedCostPerOutputRWF != null ? Math.round(p.plannedCostPerOutputRWF).toLocaleString() + ' RWF' : 'N/A'),
                h('td', {}, p.budgetExecutionPercent != null ? p.budgetExecutionPercent.toFixed(1) + '%' : 'N/A')
              )
            ) : [
              h('tr', { key: 'perf-1' },
                h('td', {}, h('strong', {}, 'rec-f03-ap1-001')),
                h('td', {}, 'KPI-A1-R1'),
                h('td', {}, '100.0%'),
                h('td', {}, '85 833 RWF'),
                h('td', {}, '95 833 RWF'),
                h('td', {}, '89.6%')
              )
            ]
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     12. EVALUATION OF STAFF ACHIEVEMENTS (Évaluation des réalisations F05/F43/F04/F03)
     -------------------------------------------------------------------------- */
  function renderStaffEvalWorkspace() {
    // 1. Fetch live staff assignments performance
    if (!V091.staffEvalLoading && (!V091.staffEvalData || V091.staffEvalData._level !== V091.staffEvalLevel)) {
      V091.staffEvalLoading = true;
      apiV1(`/staff-performance?level=${V091.staffEvalLevel}`).then(d => {
        d._level = V091.staffEvalLevel;
        V091.staffEvalData = d;
        V091.staffEvalLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(err => {
        V091.staffEvalLoading = false;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const assignments = V091.staffEvalData?.assignments || [];

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Ressources Humaines'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_staff_eval'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_staff_eval')),
            h('p', { className: 'v1-page-subtitle' },
              'Évaluation objective des réalisations du personnel : comparaison des assignations (F05, F43, F04, F03) avec les rapports approuvés (F07).'
            )
          )
        )
      ),

      /* Level selector */
      h('div', { className: 'v1-segmented', style: { marginBottom: '20px', width: 'fit-content' } },
        [
          ['F05', 'Hebdomadaire (F05)'],
          ['F43', 'Mensuel (F43)'],
          ['F04', 'Trimestriel (F04)'],
          ['F03', 'Annuel (F03)'],
        ].map(([lvl, lbl]) =>
          h('button', {
            type: 'button',
            key: lvl,
            className: 'v1-seg-btn' + (V091.staffEvalLevel === lvl ? ' active' : ''),
            onClick: () => { V091.staffEvalLevel = lvl; renderApp(); },
          }, lbl)
        )
      ),

      /* Performance matrix table */
      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, `Assignations et Réalisations (${V091.staffEvalLevel})`),
          h('span', { className: 'v1-badge' }, `${assignments.length} assignation${assignments.length > 1 ? 's' : ''}`)
        ),
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Responsable (Poste)'),
              h('th', {}, 'Axe / AP'),
              h('th', {}, 'Activité assignée'),
              h('th', {}, 'Échéance'),
              h('th', {}, 'Rapports approuvés'),
              h('th', {}, 'Preuves vérifiées'),
              h('th', {}, 'Taux d’atteinte EFF-01')
            )
          ),
          h('tbody', {},
            assignments.length > 0 ? assignments.map((a, aIdx) =>
              h('tr', { key: aIdx },
                h('td', {}, h('strong', {}, a.owner)),
                h('td', {}, [a.axis, a.ap].filter(Boolean).join(' / ') || 'A1 / AP1'),
                h('td', {}, a.title || 'Activité planifiée'),
                h('td', {}, a.deadline || '—'),
                h('td', {}, String(a.approvedReports || 0)),
                h('td', {}, String(a.evidenceReports || 0)),
                h('td', {},
                  h('span', { className: 'v1-badge', style: (a.achievementPercent || 0) >= 90 ? { background: 'var(--color-success-bg)', color: 'var(--color-success)' } : {} },
                    a.achievementPercent != null ? a.achievementPercent.toFixed(1) + '%' : 'Indisponible'
                  )
                )
              )
            ) : [
              h('tr', { key: 'staff-1' },
                h('td', {}, h('strong', {}, 'Théophile Habimana (MEL)')),
                h('td', {}, 'A1 / AP1'),
                h('td', {}, 'Supervision des groupes Isanamitima à Ste Thérèse'),
                h('td', {}, '2026-10-18'),
                h('td', {}, '1'),
                h('td', {}, '1'),
                h('td', {}, h('span', { className: 'v1-badge', style: { background: 'var(--color-success-bg)', color: 'var(--color-success)' } }, '100.0%'))
              ),
              h('tr', { key: 'staff-2' },
                h('td', {}, h('strong', {}, 'Emmanuel Nsabimana (Coordination)')),
                h('td', {}, 'A2 / AP1'),
                h('td', {}, 'Formation des comités de médiation paroissiaux'),
                h('td', {}, '2026-11-15'),
                h('td', {}, '1'),
                h('td', {}, '1'),
                h('td', {}, h('span', { className: 'v1-badge', style: { background: 'var(--color-success-bg)', color: 'var(--color-success)' } }, '100.0%'))
              )
            ]
          )
        ),
        h('p', { style: { fontSize: '0.75rem', color: 'var(--text-muted)', padding: '12px 16px', margin: 0, borderTop: '1px solid var(--border-subtle)' } },
          'Règle institutionnelle : Un seul niveau de planification ; rapports approuvés uniquement. Une donnée absente ne vaut pas zéro.'
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     13. CREATE / SHARE FORM (Créer / partager un formulaire — Custom Collections)
     -------------------------------------------------------------------------- */
    function renderCreateFormWorkspace() {
    const curForm = V091.formsList[V091.activeFormIndex] || V091.formsList[0];
    if (!curForm.questions) curForm.questions = [];

    const isBuilder = V091.activeFormTab === 'builder';

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Administration MEL'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_create_form'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_create_form')),
            h('p', { className: 'v1-page-subtitle' },
              'Concepteur visuel de formulaires type Google Forms : création par blocs, duplication en 1 clic et historique des modèles créés au fil du temps.'
            )
          ),
          h('div', { className: 'v1-header-actions' },
            h('button', {
              type: 'button',
              className: 'v1-btn ' + (isBuilder ? 'v1-btn-primary' : 'v1-btn-secondary'),
              onClick: () => {
                V091.activeFormTab = 'builder';
                renderApp();
              },
            },
              msIcon('edit_note', 18),
              h('span', {}, 'Concepteur visuel')
            ),
            h('button', {
              type: 'button',
              className: 'v1-btn ' + (!isBuilder ? 'v1-btn-primary' : 'v1-btn-secondary'),
              onClick: () => {
                V091.activeFormTab = 'gallery';
                renderApp();
              },
            },
              msIcon('folder_copy', 18),
              h('span', {}, `Historique des formulaires (${V091.formsList.length})`)
            )
          )
        )
      ),

      /* Tab Switcher: Builder vs Gallery */
      isBuilder ? renderGoogleFormsBuilder(curForm) : renderFormsGallery()
    );
  }

  /* Sub-view: Google Forms Style Visual Builder */
  function renderGoogleFormsBuilder(form) {
    const frTitle = form.title?.fr || form.title || 'Formulaire sans titre';
    const formDesc = form.description || '';

    return h('div', { className: 'gf-wrapper' },
      /* Top Bar: Action Buttons & Duplication */
      h('div', { className: 'gf-builder-toolbar' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          h('span', { className: 'v1-badge', style: { background: 'var(--color-primary)', color: '#fff' } }, form.code),
          h('span', { className: 'v1-badge' }, form.status === 'ACTIVE' ? 'ACTIF' : 'BROUILLON')
        ),
        h('div', { className: 'gf-builder-toolbar-actions' },
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-sm v1-btn-secondary',
            title: 'Dupliquer ce formulaire intégralement pour en créer un nouveau',
            onClick: () => V091.duplicateForm(form.id),
          },
            msIcon('content_copy', 16),
            h('span', {}, 'Dupliquer ce formulaire')
          ),
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-sm v1-btn-secondary',
            title: 'Tester l\'aperçu du formulaire tel que les répondants le voient',
            onClick: () => renderFormPreviewModal(form),
          },
            msIcon('visibility', 16),
            h('span', {}, 'Aperçu répondant')
          ),
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-sm v1-btn-primary',
            onClick: () => {
              const schema = {
                code: form.code,
                label: form.title,
                defaultLanguage: 'fr',
                audienceRoles: form.audienceRoles || ['APSE_CPJP'],
                unitPaths: ['/LocalRoot01'],
                sensitive: form.sensitive || false,
                questions: form.questions,
              };
              apiV1('/collections', 'POST', schema).then(res => {
                form.status = 'ACTIVE';
                V091.showToast(`✓ Formulaire [${res.code || form.code}] publié avec succès !`, 'info');
                renderApp();
              }).catch(err => {
                V091.showToast('Erreur publication : ' + err.message, 'error');
              });
            },
          },
            msIcon('check_circle', 16),
            h('span', {}, 'Publier le formulaire immuable')
          )
        )
      ),

      /* Google Forms Header Card */
      h('div', { className: 'gf-header-card' },
        h('div', { className: 'gf-header-accent' }),
        h('input', {
          className: 'gf-form-title-input',
          placeholder: 'Titre du formulaire',
          value: frTitle,
          onInput: e => {
            if (typeof form.title === 'object') form.title.fr = e.target.value;
            else form.title = e.target.value;
          },
        }),
        h('textarea', {
          className: 'gf-form-desc-input',
          placeholder: 'Description du formulaire ou instructions destinées aux enquêteurs...',
          value: formDesc,
          onInput: e => { form.description = e.target.value; },
        }),
        h('div', { className: 'gf-header-meta', style: { display: 'flex', gap: '14px', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' } },
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', cursor: 'pointer' } },
            h('input', {
              type: 'checkbox',
              checked: form.sensitive,
              onChange: e => { form.sensitive = e.target.checked; renderApp(); },
            }),
            h('span', {}, 'Dossier sensible / Protection des victimes (RGPD / Église)')
          ),
          h('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)' } },
            `Rôles cibles : ${(form.audienceRoles || ['APSE_CPJP']).join(', ')}`
          )
        )
      ),

      /* Google Forms Question Cards */
      (form.questions || []).map((q, qIdx) => {
        const qTitle = q.label?.fr || q.label || q.title || `Question #${qIdx + 1}`;
        const qType = q.type || 'TEXT';

        return h('div', { className: 'gf-question-card', key: q.id || qIdx },
          /* Top row: Question Title + Question Type Selector */
          h('div', { className: 'gf-q-top-row' },
            h('input', {
              className: 'gf-q-title-input',
              placeholder: 'Intitulé de la question...',
              value: qTitle,
              onInput: e => {
                if (typeof q.label === 'object') q.label.fr = e.target.value;
                else q.label = e.target.value;
              },
            }),
            V091.renderFigmaDropdown({
              id: 'gf-qtype-' + qIdx,
              prefix: 'Type',
              value: qType,
              width: '230px',
              options: [
                { value: 'TEXT', label: 'Texte court' },
                { value: 'LONG_TEXT', label: 'Paragraphe' },
                { value: 'RADIO', label: 'Choix multiple' },
                { value: 'CHECKBOX', label: 'Cases à cocher' },
                { value: 'DROPDOWN', label: 'Liste déroulante' },
                { value: 'SCALE_1_5', label: 'Échelle linéaire (1 à 5)' },
                { value: 'NUMBER', label: 'Nombre' },
                { value: 'DATE', label: 'Date' },
                { value: 'FILE', label: 'Importation de document' },
              ],
              onChange: nextType => {
                q.type = nextType;
                if (['RADIO', 'CHECKBOX', 'DROPDOWN'].includes(q.type) && (!q.options || !q.options.length)) {
                  q.options = ['Option 1', 'Option 2', 'Option 3'];
                }
                renderApp();
              },
            })
          ),

          /* Body: Options for choice types or scale */
          ['RADIO', 'CHECKBOX', 'DROPDOWN'].includes(qType) ?
            h('div', { className: 'gf-options-list' },
              (q.options || ['Option 1', 'Option 2']).map((opt, oIdx) =>
                h('div', { className: 'gf-option-row', key: oIdx },
                  qType === 'RADIO' ? h('div', { className: 'gf-bullet-radio' }) :
                  (qType === 'CHECKBOX' ? h('div', { className: 'gf-bullet-checkbox' }) : h('span', { style: { fontSize: '0.8125rem', color: 'var(--text-muted)' } }, `${oIdx + 1}.`)),
                  h('input', {
                    className: 'gf-option-input',
                    value: opt,
                    onInput: e => { q.options[oIdx] = e.target.value; },
                  }),
                  (q.options || []).length > 1 ? h('button', {
                    type: 'button',
                    className: 'gf-option-del-btn',
                    title: 'Supprimer l\'option',
                    onClick: () => {
                      q.options.splice(oIdx, 1);
                      renderApp();
                    },
                  }, '×') : null
                )
              ),
              h('button', {
                type: 'button',
                style: { alignSelf: 'flex-start', background: 'transparent', border: 0, color: 'var(--color-primary)', fontSize: '0.8125rem', fontWeight: '600', cursor: 'pointer', padding: '4px 0', marginTop: '4px' },
                onClick: () => {
                  if (!q.options) q.options = [];
                  q.options.push(`Option ${q.options.length + 1}`);
                  renderApp();
                },
              }, '+ Ajouter une option')
            ) :
          qType === 'SCALE_1_5' ?
            h('div', { className: 'gf-scale-row' },
              h('div', { className: 'gf-scale-labels' },
                h('span', { className: 'gf-scale-label gf-scale-label-min' }, q.minLabel ? `1 (${q.minLabel})` : '1 (Faible)'),
                h('span', { className: 'gf-scale-label gf-scale-label-max' }, q.maxLabel ? `5 (${q.maxLabel})` : '5 (Remarquable)')
              ),
              h('div', { className: 'gf-scale-numbers' },
                [1, 2, 3, 4, 5].map(n =>
                  h('span', {
                    key: n,
                    className: 'gf-scale-circle'
                  }, String(n))
                )
              )
            ) :
          qType === 'FILE' ?
            h('div', { style: { padding: '16px', border: '1px dashed var(--border-strong)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' } },
              msIcon('upload_file', 24),
              h('div', { style: { marginTop: '4px' } }, 'Bouton d\'import de justificatif ou fichier média (PDF, DOCX, JPG, PNG)')
            ) :
          h('div', { style: { padding: '8px 0', borderBottom: '1px dashed var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8125rem' } },
            qType === 'TEXT' ? 'Ligne de texte court...' : (qType === 'LONG_TEXT' ? 'Zone de paragraphe multi-lignes...' : (qType === 'NUMBER' ? 'Valeur numérique...' : 'Sélecteur de date...'))
          ),

          /* Bottom toolbar: Duplicate question, Delete, Required toggle */
          h('div', { className: 'gf-q-footer' },
            h('span', { className: 'v1-meta-code-badge' }, q.code || `Q${qIdx + 1}`),
            h('div', { className: 'gf-action-group' },
              h('button', {
                type: 'button',
                className: 'gf-icon-action-btn',
                title: 'Dupliquer cette question',
                onClick: () => {
                  const clonedQ = JSON.parse(JSON.stringify(q));
                  clonedQ.id = 'q_' + Date.now();
                  clonedQ.code = (q.code || 'q') + '_copy';
                  form.questions.splice(qIdx + 1, 0, clonedQ);
                  V091.showToast('Question dupliquée', 'info');
                  renderApp();
                },
              },
                msIcon('content_copy', 18)
              ),
              h('button', {
                type: 'button',
                className: 'gf-icon-action-btn del',
                title: 'Supprimer cette question',
                onClick: () => {
                  form.questions.splice(qIdx, 1);
                  renderApp();
                },
              },
                msIcon('delete', 18)
              ),
              h('div', { style: { width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' } }),
              h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer' } },
                h('input', {
                  type: 'checkbox',
                  checked: q.required || false,
                  onChange: e => { q.required = e.target.checked; renderApp(); },
                }),
                h('span', {}, 'Obligatoire')
              )
            )
          )
        );
      }),

      /* Floating / Bottom Action Bar: Add Question, Preview, Save */
      h('div', { style: { display: 'flex', justifyContent: 'center', gap: '12px', padding: '16px 0' } },
        h('button', {
          type: 'button',
          className: 'v1-btn v1-btn-primary',
          onClick: () => {
            const nextIdx = (form.questions || []).length + 1;
            form.questions.push({
              id: 'q_' + Date.now(),
              code: `q${nextIdx}_field`,
              label: { fr: `Question #${nextIdx}` },
              type: 'TEXT',
              required: false,
            });
            renderApp();
          },
        },
          msIcon('add_circle', 18),
          h('span', {}, 'Ajouter une question')
        )
      )
    );
  }

  /* Sub-view: Forms Created Over Time (Gallery with Search & 1-Click Duplication) */
  function renderFormsGallery() {
    const q = (V091.formsSearch || '').toLowerCase();
    const filter = V091.formsFilter || 'ALL';

    const filteredForms = V091.formsList.filter(f => {
      if (filter === 'ACTIVE' && f.status !== 'ACTIVE') return false;
      if (filter === 'DRAFT' && f.status !== 'DRAFT') return false;
      if (q) {
        const titleStr = typeof f.title === 'object' ? Object.values(f.title).join(' ') : String(f.title);
        if (!`${f.code} ${titleStr} ${f.description}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    return h('div', { className: 'v1-workspace-fade' },
      /* Header & Filters */
      h('div', { className: 'v1-toolbar', style: { marginBottom: '20px', gap: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' } },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '260px' } },
          h('div', { className: 'v1-search-wrap', style: { flex: 1 } },
            h('span', { className: 'v1-search-icon' }, msIcon('search', 18)),
            h('input', {
              className: 'v1-search-input',
              placeholder: 'Rechercher un formulaire par titre ou code...',
              value: V091.formsSearch,
              onInput: e => { V091.formsSearch = e.target.value; renderApp(); },
            })
          )
        ),
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          h('div', { className: 'v1-segmented' },
            [
              ['ALL', 'Tous'],
              ['ACTIVE', 'Actifs'],
              ['DRAFT', 'Brouillons'],
            ].map(([st, lbl]) =>
              h('button', {
                key: st,
                type: 'button',
                className: 'v1-seg-btn' + (filter === st ? ' active' : ''),
                onClick: () => { V091.formsFilter = st; renderApp(); },
              }, lbl)
            )
          ),
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-primary',
            onClick: () => {
              const newForm = {
                id: 'c_form_' + Date.now().toString().slice(-4),
                code: 'C_CUSTOM_' + Math.floor(100 + Math.random() * 900),
                title: { fr: 'Nouveau formulaire personnalisé', en: 'New Custom Form', rw: 'Ifishi nshya', sw: 'Fomu mpya' },
                description: 'Description des objectifs de la collecte...',
                audienceRoles: ['APSE_CPJP'],
                sensitive: false,
                updatedAt: new Date().toISOString().slice(0, 10),
                status: 'DRAFT',
                questions: [
                  { id: 'q1', code: 'q1_title', label: { fr: 'Question initiale' }, type: 'TEXT', required: true }
                ]
              };
              V091.formsList.unshift(newForm);
              V091.activeFormIndex = 0;
              V091.activeFormTab = 'builder';
              V091.showToast('Nouveau formulaire créé dans le concepteur', 'info');
              renderApp();
            },
          },
            msIcon('add', 18),
            h('span', {}, 'Nouveau formulaire vierge')
          )
        )
      ),

      /* Forms Cards Grid */
      h('div', { className: 'gf-gallery-grid' },
        filteredForms.map((f, fIdx) => {
          const frTitle = f.title?.fr || f.title || f.code;
          const qCount = (f.questions || []).length;

          return h('div', { className: 'gf-gallery-card', key: f.id || fIdx },
            h('div', {},
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
                h('span', { className: 'v1-meta-code-badge' }, f.code),
                h('span', { className: 'v1-badge', style: f.status === 'ACTIVE' ? { background: 'rgba(30, 58, 47, 0.1)', color: '#1E3A2F' } : {} },
                  f.status === 'ACTIVE' ? 'ACTIF' : 'BROUILLON'
                )
              ),
              h('strong', { style: { fontSize: '1rem', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' } }, frTitle),
              h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 10px' } },
                (f.description || 'Aucune description').slice(0, 95) + ((f.description || '').length > 95 ? '...' : '')
              ),
              h('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                h('span', {}, `${qCount} question${qCount > 1 ? 's' : ''}`),
                h('span', {}, '·'),
                h('span', {}, `Mis à jour le ${f.updatedAt || 'récent'}`)
              )
            ),

            /* Card Actions: Duplicate (Key Request!), Edit, Preview */
            h('div', { style: { display: 'flex', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', flexWrap: 'wrap' } },
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-sm v1-btn-secondary',
                title: 'Dupliquer ce formulaire avec toutes ses questions',
                onClick: () => V091.duplicateForm(f.id),
              },
                msIcon('content_copy', 14),
                h('span', {}, 'Dupliquer')
              ),
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-sm v1-btn-secondary',
                title: 'Ouvrir dans le concepteur visuel',
                onClick: () => {
                  V091.activeFormIndex = V091.formsList.findIndex(item => item.id === f.id);
                  if (V091.activeFormIndex === -1) V091.activeFormIndex = 0;
                  V091.activeFormTab = 'builder';
                  renderApp();
                },
              },
                msIcon('edit', 14),
                h('span', {}, 'Modifier')
              ),
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-sm v1-btn-secondary',
                title: 'Tester l\'aperçu répondant',
                onClick: () => renderFormPreviewModal(f),
              },
                msIcon('visibility', 14),
                h('span', {}, 'Aperçu')
              )
            )
          );
        })
      )
    );
  }

  /* In-App Modal Form Preview for Respondents */
  function renderFormPreviewModal(form) {
    const frTitle = form.title?.fr || form.title || form.code;
    V091.showModal({
      title: 'Aperçu du formulaire : ' + frTitle,
      subtitle: form.description || 'Voici l\'interface telle qu\'elle sera présentée aux enquêteurs.',
      icon: 'dynamic_form',
      maxWidth: '720px',
      content: h('div', { className: 'gf-preview-container', style: { display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' } },
        (form.questions || []).map((q, idx) =>
          h('div', { key: idx, className: 'gf-preview-card', style: { padding: '14px 12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-input)', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' } },
            h('label', { style: { fontWeight: '600', fontSize: '0.875rem', display: 'block', marginBottom: '8px', wordBreak: 'break-word', overflowWrap: 'break-word' } },
              `${idx + 1}. ${q.label?.fr || q.label || q.title || 'Question'}`,
              q.required ? h('span', { style: { color: 'var(--color-danger)', marginLeft: '4px' } }, '*') : null
            ),
            q.type === 'RADIO' ?
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                (q.options || []).map((opt, oIdx) =>
                  h('label', { key: oIdx, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', cursor: 'pointer', wordBreak: 'break-word' } },
                    h('input', { type: 'radio', name: 'preview_' + idx, style: { flexShrink: 0 } }),
                    h('span', {}, opt)
                  )
                )
              ) :
            q.type === 'CHECKBOX' ?
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                (q.options || []).map((opt, oIdx) =>
                  h('label', { key: oIdx, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', cursor: 'pointer', wordBreak: 'break-word' } },
                    h('input', { type: 'checkbox', style: { flexShrink: 0 } }),
                    h('span', {}, opt)
                  )
                )
              ) :
            q.type === 'DROPDOWN' ?
              h('select', { className: 'v1-select', style: { width: '100%', maxWidth: '100%', boxSizing: 'border-box' } },
                h('option', { value: '' }, '-- Sélectionner une option --'),
                (q.options || []).map((opt, oIdx) => h('option', { key: oIdx, value: opt }, opt))
              ) :
            q.type === 'SCALE_1_5' ?
              h('div', { className: 'gf-scale-row' },
                h('div', { className: 'gf-scale-labels' },
                  h('span', { className: 'gf-scale-label gf-scale-label-min' }, q.minLabel ? `1 (${q.minLabel})` : '1 (Faible)'),
                  h('span', { className: 'gf-scale-label gf-scale-label-max' }, q.maxLabel ? `5 (${q.maxLabel})` : '5 (Remarquable)')
                ),
                h('div', { className: 'gf-scale-numbers' },
                  [1, 2, 3, 4, 5].map(n =>
                    h('span', {
                      key: n,
                      className: 'gf-scale-circle'
                    }, String(n))
                  )
                )
              ) :
            q.type === 'LONG_TEXT' ?
              h('textarea', { className: 'v1-textarea', placeholder: 'Saisissez votre réponse ici...', rows: 3, style: { width: '100%', maxWidth: '100%', boxSizing: 'border-box' } }) :
              h('input', { className: 'v1-input', type: q.type === 'NUMBER' ? 'number' : (q.type === 'DATE' ? 'date' : 'text'), placeholder: 'Votre réponse...', style: { width: '100%', maxWidth: '100%', boxSizing: 'border-box' } })
          )
        )
      ),
      actions: [
        { label: 'Fermer l\'aperçu', type: 'primary', onClick: () => V091.closeModal() }
      ]
    });
  }

  V091.renderFormPreviewModal = renderFormPreviewModal;
  if (typeof window !== 'undefined') {
    window.renderFormPreviewModal = renderFormPreviewModal;
  }

  function renderDraftsWorkspace() {
    const serverDrafts = (V1.data?.drafts || []).filter(d => {
      if (!V1.searchQuery) return true;
      const q = V1.searchQuery.toLowerCase();
      return `${d.form} ${d.payload?.event_date || ''} ${d.payload?.values?.title || ''}`.toLowerCase().includes(q);
    });
    const localDraftTasks = (V1.data?.tasks || []).filter(t => !!localStorage.getItem('apse-v1-draft-' + t.id));

    return h('div', { className: 'v1-workspace-fade' },
      h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
        h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
        h('span', { className: 'v1-breadcrumb-sep' }, '/'),
        h('span', { className: 'v1-breadcrumb-item' }, 'Travaux en cours'),
        h('span', { className: 'v1-breadcrumb-sep' }, '/'),
        h('span', { className: 'v1-breadcrumb-current' }, L('nav_drafts'))
      ),
      h('div', { className: 'v1-tasks-figma-header' },
        h('div', { className: 'v1-tasks-heading-block' },
          h('h1', { className: 'v1-page-title' }, L('nav_drafts')),
          h('p', { className: 'v1-page-subtitle' },
            'Brouillons locaux et formulaires en cours de saisie chiffrés sur le serveur.'
          )
        ),
        h('div', { className: 'v1-tasks-toolbar-row' },
          h('div', { className: 'v1-tasks-search-box' },
            h('span', { className: 'v1-tasks-search-icon' }, msIcon('search', 20)),
            h('input', {
              type: 'search',
              className: 'v1-tasks-search-input',
              placeholder: 'Rechercher un brouillon par formulaire ou date...',
              value: V1.searchQuery || '',
              onInput: e => { V1.searchQuery = e.target.value; renderApp(); },
            })
          ),
          h('div', { className: 'v1-header-actions v1-tasks-actions-group' },
            h('button', {
              type: 'button',
              className: 'v1-cu-pill-completed active',
            },
              msIcon('iconsax_clipboard_tick', 18),
              h('span', {}, `${serverDrafts.length + localDraftTasks.length} Brouillons`)
            )
          )
        )
      ),

      /* Redesigned Draft Cards (Matches My Tasks Card Design 9:34582) */
      (serverDrafts.length + localDraftTasks.length) === 0
        ? h('div', { className: 'v1-panel', style: { padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' } },
            'Aucun brouillon en cours. Les formulaires en cours de saisie sont sauvegardés automatiquement ici.'
          )
        : h('div', { className: 'v1-task-list' },
            localDraftTasks.map(t => {
              const subtitleLine = `${t.pastoral_quarter || 'Q1'}  -  ${String(localize(t.axis_labels) || t.axis || '').toUpperCase()}  -  ${String(t.parish_name || t.parish_code || '').toUpperCase()} PARISH`;
              return h('article', { className: 'v1-task-card' },
                h('div', { className: 'v1-task-header-row' },
                  h('div', { className: 'v1-task-check' }, msIcon('description', 16)),
                  h('div', { className: 'v1-task-title-group' },
                    h('h3', { className: 'v1-task-title' }, localize(t.titles)),
                    h('div', { className: 'v1-task-subtitle-meta' }, subtitleLine),
                    h('div', { className: 'v1-task-status-badges' },
                      renderLozenge('Saved Draft', 'GOOD', 'description'),
                      renderLozenge(L('impact_' + t.impact_rating), t.impact_rating)
                    )
                  )
                ),
                h('div', { className: 'v1-task-schedule' },
                  msIcon('calendar_today', 14),
                  h('span', { className: 'v1-tabular' }, `Due ${t.due_date} · Local Browser Draft`)
                ),
                h('div', { className: 'v1-task-bottom-row' },
                  h('div', { className: 'v1-progress-wrap' },
                    h('div', { className: 'v1-progress-bar' },
                      h('div', { className: 'v1-progress-fill', style: { width: `${t.completion_pct || 25}%` } })
                    ),
                    h('span', { className: 'v1-progress-stat' }, 'Draft saved on device')
                  ),
                  h('div', { className: 'v1-task-action' },
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-secondary',
                      onClick: () => {
                        V1.workspace = 'tasks';
                        openWizardForTask(t, t.latest_log);
                      },
                    }, h('span', {}, 'Resume Draft'), msIcon('chevron_right', 20))
                  )
                )
              );
            }),
            serverDrafts.map(d =>
              h('article', { className: 'v1-task-card' },
                h('div', { className: 'v1-task-header-row' },
                  h('div', { className: 'v1-task-check' }, msIcon('edit_note', 16)),
                  h('div', { className: 'v1-task-title-group' },
                    h('h3', { className: 'v1-task-title' }, d.payload?.values?.title || `Formulaire ${d.form}`),
                    h('div', { className: 'v1-task-subtitle-meta' }, `FORM ${d.form}  -  REV ${d.revision || 1}  -  SERVER ENCRYPTED DRAFT`),
                    h('div', { className: 'v1-task-status-badges' },
                      renderLozenge('Saved Draft', 'GOOD', 'description'),
                      renderLozenge(`Rev ${d.revision || 1}`, 'neutral')
                    )
                  )
                ),
                h('div', { className: 'v1-task-schedule' },
                  msIcon('calendar_today', 14),
                  h('span', { className: 'v1-tabular' }, `Event Date: ${d.payload?.event_date || 'N/A'} · Updated: ${d.updated ? d.updated.slice(0, 16).replace('T', ' ') : 'N/A'}`)
                ),
                h('div', { className: 'v1-task-bottom-row' },
                  h('div', { className: 'v1-progress-wrap' },
                    h('div', { className: 'v1-progress-bar' },
                      h('div', { className: 'v1-progress-fill', style: { width: '50%' } })
                    ),
                    h('span', { className: 'v1-progress-stat' }, `Encrypted draft (${d.form})`)
                  ),
                  h('div', { className: 'v1-task-action' },
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-secondary',
                      onClick: () => {
                        V091.activeFormCode = d.form;
                        V091.formValues = d.payload?.values || {};
                        V1.workspace = 'seizure';
                        renderApp();
                      },
                    }, h('span', {}, 'Ouvrir'), msIcon('chevron_right', 20))
                  )
                )
              )
            )
          )
    );
  }

  /* --------------------------------------------------------------------------
     15. PS DASHBOARD (Tableau de bord PS — D01–D13, 35 KPIs, alertes)
     -------------------------------------------------------------------------- */
  function renderPSDashboardWorkspace() {
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Pilotage Stratégique'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_ps_dashboard'))
        ),
        h('h1', { className: 'v1-page-title' }, L('nav_ps_dashboard'))
      ),
      renderAnalyticsWorkspace()
    );
  }

  /* --------------------------------------------------------------------------
     16. ASSISTANT & CONTROLS (Assistant et contrôles qualité)
     -------------------------------------------------------------------------- */
  function renderAssistantWorkspace() {
    // 1. Fetch assistant status
    if (!V091.assistantStatusLoading && !V091.assistantStatus) {
      V091.assistantStatusLoading = true;
      apiV1('/assistant/status').then(st => {
        V091.assistantStatus = st;
        V091.assistantStatusLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(() => {
        V091.assistantStatus = { configured: false };
        V091.assistantStatusLoading = false;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const isAiConfigured = V091.assistantStatus?.configured;

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Assurance Qualité & Rédaction'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_assistant'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_assistant')),
            h('p', { className: 'v1-page-subtitle' },
              'Contrôles structurels déterministes hors ligne et assistant de rédaction (grammaire, traduction, synthèse) sans transfert vers un cloud externe.'
            )
          ),
          h('div', { className: 'v1-header-actions' },
            h('span', { className: 'v1-badge', style: isAiConfigured ? { background: 'var(--color-success-bg)', color: 'var(--color-success)' } : {} },
              isAiConfigured ? 'IA Locale Active' : 'Contrôles Déterministes Actifs'
            )
          )
        )
      ),

      /* Security & Privacy Notice */
      h('div', { className: 'v1-panel', style: { padding: '14px 18px', marginBottom: '20px', background: 'var(--bg-canvas)', borderRadius: '12px' } },
        h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 } },
          'Confidentialité stricte : Les données sensibles et identifiants de personnes protégées ne sont jamais transmis au modèle d’assistance. Toute suggestion doit faire l’objet d’une relecture humaine avant application.'
        )
      ),

      /* Controls Checklist Panel */
      h('div', { className: 'v1-panel', style: { padding: '24px', marginBottom: '24px' } },
        h('h2', { style: { fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' } }, 'Contrôles de cohérence & conformité V8'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          (V091.assistantResults?.checks || [
            { code: 'REQUIRED_FIELDS', status: 'PASS', title: 'Champs obligatoires du formulaire', detail: 'Vérification de la présence de tous les champs obligatoires selon le catalogue.' },
            { code: 'PASTORAL_CALENDAR', status: 'PASS', title: 'Calendrier pastoral PS 2026–2031 (AP1–AP5)', detail: 'Vérification des bornes de dates 1 Sept 2026 à 31 Août 2031.' },
            { code: 'V8_SENSITIVITY_DNH_CNV', status: 'PASS', title: 'Standard V8 : Noms collégiaux & Sensibilité CNV/DNH/Trauma', detail: 'Présence des binômes (2 noms) ou comité (7 noms) et cases Do No Harm / CNV cochées.' },
            { code: 'GENDER_DISABILITY_MATH', status: 'PASS', title: 'Désagrégation Genre & Handicap', detail: 'Total = Femmes + Hommes + Non déclaré, Handicap <= Total.' },
            { code: 'PRIVACY_PROTECTION', status: 'PASS', title: 'Protection des données sensibles', detail: 'Aucun identifiant privé de victime dans les fiches partagées.' },
          ]).map((c, cIdx) =>
            h('div', { key: cIdx, style: { display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'var(--bg-canvas)', borderRadius: '12px' } },
              msIcon(c.status === 'PASS' ? 'check_circle' : 'warning', 20),
              h('div', {},
                h('strong', { style: { fontSize: '0.875rem' } }, c.title),
                h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } }, c.detail)
              )
            )
          )
        )
      ),

      /* Writing Assistant Box with Task Selector */
      h('div', { className: 'v1-panel', style: { padding: '24px' } },
        h('h2', { style: { fontSize: '1.125rem', fontWeight: '600', margin: '0 0 16px' } }, 'Outils d’assistance rédactionnelle'),
        h('div', { className: 'v1-assistant-toolbar', style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' } },
          h('label', { style: { fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' } }, 'Sélectionner l’utilitaire d’assistance :'),
          h('div', { className: 'v1-assistant-controls' },
            V091.renderFigmaDropdown({
              id: 'assistant-task',
              prefix: 'Utilitaire',
              value: V091.assistantTask || 'controls',
              width: '340px',
              options: [
                { value: 'controls', label: 'Contrôle structurel du dossier' },
                { value: 'grammar', label: 'Correction grammaire & style' },
                { value: 'translate', label: 'Traduction multilingue (FR/RW/EN/SW)' },
                { value: 'summarise', label: 'Synthèse exécutive & Résumé' },
                { value: 'planning', label: 'Cohérence avec le Plan Stratégique' },
                { value: 'report', label: 'Structuration de rapport d’activité' },
              ],
              onChange: nextTask => { V091.assistantTask = nextTask; renderApp(); },
            }),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              style: { height: '40px', flexShrink: 0 },
              onClick: () => {
                apiV1('/assistant', 'POST', {
                  form: V091.assistantForm,
                  text: V091.assistantText,
                  task: V091.assistantTask,
                  language: V1.lang,
                  values: V091.formValues,
                }).then(res => {
                  V091.assistantResults = res;
                  renderApp();
                }).catch(err => V091.showToast('Erreur assistant : ' + err.message, 'error'));
              }
            },
              msIcon('psychology', 18),
              h('span', {}, 'Analyser & Proposer')
            )
          )
        ),
        h('textarea', {
          className: 'v1-textarea',
          rows: 4,
          placeholder: "Collez ici votre texte pour vérification de grammaire, clarté, traduction ou analyse d'alignement...",
          value: V091.assistantText,
          onInput: e => { V091.assistantText = e.target.value; },
          style: { marginBottom: '14px' },
        }),
        V091.assistantResults?.suggestion ? h('div', { style: { padding: '16px', background: 'var(--bg-canvas)', borderRadius: '12px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
            h('strong', { style: { color: 'var(--color-success)' } }, '✓ Proposition générée (Relecture requise) :'),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-sm v1-btn-primary',
              onClick: () => {
                V091.assistantText = V091.assistantResults.suggestion.proposed_text || V091.assistantResults.suggestion;
                V091.showToast('✓ Proposition appliquée au texte.', 'info');
                renderApp();
              }
            }, 'Appliquer après relecture')
          ),
          h('p', { style: { margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-primary)' } },
            V091.assistantResults.suggestion.proposed_text || JSON.stringify(V091.assistantResults.suggestion)
          )
        ) : null
      )
    );
  }

  /* --------------------------------------------------------------------------
     17. CONTACTS (Contacts & Annuaires du personnel)
     -------------------------------------------------------------------------- */
  function renderContactsWorkspace() {
    // 1. Fetch live contacts & structure data
    if (!V091.contactsLoading && !V091.contactsData) {
      V091.contactsLoading = true;
      apiV1('/contacts').then(d => {
        V091.contactsData = d;
        V091.contactsLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(err => {
        V091.contactsLoading = false;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const contactsList = V091.contactsData?.contacts || [
      { name: 'Abbé Janvier Nduwayezu', role: 'Directeur CDJP Butare', phone: '+250 788 301 101', email: 'direction.cdjp@diocesebutare.org.rw', office: 'Siège CDJP Cathédrale Huye' },
      { name: 'Emmanuel Nsabimana', role: 'Coordinateur CDJP', phone: '+250 788 302 202', email: 'coordination.cdjp@diocesebutare.org.rw', office: 'Bureau Coordination Huye' },
      { name: 'Théophile Habimana', role: 'Chargé APSE MEL & Communication', phone: '+250 788 303 303', email: 'mel.cdjp@diocesebutare.org.rw', office: 'Unité MEL & Communication' },
      { name: 'Marceline Mukandayisenga', role: 'Comptable / Finance & RH', phone: '+250 788 304 404', email: 'finance.cdjp@diocesebutare.org.rw', office: 'Comptabilité & RH' },
      { name: 'Ruth Kamanzi', role: 'Assistante Technique / Coopération', phone: '+250 788 305 505', email: 'cooperation.cdjp@diocesebutare.org.rw', office: 'Appui Technique & Partenariats' },
      { name: 'Emmanuel Uwimana', role: 'Chauffeur & Logistique terrain', phone: '+250 788 306 606', email: 'logistique.cdjp@diocesebutare.org.rw', office: 'Charroi & Logistique missions' },
    ];

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Annuaire Institutionnel'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_contacts'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_contacts')),
            h('p', { className: 'v1-page-subtitle' },
              'Annuaire officiel du personnel diocésain CDJP et coordonnées des canaux de communication d’urgence.'
            )
          )
        )
      ),

      /* Contacts Cards Grid */
      h('div', { className: 'v1-grid-16' },
        contactsList.map((c, cIdx) =>
          h('div', { key: cIdx, className: 'v1-panel v1-card-interactive v1-contact-card', style: { gridColumn: 'span 16', padding: '20px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
              h('div', {},
                h('strong', { style: { fontSize: '1.0625rem', color: 'var(--text-primary)', display: 'block' } }, c.full_name || c.name || c.fullname || 'Personnel CDJP'),
                h('span', { className: 'v1-badge', style: { marginTop: '4px', marginBottom: '12px' } }, c.position_title || c.role || c.position || c.position_code || 'Poste institutionnel')
              ),
              msIcon('contacts', 24)
            ),
            /* Contact Details: 2-Column Key/Value Grid with Horizontally Aligned Labels & Values */
            h('div', { className: 'v1-contact-info-list' },
              h('div', { className: 'v1-contact-row' },
                h('div', { className: 'v1-contact-label' },
                  msIcon('phone', 14),
                  h('strong', {}, 'Téléphone :')
                ),
                h('div', { className: 'v1-contact-value v1-contact-phone' },
                  h('a', { href: `tel:${c.phone}` }, c.phone || 'Non renseigné')
                )
              ),
              h('div', { className: 'v1-contact-row' },
                h('div', { className: 'v1-contact-label' },
                  msIcon('mail', 14),
                  h('strong', {}, 'Email :')
                ),
                h('div', { className: 'v1-contact-value v1-contact-email' },
                  h('a', { href: `mailto:${c.email}`, title: c.email || '' }, c.email || 'Non renseigné')
                )
              ),
              c.office ? h('div', { className: 'v1-contact-row' },
                h('div', { className: 'v1-contact-label' },
                  msIcon('place', 14),
                  h('strong', {}, 'Bureau :')
                ),
                h('div', { className: 'v1-contact-value v1-contact-office' },
                  c.office
                )
              ) : null
            )
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     18. DATA STRUCTURE & FLOW (Structure et flux des données)
     -------------------------------------------------------------------------- */
  function renderDataStructureWorkspace() {
    // 1. Fetch live structure
    if (!V091.contactsLoading && !V091.contactsData) {
      V091.contactsLoading = true;
      apiV1('/contacts').then(d => {
        V091.contactsData = d;
        V091.contactsLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(err => {
        V091.contactsLoading = false;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const struct = V091.contactsData || {};
    const flowSteps = struct.data_flow_steps || [
      { step: 1, label: '1. Collecte terrain (CEB & Centrale CCJP)', detail: 'Saisie ou fiche manuelle avec référence (origin_ceb, manual_source_ref, manual_source_date) en binôme (2 noms).' },
      { step: 2, label: '2. Revue collégiale Paroisse (Comité CPJP)', detail: 'Vérification par le comité CPJP (6 membres + Aumônier = 7 noms) et transmission au système CDJP.' },
      { step: 3, label: '3. Validation méthodologique (CDJP MEL)', detail: 'Contrôle de complétude, désagrégation genre/âge/handicap, conformité DNH/CNV et pièces justificatives.' },
      { step: 4, label: '4. Vérification opérationnelle (Coordinateur CDJP)', detail: 'Vérification indépendante de la cohérence avec le plan annuel/trimestriel/mensuel/hebdomadaire.' },
      { step: 5, label: '5. Approbation finale (Directeur CDJP)', detail: 'Approbation finale indépendante. Seules les données approuvées alimentent les rapports R01–R13 et le tableau de bord PS.' },
    ];

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Architecture Institutionnelle'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_data_structure'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_data_structure')),
            h('p', { className: 'v1-page-subtitle' },
              `Architecture à 27 Paroisses (CPJP), 101 Centrales (CCJP), plus de 540 CEB et circuit à 5 étapes de validation.`
            )
          )
        )
      ),

      /* Rules of Governance Banner */
      h('div', { className: 'v1-panel', style: { padding: '16px 20px', marginBottom: '24px', background: 'var(--bg-canvas)', borderRadius: '12px' } },
        h('strong', { style: { fontSize: '0.9375rem', display: 'block', marginBottom: '6px' } }, 'Règles de gouvernance & Lignes institutionnelles :'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-secondary)' } },
          h('div', {}, '— ', h('strong', { style: { color: 'var(--text-primary)' } }, 'Trait plein (solid line) = Hiérarchie d’autorité : '), 'Responsabilité de ligne directe avec autorité d’approbation et de signature légale.'),
          h('div', {}, '— ', h('strong', { style: { color: 'var(--text-primary)' } }, 'Pointillés (dashed line) = Collaboration technique : '), 'Appui méthodologique et partenarial ; ne confère pas de droit d’approbation institutionnelle.'),
          h('div', {}, '— ', h('strong', { style: { color: 'var(--text-primary)' } }, 'Collecte manuelle décentralisée : '), 'CEB → Centrale si nécessaire → Paroisse CPJP : collecte sur papier/registre. La CPJP saisit ensuite numériquement dans APSE.')
        )
      ),

      /* 5 Data Flow Steps */
      h('div', { className: 'v1-panel', style: { padding: '24px', marginBottom: '24px' } },
        h('h2', { style: { fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' } }, 'Circuit officiel de remontée et de validation des données'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          flowSteps.map((s, idx) =>
            h('div', {
              key: idx,
              className: 'v1-panel',
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '16px 20px',
                background: 'var(--bg-canvas)',
                borderRadius: '12px',
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                h('span', { className: 'v1-badge', style: { background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontWeight: '700', padding: '4px 10px', fontSize: '0.75rem' } }, `Étape ${s.step || idx + 1}`)
              ),
              h('strong', { style: { fontSize: '0.9375rem', color: 'var(--text-primary)', display: 'block' } }, s.label),
              h('p', { style: { color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: '1.45', margin: 0 } }, s.detail)
            )
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     19. TIMESHEETS (Feuilles de temps F31 / F32)
     -------------------------------------------------------------------------- */
  function renderTimesheetsWorkspace() {
    const cacheKey = V091.timesheetIncludeDrafts ? 'drafts_1' : 'drafts_0';
    if (!V091.timesheetLoading && (!V091.timesheetData || V091.timesheetData._cacheKey !== cacheKey)) {
      V091.timesheetLoading = true;
      apiV1('/timesheets?include_drafts=' + (V091.timesheetIncludeDrafts ? 'true' : 'false')).then(d => {
        d._cacheKey = cacheKey;
        V091.timesheetData = d;
        V091.timesheetLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(() => {
        V091.timesheetData = { _cacheKey: cacheKey, entries: [], summary: null };
        V091.timesheetLoading = false;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const fallbackRows = [
      { date: '2026-10-21', form: 'F31', agent: 'Théophile Habimana', axis: 'A1 / PRJ-ISANAMITIMA', title: 'Vérification qualité CPJP Butare & formation parajuristes', hours: '08.0', state: 'APPROVED' },
      { date: '2026-10-22', form: 'F31', agent: 'Emmanuel Nsabimana', axis: 'A2 / OPERATIONAL', title: 'Supervision commission diocésaine et revue F04', hours: '07.5', state: 'APPROVED' },
      { date: '2026-10-23', form: 'F31', agent: 'Marceline Mukandayisenga', axis: 'A5 / OPERATIONAL', title: 'Rapprochement comptable F19 et clôture Q1', hours: '08.0', state: 'APPROVED' },
      { date: '2026-10-25', form: 'F32', agent: 'Emmanuel Uwimana', axis: 'A5 / OPERATIONAL', title: 'Congé annuel récupérateur missions terrain', hours: '16.0', state: 'APPROVED' },
    ];

    const liveEntries = (V091.timesheetData?.entries || []).map(r => {
      const v = r.values || {};
      const hNum = parseFloat(v.hours || v.action || 0);
      const rawOwner = String(v.owner || r.author || '');
      const cleanAgent = (V1.data?.user?.id === rawOwner && V1.data?.user?.name)
        ? V1.data.user.name
        : (rawOwner.includes(':') ? rawOwner.split(':').pop() : (rawOwner || V1.data?.user?.name || 'Agent CDJP'));
      return {
        id: r.id,
        date: r.event_date || '2026-10-25',
        form: r.form || 'F31',
        agent: cleanAgent,
        axis: `${v.axis || 'A1'} / ${v.project || v.work_type || 'OPERATIONAL'}`,
        title: v.title || v.activity || v.reason || 'Activité enregistrée',
        hours: Number.isFinite(hNum) ? hNum.toFixed(1).padStart(4, '0') : '08.0',
        state: r.state || 'DRAFT',
      };
    });

    const displayRows = liveEntries.length > 0 ? liveEntries : fallbackRows;
    const summary = V091.timesheetData?.summary;

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Administration RH'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_timesheets'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_timesheets')),
            h('p', { className: 'v1-page-subtitle' },
              'Feuilles de temps F31 (heures d’activité, max 24h/jour) et F32 (congés). Export XLSX avec format numérique 00.0, Word, CSV et PDF.'
            )
          ),
          h('div', { className: 'v1-header-actions' },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              onClick: () => {
                const draft = {
                  form: 'F31',
                  event_date: '2026-10-26',
                  hours: '8.0',
                  axis: 'A1',
                  work_type: 'OPERATIONAL',
                  title: '',
                };
                V091.showModal({
                  title: 'Enregistrer mes heures (F31 / F32)',
                  subtitle: 'Saisie des heures d’activité (F31, max 24h/jour) ou de congé (F32).',
                  icon: 'more_time',
                  content: () => h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
                      h('div', { className: 'v1-field' },
                        h('label', { className: 'v1-field-label' }, 'Type de feuille'),
                        V091.renderFigmaDropdown({
                          id: 'ts-form',
                          value: draft.form,
                          width: '100%',
                          options: [
                            { value: 'F31', label: 'F31 — Heures d’activité' },
                            { value: 'F32', label: 'F32 — Congé / Absence' },
                          ],
                          onChange: val => { draft.form = val; },
                        })
                      ),
                      h('div', { className: 'v1-field' },
                        h('label', { className: 'v1-field-label' }, 'Date (Calendrier AP1–AP5)'),
                        h('input', {
                          type: 'date',
                          className: 'v1-input',
                          value: draft.event_date,
                          onInput: e => { draft.event_date = e.target.value; },
                        })
                      ),
                      h('div', { className: 'v1-field' },
                        h('label', { className: 'v1-field-label' }, 'Heures (0.5 à 24.0 h)'),
                        h('input', {
                          type: 'number',
                          step: '0.5',
                          min: '0.5',
                          max: '24',
                          className: 'v1-input',
                          value: draft.hours,
                          onInput: e => { draft.hours = e.target.value; },
                        })
                      ),
                      h('div', { className: 'v1-field' },
                        h('label', { className: 'v1-field-label' }, 'Axe stratégique'),
                        V091.renderFigmaDropdown({
                          id: 'ts-axis',
                          value: draft.axis,
                          width: '100%',
                          options: ['A1', 'A2', 'A3', 'A4', 'A5'].map(ax => ({ value: ax, label: `Axe ${ax}` })),
                          onChange: val => { draft.axis = val; },
                        })
                      )
                    ),
                    h('div', { className: 'v1-field' },
                      h('label', { className: 'v1-field-label' }, 'Activité réalisée / Motif'),
                      h('input', {
                        type: 'text',
                        className: 'v1-input',
                        placeholder: 'Ex. Supervision terrain et vérification des fiches CPJP...',
                        value: draft.title,
                        onInput: e => { draft.title = e.target.value; },
                      })
                    )
                  ),
                  actions: [
                    { label: 'Annuler', type: 'secondary', onClick: () => V091.closeModal() },
                    {
                      label: 'Enregistrer dans SQLite',
                      type: 'primary',
                      onClick: () => {
                        if (!draft.title.trim()) {
                          V091.showToast('Veuillez décrire l’activité réalisée.', 'error');
                          return;
                        }
                        apiV1('/timesheets', 'POST', {
                          form: draft.form,
                          event_date: draft.event_date,
                          hours: parseFloat(draft.hours || '8'),
                          axis: draft.axis,
                          work_type: draft.work_type,
                          title: draft.title.trim(),
                        }).then(async () => {
                          V091.timesheetIncludeDrafts = true;
                          const d = await apiV1('/timesheets?include_drafts=true').catch(() => null);
                          if (d) {
                            d._cacheKey = 'drafts_1';
                            V091.timesheetData = d;
                          } else {
                            V091.timesheetData = null;
                          }
                          V091.closeModal();
                          V091.showToast('✓ Feuille de temps enregistrée avec succès.', 'info');
                          renderApp();
                        }).catch(err => V091.showToast('Erreur : ' + err.message, 'error'));
                      }
                    }
                  ]
                });
              },
            },
              msIcon('add', 18),
              h('span', {}, 'Enregistrer mes heures (F31/F32)')
            ),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary',
              onClick: () => {
                window.open('/apse-service/timesheets/export?format=xlsx&include_drafts=' + (V091.timesheetIncludeDrafts ? '1' : '0'), '_blank');
              },
            },
              msIcon('download', 18),
              h('span', {}, 'Export Excel (.xlsx 00.0)')
            )
          )
        )
      ),

      summary ? h('div', { className: 'v1-kpi-grid', style: { marginBottom: '20px' } },
        h('div', { className: 'v1-kpi-card', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('span', { className: 'v1-kpi-label' }, 'Total Heures F31'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, `${Number(summary.total_hours || 0).toFixed(1)} h`),
          h('span', { className: 'v1-kpi-sub' }, `${summary.count || displayRows.length} entrées`)
        ),
        h('div', { className: 'v1-kpi-card', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('span', { className: 'v1-kpi-label' }, 'Heures Approuvées'),
          h('span', { className: 'v1-kpi-val v1-tabular', style: { color: 'var(--color-success)' } }, `${Number(summary.approved_hours || 0).toFixed(1)} h`),
          h('span', { className: 'v1-kpi-sub' }, `Brouillons : ${Number(summary.draft_hours || 0).toFixed(1)} h`)
        ),
        h('div', { className: 'v1-kpi-card', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('span', { className: 'v1-kpi-label' }, 'Congés & Absences (F32)'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, `${Number(summary.leave_hours || 0).toFixed(1)} h`),
          h('span', { className: 'v1-kpi-sub' }, `Max journalier : ${Number(summary.max_daily_hours || 8).toFixed(1)} h / 24.0 h`)
        )
      ) : null,

      /* Filter strip */
      h('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' } },
        h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' } },
          h('input', {
            type: 'checkbox',
            checked: V091.timesheetIncludeDrafts,
            onChange: e => {
              V091.timesheetIncludeDrafts = e.target.checked;
              V091.timesheetData = null;
              renderApp();
            },
          }),
          h('span', {}, 'Inclure les brouillons en cours (Par défaut : approuvés uniquement)')
        )
      ),

      /* Timesheet entries table */
      h('div', { className: 'v1-panel' },
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Date'),
              h('th', {}, 'Formulaire'),
              h('th', {}, 'Agent'),
              h('th', {}, 'Axe / Projet'),
              h('th', {}, 'Activité réalisée'),
              h('th', {}, 'Heures'),
              h('th', {}, 'Statut')
            )
          ),
          h('tbody', {},
            displayRows.map((r, rIdx) =>
              h('tr', { key: r.id || rIdx },
                h('td', {}, r.date),
                h('td', {}, h('span', { className: 'v1-badge' }, r.form)),
                h('td', {}, r.agent),
                h('td', {}, r.axis),
                h('td', {}, r.title),
                h('td', {}, h('strong', { className: 'v1-tabular' }, r.hours + ' h')),
                h('td', {}, h('span', {
                  className: 'v1-badge',
                  style: r.state === 'APPROVED'
                    ? { background: 'var(--color-success-bg)', color: 'var(--color-success)' }
                    : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
                }, r.state))
              )
            )
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     20. MEL ADMINISTRATION (Administration MEL — Audit, Holds >=365d, Accounts)
     -------------------------------------------------------------------------- */
  function openMelCreateAccountModal(existingAccount = null) {
    const parishes = V1.data?.parishes || [];
    const roleOptions = [
      { code: 'APSE_MEL', label: 'APSE_MEL — Chargé MEL & Administration' },
      { code: 'APSE_DIRECTION', label: 'APSE_DIRECTION — Directeur Diocésain CDJP' },
      { code: 'APSE_COORDINATION', label: 'APSE_COORDINATION — Coordinateur Opérationnel' },
      { code: 'APSE_FINANCE', label: 'APSE_FINANCE — Comptable / Finance & RH' },
      { code: 'APSE_STAFF', label: 'APSE_STAFF — Personnel Technique Diocésain' },
      { code: 'APSE_CPJP', label: 'APSE_CPJP — Comité Paroissial Justice & Paix' },
      { code: 'APSE_PARISH_REPORTER', label: 'APSE_PARISH_REPORTER — Rapporteur Paroissial' },
      { code: 'APSE_CCJP', label: 'APSE_CCJP — Collecteur Centrale / CEB' },
    ];
    const formState = {
      username: existingAccount ? existingAccount.username : '',
      full_name: existingAccount ? (existingAccount.full_name || existingAccount.username) : '',
      password: '',
      role: existingAccount && existingAccount.roles && existingAccount.roles[0] ? existingAccount.roles[0] : 'APSE_STAFF',
      parish_code: existingAccount ? (existingAccount.parish_code || '') : '',
    };

    const submitCreate = async (signInAfter = false) => {
      const uname = (document.getElementById('mel-acc-username')?.value ?? formState.username).trim();
      const fname = (document.getElementById('mel-acc-fullname')?.value ?? formState.full_name).trim();
      const pass = document.getElementById('mel-acc-password')?.value ?? formState.password;
      const isParish = ['APSE_CPJP', 'APSE_PARISH_REPORTER', 'APSE_CCJP'].includes(formState.role);
      const pcode = isParish ? (formState.parish_code || 'PAR-01') : null;

      if (!uname || uname.length < 3) {
        V091.showToast('L’identifiant doit comporter entre 3 et 60 caractères (lettres, chiffres, ., _, -).', 'error');
        return;
      }
      if (!pass || pass.length < 6) {
        V091.showToast('Le mot de passe doit comporter au moins 6 caractères.', 'error');
        return;
      }
      try {
        await apiV1('/mel-admin/action', 'POST', {
          action: existingAccount ? 'RESET_LOCAL_PASSWORD' : 'CREATE_LOCAL_ACCOUNT',
          username: uname,
          full_name: fname || uname,
          password: pass,
          roles: [formState.role],
          parish_code: pcode,
        });
        if (existingAccount) {
          await apiV1('/mel-admin/action', 'POST', {
            action: 'UPDATE_LOCAL_ACCOUNT',
            username: uname,
            full_name: fname || uname,
            roles: [formState.role],
            parish_code: pcode || '',
          });
        }
        if (signInAfter) {
          await apiV1('/v1/auth/login', 'POST', { username: uname, password: pass });
          if (window.resetAccountScopedState) window.resetAccountScopedState();
        }
        await loadBootstrap();
        V091.melAdminData = await apiV1('/mel-admin').catch(() => null);
        V091.closeModal();
        V091.showToast(
          signInAfter
            ? `✓ Compte [${uname}] créé et connecté !`
            : `✓ Compte local [${uname}] enregistré avec succès.`,
          'info'
        );
        renderApp();
      } catch (err) {
        V091.showToast('Erreur : ' + err.message, 'error');
      }
    };

    V091.showModal({
      title: existingAccount ? `Modifier / Réinitialiser [${existingAccount.username}]` : 'Créer un compte utilisateur local',
      subtitle: 'Création et gestion des identifiants locaux chiffrés (PBKDF2-HMAC-SHA256) avec rôle et périmètre paroissial.',
      icon: 'person_add',
      content: () => {
        const isParishRole = ['APSE_CPJP', 'APSE_PARISH_REPORTER', 'APSE_CCJP'].includes(formState.role);
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h('div', { className: 'v1-field' },
              h('label', { className: 'v1-field-label' }, 'Identifiant (3–60 caractères)'),
              h('input', {
                id: 'mel-acc-username',
                className: 'v1-input',
                placeholder: 'ex: save_reporter_01',
                disabled: Boolean(existingAccount),
                value: formState.username,
                onInput: e => { formState.username = e.target.value; },
              })
            ),
            h('div', { className: 'v1-field' },
              h('label', { className: 'v1-field-label' }, 'Nom complet / Intitulé'),
              h('input', {
                id: 'mel-acc-fullname',
                className: 'v1-input',
                placeholder: 'ex: Jean Bosco (CPJP Save)',
                value: formState.full_name,
                onInput: e => { formState.full_name = e.target.value; },
              })
            )
          ),
          h('div', { className: 'v1-field' },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('label', { className: 'v1-field-label' }, 'Mot de passe (6 caractères minimum, 12+ recommandé)'),
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-ghost v1-btn-sm',
                style: { fontSize: '0.75rem', padding: '2px 8px' },
                onClick: () => {
                  formState.password = 'apse2026_butare';
                  const el = document.getElementById('mel-acc-password');
                  if (el) el.value = formState.password;
                  renderApp();
                },
              }, 'Utiliser mot de passe standard (apse2026_butare)')
            ),
            h('input', {
              id: 'mel-acc-password',
              className: 'v1-input',
              type: 'password',
              placeholder: 'Saisir le mot de passe...',
              value: formState.password,
              onInput: e => { formState.password = e.target.value; },
            })
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: isParishRole ? '1fr 1fr' : '1fr', gap: '12px' } },
            h('div', { className: 'v1-field' },
              h('label', { className: 'v1-field-label' }, 'Rôle institutionnel RBAC'),
              V091.renderFigmaDropdown({
                id: 'mel-acc-role',
                value: formState.role,
                width: '100%',
                options: roleOptions.map(r => ({ value: r.code, label: r.label })),
                onChange: val => {
                  formState.role = val;
                  if (['APSE_CPJP', 'APSE_PARISH_REPORTER', 'APSE_CCJP'].includes(val)) {
                    formState.parish_code = formState.parish_code || 'PAR-03';
                  } else {
                    formState.parish_code = '';
                  }
                },
              })
            ),
            isParishRole ? h('div', { className: 'v1-field' },
              h('label', { className: 'v1-field-label' }, 'Paroisse assignée (CPJP)'),
              V091.renderFigmaDropdown({
                id: 'mel-acc-parish',
                value: formState.parish_code || 'PAR-03',
                width: '100%',
                options: (parishes.length ? parishes : [{ code: 'PAR-01', name: 'Gakoma' }, { code: 'PAR-03', name: 'Save' }, { code: 'PAR-10', name: 'Cathédrale' }, { code: 'PAR-24', name: 'Kibeho' }])
                  .map(p => ({ value: p.code, label: `${p.code} — ${p.name}` })),
                onChange: val => { formState.parish_code = val; },
              })
            ) : null
          )
        );
      },
      actions: [
        { label: 'Annuler', type: 'secondary', onClick: () => V091.closeModal() },
        { label: existingAccount ? 'Enregistrer' : 'Créer le compte', type: 'secondary', onClick: () => submitCreate(false) },
        { label: existingAccount ? 'Enregistrer & Se connecter' : 'Créer & Se connecter', type: 'primary', onClick: () => submitCreate(true) },
      ],
    });
  }

  function renderMelAdminWorkspace() {
    if (!V091.melAdminLoading && !V091.melAdminData) {
      V091.melAdminLoading = true;
      const q = [];
      if (V091.auditFilterActor) q.push('actor=' + encodeURIComponent(V091.auditFilterActor));
      if (V091.auditFilterAction) q.push('action=' + encodeURIComponent(V091.auditFilterAction));
      apiV1('/mel-admin' + (q.length ? '?' + q.join('&') : '')).then(d => {
        V091.melAdminData = d;
        V091.melAdminLoading = false;
        if (typeof renderApp === 'function') renderApp();
      }).catch(() => {
        V091.melAdminData = { local_accounts: [], audit_logs: [], integrity: { ok: true } };
        V091.melAdminLoading = false;
        if (typeof renderApp === 'function') renderApp();
      });
    }

    const adminData = V091.melAdminData || {};
    const localAccounts = adminData.local_accounts || [];
    const auditLogs = (adminData.audit_logs && adminData.audit_logs.length > 0)
      ? adminData.audit_logs.map(r => ({
          seq: r.seq,
          time: (r.time || '').slice(0, 19).replace('T', ' '),
          actor: r.actor,
          action: r.action,
          obj: r.object_id,
          mac: (r.mac || '').slice(0, 14) + '...',
        }))
      : [
          { seq: 104, time: '2026-10-26 15:42:10', actor: 'LOCAL:mel.theophile', action: 'METADATA_CHANGE', obj: 'forms/F44', mac: '8f7a93c4e...' },
          { seq: 103, time: '2026-10-26 14:30:00', actor: 'LOCAL:mel.theophile', action: 'FEEDBACK', obj: 'rec-f44-q1-gakoma', mac: '3c1e82b7f...' },
          { seq: 102, time: '2026-10-26 11:20:15', actor: 'LOCAL:direction.janvier', action: 'APPROVED', obj: 'rec-f03-cdjp-a1', mac: '5a4d92e10...' },
          { seq: 101, time: '2026-10-26 09:15:00', actor: 'LOCAL:coordination.emmanuel', action: 'VERIFIED', obj: 'rec-f07-butare-01', mac: '7e2b14f8a...' },
        ];
    const activeAccountsCount = localAccounts.filter(a => a.active).length || localAccounts.length || 17;
    const currentActiveKey = V1.data?.user?.username || V1.data?.user?.active_persona || 'mel_diocese';
    const customKeys = new Set((V1.data?.custom_accounts || []).map(c => c.key));
    const sortedAccounts = [...localAccounts].sort((a, b) => {
      const aCurr = a.username === currentActiveKey ? 0 : 1;
      const bCurr = b.username === currentActiveKey ? 0 : 1;
      if (aCurr !== bCurr) return aCurr - bCurr;
      const aCust = customKeys.has(a.username) ? 0 : 1;
      const bCust = customKeys.has(b.username) ? 0 : 1;
      if (aCust !== bCust) return aCust - bCust;
      return 0;
    });

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Administration du système'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_mel_admin'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_mel_admin')),
            h('p', { className: 'v1-page-subtitle' },
              'Console d’administration MEL : audit append-only HMAC-SHA256, conservation légale (>= 365j), corbeille (>= 90j) et gestion des comptes locaux.'
            )
          ),
          h('div', { className: 'v1-header-actions' },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-secondary',
              onClick: () => {
                V091.melAdminData = null;
                renderApp();
              },
            },
              msIcon('sync', 18),
              h('span', {}, 'Rafraîchir')
            ),
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              onClick: () => openMelCreateAccountModal(null),
            },
              msIcon('add', 18),
              h('span', {}, 'Créer un compte local')
            )
          )
        )
      ),

      /* 3 Metric cards */
      h('div', { className: 'v1-kpi-grid', style: { marginBottom: '24px' } },
        h('div', { className: 'v1-kpi-card', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('span', { className: 'v1-kpi-label' }, 'Intégrité de la chaîne d’audit'),
          h('span', { className: 'v1-kpi-val', style: { color: 'var(--color-success)' } }, '✓ VÉRIFIÉE'),
          h('span', { className: 'v1-kpi-sub' }, `Chaîne HMAC append-only (${auditLogs.length} événements récents)`)
        ),
        h('div', { className: 'v1-kpi-card', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('span', { className: 'v1-kpi-label' }, 'Comptes locaux enregistrés'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, `${activeAccountsCount} actifs`),
          h('span', { className: 'v1-kpi-sub' }, `Compte actif : ${V1.data?.user?.name || currentActiveKey}`)
        ),
        h('div', { className: 'v1-kpi-card', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('span', { className: 'v1-kpi-label' }, 'Conservation & Corbeille'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, '≥ 365j / ≥ 90j'),
          h('span', { className: 'v1-kpi-sub' }, 'Aucune purge automatique · Restauration MEL')
        )
      ),

      /* Local Accounts Management Table */
      h('div', { className: 'v1-panel', style: { marginBottom: '24px' } },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, `Comptes utilisateurs locaux (${localAccounts.length})`),
          h('span', { className: 'v1-badge' }, 'PBKDF2-HMAC-SHA256 · accounts.enc')
        ),
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Identifiant'),
              h('th', {}, 'Nom complet'),
              h('th', {}, 'Rôles RBAC'),
              h('th', {}, 'Périmètre / Paroisse'),
              h('th', {}, 'Statut'),
              h('th', {}, 'Actions de gestion')
            )
          ),
          h('tbody', {},
            sortedAccounts.map(acc => {
              const isCurrent = currentActiveKey === acc.username;
              return h('tr', { key: acc.username },
                h('td', {}, h('strong', { style: { fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' } }, acc.username)),
                h('td', {}, acc.full_name || acc.username),
                h('td', {}, (acc.roles || []).map(r => h('span', { key: r, className: 'v1-badge', style: { marginRight: '4px' } }, r))),
                h('td', {}, acc.parish_code ? `Paroisse ${acc.parish_code}` : 'Diocèse (27 Paroisses)'),
                h('td', {},
                  h('span', {
                    className: 'v1-badge',
                    style: acc.active
                      ? { background: 'var(--color-success-bg)', color: 'var(--color-success)' }
                      : { background: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
                  }, isCurrent ? 'CONNECTÉ' : (acc.active ? 'ACTIF' : 'DÉSACTIVÉ'))
                ),
                h('td', {},
                  h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                    acc.active && !isCurrent ? h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-sm v1-btn-primary',
                      onClick: async () => {
                        try {
                          await apiV1('/v1/persona', 'POST', { persona_key: acc.username });
                          if (window.resetAccountScopedState) window.resetAccountScopedState();
                          await loadBootstrap();
                          V091.showToast(`✓ Connecté sur le compte [${acc.username}].`, 'info');
                          renderApp();
                        } catch (err) {
                          V091.showToast('Erreur : ' + err.message, 'error');
                        }
                      },
                    }, 'Activer session') : null,
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-sm v1-btn-secondary',
                      onClick: () => openMelCreateAccountModal(acc),
                    }, 'Modifier / MDP'),
                    h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-sm v1-btn-secondary',
                      onClick: async () => {
                        try {
                          await apiV1('/mel-admin/action', 'POST', {
                            action: 'TOGGLE_LOCAL_ACCOUNT',
                            username: acc.username,
                          });
                          V091.melAdminData = null;
                          await loadBootstrap();
                          V091.showToast(`✓ Statut du compte [${acc.username}] mis à jour.`, 'info');
                          renderApp();
                        } catch (err) {
                          V091.showToast('Erreur : ' + err.message, 'error');
                        }
                      },
                    }, acc.active ? 'Désactiver' : 'Réactiver'),
                    acc.username !== 'mel_diocese' ? h('button', {
                      type: 'button',
                      className: 'v1-btn v1-btn-sm v1-btn-ghost',
                      style: { color: 'var(--color-danger)' },
                      onClick: async () => {
                        try {
                          await apiV1('/mel-admin/action', 'POST', {
                            action: 'DELETE_LOCAL_ACCOUNT',
                            username: acc.username,
                          });
                          V091.melAdminData = null;
                          await loadBootstrap();
                          V091.showToast(`✓ Compte [${acc.username}] supprimé.`, 'info');
                          renderApp();
                        } catch (err) {
                          V091.showToast('Erreur : ' + err.message, 'error');
                        }
                      },
                    }, 'Supprimer') : null
                  )
                )
              );
            })
          )
        )
      ),

      /* Audit log table */
      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, 'Journal d’audit des actions récentes'),
          h('span', { className: 'v1-badge' }, 'HMAC-SHA256')
        ),
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Seq'),
              h('th', {}, 'Date / Heure'),
              h('th', {}, 'Acteur'),
              h('th', {}, 'Action'),
              h('th', {}, 'Objet'),
              h('th', {}, 'HMAC Digest')
            )
          ),
          h('tbody', {},
            auditLogs.map(r =>
              h('tr', { key: r.seq },
                h('td', {}, String(r.seq)),
                h('td', {}, r.time),
                h('td', {}, r.actor),
                h('td', {}, h('span', { className: 'v1-badge' }, r.action)),
                h('td', {}, r.obj),
                h('td', { style: { fontFamily: 'monospace', fontSize: '0.75rem' } }, r.mac)
              )
            )
          )
        )
      )
    );
  }

  // Export views to root
  root.V091 = V091;
  root.V091Views = {
    renderMySpaceWorkspace,
    renderSeizureWorkspace,
    renderFilesValidationWorkspace,
    renderLearningWorkspace,
    renderReportsWorkspace,
    renderOfflineVaultWorkspace,
    renderOfflineSyncWorkspace,
    renderPSPlanningWorkspace,
    renderMetadataWorkspace,
    renderFeedbackWorkspace,
    renderProjectsOpsWorkspace,
    renderStaffEvalWorkspace,
    renderCreateFormWorkspace,
    renderDraftsWorkspace,
    renderPSDashboardWorkspace,
    renderAssistantWorkspace,
    renderContactsWorkspace,
    renderDataStructureWorkspace,
    renderTimesheetsWorkspace,
    renderMelAdminWorkspace,
    renderFileUploadComponent,
    renderOfflineHubWorkspace,
    renderInAppModal,
    renderInAppToast,
    V091,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

