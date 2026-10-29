"""Pastoral periods: September–August; semestre differs from two-year review."""
from datetime import date,timedelta
import calendar

def period(kind,day):
 d=date.fromisoformat(day);y=d.year if d.month>=9 else d.year-1
 if kind=='daily':a=b=d
 elif kind=='weekly':a=d-timedelta(days=d.weekday());b=a+timedelta(days=6)
 elif kind=='monthly':a=d.replace(day=1);b=d.replace(day=calendar.monthrange(d.year,d.month)[1])
 elif kind in ['quarterly','semiannual']:
  span=3 if kind=='quarterly' else 6;offset=((d.year-y)*12+d.month-9)//span*span;n=8+offset;a=date(y+n//12,n%12+1,1);n+=span;b=date(y+n//12,n%12+1,1)-timedelta(days=1)
 elif kind=='annual':a=date(y,9,1);b=date(y+1,8,31)
 elif kind=='biennial':
  if not 2026<=y<=2030:raise ValueError('Outside PS')
  start=2026+(y-2026)//2*2;a=date(start,9,1);b=date(min(start+2,2031),8,31)
 elif kind=='midterm':a=date(2029,1,1);b=date(2029,3,31)
 elif kind=='final':a=date(2031,4,1);b=date(2031,7,31)
 elif kind=='strategy':a=date(2026,9,1);b=date(2031,8,31)
 else:raise ValueError('Unknown period')
 return {'kind':kind,'start':a.isoformat(),'end':b.isoformat()}
