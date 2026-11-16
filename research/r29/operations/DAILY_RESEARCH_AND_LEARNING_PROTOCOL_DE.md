# R29 – Täglicher 24/7-Forschungsbetrieb und Lernkreislauf (PAPER_ONLY)

**Stand 16.11.2026.** Dies ist der verbindliche Betriebsplan, **kein Beleg für eine schon produktiv durchlaufene 24/7-Handelskette**.

## 1. Tageszyklus · Europe/Berlin

Der Betriebstag beginnt um **08:00 Ortszeit**. Die einzige bestehende stündliche ChatGPT-Automation prüft ungefähr zur Minute **:32** (also morgens 08:32) und entscheidet jeden Tag neu. Bei Sommer-/Winterzeit gilt die Ortszeit. Der lokale Bot kann laufend Paper-Daten sammeln; nur ein tatsächlich aufgerufenes GPT-Modell zählt als GPT-Analyse.

| Stufe | Tagesfrequenz | Mögliche lokale Uhrzeiten der Vollanalyse | Bedingung |
|---|---:|---|---|
| Ruhig, keine GPT-Position | 1 | 08:32 | Tageslage prüfen, keine glaubwürdige neue Aktivität |
| Verifizierte normale Aktivität | 4 | 08:32, 14:32, 20:32, 02:32 | Mehrere authentisch neue Pool-/Käufer-/Volumenbelege |
| Intensive Aktivität / offene Position | 12 | 08:32, 10:32, …, 06:32 | Mehrere unabhängige Signale, oder bestätigte GPT-Paper-Position |
| Akutes Positionsrisiko / sehr hohe Aktivität | 24 | Jede Stunde ab 08:32 | Unabhängig bestätigte erhöhte Aktivität / dringende Positionsrisiken |

Diese Schwellen sind vorläufige **Betriebsheuristiken**, keine bewiesene Profitoptimierung. Die ausführbare Testfunktion liegt in `research/r29/operations/adaptive-daily-cadence.mjs`, geprüft auf UTC/DST und 1/4/12/24. Bei DST-Verkürzung oder Systemausfällen keine fehlenden Modellaufrufe erfinden. Nachträgliche Planänderungen mit Uhrzeit und Quellen protokollieren.

**Wichtig:** Die stündliche Wake-up-Prüfung bleibt billig; eine neue volle GPT-Marktanalyse erfolgt nur, wenn fällig und neue Markt-/Positions-Evidenz vorliegt. Morgens muss sie mindestens einmal laufen (bei verpasstem Check zeitnah nachholen). Keine 24 künstlichen Analysen mit identischem Quellenhash. Keine News- oder Onchain-Quelle, deren Publikationszeit nach dem virtuellen Entscheidungstermin liegt.

## 2. Jede Analyse: Entscheidung und vollständiger Positionskreislauf

1. Zeitstempel UTC und Europe/Berlin; aktuellen Betriebsplan und Tagesjournal lesen.
2. Forschung, Quellen, Token/Contract-/Pool-Adresse, Nachrichten, Onchain-Wallets, unabhängige Käufer und Liquidity/Spread/Slip prüfen. Einen Score nur aus belegten Komponenten erzeugen.
3. *Alle* offenen GPT-eigenen Paper-Positionen vor neuen Käufen prüfen: aktueller Preis, 24h/1h-Momentum, Social-/Wallet-Trends, LP, Sellability, Hard-Stop-Auslösung und GPT-eigene HOLD/SELL-Entscheidung. Keine Position aus veralteter GitHub-Quittung halluzinieren.
4. Neue Kandidaten mit Datum und Quellenbewertung für BUY/WATCH/HOLD/SELL/NO_TRADE oder BLOCKED führen.
5. Order nur wenn unabhängige KO-Prüfungen bestanden, aktuelle ausführbare Quote, gültiger frischer lokaler GPT-Paper-Kontext, vorhandenes Budget, richtige Contract-/Pool-Identität; keine pauschale „Coin steigt sicher“ Prognose.
6. BUY/SELL über den bestehenden Hash-gebundenen `runner/gpt-paper-protocol.mjs`, einmaliges Archiv, danach signierten GitHub-Pointer und tatsächliche lokale Receipt. **Nur `PAPER_FILLED` ist ein Fill.** Paper-PnL nur aus belegten lokalen Paper-Trades, niemals aus Research-Quotes.
7. Nur begründete neue, sichere GPT-Signale führen zu Paper-Trades. Ist eine Datenquelle unvollständig, `DATA_GAP / NO_TRADE`; im Echtbetrieb kein Echtgeld.

Für offene Positionen bleiben lokale technische Notbremsen wichtig: Ein Stundencheck verhindert keinen 2-Minuten-Rugpull. Stopps müssen aktuelle ausführbare Preise und Validierung haben; keine Stop-Loss-Preisgarantie.

## 3. Fehler- und Lernjournal – AUCH verpasste Gewinner

Die dauerhafte Entscheidungsakte (`decision_id`, `asof_utc`, `source_sha256`, `chain`, `token`, `pool`, `score`, `reason`, `decision`, `confirmation`, `paper_receipt`) wird **nicht überschrieben**.

Für jeden BUY, NO_TRADE, WATCH und SELL bleiben Coin und deren spätere Verfügbarkeit zu prüfen. Ein späterer ATH/Social-Rückblick ist erst beim **separaten, zeitlich späteren Ergebnis-Audit** zulässig. Die auf echte Transaktionen abgestimmte Prüflogik liegt in `research/r29/operations/decision-outcome-learning.mjs` und im historischen Einzeltag `research/replay-120d-real/actual-outcome-audit.py`.

