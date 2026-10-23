# APSE CDJP Butare — Windows v0.8.0

## 1. Gutangira cyangwa gukora upgrade

1. Kuramo **APSE_CDJP_Butare_Windows_v0.8.0.zip** na **INSTALL_APSE_WINDOWS.cmd**, ubishyire muri dossier imwe, urugero Downloads. Koresha ZIP nshya; setup igenzura ko ari yo kandi yuzuye.
2. Niba kopi ya kera iri gukora, yihagarike ukoresheje **Ctrl+C** muri fenêtre y'umukara. Ntuyisibe. Gufunga browser byonyine ntibihagarika service.
3. Kanda kabiri **INSTALL_APSE_WINDOWS.cmd**. Setup ikuramo dosiye zose, ikagenzura ko zuzuye, igakora shortcut **CDJP Butare - APSE** kuri Desktop. Ntibisaba internet cyangwa admin rights kuri Windows 10/11 x64.
4. Installation nshya iba muri `%LOCALAPPDATA%/CDJPButare/APSE_0.8.0`. Iyo isanze dataset yuzuye ya v0.7.1 yari yashyizweho na installer, iyikoporora mu buryo bwa SQLite backup, igakoporora vault na konti birinzwe, kopi ya kera igasigara uko yari iri. Koresha **mot de passe principal na konti za mbere**. Ntukoreshe kopi zombi icyarimwe: nta automatic merge ihari.
5. Niba dataset itigeze ibaho, hitamo mot de passe principal y'inyuguti 14 cyangwa zirenga, uyemeze, ukore konti ya MEL n'ijambobanga ry'inyuguti 12 cyangwa zirenga. Igihe wandika password nta nyuguti cyangwa utudomo bigaragara; ni ibisanzwe. Ntuyibagirwe: ntihari recovery key yabitswe ahandi.
6. Nyuma y'izo ntambwe, browser ifunguka kuri **http://127.0.0.1:8766/**. Iyo service itaratangira iyi link ntikora. Fenêtre y'umukara igume ifunguye.
7. Ushobora no gukanda iburyo kuri ZIP → **Extract All / Extraire tout**, ugafungura dossier `APSE_CDJP_Butare`, ugakanda **START_APSE_WINDOWS.cmd**. Ntutangize CMD iri imbere muri ZIP, ntukoporore CMD yonyine.

Niba data ya kera iri muri dossier wakuyemo ZIP aho kuba AppData, setup ntabwo ihita ihitamo iyo dossier. Banza uhagarike kopi ya kera, ukore backup yuzuye. Ushobora kwimurira dossier **portable_data yose** muri installation nshya itaratangizwa kandi itarafite portable_data; ntukoporore SQLite yonyine. Kuri upgrade ikoreshwa na IT, `scripts/migrate_local.py` ikora consistent copy ya dataset iriho kandi ikanga kwandika hejuru y'indi dataset.

## 2. Indimi n'amatariki

Français ni ururimi rusanzwe rwa CDJP; konti za CPJP, parish reporters, CCJP na CEB zibanza kubona Kinyarwanda. English na Kiswahili sanifu na zo ziraboneka. Guhindura ururimi bihindura labels, options n'ubusobanuro, **ntibihindura texte, codes cyangwa amakuru yamaze kwandikwa**. Inkuru yanditswe mu Kinyarwanda ntabwo ihita ihindurwa mu Gifaransa. Translation y'umufasha AI ni optional kandi isaba gusuzumwa n'umuntu.

Transport ya JSON, JavaScript n'impapuro ikoresha UTF-8; accents na apostrophes bibikwa uko biri. Umwaka wa pastorale ni dropdown AP1–AP5: 01/09/2026–31/08/2031. Amatariki ahitamo kuri kalendari, akabikwa nka YYYY-MM-DD mu ndimi zose. Ubusobanuro bw'itariki bugaragara no mu rurimi wahisemo. Imiterere ya calendar nyirizina ishobora gukurikiza browser/Windows.

## 3. Planning ukurikije urwego

