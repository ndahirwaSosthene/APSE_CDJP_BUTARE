"""Institutional role model for APSE v2.

Source of truth (main branch documentation):
- docs/V0_4_GOUVERNANCE_ET_PROJETS.md — only CDJP and CPJP elaborate plans; CCJP / CEB
  contribute information and reports; mandatory circuit
  Volets -> Comité CPJP -> MEL -> Coordinateur -> Directeur.
- LIRE_AVANT_UTILISATION_RW.md §6 — PAIR (2 names) vs COMMITTEE (6 seats + chaplain = 7 names)
  preparation, 4 CPJP specialist Volets, CNV / Do-No-Harm / trauma-sensitivity checks.

Everything that decides "who may do what" lives here so the API and the UI use the same rules.
"""

# ---------------------------------------------------------------------------
# Raw roles (as stored on accounts) grouped by institutional tier
# ---------------------------------------------------------------------------
FIELD_ROLES = {'APSE_PARISH_REPORTER', 'APSE_CCJP', 'APSE_CEB'}
CPJP_ROLES = {'APSE_CPJP'}
STAFF_ROLES = {'APSE_STAFF', 'APSE_FINANCE', 'APSE_HR'}
DIOCESAN_REVIEW_ROLES = {'APSE_MEL', 'APSE_COORDINATION', 'APSE_DIRECTION'}
DIOCESAN_ROLES = DIOCESAN_REVIEW_ROLES | STAFF_ROLES

# ---------------------------------------------------------------------------
# Approval circuit
# ---------------------------------------------------------------------------
STAGE_SUBMITTED = 'SUBMITTED'              # waiting for Parish CPJP committee review
STAGE_PARISH = 'PARISH_APPROVED'           # approved by Parish CPJP -> waiting for CDJP MEL validation
STAGE_MEL = 'MEL_VALIDATED'                # validated by CDJP MEL -> waiting for CDJP Coordinator verification
STAGE_VERIFIED = 'VERIFIED'                # verified by CDJP Coordinator -> waiting for CDJP Director final approval
STAGE_FINAL = 'DIOCESE_APPROVED'           # final Diocesan sign-off & lock (edits create an amendment)
STAGE_CORRECTION = 'CORRECTION'            # returned to the author for correction

STAGE_ORDER = [STAGE_SUBMITTED, STAGE_PARISH, STAGE_MEL, STAGE_VERIFIED, STAGE_FINAL]
REVIEW_TARGETS = {STAGE_PARISH, STAGE_MEL, STAGE_VERIFIED, STAGE_FINAL, STAGE_CORRECTION}
PENDING_STAGES = {STAGE_SUBMITTED, STAGE_PARISH, STAGE_MEL, STAGE_VERIFIED}

# ---------------------------------------------------------------------------
# CPJP specialist Volets (LIRE_AVANT_UTILISATION_RW.md §6, V0_4 §2)
# ---------------------------------------------------------------------------
VOLETS = [
    {'code': 'PARAJURISTES', 'labels': {'en': 'Paralegals (Parajuristes)', 'fr': 'Parajuristes', 'rw': "Abafasha mu by'amategeko", 'sw': 'Wasaidizi wa Kisheria'}},
    {'code': 'MEDIATEURS', 'labels': {'en': 'Mediators (Abahuza)', 'fr': 'Médiateurs', 'rw': 'Abahuza', 'sw': 'Wapatanishi'}},
    {'code': 'ABAHUMURIZAMITIMA', 'labels': {'en': 'Psychosocial Companions (Abahumurizamitima)', 'fr': 'Abahumurizamitima (accompagnement psychosocial)', 'rw': 'Abahumurizamitima', 'sw': 'Wafariji wa Kisaikolojia'}},
    {'code': 'ISANAMITIMA', 'labels': {'en': 'Healing & Reconciliation (Isanamitima)', 'fr': 'Abafashamyumvire mu isanamitima', 'rw': 'Abafashamyumvire mu isanamitima', 'sw': 'Wawezeshaji wa Uponyaji'}},
    {'code': 'FIELD', 'labels': {'en': 'General Centrale / CEB Field Work', 'fr': 'Terrain général (Centrale / CEB)', 'rw': 'Ibikorwa rusange bya Santarali / CEB', 'sw': 'Kazi ya Jumla ya Kigango / CEB'}},
]
VOLET_CODES = {v['code'] for v in VOLETS}

