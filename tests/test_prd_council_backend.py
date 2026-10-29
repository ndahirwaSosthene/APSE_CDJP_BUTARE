"""Comprehensive Backend Verification Suite for the 5-Agent PRD Test Council Matrix.

Covers all backend test cases across the 5 Council domains:
1. Domain 1 — Strategy & M&E (TC-STRAT-01 to TC-STRAT-15)
2. Domain 3 — Field Capture, Localization & Offline Resilience (TC-CAP-01 to TC-CAP-18)
3. Domain 4 — Governance, 3-Tier Approvals, Security & Privacy (TC-GOV-01 to TC-GOV-16)
4. Domain 5 — Analytics, Regional Map & Data Transfer (TC-ANA-01 to TC-ANA-16)
5. Live HTTP Loopback Integration against portable_boot.py / server.py
"""
import csv
import io
import json
import sqlite3
import subprocess
import sys
import tempfile
import unicodedata
import unittest
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
from pathlib import Path
from cryptography.fernet import Fernet
from openpyxl import Workbook, load_workbook
from docx import Document

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'service'))

from engine import Engine, Fault
from v1_redesign import AXIS_NATURAL, ISSUE_CATEGORIES, PARISH_DISTRICTS, compute_impact_rating, compute_pastoral
from reports import safe
import portable


def make_mel_user():
    return {
        'id': 'LOCAL:NO_AUTH',
        'name': 'LOCAL_MEL',
        'roles': ['APSE_MEL'],
        'paths': ['/LocalRoot01'],
        'units': [{'id': 'LocalRoot01', 'name': 'CDJP BUTARE', 'path': '/LocalRoot01', 'kind': 'CDJP'}],
    }


def make_parish_user(parish_code='PAR-03', role='APSE_CPJP'):
    uid = f'UNIT-{parish_code}'
    return {
        'id': f'USER:{parish_code}',
        'name': f'CPJP {parish_code}',
        'roles': [role],
        'paths': [f'/LocalRoot01/{uid}'],
        'units': [{
            'id': uid,
            'name': f'Paroisse {parish_code}',
            'path': f'/LocalRoot01/{uid}',
            'kind': 'CPJP',
            'sourceCode': parish_code,
        }],
    }