- **CPJP: F03, planning annuel gusa.** Nta planning trimestriel, mensuel cyangwa hebdomadaire CPJP ikora. CCJP na CEB ntibikora planning.
- **CDJP: F03 annuel, F04 trimestriel, F43 mensuel, F05 hebdomadaire.**
- CPJP F03 ibanza kugaragaza inkingi 10: ikibazo, impinduka, igikorwa, uko bihagaze, intego, cash budget, ubwitange, aho, ushinzwe n'igihe. Ifashayobora ryatanzwe riri mu Kinyarwanda; ubusobanuro bw'imyanya buri mu ndimi enye.
- Umurongo umwe ni igikorwa kimwe. Hitamo umwaka n'urwego; **operation_ref** yerekana operations/tasks zibireba gusa. Detailed staff tasks zahawe system ni iza AP1; imyaka ikurikira ikoresha operations za PS kandi MEL akongeramo detailed tasks zemewe igihe zizaba zihari. Budget ziri muri PS zifatwa nk’izemejwe hashingiwe ku mabwiriza ya MEL yo ku wa 20/10/2026. Ni enveloppe ya PS; si amafaranga yamaze kuboneka kandi ntizisimbura iyemezwa rya buri gikorwa.
- F05 ihuza format y'umunsi/itariki, umukozi, mbere cyangwa nyuma ya saa sita, aho, igikorwa, ibyakozwe, observations n'intambwe zikurikira. Hitamo icyumweru kuri calendar: amatariki yacyo arabariwa. F43 ihuza format mensuel y'igikorwa, résultats, indicateurs, lieu, budget, contributions n'ushinzwe. Bouton y'inyandiko yerekana imirongo ibitswe y'icyo gihe n'aho iri mu iyemezwa.
- Source hebdomadaire yari ifite icyumweru cya Nov ariko rows za Oct. Izo sample dates ntizinjijwe nk'amakuru nyayo; amatariki abariwa uhereye ku cyumweru wahisemo.

## 4. Codes n'ibyiciro by'ibikorwa

Kode y'inyandiko ikorwa na system; ntusabwa kuyandika. Mu import, iyo record code itatanzwe ikorwa mu buryo buhoraho kandi import isubiwemo ntikore duplicates. Kode za kera zatanzwe mu import zigumaho kugira ngo references zitangirika.

Icyiciro ni **Projet / Programme / Fonctionnement (Operational) / Autres**. Projet isaba umushinga wanditswe; Programme isaba porogaramu yanditswe; Autres isaba ibisobanuro. MEL yandika imishinga na programmes muri Metadata, agatanga amazina mu ndimi enye n'amatariki kuri calendar. Kode ya PRJ cyangwa PRG ikorwa na system. Abandi bahitamo umushinga/porogaramu iriho; ntabwo bakora umushinga mushya kuri buri gikorwa. Imishinga n'aba partenaires ntibahimbwa muri seed.

## 5. Uturere, imirenge, utugari na CCJP

Urutonde rwa NISR rwa census 2022 rwasomwe ku wa 20/10/2026: **Huye, Gisagara, Nyanza, Nyaruguru; imirenge 51 n'utugari 259**. Huye ifite imirenge 14 muri iyo dataset. Hitamo uturere, hanyuma imirenge n'utugari tubirimo. Urashobora guhitamo ibirenze 3 cyangwa 4; nta mupaka muto w'ibyo wahisemo. Gukuraho parent selection bikuraho abana bayo muri selection gusa; ntibihindura metadata cyangwa ibyabitswe kuri seriveri. MEL ashobora kuvugurura amazina mu cyiciro `geography_units` ariko codes ntizihindurwa.

