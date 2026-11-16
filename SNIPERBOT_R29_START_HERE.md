# SNIPERBOT R29 – HIER BEGINNEN (auch in jedem neuen Chat)

**Projekt:** `127027/Sniperbot-` · Branch `codex/r29-chatgpt-github-paper-cycle-20261115`  
**Dokumentstand:** 16.11.2026 · **Nur PAPER_ONLY**, kein Echtgeld, kein kostenpflichtiger API-Zwang.

> **Neue GPT-Unterhaltung:** Vor Aussagen über Live-Guthaben, Kauf-/Verkaufsfähigkeit oder Forschungsfortschritt **die aktuellen GitHub-Dateien erneut lesen**. Dieses Dokument ist der dauerhafte Einstieg, keine automatische Verbindung zwischen beliebigen neuen ChatGPT-Chats. Falls GitHub nicht verbunden ist, diesen Dateilink bzw. das Projekt-Repository in den neuen Chat übernehmen. Nicht behaupten, einen späteren Commit zu kennen, ohne ihn zu lesen.

## 1. Eigentliches Ziel

Ein **einziger strategischer GPT-Entscheider** scannt die Kryptowährungsmärkte dauerhaft, findet neue Memecoins, prüft Sicherheitsrisiken, übermittelt virtuelle BUY-Entscheidungen an den lokalen Windows-Bot und entscheidet bei bestätigten GPT-Paper-Positionen später über HOLD/SELL. Der lokale Bot validiert jede Order und führt nur Paper-Orders aus. Notfallstopps dürfen unabhängig und schneller als stündlich erfolgen. 

**DYNAMISCHE Tagessteuerung – wichtigster Nutzerwunsch (16.11.2026):** Der Morgen-Check um ungefähr **08:32 Europe/Berlin** entscheidet zunächst vorläufig über **1, 4, 12 oder höchstens 24** vollständige GPT-Analysen. **JEDER weitere stündliche Wecklauf darf die Tagesstufe sofort erneut wählen und erhöhen oder senken.** Ein morgens gewählter Wert 4 darf etwa beim zweiten Scan auf 24 steigen, wenn sich authentisch neue Markt-/Positionssignale zeigen; dann ist die nächste fällige Analyse bereits eine Stunde nach dem letzten tatsächlichen Scan möglich. Ebenso 1→24 und 24→4→1→24 am selben Tag. Vergangene Scans bleiben unverändert; höchstens ein abgeschlossener GPT-Vollscan je UTC-Stunde und 24 je Betriebstag. Dazwischen leichte stündliche Statusprüfungen; nicht jeder Wake-up = neuer GPT-Vollscan. Bei offener Position vorläufig mindestens 12 Analysen täglich, bei bestätigtem akutem Risiko bis 24. Alle ausgefallenen Ausführungen als solche protokollieren, nicht rückwirkend als erfolgt zählen.

Die technische, **nicht** selbst startende Planungslogik ist in `research/r29/operations/adaptive-daily-cadence.mjs` (`reconsiderDailyPlan()` bei jedem Stunden-Wecklauf, `scanDue()` nach tatsächlich abgeschlossenem letzten GPT-Scan); Tests: `research/r29/operations/operations.test.mjs`. Die stündliche ChatGPT-Automation muss diese Revisionen tatsächlich ausführen und append-only protokollieren; bloßer GitHub-Code belegt keinen produktiven Betrieb. Der lokale Bot und eine ChatGPT-Automation sind verschieden. Keine Behauptung garantierter 24/7-Kontrolle, falls Windows-PC, Netz, GitHub oder Automation ausfallen.

## 2. Aktueller tatsächlich belegter Stand (16.11.2026)

