# APSE 0.9.0 \- Konti za TEST offline gusa / Offline TEST accounts only

Iyi dosiye ni ibanga. Ntuyisangize abandi. Izi konti si iza DHIS2 iri online. Private file: keep passwords separate from the application. These accounts are local, not live DHIS2 credentials.

1. Extract All / Extraire tout ZIP.  
2. Fungura START\_TEST\_WINDOWS.cmd; ushyiremo ijambobanga nyamukuru rikurikira. Ibyo wandika ntibigaragara.  
3. Siga idirishya rifunguye. Browser: [http\://127.0.0.1:8766/](http://127.0.0.1:8766/)  
4. Injira ukoresheje konti n’ijambobanga byo hasi. Konti za TEST ntizireba amakuru asanzwe ya portable\_data.

Master passphrase / Ijambobanga nyamukuru: `iERdpEhOyD6wF38bezmlzpVuGeWl8_Eb`

| Username / Konti | Password / Ijambobanga | Roles | Scope |
| :---- | :---- | :---- | :---- |
| mel.theophile | `B3jW1xhqeRvqbCmssDeZHYep` | APSE\_MEL | CDJP Butare LOCAL |
| direction.janvier | `neTPDgjOrIUNA4XK5SH4gvnN` | APSE\_DIRECTION | CDJP Butare LOCAL |
| coordination.emmanuel | `Oxtyal3PqnTyZlO4oh06FJYj` | APSE\_COORDINATION | CDJP Butare LOCAL |
| finance.marceline | `e365yfZPY9ExOA_bPT4uwHXM` | APSE\_FINANCE | CDJP Butare LOCAL |
| cooperation.ruth | `HVeo1CbbjcBlJvHC-tMzlB8O` | APSE\_STAFF, APSE\_COOPERATION | CDJP Butare LOCAL |
| driver.emmanuel | `_kGqg54muSh5gecnPSkTdS-N` | APSE\_STAFF, APSE\_DRIVER | CDJP Butare LOCAL |
| cpjp.test | `3giKdNcnRuP9LYbTd_3SFjPt` | APSE\_CPJP, APSE\_SENSITIVE | Gakoma |

&nbsp;

CPJP test ifite APSE\_SENSITIVE kugira ngo igerageze F45; ibi ntibiha CPJP zose uburenganzira ku makuru sensitive. CPJP test has sensitive access solely to exercise F45 within its assigned parish. Production access requires explicit MEL assignment.

Mbere yo gukoresha amakuru nyayo: koresha START\_APSE\_WINDOWS.cmd, ushyireho vault n’amajambobanga mashya; cyangwa wimure portable\_data yawe uko iri. Ntugasimbuze database yawe na test\_data. Before real use, open START\_APSE\_WINDOWS.cmd and create new credentials, or migrate your intact existing portable\_data. Do not overwrite your database with test\_data.

Mu kwimura test kuri flash: funga APSE ukoresheje Ctrl+C, ukopiye folder yose harimo test\_data na runtime; ukomeze gukoresha iyi master. For portable TEST use: stop APSE with Ctrl+C and copy the complete folder, including test\_data and runtime. Use the same master passphrase.