PLAN_HORIZONS = [
    {'code': 'ANNUAL', 'form': 'F03', 'labels': {'en': 'Annual Action Plan (F03)', 'fr': 'Plan Annuel (F03)', 'rw': "Igenamigambi ry'Umwaka (F03)", 'sw': 'Mpango wa Mwaka (F03)'}},
    {'code': 'QUARTERLY', 'form': 'F04', 'labels': {'en': 'Quarterly Workplan (F04)', 'fr': 'Plan Trimestriel (F04)', 'rw': "Igenamigambi ry'Igihembwe (F04)", 'sw': 'Mpango wa Robo Mwaka (F04)'}},
    {'code': 'MONTHLY', 'form': 'F43', 'labels': {'en': 'Monthly Workplan (F43)', 'fr': 'Plan Mensuel (F43)', 'rw': "Igenamigambi ry'Ukwezi (F43)", 'sw': 'Mpango wa Mwezi (F43)'}},
    {'code': 'WEEKLY', 'form': 'F05', 'labels': {'en': 'Weekly Schedule (F05)', 'fr': 'Plan Hebdomadaire (F05)', 'rw': "Igenamigambi ry'Icyumweru (F05)", 'sw': 'Mpango wa Wiki (F05)'}},
]
PLAN_HORIZON_CODES = [h['code'] for h in PLAN_HORIZONS]

PREP_RULES = {
    'PAIR': 2,         # Volet / CCJP / CEB field reports: at least 2 named preparers
    'COMMITTEE': 7,    # CPJP: 6 committee seats + parish chaplain = 7 names
}

# Workspace order and metadata per role: the first entry is the default landing workspace.
WORKSPACES = {
    'field': ['tasks', 'approvals'],
    'cpjp': ['tasks', 'approvals', 'analytics', 'exports'],
    'staff': ['tasks', 'approvals', 'analytics', 'exports'],
    'mel': ['tasks', 'approvals', 'analytics', 'exports'],
    'coordinator': ['approvals', 'analytics', 'tasks', 'exports'],
    'director': ['analytics', 'approvals', 'tasks', 'exports'],
    'viewer': ['tasks'],
}

ROLE_PROFILES = {
    'field': {
        'title': 'Parish Volet / Centrale / CEB Field Enumerator',
        'mandate': 'Field Enumeration & Case Intake (PAIR 2-person preparation, Volet tagging & CNV/DNH/Trauma safeguards). Cannot create plans or approve reports.',
        'badge_variant': 'info',
    },
    'cpjp': {
        'title': 'Parish CPJP Committee (6 Seats + Chaplain, Curé Supervision)',
        'mandate': 'Elaborates Parish Annual Action Plans (F03) and reviews field submissions from Parish Volets, Centrales & CEBs. Cannot approve Diocesan tier or own submissions.',
        'badge_variant': 'GOOD',
    },
    'staff': {
        'title': 'CDJP Diocesan Thematic Staff Officer',
        'mandate': 'Elaborates Annual (F03), Quarterly (F04), Monthly (F43) & Weekly (F05) workplans and logs diocesan field activities for MEL validation.',
        'badge_variant': 'info',
    },
    'mel': {
        'title': 'CDJP Diocesan MEL Officer (All 27 Parishes)',
        'mandate': 'Technical validation of Parish-approved reports (MEL_VALIDATED), 27-parish strategic planning, metadata governance, and Central Server DB sync.',
        'badge_variant': 'GREAT',
    },
    'coordinator': {
        'title': 'CDJP Diocesan Coordinator (All 27 Parishes)',
        'mandate': 'Institutional verification of MEL-validated reports (VERIFIED), cross-parish bottleneck resolution, and portfolio oversight.',
        'badge_variant': 'GREAT',
    },
    'director': {
        'title': 'CDJP Diocesan Director — Executive Sign-Off (All 27 Parishes)',
        'mandate': 'Final institutional approval & lock (DIOCESE_APPROVED), R13 Strategic Results oversight, and Executive KPIs (EFF-01, EFI-01, EFI-02, FIN-01).',
        'badge_variant': 'GREAT',
    },
    'viewer': {
        'title': 'Read-Only Observer',
        'mandate': 'Read-only access to assigned parish activities.',
        'badge_variant': 'neutral',
    },
}


def role_key(roles):
    """Collapse a set of raw roles into the primary institutional role key."""
    roles = set(roles or [])
    if 'APSE_DIRECTION' in roles and 'APSE_COORDINATION' not in roles:
        return 'director'
    if 'APSE_COORDINATION' in roles and 'APSE_DIRECTION' in roles:
        return 'director'
    if 'APSE_COORDINATION' in roles:
        return 'coordinator'
    if 'APSE_MEL' in roles:
        return 'mel'
    if roles & STAFF_ROLES:
        return 'staff'
    if roles & CPJP_ROLES:
        return 'cpjp'
    if roles & FIELD_ROLES:
        return 'field'
    return 'viewer'


def plan_horizons(roles):
    """CPJP plans annually (F03) for its own parish; CDJP staff/MEL/Coordination/Direction plan at all horizons."""
    roles = set(roles or [])
    if roles & (DIOCESAN_REVIEW_ROLES | STAFF_ROLES):
        return list(PLAN_HORIZON_CODES)
    if roles & CPJP_ROLES:
        return ['ANNUAL']
    return []


