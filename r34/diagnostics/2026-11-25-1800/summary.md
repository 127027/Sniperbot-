# 18 MEZ: einmalige 12h-Diagnose (keine Tagesanalyse)
Fenster 25.11.2026 05–17 UTC. Archiv-HEAD ccea0055a946d4ff0fd7e886dc85968f16bd9af5. 31 gespeicherte Rollenberichte Zielslots 05..17 UTC auf exakte Contracts geprüft, keine Treffer für die folgenden zwölf. Auch kein Treffer in Index (16 Identitäten, letzter last_seen 09:19 UTC) oder R31 seq1..5. Quelle meldet Pool-Eröffnung und rolling-24h-Gewinn, bei jungen Pools; keine minutengenaue 12h-Rendite, keine Vollständigkeit/Handelbarkeit garantiert. Snapshotzeiten unterschiedlich. 
| Coin | Chain | Poolstart UTC | gemeldete % | Contract |
|---|---|---|---:|---|
| Pompom | Robinhood | 13:23 | 4900 | 0x55a27ba8d88b4315cfb98c6d1fbda6696c5c55e2 |
| MFLO | Robinhood | 06:49 | 3500 | 0xc63baa772878b35a17aae4beaafb8039cd1b371a |
| Basket | Robinhood | 07:25 | 1600 | 0x16d3fc1d16a98f94e554b7487a2ed8ededac5dd8 |
| HEPH | Robinhood | 05:49 | 1500 | 0x6c40d47a31c0624263cf06120134eccc7c262759 |
| JIMMY | Solana | 13:15 | 955 | HEvDdGhrvH2AR6MxUVNVLMmGTRpb1ZdBWVreeFm4rNrw |
| SPCXC | Robinhood | 12:03 | 933 | 0xaf264a94b3c58748b11f28826c318f6843debfc4 |
| JaoJiu | Robinhood | 07:28 | 748 | 0xf62c728281c60781c49509f735edc5eec18b93cc |
| Reddit | Robinhood | 05:18 | 616 | 0xb6fb810b666fbd4b4237298e3d754e28730862bd |
| BOOSTER | BNB | 13:26 | 432 | 0xa0e28b599dcc5ddb25b6d04f372223d1e91a7777 |
| S315 | BNB | 06:00 | 284 | 0x6dcafd1c9d5f2766457de3ceb1cbe7c6dc647777 |
| SVAG | Base | 07:41 | 271 | 0x175abcf568c0ed13acc8139e9e16af0de0133ba4 |
| SILK | Ethereum | 08:52 | 220 | 0x18006064dc6967ed766ddcbdd4d222a9e9cf84c3 |
Quellen https://sasapad.fun/day/2026-11-25/ (16:31 UTC), /robinhood-chain/ (14:01 UTC), /bnb-chain/ (10:01 UTC), /base/, /ethereum/. Einzelansichten per exaktem Contract-Link bestätigt. SPCXC/HEPH später inaktiv gemeldet. Keine Rückdatierung, keine Order.
R30 500 Start, 400 cash, 100 offen, zwei indikative BUY 06:59:57 UTC (BASKET/PERRO), keine SELL, Preiszeit bei alten Käufen null, Mark/PnL unbekannt. Fünf Finalslots 07,08,09,12,15 UTC von 12 vollendeten Slots 05..16. R31 seq1..5 keine ausführbaren BUY/HOLD/SELL, letzte seq5 15:09:18.864Z. Keine lokale Geräteausführung belegt. 18 Vorbereitung 1/3 gespeichert, 2/4 fehlen; Abschluss zunächst noch nicht fällig.
Ursachen: Scope bewusst auf zwei Pflichtcoins reduziert; optionale 4CHAN/JIMMY nicht weiterverfolgt. Keine neue Discovery und Indexpflege. Verifizierte Buchungskurse fehlen. Wiederholte vorzeitige Dot-Abbrüche vor Write; tatsächliche Laufzeitursache unbekannt. R30-Modellkäufe nie als ausführbare R31-Käufe übertragen. Stündliche diskrete Läufe, nicht kontinuierlich. 
Empfehlung: Nach stabilen Abschlüssen schrittweise Discovery max 3 zunächst watch-only nach Pflichtbericht, danach anhand belegter Kapazität erhöhen. Separater Discovery-Pfad darf nie Abschluss blockieren. Keine erzwungenen Käufe, keine Preiszeit erfinden. Tagesaudit unverändert. Keine Änderung aktiver Dots, kein Eingriff vor 18:05 Test. Kursadapter offen; deterministischen Publisher separat prüfen bei wiederholten Abbrüchen.
