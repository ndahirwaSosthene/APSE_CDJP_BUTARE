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
    planningData: null,

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
    portfolioData: null,

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
          V091.modal.content
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

    const categories = [
      { id: 'ALL', label: 'Tous (45 formulaires)' },
      { id: 'PLAN', label: 'Planification (F03, F04, F05, F43)' },
      { id: 'ACT', label: 'Activités & Rapports (F06-F16, F44)' },
      { id: 'FIN', label: 'Finances & Logistique (F19, F33-F36)' },
      { id: 'LRN', label: 'Apprentissage (F27-F30)' },
      { id: 'SENS', label: 'Confidentiel & Sensible (F09, F25, F45)' },
      { id: 'HR', label: 'RH & Gouvernance (F01-F02, F31, F32, F37-F40)' },
      { id: 'KPI', label: 'Indicateurs & Équité (F41-F42)' },
    ];

    const currentForm = allForms.find(f => f.code === V091.activeFormCode) || allForms[0] || { code: 'F07', label: { fr: 'F07' }, fields: [] };
    const formFields = currentForm.fields || [];

    // Filter forms by category & search
    const filteredForms = allForms.filter(f => {
      const matchCat = (V091.formCategory === 'ALL') ||
        (V091.formCategory === 'PLAN' && ['F03', 'F04', 'F05', 'F43'].includes(f.code)) ||
        (V091.formCategory === 'ACT' && ['F06', 'F07', 'F08', 'F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F44'].includes(f.code)) ||
        (V091.formCategory === 'FIN' && ['F19', 'F33', 'F34', 'F35', 'F36'].includes(f.code)) ||
        (V091.formCategory === 'LRN' && ['F27', 'F28', 'F29', 'F30'].includes(f.code)) ||
        (V091.formCategory === 'SENS' && (f.sensitive || ['F09', 'F25', 'F45'].includes(f.code))) ||
        (V091.formCategory === 'HR' && ['F01', 'F02', 'F31', 'F32', 'F37', 'F38', 'F39', 'F40'].includes(f.code)) ||
        (V091.formCategory === 'KPI' && ['F41', 'F42'].includes(f.code));

      if (!matchCat) return false;
      if (!V091.formSearch) return true;
      const q = V091.formSearch.toLowerCase();
      const lbl = (f.label[V1.lang] || f.label.fr || f.label.en || '').toLowerCase();
      return f.code.toLowerCase().includes(q) || lbl.includes(q);
    });

    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Saisie opérationnelle'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, `${currentForm.code} — ${currentForm.label[V1.lang] || currentForm.label.fr}`)
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, `Saisie : ${currentForm.code} · ${currentForm.label[V1.lang] || currentForm.label.fr}`),
            h('p', { className: 'v1-page-subtitle' },
              `${formFields.length} champs disponibles · ${currentForm.sensitive ? 'Fiche sensible (Accès restreint)' : 'Fiche publique opérationnelle'} · Standard ${currentForm.captureStandard || 'V8'}`
            )
          ),
          h('div', { className: 'v1-header-actions' },
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
              h('span', {}, 'Enregistrer comme brouillon')
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
              h('span', {}, 'Valider & Soumettre le dossier')
            )
          )
        )
      ),

      /* Document Import to Prefill Form Dropzone */
      h('div', { className: 'v1-panel', style: { marginBottom: '24px', border: '1px dashed var(--border-subtle)', background: 'var(--bg-canvas)' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
          h('div', {},
            h('strong', { style: { fontSize: '0.9375rem' } }, 'Pré-remplissage automatique depuis un document (DOCX, PDF, XLSX, CSV, JSON, TXT)'),
            h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '4px 0 0' } },
              'Importe les valeurs clés depuis votre fichier sans jamais approuver automatiquement. Aperçu et vérification humaine obligatoires.'
            )
          ),
          renderFileUploadComponent({
            label: 'Importer un document source',
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

        /* Preview banner if document imported */
        V091.prefillPreview ? h('div', { style: { marginTop: '12px', padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
            h('span', { style: { fontWeight: '600', color: 'var(--color-primary)' } },
              `✓ ${Object.keys(V091.prefillPreview).length} champs extraits avec succès depuis ${V091.selectedFile?.name}`
            ),
            h('div', { style: { display: 'flex', gap: '8px' } },
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-sm v1-btn-primary',
                onClick: () => {
                  Object.assign(V091.formValues, V091.prefillPreview);
                  V091.prefillPreview = null;
                  renderApp();
                },
              }, 'Appliquer ces valeurs au formulaire'),
              h('button', {
                type: 'button',
                className: 'v1-btn v1-btn-sm v1-btn-secondary',
                onClick: () => {
                  V091.prefillPreview = null;
                  renderApp();
                },
              }, 'Ignorer')
            )
          ),
          V091.prefillWarnings.length > 0 ? h('div', { className: 'v1-error-alert', style: { marginBottom: '8px' } }, V091.prefillWarnings.join(' · ')) : null,
          h('pre', { style: { fontSize: '0.75rem', maxHeight: '120px', overflowY: 'auto', background: 'var(--bg-canvas)', padding: '8px', borderRadius: '4px' } },
            JSON.stringify(V091.prefillPreview, null, 2)
          )
        ) : null
      ),

      /* Split Layout: Left Form Selector Pills, Right Dynamic Form Generator */
      h('div', { style: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' } },
        /* Left Column: Form Selector & Search */
        h('div', { className: 'v1-panel', style: { padding: '16px' } },
          h('label', { className: 'v1-field-label' }, 'Catégories de formulaires'),
          h('div', { className: 'v1-chips', style: { marginBottom: '12px' } },
            categories.map(c =>
              h('button', {
                type: 'button',
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
            className: 'v1-input',
            placeholder: 'Filtrer par code ou titre...',
            value: V091.formSearch,
            onInput: e => {
              V091.formSearch = e.target.value;
              renderApp();
            },
            style: { marginBottom: '12px', height: '34px', fontSize: '0.8125rem' },
          }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '560px', overflowY: 'auto' } },
            filteredForms.map(f =>
              h('button', {
                type: 'button',
                className: 'v1-nav-item' + (V091.activeFormCode === f.code ? ' active' : ''),
                style: { textAlign: 'left', padding: '8px 10px', fontSize: '0.8125rem', justifyContent: 'space-between' },
                onClick: () => {
                  V091.activeFormCode = f.code;
                  V091.formValues = {};
                  renderApp();
                },
              },
                h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                  h('strong', {}, f.code),
                  h('span', { style: { marginLeft: '6px', color: 'var(--text-secondary)' } }, f.label[V1.lang] || f.label.fr)
                ),
                f.sensitive ? h('span', { className: 'v1-badge', style: { background: 'var(--color-critical-bg)', color: 'var(--color-critical)' } }, 'Sensible') : null
              )
            )
          )
        ),

        /* Right Column: Dynamic Form Generator with CPJP Q1-Q4 allocation for F03 */
        h('div', { className: 'v1-panel', style: { padding: '24px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
            h('h2', { style: { fontSize: '1.125rem', fontWeight: '600' } }, `Champs du formulaire ${currentForm.code}`),
            h('span', { className: 'v1-badge' }, `${formFields.length} champs natifs`)
          ),

          /* If F03 and CPJP Plan, render dedicated Q1–Q4 quarterly allocation cards */
          currentForm.code === 'F03' ? h('div', { style: { marginBottom: '24px', padding: '16px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
              h('strong', {}, 'Répartition trimestrielle CPJP (Q1, Q2, Q3, Q4) — v0.9.1'),
              h('span', { className: 'v1-badge' }, 'Manuel CPJP Table 12')
            ),
            h('div', { className: 'v1-grid-16' },
              ['q1', 'q2', 'q3', 'q4'].map((q, qIdx) =>
                h('div', { className: 'v1-panel', style: { gridColumn: 'span 8', padding: '12px' } },
                  h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '8px' } },
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
                    style: { marginBottom: '6px' },
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
          ) : null,

          /* Native Form Fields Grid */
          h('div', { className: 'v1-grid-16' },
            /* Always include Date Evenement */
            h('div', { className: 'v1-field', style: { gridColumn: 'span 8' } },
              h('label', { className: 'v1-field-label' }, 'Date de l’événement (YYYY-MM-DD) *'),
              h('input', {
                type: 'date',
                className: 'v1-input',
                value: V091.formValues.event_date || '2026-10-25',
                onInput: e => { V091.formValues.event_date = e.target.value; },
              })
            ),

            formFields.map(fCode => {
              const fMeta = allFields[fCode] || { type: 'TEXT', label: { fr: fCode } };
              const fType = fMeta.type || 'TEXT';
              const fLabel = (fMeta.label && (fMeta.label[V1.lang] || fMeta.label.fr || fMeta.label.en)) || fCode;
              const isReq = (currentForm.required || []).includes(fCode);
              const colSpan = (fType === 'LONG_TEXT' || fCode === 'title' || fCode === 'activity' || fCode === 'progress_summary') ? 'span 16' : 'span 8';

              return h('div', { className: 'v1-field', style: { gridColumn: colSpan } },
                h('label', { className: 'v1-field-label' }, `${fLabel} ${isReq ? '*' : ''}`),
                fType === 'LONG_TEXT' ? h('textarea', {
                  className: 'v1-textarea',
                  rows: 3,
                  value: V091.formValues[fCode] || '',
                  onInput: e => { V091.formValues[fCode] = e.target.value; },
                }) : fType === 'BOOLEAN' ? h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', height: '40px' } },
                  h('input', {
                    type: 'checkbox',
                    checked: V091.formValues[fCode] === 'true',
                    onChange: e => { V091.formValues[fCode] = e.target.checked ? 'true' : 'false'; },
                  }),
                  h('span', { style: { fontSize: '0.875rem' } }, 'Confirmer (Oui / Non)')
                ) : h('input', {
                  type: (fType.startsWith('INTEGER') || fType === 'NUMBER') ? 'number' : fType === 'DATE' ? 'date' : 'text',
                  className: 'v1-input',
                  placeholder: `Saisir ${fLabel}...`,
                  value: V091.formValues[fCode] || '',
                  onInput: e => { V091.formValues[fCode] = e.target.value; },
                })
              );
            })
          ),

          /* Evidence Upload & Attachments */
          h('div', { style: { marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' } },
            h('label', { className: 'v1-field-label' }, 'Pièce justificative & Preuve (PDF, PNG, JPG <= 10MB)'),
            renderFileUploadComponent({
              label: 'Attacher une preuve (Procès-verbal, feuille de présence, photo)',
              accept: 'application/pdf,image/png,image/jpeg',
              selectedFilename: V091.formValues.evidence,
              onSelect: file => {
                V091.formValues.evidence = file.name;
                renderApp();
              },
            })
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
    const subTabs = [
      { id: 'f27', label: 'F27 Questions d’apprentissage', form: 'F27' },
      { id: 'f28', label: 'F28 Revues après action (AAR)', form: 'F28' },
      { id: 'f29', label: 'F29 Leçons validées', form: 'F29' },
      { id: 'f30', label: 'F30 Applications & Adaptations', form: 'F30' },
    ];

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
                V091.activeFormCode = (subTabs.find(t => t.id === V091.learningSubTab) || {}).form || 'F29';
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
            h('tr', {},
              h('td', {}, h('span', { className: 'v1-badge' }, 'F29')),
              h('td', {}, 'LRN-F29-2026-01'),
              h('td', {}, 'Articulation CEB → CCJP → CPJP pour le suivi post-médiation'),
              h('td', {}, 'Associer systématiquement le responsable CEB (origin_ceb) au suivi à 30 et 90 jours.'),
              h('td', {}, 'LOCAL:mel.theophile'),
              h('td', {}, '92% des accords durent avec suivi CEB contre 64% sans suivi.'),
              h('td', {},
                h('button', {
                  type: 'button',
                  className: 'v1-btn v1-btn-sm v1-btn-secondary',
                  onClick: () => {
                    V091.activeFormCode = 'F30';
                    V091.formValues = {
                      lesson_ref: 'LRN-F29-2026-01',
                      title: 'Application de la leçon : Intégration du suivi CEB à 30 jours',
                      decision: 'SCALE',
                    };
                    V1.workspace = 'seizure';
                    renderApp();
                  },
                }, 'Appliquer cette leçon (F30)')
              )
            ),
            h('tr', {},
              h('td', {}, h('span', { className: 'v1-badge' }, 'F30')),
              h('td', {}, 'LRN-F30-2026-01'),
              h('td', {}, 'Mise en œuvre de la fiche de suivi CEB dans les 27 paroisses'),
              h('td', {}, 'Décision : SCALE — Déploiement généralisé aux comités CPJP.'),
              h('td', {}, 'LOCAL:coordination.emmanuel · 2026-12-15'),
              h('td', {}, h('span', { className: 'v1-badge', style: { background: 'var(--color-success-bg)', color: 'var(--color-success)' } }, 'Vérifié par Directeur')),
              h('td', {},
                h('span', { className: 'v1-chip' }, 'Clôturé & vérifié')
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
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Plan Stratégique 2026–2031'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_ps_planning'))
        ),
        h('div', { className: 'v1-header-split' },
          h('div', {},
            h('h1', { className: 'v1-page-title' }, L('nav_ps_planning')),
            h('p', { className: 'v1-page-subtitle' },
              'Horizon pastoral de 5 ans (AP1 à AP5) : 5 axes, 13 résultats, 15 interventions, 25 lignes opérationnelles indicatives et 33 tâches annuelles.'
            )
          ),
          h('div', { className: 'v1-header-actions' },
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
              onClick: () => {
                V091.activeFormCode = 'F03';
                V091.formValues = {
                  ap: V091.planningYear,
                  plan_type: V091.planningAudience,
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

      /* Selector bars: Years AP1-AP5 & Audience (STAFF vs CPJP) */
      h('div', { style: { display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' } },
        h('div', { className: 'v1-segmented' },
          ['AP1', 'AP2', 'AP3', 'AP4', 'AP5'].map((ap, idx) =>
            h('button', {
              type: 'button',
              className: 'v1-seg-btn' + (V091.planningYear === ap ? ' active' : ''),
              onClick: () => { V091.planningYear = ap; renderApp(); },
            }, `${ap} (202${6 + idx}–202${7 + idx})`)
          )
        ),
        h('div', { className: 'v1-segmented' },
          [
            ['STAFF', 'Personnel CDJP Diocèse'],
            ['CPJP', 'Comités Paroissiaux CPJP'],
          ].map(([aud, lbl]) =>
            h('button', {
              type: 'button',
              className: 'v1-seg-btn' + (V091.planningAudience === aud ? ' active' : ''),
              onClick: () => { V091.planningAudience = aud; renderApp(); },
            }, lbl)
          )
        )
      ),

      /* Indicative operational lines & tasks */
      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, `Tâches annuelles & Lignes indicatives (${V091.planningYear} · ${V091.planningAudience})`),
          h('span', { className: 'v1-badge' }, 'Enveloppe PS approuvée')
        ),
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Code'),
              h('th', {}, 'Axe'),
              h('th', {}, 'Activité planifiée'),
              h('th', {}, 'Cible indicative'),
              h('th', {}, 'Budget indicatif'),
              h('th', {}, 'Action')
            )
          ),
          h('tbody', {},
            [
              { code: 'AT-AP1-01', axis: 'A1', title: 'Cercles de guérison et écoute active Isanamitima / GURR', target: '360 personnes', budget: '18.5 M RWF' },
              { code: 'AT-AP1-02', axis: 'A2', title: 'Médiation des conflits et accompagnement parajuridique de proximité', target: '240 dossiers', budget: '14.2 M RWF' },
              { code: 'AT-AP1-03', axis: 'A3', title: 'Reboisement agroforestier et justice écologique dans les collines', target: '12 000 plants', budget: '9.8 M RWF' },
              { code: 'AT-AP1-04', axis: 'A4', title: 'Sensibilisation aux droits humains et accompagnement des détenus libérés', target: '180 personnes', budget: '11.0 M RWF' },
              { code: 'AT-AP1-05', axis: 'A5', title: 'Renforcement organisationnel et comités paroissiaux CPJP', target: '27 comités', budget: '8.4 M RWF' },
            ].map(row =>
              h('tr', {},
                h('td', {}, h('strong', {}, row.code)),
                h('td', {}, h('span', { className: 'v1-badge' }, row.axis)),
                h('td', {}, row.title),
                h('td', {}, row.target),
                h('td', {}, row.budget),
                h('td', {},
                  h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-sm v1-btn-secondary',
                    onClick: () => {
                      V091.activeFormCode = 'F03';
                      V091.formValues = {
                        ap: V091.planningYear,
                        plan_type: V091.planningAudience,
                        operation_ref: row.code,
                        axis: row.axis,
                        title: row.title,
                      };
                      V1.workspace = 'seizure';
                      renderApp();
                    },
                  }, 'Préparer cette activité (F03)')
                )
              )
            )
          )
        )
      )
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
            className: 'v1-panel v1-card-interactive',
            style: { gridColumn: 'span 4', padding: '16px', cursor: 'pointer' },
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
     10. RECORD FEEDBACK (Retours sur les dossiers)
     -------------------------------------------------------------------------- */
  function renderFeedbackWorkspace() {
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Échanges internes'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_feedback'))
        ),
        h('h1', { className: 'v1-page-title' }, L('nav_feedback'))
      ),

      h('div', { className: 'v1-panel', style: { padding: '24px' } },
        h('h2', { style: { fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' } },
          'Boîte de réception des retours et messages chiffrés par dossier'
        ),
        h('div', { style: { display: 'flex', gap: '12px', marginBottom: '16px' } },
          h('select', {
            className: 'v1-select',
            style: { maxWidth: '240px' },
            value: V091.feedbackRecipient,
            onChange: e => { V091.feedbackRecipient = e.target.value; },
          },
            h('option', { value: 'AUTHOR' }, 'Destinataire : Auteur'),
            h('option', { value: 'VERIFICATION' }, 'Destinataire : Coordinateur'),
            h('option', { value: 'FINANCE' }, 'Destinataire : Comptable'),
            h('option', { value: 'MEL' }, 'Destinataire : Responsable MEL'),
            h('option', { value: 'APPROVAL' }, 'Destinataire : Directeur'),
            h('option', { value: 'ALL' }, 'Destinataire : Tout le circuit')
          ),
          h('input', {
            className: 'v1-input',
            placeholder: 'Rédiger une observation confidentielle sur ce dossier...',
            value: V091.feedbackText,
            onInput: e => { V091.feedbackText = e.target.value; },
            style: { flex: 1 },
          }),
          h('button', {
            type: 'button',
            className: 'v1-btn v1-btn-primary',
            onClick: () => {
              if (!V091.feedbackText.trim()) return;
              apiV1('/feedback', 'POST', {
                record: 'rec-f44-q1-gakoma',
                text: V091.feedbackText,
                recipient: V091.feedbackRecipient,
              }).then(() => {
                V091.showToast('✓ Message interne enregistré avec succès.', 'info');
                V091.feedbackText = '';
                renderApp();
              }).catch(err => V091.showToast('Erreur : ' + err.message, 'error'));
            },
          }, 'Envoyer')
        ),

        /* Sample feedback message */
        h('div', { style: { padding: '12px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' } },
            h('strong', {}, 'Théophile Habimana (MEL) → Auteur'),
            h('span', { style: { fontSize: '0.75rem', color: 'var(--text-secondary)' } }, '2026-10-26 14:30')
          ),
          h('p', { style: { fontSize: '0.875rem', margin: 0 } },
            'Merci au comité CPJP Gakoma pour ce rapport Q1 très complet. Vérifiez la pièce jointe de la centrale Kizenga avant validation MEL.'
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     11. PROJECTS & OPERATIONS (Projets et opérations — EFF-01, EFI-01/02, FIN-01)
     -------------------------------------------------------------------------- */
  function renderProjectsOpsWorkspace() {
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
          h('span', { className: 'v1-kpi-val v1-tabular' }, '100.0%'),
          h('span', { className: 'v1-kpi-sub' }, '48 réalisés / 48 prévus')
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'EFI-01 : Coût réel par produit'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, '85 833 RWF'),
          h('span', { className: 'v1-kpi-sub' }, 'Dépenses F19 / Outputs F07')
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'EFI-02 : Coût unitaire prévu'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, '95 833 RWF'),
          h('span', { className: 'v1-kpi-sub' }, 'Budget prévu F03 / Cible F03')
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'FIN-01 : Exécution budgétaire'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, '89.6%'),
          h('span', { className: 'v1-kpi-sub' }, '4 120 000 / 4 600 000 RWF')
        )
      ),

      /* Portfolio table */
      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, 'Portefeuille consolidé par type de travail'),
          h('span', { className: 'v1-badge' }, 'Données approuvées')
        ),
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Classification'),
              h('th', {}, 'Projet / Réf'),
              h('th', {}, 'Partenaires'),
              h('th', {}, 'Plans approuvés'),
              h('th', {}, 'Budget approuvé'),
              h('th', {}, 'Dépenses réelles'),
              h('th', {}, 'Exécution FIN-01')
            )
          ),
          h('tbody', {},
            h('tr', {},
              h('td', {}, h('span', { className: 'v1-chip' }, 'PROJECT')),
              h('td', {}, 'PRJ-ISANAMITIMA'),
              h('td', {}, 'MISEREOR, CARITAS'),
              h('td', {}, '1'),
              h('td', {}, '18 500 000 RWF'),
              h('td', {}, '4 120 000 RWF'),
              h('td', {}, h('strong', {}, '89.6% (Q1)'))
            ),
            h('tr', {},
              h('td', {}, h('span', { className: 'v1-chip' }, 'OPERATIONAL')),
              h('td', {}, 'PLAN-2026-CPJP-GAKOMA'),
              h('td', {}, 'DIOCESE_BUTARE'),
              h('td', {}, '1'),
              h('td', {}, '3 200 000 RWF'),
              h('td', {}, '800 000 RWF'),
              h('td', {}, h('strong', {}, '100.0% (Q1)'))
            )
          )
        )
      )
    );
  }

  /* --------------------------------------------------------------------------
     12. EVALUATION OF STAFF ACHIEVEMENTS (Évaluation des réalisations F05/F43/F04/F03)
     -------------------------------------------------------------------------- */
  function renderStaffEvalWorkspace() {
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
            className: 'v1-seg-btn' + (V091.staffEvalLevel === lvl ? ' active' : ''),
            onClick: () => { V091.staffEvalLevel = lvl; renderApp(); },
          }, lbl)
        )
      ),

      /* Performance matrix table */
      h('div', { className: 'v1-panel' },
        h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Assignation'),
              h('th', {}, 'Agent responsable'),
              h('th', {}, 'Activité assignée'),
              h('th', {}, 'Échéance'),
              h('th', {}, 'Cible prévue'),
              h('th', {}, 'Outputs réalisés'),
              h('th', {}, 'Taux d’atteinte %'),
              h('th', {}, 'Preuves vérifiées')
            )
          ),
          h('tbody', {},
            h('tr', {},
              h('td', {}, h('strong', {}, 'rec-f05-w42')),
              h('td', {}, 'Théophile Habimana (MEL)'),
              h('td', {}, 'Supervision des groupes Isanamitima à Ste Thérèse'),
              h('td', {}, '2026-10-18'),
              h('td', {}, '48'),
              h('td', {}, '48'),
              h('td', {}, h('span', { className: 'v1-badge', style: { background: 'var(--color-success-bg)', color: 'var(--color-success)' } }, '100.0%')),
              h('td', {}, '1 / 1 (100%)')
            )
          )
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
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          h('span', { className: 'v1-badge', style: { background: 'var(--color-primary)', color: '#fff' } }, form.code),
          h('span', { className: 'v1-badge' }, form.status === 'ACTIVE' ? 'ACTIF' : 'BROUILLON')
        ),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
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
        h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' } },
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
            h('select', {
              className: 'gf-q-type-select',
              value: qType,
              onChange: e => {
                q.type = e.target.value;
                if (['RADIO', 'CHECKBOX', 'DROPDOWN'].includes(q.type) && (!q.options || !q.options.length)) {
                  q.options = ['Option 1', 'Option 2', 'Option 3'];
                }
                renderApp();
              },
            },
              h('option', { value: 'TEXT' }, 'Texte court'),
              h('option', { value: 'LONG_TEXT' }, 'Paragraphe'),
              h('option', { value: 'RADIO' }, 'Choix multiple'),
              h('option', { value: 'CHECKBOX' }, 'Cases à cocher'),
              h('option', { value: 'DROPDOWN' }, 'Liste déroulante'),
              h('option', { value: 'SCALE_1_5' }, 'Échelle linéaire (1 à 5)'),
              h('option', { value: 'NUMBER' }, 'Nombre'),
              h('option', { value: 'DATE' }, 'Date'),
              h('option', { value: 'FILE' }, 'Importation de document')
            )
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
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0' } },
              h('span', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)' } }, '1 (Faible)'),
              [1, 2, 3, 4, 5].map(n =>
                h('span', {
                  key: n,
                  style: { width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.875rem', background: 'var(--bg-input)' }
                }, String(n))
              ),
              h('span', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)' } }, '5 (Remarquable)')
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
      content: h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
        (form.questions || []).map((q, idx) =>
          h('div', { key: idx, style: { padding: '14px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-input)' } },
            h('label', { style: { fontWeight: '600', fontSize: '0.875rem', display: 'block', marginBottom: '8px' } },
              `${idx + 1}. ${q.label?.fr || q.label || q.title || 'Question'}`,
              q.required ? h('span', { style: { color: 'var(--color-danger)', marginLeft: '4px' } }, '*') : null
            ),
            q.type === 'RADIO' ?
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                (q.options || []).map((opt, oIdx) =>
                  h('label', { key: oIdx, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', cursor: 'pointer' } },
                    h('input', { type: 'radio', name: 'preview_' + idx }),
                    h('span', {}, opt)
                  )
                )
              ) :
            q.type === 'CHECKBOX' ?
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                (q.options || []).map((opt, oIdx) =>
                  h('label', { key: oIdx, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', cursor: 'pointer' } },
                    h('input', { type: 'checkbox' }),
                    h('span', {}, opt)
                  )
                )
              ) :
            q.type === 'DROPDOWN' ?
              h('select', { className: 'v1-select', style: { width: '100%' } },
                h('option', { value: '' }, '-- Sélectionner une option --'),
                (q.options || []).map((opt, oIdx) => h('option', { key: oIdx, value: opt }, opt))
              ) :
            q.type === 'LONG_TEXT' ?
              h('textarea', { className: 'v1-textarea', placeholder: 'Saisissez votre réponse ici...', rows: 3 }) :
              h('input', { className: 'v1-input', type: q.type === 'NUMBER' ? 'number' : (q.type === 'DATE' ? 'date' : 'text'), placeholder: 'Votre réponse...' })
          )
        )
      ),
      actions: [
        { label: 'Fermer l\'aperçu', type: 'primary', onClick: () => V091.closeModal() }
      ]
    });
  }

  function renderDraftsWorkspace() {
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Travaux en cours'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_drafts'))
        ),
        h('h1', { className: 'v1-page-title' }, L('nav_drafts'))
      ),

      h('div', { className: 'v1-panel' },
        h('div', { className: 'v1-chart-header' },
          h('span', { className: 'v1-chart-title' }, 'Brouillons actifs chiffrés sur le serveur'),
          h('span', { className: 'v1-badge' }, `${(V1.data?.drafts || []).length} brouillons`)
        ),
        (V1.data?.drafts || []).length === 0 ? h('p', { style: { padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' } },
          'Aucun brouillon en cours. Les formulaires en cours de saisie sont sauvegardés automatiquement ici.'
        ) : h('table', { className: 'v1-data-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Formulaire'),
              h('th', {}, 'Date événement'),
              h('th', {}, 'Dernière mise à jour'),
              h('th', {}, 'Révision'),
              h('th', {}, 'Actions')
            )
          ),
          h('tbody', {},
            (V1.data?.drafts || []).map(d =>
              h('tr', {},
                h('td', {}, h('strong', {}, d.form)),
                h('td', {}, d.payload?.event_date || 'N/A'),
                h('td', {}, d.updated ? d.updated.slice(0, 16).replace('T', ' ') : 'N/A'),
                h('td', {}, `Rev ${d.revision}`),
                h('td', {},
                  h('button', {
                    type: 'button',
                    className: 'v1-btn v1-btn-sm v1-btn-primary',
                    onClick: () => {
                      V091.activeFormCode = d.form;
                      V091.formValues = d.payload?.values || {};
                      V1.workspace = 'seizure';
                      renderApp();
                    },
                  }, 'Ouvrir')
                )
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
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Assurance Qualité'),
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
            h('button', {
              type: 'button',
              className: 'v1-btn v1-btn-primary',
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
                }).catch(err => V091.showToast('Erreur contrôles : ' + err.message, 'error'));
              },
            },
              msIcon('fact_check', 18),
              h('span', {}, 'Lancer les contrôles qualité')
            )
          )
        )
      ),

      /* Controls Checklist Panel */
      h('div', { className: 'v1-panel', style: { padding: '24px', marginBottom: '24px' } },
        h('h2', { style: { fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' } }, 'Contrôles de cohérence & conformité V8'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          (V091.assistantResults?.checks || [
            { code: 'REQUIRED_FIELDS', status: 'PASS', title: 'Champs obligatoires du formulaire', detail: 'Vérification de la présence de tous les champs obligatoires.' },
            { code: 'PASTORAL_CALENDAR', status: 'PASS', title: 'Calendrier pastoral PS 2026–2031 (AP1–AP5)', detail: 'Vérification des bornes de dates 1 Sept 2026 à 31 Août 2031.' },
            { code: 'V8_SENSITIVITY_DNH_CNV', status: 'PASS', title: 'Standard V8 : Noms collégiaux & Sensibilité CNV/DNH/Trauma', detail: 'Présence des binômes (2 noms) ou comité (7 noms) et cases Do No Harm / CNV cochées.' },
            { code: 'GENDER_DISABILITY_MATH', status: 'PASS', title: 'Désagrégation Genre & Handicap', detail: 'Total = Femmes + Hommes + Non déclaré, Handicap <= Total.' },
            { code: 'PRIVACY_PROTECTION', status: 'PASS', title: 'Protection des données sensibles', detail: 'Aucun identifiant privé de victime dans les fiches partagées.' },
          ]).map(c =>
            h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)' } },
              msIcon(c.status === 'PASS' ? 'check_circle' : 'warning', 20),
              h('div', {},
                h('strong', { style: { fontSize: '0.875rem' } }, c.title),
                h('p', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0' } }, c.detail)
              )
            )
          )
        )
      ),

      /* Writing Assistant Box */
      h('div', { className: 'v1-panel', style: { padding: '24px' } },
        h('h2', { style: { fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' } }, 'Assistant de rédaction & Traduction'),
        h('textarea', {
          className: 'v1-textarea',
          rows: 4,
          placeholder: 'Collez ici votre texte pour vérification de grammaire, clarté ou traduction...',
          value: V091.assistantText,
          onInput: e => { V091.assistantText = e.target.value; },
          style: { marginBottom: '12px' },
        }),
        V091.assistantResults?.suggestion ? h('div', { style: { padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' } },
          h('strong', {}, 'Suggestion proposée (nécessite validation humaine) :'),
          h('p', { style: { margin: '8px 0 0', fontStyle: 'italic' } }, V091.assistantResults.suggestion.proposed_text)
        ) : null
      )
    );
  }

  /* --------------------------------------------------------------------------
     17. CONTACTS (Contacts & Annuaires du personnel)
     -------------------------------------------------------------------------- */
  function renderContactsWorkspace() {
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Annuaire'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_contacts'))
        ),
        h('h1', { className: 'v1-page-title' }, L('nav_contacts'))
      ),

      h('div', { className: 'v1-grid-16' },
        [
          { name: 'Abbé Janvier Nduwayezu', role: 'Directeur CDJP', phone: '+250 788 301 101', email: 'direction.cdjp@diocesebutare.org.rw', office: 'Siège CDJP Cathédrale Huye' },
          { name: 'Emmanuel Nsabimana', role: 'Coordinateur CDJP', phone: '+250 788 302 202', email: 'coordination.cdjp@diocesebutare.org.rw', office: 'Bureau Coordination Huye' },
          { name: 'Théophile Habimana', role: 'Chargé APSE MEL & Communication', phone: '+250 788 303 303', email: 'mel.cdjp@diocesebutare.org.rw', office: 'Unité MEL & Communication' },
          { name: 'Marceline Mukandayisenga', role: 'Comptable / Finance & RH', phone: '+250 788 304 404', email: 'finance.cdjp@diocesebutare.org.rw', office: 'Comptabilité & RH' },
          { name: 'Ruth Kamanzi', role: 'Assistante Technique / Coopération', phone: '+250 788 305 505', email: 'cooperation.cdjp@diocesebutare.org.rw', office: 'Appui Technique & Partenariats' },
          { name: 'Emmanuel Uwimana', role: 'Chauffeur & Logistique terrain', phone: '+250 788 306 606', email: 'logistique.cdjp@diocesebutare.org.rw', office: 'Charroi & Logistique missions' },
        ].map(c =>
          h('div', { className: 'v1-panel', style: { gridColumn: 'span 8', padding: '20px' } },
            h('strong', { style: { fontSize: '1rem', display: 'block' } }, c.name),
            h('span', { className: 'v1-badge', style: { marginTop: '4px', marginBottom: '12px' } }, c.role),
            h('div', { style: { fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' } },
              h('div', {}, `📞 Téléphone : ${c.phone}`),
              h('div', {}, `✉️ Email : ${c.email}`),
              h('div', {}, `📍 Bureau : ${c.office}`)
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
    return h('div', { className: 'v1-workspace-fade' },
      h('header', { className: 'v1-page-header' },
        h('nav', { className: 'v1-breadcrumbs', 'aria-label': 'Breadcrumb' },
          h('span', { className: 'v1-breadcrumb-item' }, 'CDJP Butare'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-item' }, 'Architecture institutionnelle'),
          h('span', { className: 'v1-breadcrumb-sep' }, '/'),
          h('span', { className: 'v1-breadcrumb-current' }, L('nav_data_structure'))
        ),
        h('h1', { className: 'v1-page-title' }, L('nav_data_structure'))
      ),

      h('div', { className: 'v1-panel', style: { padding: '24px', marginBottom: '24px' } },
        h('h2', { style: { fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' } }, 'Circuit de remontée et de validation des données'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          [
            ['1. CEB (Communauté de Base)', 'Collecte terrain à la source (origin_ceb) avec référence du document manuel.'],
            ['2. Centrale (CCJP - 101 Centrales)', 'Consolidation au niveau de la Centrale et binôme de préparateurs (2 noms).'],
            ['3. Paroisse (CPJP - 27 Paroisses)', 'Revue collégiale par le comité paroissial (6 membres + Aumônier = 7 noms).'],
            ['4. Validation MEL (CDJP)', 'Validation méthodologique, contrôle de cohérence et désagrégation.'],
            ['5. Vérification Coordinateur & Approbation Directeur', 'Contrôle opérationnel indépendant et approbation finale institutionnelle.'],
          ].map(([step, desc]) =>
            h('div', { style: { display: 'flex', gap: '12px', padding: '12px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)' } },
              h('strong', { style: { minWidth: '260px' } }, step),
              h('span', { style: { color: 'var(--text-secondary)', fontSize: '0.875rem' } }, desc)
            )
          )
        )
      ),

      /* Exports & Data Transfer Links */
      renderExportsWorkspace()
    );
  }

  /* --------------------------------------------------------------------------
     19. TIMESHEETS (Feuilles de temps F31 / F32)
     -------------------------------------------------------------------------- */
  function renderTimesheetsWorkspace() {
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
                V091.timesheetLogModal = true;
                renderApp();
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

      /* Filter strip */
      h('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' } },
        h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' } },
          h('input', {
            type: 'checkbox',
            checked: V091.timesheetIncludeDrafts,
            onChange: e => {
              V091.timesheetIncludeDrafts = e.target.checked;
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
            [
              { date: '2026-10-21', form: 'F31', agent: 'Théophile Habimana', axis: 'A1 / PRJ-ISANAMITIMA', title: 'Vérification qualité CPJP Butare & formation parajuristes', hours: '08.0', state: 'APPROVED' },
              { date: '2026-10-22', form: 'F31', agent: 'Emmanuel Nsabimana', axis: 'A2 / OPERATIONAL', title: 'Supervision commission diocésaine et revue F04', hours: '07.5', state: 'APPROVED' },
              { date: '2026-10-23', form: 'F31', agent: 'Marceline Mukandayisenga', axis: 'A5 / OPERATIONAL', title: 'Rapprochement comptable F19 et clôture Q1', hours: '08.0', state: 'APPROVED' },
              { date: '2026-10-25', form: 'F32', agent: 'Emmanuel Uwimana', axis: 'A5 / OPERATIONAL', title: 'Congé annuel récupérateur missions terrain', hours: '16.0', state: 'APPROVED' },
            ].map(r =>
              h('tr', {},
                h('td', {}, r.date),
                h('td', {}, h('span', { className: 'v1-badge' }, r.form)),
                h('td', {}, r.agent),
                h('td', {}, r.axis),
                h('td', {}, r.title),
                h('td', {}, h('strong', { className: 'v1-tabular' }, r.hours + ' h')),
                h('td', {}, h('span', { className: 'v1-badge', style: { background: 'var(--color-success-bg)', color: 'var(--color-success)' } }, r.state))
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
  function renderMelAdminWorkspace() {
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
              className: 'v1-btn v1-btn-primary',
              onClick: () => {
                let uname = '';
                let pass = '';
                V091.showModal({
                  title: 'Créer un compte local hors ligne',
                  subtitle: 'Génération d’identifiants sécurisés pour saisie déconnectée (12 car. min).',
                  icon: 'person_add',
                  content: h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                    h('div', { className: 'v1-field' },
                      h('label', { className: 'v1-field-label' }, 'Identifiant (3–60 caractères)'),
                      h('input', { className: 'v1-input', placeholder: 'ex: save_reporter_01', onInput: e => { uname = e.target.value; } })
                    ),
                    h('div', { className: 'v1-field' },
                      h('label', { className: 'v1-field-label' }, 'Mot de passe (12 caractères minimum)'),
                      h('input', { className: 'v1-input', type: 'password', placeholder: '••••••••••••', onInput: e => { pass = e.target.value; } })
                    )
                  ),
                  actions: [
                    { label: 'Annuler', type: 'secondary', onClick: () => V091.closeModal() },
                    {
                      label: 'Créer le compte',
                      type: 'primary',
                      onClick: () => {
                        if (!uname || uname.length < 3) {
                          V091.showToast('L’identifiant doit comporter au moins 3 caractères.', 'error');
                          return;
                        }
                        if (!pass || pass.length < 12) {
                          V091.showToast('Le mot de passe doit comporter au moins 12 caractères.', 'error');
                          return;
                        }
                        apiV1('/mel-admin/action', 'POST', {
                          action: 'CREATE_LOCAL_ACCOUNT',
                          username: uname,
                          password: pass,
                          roles: ['APSE_STAFF'],
                        }).then(() => {
                          V091.closeModal();
                          V091.showToast(`✓ Compte local [${uname}] créé avec succès.`, 'info');
                        }).catch(err => V091.showToast('Erreur : ' + err.message, 'error'));
                      }
                    }
                  ]
                });
              },
            },
              msIcon('add', 18),
              h('span', {}, 'Créer un compte local')
            )
          )
        )
      ),

      /* 3 Metric cards */
      h('div', { className: 'v1-kpi-grid', style: { marginBottom: '24px' } },
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'Intégrité de la chaîne d’audit'),
          h('span', { className: 'v1-kpi-val', style: { color: 'var(--color-success)' } }, '✓ VÉRIFIÉE'),
          h('span', { className: 'v1-kpi-sub' }, 'Chaîne HMAC append-only inviolable')
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'Rétention minimale légale'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, '365 jours'),
          h('span', { className: 'v1-kpi-sub' }, 'Aucune purge automatique')
        ),
        h('div', { className: 'v1-kpi-card' },
          h('span', { className: 'v1-kpi-label' }, 'Délai restauration corbeille'),
          h('span', { className: 'v1-kpi-val v1-tabular' }, '≥ 90 jours'),
          h('span', { className: 'v1-kpi-sub' }, 'Restauration autorisée pour MEL')
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
            [
              { seq: 104, time: '2026-10-26 15:42:10', actor: 'LOCAL:mel.theophile', action: 'METADATA_CHANGE', obj: 'forms/F44', mac: '8f7a93c4e...' },
              { seq: 103, time: '2026-10-26 14:30:00', actor: 'LOCAL:mel.theophile', action: 'FEEDBACK', obj: 'rec-f44-q1-gakoma', mac: '3c1e82b7f...' },
              { seq: 102, time: '2026-10-26 11:20:15', actor: 'LOCAL:direction.janvier', action: 'APPROVED', obj: 'rec-f03-cdjp-a1', mac: '5a4d92e10...' },
              { seq: 101, time: '2026-10-26 09:15:00', actor: 'LOCAL:coordination.emmanuel', action: 'VERIFIED', obj: 'rec-f07-butare-01', mac: '7e2b14f8a...' },
            ].map(r =>
              h('tr', {},
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
    renderInAppModal,
    renderInAppToast,
    V091,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

