# CDJP BUTARE — APSE 0.9.1

3 novembre 2026 · Application APSE + service, extension pour DHIS2 2.42.x et test Windows hors ligne.

## Kinyarwanda: uko ukora TEST

1. Kuramo **APSE_CDJP_Butare_Windows_v0.9.1.zip** yose. Kanda iburyo → **Extract All / Extraire tout**.
2. Fungura folder **APSE_CDJP_Butare** yakuwemo. Ntukoreshe START iri imbere muri ZIP cyangwa START yonyine.
3. Kanda **START_TEST_WINDOWS.cmd**. Shyiramo master passphrase iri muri **APSE_v090_TEST_Credentials_PRIVATE.md** yatanzwe ukwawo. Konti 7 z'imyitozo zisanzwe ntizahindutse.
4. Siga idirishya rifunguye. Fungura **http://127.0.0.1:8766/**, winjire ukoresheje username na password bya konti y'imyitozo. Password ya konti itandukanye na master password.
5. Niba link itafungutse, soma idirishya rya command: server igomba kuba yakomeje gukora; niba port yahindutse koresha iyanditsemo. **DIAGNOSE_APSE_WINDOWS.cmd** ifasha kugenzura package. Ntusibe vault.json, accounts.enc cyangwa database ushaka gukemura ikosa.

**START_TEST_WINDOWS.cmd** ikoresha `test_data`; **START_APSE_WINDOWS.cmd** ikoresha `portable_data` isanzwe cyangwa igatangiza ububiko bushya. Amakuru y'imyitozo ntasimbura ay'ikigo. Ntukoreshe konti z'imyitozo muri production.

### Ibyuzuye muri v0.9.1

- Forms kavukire 45; fields 186; labels mu Kinyarwanda, English, français na Kiswahili; workspaces 14. CPJP itangira mu Kinyarwanda, CDJP mu Gifaransa.
- PS → axe → objectif → intervention → résultat → operational/annual source → planning → reporting/learning. Approved PS budgets zigumana inkomoko yazo.
- CPJP: planning **annuel gusa**, irimo allocations Q1–Q4 z'ibikorwa/targets/budgets. Targets na budgets z'imibare zigomba kungana n'iby'umwaka mbere ya submission. F44 ni raporo trimestriel, ntabwo ari plan trimestriel.
- Import ya document yuzuza form: DOCX, PDF y'inyandiko, XLSX/CSV/JSON row imwe na TXT UTF-8. **Preview → review → Apply → Save draft**. Conflicts n'ibibura biragaragazwa; nta approval yikora.
- Timesheet F31 na F32 ku bakozi ba CDJP bose harimo abashya; uburenganzira ku bimureba; total y'umunsi ntirenza 24h. Export XLSX/DOCX/CSV/JSON; PDF ukoresheje browser Print. Approved only ni default.
- MEL administration: audit, retention/legal holds, staff directory, local-account creation/reset. Restore nibura iminsi 90, retention nibura 365; nta automatic purge. Drafts na recycle bifite uburyo bwo kugarura.
- Recovery kit ya master password: **RECOVER_LOCAL_ACCESS.cmd**; ku test **RECOVER_TEST_ACCESS.cmd**. Kit igomba kubanza gutegurwa master ikizwi; recovery key ibikwa ukw'ayo.
- Autosave, traceable approvals/feedback, editing permissions, evidence, RBM reports, learning, metadata changes, themes na mobile layouts bigumamo.

### Imipaka igomba kumenyekana

- **OCR y'amafoto/scans ntabwo ipakiye muri ZIP.** IT ishyiraho Tesseract n'indimi zayo; scanned PDF ikenera na pdftoppm. Mu gihe bitarategurwa, koresha DOCX/PDF y'inyandiko cyangwa wuzuze manually. File ntirenza 8 MiB; PDF text pages 40; scan pages 10.
- AI generative grammar/translation ikenera provider yemewe yateguwe na network. Local structural checks zirakora; nta makuru y'ibanga ajyanwa kuri external AI.
- Annual detailed tasks ziri mu isoko zatanzwe ni iza **AP1**. MEL ashyiramo approved tasks z'indi myaka igihe zabonetse; system ntihimba targets zabuze. Strategic/operational sources zigumana AP filters.
- Automated tests na browser tests byakozwe kuri Linux. **Windows native, Android nyayo na live DHIS2 ntibyageragejwe hano.** Live acceptance ikurikize manuals; nta garanti y'uko nta kosa rizabaho na rimwe.

