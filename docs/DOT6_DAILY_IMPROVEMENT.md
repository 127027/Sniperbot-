# R29 Cleanroom – Dot 6: tägliche 24-Stunden-Gewinner- und Verbesserungsprüfung

## Ziel und Zuständigkeit
Dot 6 ist **unabhängig von allen Endgeräten** der tägliche retrospektive Auditor. Wegen des Kontolimits von fünf aktiven Automationen wird Dot 6 **als separat protokollierte Tagesphase der bestehenden stündlichen Dot-5-Automation** ausgeführt; er ist keine zusätzliche sechste geplante Aufgabe. Der erste Lauf ab 20:00 Uhr Europe/Berlin ohne vorhandenen heutigen Dot-6-Bericht beginnt den Tagesaudit. Dot 1–5 laufen wie bisher; Dot 6 trifft keine BUY/SELL-Entscheidungen, ändert keine Paper-Konten und erzeugt niemals Fills. Er gibt alle 24 Stunden einen prüfbaren Bericht ab und etabliert einen **messen → Ursache → gezielte Verbesserung → erneuter Test**-Kreislauf. Arbeite ausschließlich in `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`. Kein main/alter Bot/Wallet/Echtgeld/zusätzliche Anbietergebühren.

## 1. Zeitfenster und Vergleichsmenge
- Bestimme zum Zeitpunkt des realen Durchlaufs `as_of_utc`; Fenster **[as_of_utc - 24 Stunden, as_of_utc)**, UTC. Keine stillen Überschneidungen oder erfundenen Uhrzeiten.
- Recherchiere unabhängig rückblickend über **öffentlich zugängliche kostenlose HTML-Seiten** (z. B. Gainers-Übersichten/Pool-Detailseiten von DEX Screener und GeckoTerminal) auf Solana, Base, Ethereum und BSC, soweit tatsächlich zugänglich. Nach Möglichkeit mehrere Seitenseiten und weitere EVM-/Solana-Poolkataloge. Gleiche Symbolnamen über unterschiedliche Chain/Contract/Pool dürfen nie zusammengeführt werden.
- Erfasse **alle nachweisbar gefundenen** Memecoin-Pools mit **24-Stunden-Kursanstieg strikt >+100 %**. Daneben optional `INTRADAY_SPIKE_100_PLUS`, wenn es echte zeitgestempelte historische Minutenpreise gibt; eine nur kurzzeitige Verdopplung ist **nicht** dieselbe Kennzahl wie die 24h-Änderung.
- Je Fund: `chain`, `contract`, `pool`, `symbol`, `change_24h_pct`, ursprüngliche Quelle und URL, tatsächlich erkennbarer Datenstand, Abrufzeit und ggf. Datenqualitätsflag. Vollständige Contracts und Poolidentitäten auf Detailseiten prüfen.
- **Keine Behauptung „alle Memecoins weltweit“ ohne vollständige historische Coverage.** Ranglisten sind paginiert/gefiltert, Schnappschüsse können veraltet sein und inzwischen verschwundene Pools fehlen. `coverage_status` (COMPLETE_WITHIN_DEFINED_UNIVERSE, PARTIAL, DATA_GAP) sowie Chain-/Quelle-/Seitenumfang explizit ausweisen. Niemals Gewinner, fehlende Preise oder historische Zeitpunkte erfinden.
- Die früheren 21 Nachtkandidaten sind höchstens eine **nachträgliche separate Kontrollgruppe**, nie Such-Seed.

## 2. Strenger Abgleich mit tatsächlichen Cleanroom-Daten
Lies alle vorhandenen unveränderlichen `research/journal/dot-1..dot-5/YYYY-MM-DD/*.json` sowie `research/latest/dot-1..dot-5.json`, `research/control/cadence.json`, `research/control/strategy.json`, `signals/index.json`, echte `signals/orders/<id>.json` und alle vorhandenen `receipts/<client-id>/<order-id>.json` innerhalb des Fensters. Wenn Dateien fehlen oder eine API keine Verzeichnisliste bereitstellt, protokolliere dies als **DATA_GAP** statt „0“.

Vergleiche **nur exakte `chain:contract:pool`-Identitäten** und tatsächliche UTC-Zeitstempel:
- War der Coin zu dem Zeitpunkt öffentlich erkennbar und wurde er von Dot 2 entdeckt? Verzögerung `first_public_observed_at` → `first_dot_discovered_at`, nur wenn beide real belegt.
- Konnte Dot 3 seinen Contract/Pool, Liquidität und Preisquellen prüfen? Falls nein, was fehlte genau?
- Hat Dot 4 den Coin rechtzeitig vor dem rückblickenden Kursanstieg gesehen und bewertet? Erhielt er BUY/WATCH/NO_TRADE? Warum?
- Wurde eine gültige Order tatsächlich in GitHub veröffentlicht, stimmt der SHA-Pointer und war sie noch gültig?
- Hat ein spezifischer Client rechtzeitig ein `PAPER_FILLED`, `PAPER_REJECTED` oder **kein Receipt = OFFLINE_OR_UNCONFIRMED** gemeldet? Geräte haben eigene Konten; nicht aggregieren als ein gemeinsames Geldkonto.
- Für vorhandene Trades: Entry, HOLD, Exit, Gebühren, PnL und verfrühten/verspäteten Exit nur gegen real beobachtete Daten beurteilen. **+100%-Tagesgewinner ≠ 100% realisierbare Handelsrendite.** Keine fiktiven historischen Fills.