Urutonde rwa CCJP rufite entries **101** zandukuwe muri PDF yahawe system (printed statistics 2018 n'inyongera ya Sheke). Amazina asanzwe ya paruwasi muri template ya 2026 yagumyeho; Kibilizi/Kibirizi na Kirarambogo/Kirarammogo bibitse nka source differences. Sheke yari no ku rutonde rwa Kiruhura: nta automatic reassignment yakozwe; MEL agomba kwemeza current membership. Nta mapping ya santarali ku mirenge yahimbwe. CCJP field yemera kwandika kandi igatanga amazina yo mu rutonde nk'ubufasha, aho kuyifatira mu hierarchy y'ubutegetsi.

PDF yanditse 2,926 CEB ikongeraho 35 mu nyandiko y'intoki (2,961). Uwo mubare wabitswe nk'uwavuzwe n'isoko ariko ntuwemejwe nka denominator y'ibipimo. **Amazina ya CEB ku giti cyazo ntabwo yatanzwe muri iyi source; ntabwo yahimbwe.**

## 6. Abateguye, volets n'iyemezwa

Komite ya CPJP ihitamo preparation mode COMMITTEE: amazina 7 arimo Perezida, Visi-Perezida, Umwanditsi, Umubitsi, Abajyanama 2 na padiri omoniye. Abandi bahitamo PAIR: amazina 2 atandukanye. Aya ni amazina y'abateguye, **si imikono cyangwa final approval**. Padiri Curé agumana urwego rwe rw'ubuyobozi; ntabwo asimbura MEL, Coordinateur cyangwa Directeur muri circuit ya CDJP.

Ushinzwe volet (Parajuriste, Mediator, Abahumurizamitima cyangwa Abafashamyumvire mu isanamitima) ahitamo SPECIALIST na volet. Abandi bo ku murima bashobora guhitamo FIELD. Raporo yabo inyura **DRAFT → CPJP_REVIEW → SUBMITTED → MEL_VALIDATED → VERIFIED → APPROVED**. Uwahawe APSE_CPJP usuzuma raporo y'undi muntu akayohereza kuri MEL; ntibyemerera umuntu kwemeza raporo ye bwite nk'uyisuzumye muri komite. Komite itegura raporo yayo mu mazina 7 ikohereza kuri CDJP. Amakuru ya CDJP anyura kuri MEL → Coordinateur → Directeur.

Buri form nshya ya V8 igomba kugira amazina y'abateguye n'uburyo CNV, DNH na trauma sensitivity byasuzumwe mbere yo kuyohereza. Sobanura uko gender, disability na pastoral relevance byitaweho. Ntukemeze ngo Yego ibitarasuzumwa. Iyo hari participants, garagaza total, abagore, abagabo, abandi/abatatangaje n'abafite ubumuga. Gender categories bigomba guterana bigahuza na total; disability ni subset, ntiyongewe kuri total. Muri planning ni targets z'abateganyijwe; muri reporting ni ibyagenzuwe. Kutagira amakuru ntabwo ari zero.

Guhindura amakuru abitswe bisaba uruhushya rwa MEL ku muntu utari MEL; rugira revision n'igihe (amasaha 1–168). Gukosora ibyari byarasuzumwe bisaba kongera isuzuma. APPROVED/LOCKED bisaba amendment. Konti n'inzego byayo bikomeza kugenzurwa; uruhushya ntirutuma umuntu abona paruwasi atemerewe.

## 7. Autosave, drafts na Corbeille

Ibyandikwa bibikwa nka **working draft** nyuma y'igihe gito cyo kudakomeza kwandika (hafi amasegonda 2). Reba status ya autosave. Draft ishobora kubikwa itaruzura; ibyo **ntibisobanuye ko yoherejwe cyangwa yemejwe**. Button Bika igiteganyo ikora record yemewe ku rwego rwa data validation; Submit ikayohereza mu isuzuma.

Muri **Ibiri kuzuzwa / Brouillons en cours**, umuntu abona ibye; MEL abona ibiri mu nzego yahawe byose, harimo ibya CPJP. Iyo draft yahinduwe ahandi, revision conflict ibuza kwandika hejuru y'iby'undi bucece. Yongere uyifungure muri drafts; ntufunge paji irimo impinduka zitarabikwa.

Iyo ukoresha local Windows offline nta internet ikenewe: seriveri iri kuri mudasobwa ni yo ibika autosave. Niba browser itakibasha kugera kuri iyo service cyangwa seriveri yo kuri internet, encrypted browser autosave isaba ko wabanje gukanda **Tegura / fungura offline** ugashyiraho passphrase. Utayiteguye, ubutumwa bukubwira ko autosave itashobotse; ntufunge paji. Draft ya browser ntiyabonwa na MEL kuri seriveri itaroherezwa. Ifungure muri drafts nyuma yo kugaruka online, uyikomeze, urebe ko status yemeza kubikwa kuri seriveri. Queue sync yohereza completed queued records; partial working drafts zifungurwa zigakomezanywa na autosave.

Draft yakuwe mu kazi ijya muri **Corbeille / Ibyakuwe mu kazi**, ishobora kugarurwa. MEL ashobora gukura mu kazi record itaraba APPROVED/LOCKED no kuyigarura. Amateka ya draft n'aya record recycle ni append-only; **nta bouton yo gusiba burundu**. Ibi ntibisimbura backup: disque yangiritse cyangwa password ibuze byakomeza kubuza kubona data.

## 8. Forms nshya, import/export na backup

MEL ashobora gukora collection form nshya mu ndimi enye, akagena urwego n'abemerewe kuyuzuza, akayisangiza hakoreshejwe authenticated link. Schema yemejwe ivugururwa uyikoporora ku kode nshya; close/reopen bihagarika kwakira ibisubizo bitasibye ibiriho. Models z'abavuye muri gereza na raporo zo ku murima ni igiteganyo cyo kugereranya na formats zemejwe, si claim ko ari official formats zose.

Import/export ya CSV, XLSX na JSON, previews, mapping n'ibimenyetso PDF/PNG/JPEG birakomeza. Import iba DRAFT, ntiyemezwa byikora. JSON ya metadata si import ya records. Raporo z'ibisubizo zishingira kuri PS n'ibimenyetso byemejwe; nta mibare ihimbwa.

MEL ashobora gukanda **Backup ZIP · Flash**. Backup ibika database snapshot ihamye, keys zifunze, konti, drafts, Corbeille, audit, preuves na report snapshots hamwe na code/runtime. Drafts ziri muri browser zitarasynciye ntabwo zijya muri backup ya seriveri. Ku yindi Windows x64, extract backup yose, utangize START, ukoreshe passwords za mbere. Ntukoporore SQLite yonyine kandi ntutegereze ko copies ebyiri zihita zihuza. Bika backup ahantu hizewe hatandukanye na disque ya mudasobwa.

## 9. Ibyageragejwe n'ibisigaye

Python unit/integration tests, real HTTP browser tests, UTF-8/accents, language-switch preservation, geography multiselect, CPJP planning restrictions, specialist routing, encrypted drafts, offline browser recovery, permissions, recycle, upgrade copying na backup behavior byagenzuwe. Layout yagenzuwe kuri 360 px n'amazina ya calendar mu ndimi enye.

**Windows binaries na CMD/PowerShell installer ntibirageragezwa natively muri Linux yakorewemo package; Android nyirizina na DHIS2 target na byo bisaba acceptance tests.** Phone viewport test si ikizamini cyuzuye kuri Android. DHIS2 metadata validation ni static; target DHIS2 installation, organisation UID bindings, authentication na end-to-end integration bigomba kugeragezwa mbere ya production. Package ya local ntabwo irimo DHIS2 server kandi custom collection forms ntizihita zikora DHIS2 programs nshya. Nta 100% production certification yatanzwe.

## 10. Ikosa ryo gutangira

Niba ubonye **Python portable introuvable**, ntukande CMD iri muri ZIP: koresha installer cyangwa Extract All. Niba ikibazo gikomeje nyuma ya extraction yuzuye, saba IT kureba quarantine ya antivirus; ntuhagarike antivirus. Logs z'ikosa ziri muri dossier `logs` (startup-check, integrity-check cyangwa last-error). Passwords ntizibikwamo. Wohereza ikosa nyaryo, nta passwords, kugira ngo rikosorwe.


## Budget ya PS n’isuzuma ry’abakozi
Budget zo muri PS zemejwe. Budget z’amakuru y’inyongera ya plan annuel zigumana inkomoko n’iyemezwa ryazo; ntuziteranye n’enveloppe ya PS nk’aho ari amafaranga abiri atandukanye.

Kuri CDJP, `owner` ijye iba ID ya konti y’umukozi. Tegura kandi wemeze inshingano muri F05 (hebdomadaire), F43 (mensuel), F04 cyangwa F03 STAFF, ugaragaze igihe, intego na `output_unit`. Muri F07, `task_ref` ni ID y’iyo nshingano yemejwe; `plan_ref` ikomeza kuba ID ya F03 annuel yemejwe. Nyuma y’iyemezwa rya raporo, tab **Isuzuma ry’ibikorwa by’abakozi** yerekana inshingano, raporo zemejwe, ibimenyetso n’ijanisha ry’intego zifite unité imwe. Igihe cyatoranyijwe gikurikiza deadline y’inshingano. Hitamo urwego rumwe gusa kugira ngo ibikorwa bitabarwa kabiri. Umukozi abona ibye; MEL, HR, Coordinator na Director babona ibyo bafiteho uburenganzira. Amakuru abura ntaba zeru; nta note ya HR ibarwa mu buryo bwikora. Raporo yatinze yemerwa iyo ikiri mu mwaka wa plan annuel, igaragazwa nk’iyatinze; itariki ya raporo si gihamya yonyine y’igihe igikorwa cyarangiye.
