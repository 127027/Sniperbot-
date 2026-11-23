# R29 V2.2 – Vollständige bisher verfügbare Marktgeschichte vor Scan 1, adaptive Erstentscheidung und erneuter Oktober-Diagnoselauf

**Stand:** 23.11.2026 20:18 UTC. **Repository:** `127027/Sniperbot-`, ausschließlich Branch `codex/r29-cleanroom-paper-20261121`.

## 1. Eindeutige Benutzeranforderung

Um **12.10.2026 00:00 UTC** beginnt der Bot nicht als unwissender Neuling: Er soll die bis dahin zeitlich zulässige gesamte archivierte Marktgeschichte auswerten dürfen, auch solche von **Wochen/Monaten vor der fünfstündigen Vorbereitung**. Die Vorbereitungsphase `11.10. 19:00–12.10. 00:00 UTC` markiert nur das letzte operative Arbeitsfenster – **nicht den frühesten zulässigen Datenpunkt**. Dot 1 darf schon beim ersten stündlichen Wake von 4 auf 8, 12 oder 24 Vollreviews/Tag hochschalten. Schon beim ersten Scan kann Dot 4 **sofort BUY** vorschlagen, aber nur mit nachgewiesenen **bis zu diesem Tick verfügbaren** und für das Modell frischen Kurs-/Risikonachweisen. Weitere Wakes um 01:00 usw. behalten das Wissen und ergänzen neu verfügbare Daten. Stündliche Takte sind **keine** tatsächlichen GPT-Vollreviews.

## 2. Konkreter Code-Umbau

**Neu:** `src/v22-predecision-market-knowledge.mjs`
- Vereinigt **unbegrenztes as-of-Research-Lookback aus Snapshots** mit expliziten `market_knowledge_events` des neutralen `R29_V18_ASOF_REPLAY_INPUT`-Manifests: `POOL_DISCOVERY`, `MARKET_ACTIVITY`, `NEWS`, `SOCIAL`, `RISK_NOTE`, `HISTORICAL_CONTEXT`.
- Für jedes Ereignis und Coin/Paar: exakte Chain+Contract+Pool-Identität, `event_at_utc`, `archived_at_utc`, `available_at_utc`, Herkunftsklasse. Für `ORIGINAL_CAPTURE` verlangt das Modell deklarierten 40-stelligen Archiv-Blob-Hash; das **beweist selbst noch keine externe Echtheit**.
- Verhindert die Verwendung **zukünftiger, erst später verfügbarer, retrospektiv rekonstruierter und POST_EVENT_ORACLE**-Datensätze beim Scan.
- Trennt strikt `known_market` und `fresh_executable_quote`: keine Ausgabe von Orders, keine Freigabe allein durch Marktwissen; weiter 10-Minuten-Frische und vorbestehende Risiko-Gates.
- Die Statistik `markets_with_pre_warmup_knowledge` prüft ausdrücklich die **Verfügbarkeit vor 19:00**, nicht nur das historische Datum eines später publizierten Events.
- Zählt eindeutige `POOL_DISCOVERY`-Ereignisse der jeweils letzten 60 Minuten als **indikative** neue Marktaktivität für Dot1. Ohne vergleichbare vollständige Marktstichprobe darf dies **hoch-, aber nicht herunterschalten**.

**Integriert:** `src/point-in-time-strategy.mjs`, `src/v19-backtest-window.mjs` und `src/v18-requested-backtest.mjs`
- Der Stand des Vorwissens wird im ganzen 5h+24h-Zeitstrahl und explizit bei `00:00`, `01:00`, … sichtbar und für die stündlichen Entscheidungen in den Research-Kontext aufgenommen.
- Ein starker, vor dem Tick bekannter Zuwachs bei neu entdeckten Pools kann Dot1 **bereits um 00:00 sofort 4→24** empfehlen; kein zusätzlicher erzwungener Vorlauf bis 01:00 oder sechs Stunden.
- Ohne Daten bleibt die originalgetreue Lücke `DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE` vollständig bestehen. Vorwissen allein erzeugt keine BUY-/SELL-Freigabe.
- **Wichtig:** Es ist ein *Eingabevertrag für alle bis dahin belegbar verfügbaren Daten*, nicht die Behauptung, das vorhandene GitHub-Archiv enthalte jeden realen Coin. Ein leerer oder unvollständiger Input bleibt als solcher ausgewiesen.

**Neues isoliertes Diagnoseskript:** `scripts/v22-midnight-knowledge-diagnostic.mjs`; `npm run diagnose:v22:knowledge`, eingebaut in `.github/workflows/cleanroom-v19-ci.yml`. Keine Netzwerkanfrage, kein GPT, kein Wallet und kein Order-Write.

