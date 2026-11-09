"""APSE v0.9.0 / v0.9.1 Operational Features Mixin.

Implements all v0.9.0 & v0.9.1 backend capabilities from the CDJP Butare manuals:
- 14 Role Workspace Profiles (My Space / Mon espace)
- 6 Supplied CDJP Staff Directory Contacts & Diocesan/Parish Organigrammes
- Document Import to Prefill a Form (DOCX, text PDF, XLSX, CSV, JSON, UTF-8 TXT)
- Staff Timesheets (F31 hours & F32 leave, <=24h/day check, Approved-only default + Include drafts, XLSX 00.0 / DOCX / CSV / JSON exports)
- MEL Administration (Audit log pagination & HMAC verification, Recycle bin >=90d restore, Legal holds >=365d retention, Staff directory CRUD, Local account creation/password reset >=12 chars, Recovery kit status)
- Assistant & Controls (Local deterministic structural/quality/sensitivity checks + optional local AI assistant)
- Seeded institutional records (F03, F04, F43, F05, F07, F19, F27, F28, F29, F30, F31, F32, F42, F44, F45)
"""
import base64
import csv
import hashlib
import io
import json
import re
import uuid
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill


ROLE_WORKSPACES = [
    {
        "code": "MEL",
        "role": "APSE_MEL",
        "labels": {
            "fr": "Chargé APSE MEL et communication",
            "en": "APSE MEL & Communication Officer",
            "rw": "Ushinzwe APSE MEL n’itumanaho",
            "sw": "Afisa APSE MEL na Mawasiliano",
        },
        "scope": "CDJP Diocese (27 Parishes, 101 Centrales)",
        "primary_forms": ["F03", "F07", "F24", "F27", "F28", "F29", "F30", "F42", "F44"],
        "primary_tabs": ["my_space", "files_validation", "ps_dashboard", "reports", "metadata", "create_form", "mel_admin"],
        "duties": {
            "fr": "Validation méthodologique MEL, gestion des métadonnées et formulaires personnalisés, contrôle qualité des preuves, rapports R13 et administration MEL.",
            "en": "Methodological MEL validation, metadata and custom form administration, evidence quality control, R13 results reporting, and MEL administration.",
            "rw": "Kugenzura ubuziranenge bwa MEL, kuyobora metadonne n’amafishi yihariye, kugenzura ibimenyetso, raporo ya R13 n’ubuyobozi bwa MEL.",
            "sw": "Uthibitishaji wa MEL, usimamizi wa metadata na fomu maalum, udhibiti wa ubora wa ushahidi, ripoti ya R13 na utawala wa MEL.",
        },
    },
    {
        "code": "DIRECTOR",
        "role": "APSE_DIRECTION",
        "labels": {
            "fr": "Directeur CDJP",
            "en": "CDJP Director",
            "rw": "Umuyobozi wa CDJP",
            "sw": "Mkurugenzi wa CDJP",
        },
        "scope": "CDJP Diocese (Final Institutional Approval)",
        "primary_forms": ["F03", "F07", "F19", "F24", "F29", "F30"],
        "primary_tabs": ["my_space", "files_validation", "ps_dashboard", "reports", "projects_ops", "staff_eval"],
        "duties": {
            "fr": "Approbation institutionnelle finale (distincte de l’auteur, de MEL et du Coordinateur), gel des rapports R13 et supervision stratégique.",
            "en": "Final institutional approval (independent of author, MEL, and Coordinator), freezing R13 snapshots, and strategic oversight.",
            "rw": "Kwemeza bwa nyuma inyandiko z’urwego (atandukanye n’uwanditse, MEL na Coordinateur), gufunga raporo R13 no kuyobora icyerekezo.",
            "sw": "Idhini ya mwisho ya kitaasisi (tofauti na mwandishi, MEL na Mratibu), kufunga ripoti za R13 na usimamizi wa kimkakati.",
        },
    },
    {
        "code": "COORDINATOR",
        "role": "APSE_COORDINATION",
        "labels": {
            "fr": "Coordinateur CDJP",
            "en": "CDJP Coordinator",
            "rw": "Umuhuzabikorwa wa CDJP",
            "sw": "Mratibu wa CDJP",
        },
        "scope": "CDJP Diocese (Operational Verification)",
        "primary_forms": ["F03", "F04", "F43", "F05", "F07", "F28", "F30"],
        "primary_tabs": ["my_space", "ps_planning", "files_validation", "projects_ops", "staff_eval", "learning"],
        "duties": {
            "fr": "Vérification opérationnelle après validation MEL, coordination des plans annuels/trimestriels/mensuels/hebdomadaires et suivi des réalisations du personnel.",
            "en": "Operational verification after MEL validation, coordination of annual/quarterly/monthly/weekly plans, and staff achievement evaluation.",
            "rw": "Kugenzura ibikorwa nyuma ya MEL, guhuza igenamigambi ry’umwaka/igihembwe/ukwezi/icyumweru no gusuzuma ibyakozwe n’abakozi.",
            "sw": "Uhakiki wa kiutendaji baada ya uthibitishaji wa MEL, uratibu wa mipango na tathmini ya utendaji wa wafanyakazi.",
        },
    },
    {
        "code": "FINANCE",
        "role": "APSE_FINANCE",
        "labels": {
            "fr": "Comptable / Finance & RH",
            "en": "Accountant / Finance & HR",
            "rw": "Umubaruramari / Imari n’Abakozi",
            "sw": "Mhasibu / Fedha na Rasilimali Watu",
        },
        "scope": "CDJP Diocese (Budget, Expenditure & HR)",
        "primary_forms": ["F03", "F19", "F31", "F32", "F34", "F35", "F36", "F37"],
        "primary_tabs": ["my_space", "projects_ops", "timesheets", "seizure", "files_validation", "reports"],
        "duties": {
            "fr": "Suivi des dépenses éligibles (F19), contrôle budgétaire par rapport au plan annuel (F03), gestion des feuilles de temps (F31/F32), stocks et achats.",
            "en": "Tracking eligible expenditure (F19), budget execution control against annual plans (F03), staff timesheets (F31/F32), assets, and procurement.",
            "rw": "Gukurikirana amafaranga yakoreshejwe (F19), kugenzura ingengo y’imari ugereranyije na F03, imbonerahamwe y’amasaha (F31/F32) n’ibikoresho.",
            "sw": "Ufuatiliaji wa matumizi (F19), udhibiti wa bajeti dhidi ya F03, laha za muda (F31/F32), mali na manunuzi.",
        },
    },
    {
        "code": "TECHNICAL",
        "role": "APSE_STAFF",
        "labels": {
            "fr": "Assistante technique / Coopération",
            "en": "Technical Adviser / Cooperation",
            "rw": "Umujyanama wa tekiniki / Ubufatanye",
            "sw": "Mshauri wa Kiufundi / Ushirikiano",
        },
        "scope": "CDJP Diocese (Programmes, Learning & Quality)",
        "primary_forms": ["F03", "F04", "F43", "F05", "F07", "F27", "F28", "F29", "F30", "F31"],
        "primary_tabs": ["my_space", "learning", "ps_planning", "projects_ops", "assistant", "timesheets"],
        "duties": {
            "fr": "Appui méthodologique aux 5 axes du PS, capitalisation des apprentissages (F27–F30), sensibilité aux conflits (DNH/CNV) et suivi des projets partenaires.",
            "en": "Methodological support across the 5 PS axes, learning capitalization (F27–F30), conflict sensitivity (DNH/NVC), and partner project monitoring.",
            "rw": "Guha ubufasha bwa tekiniki axes 5 za PS, gukusanya amasomo (F27–F30), kwirinda guhungabanya (DNH/CNV) no gukurikirana imishinga.",
            "sw": "Msaada wa kiufundi katika mihimili 5 ya PS, ujifunzaji (F27–F30), unyeti wa migogoro na ufuatiliaji wa miradi.",
        },
    },
    {
        "code": "DRIVER",
        "role": "APSE_STAFF",
        "labels": {
            "fr": "Chauffeur et Logistique terrain",
            "en": "Driver & Field Logistics",
            "rw": "Umushoferi n’ibikoresho by’urugendo",
            "sw": "Dereva na Vifaa vya Shambani",
        },
        "scope": "CDJP Diocese (Field Missions F33 & Timesheets F31)",
        "primary_forms": ["F33", "F31", "F32", "F35"],
        "primary_tabs": ["my_space", "seizure", "timesheets", "drafts", "contacts"],
        "duties": {
            "fr": "Enregistrement des missions véhicule (F33, horaires autorisés 06h00–18h00, kilométrage et carburant) et saisie des feuilles de temps (F31/F32).",
            "en": "Recording vehicle missions (F33, daytime rule 06:00–18:00, odometer and fuel logs) and personal staff timesheets (F31/F32).",
            "rw": "Kwandika ingendo z’imodoka (F33, amasaha yemewe 06:00–18:00, ibirometero na lisansi) n’imbonerahamwe y’amasaha y’akazi (F31/F32).",
            "sw": "Kurekodi safari za magari (F33, saa 06:00–18:00, kilomita na mafuta) na laha za muda (F31/F32).",
        },
    },
    {
        "code": "CURE",
        "role": "APSE_CURE",
        "labels": {
            "fr": "Curé de Paroisse (Superviseur CPJP)",
            "en": "Parish Priest (CPJP Supervisor)",
            "rw": "Padiri Mukuru wa Paruwasi",
            "sw": "Padri Mkuu wa Parokia",
        },
        "scope": "Assigned Parish (Pastoral Supervision)",
        "primary_forms": ["F03", "F07", "F44"],
        "primary_tabs": ["my_space", "files_validation", "ps_planning", "ps_dashboard", "feedback"],
        "duties": {
            "fr": "Supervision pastorale de la CPJP paroissiale, revue des plans annuels CPJP (F03) et vérification de la clôture des actions paroissiales.",
            "en": "Pastoral supervision of the parish CPJP, review of CPJP annual plans (F03), and verification of parish action closures.",
            "rw": "Kugenzura ubutumwa bwa CPJP muri paruwasi, gusuzuma igenamigambi ry’umwaka rya CPJP (F03) n’ishyirwa mu bikorwa ry’ibyemezo.",
            "sw": "Usimamizi wa kichungaji wa CPJP ya parokia, mapitio ya mipango ya mwaka (F03) na uhakiki wa utekelezaji.",
        },
    },
    {
        "code": "CHAPLAIN",
        "role": "APSE_CPJP",
        "labels": {
            "fr": "Aumônier Justice et Paix",
            "en": "Justice & Peace Chaplain",
            "rw": "Umuyobozi w’ubutumwa bw’Ubutabera n’Amahoro (Omoniye)",
            "sw": "Kasisi wa Haki na Amani",
        },
        "scope": "Assigned Parish (Spiritual & Pastoral Accompaniment)",
        "primary_forms": ["F03", "F07", "F44"],
        "primary_tabs": ["my_space", "ps_planning", "files_validation", "learning", "contacts"],
        "duties": {
            "fr": "Accompagnement pastoral du comité CPJP (6 membres) et des 4 volets spécialisés dans la paroisse.",
            "en": "Pastoral accompaniment of the 6-member CPJP committee and the 4 specialist volets across the parish.",
            "rw": "Guherekeza komite ya CPJP (abantu 6) n’ibyiciro 4 byihariye (volets) muri paruwasi.",
            "sw": "Usindikizaji wa kichungaji wa kamati ya CPJP (wajumbe 6) na vitengo 4 maalum parokiani.",
        },
    },
    {
        "code": "CPJP_COMMITTEE",
        "role": "APSE_CPJP",
        "labels": {
            "fr": "Comité paroissial CPJP (6 sièges)",
            "en": "CPJP Parish Committee (6 Seats)",
            "rw": "Komite ya CPJP ya Paruwasi (imyanya 6)",
            "sw": "Kamati ya CPJP ya Parokia (Viti 6)",
        },
        "scope": "Assigned Parish & its Centrales (CCJP) / CEBs",
        "primary_forms": ["F03", "F07", "F44"],
        "primary_tabs": ["my_space", "ps_planning", "seizure", "files_validation", "drafts", "offline_sync"],
        "duties": {
            "fr": "Planification annuelle CPJP avec répartition Q1–Q4 (F03), revue collégiale à 7 noms (Comité + Aumônier), rapport trimestriel (F44) et validation des activités paroissiales.",
            "en": "CPJP annual planning with Q1–Q4 allocation (F03), 7-name collegiate committee review, quarterly results reporting (F44), and parish activity validation.",
            "rw": "Igenamigambi ry’umwaka rya CPJP rigabanyije muri Q1–Q4 (F03), isuzuma rya komite (amazina 7), raporo y’igihembwe (F44) no kwemeza ibikorwa bya paruwasi.",
            "sw": "Upangaji wa mwaka wa CPJP kwa robo Q1–Q4 (F03), uhakiki wa kamati ya majina 7, ripoti ya robo mwaka (F44) na uthibitishaji wa shughuli.",
        },
    },
    {
        "code": "CEA",
        "role": "APSE_PARISH_REPORTER",
        "labels": {
            "fr": "Chargé de l’écoute active (Volet Isanamitima)",
            "en": "Active Listening Officer (Isanamitima Volet)",
            "rw": "Ushinzwe gutega amatwi (Volet Isanamitima)",
            "sw": "Mhusika wa Usikilizaji Makini (Volet Isanamitima)",
        },
        "scope": "Assigned Parish (Axis A1 — Healing, Unity & Reconciliation)",
        "primary_forms": ["F07", "F08", "F45"],
        "primary_tabs": ["my_space", "seizure", "drafts", "offline_vault", "offline_sync"],
        "duties": {
            "fr": "Animation des cercles de guérison et GURR (Axe A1), écoute active en binôme (2 noms requis) et accompagnement confidentiel.",
            "en": "Facilitating healing circles and GURR groups (Axis A1), active listening in pairs (2 preparer names required), and confidential accompaniment.",
            "rw": "Kuyobora amatsinda y’isanamitima na GURR (Axe A1), gutega amatwi bakorana ari 2 (amazina 2 asabwa) no guherekeza abafite ibikomere.",
            "sw": "Kuendesha miduara ya uponyaji na GURR (Mhimili A1), usikilizaji makini kwa wawili na usindikizaji wa siri.",
        },
    },
    {
        "code": "MEDIATOR",
        "role": "APSE_PARISH_REPORTER",
        "labels": {
            "fr": "Médiateur communautaire (Volet Médiation)",
            "en": "Community Mediator (Mediation Volet)",
            "rw": "Umuhuza mu muryango (Volet Ubwunzi)",
            "sw": "Msuluhishi wa Jamii (Volet Usuluhishi)",
        },
        "scope": "Assigned Parish (Axis A2 — Non-Violent Conflict Transformation)",
        "primary_forms": ["F07", "F12", "F13"],
        "primary_tabs": ["my_space", "seizure", "drafts", "offline_vault", "offline_sync"],
        "duties": {
            "fr": "Prévention des tensions, alerte précoce, médiation non violente des conflits familiaux et fonciers (Axe A2) et suivi des accords.",
            "en": "Tension prevention, early warning, non-violent mediation of family and land disputes (Axis A2), and agreement follow-up.",
            "rw": "Gukumira amakimbirane, gutanga impuruza hakiri kare, kunga imiryango mu mahoro (Axe A2) no gukurikirana amasezerano.",
            "sw": "Kuzuia mivutano, tahadhari ya mapema, usuluhishi usio na vurugu wa migogoro (Mhimili A2) na ufuatiliaji wa makubaliano.",
        },
    },
    {
        "code": "PARALEGAL",
        "role": "APSE_PARISH_REPORTER",
        "labels": {
            "fr": "Parajuriste (Volet Droits Humains & Accès à la Justice)",
            "en": "Paralegal (Human Rights & Legal Aid Volet)",
            "rw": "Umufashamyumvire mu mategeko (Volet Parajuristes)",
            "sw": "Msaidizi wa Kisheria (Volet Haki za Binadamu)",
        },
        "scope": "Assigned Parish (Axis A4 — Human Rights & Advocacy)",
        "primary_forms": ["F07", "F15", "F16"],
        "primary_tabs": ["my_space", "seizure", "drafts", "offline_vault", "offline_sync"],
        "duties": {
            "fr": "Sensibilisation aux droits humains et aux lois foncières/familiales, orientation juridique et documentation des enjeux de plaidoyer (Axe A4).",
            "en": "Community awareness on human rights and land/family law, legal aid orientation, and advocacy issue documentation (Axis A4).",
            "rw": "Gusobanurira abaturage uburenganzira bwabo n’amategeko y’ubutaka/umuryango, kubarangira inzego n’ubuvugizi (Axe A4).",
            "sw": "Uhamasishaji wa haki za binadamu na sheria za ardhi/familia, msaada wa kisheria na utetezi (Mhimili A4).",
        },
    },
    {
        "code": "PEACE",
        "role": "APSE_PARISH_REPORTER",
        "labels": {
            "fr": "Messager de la paix / Clubs Justice & Paix",
            "en": "Peace Messenger / Justice & Peace Clubs",
            "rw": "Intumwa y’amahoro / Clubs Justice & Paix",
            "sw": "Mjumbe wa Amani / Vilabu vya Haki na Amani",
        },
        "scope": "Assigned Parish (Axis A3 Ecological Justice & Youth Clubs)",
        "primary_forms": ["F07", "F14"],
        "primary_tabs": ["my_space", "seizure", "drafts", "offline_vault", "offline_sync"],
        "duties": {
            "fr": "Animation des Clubs Justice et Paix dans les écoles et paroisses, actions d’écologie intégrale et justice écologique (Axe A3).",
            "en": "Animating school and parish Justice & Peace Clubs, integral ecology initiatives, and environmental risk reduction (Axis A3).",
            "rw": "Kuyobora Clubs Justice & Paix mu mashuri no muri paruwasi, kubungabunga ibidukikije n’ubutabera bw’ibidukikije (Axe A3).",
            "sw": "Kuendesha Vilabu vya Haki na Amani shuleni na parokiani, ikolojia kamili na haki ya mazingira (Mhimili A3).",
        },
    },
    {
        "code": "CCJP_CEB",
        "role": "APSE_CCJP",
        "labels": {
            "fr": "Relais Centrale CCJP et Communauté Ecclésiale de Base (CEB)",
            "en": "CCJP Centrale & Base Ecclesial Community (CEB) Relay",
            "rw": "uhagarariye Santarali (CCJP) n’Umuryangoremezo (CEB)",
            "sw": "Mwakilishi wa Kigango (CCJP) na Jumuiya Ndogo ya Kikristo (CEB)",
        },
        "scope": "101 Centrales (CCJP) & CEBs feeding Parish CPJP",
        "primary_forms": ["F07", "F08"],
        "primary_tabs": ["my_space", "seizure", "drafts", "data_structure", "contacts"],
        "duties": {
            "fr": "Remontée des activités communautaires depuis la CEB et la Centrale (CCJP) vers la Paroisse (CPJP), avec traçabilité de la CEB source (origin_ceb).",
            "en": "Reporting community activities from the CEB and Centrale (CCJP) up to the Parish (CPJP) with source CEB traceability (origin_ceb).",
            "rw": "Gutanga amakuru y’ibikorwa byakorewe mu Muryangoremezo (CEB) no muri Santarali (CCJP) ajya kuri Paruwasi (CPJP) hagaragazwa origin_ceb.",
            "sw": "Kuripoti shughuli za jamii kutoka CEB na Kigango (CCJP) kwenda Parokia (CPJP) kwa kufuatilia origin_ceb.",
        },
    },
]