### Kwimura kuri flash cyangwa indi computer

Hagarika APSE na Ctrl+C, funga browser, ukopiye **folder yose**. Ntutware START yonyine. Iby'ingenzi muri data folder bigumane: vault.json + accounts.enc + apse.sqlite + recovery.json (niba ihari). Bika recovery key na backup ukwayo. PACK_APSE_FOR_FLASH.cmd ipakira portable_data; test_data ni iy'imyitozo. Ntutangize kopi na original icyarimwe nk'ububiko bubiri bwemewe. Kuri computer nshya banza ugenzure records na audit, ukore test y'ibihimbano.

### Kuvugurura installation isanzwe

Banza uhagarike APSE kandi ukore backup. Ntukopiye test_data hejuru ya portable_data. INSTALL_APSE_WINDOWS.cmd ikora destination APSE_0.9.1 kandi ishobora kwimura portable_data yo muri installations zabanjirijeho; original igumaho. Niba wari ukoresha extracted folder ahandi, IT akoreshe migrate_local.py nk'uko manual ibivuga. Ntukore vault nshya hejuru y'amakuru ariho.

## English: test and review

Extract the complete ZIP and open APSE_CDJP_Butare. Run START_TEST_WINDOWS.cmd, enter the separately supplied test master passphrase, keep the console open and visit http://127.0.0.1:8766/. Log in with an exercise account password. The existing seven test accounts are unchanged. START_APSE_WINDOWS.cmd uses the organisation's separate portable_data vault.

Version 0.9.1 adds annual CPJP Q1–Q4 allocation, staff timesheets and exports, MEL audit/retention/account controls, recovery kits and document-to-form preview/apply. Document import never approves a record. Optional OCR and generative AI require separate configuration. Later-year detailed annual tasks must come from approved institutional sources; none are invented. Read the English manual for beginner procedures, troubleshooting, training and hosted acceptance.

## Français : test et réception

Extraire tout le ZIP, ouvrir APSE_CDJP_Butare, lancer START_TEST_WINDOWS.cmd, saisir le secret principal de test fourni séparément, garder la console ouverte et ouvrir http://127.0.0.1:8766/. Utiliser ensuite un compte d'exercice. Les sept comptes de test existants sont inchangés. START_APSE_WINDOWS.cmd utilise le coffre institutionnel portable_data distinct.

La version 0.9.1 ajoute répartition annuelle CPJP Q1–Q4, feuilles de temps/export, audit/rétention/comptes MEL, kits de récupération et import de document avec prévisualisation/application. Un import n'approuve jamais un dossier. OCR facultatif et IA générative nécessitent une configuration séparée. Les tâches annuelles détaillées des années ultérieures doivent provenir des sources institutionnelles approuvées. Le manuel français couvre utilisation, dépannage, formation et recette hébergée.

## Validation de cette livraison

- 221 tests Python : PASS ; métadonnées et UID : PASS (45 programmes, 186 champs d'interface, 246 éléments natifs).
- JavaScript : 10 groupes fonctionnels et coffre hors ligne chiffré : PASS.
- Deux parcours navigateur réels : langues/accents, autosave connecté/déconnecté, création/soumission, niveaux CPJP/spécialiste, 4 secteurs/5 cellules, rendu des 45 forms ; puis import document, timesheet, audit, Q1–Q4, 13 rôles et écran 360px : PASS.
- ZIP, manifeste d'intégrité et runtime Windows : contrôlés structurellement. Ce contrôle n'exécute pas Windows.
- Recette obligatoire sur Windows, Android et DHIS2 cible avant production. Consulter docs/COMPLETION_v091.json et les manuels. La présence d'un domaine cPanel ne prouve pas la capacité de l'hébergement à exécuter DHIS2 et APSE.

## Manuels

Les trois manuels Word actualisés sont inclus dans `manuals/` : Kinyarwanda, English et français. Les anciens documents versionnés dans docs/ restent historiques ; cette notice et la mise à jour 0.9.1 des manuels priment pour le démarrage et les nouvelles fonctions.
