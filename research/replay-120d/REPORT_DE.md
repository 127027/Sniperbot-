# Sniperbot R29 – 120-Tage-Simulation, belastbarer Zwischen-/Abschlussbefund

**Ausgeführt am 16.11.2026** · **Commit-Branch:** `codex/r29-chatgpt-github-paper-cycle-20261115` · **Modus:** PAPER_ONLY, GitHub-Historienkanal nicht verändert.

## Fragestellung und Zeitgrenzen

- **60 Tage Training/Beobachtung:** 20.07.2026–17.09.2026 UTC (jeweils einschließlich).
- **60 Tage eingefrorener Handelstest:** 18.09.2026–16.11.2026 UTC. Vom 16.11. wird nur der Stand bis `2026-11-16T08:10:00Z` als historische Grenze zugelassen.
- Keine Vorkenntnis des künftigen Markts, kein Rückdatieren späterer Quellen. Ein bereits bekannter Gewinner darf das Kandidatenuniversum nicht definieren.

**Forschungsbeleg:** `research/replay-120d/historical-audit.mjs`; `research/r27/results/summary.json`, `research/r30/results/source-manifest.json`, `research/replay-controller/reports/r22-source-audit.json` und das erste archivierte lokale R29-Markt-Research wurden überprüft.

## A – Historisch tatsächlich belegbar

| Messpunkt | Ergebnis |
|---|---:|
| Kalenderzeilen mit sauberer UTC-Grenze | **120 von 120** |
| Vollständig unabhängig as-of geprüfte historische Pool-/Social-/Security-/Quote-Analysezeitpunkte | **0** |
| Vom Test nachträglich durchgeführte echte historische GPT-Modellentscheidungen | **0** |
| Bereits ursprünglich auf GitHub archivierte GPT-Entscheidungen vom 15./16.11.2026 | **9** |
| Davon echte dokumentierte `NO_TRADE`-Entscheidungen | **9** |
| Nachweisbare rückwirkende 120-Tage-GPT-BUY-, HOLD-, SELL-Trades | **nicht bestimmbar** |
| Historisch nachweisbarer GPT-Netto-Gewinn/-Verlust | **nicht bestimmbar** |

**Warum?** Der historische R30-Preis-/Volumenvergleich beruht auf zwölf rückblickend ausgewählten Binance-Paaren vom 16.10. bis 14.11.2026. Er ist **kein** neutrales historisches Universum neuer DEX-Pools, kein unabhängiger Security-/Sellability-Beleg und keine Aufnahme echter früherer GPT-Entscheidungen. R27 meldet für seinen ursprünglichen 15-Tage-Quellenaudit null vollständig überprüfte zeitgenössische Marktscans. Die ältere 2023-PEPE-Diagnose ist gewinnerselektiert. R29 hat echte lokale Forschung erst seit dem **15.11.2026**, nicht seit Juli.

**Daher darf hier kein Coin-Kauf als hypothetisch richtig behauptet werden.** Fehlende Beweise bedeuten `DATA_GAP`, nicht `NO_TRADE`, `0 % Verlust` oder einen fingierten erfolgreichen Backtest.

Alle Tage sind dauerhaft dokumentiert in **`results/historical-days.csv`**. `archived_real_gpt_decisions` ist separat von `verified_historical_scans` aufgeführt.

## B – Vollständig ausgeführter technischer 120-Tage-Kreislauftest

Damit der Nutzer dennoch sehen kann, ob GitHub-Kurier und Paper-Handelssteuerung im Prinzip funktionieren, wurden **zwei ausdrücklich erfundene Tokens** in einen **vollständig getrennten In-Memory-Replay** eingebracht. Dies sind keine echten historischen Memecoins. Der Test verwendet eine bei Phase-B-Start festgelegte Regel, keine bezahlte KI-API, keine echten Wallets und **0 reale historische GPT-Aufrufe**.

| Simulierter Messpunkt | Ergebnis |
|---|---:|
| Tage | **120** |
| GPT-artige technische Simulations-Scans | **171** |
| Davon Phase A / Phase B | **74 / 97** |
| Dynamische Takte | **1, 4, 12, 24 Scans pro Tag** |
| BUY-Entscheidungen | **2** |
| HOLD-Entscheidungen | **3** |
| SELL-Entscheidungen von der Simulationsstrategie | **1** |
| WATCH-Entscheidungen | **20** |
| NO_TRADE-Entscheidungen | **145** |
| Zusätzlicher lokaler Notverkauf | **1** |
| Geschlossene technische Testpositionen | **2** |
| Offene technische Testpositionen am Ende | **0** |
| Hash-gebundene In-Memory-Archiv- und Quittungsdurchläufe | **171** |
| Start-/Endstand nur des künstlichen Testkontos | **5.000 / 5.003,8906 TEST-USDC** |

**Die 3,8906 TEST-USDC Differenz sind ausdrücklich kein nachgewiesener historischer oder realer Memecoin-Gewinn.** Der Kursverlauf und die zwei Coins sind ausschließlich für den technischen Integrationstest erfunden.

### Beispiellose Trennung der Ereignisse