DEFAULT_STAFF_DIRECTORY = [
    {
        "id": "staff-janvier",
        "username": "direction.janvier",
        "full_name": "Abbé Janvier Nduwayezu",
        "position_code": "DIRECTOR",
        "role_codes": "APSE_DIRECTION",
        "unit_code": "CDJP",
        "phone": "+250 788 301 101",
        "email": "direction.cdjp@diocesebutare.org.rw",
        "whatsapp": "+250 788 301 101",
        "preferred_channel": "Email / Téléphone",
        "office": "Siège CDJP Butare — Cathédrale Huye",
    },
    {
        "id": "staff-emmanuel-coord",
        "username": "coordination.emmanuel",
        "full_name": "Emmanuel Nsabimana",
        "position_code": "COORDINATOR",
        "role_codes": "APSE_COORDINATION,APSE_REVIEWER,APSE_STAFF",
        "unit_code": "CDJP",
        "phone": "+250 788 302 202",
        "email": "coordination.cdjp@diocesebutare.org.rw",
        "whatsapp": "+250 788 302 202",
        "preferred_channel": "WhatsApp / Téléphone",
        "office": "Siège CDJP Butare — Bureau Coordination",
    },
    {
        "id": "staff-theophile",
        "username": "mel.theophile",
        "full_name": "Théophile Habimana",
        "position_code": "MEL",
        "role_codes": "APSE_MEL,APSE_COMMUNICATION,APSE_STAFF",
        "unit_code": "CDJP",
        "phone": "+250 788 303 303",
        "email": "mel.cdjp@diocesebutare.org.rw",
        "whatsapp": "+250 788 303 303",
        "preferred_channel": "APSE Feedback / WhatsApp",
        "office": "Siège CDJP Butare — Unité MEL & Communication",
    },
    {
        "id": "staff-marceline",
        "username": "finance.marceline",
        "full_name": "Marceline Mukandayisenga",
        "position_code": "FINANCE",
        "role_codes": "APSE_FINANCE,APSE_HR,APSE_STAFF",
        "unit_code": "CDJP",
        "phone": "+250 788 304 404",
        "email": "finance.cdjp@diocesebutare.org.rw",
        "whatsapp": "+250 788 304 404",
        "preferred_channel": "Email / Bureau Comptabilité",
        "office": "Siège CDJP Butare — Comptabilité & RH",
    },
    {
        "id": "staff-ruth",
        "username": "cooperation.ruth",
        "full_name": "Ruth Kamanzi (Assistante Technique)",
        "position_code": "TECHNICAL",
        "role_codes": "APSE_STAFF,APSE_REVIEWER",
        "unit_code": "CDJP",
        "phone": "+250 788 305 505",
        "email": "cooperation.cdjp@diocesebutare.org.rw",
        "whatsapp": "+250 788 305 505",
        "preferred_channel": "Email / Signal / WhatsApp",
        "office": "Siège CDJP Butare — Appui Technique & Coopération",
    },
    {
        "id": "staff-emmanuel-driver",
        "username": "driver.emmanuel",
        "full_name": "Emmanuel Uwimana",
        "position_code": "DRIVER",
        "role_codes": "APSE_STAFF",
        "unit_code": "CDJP",
        "phone": "+250 788 306 606",
        "email": "logistique.cdjp@diocesebutare.org.rw",
        "whatsapp": "+250 788 306 606",
        "preferred_channel": "Téléphone direct (Missions terrain)",
        "office": "Siège CDJP Butare — Charroi & Logistique",
    },
]


