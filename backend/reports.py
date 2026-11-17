"""Twelve report profiles, four languages, approved data only; no auto-generated claims."""
import csv,io,json
from datetime import date,datetime
from pathlib import Path
from collections import Counter
from docx import Document
from docx.shared import Inches,Pt,RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment,Border,Side
from engine import CONFIG,FORMS,ratio
REPORTS={'R01':['F06','F07','F33'],'R02':['F05','F06','F21','F31'],'R03':None,'R04':['F07','F08','F15','F21','F38'],'R05':None,'R06':None,'R07':None,'R08':None,'R09':None,'R10':['F21','F40','F30'],'R11':['F22','F23'],'R12':['F16','F26','F42'],'R13':None}
TEXT={
'en':dict(title='CDJP Butare APSE monitoring report',period='Reporting period',source='Approved records in the authorised scope only. Figures describe recorded evidence, not independently established impact. Missing data remain unavailable. Confidential individual, HR and case records are excluded.',summary='Management summary',learning='Learning and adaptation',activities='Approved source records',dictionary='Dictionary',filters='Filters',checks='Controls',no_data='No approved observations for this scope and period',metric='Measure',value='Value',axis='Strategic programme',count='Approved records',budget='Approved budget RWF',spent='Eligible expenditure RWF',execution='Budget execution percent',lessons='Validated lessons',adaptations='Learning applications',verified='Independently verified applications',limitations='Interpretation and decisions',note='Narrative interpretation, decisions, reviewer, approver and signatures must be completed by authorised people. The report is a generated draft until institutional approval.',date='Date',code='Record code',form='Form',unit='Unit',finding='Finding',lesson='Lesson',action='Action',owner='Responsible',due='Due date',effect='Verified effect',status='Status',unavailable='Unavailable'),
'fr':dict(title='Rapport de suivi APSE de la CDJP Butare',period='Période du rapport',source='Enregistrements approuvés dans le périmètre autorisé uniquement. Les chiffres décrivent les preuves enregistrées, pas un impact établi indépendamment. Les données manquantes restent indisponibles. Les dossiers individuels, RH et cas confidentiels sont exclus.',summary='Synthèse de gestion',learning='Apprentissage et adaptation',activities='Données sources approuvées',dictionary='Dictionnaire',filters='Filtres',checks='Contrôles',no_data='Aucune observation approuvée pour ce périmètre et cette période',metric='Mesure',value='Valeur',axis='Programme stratégique',count='Enregistrements approuvés',budget='Budget approuvé RWF',spent='Dépenses éligibles RWF',execution='Exécution budgétaire pour cent',lessons='Leçons validées',adaptations='Applications des apprentissages',verified='Applications vérifiées indépendamment',limitations='Interprétation et décisions',note='Les personnes autorisées complètent analyse, décisions, réviseur, approbateur et signatures. Le rapport généré reste un brouillon jusqu’à approbation institutionnelle.',date='Date',code='Code',form='Fiche',unit='Unité',finding='Constat',lesson='Leçon',action='Action',owner='Responsable',due='Échéance',effect='Effet vérifié',status='Statut',unavailable='Indisponible'),
'rw':dict(title='Raporo y’ikurikirana APSE ya CDJP Butare',period='Igihe cya raporo',source='Harimo gusa inyandiko zemejwe mu nzego zemerewe. Imibare igaragaza ibimenyetso byanditswe, si gihamya yigenga y’ingaruka. Amakuru abura ntiyasimbujwe zero. Amakuru y’abantu ku giti cyabo, abakozi n’ibibazo by’ibanga ntarimo.',summary='Incamake y’imiyoborere',learning='Amasomo n’impinduka',activities='Amakuru y’isoko yemejwe',dictionary='Inkoranyamagambo',filters='Ibyatoranyijwe',checks='Igenzura',no_data='Nta makuru yemejwe ahari muri izi nzego no muri iki gihe',metric='Igipimo',value='Agaciro',axis='Gahunda y’icyerekezo',count='Inyandiko zemejwe',budget='Ingengo y’imari yemejwe RWF',spent='Amafaranga yakoreshejwe yemewe RWF',execution='Ikoreshwa ry’ingengo y’imari ku ijana',lessons='Amasomo yemejwe',adaptations='Ikoreshwa ry’amasomo',verified='Ikoreshwa ryagenzuwe n’undi muntu',limitations='Isesengura n’ibyemezo',note='Ababifitiye ububasha buzuza isesengura, ibyemezo, uwagenzuye, uwemeje n’imikono. Raporo ikomeza kuba igiteganyo kugeza yemejwe n’inzego.',date='Itariki',code='Kode',form='Ifishi',unit='Urwego',finding='Icyabonetse',lesson='Isomo',action='Igikorwa',owner='Ubishinzwe',due='Itariki ntarengwa',effect='Ingaruka yagenzuwe',status='Icyiciro',unavailable='Ntibiboneka'),
'sw':dict(title='Ripoti ya ufuatiliaji APSE ya CDJP Butare',period='Kipindi cha ripoti',source='Rekodi zilizoidhinishwa katika eneo la ruhusa pekee. Takwimu zinaeleza ushahidi uliorekodiwa, si athari zilizothibitishwa kwa uhuru. Data zinazokosekana hazijabadilishwa kuwa sifuri. Rekodi za watu binafsi, wafanyakazi na mashauri ya siri zimeondolewa.',summary='Muhtasari wa usimamizi',learning='Ujifunzaji na marekebisho',activities='Rekodi za chanzo zilizoidhinishwa',dictionary='Kamusi',filters='Vichujio',checks='Ukaguzi',no_data='Hakuna uchunguzi ulioidhinishwa katika eneo na kipindi hiki',metric='Kipimo',value='Thamani',axis='Mpango wa kimkakati',count='Rekodi zilizoidhinishwa',budget='Bajeti iliyoidhinishwa RWF',spent='Matumizi yanayokubalika RWF',execution='Asilimia ya utekelezaji wa bajeti',lessons='Mafunzo yaliyothibitishwa',adaptations='Matumizi ya mafunzo',verified='Matumizi yaliyothibitishwa kwa uhuru',limitations='Ufafanuzi na maamuzi',note='Watu walioidhinishwa wajaze uchambuzi, maamuzi, mhakiki, mwidhinishaji na saini. Ripoti inayozalishwa hubaki rasimu hadi idhini ya taasisi.',date='Tarehe',code='Msimbo',form='Fomu',unit='Kitengo',finding='Matokeo',lesson='Funzo',action='Hatua',owner='Mhusika',due='Tarehe ya mwisho',effect='Athari iliyothibitishwa',status='Hali',unavailable='Haipatikani')}
def safe(v):
 s=str(v);return "'"+s if s.startswith(('=','+','-','@','\t','\r')) else s

