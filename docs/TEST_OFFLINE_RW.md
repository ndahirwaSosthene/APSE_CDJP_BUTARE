# Kugerageza APSE kuri mudasobwa

Iyi ni demo yo kuri mudasobwa yawe gusa. Ntukoreshe amakuru nyayo y’abantu. Ntuyihostinge. Demo ntikoresha konti za DHIS2 kandi ntisimbura ikizamini cyo kwinjira muri DHIS2 nyayo.

1. Fungura ZIP, winjire muri dosiye `APSE_CDJP_Butare` ukoresheje Terminal cyangwa PowerShell. Ugomba kuba ufite Python 3.12 cyangwa iyisumbuyeho.
2. Ku nshuro ya mbere, shyiraho dependencies (ibi bisaba internet niba utari usanzwe uzifite):

```bash
python -m pip install -r service/requirements.txt
```

3. Tangiza demo:

```bash
python scripts/demo_offline.py
```

4. Fungura **http://127.0.0.1:8766/** muri browser. Ntukande gusa kuri `operations.html` nka dosiye.
5. Hitamo STAFF, ujye muri Planification du PS, uhitemo AP1. Hari ibikorwa 33 bya Staff n’imirongo 25 ya PS. AP2 ntiyerekana ibyo bikorwa 33 bya AP1. CPJP ibona igice kiyemerewe gusa.
6. Kanda Préparer cette activité, wuzuze ibisabwa, ubike draft hanyuma uyohereze ngo igenzurwe. Ugaruke kuri aderesi yo ku ntambwe ya 4 uhindure konti: MEL → COORDINATOR → DIRECTION. Ntushobora kwiyigenzurira inyandiko wateguye.
7. Gerageza feedback, indimi enye, amabara, Learning na metadata ukoresheje MEL. Assistant AI izakwereka ko itarashyirwaho keretse wayiteguye ukayifungura nk’uko guide ibivuga.
8. Kugerageza file offline: mu app tegura ububiko bw’ibanga rya offline, funga demo ukoresheje Ctrl+C, hanyuma ugerageze app yari yamaze gufunguka no kubika draft. **Demo itakaza database iyo uyifunze**; ubwo rero igerageza ryuzuye rya sync hamwe n’inyandiko zemejwe rikorerwa kuri seriveri ihoraho ya test. Mu demo, uhagaritse internet gusa ariko demo ikiri gukora, localhost ikomeza kuboneka.

Database ya demo n’imfunguzo byayo ni iby’igihe demo ifunguye gusa. Amakuru ya demo asibangana iyo uyifunze. Browser ishobora kugumana file offline ririnzwe; koresha amakuru y’impimbano gusa, ubike passphrase kandi usibe amakuru y’iyi localhost nyuma y’igerageza niba ushaka gutangira bundi bushya.

Kugerageza logique ya seriveri utayifunguye muri browser:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

Iyo dependencies zamaze gushyirwaho, demo n’ibizamini bya seriveri ntibikenera internet cyangwa hosting yishyurwa.