def prep_mode(roles):
    rk = role_key(roles)
    if rk == 'field':
        return 'PAIR'
    if rk == 'cpjp':
        return 'COMMITTEE'
    return 'STAFF'


def safeguards_required(roles):
    return role_key(roles) in ('field', 'cpjp')


def can_log(roles):
    return role_key(roles) in ('field', 'cpjp', 'staff', 'mel', 'coordinator', 'director')


def allowed_approval_targets_for_role(roles):
    """Return which target stages a role is authorized to trigger in the UI and API."""
    roles = set(roles or [])
    targets = []
    if 'APSE_CPJP' in roles:
        targets.extend([STAGE_PARISH, STAGE_CORRECTION])
    if 'APSE_MEL' in roles:
        targets.extend([STAGE_PARISH, STAGE_MEL, STAGE_FINAL, STAGE_CORRECTION])
    if 'APSE_COORDINATION' in roles:
        targets.extend([STAGE_PARISH, STAGE_MEL, STAGE_VERIFIED, STAGE_FINAL, STAGE_CORRECTION])
    if 'APSE_DIRECTION' in roles:
        targets.extend([STAGE_PARISH, STAGE_MEL, STAGE_VERIFIED, STAGE_FINAL, STAGE_CORRECTION])
    seen = []
    for t in targets:
        if t not in seen:
            seen.append(t)
    return seen


def permissions(roles):
    roles = set(roles or [])
    rk = role_key(roles)
    prof = ROLE_PROFILES.get(rk, ROLE_PROFILES['viewer'])
    allowed_targets = allowed_approval_targets_for_role(roles)
    return {
        'role_key': rk,
        'role_title': prof['title'],
        'role_mandate': prof['mandate'],
        'role_badge': prof['badge_variant'],
        'workspaces': WORKSPACES.get(rk, ['tasks']),
        'home': WORKSPACES.get(rk, ['tasks'])[0],
        'can_create_task': bool(plan_horizons(roles)),
        'plan_horizons': plan_horizons(roles),
        'can_log': can_log(roles),
        'prep_mode': prep_mode(roles),
        'prep_min_names': PREP_RULES.get(prep_mode(roles), 1),
        'safeguards_required': safeguards_required(roles),
        'allowed_review_targets': allowed_targets,
        'can_review': bool(allowed_targets),
        'can_approve_parish': STAGE_PARISH in allowed_targets,
        'can_validate_mel': STAGE_MEL in allowed_targets,
        'can_verify_coord': STAGE_VERIFIED in allowed_targets,
        'can_approve_diocese': STAGE_FINAL in allowed_targets,
        'can_import': rk in ('mel', 'staff', 'coordinator', 'director'),
        'can_export': rk != 'field',
        'can_configure_sync': rk in ('mel', 'coordinator', 'director'),
        'can_sync': rk != 'viewer',
    }


def is_author(user, log):
    author = str(log.get('author') or '').strip()
    if not author:
        return False
    uid = str(user.get('id') or '').strip()
    uname = str(user.get('name') or '').strip()
    return author in {uid, uname}


def review_decision(user, roles, assigned_parish, log, target):
    """Return (allowed, code, plain_message) for moving `log` to `target` by `user`."""
    roles = set(roles or [])
    if target not in REVIEW_TARGETS:
        return (
            False,
            'plain_error',
            'Choose a valid review action (Parish Approve, Diocese Approve, or Return).',
        )

    # 1. Must hold a review role (CPJP, MEL, COORDINATION, or DIRECTION).
    # Field reporters (APSE_PARISH_REPORTER, APSE_CCJP, APSE_CEB) and APSE_STAFF cannot approve!
    if not (roles & {'APSE_CPJP', 'APSE_MEL', 'APSE_COORDINATION', 'APSE_DIRECTION'}):
        return (
            False,
            'review_role_required',
            'Only Parish CPJP committees or Diocesan reviewers can approve or return reports.',
        )

    # 2. Diocesan stages (MEL_VALIDATED, VERIFIED, DIOCESE_APPROVED) require Diocesan review role
    if target in (STAGE_MEL, STAGE_VERIFIED, STAGE_FINAL) and not (roles & DIOCESAN_REVIEW_ROLES):
        return (
            False,
            'diocese_review_role_required',
            'Only CDJP Diocesan reviewers can grant final Diocese approval.',
        )

    # 3. Parish CPJP can only review logs belonging to their assigned parish
    if not (roles & DIOCESAN_REVIEW_ROLES) and assigned_parish and log.get('parish_code') != assigned_parish:
        return (
            False,
            'other_parish',
            'A Parish CPJP committee can only review reports from its own assigned parish.',
        )

    # 4. Strict Segregation of Duties: no reviewer may approve a report they authored
    if target != STAGE_CORRECTION and is_author(user, log):
        return (
            False,
            'self_approval_forbidden',
            'Segregation of duties: You authored this report, so an independent reviewer must approve it.',
        )

    return True, 'ok', ''