- Bestehende Automation: **Sniperbot R29 GPT-Paper-Diagnoseführer**, ID `6af9cdf5ba548191a1c2304988e4d3ab`, Wiederholung stündlich etwa Minute 32, `Europe/Berlin`. **Nicht duplizieren**.
- Letzter überprüfter Research-Status: `research/r29/channel/dynamic-research-status.json` meldete 15 Forschungsreviews und für den Tag eine Forschungshäufigkeit von 12; **nur Snapshot, nicht als Live-Wahrheit behandeln**.
- `research/r29/channel/gpt-paper-security.json` meldete **0 unabhängig geprüfte EVM-Kandidaten**, historische Solana-Sellability nicht belegt.
- `research/r29/channel/gpt-paper-context.json` meldete PAPER_ONLY, `gpt_follow_enabled:true`, `paper_bot_enabled:true`, `positions:[]`. **Frische ist vor einer Order erneut zu prüfen**, aus dem öffentlichen Kontext kein Papier-Guthaben erraten.
- Ein erfolgreicher `NO_TRADE`-Empfang auf dem Laptop ist belegt, **aber kein tatsächlich marktbasierter GPT-Paper-BUY und SELL über den ganzen Pfad nachgewiesen**. Nur `PAPER_FILLED` ist ein echter virtueller Fill.
- **Echtgeldhandel bleibt aus**, bis ein separater Nutzerauftrag und technische Sicherheitsfreigaben vorliegen.

## 3. Pflichtlektüre vor jeder neuen Entscheidung

1. **Diese Datei** `SNIPERBOT_R29_START_HERE.md`.
2. `research/r29/operations/DAILY_RESEARCH_AND_LEARNING_PROTOCOL_DE.md`.
3. `research/r29/gpt-strategy/MARKTFORSCHUNG_WISSENSBASIS_DE.md`.
4. `research/r29/gpt-strategy/ERFAHRUNGSJOURNAL_DE.md` sowie neue, unveränderliche `research/r29/gpt-strategy/experiences/YYYY-MM-DD/*.md`.
5. **Neue Outcome-/Lernberichte** unter `research/r29/operations/outcomes/` bzw. `research/replay-120d-real/results/`. Zukünftige Resultate erst NACH damaligem Entscheidungstermin interpretieren.
6. `research/r29/channel/dynamic-research-status.json`, `dynamic-research-review.json`, `gpt-paper-security.json`, `gpt-paper-context.json`, `gpt-paper-receipt.json`.
7. `runner/gpt-paper-protocol.mjs` und `research/r30/DIAGNOSEFUEHRER_PROTOCOL.md` für signierte Paper-Bot-Verträge.
8. Bisherige Echtforschung `research/replay-120d-real/REPORT_VOLLSTAENDIGER_ECHTER_HANDELSTAG_2026-10-15_DE.md` und `research/replay-120d-real/REPORT_DE.md`.

Wenn auch nur eine wesentliche Sicherheits-/Sellability-/Pool-Quote-Quelle fehlt: **WATCH/NO_TRADE oder BLOCKED**, keine fingierte Order.

## 4. Echtdaten-Backtest – Belege und Grenzen

- **120 Kalendertage:** 20.07.–17.09.2026 Beobachtung, 18.09.–16.11.2026 Handelstest (letzter Tag ursprünglich nur bis verfügbarer UTC-Zeit).
- **2.713.057** historisch erfasste echte Solana-Tokenstarts über 67 Tage, 53 Tage fehlende Launch-Quelle; keine vollständige historische Quote-/Sicherheits-Historie.
- 15.10.2026: kompletter öffentlich abrufbarer Tag **42.230.410 echte historische Swap-/Fehlversuchsereignisse**, davon **20.428.528 fehlgeschlagen**. **48** neutral gewählte Mint-Adressen (erste zwei Starts pro UTC-Stunde), **28.112** zugehörige tatsächliche Handelsereignisse, **41** Mints mit beobachteten Käufen und Verkäufen. Source-Commit/Quellenprüfungen: `research/replay-120d-real/full-day-neutral-swaps.py`.
- Sechs echte, historisch zeitlich gefilterte Forschungsframes wurden **HEUTE rückblickend** von GPT bewertet: **2 WATCH, 4 NO_TRADE, keine BUY-Freigabe**. Original: `research/replay-120d-real/reviews/2026-10-15-six-neutral-real-frames-current-gpt.json`.
- 60-Tage-Preisvergleich auf **echt archivierten Binance-Kursen, rückblickend fest gewählten Paaren und modellierten Ausführungen**, **kein GPT-Handel**: konservative Variante A indikativer Endwert **4.895,38 TEST-USDC**, dynamische B **2.497,62 TEST-USDC**, Start jeweils 5.000. Die aggressive Variante verlor indikativ rund 50 %. Niemals als echtes Modell-GPT-Ergebnis ausgeben.
- **Noch NICHT erwiesen:** neutraler 120-Tage-DEX-Launch-/Swap-/LP-/Security-Katalog auf allen Chains, echte historische GPT-Signalreihe, füllbare USDC-Bid/Ask-Quotes und ein tatsächliches 60-Tage-GPT-Paper-P&L. **Keinen Gewinn schätzen oder erfinden.**