## 3. Diagnose auch negativer Trades
Bewerte neben verpassten Gewinnern sämtliche tatsächlichen Dot-4-Orders und Quittungen einschließlich verlustbringender Paper-Trades. Kein Kauf wegen mangelnder Sicherheitsbelege ist nicht automatisch „Fehler“. Unterscheide:
`DISCOVERY_MISSED`, `DISCOVERY_LATE`, `IDENTITY_GAP`, `RISK_DATA_GAP`, `RISK_REJECTED_JUSTIFIED`, `STRATEGY_SKIPPED`, `GPT_NOT_DUE`, `ENTRY_EARLY`, `ENTRY_LATE`, `SELL_EARLY`, `SELL_LATE`, `SIGNAL_PUBLISH_FAILED`, `SIGNAL_EXPIRED`, `PRICE_STALE`, `CLIENT_OFFLINE_OR_UNCONFIRMED`, `PAPER_REJECTED`, `TRADE_LOSS`, `NO_VERIFIABLE_ROOT_CAUSE`.
Jede Aussage braucht Datei-/URL-Beleg und UTC-Zeitstempel. Die Stelle des ersten nachweisbaren Datenverlusts/Fehlers mit verantwortlichem Dot bestimmen.

## 4. Konkrete Verbesserung – täglicher Kreislauf
Für jedes wiederkehrende oder hochpriorisierte Problem: `owner_dot` (1–5 oder paper-client), `hypothesis`, `evidence`, `proposed_change`, `expected_metric`, `risk`, `validation_method`, `rollback` festhalten.
- **Automatisch erlaubt:** Nicht-invasive Recherche-, Paging-, Identitäts-/Dokumentations- und Testverbesserungen auf genau diesem Branch mit nachweislich bestandenen Tests; bis zu eine kontrollierte Änderung pro Lauf, wenn klar belegt. Verwende GitHub-CAS, prüfe aktuelle Branch-Version und verhindere konkurrierende unbemerkte Änderungen.
- **Nicht automatisch erlaubt:** Echtgeld, Sicherheitsregeln aufweichen, Daten/Preise erfinden, BUY erzwingen, andere Dots eigenständig zu spekulativen Trades verpflichten oder ihre Scheduling-Automationen unkontrolliert ersetzen. Für Strategie-/Risikogrenzen nur belegte Änderungsvorschläge schreiben; fachlichen Vergleich an folgenden Tagen durchführen.
- Führe ein strukturiertes `research/improvement/backlog.json` (nur Dot 6 bearbeitet) mit Status OPEN/APPLIED/VALIDATING/REJECTED, bevor/nachher Kennzahlen und experimentellen ID. Keine unbewiesene Optimierung als erledigt markieren.
- Am nächsten Tag frühere Maßnahmen auf reale Wirkung prüfen; eine Regression zurücknehmen und protokollieren.

## 5. Pro Lauf verpflichtende Dateien
1. Unveränderliches `research/journal/dot-6/YYYY-MM-DD/UTC-HHMMSS-<runid>.json` mit Bericht, realen Quellen, Scope und Fehlern.
2. Ausführlicher Tagesbericht `research/reports/YYYY-MM-DD/<runid>-24h-audit.json` und bei Möglichkeit gleichnamiges `.md` mit **ganzer tatsächlich gefundener** >100%-Liste (auch bei leeren Ergebnissen, jedoch mit DATA_GAP-Hinweis), Abgleich, Dot-Qualitätswerten, echten Orders/Receipts, Vorher/Nachher-Fortschritt und Verbesserungsprioritäten. Niemals auf eine unbelegte Top-10-Liste kürzen.
3. `research/latest/dot-6.json` mit Berichtspfad, Coverage, Anzahl belegter Gewinner und Maßnahmen, aktualisiert über den vorher gelesenen echten Blob-SHA (GitHub-Contents-CAS). `research/improvement/backlog.json` per CAS, sofern Änderungen.
4. Kurze benutzbare Zusammenfassung in der Automationsantwort: 24h-Zeitraum, Anzahl beobachteter >100%-Kandidaten nach Chain, durch Dots gesehen/verpasst, tatsächliche BUY/SELL/PAPER_FILLED/PAPER_REJECTED, Hauptblocker, einzige wichtigste Verbesserungsmaßnahme, Link zum GitHub-Bericht.

### Verifikation
Das lokale pure Helper-Modul `src/daily-audit.mjs` (`npm test`) kann standardisierte rückblickende Funde, Dot-Events, GitHub-Orders und Client-Receipts ohne jeden Netz-/Tradezugriff nach `chain+contract+pool` abgleichen. Hilfsmodul-Ergebnisse sind **keine** selbst recherchierten echten Marktdaten.

### Ehrlichkeitsregel
Wenn Webseiten/Downloads oder GitHub-Schreibzugriff fehlen: Journal/Report soweit möglich, `DATA_GAP` und konkrete Reparatur. Fehlende Dateien nicht als 0 zählen. Keine gewonnenen Chancen allein aus Kenntnis der späteren Kursspitze behaupten.