**Posthoc-Kategorien:**

- `REJECTED_LATER_PRICE_RALLY_OBSERVED`: Ein abgelehnter/verfolgter Coin weist später bei **demselben Pool, derselben Chain, demselben Quote-Asset und Venue** mindestens +75 % in ausgeführten Trades anderer Marktteilnehmer auf. Das ist **keine sichere verpasste Rendite**, da Mindestliquidität, Ausführungspreis und Risiko fehlen können.
- `DECLINED_WITH_NO_LATER_RALLY`: Nachweisbar kein vergleichbarer größerer Preisanstieg im definierten Horizont – nur bei tatsächlich vollständigen Quellen.
- `UNKNOWN_NO_ASOF_REFERENCE`: Keine eindeutig vergleichbare historische Preismessung vor Entscheidung; **nicht als korrektes Vermeiden zählen**.
- `BLOCKED_FOR_SECURITY`: Sicherheitsgate war damals nicht belegt oder negativ. Ein späterer Rally ändert diesen historischen Sachverhalt nicht.
- `BOUGHT_THEN_LOSS`: Erst bei bestätigten tatsächlichen Paper-Fills und Verkäufen angeben; Gründe und Stop-Logik prüfen.
- `TECHNICAL_MISDELIVERY`: Gültige Entscheidung, aber keine oder fehlerhafte GitHub-/Laptop-Quittung.
- `MODEL_MISTAKE`: Nur wenn Zeitpunkt, Quellen, Risiko, Ausführung und plausible Alternative vollständig belegt sind, sonst `UNCONFIRMED_HYPOTHESIS`.

**Lernkontrolle:** Für jeden späteren negativen oder positiven Ausgang eine *neue, datierte* Hypothese anlegen, Risiko-/Ursachengruppe taggen, Gegenbeispiele dokumentieren und die Verbesserung nur nach **neuem** Forward-Paper-Test als gültig markieren. Nicht einer Woche mit 1 Coin als „selbstlernende profitable KI“ ausgeben. Jede neue Strategieversion hat `published_at_utc` und darf nur Entscheidungen **danach** beeinflussen; der 60-Tage-Holdout bleibt unverändert eingefroren.

## 4. Ordner und maschinenlesbarer Tagesnachweis

- `research/r29/operations/plans/YYYY-MM-DD/HH-MM-UTC.json`: Neuer Planstand, UTC-Entscheidungszeit, Belege, Grund für Stufe 1/4/12/24. **Append-only** bei Umstufung, keine Überschreibung vergangener Pläne. Nur bei tatsächlich erfolgter Prüfung anlegen.
- `research/r29/daily-diagnoses/YYYY-MM-DD/`: Tatsächlich durchgeführte Analysen und leichte Checks unterscheiden. Abschlusswerte: **geplante vs. ausgeführte** GPT-Analysen, no-op-Checks, BUY/WATCH/HOLD/SELL/NO_TRADE, aktuelle tatsächlich bestätigte Paper-Positionen und fehlende Receipts.
- `research/r29/gpt-strategy/experiences/YYYY-MM-DD/`: Verifizierte Erfahrungen, keine rückwirkende Korrektur ursprünglicher Entscheidungen.
- `research/r29/operations/outcomes/YYYY-MM-DD/`: Rückblickende später bestätigte Entwicklung pro ursprünglich protokolliertem Coin (Quellhash, Entscheidungsversion, spätere Zeit und Datenlücken).
- `research/replay-120d-real/`: Historische Datensätze und Replay nur mit Quelle und Zeitpunkt; GPT-Entscheidungen vs. deterministische Preis-Scans getrennt.
- `SNIPERBOT_R29_START_HERE.md`: Einstieg, der jedem **neuen Chat mit GitHub-Zugriff** zuerst bekannt gemacht werden muss. Neue Unterhaltungen werden nicht automatisch durch diesen Repo-Text gefüttert.

Für jeden neuen Bericht: `scan_start_utc`, `scan_finished_utc`, `operating_day_berlin`, `scan_kind` (HOURLY_LIGHT_CHECK oder GPT_FULL_REVIEW), `source_sha`, `position_context_sha`, `reason`, `decision_id`, `GitHub_commit`, `paper_fill_status`, `limitations`, `lessons_consulted`.

## 5. Prüfphase: warum keine Echtgeldfreigabe

Der bislang real überprüfte 60-Tage-Preis-Schatten-Backtest auf rückblickend benannten Binance-Paaren war bei zwei Strategien negativ (Endwerte **4.895,38** bzw. **2.497,62** TEST-USDC aus 5.000); **keine GPT-DEX-Fills**. Die sehr viel größere echte Solana-Launch-Historie und der vollständige 15.10.2026-Swap-Tag beweisen Daten- und Zeitfilter, nicht Rendite oder ausführbare GPT-Käufe. Bei fehlender historischer Referenz bleibt das Outcome UNKNOWN.

**Bedingungen für weitergehenden Betrieb:** aktuelle, überprüfbare freie Security-/LP-/Sellability-Daten; tatsächliche GPT Paper BUY→HOLD→SELL Quittungen im Laptop, fehlerfreie lokale Notbremsen, positives unabhängiges Forward-Paper-Ergebnis nach Kosten und Ausfällen, separater ausdrücklicher Echtgeld-Freigabeschritt. **Keine automatische Echtgeldaktivierung aus diesem Dokument.**
