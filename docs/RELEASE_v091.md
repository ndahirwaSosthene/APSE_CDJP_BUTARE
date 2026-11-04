# APSE 0.9.1



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

