# CDJP Butare APSE v0.8.0 — local acceptance build

Start with LIRE_AVANT_UTILISATION_RW.md. Download the complete Windows ZIP and its matching INSTALL_APSE_WINDOWS.cmd. The installer extracts all files, checks the archive hash, creates a per-user Desktop shortcut and starts the loopback application. Existing installer-managed v0.7.1 encrypted data is copied consistently without overwriting the original. Native Windows execution remains an acceptance test.

This is the APSE application/service with DHIS2 metadata, not a bundled DHIS2 server. Live DHIS2 authentication, UID bindings, imports and interoperability must be tested on the selected instance before production. Custom MEL collection schemas remain in the APSE service and do not automatically create DHIS2 programs.

The `START_APSE_WINDOWS.cmd` launcher runs local no-auth mode. It stores the local encryption key in `portable_data/no_auth.key` and automatically grants the local MEL identity; do not expose this loopback service beyond the local computer. Existing password-encrypted portable data requires an explicit one-time migration before no-auth mode can use it; no-auth mode will refuse to guess or replace that data.

V0.8 changes:
- UTF-8 transport and stable-code language switching; entered narrative remains in its source language.
- Automatic record/project/program codes; Project, Program, Operations and Other classifications.
- Pastoral dropdowns and calendar controls; year-scoped PS operations; CPJP annual planning only, CDJP annual/quarterly/monthly/weekly formats.
- NISR 2022-source geography: four districts, 51 sectors and 259 cells with multi-selection and metadata editing. Source-defined 101 CCJP entries are retained with parish aliases and the historical Sheke membership conflict flagged. No CEB names or current denominator are invented.
- CPJP Kinyarwanda default, seven committee preparers or two other preparers, specialist/field routing via CPJP committee, complete participant disaggregation and CNV/DNH/trauma/pastoral checks before V8 submission.
- Encrypted versioned working drafts, scoped MEL oversight, encrypted prepared-browser fallback, recoverable draft/record removal, append-only history, no permanent-delete API.
- Responsive layout and optional soft palette. Browser tests use a real local HTTP service at 360px and desktop widths; this does not replace tests on actual Android hardware.

Legacy stored records retain their codes, bodies and review history. The V8 capture profile is enforced for new HTTP/import records; existing legacy records retain their historical validation profile until revised through the application. Autosave is not submission or approval. Browser-only drafts must be sent to the server before a full-server backup includes them. Backups and retention procedures remain necessary.

Build chain: build.py → add_analytics.py → extend_v2.py → finalise_v2.py → extend_v3.py → localise_v3.py → finalise_v3.py → extend_v4.py → extend_v5.py → extend_v6.py → extend_v7.py → extend_v8.py → validate_package.py → package.py. Source-backed registry assets are retained in registers/ and sources/. Never regenerate or replace production data with seed files.
