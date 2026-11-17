# APSE 0.9.0 — release record

2026-11-02. Additive extension over the recovered official 0.8.1 Windows portable package.

- 14 role workspace profiles; six supplied staff directory contacts; provided logo and both organisation charts.
- Server-enforced job form restrictions with unchanged scope checks, sensitive access rules and independent approval workflow. Driver records constrained to the driver owner. Logistics inventory access does not grant accounting access.
- CPJP annual planning only; manual CEB/centrale intake, CPJP digital submission, MEL → Coordinator → Director; collaboration edges grant no approval authority.
- F44 quarterly CPJP result capture with pastoral quarter date validation, F45 restricted released-prisoner identification. Stable existing UIDs; 45 programs/stages, 230 data elements.
- Authenticated collection links with form, unit and AP; private multi-file evidence, explicit report-photo inclusion, record Word export and consented report images.
- Four-language interface labels; French central default and Kinyarwanda parish default. Existing narratives are preserved across language switches.
- Local AI draft assistant/checklist; text assistance requires separately installed Ollama model and MEL enablement. Sensitive case text blocked; human review required.
- Seven encrypted offline test accounts, separate test dataset/launcher, sign out, existing normal portable vault preserved. Private credentials are delivered separately.
- APSE-only Linux Docker/compose deployment adapter, existing systemd/Nginx deployment, read-only deployment preflight.

## Verification evidence

- 195 Python tests passed (docs/tests-v9.txt).
- 2 JavaScript test files passed, including 500 encrypted offline records (docs/js-tests-v9.txt).
- All seven encrypted local test accounts authenticated; config/home/directory/organisation/assistant endpoints returned correct scoped profiles (docs/offline-accounts-v9.txt).
- Metadata UID/reference/type/language validation passed; all Python modules parsed and modified JavaScript syntax checked.
- Package ZIP CRC and extracted manifest checked separately after packaging; see the adjacent archive checksum file.

## Verification limits

The managed browser preview lacked python-docx; visual/browser QA was not completed. Windows runtime execution and Android touch/offline tests were not run on those actual devices. No target DHIS2 server, production host, DNS, TLS certificate, or credentials were supplied; live DHIS2 2.42 import/authentication/publisher sync, production load and restore acceptance remain unverified. Other DHIS2 versions require compatibility review. Docker files were prepared, not built/deployed here. Local AI model was not installed or benchmarked; no claim of an active writing AI is made. Existing source metadata/PS are retained; additional CEB names or revised strategic source files have not been invented. The supplied contacts/channels are preserved as provided, not independently verified public directory data.