**Neue Tests:** `test/v22-predecision-market-knowledge.test.mjs`. Prüfen unbegrenzte ältere Informationen, 00/01-Zeitgrenze, sichere Quellen, spätes Archivdatum, retrospektive Sieger, erste BUY-Entscheidung und dynamische 8/12/24-Frequenz.

## 3. GitHub-Prüfung: Zwei getrennte Resultate

### A – SOFTWARE-Kontrollprobe (synthetisch, **keine echten Oktober-Coin-Bewegungen**)

[**CI #45257855285**](https://github.com/127027/Sniperbot-/actions/runs/45257855285), nach Fehlerkorrektur **850 Tests, 850 PASS, 0 FAIL**; `TEST_ONLY_NO_SIGNAL_WRITE 0`.

`R29_V22_MIDNIGHT_KNOWLEDGE_DIAGNOSTIC` protokolliert:
- **29h** Modellzeit (5h Warmup + 24h) und **24** stündliche Entscheidungstakte;
- **83** im Modell vor 00:00 bekannte Märkte (davon einer schon vor 5h-Warmup) und **82** jüngst entdeckte Pools;
- Dot1 springt um **00:00 direkt auf 24** empfohlene Modell-Vollreviews/Tag;
- Dot4 wählt **sofort um 00:00 einen synthetischen Modell-BUY** und **um 01:00 einen Modell-SELL**;
- 1 BUY, 1 SELL, anfänglich 5.000, zuletzt **5.016,43247371 TEST-USDC** rein *hypothetische Modellrechnung*, **+16,43247371 TEST-USDC nicht historischer Gewinn**;
- echte historische GPT-Dot-Reviews **0 nachgewiesen**, tatsächliche Windows-Paper-Fills **0**, Echtgeld und bestehendes Konto **unverändert**.

Das beweist den **technischen Ablauf und die automatische Erstscan-Frequenz**, nicht die historische Erkennung der 65 Sieger.

### B – TATSÄCHLICH angeforderter 12.10.-24h-Quellen-Diagnoselauf (ohne erfundene Originaldaten)

- Benutzer-GitHub-Request `research/diagnostic-24-requests/2026-11-23/r29-v22-full-prior-knowledge-oct12-user-retest-20261123T2020Z.json`, Commit `a089bbfb589ec7d5b1ba4372db84433e0b467b15`.
- [**GitHub Actions #45257966772, erfolgreich**](https://github.com/127027/Sniperbot-/actions/runs/45257966772), **850/850** Softwaretests.
- **24/24** stündliche Modell-Takte, erster Scan **00:00 UTC**, 0 Modell-BUY, 0 Modell-SELL und 0 Client-Fills.
- **0** belegte originale, am 12.10. verfügbare vollständige Oktober-Markt-/Quote-Snapshots im übergebenen Manifest; daher für den **historischen** Fall weiterhin `DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE`.
- **65** nachträglich bekannte Coin-/Pool-Referenzmeldungen werden **nur nach eingefrorenen Modellentscheidungen** eingelesen.
- Nachträgliche neutrale Solana-Stichprobe: **192** Token-Mints / **2.598** Mint-Nennungen; **191** inkonsistente behauptete Source-Altersfelder. Keine verbürgte 65-Coin-Recall-Rate, keine 65 bestätigten handelbaren Gewinne.
- Isoliertes Modell-Kapital bleibt **5.000 TEST-USDC**, weil es keine qualifizierbaren historischen Trades gibt. Nominale Modellveränderung 0, **historische Handelsrendite nicht berechenbar**.

## 4. Verbleibende Original-Gates

Der abschließende Original-Abnahmebericht im erfolgreichen #45257855285 und im #45257966772 bestätigt unverändert:

**13/60** Nicht-Backtest-Aufgaben als endgültig bestanden (**21,67%**), **8** echte Beweisblocker, formeller QA-04-Backtest `NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE`. Die Verbesserung hat viele Softwaretests bestanden, aber **keine** externe historische Originalquellenvollständigkeit, unabhängige Quote-/Sellability-Attestation, authentifizierte GPT-Kette oder Windows-Client-End-to-End-Transaktion neu bewiesen.

**Nächste echte Arbeit:** eine **neutrale, historische Marktdaten-Eingabe** inkl. Verlierern und vorab existierenden Pools für alle unterstützten Chains sowie nachvollziehbare Onchain-/Quote-Ereignisse einlesen; ihre ursprüngliche Verfügbarkeit und Verkaufbarkeit unabhängig belegen. `market_knowledge_events` und `snapshots` liefern dazu jetzt die passende technisch geprüfte Einbindung. Der 12. Oktober bleibt Diagnose-/Trainingsdatum; ein neuer unbekannter Holdout dient später als Unabhängigkeitsnachweis. Keine Gewinnernamen als Vorab-Scannerinput.