class Domain1StrategyAndMETests(unittest.TestCase):
    """Domain 1: Strategy & M&E (TC-STRAT-01 through TC-STRAT-15)."""

    def setUp(self):
        self.engine = Engine(':memory:', Fernet.generate_key(), b'1' * 32)
        self.mel_user = make_mel_user()

    def tearDown(self):
        self.engine.db.close()

    def test_tc_strat_01_axes_natural_labels_4_languages(self):
        """TC-STRAT-01: Axes A1-A5 natural labels in EN, RW, FR, SW."""
        self.assertEqual(set(AXIS_NATURAL.keys()), {'A1', 'A2', 'A3', 'A4', 'A5'})
        for axis_code, labels in AXIS_NATURAL.items():
            for lang in ('en', 'rw', 'fr', 'sw'):
                self.assertIn(lang, labels, f'{axis_code} missing {lang}')
                self.assertTrue(len(labels[lang].strip()) > 5)

        boot = self.engine.v1_bootstrap(self.mel_user)
        for task in boot['tasks']:
            self.assertEqual(task['axis_labels'], AXIS_NATURAL[task['axis']])

    def test_tc_strat_02_13_strategic_outcomes_and_register_schema(self):
        """TC-STRAT-02: 13 Strategic Outcomes (A1.R1-A5.R3) with 4-language labels."""
        goals = self.engine._goals_catalogue()
        expected_codes = [
            'A1.R1', 'A1.R2', 'A1.R3',
            'A2.R1', 'A2.R2',
            'A3.R1', 'A3.R2',
            'A4.R1', 'A4.R2', 'A4.R3',
            'A5.R1', 'A5.R2', 'A5.R3',
        ]
        self.assertEqual([g['outcome_code'] for g in goals], expected_codes)
        self.assertEqual(len(goals), 13)
        for g in goals:
            self.assertEqual(set(g['labels'].keys()), {'en', 'rw', 'fr', 'sw'})
            self.assertTrue(g['outcome_code'].startswith(g['axis_code'] + '.'))

        # Verify Council Note: registers/strategic_results.json uses "label" vs "labels" in metadata_seed.json
        strat_results = json.loads((ROOT / 'registers/strategic_results.json').read_text(encoding='utf-8'))
        self.assertEqual(len(strat_results), 13)
        self.assertIn('label', strat_results[0])
        self.assertNotIn('labels', strat_results[0])

    def test_tc_strat_03_15_interventions_and_35_kpis_null_on_zero_observations(self):
        """TC-STRAT-03: 15 Interventions (A1.I1-A5.I3) & 35 KPIs (null when 0 observations)."""
        interventions = json.loads((ROOT / 'registers/strategic_interventions.json').read_text(encoding='utf-8'))
        self.assertEqual(len(interventions), 15)
        seed_interventions = self.engine.metadata()['interventions']
        self.assertEqual(len(seed_interventions), 15)
        for axis_idx in range(1, 6):
            axis_code = f'A{axis_idx}'
            axis_ints = [i['code'] for i in seed_interventions if i['axis'] == axis_code]
            self.assertEqual(axis_ints, [f'{axis_code}.I1', f'{axis_code}.I2', f'{axis_code}.I3'])

        kpi_dict = json.loads((ROOT / 'registers/kpi_dictionary.json').read_text(encoding='utf-8'))
        self.assertEqual(len(kpi_dict), 35)
        for item in kpi_dict:
            self.assertEqual(set(item['label'].keys()), {'en', 'fr', 'rw', 'sw'})

        # Verify zero observations -> value is None (null), never 0
        computed_kpis = self.engine.indicators([])
        self.assertEqual(len(computed_kpis), 35)
        for item in computed_kpis:
            self.assertEqual(item['observations'], 0)
            self.assertIsNone(item['value'], f"KPI {item['code']} should be None when 0 observations")

        # Verify Council Note: _goals_catalogue binds *.I1 and KPI-A*-R* instead of A1-K1
        goals = self.engine._goals_catalogue()
        a1_r2 = next(g for g in goals if g['outcome_code'] == 'A1.R2')
        self.assertEqual(a1_r2['intervention_code'], 'A1.I1')
        self.assertEqual(a1_r2['indicator_code'], 'KPI-A1-R2')

    def test_tc_strat_05_zero_code_task_creation_and_metadata_inheritance(self):
        """TC-STRAT-05: Zero-code task creation & auto metadata inheritance."""
        task = self.engine.v1_create_task(self.mel_user, {
            'title': 'Community Peace Forum',
            'outcome_code': 'A2.R2',
            'parish_code': 'PAR-10',
            'due_date': '2026-11-15',
            'planned_target': 40,
        })
        self.assertTrue(task['id'].startswith('task-'))
        self.assertTrue(task['code'].startswith('TSK-'))
        self.assertEqual(task['parish_code'], 'PAR-10')
        self.assertEqual(task['axis'], 'A2')
        self.assertEqual(task['outcome'], 'A2.R2')
        self.assertEqual(task['intervention'], 'A2.I1')
        self.assertEqual(task['indicator'], 'KPI-A2-R2')
        self.assertEqual(task['ap'], 'AP1')
        self.assertEqual(task['pastoral_quarter'], 'Q1')
        self.assertEqual(task['min_threshold'], 24.0)     # round(40 * 0.6)
        self.assertEqual(task['target_threshold'], 36.0)  # round(40 * 0.9)
        self.assertEqual(task['status'], 'PENDING')

    def test_tc_strat_06_parish_auto_scoping_on_task_creation(self):
        """TC-STRAT-06: Non-diocesan user submitting another parish's code is auto-scoped to assigned_parish."""
        cpjp_save = make_parish_user('PAR-03', 'APSE_CPJP')
        task = self.engine.v1_create_task(cpjp_save, {
            'title': 'Save Legal Aid Session',
            'outcome_code': 'A4.R1',
            'parish_code': 'PAR-10',  # Attempt to create for Butare Cathedral
            'due_date': '2026-11-20',
            'planned_target': 25,
        })
        self.assertEqual(task['parish_code'], 'PAR-03')

    def test_tc_strat_07_plain_language_validation_on_task_creation(self):
        """TC-STRAT-07: Blank title, planned_target <= 0, or non-numeric target returns 422 plain_error."""
        with self.assertRaises(Fault) as ctx1:
            self.engine.v1_create_task(self.mel_user, {'title': '   ', 'planned_target': 10})
        self.assertEqual(ctx1.exception.status, 422)
        self.assertEqual(ctx1.exception.code, 'plain_error')
        self.assertEqual(ctx1.exception.details, 'Please enter a short, clear title for this activity.')

        for bad_target in (0, -10):
            with self.assertRaises(Fault) as ctx2:
                self.engine.v1_create_task(self.mel_user, {'title': 'Valid Title', 'planned_target': bad_target})
            self.assertEqual(ctx2.exception.status, 422)
            self.assertEqual(ctx2.exception.details, 'Planned target must be at least 1.')

        with self.assertRaises(Fault) as ctx3:
            self.engine.v1_create_task(self.mel_user, {'title': 'Valid Title', 'planned_target': 'not-a-number'})
        self.assertEqual(ctx3.exception.status, 422)
        self.assertEqual(ctx3.exception.details, 'Enter valid positive numbers for the target and thresholds.')

    def test_tc_strat_08_pastoral_year_boundaries_ap1_to_ap5(self):
        """TC-STRAT-08: Pastoral Year boundaries AP1-AP5 (2026-09-01 to 2031-08-31)."""
        boundaries = [
            ('2026-09-01', 'AP1', '2026–2027', 'Q1'),
            ('2027-08-31', 'AP1', '2026–2027', 'Q4'),
            ('2027-09-01', 'AP2', '2027–2028', 'Q1'),
            ('2028-08-31', 'AP2', '2027–2028', 'Q4'),
            ('2028-09-01', 'AP3', '2028–2029', 'Q1'),
            ('2029-08-31', 'AP3', '2028–2029', 'Q4'),
            ('2029-09-01', 'AP4', '2029–2030', 'Q1'),
            ('2030-08-31', 'AP4', '2029–2030', 'Q4'),
            ('2030-09-01', 'AP5', '2030–2031', 'Q1'),
            ('2031-08-31', 'AP5', '2030–2031', 'Q4'),
        ]
        for d_str, exp_ap, exp_label, exp_q in boundaries:
            res = compute_pastoral(d_str)
            self.assertIsNotNone(res, f'Failed on {d_str}')
            self.assertEqual(res['ap'], exp_ap)
            self.assertEqual(res['year_label'], exp_label)
            self.assertEqual(res['quarter'], exp_q)

    def test_tc_strat_09_pastoral_quarter_auto_tagging_q1_to_q4(self):
        """TC-STRAT-09: Pastoral Quarter auto-tagging across all 12 months."""
        month_quarters = [
            ('2026-09-15', 'Q1', 1), ('2026-10-15', 'Q1', 1), ('2026-11-15', 'Q1', 1),
            ('2026-12-15', 'Q2', 2), ('2027-01-15', 'Q2', 2), ('2027-02-15', 'Q2', 2),
            ('2027-03-15', 'Q3', 3), ('2027-04-15', 'Q3', 3), ('2027-05-15', 'Q3', 3),
            ('2027-06-15', 'Q4', 4), ('2027-07-15', 'Q4', 4), ('2027-08-15', 'Q4', 4),
        ]
        for d_str, exp_q, exp_num in month_quarters:
            res = compute_pastoral(d_str)
            self.assertEqual(res['quarter'], exp_q)
            self.assertEqual(res['quarter_num'], exp_num)
            self.assertEqual(res['ap'], 'AP1')

    def test_tc_strat_10_leap_year_handling(self):
        """TC-STRAT-10: Leap-year handling (2028-02-29 valid in AP2 Q2 vs 2027-02-29 rejected)."""
        leap_valid = compute_pastoral('2028-02-29')
        self.assertIsNotNone(leap_valid)
        self.assertEqual(leap_valid['ap'], 'AP2')
        self.assertEqual(leap_valid['quarter'], 'Q2')

        self.assertIsNone(compute_pastoral('2027-02-29'))
        with self.assertRaises(Fault) as ctx:
            self.engine.v1_create_task(self.mel_user, {'title': 'Bad Leap Date', 'due_date': '2027-02-29'})
        self.assertEqual(ctx.exception.status, 422)
        self.assertEqual(ctx.exception.details, 'Pick a date between 1 Sept 2026 and 31 Aug 2031.')

    def test_tc_strat_11_out_of_range_date_rejection(self):
        """TC-STRAT-11: Rejects < 2026-09-01 or > 2031-08-31 in both task creation and log submission."""
        for out_date in ('2026-08-31', '2031-09-01', '2025-12-01', '2032-01-01', 'invalid-date'):
            self.assertIsNone(compute_pastoral(out_date))
            with self.assertRaises(Fault) as ctx1:
                self.engine.v1_create_task(self.mel_user, {'title': 'Out of range', 'due_date': out_date})
            self.assertEqual(ctx1.exception.status, 422)
            self.assertEqual(ctx1.exception.details, 'Pick a date between 1 Sept 2026 and 31 Aug 2031.')

            with self.assertRaises(Fault) as ctx2:
                self.engine.v1_submit_log(self.mel_user, {
                    'task_id': 'task-a2-gakoma-01',
                    'centrale': 'Kizenga',
                    'event_date': out_date,
                    'women': 5, 'men': 5, 'age_18_35': 10, 'outcome_value': 15,
                })
            self.assertEqual(ctx2.exception.status, 422)
            self.assertEqual(ctx2.exception.details, 'Pick a date between 1 Sept 2026 and 31 Aug 2031.')

    def test_tc_strat_12_action_completion_decoupled_from_impact_rating(self):
        """TC-STRAT-12: Task can be 100% completed with LOW impact, or 50% completed with GREAT impact."""
        # Case A: 100% completed (sessions_done=150 of 150) with LOW impact (outcome_value=40 < min_threshold=90)
        self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a4-save-03',
            'centrale': 'Save Centre',
            'event_date': '2026-11-10',
            'women': 80, 'men': 70, 'age_18_35': 150,
            'sessions_done': 150,
            'outcome_value': 40,
            'issue_severity': 'MEDIUM',
            'issue_categories': ['Turnout'],
            'issue_note': 'Many participants arrived late for the legal test.',
        })
        # Case B: 50% completed (sessions_done=3 of 6) with GREAT impact (outcome_value=6 >= target_threshold=6)
        self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a5-nyanza-06',
            'centrale': 'Nyanza Centre',
            'event_date': '2026-11-12',
            'women': 3, 'men': 3, 'age_36_64': 6,
            'sessions_done': 3,
            'outcome_value': 6,
        })
        tasks = {t['id']: t for t in self.engine.v1_bootstrap(self.mel_user)['tasks']}
        t_save = tasks['task-a4-save-03']
        self.assertEqual(t_save['completion_pct'], 100.0)
        self.assertEqual(t_save['status'], 'COMPLETED')
        self.assertEqual(t_save['impact_rating'], 'LOW')

        t_nyanza = tasks['task-a5-nyanza-06']
        self.assertEqual(t_nyanza['completion_pct'], 50.0)
        self.assertEqual(t_nyanza['status'], 'IN_PROGRESS')
        self.assertEqual(t_nyanza['impact_rating'], 'GREAT')

    def test_tc_strat_13_impact_threshold_boundaries(self):
        """TC-STRAT-13: Impact threshold boundaries (PENDING, LOW, GOOD, GREAT)."""
        self.assertEqual(compute_impact_rating(None, 12, 18), 'PENDING')
        self.assertEqual(compute_impact_rating(0, 12, 18), 'LOW')
        self.assertEqual(compute_impact_rating(11.99, 12, 18), 'LOW')
        self.assertEqual(compute_impact_rating(12, 12, 18), 'GOOD')
        self.assertEqual(compute_impact_rating(15, 12, 18), 'GOOD')
        self.assertEqual(compute_impact_rating(17.99, 12, 18), 'GOOD')
        self.assertEqual(compute_impact_rating(18, 12, 18), 'GREAT')
        self.assertEqual(compute_impact_rating(25, 12, 18), 'GREAT')

    def test_tc_strat_14_under_achievement_requires_issue_severity_and_note(self):
        """TC-STRAT-14: When outcome_value < min_threshold, blocks submit unless issue_severity != NONE and note non-empty."""
        with self.assertRaises(Fault) as ctx:
            self.engine.v1_submit_log(self.mel_user, {
                'task_id': 'task-a2-gakoma-01',  # min_threshold = 12
                'centrale': 'Kizenga',
                'event_date': '2026-10-25',
                'women': 6, 'men': 4, 'age_18_35': 10,
                'outcome_value': 9,
                'issue_severity': 'NONE',
                'issue_note': '',
            })
        self.assertEqual(ctx.exception.status, 422)
        self.assertEqual(
            ctx.exception.details,
            'Target not reached (9 of 12). Please select an issue level and add a short note.'
        )

    def test_tc_strat_15_outcome_accordion_rollup_impact_rating(self):
        """TC-STRAT-15: Outcome Accordion roll-up impact rating (LOW if any LOW, GREAT if all GREAT, else GOOD/PENDING)."""
        # Add a second task to A1.R1 (which currently has 1 GREAT task)
        t2 = self.engine.v1_create_task(self.mel_user, {
            'title': 'Second A1.R1 Healing Circle',
            'outcome_code': 'A1.R1',
            'parish_code': 'PAR-10',
            'due_date': '2026-12-01',
            'planned_target': 20,
            'min_threshold': 12,
            'target_threshold': 18,
        })
        # While t2 is PENDING, non-PENDING ratings for A1.R1 are ['GREAT'] -> overall 'GREAT'
        boot1 = self.engine.v1_bootstrap(self.mel_user)
        acc_a1r1 = next(a for a in boot1['analytics']['accordions'] if a['outcome_code'] == 'A1.R1')
        self.assertEqual(acc_a1r1['impact_rating'], 'GREAT')

        # Log GOOD outcome on t2 -> ratings ['GREAT', 'GOOD'] -> overall 'GOOD'
        log_t2 = self.engine.v1_submit_log(self.mel_user, {
            'task_id': t2['id'],
            'centrale': 'Ste Thérèse',
            'event_date': '2026-11-05',
            'women': 10, 'men': 5, 'age_18_35': 15,
            'outcome_value': 15,
        })
        boot2 = self.engine.v1_bootstrap(self.mel_user)
        acc_a1r1_good = next(a for a in boot2['analytics']['accordions'] if a['outcome_code'] == 'A1.R1')
        self.assertEqual(acc_a1r1_good['impact_rating'], 'GOOD')

        # Update log_t2 to LOW outcome -> ratings ['GREAT', 'LOW'] -> overall 'LOW'
        self.engine.v1_submit_log(self.mel_user, {
            'id': log_t2['id'],
            'task_id': t2['id'],
            'centrale': 'Ste Thérèse',
            'event_date': '2026-11-05',
            'women': 10, 'men': 5, 'age_18_35': 15,
            'outcome_value': 5,
            'issue_severity': 'MINOR',
            'issue_note': 'Rain reduced attendance.',
        })
        boot3 = self.engine.v1_bootstrap(self.mel_user)
        acc_a1r1_low = next(a for a in boot3['analytics']['accordions'] if a['outcome_code'] == 'A1.R1')
        self.assertEqual(acc_a1r1_low['impact_rating'], 'LOW')