**22.09.2026 (Testtag 65; ausschließlich künstlicher Testcoin FIXTURE_ALPHA):** Aktivitätslage im Test: **12 Scans**. Um **00:00 UTC** virtueller Kauf mit 50 TEST-USDC, **02:00 und 04:00 HOLD**, **06:00 SELL** infolge des künstlich definierten Kursanstiegs auf 1,28. Virtuelles Ergebnis **+12,7264 TEST-USDC** nach 1 % modellierten Kosten je Transaktionsseite.

**05.10.2026 (Testtag 78; ausschließlich künstlicher Testcoin FIXTURE_BETA):** **24 Scans**. Um **00:00 UTC BUY**, **01:00 HOLD**; um **01:30** greift der getrennte lokale Sicherheitsstopp auf einen künstlichen Rückgang auf 0,84 ein; **SELL durch lokale Notbremse**, ausdrücklich **nicht** als GPT-Verkaufsentscheidung gezählt. Virtuelles Ergebnis **−8,8358 TEST-USDC**.

**09.10.2026 (Testtag 82; ausschließlich künstliche Research-Signale):** **4 Scans**, alle **WATCH**, kein Kauf ohne vollständige Security-Evidenz.

Jede der 120 Tageszeilen mit genauen Scananzahlen, Aktionen, Restpositionen und künstlichen Kontoständen findet sich dauerhaft unter **`results/synthetic-mechanics-days.csv`**. Für die vollständigen UTC-Scanzeitpunkte, PseudogitHub-Archive, Quittungen, Status und beide Testtrades stehen zudem JSON-/JSONL-Artefakte aus dem GitHub-Actions-Lauf bereit.

### Wie GitHub technisch simuliert wurde

1. Scan erhält nur zum virtuellen Zeitpunkt freigegebene fiktive Quellen.
2. Ein in-memory Entscheidungsobjekt erfüllt das bestehende R29-GPT-JSON-Schema.
3. Ein hashgebundenes, schreibgeschütztes Test-Archiv und GitHub-Pointer entstehen **nur im Speicher**.
4. Der virtuelle Kurier liest sie zurück, prüft Hash, Uhrzeit, Schema und Duplicate-ID.
5. Der simulierte lokale Paper-Bot prüft Token-/Pool-Identität, Handelslimit, Sicherheit und aktuelle *Testquote*.
6. Entweder BUY/HOLD/SELL/NO_TRADE-Quittung, separater lokaler Stopp oder BLOCKED.
7. Nur das künstliche Testledger wird aktualisiert. Echter GitHub-Handelskanal und Nutzer-Paper-Konto bleiben unberührt.

Dies beweist die **Mechanik des Testadapters**, nicht eine historische tatsächliche GPT-/Github-/Laptop-Kette für Juli bis November. Die separat früher bestandenen R29-HTTP-Integrationstests prüfen die reale lokale Programmstruktur mit Wegwerfkonten.

## C – Abnahme und nächste wissenschaftlich sinnvolle Stufe

**BESTANDEN:** 120 Tage UTC-Zeitlauf, 60/60-Trennung, adaptiver 1/4/12/24-Takt im kontrollierten Test, gesperrte Zukunftsinformationen, reproduzierbares Protokoll, BUY/HOLD/SELL, Sicherheitsstopp und isolierte Paper-Abrechnung.

**NOCH NICHT BELEGBAR:** Die historische tatsächliche Qualität von GPT beim Finden guter Memecoins, richtige Ein-/Ausstiegszeiten und vollständige rückwirkende 120-Tage-Rendite. Die neun tatsächlich archivierten November-Entscheidungen bleiben nachvollziehbar, werden aber nicht als rekonstruierte Juli-Handelsaktionen ausgegeben.

**Nächste Voraussetzung für den echten historischen Blindtest:** neutraler historischer Token-/Pool-Launch-Katalog, unabhängig archivierte zeitgenössische News-/Social-/Wallet-Daten, historische Contract-/Sellability-Zustände und brauchbare bidirektionale Ausführungsquotes. Erst mit solchen Quellen darf das GPT-Modell einzelne historische Entscheidungsframes ohne Zukunftsinformationen bewerten.

**Keine** echten Orders, kostenpflichtigen OpenAI-API-Aufrufe, Wallet-/PayPal-Operationen oder Änderungen am laufenden Laptop-Paper-Konto.

## Ergebnisse und Reproduktion

- `research/replay-120d/historical-audit.mjs`: Datums- und Quellenprüfung.
- `research/replay-120d/mechanics-fixture.mjs`: synthetischer in-memory GitHub-/Paper-Kreislauf.
- `research/replay-120d/replay.test.mjs`: sechs zusätzliche Regressionstests.
- `research/replay-120d/run.mjs`: JSON, CSV, Tages- und Quittungsjournal.
- `research/replay-120d/results/summary.json`: geprüfte Ergebnisse und Geltungsgrenzen.
- `research/replay-120d/results/*.csv`: 120 tägliche Zeilen je Evidenzklasse.
- GitHub Actions: https://github.com/127027/Sniperbot-/actions/runs/43835731043 – **Ubuntu + Windows erfolgreich**.
- Download der vollständigen generierten Tagesberichte (zeitlich begrenztes Actions-Artefakt): https://github.com/127027/Sniperbot-/actions/runs/43835731043/artifacts/14210322901