## 5. Fehler erkennen, auch bei abgelehnten später steigenden Coins

Jede strategische Entscheidung speichert: `decision_id`, Chain, eindeutige Token- und Pool-Adresse, virtuelle bzw. tatsächliche UTC-Zeit, SOURCE-HASH und damalige Quelle, Score mit dokumentierten UNKNOWNs, BUY/WATCH/HOLD/SELL/NO_TRADE, Begründung, Risikobudget, Quittung/Fill oder Ablehnung.

**Danach separat:** Nach Ablauf des Beobachtungshorizonts echte Outcomes mit derselben Token-/Pool-/Quote-Identität prüfen. Bei späterem deutlichen Kursanstieg (für Forschung vorregistrierter Schwellenwert **+75 %**) Ergebnis als `POSTHOC_PRICE_RALLY_NOT_PROVEN_EXECUTABLE` kennzeichnen. Kein späteres ATH als früheres Wissen einsetzen. Preis-Anstieg ≠ sicherer ausführbarer verpasster Gewinn. Auch Coin ohne späteren Kurs bzw. ohne vergleichbares Referenz-Quote als **UNKNOWN** berichten.

Das **append-only** Lernsystem `research/r29/operations/decision-outcome-learning.mjs` erzeugt nur **künftige Hypothesen**. Es darf einen eingefrorenen 60-Tage-Blindtest niemals im Nachhinein ändern. Neue Strategieversionen bekommen Veröffentlichungszeit und unabhängige Forward-Paper-Prüfung. **Mandatory KO-Regeln bleiben bestehen**, selbst wenn ein abgelehnter Coin später gestiegen ist.

## 5a. Neues Kandidaten-Gedächtnis (kein automatischer Kauf)