def data_model(rows,code,lang):
 if code not in REPORTS:raise ValueError('Unknown report profile')
 approved=[r for r in rows if r['state']in ['APPROVED','LOCKED']];allrows=approved
 # Only finance totals, never the confidential source row, enter the report.
 fin=[r for r in approved if r['form']=='F19'];plans=[r for r in approved if r['form']=='F03']
 def total(key):
  v=[float(r['values'][key]) for r in (plans if key=='budget' else fin) if r['values'].get(key)not in [None,'']];return sum(v) if v else None
 lessons=[r for r in approved if r['form']=='F29'];uses=[r for r in approved if r['form']=='F30']
 summary={'count':len([r for r in approved if not FORMS[r['form']]['sensitive']]),'budget':total('budget'),'spent':total('spent'),'execution':ratio(total('spent'),total('budget')),'lessons':len(lessons),'adaptations':len(uses),'verified':sum(bool(r.get('completion'))for r in uses)}
 visible=[r for r in approved if not FORMS[r['form']]['sensitive'] and (REPORTS[code]is None or r['form']in REPORTS[code])]
 return summary,visible,lessons+uses

def generate(rows,code,lang,fmt,start,end,config=None,narrative=None):
 CONFIG=config or globals()["CONFIG"]
 if code=="R13":
  from rbm import model,render
  return render(model(rows,CONFIG,start,end,lang,narrative),lang,fmt)
 t=TEXT[lang];summary,visible,learning=data_model(rows,code,lang);title=t['title']+' '+code
 if fmt=='csv':
  out=io.StringIO();w=csv.writer(out);w.writerow(['UID',t['date'],t['form'],t['unit'],t['code'],t['finding'],t['lesson'],t['action']])
  for r in visible:w.writerow([safe(v)for v in [r['id'],r['event_date'],r['form'],r['unit'],r['values'].get('record',''),r['values'].get('finding',''),r['values'].get('lesson',''),r['values'].get('action','')]])
  return ('\ufeff'+out.getvalue()).encode(),'text/csv;charset=utf-8'
 if fmt=='docx':
  doc=Document();sec=doc.sections[0];sec.page_width=Inches(8.5);sec.page_height=Inches(11);sec.top_margin=sec.bottom_margin=Inches(.7);sec.left_margin=sec.right_margin=Inches(.75)
  for name,size in [('Normal',12),('Title',24),('Heading 1',18),('Heading 2',12)]:
   s=doc.styles[name];s.font.name='Arial';s.font.size=Pt(size);s.font.color.rgb=RGBColor(0,0,0)
  for node in list(doc.styles.element.iter(qn('w:pBdr'))):node.getparent().remove(node)
  doc.add_paragraph(title,'Title');doc.add_paragraph(t['period']+': '+str(start)+' — '+str(end));doc.add_paragraph(t['source']);doc.add_heading(t['summary'],1)
  table=doc.add_table(rows=1,cols=2);table.style='Table Grid';table.rows[0].cells[0].text=t['metric'];table.rows[0].cells[1].text=t['value']
  shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'FEFAB4')
  for cell in table.rows[0].cells:
   import copy
   cell._tc.get_or_add_tcPr().append(copy.deepcopy(shade))
  for k,v in summary.items():
   a,b=table.add_row().cells;a.text=t[k];b.text=t['unavailable'] if v is None else (f'{v:,.2f}'if isinstance(v,float)else str(v))
  doc.add_heading(t['learning'],1)
  if not learning:doc.add_paragraph(t['no_data'])
  for r in learning:
   v=r['values'];doc.add_heading(r['form']+' '+v.get('record',''),2)
   for key in ['question','finding','lesson','confidence','decision','action','owner','due']:
    if v.get(key):doc.add_paragraph(CONFIG['fields'][key]['label'][lang]+': '+v[key])
   if r.get('completion'):doc.add_paragraph(t['effect']+': '+r['completion']['values']['effect'])
  source_rows=[r for r in visible if r['form']not in ['F27','F28','F29','F30']]
  if source_rows:doc.add_heading(t['activities'],1)
  for r in source_rows:
   v=r['values'];doc.add_heading(r['form']+' '+v.get('record',''),2);doc.add_paragraph(r['event_date']+' · '+r['unit']+' · '+r['id'])
   for k in ['title','axis','result','activity','outputs','outcome','finding','action','owner','due','evidence']:
    if v.get(k):doc.add_paragraph(CONFIG['fields'][k]['label'][lang]+': '+v[k])
  doc.add_heading(t['limitations'],1);doc.add_paragraph(t['note']);doc.add_paragraph('Version 0.2.0 · '+datetime.now().isoformat(timespec='seconds'))
  out=io.BytesIO();doc.save(out);return out.getvalue(),'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
 if fmt=='xlsx':
  wb=Workbook();ws=wb.active;ws.title='Dashboard';ws.append([title]);ws.append([t['period'],str(start),str(end)]);ws.append([t['source']]);ws.append([t['metric'],t['value']])
  for k,v in summary.items():ws.append([t[k],v])
  data=wb.create_sheet('Data');data.append(['UID',t['date'],t['form'],t['unit'],'Field','Value'])
  for r in visible:
   for k,v in r['values'].items():
    f=CONFIG['fields'][k];value=float(v)if f['type']in ['NUMBER','INTEGER_ZERO_OR_POSITIVE','INTEGER_POSITIVE']else safe(v);data.append([r['id'],date.fromisoformat(r['event_date']),r['form'],r['unit'],k,value])
  learn=wb.create_sheet('Learning');learn.append(['UID',t['form'],t['lesson'],t['action'],t['due'],t['effect']])
  for r in learning:learn.append([r['id'],r['form'],safe(r['values'].get('lesson','')),safe(r['values'].get('action','')),r['values'].get('due',''),safe(r['completion']['values']['effect']if r.get('completion')else '')])
  dictionary=wb.create_sheet('Dictionary');dictionary.append(['Field','Label','Type'])
  for k,f in CONFIG['fields'].items():dictionary.append([k,f['label'][lang],f['type']])
  filters=wb.create_sheet('Filters');filters.append(['Parameter','Value']);filters.append(['Start',str(start)]);filters.append(['End',str(end)]);filters.append(['Report',code]);filters.append(['Language',lang]);filters.append(['State','APPROVED / LOCKED']);filters.append(['Generated',datetime.now().isoformat()])
  checks=wb.create_sheet('Controls');checks.append([t['checks'],t['value']]);checks.append(['Visible approved records',len(visible)]);checks.append(['Sensitive detailed records included',0]);checks.append(['Unique population','Not inferred from attendances']);checks.append(['Approval',t['note']])
  edge=Side(style='thin',color='D9D9D9')
  for sheet in wb:
   sheet.freeze_panes='A2';sheet.auto_filter.ref=sheet.dimensions
   for row in sheet:
    for cell in row:cell.font=Font(name='Arial',size=12);cell.alignment=Alignment(vertical='top',wrap_text=True);cell.border=Border(left=edge,right=edge,top=edge,bottom=edge)
   for cell in sheet[1]:cell.fill=PatternFill('solid',fgColor='FEFAB4');cell.font=Font(name='Arial',size=12,bold=True)
   for column in sheet.columns:
    letter=column[0].column_letter;maxlen=max(len(str(cell.value or ''))for cell in column);sheet.column_dimensions[letter].width=min(max(maxlen+2,18),55)
   for row in sheet:sheet.row_dimensions[row[0].row].height=36 if any(len(str(c.value or ''))>60 for c in row)else 24
  for cell in data['B'][1:]:cell.number_format='yyyy-mm-dd'
  ws.column_dimensions['A'].width=60;ws.column_dimensions['B'].width=25;ws.merge_cells('A1:D1');ws.merge_cells('A3:D3');ws.row_dimensions[3].height=84
  out=io.BytesIO();wb.save(out);return out.getvalue(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
 raise ValueError('Unknown format')