class Domain3FieldCaptureLocalizationOfflineTests(unittest.TestCase):
    """Domain 3: Field Data Capture, Localization & Offline Resilience (TC-CAP-01 through TC-CAP-18)."""

    def setUp(self):
        self.engine = Engine(':memory:', Fernet.generate_key(), b'2' * 32)
        self.mel_user = make_mel_user()

    def tearDown(self):
        self.engine.db.close()

    def test_tc_cap_01_step1_date_location_and_task_gatekeeping(self):
        """TC-CAP-01: Step 1 backend gatekeeping on unknown task, out-of-range date, and empty Centrale."""
        with self.assertRaises(Fault) as ctx_task:
            self.engine.v1_submit_log(self.mel_user, {
                'task_id': 'task-nonexistent',
                'centrale': 'Kizenga',
                'event_date': '2026-10-20',
            })
        self.assertEqual(ctx_task.exception.status, 404)
        self.assertEqual(ctx_task.exception.details, 'Selected task was not found. Please refresh your task list.')

        with self.assertRaises(Fault) as ctx_centrale:
            self.engine.v1_submit_log(self.mel_user, {
                'task_id': 'task-a2-gakoma-01',
                'centrale': '   ',
                'event_date': '2026-10-20',
            })
        self.assertEqual(ctx_centrale.exception.status, 422)
        self.assertEqual(ctx_centrale.exception.details, 'Select a Centrale or community location in Step 1.')

    def test_tc_cap_03_confidential_case_privacy_gate(self):
        """TC-CAP-03 & TC-GOV-09: is_sensitive task requires privacy_confirmed=True before submission."""
        with self.assertRaises(Fault) as ctx:
            self.engine.v1_submit_log(self.mel_user, {
                'task_id': 'task-a1-ngoma-05',  # is_sensitive = 1
                'centrale': 'Ngoma Centre',
                'event_date': '2026-11-01',
                'women': 8, 'men': 7, 'age_18_35': 15,
                'outcome_value': 14,
                'privacy_confirmed': False,
            })
        self.assertEqual(ctx.exception.status, 422)
        self.assertEqual(
            ctx.exception.details,
            'Please check the box confirming no victim names or private medical details are in the notes.'
        )

        # Succeeds when privacy_confirmed=True
        ok_log = self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a1-ngoma-05',
            'centrale': 'Ngoma Centre',
            'event_date': '2026-11-01',
            'women': 8, 'men': 7, 'age_18_35': 15,
            'outcome_value': 14,
            'privacy_confirmed': True,
        })
        self.assertEqual(ok_log['impact_rating'], 'GREAT')
        self.assertTrue(ok_log['payload']['privacy_confirmed'])

    def test_tc_cap_04_to_07_all_four_collection_modes_payload_persistence(self):
        """TC-CAP-04, TC-CAP-05, TC-CAP-06, TC-CAP-07: ENUMERATOR, FOCUS_GROUP, SURVEY, OBSERVATION modes."""
        # TC-CAP-04: ENUMERATOR mode
        respondents = [
            {'code': 'RESP-01', 'score': 92, 'resolved_case': True},
            {'code': 'RESP-02', 'score': 65, 'resolved_case': False},
        ]
        log_enum = self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a2-gakoma-01',
            'centrale': 'Kizenga',
            'event_date': '2026-11-01',
            'collection_mode': 'ENUMERATOR',
            'women': 10, 'men': 10, 'age_18_35': 20,
            'outcome_value': 18,
            'respondents': respondents,
        })
        self.assertEqual(log_enum['collection_mode'], 'ENUMERATOR')
        self.assertEqual(log_enum['payload']['respondents'], respondents)

        # TC-CAP-05: FOCUS_GROUP mode
        log_fg = self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a1-butare-02',
            'centrale': 'Ste Thérèse',
            'event_date': '2026-11-02',
            'collection_mode': 'FOCUS_GROUP',
            'women': 20, 'men': 15, 'age_36_64': 35,
            'outcome_value': 45,
            'duration_hours': 4,
            'consensus_notes': 'Strong community consensus on reconciliation.',
        })
        self.assertEqual(log_fg['collection_mode'], 'FOCUS_GROUP')
        self.assertEqual(log_fg['payload']['duration_hours'], 4)
        self.assertEqual(log_fg['payload']['consensus_notes'], 'Strong community consensus on reconciliation.')

        # TC-CAP-06: SURVEY mode (including Council Note: forms_returned > forms_distributed is not blocked)
        log_surv = self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a4-save-03',
            'centrale': 'Save Centre',
            'event_date': '2026-11-03',
            'collection_mode': 'SURVEY',
            'women': 70, 'men': 60, 'age_18_35': 130,
            'outcome_value': 130,
            'forms_distributed': 50,
            'forms_returned': 60,
        })
        self.assertEqual(log_surv['collection_mode'], 'SURVEY')
        self.assertEqual(log_surv['payload']['forms_distributed'], 50)
        self.assertEqual(log_surv['payload']['forms_returned'], 60)

        # TC-CAP-07: OBSERVATION mode
        checklist = ['✓ Attendance sheet signed', '✓ Community action plan agreed']
        log_obs = self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a3-kibeho-04',
            'centrale': 'Kibeho',
            'event_date': '2026-11-04',
            'collection_mode': 'OBSERVATION',
            'women': 50, 'men': 50, 'age_18_35': 100,
            'outcome_value': 450,
            'checklist': checklist,
            'observation_notes': 'Terraces and agroforestry seedlings verified on site.',
        })
        self.assertEqual(log_obs['collection_mode'], 'OBSERVATION')
        self.assertEqual(log_obs['payload']['checklist'], checklist)
        self.assertEqual(log_obs['payload']['observation_notes'], 'Terraces and agroforestry seedlings verified on site.')

    def test_tc_cap_08_auto_calculated_total_ignores_tampered_client_total(self):
        """TC-CAP-08: Server auto-calculates total = women + men, ignoring tampered client total."""
        log = self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a2-gakoma-01',
            'centrale': 'Kizenga',
            'event_date': '2026-11-05',
            'women': 14,
            'men': 11,
            'total': 99999,  # Tampered client total
            'age_18_35': 25,
            'outcome_value': 19,
        })
        self.assertEqual(log['women'], 14)
        self.assertEqual(log['men'], 11)
        self.assertEqual(log['total'], 25)

    def test_tc_cap_09_age_group_sum_validation_add_and_remove_messages(self):
        """TC-CAP-09: Age group sum mismatch raises exact actionable 'Add X more.' / 'Remove X.' message."""
        # Case 1: age_sum (17) < total (20) -> Add 3 more.
        with self.assertRaises(Fault) as ctx_add:
            self.engine.v1_submit_log(self.mel_user, {
                'task_id': 'task-a2-gakoma-01',
                'centrale': 'Kizenga',
                'event_date': '2026-11-05',
                'women': 12, 'men': 8,
                'age_u18': 2, 'age_18_35': 10, 'age_36_64': 5, 'age_65': 0,
                'outcome_value': 18,
            })
        self.assertEqual(ctx_add.exception.status, 422)
        self.assertEqual(
            ctx_add.exception.details,
            'Age group numbers add up to 17, but you entered 20 total participants. Add 3 more.'
        )

        # Case 2: age_sum (24) > total (20) -> Remove 4.
        with self.assertRaises(Fault) as ctx_rem:
            self.engine.v1_submit_log(self.mel_user, {
                'task_id': 'task-a2-gakoma-01',
                'centrale': 'Kizenga',
                'event_date': '2026-11-05',
                'women': 12, 'men': 8,
                'age_u18': 4, 'age_18_35': 12, 'age_36_64': 6, 'age_65': 2,
                'outcome_value': 18,
            })
        self.assertEqual(ctx_rem.exception.status, 422)
        self.assertEqual(
            ctx_rem.exception.details,
            'Age group numbers add up to 24, but you entered 20 total participants. Remove 4.'
        )

    def test_tc_cap_10_disability_subset_validation(self):
        """TC-CAP-10: Rejects disability > total with exact plain-language error."""
        with self.assertRaises(Fault) as ctx:
            self.engine.v1_submit_log(self.mel_user, {
                'task_id': 'task-a2-gakoma-01',
                'centrale': 'Kizenga',
                'event_date': '2026-11-05',
                'women': 8, 'men': 7,
                'age_18_35': 15,
                'disability': 19,
                'outcome_value': 18,
            })
        self.assertEqual(ctx.exception.status, 422)
        self.assertEqual(
            ctx.exception.details,
            'Participants with disabilities (19) cannot be higher than total participants (15).'
        )

    def test_tc_cap_11_under_achievement_both_severity_and_note_required(self):
        """TC-CAP-11: Under-achievement rejects when either issue_severity=='NONE' or issue_note is blank."""
        # Severity provided, but note is blank -> rejected
        with self.assertRaises(Fault) as ctx1:
            self.engine.v1_submit_log(self.mel_user, {
                'task_id': 'task-a2-gakoma-01',  # min_threshold = 12
                'centrale': 'Kizenga',
                'event_date': '2026-11-05',
                'women': 5, 'men': 5, 'age_18_35': 10,
                'outcome_value': 7,
                'issue_severity': 'MINOR',
                'issue_note': '   ',
            })
        self.assertEqual(ctx1.exception.status, 422)

        # Note provided, but severity is NONE -> rejected
        with self.assertRaises(Fault) as ctx2:
            self.engine.v1_submit_log(self.mel_user, {
                'task_id': 'task-a2-gakoma-01',
                'centrale': 'Kizenga',
                'event_date': '2026-11-05',
                'women': 5, 'men': 5, 'age_18_35': 10,
                'outcome_value': 7,
                'issue_severity': 'NONE',
                'issue_note': 'Transport delayed facilitators.',
            })
        self.assertEqual(ctx2.exception.status, 422)

    def test_tc_cap_13_source_narrative_and_utf8_diacritic_preservation(self):
        """TC-CAP-13: Preserves UTF-8 accents, curly apostrophes, and multilingual narratives byte-for-byte."""
        centrale_utf8 = 'Santarali ya Ste Thérèse — Cy’Isanamitima & Réconciliation'
        notes_utf8 = 'Inyandiko y’umwimerere: Écoute fraternelle à Ngoma — Ubumwe n’Ubwiyunge (100%)'
        story_utf8 = 'Abaturage b’i Save bavuze ko amahoro yagarutse mu miryango yabo.'
        log = self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a1-butare-02',
            'centrale': centrale_utf8,
            'event_date': '2026-11-06',
            'collection_mode': 'FOCUS_GROUP',
            'women': 15, 'men': 15, 'age_18_35': 30,
            'outcome_value': 45,
            'consensus_notes': notes_utf8,
            'story_of_change': story_utf8,
        })
        self.assertEqual(log['centrale'], centrale_utf8)
        self.assertEqual(log['payload']['consensus_notes'], notes_utf8)
        self.assertEqual(log['payload']['story_of_change'], story_utf8)

        csv_bytes, _, _ = self.engine.v1_export(self.mel_user, 'impact_summary', 'csv', 'natural', 'rw')
        csv_text = csv_bytes.decode('utf-8')
        self.assertIn(centrale_utf8, csv_text)
        self.assertIn('ikiganiro cya Isanamitima na GURR mu matsinda', csv_text)

    def test_tc_cap_14_v8_capture_nfc_normalization_and_distinct_preparers(self):
        """TC-CAP-14: validate_capture normalizes NFC + casefold to reject duplicate preparers and requires CNV/DNH/trauma checks."""
        # NFD 'Je\u0301ro\u0302me' vs NFC 'J\u00e9r\u00f4me' should collide after NFC + casefold
        nfd_name = unicodedata.normalize('NFD', 'Jérôme Ndayisaba')
        nfc_name = unicodedata.normalize('NFC', 'jérôme ndayisaba')
        self.assertNotEqual(nfd_name, nfc_name)

        with self.assertRaises(Fault) as ctx_dup:
            self.engine.validate_capture(
                self.mel_user,
                'F07',
                {
                    'capture_profile': 'V8',
                    'preparer_mode': 'PAIR',
                    'preparer_1': nfd_name,
                    'preparer_2': nfc_name,
                    'cnv_checked': 'true',
                    'dnh_checked': 'true',
                    'trauma_checked': 'true',
                    'sensitivity_notes': 'Checked for trauma triggers.',
                    'total': '10', 'women': '6', 'men': '4', 'undisclosed': '0', 'disability': '1',
                },
                '2026-10-20',
                submitting=True,
            )
        self.assertEqual(ctx_dup.exception.code, 'distinct_preparation_names_required')

        # Missing trauma_checked or sensitivity_notes raises sensitivity_review_required
        with self.assertRaises(Fault) as ctx_sens:
            self.engine.validate_capture(
                self.mel_user,
                'F07',
                {
                    'capture_profile': 'V8',
                    'preparer_mode': 'PAIR',
                    'preparer_1': 'Alice Mukamana',
                    'preparer_2': 'Jean Habimana',
                    'cnv_checked': 'true',
                    'dnh_checked': 'true',
                    'trauma_checked': 'false',
                    'sensitivity_notes': 'Checked',
                    'total': '10', 'women': '6', 'men': '4', 'undisclosed': '0', 'disability': '1',
                },
                '2026-10-20',
                submitting=True,
            )
        self.assertEqual(ctx_sens.exception.code, 'sensitivity_review_required')

    def test_tc_cap_18_working_drafts_encryption_revision_lock_and_append_only_history(self):
        """TC-CAP-18: Fernet-encrypted /working-drafts, 409 draft_revision_conflict, and append-only draft_history trigger."""
        did = str(uuid.uuid4())
        d1 = self.engine.save_working_draft(
            self.mel_user,
            {
                'id': did,
                'form': 'F07',
                'event_date': '2026-10-22',
                'revision': 0,
                'language': 'rw',
                'values': {'title': 'Draft Secret Healing Session', 'axis': 'A1'},
            },
            'LocalRoot01',
            '/LocalRoot01',
        )
        self.assertEqual(d1['revision'], 1)
        self.assertEqual(d1['status'], 'ACTIVE')

        # Verify encrypted at rest
        raw_blob = self.engine.db.execute('SELECT body FROM working_drafts WHERE id=?', (did,)).fetchone()[0]
        self.assertTrue(raw_blob.startswith(b'gAAAAA'))
        self.assertNotIn(b'Draft Secret Healing Session', raw_blob)

        # Stale revision=0 raises 409 draft_revision_conflict
        with self.assertRaises(Fault) as ctx_conflict:
            self.engine.save_working_draft(
                self.mel_user,
                {
                    'id': did,
                    'form': 'F07',
                    'event_date': '2026-10-22',
                    'revision': 0,
                    'language': 'rw',
                    'values': {'title': 'Stale Update'},
                },
                'LocalRoot01',
                '/LocalRoot01',
            )
        self.assertEqual(ctx_conflict.exception.status, 409)
        self.assertEqual(ctx_conflict.exception.code, 'draft_revision_conflict')

        # Lifecycle transitions: ACTIVE -> TRASH -> ACTIVE -> COMMITTED
        t_res = self.engine.draft_action(self.mel_user, did, 1, 'TRASH')
        self.assertEqual(t_res['status'], 'TRASH')
        self.assertEqual(t_res['revision'], 2)

        r_res = self.engine.draft_action(self.mel_user, did, 2, 'RESTORE')
        self.assertEqual(r_res['status'], 'ACTIVE')
        self.assertEqual(r_res['revision'], 3)

        c_res = self.engine.draft_action(self.mel_user, did, 3, 'COMMIT')
        self.assertEqual(c_res['status'], 'COMMITTED')
        self.assertEqual(c_res['revision'], 4)

        # Verify draft_history append-only triggers block UPDATE and DELETE
        with self.assertRaises(sqlite3.IntegrityError):
            self.engine.db.execute("UPDATE draft_history SET status='TRASH'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.engine.db.execute('DELETE FROM draft_history')


class Domain4GovernanceApprovalsSecurityTests(unittest.TestCase):
    """Domain 4: Governance, Approvals, Security & Privacy (TC-GOV-01 through TC-GOV-16)."""

    def setUp(self):
        self.engine = Engine(':memory:', Fernet.generate_key(), b'3' * 32)
        self.mel_user = make_mel_user()

    def tearDown(self):
        self.engine.db.close()

    def test_tc_gov_01_diocesan_27_parishes_4_districts_101_ccjp_centrales(self):
        """TC-GOV-01: Diocesan role returns 27 parishes across 4 districts and 101 CCJP centrales in metadata."""
        boot = self.engine.v1_bootstrap(self.mel_user)
        self.assertTrue(boot['user']['is_diocesan'])
        self.assertEqual(len(boot['parishes']), 27)
        districts = {}
        for p in boot['parishes']:
            districts[p['district']] = districts.get(p['district'], 0) + 1
        self.assertEqual(districts, {'Gisagara': 9, 'Huye': 11, 'Nyanza': 3, 'Nyaruguru': 4})

        ccjp_units = self.engine.metadata()['ccjp_units']
        self.assertEqual(len(ccjp_units), 101)

    def test_tc_gov_02_parish_scoped_role_and_bootstrap_unfiltered_tasks_finding(self):
        """TC-GOV-02: Non-diocesan user is scoped to assigned_parish; verify Council Finding on unfiltered tasks/logs."""
        cpjp_user = make_parish_user('PAR-03', 'APSE_CPJP')
        boot = self.engine.v1_bootstrap(cpjp_user)
        self.assertFalse(boot['user']['is_diocesan'])
        self.assertEqual(boot['user']['assigned_parish'], 'PAR-03')
        self.assertEqual(len(boot['parishes']), 1)
        self.assertEqual(boot['parishes'][0]['code'], 'PAR-03')

        # Council Finding verification: v1_bootstrap returns all 6 tasks and 3 logs across parishes when parish_filter is None
        parish_codes_in_tasks = {t['parish_code'] for t in boot['tasks']}
        self.assertGreater(len(parish_codes_in_tasks), 1)
        self.assertEqual(len(boot['tasks']), 6)
        self.assertEqual(len(boot['logs']), 3)

    def test_tc_gov_03_centrale_and_ceb_cascading_per_parish(self):
        """TC-GOV-03: Every parish provides up to 6 Centrales and derived CEB lists."""
        boot = self.engine.v1_bootstrap(self.mel_user)
        for p in boot['parishes']:
            self.assertTrue(1 <= len(p['centrales']) <= 6, f"Parish {p['code']} centrales count out of range")
            self.assertTrue(len(p['cebs']) >= 2, f"Parish {p['code']} cebs missing")
            for c in p['centrales']:
                self.assertIn('code', c)
                self.assertIn('name', c)
                self.assertEqual(set(c['labels'].keys()), {'en', 'rw', 'fr', 'sw'})

    def test_tc_gov_04_three_tier_approval_transitions_and_audit(self):
        """TC-GOV-04: 3-Tier Approval flow (SUBMITTED -> PARISH_APPROVED -> DIOCESE_APPROVED)."""
        # log-seed-002 starts at SUBMITTED with revision 1
        r1 = self.engine.v1_review_log(self.mel_user, {
            'id': 'log-seed-002',
            'target_stage': 'PARISH_APPROVED',
            'note': 'Verified by Gakoma CPJP Committee.',
        })
        self.assertEqual(r1['stage'], 'PARISH_APPROVED')
        self.assertEqual(r1['revision'], 2)
        self.assertEqual(len(r1['payload']['reviews']), 1)
        self.assertEqual(r1['payload']['reviews'][0]['stage'], 'PARISH_APPROVED')

        r2 = self.engine.v1_review_log(self.mel_user, {
            'id': 'log-seed-002',
            'target_stage': 'DIOCESE_APPROVED',
            'note': 'Finalized by CDJP MEL.',
        })
        self.assertEqual(r2['stage'], 'DIOCESE_APPROVED')
        self.assertEqual(r2['revision'], 3)
        self.assertEqual(len(r2['payload']['reviews']), 2)
        self.assertEqual(r2['payload']['reviews'][1]['stage'], 'DIOCESE_APPROVED')

        # Invalid review stage raises 422 plain_error
        with self.assertRaises(Fault) as ctx:
            self.engine.v1_review_log(self.mel_user, {'id': 'log-seed-002', 'target_stage': 'INVALID_STAGE'})
        self.assertEqual(ctx.exception.status, 422)
        self.assertEqual(ctx.exception.details, 'Choose a valid review action (Parish Approve, Diocese Approve, or Return).')

    def test_tc_gov_05_correction_return_requires_note_and_stores_step(self):
        """TC-GOV-05: CORRECTION return requires non-empty note and stores correction_step & sets task NEEDS_CORRECTION."""
        with self.assertRaises(Fault) as ctx:
            self.engine.v1_review_log(self.mel_user, {
                'id': 'log-seed-002',
                'target_stage': 'CORRECTION',
                'note': '   ',
                'correction_step': 2,
            })
        self.assertEqual(ctx.exception.status, 422)
        self.assertEqual(ctx.exception.details, 'Please write a short note explaining what needs to be fixed.')

        corr = self.engine.v1_review_log(self.mel_user, {
            'id': 'log-seed-002',
            'target_stage': 'CORRECTION',
            'note': 'Please recount the 18-35 age bracket.',
            'correction_step': 2,
        })
        self.assertEqual(corr['stage'], 'CORRECTION')
        self.assertEqual(corr['payload']['correction_step'], 2)
        self.assertEqual(corr['payload']['correction_note'], 'Please recount the 18-35 age bracket.')

        boot = self.engine.v1_bootstrap(self.mel_user)
        task = next(t for t in boot['tasks'] if t['id'] == 'task-a2-gakoma-01')
        self.assertEqual(task['status'], 'NEEDS_CORRECTION')

    def test_tc_gov_07_and_08_silent_amendment_creation_and_lineage_filter_behavior(self):
        """TC-GOV-07 & TC-GOV-08: Editing DIOCESE_APPROVED log creates version=2 child; verify parent_id filter finding."""
        # log-seed-001 is DIOCESE_APPROVED (version=1, total=48, outcome_value=46)
        amended = self.engine.v1_submit_log(self.mel_user, {
            'id': 'log-seed-001',
            'task_id': 'task-a1-butare-02',
            'centrale': 'Ste Thérèse',
            'event_date': '2026-10-10',
            'collection_mode': 'FOCUS_GROUP',
            'women': 35, 'men': 25,
            'age_u18': 5, 'age_18_35': 25, 'age_36_64': 20, 'age_65': 10,
            'disability': 4,
            'sessions_done': 4,
            'outcome_value': 55,
        })
        self.assertNotEqual(amended['id'], 'log-seed-001')
        self.assertEqual(amended['version'], 2)
        self.assertEqual(amended['parent_id'], 'log-seed-001')
        self.assertEqual(amended['stage'], 'SUBMITTED')
        self.assertEqual(amended['total'], 60)

        # Verify original log-seed-001 is untouched in SQLite
        orig_row = self.engine.db.execute("SELECT * FROM v1_logs WHERE id='log-seed-001'").fetchone()
        self.assertEqual(orig_row['version'], 1)
        self.assertEqual(orig_row['stage'], 'DIOCESE_APPROVED')
        self.assertEqual(orig_row['total'], 48)

        # Verify Council Finding TC-GOV-08: _compute_v1_analytics filters parent_id is None (keeping 140 instead of 152),
        # whereas v1_export iterates all logs without filtering parent_id (exporting 4 rows instead of 3).
        boot = self.engine.v1_bootstrap(self.mel_user)
        self.assertEqual(boot['analytics']['summary']['total_participants'], 140)
        csv_bytes, _, _ = self.engine.v1_export(self.mel_user, 'impact_summary', 'csv', 'natural', 'en')
        csv_rows = list(csv.reader(io.StringIO(csv_bytes.decode('utf-8-sig'))))
        self.assertEqual(len(csv_rows), 5)  # 1 header + 4 logs (both parent v1 and child v2 exported)

    def test_tc_gov_12_fernet_encryption_at_rest_all_tables(self):
        """TC-GOV-12: Raw SQLite body blobs in v1_tasks, v1_logs, and records start with gAAAAA and contain no plaintext."""
        self.engine.create(
            self.mel_user, 'F09', 'LocalRoot01', '/LocalRoot01', '2026-10-20',
            {'record': 'CONF-01', 'case': 'TOP-SECRET-CASE-ID', 'consent': 'true'},
            'idemp-key-fernet-test-0001'
        )
        for table, marker in [
            ('v1_tasks', b'Isanamitima'),
            ('v1_logs', b'Ste Th'),
            ('records', b'TOP-SECRET-CASE-ID'),
        ]:
            for (blob,) in self.engine.db.execute(f'SELECT body FROM {table}'):
                self.assertTrue(bytes(blob).startswith(b'gAAAAA'), f'{table}.body is not Fernet token')
                self.assertNotIn(marker, bytes(blob), f'Plaintext leaked in {table}.body')

    def test_tc_gov_13_append_only_hmac_audit_chain_and_sqlite_triggers(self):
        """TC-GOV-13: Append-only HMAC audit chain verification & SQLite triggers blocking UPDATE/DELETE."""
        res = self.engine.verify_audit()
        self.assertGreaterEqual(res['entries'], 0)
        self.engine.v1_create_task(self.mel_user, {'title': 'Audit Check Task', 'planned_target': 10})
        res2 = self.engine.verify_audit()
        self.assertGreater(res2['entries'], res['entries'])
        self.assertNotEqual(res2['head'], 'GENESIS')

        with self.assertRaises(sqlite3.IntegrityError):
            self.engine.db.execute("UPDATE audit SET action='TAMPERED'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.engine.db.execute('DELETE FROM audit')

    def test_tc_gov_14_portable_vault_pbkdf2_password_policy_and_429_lockout(self):
        """TC-GOV-14: Portable vault 14+ char master passphrase, 12+ char user password, and 429 rate limiting."""
        with tempfile.TemporaryDirectory() as tmp:
            # Master passphrase < 14 chars rejected
            with self.assertRaises(ValueError) as ctx_short:
                portable.unlock(tmp, 'shortpass123', create=True)
            self.assertIn('14 characters minimum', str(ctx_short.exception))

            # Valid 14+ char master passphrase creates vault.json
            keys = portable.unlock(tmp, 'StrongMasterPass14!', create=True)
            self.assertIn('encryption', keys)
            self.assertIn('audit', keys)

            # Wrong master passphrase rejected
            with self.assertRaises(ValueError) as ctx_wrong:
                portable.unlock(tmp, 'WrongMasterPass14!', create=False)
            self.assertIn('Wrong master passphrase', str(ctx_wrong.exception))

            # User account password < 12 chars rejected
            accounts = portable.Accounts(tmp, keys['encryption'])
            with self.assertRaises(ValueError):
                accounts.add('mel_admin', 'short11char', ['APSE_MEL'], ['/LocalRoot01'])

            accounts.add('mel_admin', 'ValidPassword12!', ['APSE_MEL'], ['/LocalRoot01'])
            self.assertTrue(accounts.verify('mel_admin', 'ValidPassword12!'))
            self.assertFalse(accounts.verify('mel_admin', 'WrongPassword12!'))

            # 5 failed logins in 60s -> 6th returns 429 even with valid password
            sess = portable.LocalSession(accounts, portable.local_units())
            for _ in range(5):
                tok, status = sess.login('mel_admin', 'WrongPassword12!')
                self.assertIsNone(tok)
                self.assertEqual(status, 401)
            tok6, status6 = sess.login('mel_admin', 'ValidPassword12!')
            self.assertIsNone(tok6)
            self.assertEqual(status6, 429)

    def test_tc_gov_15_institutional_planning_boundary_and_v1_tasks_role_finding(self):
        """TC-GOV-15: CCJP/CEB/PARISH_REPORTER denied on /planning; verify Council Finding on v1_create_task."""
        for role in ('APSE_CCJP', 'APSE_CEB', 'APSE_PARISH_REPORTER'):
            u = make_parish_user('PAR-01', role)
            with self.assertRaises(Fault) as ctx:
                self.engine.planning(u, 'AP1', 'CPJP')
            self.assertEqual(ctx.exception.status, 403)
            self.assertEqual(ctx.exception.code, 'planning_cdjp_cpjp_only')

        # CPJP can access CPJP planning, but is denied CDJP/STAFF planning
        cpjp_u = make_parish_user('PAR-01', 'APSE_CPJP')
        plan_cpjp = self.engine.planning(cpjp_u, 'AP1', 'CPJP')
        self.assertEqual(plan_cpjp['audience'], 'CPJP')
        with self.assertRaises(Fault) as ctx_staff:
            self.engine.planning(cpjp_u, 'AP1', 'CDJP')
        self.assertEqual(ctx_staff.exception.status, 403)
        self.assertEqual(ctx_staff.exception.code, 'staff_plan_denied')

        # Verify Council Finding: v1_create_task does not check user roles, allowing APSE_CCJP to create a v1 task
        ccjp_u = make_parish_user('PAR-01', 'APSE_CCJP')
        created = self.engine.v1_create_task(ccjp_u, {'title': 'CCJP Task Allowed Without Role Guard', 'planned_target': 10})
        self.assertTrue(created['id'].startswith('task-'))

    def test_tc_gov_16_portfolio_classification_and_cpjp_6_seat_invariant(self):
        """TC-GOV-16: Enforces active project on PROJECT, no project on OPERATIONAL, and committeeSize == 6."""
        with self.assertRaises(Fault) as ctx1:
            self.engine.validate_portfolio(self.mel_user, {'work_type': 'PROJECT'}, '2026-10-20')
        self.assertEqual(ctx1.exception.code, 'project_required')

        with self.assertRaises(Fault) as ctx2:
            self.engine.validate_portfolio(self.mel_user, {'work_type': 'OPERATIONAL', 'project': 'PRJ-01'}, '2026-10-20')
        self.assertEqual(ctx2.exception.code, 'operational_cannot_have_project')

        # CPJP governance 6-seat invariant
        gov_entry = dict(self.engine.metadata()['cpjp_governance'][0], committeeSize=5)
        with self.assertRaises(Fault) as ctx3:
            self.engine.put_metadata(self.mel_user, 'cpjp_governance', gov_entry, 0, 'Attempt to shrink committee')
        self.assertEqual(ctx3.exception.code, 'cpjp_structure_requires_institutional_revision')


class Domain5AnalyticsMapAndTransfersTests(unittest.TestCase):
    """Domain 5: Analytics, Regional Map & Data Transfer (TC-ANA-01 through TC-ANA-16)."""

    def setUp(self):
        self.engine = Engine(':memory:', Fernet.generate_key(), b'4' * 32)
        self.mel_user = make_mel_user()

    def tearDown(self):
        self.engine.db.close()

    def test_tc_ana_01_top_kpi_strip_accuracy_on_seed_dataset(self):
        """TC-ANA-01: Top KPI Strip exact math on default seed dataset."""
        summary = self.engine.v1_bootstrap(self.mel_user)['analytics']['summary']
        self.assertEqual(summary['tasks_total'], 6)
        self.assertEqual(summary['tasks_completed'], 1)
        self.assertEqual(summary['avg_completion_pct'], 38.0)
        self.assertEqual(summary['total_participants'], 140)
        self.assertEqual(summary['women'], 77)
        self.assertEqual(summary['men'], 63)
        self.assertEqual(summary['disability'], 6)
        self.assertEqual(summary['pending_approvals'], 2)
        self.assertEqual(summary['impact_counts'], {'GREAT': 1, 'GOOD': 1, 'LOW': 1, 'PENDING': 3})

    def test_tc_ana_02_bottleneck_insight_banner_calculation_and_par10_zero_issues(self):
        """TC-ANA-02: Unfiltered bottleneck shows 100% Transport across 2 issue logs; PAR-10 filter shows None/0."""
        ana_all = self.engine.v1_bootstrap(self.mel_user)['analytics']
        self.assertEqual(ana_all['summary']['issues_total'], 2)
        self.assertEqual(ana_all['summary']['top_bottleneck_category'], 'Transport')
        self.assertEqual(ana_all['summary']['top_bottleneck_pct'], 100)
        self.assertEqual(
            ana_all['category_breakdown'],
            {'Transport': 2, 'Budget': 1, 'Weather': 1, 'Turnout': 0, 'Security': 0, 'Other': 0}
        )

        ana_par10 = self.engine.v1_bootstrap(self.mel_user, parish_filter='PAR-10')['analytics']
        self.assertEqual(ana_par10['summary']['issues_total'], 0)
        self.assertIsNone(ana_par10['summary']['top_bottleneck_category'])
        self.assertEqual(ana_par10['summary']['top_bottleneck_pct'], 0)

    def test_tc_ana_03_contextual_filtering_by_parish_axis_and_period_finding(self):
        """TC-ANA-03: Contextual filtering by parish, axis, AP1, and verify Council Finding on Q2 task filtering."""
        ana_par01 = self.engine.v1_bootstrap(self.mel_user, parish_filter='PAR-01')['analytics']
        self.assertEqual(ana_par01['summary']['tasks_total'], 1)
        self.assertEqual(ana_par01['summary']['total_participants'], 12)
        self.assertEqual([a['outcome_code'] for a in ana_par01['accordions']], ['A2.R1'])

        ana_axis_a3 = self.engine.v1_bootstrap(self.mel_user, axis_filter='A3')['analytics']
        self.assertEqual(ana_axis_a3['summary']['tasks_total'], 1)
        self.assertEqual(ana_axis_a3['summary']['total_participants'], 80)
        self.assertEqual([a['outcome_code'] for a in ana_axis_a3['accordions']], ['A3.R1'])

        # Council Finding verification: period_filter='Q2' filters active_logs (0 participants) but does not filter tasks (remains 6)
        ana_q2 = self.engine.v1_bootstrap(self.mel_user, period_filter='Q2')['analytics']
        self.assertEqual(ana_q2['summary']['total_participants'], 0)
        self.assertEqual(ana_q2['summary']['tasks_total'], 6)

    def test_tc_ana_04_and_05_regional_parish_map_nodes_and_status_color_precedence(self):
        """TC-ANA-04 & TC-ANA-05: 27 Parish map nodes and status color precedence (red > green > amber > neutral)."""
        pmap = {n['code']: n for n in self.engine.v1_bootstrap(self.mel_user)['analytics']['parish_map']}
        self.assertEqual(len(pmap), 27)
        for code, (pname, district, x, y) in PARISH_DISTRICTS.items():
            self.assertIn(code, pmap)
            self.assertEqual(pmap[code]['district'], district)
            self.assertEqual((pmap[code]['x'], pmap[code]['y']), (x, y))

        # Verify seed status colors
        self.assertEqual(pmap['PAR-24']['status_color'], 'red')      # major_issues = 1
        self.assertEqual(pmap['PAR-10']['status_color'], 'green')    # completion_pct = 100.0 >= 80, major_issues = 0
        self.assertEqual(pmap['PAR-01']['status_color'], 'amber')    # completion_pct = 60.0 < 80, major_issues = 0
        self.assertEqual(pmap['PAR-03']['status_color'], 'amber')    # completion_pct = 0.0 (not None)
        self.assertEqual(pmap['PAR-02']['status_color'], 'neutral')  # 0 tasks -> completion_pct is None

        # Verify red > green precedence: submit a MAJOR issue log on PAR-10 (where completion_pct is 100.0)
        self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a1-butare-02',
            'centrale': 'Ste Thérèse',
            'event_date': '2026-11-01',
            'women': 10, 'men': 10, 'age_18_35': 20,
            'outcome_value': 45,
            'issue_severity': 'MAJOR',
            'issue_categories': ['Security'],
            'issue_note': 'Major security interruption during follow-up circle.',
        })
        pmap_after = {n['code']: n for n in self.engine.v1_bootstrap(self.mel_user)['analytics']['parish_map']}
        self.assertEqual(pmap_after['PAR-10']['completion_pct'], 100.0)
        self.assertEqual(pmap_after['PAR-10']['major_issues'], 1)
        self.assertEqual(pmap_after['PAR-10']['status_color'], 'red')

    def test_tc_ana_07_and_08_monthly_trends_6_pastoral_months_and_by_category(self):
        """TC-ANA-07 & TC-ANA-08: monthly_trends spans Sept-Feb and tracks MINOR/MEDIUM/MAJOR and by_category."""
        trends = self.engine.v1_bootstrap(self.mel_user)['analytics']['monthly_trends']
        self.assertEqual([m['month'] for m in trends], ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'])
        oct_entry = next(m for m in trends if m['ym'] == '2026-10')
        self.assertEqual(oct_entry['MINOR'], 0)
        self.assertEqual(oct_entry['MEDIUM'], 1)
        self.assertEqual(oct_entry['MAJOR'], 1)
        self.assertEqual(
            oct_entry['by_category'],
            {'Transport': 2, 'Budget': 1, 'Weather': 1, 'Turnout': 0, 'Security': 0, 'Other': 0}
        )

    def test_tc_ana_09_and_11_accordions_stories_evidence_and_issues(self):
        """TC-ANA-09 & TC-ANA-11: Outcome accordions include stories of change, evidence attachments, and issues."""
        accordions = {a['outcome_code']: a for a in self.engine.v1_bootstrap(self.mel_user)['analytics']['accordions']}
        self.assertEqual(set(accordions.keys()), {'A1.R1', 'A1.R3', 'A2.R1', 'A3.R1', 'A4.R1', 'A5.R1'})

        a1r1 = accordions['A1.R1']
        self.assertEqual(a1r1['impact_rating'], 'GREAT')
        self.assertEqual(len(a1r1['stories']), 1)
        self.assertIn('Two families in Rango cell', a1r1['stories'][0]['text'])
        self.assertEqual(a1r1['documents'][0]['name'], 'Attendance_Sheet_Butare_Oct2026.pdf')
        self.assertEqual(len(a1r1['issues']), 0)

        a2r1 = accordions['A2.R1']
        self.assertEqual(a2r1['impact_rating'], 'LOW')
        self.assertEqual(len(a2r1['issues']), 1)
        self.assertEqual(a2r1['issues'][0]['severity'], 'MEDIUM')

        a3r1 = accordions['A3.R1']
        self.assertEqual(a3r1['impact_rating'], 'GOOD')
        self.assertEqual(len(a3r1['issues']), 1)
        self.assertEqual(a3r1['issues'][0]['severity'], 'MAJOR')

    def test_tc_ana_12_and_13_exports_presets_and_formats_csv_xlsx_docx(self):
        """TC-ANA-12 & TC-ANA-13: Verify natural/donor/dhis2 presets and CSV BOM, XLSX #1E3A2F header, DOCX 7-col table."""
        expected_first_headers = {
            'natural': 'Date',
            'donor': 'Reporting_Date',
            'dhis2': 'eventDate',
        }
        for preset, first_col in expected_first_headers.items():
            for rtype in ('impact_summary', 'parish_activities', 'field_challenges'):
                data, mime, fname = self.engine.v1_export(self.mel_user, rtype, 'csv', preset, 'en')
                self.assertEqual(fname, f'APSE_{rtype}_{preset}.csv')
                self.assertEqual(mime, 'text/csv;charset=utf-8')
                self.assertTrue(data.startswith(b'\xef\xbb\xbf'))
                rows = list(csv.reader(io.StringIO(data.decode('utf-8-sig'))))
                self.assertEqual(len(rows[0]), 14)
                self.assertEqual(rows[0][0], first_col)
                self.assertEqual(len(rows), 4)  # 1 header + 3 seed logs

        # XLSX verification
        xlsx_bytes, xlsx_mime, xlsx_fname = self.engine.v1_export(self.mel_user, 'impact_summary', 'xlsx', 'donor', 'en')
        self.assertEqual(xlsx_fname, 'APSE_impact_summary_donor.xlsx')
        wb = load_workbook(io.BytesIO(xlsx_bytes))
        ws = wb.active
        self.assertEqual(ws.title, 'APSE Export')
        self.assertEqual(ws['A1'].value, 'Reporting_Date')
        self.assertTrue(ws['A1'].font.bold)
        self.assertTrue(str(ws['A1'].fill.fgColor.rgb).endswith('1E3A2F'))

        # DOCX verification
        docx_bytes, docx_mime, docx_fname = self.engine.v1_export(self.mel_user, 'impact_summary', 'docx', 'natural', 'en')
        self.assertEqual(docx_fname, 'APSE_impact_summary.docx')
        doc = Document(io.BytesIO(docx_bytes))
        self.assertIn('CDJP Butare — Strategy & Impact Summary Report', doc.paragraphs[0].text)
        self.assertEqual(len(doc.tables), 1)
        tbl = doc.tables[0]
        self.assertEqual(len(tbl.columns), 7)
        self.assertEqual(len(tbl.rows), 4)
        self.assertEqual([c.text for c in tbl.rows[0].cells], ['Date', 'Parish', 'Activity', 'Total', 'Outcome', 'Impact', 'Status'])

    def test_tc_ana_14_formula_sanitization_and_xlsx_formula_guard(self):
        """TC-ANA-14: Verify safe() prefixing, parse_transfer XLSX formula rejection, and v1_export Council Finding."""
        for dangerous in ('=CMD()', '+SUM(A1)', '-1+2', '@SUM(A1)', '\tTAB', '\rCR'):
            self.assertEqual(safe(dangerous), "'" + dangerous)
        self.assertEqual(safe('Normal text'), 'Normal text')

        # Build an XLSX with an embedded formula and verify parse_transfer raises 422 excel_formulas_not_imported
        wb = Workbook()
        ws = wb.active
        ws.append(['event_date', 'title'])
        ws.append(['2026-10-20', '=SUM(1,2)'])
        buf = io.BytesIO()
        wb.save(buf)
        with self.assertRaises(Fault) as ctx:
            self.engine.parse_transfer(buf.getvalue(), 'xlsx')
        self.assertEqual(ctx.exception.status, 422)
        self.assertEqual(ctx.exception.code, 'excel_formulas_not_imported')

        # Verify Council Finding: v1_export does not apply safe() to formula-prefixed field notes
        self.engine.v1_submit_log(self.mel_user, {
            'task_id': 'task-a2-gakoma-01',
            'centrale': 'Kizenga',
            'event_date': '2026-11-08',
            'women': 5, 'men': 5, 'age_18_35': 10,
            'outcome_value': 8,
            'issue_severity': 'MINOR',
            'issue_note': '=HYPERLINK("http://malicious.example")',
        })
        csv_bytes, _, _ = self.engine.v1_export(self.mel_user, 'impact_summary', 'csv', 'natural', 'en')
        rows = list(csv.reader(io.StringIO(csv_bytes.decode('utf-8-sig'))))
        last_note = rows[-1][12]
        self.assertEqual(last_note, '=HYPERLINK("http://malicious.example")')

    def test_tc_ana_15_and_16_guided_csv_import_aliases_missing_prompt_and_commit(self):
        """TC-ANA-15 & TC-ANA-16: Multilingual alias auto-matching, missing column prompt, custom mapping & bulk commit."""
        # Kinyarwanda / mixed aliases auto-match without custom mapping
        rw_csv = 'Paruwasi,Santarali,Itariki,Abagore,Abagabo,Outcome\nGakoma,Kizenga,2026-10-25,11,9,18\n'
        prev = self.engine.v1_import_csv(self.mel_user, {'csv_text': rw_csv})
        self.assertEqual(prev['missing'], [])
        self.assertEqual(len(prev['preview']), 1)
        self.assertEqual(prev['preview'][0]['total'], 20)
        self.assertEqual(prev['imported'], 0)

        # Missing column detection and 422 on commit=True when unmapped
        bad_csv = 'Unknown_Parish_Col,Centrale,Activity_Date,Women_Count,Men_Count,Outcome_Achieved\nGakoma,Kizenga,2026-10-25,10,10,18\nGakoma,Kizenga,2026-10-26,4,4,6\n'
        miss_res = self.engine.v1_import_csv(self.mel_user, {'csv_text': bad_csv})
        self.assertEqual(len(miss_res['missing']), 1)
        self.assertEqual(
            miss_res['missing'][0]['message'],
            "Column 'Parish_Name' is missing in your file. Select which column contains the Parish Name."
        )
        with self.assertRaises(Fault) as ctx_commit_unmapped:
            self.engine.v1_import_csv(self.mel_user, {'csv_text': bad_csv, 'commit': True})
        self.assertEqual(ctx_commit_unmapped.exception.status, 422)

        # Custom mapping + commit=True imports both rows and auto-tags under-achieving row (outcome 6 < 12) as MINOR
        commit_res = self.engine.v1_import_csv(self.mel_user, {
            'csv_text': bad_csv,
            'mapping': {'parish': 'Unknown_Parish_Col'},
            'commit': True,
        })
        self.assertEqual(commit_res['imported'], 2)
        logs = self.engine.v1_bootstrap(self.mel_user)['logs']
        under_log = next(l for l in logs if l['event_date'] == '2026-10-26' and l['outcome_value'] == 6.0)
        self.assertEqual(under_log['issue_severity'], 'MINOR')
        self.assertEqual(under_log['issue_categories'], ['Other'])
        self.assertEqual(under_log['issue_note'], 'Partial batch imported from CSV spreadsheet.')


class LiveHTTPLoopbackSecurityAndEndpointsTests(unittest.TestCase):
    """Live HTTP Loopback verification against portable_boot.py --no-auth (TC-GOV-10, TC-GOV-11, TC-GOV-13, V1 endpoints)."""

    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.port = 18791
        cls.base_url = f'http://127.0.0.1:{cls.port}'
        cls.proc = subprocess.Popen(
            [
                sys.executable, '-X', 'utf8',
                str(ROOT / 'service/portable_boot.py'),
                '--no-auth', '--no-browser',
                '--port', str(cls.port),
                '--data', cls.temp_dir.name,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
        )
        ready_line = cls.proc.stdout.readline()
        if 'APSE LOCAL' not in ready_line:
            raise RuntimeError(f'Portable server failed to start: {ready_line}')

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        try:
            cls.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.proc.kill()
        cls.temp_dir.cleanup()

    def _req(self, method, path, body=None, headers=None):
        url = self.base_url + path
        req_headers = dict(headers or {})
        data = None
        if body is not None:
            data = body if isinstance(body, bytes) else json.dumps(body).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                raw = resp.read()
                return resp.status, dict(resp.headers), raw
        except urllib.error.HTTPError as e:
            raw = e.read()
            return e.code, dict(e.headers), raw

    def _valid_post_headers(self):
        return {
            'X-APSE-Client': 'web',
            'Origin': self.base_url,
            'Content-Type': 'application/json',
        }

    def test_tc_gov_10_http_csrf_origin_content_type_options_and_body_guards(self):
        """TC-GOV-10: Verify 405 cors_disabled, 403 client_header_required, 403 origin_denied, 415 json_required, 400 object_required."""
        # OPTIONS -> 405 cors_disabled
        st, _, raw = self._req('OPTIONS', '/apse-service/v1/tasks')
        self.assertEqual(st, 405)
        self.assertEqual(json.loads(raw)['error'], 'cors_disabled')

        # Missing X-APSE-Client -> 403 client_header_required
        st, _, raw = self._req('POST', '/apse-service/v1/tasks', {'title': 'T'}, {'Origin': self.base_url, 'Content-Type': 'application/json'})
        self.assertEqual(st, 403)
        self.assertEqual(json.loads(raw)['error'], 'client_header_required')

        # Wrong Origin -> 403 origin_denied
        st, _, raw = self._req('POST', '/apse-service/v1/tasks', {'title': 'T'}, {'X-APSE-Client': 'web', 'Origin': 'https://evil.example', 'Content-Type': 'application/json'})
        self.assertEqual(st, 403)
        self.assertEqual(json.loads(raw)['error'], 'origin_denied')

        # Wrong Content-Type -> 415 json_required
        st, _, raw = self._req('POST', '/apse-service/v1/tasks', b'{"title":"T"}', {'X-APSE-Client': 'web', 'Origin': self.base_url, 'Content-Type': 'text/plain'})
        self.assertEqual(st, 415)
        self.assertEqual(json.loads(raw)['error'], 'json_required')

        # Non-object JSON body ([1, 2, 3]) -> 400 object_required
        st, _, raw = self._req('POST', '/apse-service/v1/tasks', b'[1,2,3]', self._valid_post_headers())
        self.assertEqual(st, 400)
        self.assertEqual(json.loads(raw)['error'], 'object_required')

    def test_tc_gov_11_security_headers_and_csp_in_operations_html(self):
        """TC-GOV-11: Verify Cache-Control, X-Content-Type-Options, Referrer-Policy, charset=utf-8, and strict CSP."""
        st, hdrs, raw = self._req('GET', '/apse-service/health')
        self.assertEqual(st, 200)
        lower_hdrs = {k.lower(): v for k, v in hdrs.items()}
        self.assertEqual(lower_hdrs.get('cache-control'), 'no-store')
        self.assertEqual(lower_hdrs.get('x-content-type-options'), 'nosniff')
        self.assertEqual(lower_hdrs.get('referrer-policy'), 'no-referrer')
        self.assertIn('charset=utf-8', lower_hdrs.get('content-type', ''))

        st_html, _, html_raw = self._req('GET', '/api/apps/apse/operations.html')
        self.assertEqual(st_html, 200)
        html_text = html_raw.decode('utf-8')
        self.assertIn('http-equiv="Content-Security-Policy"', html_text)
        self.assertIn("default-src 'self'", html_text)
        self.assertIn("object-src 'none'", html_text)
        self.assertIn("base-uri 'self'", html_text)

    def test_tc_gov_13_audit_endpoint_rbac_403_for_non_auditor(self):
        """TC-GOV-13: GET /apse-service/audit returns 403 auditor_required for LOCAL_MEL (non-auditor)."""
        st, _, raw = self._req('GET', '/apse-service/audit')
        self.assertEqual(st, 403)
        self.assertEqual(json.loads(raw)['error'], 'auditor_required')

    def test_live_http_v1_workflow_end_to_end(self):
        """Live HTTP end-to-end verification of /v1/bootstrap, /v1/tasks, /v1/logs, /v1/review, /v1/export, /v1/import."""
        # 1. GET /v1/bootstrap
        st, _, raw = self._req('GET', '/apse-service/v1/bootstrap')
        self.assertEqual(st, 200)
        boot = json.loads(raw)
        self.assertEqual(len(boot['parishes']), 27)
        self.assertEqual(len(boot['goals']), 13)

        # 2. POST /v1/tasks
        st_task, _, raw_task = self._req('POST', '/apse-service/v1/tasks', {
            'title': 'HTTP Live Mediation Dialogue',
            'outcome_code': 'A2.R1',
            'parish_code': 'PAR-01',
            'due_date': '2026-12-10',
            'planned_target': 20,
        }, self._valid_post_headers())
        self.assertEqual(st_task, 201)
        created_task = json.loads(raw_task)
        self.assertEqual(created_task['axis'], 'A2')

        # 3. POST /v1/logs
        st_log, _, raw_log = self._req('POST', '/apse-service/v1/logs', {
            'task_id': created_task['id'],
            'centrale': 'Kizenga',
            'event_date': '2026-11-15',
            'collection_mode': 'FOCUS_GROUP',
            'women': 12, 'men': 8,
            'age_18_35': 20,
            'sessions_done': 20,
            'outcome_value': 19,
        }, self._valid_post_headers())
        self.assertEqual(st_log, 201)
        submitted_log = json.loads(raw_log)
        self.assertEqual(submitted_log['total'], 20)
        self.assertEqual(submitted_log['impact_rating'], 'GREAT')

        # 4. POST /v1/review
        st_rev, _, raw_rev = self._req('POST', '/apse-service/v1/review', {
            'id': submitted_log['id'],
            'target_stage': 'PARISH_APPROVED',
            'note': 'Verified over HTTP',
        }, self._valid_post_headers())
        self.assertEqual(st_rev, 200)
        self.assertEqual(json.loads(raw_rev)['stage'], 'PARISH_APPROVED')

        # 5. GET /v1/export
        st_exp, hdrs_exp, raw_exp = self._req('GET', '/apse-service/v1/export?type=impact_summary&format=csv&preset=dhis2&language=en')
        self.assertEqual(st_exp, 200)
        self.assertTrue(raw_exp.startswith(b'\xef\xbb\xbf'))
        self.assertIn(b'eventDate,orgUnitName', raw_exp)

        # 6. POST /v1/import
        st_imp, _, raw_imp = self._req('POST', '/apse-service/v1/import', {
            'csv_text': 'Parish_Name,Centrale,Activity_Date,Women_Count,Men_Count,Outcome_Achieved\nGakoma,Kizenga,2026-11-18,10,10,18\n',
            'commit': True,
        }, self._valid_post_headers())
        self.assertEqual(st_imp, 200)
        self.assertEqual(json.loads(raw_imp)['imported'], 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