- **JEDER** im aktuellen öffentlichen Forschungsreview beobachtete Coin wird mit Chain + eindeutiger Token- **und Pooladresse**, Research-SHA und beobachtetem Zeitstempel unter `research/r29/operations/candidate-watch/snapshots/YYYY-MM-DD/` festgehalten. Dazu gehören auch einander widersprechende oder wegen Sicherheit abgelehnte Coins. Die vorhandenen `DETERMINISTIC_CONTROL`-Fälle werden archiviert, aber **aus der Handelsperformance ausgeschlossen**.
- **Neuste Null-Kandidaten-Sicherheitsdiagnose:** `research/r29/operations/SECURITY_ZERO_CANDIDATES_DIAGNOSTIC_2026-11-16_DE.md`; die lokale nächste Sicherheitsveröffentlichung erhält `selection_diagnostic` und `local_market_read_status` für gezielte Fehleranalyse. GitHub-Code ist kein Beleg für eine Installation auf Windows.
- **Aktuell erstes echtes Archiv:** `research/r29/operations/candidate-watch/snapshots/2026-11-16/20261116T165647536Z-69938eedf12bd93b.json`: 10 echte Forschungsproben + 2 Kontrollfälle, sämtlich keine verifizierte Sellability.
- **Getesteter Vergleich:** `research/r29/operations/market-research-watchlist.mjs`. Ein späterer öffentlicher Review darf zum ursprünglichen Scan erst verglichen werden, wenn sein späterer Zeitstempel erreicht und die **identische Chain:Token:Pool-Kombination** nachgewiesen ist. Fehlende später beobachtete Coins sind `UNKNOWN`, nicht ein Gewinn und nicht eine korrekte Ablehnung.
- **Schwelle:** +75 % im selben Kandidaten anhand späterer *indikativ* angezeigter Preise = `INDICATIVE_SAME_POOL_LATER_PRICE_RALLY_NOT_EXECUTABLE`. Das ist NICHT ein persönlicher möglicher Gewinn und kein DEX-Fill. Eine Risikofreigabe benötigt unabhängig damalige Contract-, LP-, Sellability- und Ausführungskriterien. Hohes Volumen ohne Liquidität bleibt verdächtig.
- **Wichtig:** Eine gewöhnliche Forschungsbeobachtung `INDEPENDENT_REVIEW_REQUIRED_NOT_BUY` ist keine tatsächlich vom GPT getroffene und archivierte `NO_TRADE`-Entscheidung. Für echte Lernqualität immer zwischen **Gesehen / GPT bewertet / gehandelt / quittiert** unterscheiden.
- **Dauerhafte Überprüfung:** Beim nächsten unabhängigen Marktstand (und zusätzlich nach Möglichkeit nach 24 Stunden und sieben Tagen) separate Outcome-Datei unter `research/r29/operations/outcomes/YYYY-MM-DD/` anlegen; keine historischen Archive ändern. Neue Hypothesen nach Prüfung unter `research/r29/gpt-strategy/experiences/YYYY-MM-DD/` veröffentlichen und nur vor zukünftigen Paper-Entscheidungen lesen.

## 6. Schreiborte und Grenzen

- Ursprüngliche GPT-Paper-Entscheidungen: `research/r29/gpt-decisions/YYYY-MM-DD/` (write once, Hash).
- Aktuelle Paper-Quittung: `research/r29/channel/gpt-paper-receipt.json` (nur tatsächlichen lokalen Status lesen).
- Append-only Tagesdiagnosen: `research/r29/daily-diagnoses/`.
- Neue Lernerfahrungen: `research/r29/gpt-strategy/experiences/YYYY-MM-DD/`.
- Geprüfte historische Outcome-Berichte: `research/r29/operations/outcomes/`.
- Historische Forschung: `research/replay-120d-real/` und Repo-artifact GitHub Actions.
- **Keine** Datums-/Gewinnrückdatierung, keine doppelten offenen Papierkonten, keine privaten Wallet- oder PayPal-Daten in GitHub, keine Echtgeld-Orders.
- Bestehende stündliche Automation verwenden, keinen zweiten strategischen Dot oder lokalen Autopiloten starten.

## 7. Neue Unterhaltung: schneller Arbeitsauftrag

> Öffne den GitHub-Branch `127027/Sniperbot-`, lies zuerst `SNIPERBOT_R29_START_HERE.md` sowie das tägliche Forschungs-/Lernprotokoll und die aktuellsten GitHub-Research-, Security-, Positions- und Receipt-Dateien. Prüfe den wirklichen Fortschritt der stündlichen GPT-Paper-Forschung, setze nur nach belegten Daten den nächsten Arbeitsschritt um. Berücksichtige das append-only Erfahrungs- und False-Negative-Outcome-Journal, ohne historische Entscheidungen umzuschreiben. Kein Echtgeld, keine erfundenen GPT-Trades. Gib UTC-Zeit, Dateipfade, Commits und tatsächliche PAPER_FILLED-Nachweise an.

Dieses Dokument macht den Projektstand **auffindbar und prüfbar**. Eine beliebige neue ChatGPT-Unterhaltung liest GitHub nicht automatisch; dafür muss der Repo-Link verfügbar sein bzw. das Projekt die Quelle einbinden.