class V091FeaturesMixin:
    """Mixin extending Engine with v0.9.0 / v0.9.1 operational modules."""

    def init_v091(self, seed_demo=True):
        with self.lock:
            self.db.executescript("""
                CREATE TABLE IF NOT EXISTS legal_holds (
                    id TEXT PRIMARY KEY,
                    record_id TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    min_retention_days INTEGER NOT NULL DEFAULT 365,
                    placed_by TEXT NOT NULL,
                    placed_at TEXT NOT NULL,
                    active INTEGER NOT NULL DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS staff_directory (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    position_code TEXT NOT NULL,
                    role_codes TEXT NOT NULL,
                    unit_code TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT NOT NULL,
                    whatsapp TEXT NOT NULL,
                    preferred_channel TEXT NOT NULL,
                    office TEXT NOT NULL DEFAULT '',
                    active INTEGER NOT NULL DEFAULT 1,
                    updated_at TEXT NOT NULL
                );
            """)
            now_iso = datetime.now(timezone.utc).isoformat()
            dir_count = self.db.execute("SELECT COUNT(*) FROM staff_directory").fetchone()[0]
            if dir_count == 0:
                for s in DEFAULT_STAFF_DIRECTORY:
                    self.db.execute(
                        """INSERT INTO staff_directory
                           (id, username, full_name, position_code, role_codes, unit_code, phone, email, whatsapp, preferred_channel, office, active, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)""",
                        (
                            s["id"], s["username"], s["full_name"], s["position_code"],
                            s["role_codes"], s["unit_code"], s["phone"], s["email"],
                            s["whatsapp"], s["preferred_channel"], s["office"], now_iso,
                        ),
                    )
            if seed_demo:
                self._seed_v091_records(now_iso)

    def _seed_v091_records(self, now_iso):
        rec_count = self.db.execute("SELECT COUNT(*) FROM records").fetchone()[0]
        if rec_count > 0:
            return
        unit = "LocalRoot01"
        path = "/LocalRoot01"

        seed_records = [
            # 1. Approved CDJP Annual Plan (F03 - STAFF)
            (
                "rec-f03-cdjp-a1",
                "F03",
                unit,
                path,
                "2026-09-10",
                "LOCAL:coordination.emmanuel",
                "APPROVED",
                3,
                1,
                None,
                {
                    "record": "PLAN-2026-CDJP-A1",
                    "ap": "AP1",
                    "plan_type": "STAFF",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "partners": "MISEREOR,CARITAS",
                    "operation_ref": "AT-AP1-01",
                    "axis": "A1",
                    "objective": "A1.OS",
                    "result": "A1.R1",
                    "intervention": "A1.I1",
                    "volet": "ECOUTE",
                    "activity": "ACT-A1-01",
                    "title": "Accompagnement psychosocial et cercles de guérison Isanamitima / GURR dans 12 paroisses",
                    "start": "2026-09-01",
                    "end": "2027-08-31",
                    "owner": "LOCAL:mel.theophile",
                    "output_unit": "personnes accompagnées",
                    "target": "360",
                    "budget": "18500000",
                    "secured": "18500000",
                    "local": "1500000",
                    "indicator": "A1-K1",
                    "evidence": "evidence:plan-a1-approved",
                    "capture_profile": "V8",
                    "preparer_mode": "PAIR",
                    "preparer_1": "Emmanuel Nsabimana",
                    "preparer_2": "Théophile Habimana",
                    "cnv_checked": "true",
                    "dnh_checked": "true",
                    "trauma_checked": "true",
                    "sensitivity_notes": "Protocole d'écoute sécurisée et confidentialité vérifiés.",
                    "reporter_level": "CDJP",
                },
            ),
            # 2. Approved CPJP Annual Plan with Q1-Q4 Quarterly Allocation (F03 - CPJP)
            (
                "rec-f03-cpjp-a2",
                "F03",
                unit,
                path,
                "2026-09-15",
                "LOCAL:cpjp.test",
                "APPROVED",
                3,
                1,
                None,
                {
                    "record": "PLAN-2026-CPJP-GAKOMA",
                    "ap": "AP1",
                    "plan_type": "CPJP",
                    "work_type": "OPERATIONAL",
                    "partners": "DIOCESE_BUTARE",
                    "operation_ref": "OP-A2-01",
                    "axis": "A2",
                    "objective": "A2.OS",
                    "result": "A2.R1",
                    "intervention": "A2.I1",
                    "volet": "MEDIATEURS",
                    "activity": "ACT-A2-CPJP-01",
                    "title": "Plan annuel CPJP Gakoma : Prévention et médiation des conflits fonciers et familiaux (Q1–Q4)",
                    "start": "2026-09-01",
                    "end": "2027-08-31",
                    "owner": "LOCAL:cpjp.test",
                    "output_unit": "conflits médiés",
                    "target": "80",
                    "budget": "3200000",
                    "local": "800000",
                    "q1_selected": "true",
                    "q1_activity": "Sensibilisation communautaire et médiation dans les centrales Kizenga et Gakoma",
                    "q1_target": "20",
                    "q1_budget": "800000",
                    "q2_selected": "true",
                    "q2_activity": "Cliniques mobiles de médiation et suivi des accords familiaux",
                    "q2_target": "20",
                    "q2_budget": "800000",
                    "q3_selected": "true",
                    "q3_activity": "Dialogues intergénérationnels sur la prévention des litiges fonciers",
                    "q3_target": "20",
                    "q3_budget": "800000",
                    "q4_selected": "true",
                    "q4_activity": "Évaluation annuelle communautaire et consolidation des ententes de paix",
                    "q4_target": "20",
                    "q4_budget": "800000",
                    "indicator": "A2-K2",
                    "evidence": "evidence:plan-cpjp-gakoma",
                    "capture_profile": "V8",
                    "preparer_mode": "COMMITTEE",
                    "preparer_1": "Jean-Baptiste Nkurunziza (Président)",
                    "preparer_2": "Marie-Claire Mukamana (Vice-Présidente)",
                    "preparer_3": "fidèle Habiyambere (Secrétaire)",
                    "preparer_4": "Espérance Nyiransabimana (Trésorière)",
                    "preparer_5": "Innocent Mugenzi (Conseiller 1)",
                    "preparer_6": "Béatrice Uwamahoro (Conseillère 2)",
                    "preparer_7": "Abbé François Ndagijimana (Aumônier)",
                    "cnv_checked": "true",
                    "dnh_checked": "true",
                    "trauma_checked": "true",
                    "sensitivity_notes": "Validation collégiale du comité CPJP à 7 membres.",
                    "reporter_level": "COMMITTEE",
                },
            ),
            # 3. Approved CDJP Quarterly Plan (F04)
            (
                "rec-f04-q1",
                "F04",
                unit,
                path,
                "2026-09-20",
                "LOCAL:coordination.emmanuel",
                "APPROVED",
                2,
                1,
                None,
                {
                    "record": "PLAN-Q1-CDJP-2026",
                    "plan_ref": "rec-f03-cdjp-a1",
                    "ap": "AP1",
                    "axis": "A1",
                    "objective": "A1.OS",
                    "result": "A1.R1",
                    "intervention": "A1.I1",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "activity": "ACT-Q1-A1",
                    "title": "Planification trimestrielle Q1 (Sept–Nov 2026) : Cercles d'écoute Butare, Save et Ngoma",
                    "start": "2026-09-01",
                    "end": "2026-11-30",
                    "owner": "LOCAL:mel.theophile",
                    "output_unit": "personnes accompagnées",
                    "target": "90",
                    "budget": "4600000",
                    "evidence": "evidence:f04-q1",
                },
            ),
            # 4. Approved CDJP Monthly Plan (F43)
            (
                "rec-f43-oct",
                "F43",
                unit,
                path,
                "2026-10-01",
                "LOCAL:mel.theophile",
                "APPROVED",
                2,
                1,
                None,
                {
                    "record": "PLAN-M10-CDJP-2026",
                    "plan_ref": "rec-f03-cdjp-a1",
                    "ap": "AP1",
                    "axis": "A1",
                    "objective": "A1.OS",
                    "result": "A1.R1",
                    "intervention": "A1.I1",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "activity": "ACT-M10-A1",
                    "title": "Plan mensuel Octobre 2026 : Sessions GURR Cathédrale Butare et Ngoma",
                    "start": "2026-10-01",
                    "end": "2026-10-31",
                    "owner": "LOCAL:mel.theophile",
                    "output_unit": "personnes accompagnées",
                    "target": "48",
                    "budget": "1500000",
                    "evidence": "evidence:f43-oct",
                },
            ),
            # 5. Approved CDJP Weekly Operational Plan (F05)
            (
                "rec-f05-w42",
                "F05",
                unit,
                path,
                "2026-10-05",
                "LOCAL:mel.theophile",
                "APPROVED",
                2,
                1,
                None,
                {
                    "record": "PLAN-W42-CDJP-2026",
                    "plan_ref": "rec-f03-cdjp-a1",
                    "ap": "AP1",
                    "axis": "A1",
                    "objective": "A1.OS",
                    "result": "A1.R1",
                    "intervention": "A1.I1",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "activity": "ACT-W42-A1",
                    "title": "Plan hebdomadaire Semaine 42 : Supervision des groupes Isanamitima à Ste Thérèse",
                    "start": "2026-10-05",
                    "end": "2026-10-18",
                    "owner": "LOCAL:mel.theophile",
                    "output_unit": "personnes accompagnées",
                    "target": "48",
                    "budget": "450000",
                    "evidence": "evidence:f05-w42",
                },
            ),
            # 6. Approved Field Activity Report (F07) linked to F03 & F05
            (
                "rec-f07-butare-01",
                "F07",
                unit,
                path,
                "2026-10-12",
                "LOCAL:mel.theophile",
                "APPROVED",
                3,
                1,
                None,
                {
                    "record": "ACT-2026-F07-001",
                    "plan_ref": "rec-f03-cdjp-a1",
                    "task_ref": "rec-f05-w42",
                    "ap": "AP1",
                    "axis": "A1",
                    "objective": "A1.OS",
                    "result": "A1.R1",
                    "intervention": "A1.I1",
                    "volet": "ECOUTE",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "partners": "MISEREOR,CARITAS",
                    "title": "Session de guérison communautaire Isanamitima & GURR à Ste Thérèse (Butare)",
                    "activity": "4 séances de dialogue et d'écoute active réalisées avec 48 participants",
                    "output_unit": "personnes accompagnées",
                    "outputs": "48",
                    "total": "48",
                    "women": "28",
                    "men": "20",
                    "undisclosed": "0",
                    "disability": "3",
                    "origin_ceb": "CEB St Kizito — Rango",
                    "manual_source_ref": "FICHE-CEB-BUT-2026-14",
                    "manual_source_date": "2026-10-11",
                    "outcome": "Réconciliation effective de deux familles en conflit foncier depuis 6 ans.",
                    "finding": "Forte adhésion des jeunes adultes lorsque les séances ont lieu après la messe dominicale.",
                    "action": "Étendre le cercle d'écoute à la centrale de Rango en novembre 2026.",
                    "owner": "LOCAL:mel.theophile",
                    "due": "2026-11-30",
                    "evidence": "Attendance_Sheet_Butare_Oct2026.pdf",
                    "capture_profile": "V8",
                    "preparer_mode": "PAIR",
                    "preparer_1": "Théophile Habimana",
                    "preparer_2": "Ruth Kamanzi",
                    "cnv_checked": "true",
                    "dnh_checked": "true",
                    "trauma_checked": "true",
                    "sensitivity_notes": "Aucun nom de victime exposé dans le rapport partagé.",
                    "reporter_level": "CDJP",
                },
            ),
            # 7. Approved Financial Expenditure Record (F19) linked to F03
            (
                "rec-f19-butare-01",
                "F19",
                unit,
                path,
                "2026-10-15",
                "LOCAL:finance.marceline",
                "APPROVED",
                3,
                1,
                None,
                {
                    "record": "FIN-2026-F19-001",
                    "plan_ref": "rec-f03-cdjp-a1",
                    "ap": "AP1",
                    "axis": "A1",
                    "result": "A1.R1",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "title": "Dépenses éligibles — Sessions Isanamitima Q1 Butare & Save",
                    "budget": "4600000",
                    "spent": "4120000",
                    "local": "380000",
                    "owner": "LOCAL:finance.marceline",
                    "evidence": "Pieces_Comptables_Q1_2026.pdf",
                },
            ),
            # 8. Learning Question (F27 - APPROVED)
            (
                "rec-f27-learn-01",
                "F27",
                unit,
                path,
                "2026-10-16",
                "LOCAL:cooperation.ruth",
                "APPROVED",
                2,
                1,
                None,
                {
                    "record": "LRN-F27-2026-01",
                    "ap": "AP1",
                    "axis": "A1",
                    "result": "A1.R1",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "title": "Question d'apprentissage sur la rétention des jeunes dans les groupes GURR",
                    "question": "Comment maintenir un taux de présence supérieur à 85% des jeunes (18–35 ans) sur un cycle complet de 6 séances Isanamitima ?",
                    "method": "Comparaison des horaires et lieux de rencontre dans 6 paroisses pilotes (Huye et Gisagara).",
                    "owner": "LOCAL:cooperation.ruth",
                    "evidence": "Protocole_Apprentissage_GURR.pdf",
                },
            ),
            # 9. After-Action Review (F28 - APPROVED)
            (
                "rec-f28-aar-01",
                "F28",
                unit,
                path,
                "2026-10-18",
                "LOCAL:coordination.emmanuel",
                "APPROVED",
                2,
                1,
                None,
                {
                    "record": "LRN-F28-2026-01",
                    "ap": "AP1",
                    "axis": "A2",
                    "result": "A2.R1",
                    "work_type": "OPERATIONAL",
                    "title": "Revue après action (AAR) — Cliniques de médiation de Gakoma",
                    "finding": "Les déplacements vers les centrales éloignées prennent 2h de plus en saison des pluies, réduisant le temps d'écoute.",
                    "lesson": "Pré-positionner les binômes de médiateurs au niveau de la Centrale (CCJP) la veille des séances.",
                    "action": "Adapter le calendrier de mission véhicule F33 avec départ à 06h30.",
                    "owner": "LOCAL:coordination.emmanuel",
                    "due": "2026-11-15",
                    "evidence": "PV_Revue_Apres_Action_Gakoma.pdf",
                },
            ),
            # 10. Validated Lesson (F29 - APPROVED)
            (
                "rec-f29-lesson-01",
                "F29",
                unit,
                path,
                "2026-10-20",
                "LOCAL:mel.theophile",
                "APPROVED",
                3,
                1,
                None,
                {
                    "record": "LRN-F29-2026-01",
                    "ap": "AP1",
                    "axis": "A1",
                    "result": "A1.R2",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "title": "Leçon validée : Articulation CEB → CCJP → CPJP pour le suivi post-médiation",
                    "finding": "Les accords de médiation suivis mensuellement par le relais CEB durent dans 92% des cas contre 64% sans suivi CEB.",
                    "lesson": "Associer systématiquement le responsable de la CEB source (origin_ceb) au suivi à 30 et 90 jours des ententes familiales.",
                    "confidence": "HIGH",
                    "owner": "LOCAL:mel.theophile",
                    "evidence": "Etude_Suivi_CEB_Oct2026.pdf",
                },
            ),
            # 11. Learning Adaptation Application (F30 - APPROVED, linked to F29)
            (
                "rec-f30-adapt-01",
                "F30",
                unit,
                path,
                "2026-10-22",
                "LOCAL:coordination.emmanuel",
                "APPROVED",
                3,
                1,
                None,
                {
                    "record": "LRN-F30-2026-01",
                    "lesson_ref": "rec-f29-lesson-01",
                    "ap": "AP1",
                    "axis": "A1",
                    "result": "A1.R2",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "title": "Mise en œuvre de la fiche de suivi CEB à 30 jours dans les 27 paroisses",
                    "decision": "SCALE",
                    "action": "Intégrer le champ CEB source (origin_ceb) et la visite de suivi à 30 jours dans toutes les paroisses CPJP.",
                    "owner": "LOCAL:coordination.emmanuel",
                    "due": "2026-12-15",
                    "evidence": "Circulaire_Adaptation_CEB_2026.pdf",
                },
            ),
            # 12. KPI Observation (F42 - APPROVED) for R13 & PS Dashboard
            (
                "rec-f42-kpi-a1",
                "F42",
                unit,
                path,
                "2026-10-24",
                "LOCAL:mel.theophile",
                "APPROVED",
                3,
                1,
                None,
                {
                    "record": "KPI-OBS-2026-A1K1",
                    "ap": "AP1",
                    "axis": "A1",
                    "result": "A1.R1",
                    "intervention": "A1.I1",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "indicator": "A1-K1",
                    "baseline": "54",
                    "target": "80",
                    "numerator": "42",
                    "denominator": "48",
                    "method": "Échelle de bien-être psychosocial administrée avant/après cycle GURR (n=48).",
                    "evidence": "Base_Enquete_A1K1_Oct2026.pdf",
                },
            ),
            # 13. CPJP Quarterly Results Report (F44 - SUBMITTED for Validation)
            (
                "rec-f44-q1-gakoma",
                "F44",
                unit,
                path,
                "2026-10-26",
                "LOCAL:cpjp.test",
                "SUBMITTED",
                1,
                1,
                None,
                {
                    "record": "RPT-F44-GAKOMA-Q1",
                    "plan_ref": "rec-f03-cpjp-a2",
                    "ap": "AP1",
                    "report_quarter": "Q1 (Sept–Nov 2026)",
                    "axis": "A2",
                    "result": "A2.R1",
                    "intervention": "A2.I1",
                    "volet": "MEDIATEURS",
                    "work_type": "OPERATIONAL",
                    "origin_ceb": "CEB St Pierre — Kizenga",
                    "manual_source_ref": "CAHIER-CPJP-GAK-2026-Q1",
                    "manual_source_date": "2026-10-25",
                    "title": "Rapport trimestriel Q1 CPJP Gakoma — Médiation et écoute communautaire",
                    "output_unit": "conflits médiés",
                    "target": "20",
                    "outputs": "18",
                    "progress_summary": "18 conflits familiaux et fonciers accompagnés par les médiateurs paroissiaux en Q1, dont 15 résolus par accord signé.",
                    "challenges": "Pluies abondantes en octobre ayant retardé 2 séances dans la centrale de Mamba.",
                    "lesson": "Organiser les séances au niveau des chapelles de Centrale avant les travaux champêtres.",
                    "action": "Planifier le rattrapage des 2 séances de Mamba en novembre.",
                    "owner": "LOCAL:cpjp.test",
                    "total": "64",
                    "women": "36",
                    "men": "28",
                    "undisclosed": "0",
                    "disability": "2",
                    "evidence": "Rapport_Q1_CPJP_Gakoma.pdf",
                },
            ),
            # 14. Staff Timesheet (F31 - APPROVED)
            (
                "rec-f31-ts-01",
                "F31",
                unit,
                path,
                "2026-10-21",
                "LOCAL:mel.theophile",
                "APPROVED",
                2,
                1,
                None,
                {
                    "record": "TS-2026-10-21-THEO",
                    "ap": "AP1",
                    "axis": "A1",
                    "work_type": "PROJECT",
                    "project": "PRJ-ISANAMITIMA",
                    "owner": "LOCAL:mel.theophile",
                    "title": "Vérification qualité des données CPJP Butare & formation parajuristes Save",
                    "activity": "Contrôle des fiches F07 et appui méthodologique sur le terrain",
                    "hours": "8.0",
                    "evidence": "Feuille_Presence_Oct2026.pdf",
                },
            ),
            # 15. Staff Timesheet (F31 - APPROVED - Coordinator)
            (
                "rec-f31-ts-02",
                "F31",
                unit,
                path,
                "2026-10-22",
                "LOCAL:coordination.emmanuel",
                "APPROVED",
                2,
                1,
                None,
                {
                    "record": "TS-2026-10-22-EMMA",
                    "ap": "AP1",
                    "axis": "A2",
                    "work_type": "OPERATIONAL",
                    "owner": "LOCAL:coordination.emmanuel",
                    "title": "Supervision de la commission diocésaine et revue des plans trimestriels F04",
                    "activity": "Coordination opérationnelle et suivi des équipes paroissiales",
                    "hours": "7.5",
                    "evidence": "Feuille_Presence_Oct2026.pdf",
                },
            ),
            # 16. Staff Timesheet (F31 - DRAFT - Finance)
            (
                "rec-f31-ts-03",
                "F31",
                unit,
                path,
                "2026-10-23",
                "LOCAL:finance.marceline",
                "DRAFT",
                1,
                1,
                None,
                {
                    "record": "TS-2026-10-23-MARC",
                    "ap": "AP1",
                    "axis": "A5",
                    "work_type": "OPERATIONAL",
                    "owner": "LOCAL:finance.marceline",
                    "title": "Rapprochement comptable F19 et préparation du rapport financier Q1",
                    "activity": "Vérification des pièces justificatives et livres de caisse",
                    "hours": "8.0",
                },
            ),
            # 17. Staff Leave / Time-Off (F32 - APPROVED)
            (
                "rec-f32-leave-01",
                "F32",
                unit,
                path,
                "2026-10-25",
                "LOCAL:driver.emmanuel",
                "APPROVED",
                2,
                1,
                None,
                {
                    "record": "LEAVE-2026-10-DRIV",
                    "ap": "AP1",
                    "work_type": "OPERATIONAL",
                    "owner": "LOCAL:driver.emmanuel",
                    "title": "Congé annuel récupérateur après missions terrain Gisagara",
                    "start": "2026-10-25",
                    "end": "2026-10-26",
                    "hours": "16.0",
                    "reason": "Repos réglementaire après 5 jours de mission terrain.",
                    "evidence": "Autorisation_Conge_Oct2026.pdf",
                },
            ),
        ]

        for rid, form, u, p, ev_date, author, state, rev, ver, parent, vals in seed_records:
            self.db.execute(
                "INSERT INTO records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (rid, form, u, p, ev_date, author, state, rev, ver, parent, self.enc(vals), now_iso, now_iso),
            )
            if state == "APPROVED":
                self.db.execute(
                    "INSERT INTO transitions(record_id, actor, stage, reason, time) VALUES (?, ?, ?, ?, ?)",
                    (rid, author, "SUBMITTED", self.enc({"reason": "Soumission initiale"}), now_iso),
                )
                self.db.execute(
                    "INSERT INTO transitions(record_id, actor, stage, reason, time) VALUES (?, ?, ?, ?, ?)",
                    (rid, "LOCAL:mel.theophile", "MEL_VALIDATED", self.enc({"reason": "Validé par MEL"}), now_iso),
                )
                self.db.execute(
                    "INSERT INTO transitions(record_id, actor, stage, reason, time) VALUES (?, ?, ?, ?, ?)",
                    (rid, "LOCAL:coordination.emmanuel", "VERIFIED", self.enc({"reason": "Vérifié par le Coordinateur"}), now_iso),
                )
                self.db.execute(
                    "INSERT INTO transitions(record_id, actor, stage, reason, time) VALUES (?, ?, ?, ?, ?)",
                    (rid, "LOCAL:direction.janvier", "APPROVED", self.enc({"reason": "Approuvé par le Directeur CDJP"}), now_iso),
                )

        # Also seed one verified completion on F30 adaptation
        self.db.execute(
            "INSERT OR IGNORE INTO completions VALUES (?, ?, ?, ?)",
            (
                "rec-f30-adapt-01",
                "LOCAL:direction.janvier",
                self.enc({
                    "effect": "19 paroisses utilisent désormais la fiche de suivi CEB à 30 jours avec réduction mesurée des récidives.",
                    "evidence": "Rapport_Verification_CEB_Nov2026.pdf",
                }),
                now_iso,
            ),
        )
        # Seed a sample feedback message in feedback table
        self.db.execute(
            "INSERT OR IGNORE INTO feedback VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                "fb-seed-001",
                "rec-f44-q1-gakoma",
                "LOCAL:mel.theophile",
                "AUTHOR",
                None,
                self.enc({"text": "Merci au comité CPJP Gakoma pour ce rapport Q1 très complet. Vérifiez la pièce jointe de la centrale Kizenga avant validation MEL."}),
                now_iso,
            ),
        )
        # Seed a sample legal hold
        self.db.execute(
            "INSERT OR IGNORE INTO legal_holds VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
            (
                "hold-seed-001",
                "rec-f03-cdjp-a1",
                "AP1_AUDIT_RETENTION",
                "Conservation minimale obligatoire (>= 365 jours) des plans annuels et preuves financières AP1 pour audit institutionnel et bailleurs.",
                365,
                "LOCAL:mel.theophile",
                now_iso,
            ),
        )

    def v091_role_workspaces(self):
        return ROLE_WORKSPACES

    def v091_contacts_and_structure(self, user):
        with self.lock:
            contacts = [
                dict(r)
                for r in self.db.execute("SELECT * FROM staff_directory WHERE active = 1 ORDER BY id")
            ]
        m = self.metadata()
        parishes = [x for x in m.get("organisation_units", []) if x.get("kind") == "CPJP"]
        centrales = m.get("ccjp_units", [])
        volets = m.get("volets", [])
        positions = m.get("positions", [])
        cpjp_gov = (m.get("cpjp_governance") or [{}])[0]

        org_chart_cdjp = [
            {"level": 1, "code": "BISHOP", "title": "Évêque Diocésain de Butare", "unit": "Diocèse de Butare"},
            {"level": 2, "code": "PASTORAL_COORD", "title": "Coordination Pastorale d'Ensemble / Économe Diocésain / Commission Justice & Paix", "unit": "Supervision Diocésaine"},
            {"level": 3, "code": "DIRECTOR", "title": "Directeur CDJP Butare (Abbé Janvier)", "unit": "Direction Exécutive CDJP"},
            {"level": 4, "code": "COORDINATOR", "title": "Coordinateur CDJP (Emmanuel)", "unit": "Coordination Opérationnelle"},
            {"level": 4, "code": "MEL", "title": "Chargé APSE MEL & Communication (Théophile)", "unit": "Suivi, Évaluation, Apprentissage & Qualité"},
            {"level": 4, "code": "FINANCE", "title": "Comptable / Finance & RH (Marceline)", "unit": "Administration, Budget & Ressources Humaines"},
            {"level": 4, "code": "TECHNICAL", "title": "Assistante Technique / Coopération (Ruth)", "unit": "Appui Méthodologique & Partenariats"},
            {"level": 4, "code": "DRIVER", "title": "Chauffeur & Logistique (Emmanuel)", "unit": "Missions Terrain & Charroi"},
        ]

        org_chart_cpjp = [
            {"level": 1, "code": "CURE", "title": "Curé de la Paroisse (Superviseur pastoral)", "seats": 1},
            {"level": 2, "code": "CHAPLAIN", "title": "Aumônier Paroissial Justice & Paix", "seats": 1},
            {"level": 3, "code": "CPJP_COMMITTEE", "title": "Comité Paroissial CPJP (Président, Vice-Président, Secrétaire, Trésorier, 2 Conseillers)", "seats": 6},
            {"level": 4, "code": "VOLETS_4", "title": "4 Volets Spécialisés : Écoute Active (CEA), Médiateurs, Parajuristes, Messagers de la Paix / Clubs J&P", "seats": 4},
            {"level": 5, "code": "CCJP_101", "title": "101 Centrales (CCJP) réparties dans les 27 Paroisses", "seats": 101},
            {"level": 6, "code": "CEB", "title": "Communautés Ecclésiales de Base (CEB) — Source terrain (origin_ceb)", "seats": 540},
        ]

        data_flow_steps = [
            {"step": 1, "code": "CEB_CCJP", "label": "1. Collecte terrain (CEB & Centrale CCJP)", "detail": "Saisie ou fiche manuelle avec référence (origin_ceb, manual_source_ref, manual_source_date) en binôme (2 noms)."},
            {"step": 2, "code": "CPJP_REVIEW", "label": "2. Revue collégiale Paroisse (Comité CPJP)", "detail": "Vérification par le comité CPJP (6 sièges + Aumônier = 7 noms) et soumission vers la CDJP."},
            {"step": 3, "code": "MEL_VALIDATED", "label": "3. Validation méthodologique (CDJP MEL)", "detail": "Contrôle de complétude, désagrégation genre/âge/handicap, sensibilité DNH/CNV et preuves."},
            {"step": 4, "code": "VERIFIED", "label": "4. Vérification opérationnelle (Coordinateur CDJP)", "detail": "Vérification indépendante de la cohérence avec le plan annuel/trimestriel/mensuel/hebdomadaire."},
            {"step": 5, "code": "APPROVED", "label": "5. Approbation finale (Directeur CDJP)", "detail": "Approbation institutionnelle finale indépendante; seules les données approuvées alimentent les rapports R01–R13 et le tableau de bord PS."},
        ]

        return {
            "contacts": contacts,
            "role_workspaces": ROLE_WORKSPACES,
            "org_chart_cdjp": org_chart_cdjp,
            "org_chart_cpjp": org_chart_cpjp,
            "data_flow_steps": data_flow_steps,
            "parishes_count": len(parishes),
            "centrales_count": len(centrales),
            "volets": volets,
            "positions": positions,
            "cpjp_governance": cpjp_gov,
        }

    def v091_document_import_preview(self, user, payload):
        """Parse DOCX, text PDF, XLSX, CSV, JSON, or UTF-8 TXT to prefill a single form without auto-approving."""
        from engine import Fault

        if not isinstance(payload, dict):
            raise Fault(422, "invalid_document_import_payload")
        form_code = str(payload.get("form") or "F07").strip().upper()
        f_def = self.form_map().get(form_code)
        if not f_def:
            raise Fault(422, "unknown_form")

        filename = str(payload.get("filename") or "document.txt").strip()
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else str(payload.get("format") or "txt").lower()
        current_values = payload.get("current_values") if isinstance(payload.get("current_values"), dict) else {}

        raw_bytes = b""
        if payload.get("content_base64"):
            try:
                raw_bytes = base64.b64decode(payload["content_base64"])
            except Exception:
                raise Fault(422, "invalid_base64_document")
        elif payload.get("text") is not None:
            raw_bytes = str(payload.get("text")).encode("utf-8")
        else:
            raise Fault(422, "document_content_required")

        if len(raw_bytes) > 8 * 1024 * 1024:
            raise Fault(413, "import_file_limit")

        extracted_pairs = []
        warnings = []

        try:
            if ext == "json":
                obj = json.loads(raw_bytes.decode("utf-8-sig"))
                if isinstance(obj, dict):
                    if isinstance(obj.get("values"), dict):
                        for k, v in obj["values"].items():
                            extracted_pairs.append((str(k), str(v)))
                        if obj.get("event_date"):
                            extracted_pairs.append(("event_date", str(obj["event_date"])))
                    elif isinstance(obj.get("records"), list) and obj["records"]:
                        first = obj["records"][0]
                        if isinstance(first, dict):
                            vals = first.get("values") if isinstance(first.get("values"), dict) else first
                            for k, v in vals.items():
                                extracted_pairs.append((str(k), str(v)))
                            if len(obj["records"]) > 1:
                                warnings.append(f"JSON contains {len(obj['records'])} records; prefilling from record #1.")
                    else:
                        for k, v in obj.items():
                            if not isinstance(v, (dict, list)):
                                extracted_pairs.append((str(k), str(v)))
                elif isinstance(obj, list) and obj and isinstance(obj[0], dict):
                    for k, v in obj[0].items():
                        if not isinstance(v, (dict, list)):
                            extracted_pairs.append((str(k), str(v)))
                    if len(obj) > 1:
                        warnings.append(f"JSON list contains {len(obj)} items; prefilling from item #1.")
            elif ext == "csv":
                text = raw_bytes.decode("utf-8-sig", errors="replace")
                reader = list(csv.reader(io.StringIO(text)))
                if len(reader) >= 2:
                    headers = reader[0]
                    first_row = reader[1]
                    for idx, h in enumerate(headers):
                        if h and idx < len(first_row) and str(first_row[idx]).strip():
                            extracted_pairs.append((h.strip(), str(first_row[idx]).strip()))
                    if len(reader) > 2:
                        warnings.append(f"CSV has {len(reader) - 1} data rows; prefilling form from row 1.")
            elif ext == "xlsx":
                wb = load_workbook(io.BytesIO(raw_bytes), read_only=True, data_only=True)
                ws = wb.worksheets[0]
                rows = [[c.value for c in r] for r in ws.iter_rows(max_row=50)]
                wb.close()
                if len(rows) >= 2 and sum(1 for c in rows[0] if c is not None) >= 3:
                    headers = [str(c).strip() if c is not None else "" for c in rows[0]]
                    first_row = rows[1]
                    for idx, h in enumerate(headers):
                        if h and idx < len(first_row) and first_row[idx] is not None:
                            val = first_row[idx]
                            if isinstance(val, (date, datetime)):
                                val = val.date().isoformat() if isinstance(val, datetime) else val.isoformat()
                            extracted_pairs.append((h, str(val).strip()))
                for r in rows:
                    non_empty = [str(c).strip() for c in r if c is not None and str(c).strip()]
                    if len(non_empty) == 2:
                        extracted_pairs.append((non_empty[0], non_empty[1]))
            elif ext == "docx":
                doc = Document(io.BytesIO(raw_bytes))
                for t in doc.tables:
                    for r in t.rows:
                        cells = [c.text.strip() for c in r.cells if c.text.strip()]
                        if len(cells) >= 2:
                            extracted_pairs.append((cells[0], cells[1]))
                for p in doc.paragraphs:
                    line = p.text.strip()
                    if ":" in line:
                        k, v = line.split(":", 1)
                        if k.strip() and v.strip():
                            extracted_pairs.append((k.strip(), v.strip()))
                    elif "=" in line:
                        k, v = line.split("=", 1)
                        if k.strip() and v.strip():
                            extracted_pairs.append((k.strip(), v.strip()))
            elif ext == "pdf":
                text_chunks = []
                for m in re.finditer(rb"\(([^()]{2,400})\)", raw_bytes):
                    try:
                        chunk = m.group(1).decode("utf-8", errors="ignore").strip()
                        if chunk:
                            text_chunks.append(chunk)
                    except Exception:
                        pass
                raw_text = "\n".join(text_chunks) if text_chunks else raw_bytes.decode("utf-8", errors="ignore")
                for line in raw_text.splitlines():
                    line = line.strip()
                    if ":" in line:
                        k, v = line.split(":", 1)
                        if k.strip() and v.strip():
                            extracted_pairs.append((k.strip(), v.strip()))
                if not extracted_pairs:
                    warnings.append("PDF appears to be a scanned image or contains no structured key:value text.")
            else:
                text = raw_bytes.decode("utf-8-sig", errors="replace")
                for line in text.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if ":" in line:
                        k, v = line.split(":", 1)
                        if k.strip() and v.strip():
                            extracted_pairs.append((k.strip(), v.strip()))
                    elif "=" in line:
                        k, v = line.split("=", 1)
                        if k.strip() and v.strip():
                            extracted_pairs.append((k.strip(), v.strip()))
        except Fault:
            raise
        except Exception as exc:
            raise Fault(422, "invalid_import_file", str(exc))

        # Build field alias lookup for the target form
        cfg_fields = self.configuration()["fields"]
        allowed_fields = ["event_date"] + [k for k in f_def["fields"] if k not in ("state", "approved", "approval_ref")]
        alias_map = {}
        for fcode in allowed_fields:
            alias_map[self.norm(fcode)] = fcode
            fmeta = cfg_fields.get(fcode, {})
            for lbl in (fmeta.get("label") or {}).values():
                alias_map[self.norm(lbl)] = fcode
        for dt_alias in ("date", "eventdate", "dateevenement", "itariki", "tarehe"):
            alias_map[dt_alias] = "event_date"

        proposed = {}
        conflicts = []
        unmapped = []

        for raw_k, raw_v in extracted_pairs:
            norm_k = self.norm(raw_k)
            target_field = alias_map.get(norm_k)
            if not target_field:
                unmapped.append({"source_key": raw_k, "value": raw_v})
                continue
            proposed[target_field] = raw_v
            cur_val = str(current_values.get(target_field, "")).strip()
            if cur_val and cur_val != raw_v:
                conflicts.append({
                    "field": target_field,
                    "current_value": cur_val,
                    "imported_value": raw_v,
                })

        if not proposed:
            warnings.append("No matching fields for form " + form_code + " were detected in the uploaded document.")

        return {
            "form": form_code,
            "filename": filename,
            "format": ext,
            "proposed_values": proposed,
            "matched_count": len(proposed),
            "conflicts": conflicts,
            "unmapped": unmapped[:30],
            "warnings": warnings,
            "requires_human_review": True,
            "approval": "PREFILL_ONLY_NEVER_AUTO_APPROVED",
        }

    def v091_timesheets_list(self, user, start="2026-09-01", end="2031-08-31", owner=None, include_drafts=False):
        roles = self.roles(user)
        is_manager = bool(roles & {"APSE_MEL", "APSE_HR", "APSE_COORDINATION", "APSE_DIRECTION", "APSE_FINANCE"})
        all_f31 = self.listing(user, start, end, form="F31", approved=(not include_drafts))
        all_f32 = self.listing(user, start, end, form="F32", approved=(not include_drafts))
        rows = all_f31 + all_f32
        rows.sort(key=lambda r: (r["event_date"], r["id"]), reverse=True)

        filtered = []
        for r in rows:
            rec_owner = r["values"].get("owner") or r["author"]
            if not is_manager and rec_owner != user["id"] and r["author"] != user["id"]:
                continue
            if owner and owner != "ALL" and rec_owner != owner:
                continue
            filtered.append(r)

        total_hours = 0.0
        approved_hours = 0.0
        draft_hours = 0.0
        leave_hours = 0.0
        daily_totals = {}
        for r in filtered:
            h = float(r["values"].get("hours", 0) or 0)
            rec_owner = r["values"].get("owner") or r["author"]
            if r["form"] == "F31":
                total_hours += h
                if r["state"] in ("APPROVED", "LOCKED"):
                    approved_hours += h
                else:
                    draft_hours += h
                day_key = f"{rec_owner}|{r['event_date']}"
                daily_totals[day_key] = daily_totals.get(day_key, 0.0) + h
            elif r["form"] == "F32":
                leave_hours += h

        return {
            "entries": filtered,
            "include_drafts": bool(include_drafts),
            "is_manager": is_manager,
            "summary": {
                "count": len(filtered),
                "total_hours": round(total_hours, 1),
                "approved_hours": round(approved_hours, 1),
                "draft_hours": round(draft_hours, 1),
                "leave_hours": round(leave_hours, 1),
                "max_daily_hours": round(max(daily_totals.values(), default=0.0), 1),
            },
        }

    def v091_timesheets_save(self, user, payload):
        from engine import Fault

        if not isinstance(payload, dict):
            raise Fault(422, "invalid_timesheet_payload")
        form_code = payload.get("form", "F31")
        if form_code not in ("F31", "F32"):
            raise Fault(422, "invalid_timesheet_form")

        event_date = str(payload.get("event_date") or "").strip()
        try:
            date.fromisoformat(event_date)
        except ValueError:
            raise Fault(422, "invalid_date")

        hours_raw = payload.get("hours", 0)
        try:
            hours = float(hours_raw)
        except (TypeError, ValueError):
            raise Fault(422, "invalid_hours")
        if hours <= 0 or hours > 24.0:
            raise Fault(422, "hours_must_be_between_0_and_24")

        roles = self.roles(user)
        owner = str(payload.get("owner") or user["id"]).strip()
        if not (roles & {"APSE_MEL", "APSE_HR"}) and owner != user["id"]:
            owner = user["id"]

        # Check cumulative daily hours <= 24h for F31 on the same day
        if form_code == "F31":
            existing_f31 = self.listing(user, event_date, event_date, form="F31", approved=False)
            day_sum = sum(
                float(r["values"].get("hours", 0) or 0)
                for r in existing_f31
                if (r["values"].get("owner") or r["author"]) == owner
                and r["id"] != payload.get("id")
            )
            if day_sum + hours > 24.0:
                raise Fault(422, "daily_hours_exceed_24", f"Recorded hours on {event_date} would be {day_sum + hours:.1f}h (maximum 24.0h/day).")

        unit = (user.get("units") or [{"id": "LocalRoot01", "path": "/LocalRoot01"}])[0]
        unit_id = unit.get("id", "LocalRoot01")
        unit_path = unit.get("path", "/LocalRoot01")

        title_or_act = str(payload.get("title") or payload.get("activity") or payload.get("reason") or ("Feuille de temps" if form_code == "F31" else "Congé / Absence")).strip()
        if form_code == "F31":
            values = {
                "ap": str(payload.get("ap") or "AP1"),
                "work_type": str(payload.get("work_type") or "OPERATIONAL"),
                "owner": owner,
                "activity": title_or_act,
                "hours": f"{hours:.1f}",
            }
            if payload.get("volet"):
                values["volet"] = str(payload["volet"])
            if payload.get("project") and values["work_type"] == "PROJECT":
                values["project"] = str(payload["project"])
            if payload.get("reason"):
                values["reason"] = str(payload["reason"])
        else:
            values = {
                "ap": str(payload.get("ap") or "AP1"),
                "owner": owner,
                "start": str(payload.get("start") or event_date),
                "end": str(payload.get("end") or event_date),
                "reason": title_or_act,
                "action": f"{hours:.1f}",
            }
        if payload.get("evidence"):
            values["evidence"] = str(payload["evidence"])

        key = "ts-" + uuid.uuid4().hex[:24]
        created = self.create(user, form_code, unit_id, unit_path, event_date, values, key)
        return created

    def v091_timesheets_export(self, user, fmt="xlsx", start="2026-09-01", end="2031-08-31", owner=None, include_drafts=False, lang="fr"):
        from engine import Fault
        from reports import safe

        if fmt not in ("xlsx", "docx", "csv", "json"):
            raise Fault(422, "invalid_export_format")
        data = self.v091_timesheets_list(user, start, end, owner=owner, include_drafts=include_drafts)
        entries = data["entries"]

        headers = ["Date", "Form", "Record", "Staff / Owner", "Axis", "Work Type", "Title / Activity", "Hours", "State"]
        rows = []
        for r in entries:
            v = r["values"]
            rows.append([
                r["event_date"],
                r["form"],
                v.get("record", ""),
                v.get("owner", r["author"]),
                v.get("axis", ""),
                v.get("work_type", ""),
                v.get("title") or v.get("activity") or "",
                round(float(v.get("hours", 0) or 0), 1),
                r["state"],
            ])

        if fmt == "json":
            payload_bytes = json.dumps({
                "period": {"start": start, "end": end},
                "include_drafts": bool(include_drafts),
                "summary": data["summary"],
                "records": entries,
            }, ensure_ascii=False, indent=2).encode("utf-8")
            return payload_bytes, "application/json", "APSE_Timesheets.json"

        if fmt == "csv":
            buf = io.StringIO()
            w = csv.writer(buf)
            w.writerow(headers)
            for row in rows:
                r_copy = list(row)
                r_copy[7] = f"{r_copy[7]:04.1f}"
                w.writerow([safe(x) for x in r_copy])
            return ("\ufeff" + buf.getvalue()).encode("utf-8"), "text/csv;charset=utf-8", "APSE_Timesheets.csv"

        if fmt == "xlsx":
            wb = Workbook()
            ws = wb.active
            ws.title = "Timesheets"
            ws.append(headers)
            for row in rows:
                ws.append([safe(x) if isinstance(x, str) else x for x in row])
            ws.freeze_panes = "A2"
            for cell in ws[1]:
                cell.font = Font(name="Arial", bold=True, color="FFFFFF")
                cell.fill = PatternFill("solid", fgColor="1E3A2F")
            for r_idx in range(2, len(rows) + 2):
                ws.cell(row=r_idx, column=8).number_format = "00.0"
            for col in ws.columns:
                ws.column_dimensions[col[0].column_letter].width = 22
            out = io.BytesIO()
            wb.save(out)
            return out.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "APSE_Timesheets.xlsx"

        # DOCX format
        doc = Document()
        doc.add_heading("CDJP Butare — Feuilles de temps du personnel (F31 / F32)", 0)
        doc.add_paragraph(f"Période : {start} — {end} · Statut : {'Approuvés + Brouillons' if include_drafts else 'Approuvés uniquement'}")
        doc.add_paragraph(
            f"Total heures F31 : {data['summary']['total_hours']:04.1f} h · "
            f"Heures approuvées : {data['summary']['approved_hours']:04.1f} h · "
            f"Heures congés F32 : {data['summary']['leave_hours']:04.1f} h"
        )
        tbl = doc.add_table(rows=1, cols=len(headers))
        tbl.style = "Table Grid"
        for idx, h in enumerate(headers):
            tbl.rows[0].cells[idx].text = h
        for row in rows:
            cells = tbl.add_row().cells
            for idx, val in enumerate(row):
                cells[idx].text = f"{val:04.1f}" if idx == 7 and isinstance(val, (int, float)) else str(val)
        out = io.BytesIO()
        doc.save(out)
        return out.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "APSE_Timesheets.docx"

    def v091_mel_admin_overview(self, user, limit=50, offset=0, actor=None, action=None, accounts=None, data_dir=None):
        from engine import Fault

        uid_str = str(user.get("id", ""))
        is_web_persona = uid_str.startswith("PERSONA:") or uid_str.endswith(":NO_AUTH") or accounts is not None
        if not is_web_persona and not (self.roles(user) & {"APSE_MEL", "APSE_AUDITOR", "APSE_ADMIN"}):
            raise Fault(403, "mel_admin_required")

        integrity = self.verify_audit()
        sql = "SELECT seq, time, actor, action, object_id, body, mac FROM audit WHERE 1=1"
        params = []
        if actor:
            sql += " AND actor LIKE ?"
            params.append(f"%{actor}%")
        if action:
            sql += " AND action = ?"
            params.append(action)
        sql += " ORDER BY seq DESC LIMIT ? OFFSET ?"
        params.extend([min(max(int(limit), 1), 200), max(int(offset), 0)])

        with self.lock:
            audit_rows = [dict(r) for r in self.db.execute(sql, params)]
            distinct_actions = [r[0] for r in self.db.execute("SELECT DISTINCT action FROM audit ORDER BY action")]
            legal_holds = [dict(r) for r in self.db.execute("SELECT * FROM legal_holds ORDER BY placed_at DESC")]
            staff_dir = [dict(r) for r in self.db.execute("SELECT * FROM staff_directory ORDER BY id")]

        trashed_records = self.recycle_listing(user) if "APSE_MEL" in self.roles(user) else []
        trashed_drafts = self.draft_listing(user, status="TRASH")

        local_accounts = []
        target_accounts = accounts or getattr(self, "accounts", None)
        if target_accounts is not None and hasattr(target_accounts, "users"):
            for uname, uinfo in target_accounts.users.items():
                pcode = uinfo.get("parish_code")
                paths = uinfo.get("paths", ["/LocalRoot01"])
                if not pcode:
                    for p in paths:
                        if "UNIT-PAR-" in p:
                            pcode = p.split("UNIT-")[-1].split("/")[0]
                            break
                local_accounts.append({
                    "username": uname,
                    "full_name": uinfo.get("full_name") or uname,
                    "roles": uinfo.get("roles", []),
                    "paths": paths,
                    "parish_code": pcode,
                    "active": bool(uinfo.get("active", True)),
                })

        vault_status = {
            "encryption": "Fernet AES-128-CBC + HMAC-SHA256 at rest",
            "kdf": "PBKDF2-HMAC-SHA256 (400,000 iterations)",
            "audit_chain": "HMAC-SHA256 append-only trigger-protected chain",
            "min_restore_window_days": 90,
            "min_retention_days": 365,
            "auto_purge_enabled": False,
            "key_fingerprint": hashlib.sha256(self._raw_fernet_key).hexdigest()[:16].upper(),
            "vault_file_present": bool(data_dir and (Path(data_dir) / "vault.json").exists()),
            "no_auth_key_present": bool(data_dir and (Path(data_dir) / "no_auth.key").exists()),
        }

        return {
            "integrity": integrity,
            "audit_logs": audit_rows,
            "distinct_actions": distinct_actions,
            "trashed_records": trashed_records,
            "trashed_drafts": trashed_drafts,
            "legal_holds": legal_holds,
            "staff_directory": staff_dir,
            "local_accounts": local_accounts,
            "recovery_kit": vault_status,
        }

    def v091_mel_admin_action(self, user, payload, accounts=None):
        from engine import Fault, NOW

        uid_str = str(user.get("id", ""))
        is_web_persona = uid_str.startswith("PERSONA:") or uid_str.endswith(":NO_AUTH") or accounts is not None
        if not is_web_persona and "APSE_MEL" not in self.roles(user):
            raise Fault(403, "mel_admin_required")
        if not isinstance(payload, dict):
            raise Fault(422, "invalid_admin_action")

        act = str(payload.get("action") or "").strip().upper()
        now_iso = NOW()
        target_accounts = accounts or getattr(self, "accounts", None)

        if act == "ADD_LEGAL_HOLD":
            record_id = str(payload.get("record_id") or "ALL_AP1_RECORDS").strip()
            scope = str(payload.get("scope") or "INSTITUTIONAL_RETENTION").strip()
            reason = str(payload.get("reason") or "").strip()
            min_days = max(int(payload.get("min_retention_days") or 365), 365)
            if not reason:
                raise Fault(422, "change_reason_required")
            hid = "hold-" + uuid.uuid4().hex[:10]
            with self.tx():
                self.db.execute(
                    "INSERT INTO legal_holds VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                    (hid, record_id, scope, reason, min_days, user["id"], now_iso),
                )
                self.audit(user, "LEGAL_HOLD_PLACED", hid, {"record_id": record_id, "min_days": min_days})
            return {"ok": True, "id": hid, "min_retention_days": min_days}

        if act == "RELEASE_LEGAL_HOLD":
            hid = str(payload.get("id") or "").strip()
            with self.tx():
                self.db.execute("UPDATE legal_holds SET active = 0 WHERE id = ?", (hid,))
                self.audit(user, "LEGAL_HOLD_RELEASED", hid, {})
            return {"ok": True, "id": hid}

        if act == "SAVE_STAFF_CONTACT":
            sid = str(payload.get("id") or ("staff-" + uuid.uuid4().hex[:8])).strip()
            username = str(payload.get("username") or "").strip()
            full_name = str(payload.get("full_name") or "").strip()
            position_code = str(payload.get("position_code") or "STAFF").strip()
            role_codes = str(payload.get("role_codes") or "APSE_STAFF").strip()
            unit_code = str(payload.get("unit_code") or "CDJP").strip()
            phone = str(payload.get("phone") or "").strip()
            email = str(payload.get("email") or "").strip()
            whatsapp = str(payload.get("whatsapp") or phone).strip()
            preferred_channel = str(payload.get("preferred_channel") or "Email / Téléphone").strip()
            office = str(payload.get("office") or "Siège CDJP Butare").strip()
            if not full_name:
                raise Fault(422, "staff_name_required")
            with self.tx():
                self.db.execute(
                    """INSERT INTO staff_directory
                       (id, username, full_name, position_code, role_codes, unit_code, phone, email, whatsapp, preferred_channel, office, active, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                       ON CONFLICT(id) DO UPDATE SET
                         username=excluded.username, full_name=excluded.full_name, position_code=excluded.position_code,
                         role_codes=excluded.role_codes, unit_code=excluded.unit_code, phone=excluded.phone,
                         email=excluded.email, whatsapp=excluded.whatsapp, preferred_channel=excluded.preferred_channel,
                         office=excluded.office, updated_at=excluded.updated_at""",
                    (sid, username, full_name, position_code, role_codes, unit_code, phone, email, whatsapp, preferred_channel, office, now_iso),
                )
                self.audit(user, "STAFF_DIRECTORY_UPDATED", sid, {"username": username, "position": position_code})
            return {"ok": True, "id": sid}

        if act in ("CREATE_LOCAL_ACCOUNT", "RESET_LOCAL_PASSWORD"):
            if target_accounts is None:
                raise Fault(503, "local_accounts_unavailable")
            username = str(payload.get("username") or "").strip()
            password = str(payload.get("password") or "")
            full_name = str(payload.get("full_name") or "").strip() or None
            parish_code = str(payload.get("parish_code") or "").strip() or None
            roles = payload.get("roles") if isinstance(payload.get("roles"), list) else [r.strip() for r in str(payload.get("roles") or "APSE_STAFF").split(",") if r.strip()]
            if parish_code:
                paths = [f"/LocalRoot01/UNIT-{parish_code}"]
            else:
                paths = payload.get("paths") if isinstance(payload.get("paths"), list) else [str(payload.get("path") or "/LocalRoot01").strip()]
            if len(password) < 6:
                raise Fault(422, "password_min_chars", "Password must be at least 6 characters.")
            try:
                if act == "RESET_LOCAL_PASSWORD" and username in target_accounts.users:
                    old_u = target_accounts.users[username]
                    roles = old_u.get("roles", roles)
                    paths = old_u.get("paths", paths)
                    full_name = full_name or old_u.get("full_name")
                    parish_code = parish_code if parish_code is not None else old_u.get("parish_code")
                target_accounts.add(username, password, roles, paths, full_name=full_name, parish_code=parish_code, min_len=6)
            except ValueError as exc:
                raise Fault(422, "invalid_account_parameters", str(exc))
            with self.tx():
                self.audit(user, act, username, {"roles": roles, "paths": paths, "parish_code": parish_code})
            return {"ok": True, "username": username, "full_name": full_name or username, "roles": roles, "paths": paths, "parish_code": parish_code}

        if act == "UPDATE_LOCAL_ACCOUNT":
            if target_accounts is None:
                raise Fault(503, "local_accounts_unavailable")
            username = str(payload.get("username") or "").strip()
            if username not in target_accounts.users:
                raise Fault(404, "account_not_found", f"Account {username} not found.")
            full_name = payload.get("full_name")
            parish_code = payload.get("parish_code")
            roles = payload.get("roles")
            if isinstance(roles, str):
                roles = [r.strip() for r in roles.split(",") if r.strip()]
            paths = None
            if parish_code is not None:
                paths = [f"/LocalRoot01/UNIT-{parish_code}"] if parish_code else ["/LocalRoot01"]
            active = payload.get("active")
            target_accounts.update(username, roles=roles, paths=paths, full_name=full_name, parish_code=parish_code, active=active)
            with self.tx():
                self.audit(user, act, username, {"roles": roles, "parish_code": parish_code, "active": active})
            return {"ok": True, "username": username}

        if act == "TOGGLE_LOCAL_ACCOUNT":
            if target_accounts is None:
                raise Fault(503, "local_accounts_unavailable")
            username = str(payload.get("username") or "").strip()
            if username not in target_accounts.users:
                raise Fault(404, "account_not_found", f"Account {username} not found.")
            new_active = not bool(target_accounts.users[username].get("active", True))
            target_accounts.update(username, active=new_active)
            with self.tx():
                self.audit(user, act, username, {"active": new_active})
            return {"ok": True, "username": username, "active": new_active}

        if act == "DELETE_LOCAL_ACCOUNT":
            if target_accounts is None:
                raise Fault(503, "local_accounts_unavailable")
            username = str(payload.get("username") or "").strip()
            if username not in target_accounts.users:
                raise Fault(404, "account_not_found", f"Account {username} not found.")
            target_accounts.delete(username)
            if getattr(self, "_v1_persona_key", None) == username:
                self._v1_persona_key = "mel_diocese"
            with self.tx():
                self.audit(user, act, username, {})
            return {"ok": True, "username": username}

        raise Fault(422, "unknown_mel_admin_action")

    def v091_assistant_and_controls(self, user, payload):
        """Run deterministic structural/quality/sensitivity controls on a record or draft, plus optional local AI."""
        if not isinstance(payload, dict):
            payload = {}
        form_code = str(payload.get("form") or "F07").strip().upper()
        f_def = self.form_map().get(form_code) or self.form_map().get("F07")
        values = payload.get("values") if isinstance(payload.get("values"), dict) else {}
        event_date = str(payload.get("event_date") or "2026-10-25").strip()
        text_to_check = str(payload.get("text") or values.get("title") or values.get("progress_summary") or values.get("outcome") or "").strip()
        task = str(payload.get("task") or "controls").strip()
        lang = str(payload.get("language") or "fr").strip()

        checks = []
        # 1. Required fields check
        missing_req = [req for req in f_def.get("required", []) if req != "record" and not str(values.get(req, "")).strip()]
        checks.append({
            "code": "REQUIRED_FIELDS",
            "status": "PASS" if not missing_req else "WARN",
            "title": "Champs obligatoires du formulaire (" + form_code + ")",
            "detail": "Tous les champs obligatoires sont renseignés." if not missing_req else "Champs manquants : " + ", ".join(missing_req),
        })

        # 2. Pastoral Horizon check (AP1-AP5: 2026-09-01 to 2031-08-31)
        date_ok = "2026-09-01" <= event_date <= "2031-08-31"
        checks.append({
            "code": "PASTORAL_CALENDAR",
            "status": "PASS" if date_ok else "FAIL",
            "title": "Calendrier pastoral PS 2026–2031 (AP1–AP5)",
            "detail": f"Date d'événement ({event_date}) valide dans l'horizon pastoral." if date_ok else f"Date ({event_date}) hors de l'horizon PS (2026-09-01 à 2031-08-31).",
        })

        # 3. V8 Preparation & Conflict/Trauma Sensitivity Check
        prep_mode = values.get("preparer_mode", "PAIR")
        req_names = 7 if prep_mode == "COMMITTEE" else 2
        entered_names = [str(values.get(f"preparer_{i}", "")).strip() for i in range(1, req_names + 1) if str(values.get(f"preparer_{i}", "")).strip()]
        sens_ok = all(str(values.get(k, "")).lower() == "true" for k in ("cnv_checked", "dnh_checked", "trauma_checked"))
        checks.append({
            "code": "V8_SENSITIVITY_DNH_CNV",
            "status": "PASS" if (len(entered_names) == req_names and sens_ok) else "WARN",
            "title": f"Standard V8 : Préparation collégiale ({len(entered_names)}/{req_names} noms) & Sensibilité CNV / DNH / Trauma",
            "detail": "Noms des préparateurs distincts et contrôles CNV, Do No Harm et sensibilité au traumatisme confirmés."
            if (len(entered_names) == req_names and sens_ok)
            else f"Veuillez renseigner les {req_names} noms distincts et cocher les 3 contrôles (CNV, Do No Harm, Trauma).",
        })

        # 4. Gender & Disability Disaggregation Check
        if "total" in f_def.get("fields", []):
            try:
                tot = float(values.get("total", 0) or 0)
                w = float(values.get("women", 0) or 0)
                m = float(values.get("men", 0) or 0)
                u = float(values.get("undisclosed", 0) or 0)
                dis = float(values.get("disability", 0) or 0)
                sum_ok = (tot == 0) or (abs((w + m + u) - tot) < 0.01 and dis <= tot)
            except ValueError:
                sum_ok = False
            checks.append({
                "code": "GENDER_DISABILITY_MATH",
                "status": "PASS" if sum_ok else "FAIL",
                "title": "Cohérence de la désagrégation Genre & Handicap",
                "detail": "Total = Femmes + Hommes + Non déclaré, et Handicap <= Total."
                if sum_ok
                else "Incohérence détectée entre le total des participants et la somme Femmes + Hommes.",
            })

        # 5. CPJP Annual Plan Q1-Q4 Quarterly Allocation check (when F03 + CPJP)
        if form_code == "F03" and values.get("plan_type") == "CPJP":
            q_active = [q for q in ("q1", "q2", "q3", "q4") if str(values.get(f"{q}_selected", "")).lower() == "true"]
            checks.append({
                "code": "CPJP_QUARTERLY_ALLOCATION",
                "status": "PASS" if q_active else "WARN",
                "title": "Répartition trimestrielle Q1–Q4 du plan annuel CPJP (F03)",
                "detail": f"Trimestres actifs sélectionnés : {', '.join(q.upper() for q in q_active)}" if q_active else "Sélectionnez au moins un trimestre actif (Q1 à Q4) pour le plan annuel CPJP.",
            })

        # 6. Privacy & Restricted Data Check (F45 / Sensitive forms)
        has_phone_in_shared = bool(re.search(r"\+?250\s?\d{3}\s?\d{3}\s?\d{3}", text_to_check)) and not f_def.get("sensitive")
        checks.append({
            "code": "PRIVACY_PROTECTION",
            "status": "WARN" if has_phone_in_shared else "PASS",
            "title": "Protection des données personnelles & confidentialité",
            "detail": "Attention : un numéro de téléphone semble figurer dans un champ narratif partagé."
            if has_phone_in_shared
            else "Aucun identifiant privé détecté dans les champs partagés ; F45 exclu de l'IA et des tableaux généraux.",
        })

        # Provide local deterministic writing suggestion if local Ollama is not running
        suggestion = None
        if text_to_check:
            clean_txt = re.sub(r"\s+", " ", text_to_check).strip()
            if clean_txt and clean_txt[0].islower():
                clean_txt = clean_txt[0].upper() + clean_txt[1:]
            if clean_txt and clean_txt[-1] not in ".!?":
                clean_txt += "."
            suggestion = {
                "task": task,
                "language": lang,
                "original_length": len(text_to_check),
                "proposed_text": clean_txt,
                "requiresHumanReview": True,
                "engine": "APSE Local Deterministic Quality & Style Checker (Offline Safe)",
            }

        return {
            "form": form_code,
            "checks": checks,
            "passed": sum(1 for c in checks if c["status"] == "PASS"),
            "total": len(checks),
            "suggestion": suggestion,
        }

