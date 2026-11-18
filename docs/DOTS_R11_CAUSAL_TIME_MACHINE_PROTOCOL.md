# R11 – Kausale Memecoin-Zeitreise (freigegeben 12.11.2026)

## Entscheidend: die Unterhaltung enthielt NUR ERFUNDENE RECHENBEISPIELE
Keine beschriebenen Beispiel-Tage (12/13/22/23/35/36/40/60), Gewinne, Scores (70/90%), Positionszahlen, 50/350/500 USDC, Preise oder Beispielfolgen sind echte historische Daten, tatsächliche Funde, Ziele, Schwellen oder erwartete Resultate. Sie dürfen weder als Trainings-Input noch als Labels, Filter, Scoreverteilung, simulierte Returns, Soll-Ergebnis oder Default-Konfiguration benutzt werden. Fiktive Unit-Test-Fixtures sind unabhängig, ausdrücklich SYNTHETIC und nicht Auswertung realer Coins.

## 61-Tage-Ablauf
Zeitfenster UTC 10.09.2024 00:00:00 bis 09.11.2024 23:59:59. Erstelle pro Tag D einen ausschließlich bis D verfügbaren INPUT-Kanal. Sortiere Ereignisse auch innerhalb des Tages nach ihrem öffentlichen nachgewiesenen Zeitpunkt. Dots dürfen beliebig viele neue unabhängige Kandidaten und negative Starts im vollständigen erreichbaren Quellenuniversum beobachten. Kein globales Vorwissen zu zukünftigen Coin-Namen/Gewinnen; keine Gewinnerliste als Input. Historische Medienartikel, Originalposts, Mint-/Pool-/Swap-Transaktionen und Preise müssen originalzeitliche Verfügbarkeit oder als unbekannt/provisorisch markieren.

Jeder Tag:
1. Unerwartete Meme-/Narrativereignisse selbst entdecken; auch ohne Coin als NARRATIVE_WATCH festhalten.
2. Mit sozialen Erstpost-Zeiten und unabhängigem Onchain-Mint/Paar belegen, welcher Token wirklich zum Narrativ gehört.
3. Historischen Risk-/Liquidity-/Sellability-Status exakt zu diesem Zeitpunkt prüfen, einschließlich Gebühren/Slippage und Menge.
4. Hypothetische WATCH / REJECT / BUY / HOLD / REDUCE / SELL / ADD Entscheidung für mehrere Coins, chronologische Zeitstempel und alle Belege sichern.
5. Vor dem Einblenden von Tag D+1: die vollständig festgelegten Entscheidungen append-only speichern; zukünftige Kurse nicht vorher offenlegen.
6. Nach D+1 neue Marktdaten für bestehende Positionen einlesen, HOLD-/Exit-Entscheidungen erneut treffen, inklusive Drawdown und Risiken.

## Kapital
Das **tatsächliche virtuelle Trainingsbudget und die zulässigen Einzelpositionen sind Konfigurationswerte, keine aus dem Beispiel ableitbaren Zahlen**. Keine bloße Score->Kapitalformel, keine automatische "90%=90% Wahrscheinlichkeit"; Score 0–100 ist nur ein unkalibrierter interner Bewertungsindex. Kapitalempfehlung nur durch begründete risiko- und kapazitätsgeprüfte Entscheidung, maximal frei verfügbare Testmittel plus budget limits. Kein echtes Paperkonto/Wallet betroffen.

Bei Endfenster: Positionen nur dort zum realistisch historischen Exit verkaufen, wo damals nachweislich eine handelbare Sell-Route + Kapazität vorhanden war; andernfalls offen/unbewertet/UNKNOWN kennzeichnen. Ein gewünschter Exit ist kein garantierter Fill. PnL, MaxDD, Quote- und fehlende Daten sauber trennen; Prozentgewinn und Rückgang in Prozentpunkten nicht vermischen.

## Datenbeleg und Blindheit
- STRIKT: originalzeitliche nachweisbare Archivbytes oder unveränderliche original Blockchain-TX mit Slot/Blockzeit und zeitkorrekt rekonstruiertem Poolzustand, externe Überprüfung erforderlich. Publikationsdatum alleine = PROVISIONAL, niemals bestätigter historischer Kauf.
- Reproduzierbare Quelle, Hash, URL, public_available_at_utc, archive_capture_utc / tx-slot, Beweisklasse und Quelle der Originaldaten.
- Coin-Identität: chain:mint:pool, Clone-/Symbol-Kollisionen offen behandeln.
- QA nimmt Gewinn-/Verlust-Auswertung erst nach festgeschriebenem Tagesjournal, niemals einen 2026 ATH/Retrospektivgewinner für Agenten-Eingabe.

## Rollen
- news_discovery: originale Erstereignisse und mögliche neue Coinnarrative vor dem Mint.
- social_acceleration: unabhängige originäre Erstposts, zeitkorrekte Social-Beschleunigung, Bot-/Paid-Indizien.
- onchain_liquidity: originaler Mint-/Pool-/Swap-Start, historische Preis- und Order-Routen/Poolliquidität.
- contract_security: Rechte, Holder, LP, Freeze/Mint/Tax/Blacklist, Sellability zum damals belegbaren Zeitpunkt.
- opportunity_qa: Tag-für-Tag kombinieren, kritische Rückfrage, hypothetische BUY/HOLD/SELL-Entscheidung mit eigener Begründung und getrennter Risiko- und Kapitalempfehlung.

## Absolut kein Bot-Zugriff
Keine Änderung an laufendem Windows-Bot, Engine, vorhandenen Paper-Salden, Live-Watchlist, Research-Snapshots oder `coordination/agent-paper-orders/latest.json`. Kein Signal-Publisher, keine Order-, Wallet-/PayPal-API, keine Signatur. Alle Trainingsresultate bleiben `research/historical/TRAINING_ONLY_20261112/*` und neuem R11-Auswertebranch vorbehalten. Der beigefügte Code `runner/dot-causal-timemachine.mjs` importiert keine Trading-Engine und enthält keine Netzwerkschnittstellen.

## Was ein Test belegen kann
Ein **synthetischer** Simulatorentest beweist chronologische Kontoführung, NO_LOOKAHEAD, Limitierung und Quote-Sperren – nicht Coin-Früherkennung. Ein **echter** historischer Vergleich erfordert einen zusätzlichen geprüften as-of-Ereigniskorpus über ALLE betrachteten positiven und negativen Token, echte signifikante Unterlagen, unabhängige fünf Dot-Läufe und externe Bewertung. Bei Datenmangel: DATA_GAP und keine Treffer-/Gewinnquote behaupten.

## Fortschrittsjournal
Jeder Dot speichert ausschließlich nachgewiesene Quellen und unveränderbare (frühere Einträge nicht nachträglich überschreiben) Tag-D-Entscheidungen im separaten Forschungsprotokoll. Ohne überprüfte Quellen bleiben Ergebnisse PENDING / DATA_GAP und offene Fragen; keine 61 Nulltage erfinden. Der Simulator erzeugt keine historischen Entscheidungen von sich aus.
