import sys, unittest
from pathlib import Path
from cryptography.fernet import Fernet

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'service'))
from engine import Engine, Fault


class V1RedesignTests(unittest.TestCase):
    def setUp(self):
        self.engine = Engine(':memory:', Fernet.generate_key(), b'1' * 32)
        self.user = {
            'id': 'LOCAL:NO_AUTH',
            'name': 'LOCAL_MEL',
            'roles': ['APSE_MEL'],
            'paths': ['/LocalRoot01'],
            'units': [{'id': 'LocalRoot01', 'name': 'CDJP', 'path': '/LocalRoot01'}],
        }

    def test_bootstrap_and_automatic_metadata_inheritance(self):
        boot = self.engine.v1_bootstrap(self.user)
        self.assertEqual(len(boot['tasks']), 6)
        self.assertEqual(len(boot['parishes']), 27)
        task = self.engine.v1_create_task(self.user, {
            'title': 'Youth Peace Dialogue',
            'outcome_code': 'A2.R2',
            'parish_code': 'PAR-10',
            'due_date': '2026-11-15',
            'planned_target': 30,
            'min_threshold': 20,
            'target_threshold': 28,
        })
        self.assertEqual(task['axis'], 'A2')
        self.assertEqual(task['ap'], 'AP1')
        self.assertEqual(task['pastoral_quarter'], 'Q1')

    def test_plain_language_validation_and_3_tier_approval(self):
        tasks = self.engine.v1_bootstrap(self.user)['tasks']
        task = next(t for t in tasks if t['id'] == 'task-a2-gakoma-01')
        with self.assertRaises(Fault) as ctx:
            self.engine.v1_submit_log(self.user, {
                'task_id': task['id'],
                'centrale': 'Kizenga',
                'event_date': '2026-11-10',
                'women': 10,
                'men': 10,
                'age_u18': 5,
                'age_18_35': 10,
                'age_36_64': 3,
                'age_65': 0,
            })
        self.assertIn('Age group numbers add up to 18, but you entered 20 total participants. Add 2 more.', str(ctx.exception.details))

        # Target missed without explanation
        with self.assertRaises(Fault) as ctx2:
            self.engine.v1_submit_log(self.user, {
                'task_id': task['id'],
                'centrale': 'Kizenga',
                'event_date': '2026-11-10',
                'women': 10,
                'men': 10,
                'age_u18': 5,
                'age_18_35': 10,
                'age_36_64': 5,
                'age_65': 0,
                'outcome_value': 8,
            })
        self.assertIn('Target not reached (8 of 12). Please select an issue level and add a short note.', str(ctx2.exception.details))

        log = self.engine.v1_submit_log(self.user, {
            'task_id': task['id'],
            'centrale': 'Kizenga',
            'event_date': '2026-11-10',
            'women': 12,
            'men': 8,
            'age_u18': 2,
            'age_18_35': 10,
            'age_36_64': 6,
            'age_65': 2,
            'disability': 1,
            'sessions_done': 20,
            'outcome_value': 19,
        })
        self.assertEqual(log['total'], 20)
        self.assertEqual(log['impact_rating'], 'GREAT')
        self.assertEqual(log['stage'], 'SUBMITTED')

        rev1 = self.engine.v1_review_log(self.user, {'id': log['id'], 'target_stage': 'PARISH_APPROVED', 'note': 'Verified'})
        self.assertEqual(rev1['stage'], 'PARISH_APPROVED')
        rev2 = self.engine.v1_review_log(self.user, {'id': log['id'], 'target_stage': 'DIOCESE_APPROVED', 'note': 'Approved'})
        self.assertEqual(rev2['stage'], 'DIOCESE_APPROVED')

        # Silent amendment creation when updating a Diocese-Approved log
        amended = self.engine.v1_submit_log(self.user, {
            'id': log['id'],
            'task_id': task['id'],
            'centrale': 'Kizenga',
            'event_date': '2026-11-10',
            'women': 14,
            'men': 8,
            'age_u18': 2,
            'age_18_35': 12,
            'age_36_64': 6,
            'age_65': 2,
            'sessions_done': 22,
            'outcome_value': 20,
        })
        self.assertEqual(amended['version'], 2)
        self.assertEqual(amended['parent_id'], log['id'])

    def test_exports_and_guided_csv_import(self):
        for fmt in ('csv', 'xlsx', 'docx'):
            data, mime, fname = self.engine.v1_export(self.user, 'impact_summary', fmt, 'donor', 'en')
            self.assertTrue(len(data) > 100)

        imp = self.engine.v1_import_csv(self.user, {
            'csv_text': 'Custom_Parish_Col,Centrale,Activity_Date,Women_Count,Men_Count,Outcome_Achieved\nGakoma,Kizenga,2026-10-22,10,10,18'
        })
        self.assertEqual(
            imp['missing'][0]['message'],
            "Column 'Parish_Name' is missing in your file. Select which column contains the Parish Name."
        )
        imp2 = self.engine.v1_import_csv(self.user, {
            'csv_text': 'Custom_Parish_Col,Centrale,Activity_Date,Women_Count,Men_Count,Outcome_Achieved\nGakoma,Kizenga,2026-10-22,10,10,18',
            'mapping': {'parish': 'Custom_Parish_Col'},
            'commit': True,
        })
        self.assertEqual(imp2['imported'], 1)

    def test_portable_no_auth_live_startup(self):
        import subprocess, urllib.request, json
        p = subprocess.Popen(
            [sys.executable, '-X', 'utf8', str(ROOT / 'service/portable_boot.py'), '--no-auth', '--no-browser', '--port', '18766'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
        )
        try:
            line = p.stdout.readline()
            self.assertIn('APSE LOCAL', line)
            html = urllib.request.urlopen('http://127.0.0.1:18766/api/apps/apse/operations.html', timeout=5).read().decode('utf-8')
            self.assertIn('v1.js', html)
            boot = json.loads(urllib.request.urlopen('http://127.0.0.1:18766/apse-service/v1/bootstrap', timeout=5).read().decode('utf-8'))
            self.assertEqual(boot['user']['name'], 'LOCAL_MEL')
            self.assertTrue(len(boot['tasks']) >= 6)
        finally:
            p.terminate()
            p.wait(timeout=5)

    def test_design_system_tokens_and_components(self):
        css = (ROOT / 'app/v1.css').read_text(encoding='utf-8')
        js = (ROOT / 'app/v1.js').read_text(encoding='utf-8')
        for token in (
            '--font-sans:',
            '--font-mono:',
            '--radius-xs: 3px;',
            '--radius-sm: 4px;',
            '--radius-md: 8px;',
            '--radius-sheet: 16px 16px 0 0;',
            '--bg-canvas: #F4F5F7;',
            '--bg-surface: #FFFFFF;',
            '--bg-input: #F4F4F4;',
            '--color-primary: #0F62FE;',
            '--color-danger: #DA1E28;',
            '--tag-success-bg: #DCFFF1;',
            '--tag-info-bg: #E9F2FF;',
            '--tag-warn-bg: #FFF7D6;',
            '--tag-danger-bg: #FFECEB;',
            '--chart-1: #6929C4;',
            '--chart-2: #1192E8;',
            '--chart-3: #005D5D;',
            '--chart-4: #9F1853;',
            '[data-theme="dark"]',
            '--bg-canvas: #1D2125;',
            '--bg-surface: #22272B;',
            '--color-primary: #579DFF;',
            '.v1-polaris-resource-list',
            '.v1-bottom-sheet',
            '.v1-breadcrumbs',
        ):
            self.assertIn(token, css)
        for symbol in (
            'function msIcon(',
            'function renderBreadcrumbs(',
            'function renderLozenge(',
            'function renderMobileBottomSheet(',
            'v1-polaris-resource-list',
            'v1-bottom-sheet',
        ):
            self.assertIn(symbol, js)


if __name__ == '__main__':
    unittest.main()
