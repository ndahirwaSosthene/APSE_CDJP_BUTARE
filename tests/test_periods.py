import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from periods import period
class PeriodTests(unittest.TestCase):
 def test_leap_month(self):self.assertEqual(period('monthly','2028-02-17')['end'],'2028-02-29')
 def test_quarter_cross_year(self):self.assertEqual(period('quarterly','2027-01-13'),dict(kind='quarterly',start='2026-12-01',end='2027-02-28'))
 def test_second_semester(self):self.assertEqual(period('semiannual','2027-08-31')['start'],'2027-03-01')
 def test_biennial_final_window_clipped(self):self.assertEqual(period('biennial','2031-02-01')['end'],'2031-08-31')
 def test_final_source_calendar(self):self.assertEqual(period('final','2026-10-20')['start'],'2031-04-01');self.assertEqual(period('midterm','2026-10-20')['end'],'2029-03-31')
