# Sniperbot R29 – GPT entscheidet, lokaler Bot führt aus

**Festgelegte Zuständigkeit:** 16.11.2026 · **PAPER_ONLY**, Echtgeld technisch gesperrt.

## Einziger strategischer Entscheider: GPT
GPT selbst entscheidet aus aktuellen, überprüfbaren Marktbelegen über:
1. **Kandidatenauswahl**: ausschließlich neue oder gerade viral werdende kleine Memecoins; Coin-/Chain-/Contract-/Poolidentität; keine rückblickend gewählten Gewinner.
2. **Recherchefrequenz**: 1, 4, 12 oder bis zu 24 tatsächliche Vollscans pro Betriebstag. GPT darf anhand frischer Belege die Stufe bei jedem stündlichen Wecklauf neu bestimmen.
3. **Strategie**: BUY, HOLD, SELL, WATCH oder NO_TRADE sowie Begründung und ggf. Exit-/Teilverkaufsabsicht.
4. **Positionsgröße**: im historischen Stresstest 50–5.000 TEST-USDC pro Position, niemals mehr als freies virtuelles Kapital; tatsächliche Laptop-Risikogrenzen bleiben bis zu gesondert getesteter Änderung bestehen.
5. **Lernprozess**: Auswertung von verpassten Chancen, Verlusten, False Positives, frühen/späten Ausstiegen; Veränderung der Handelsstrategie nur nach unabhängigem Test.

Ein Score ist **keine empirisch kalibrierte Wahrscheinlichkeit**, dass ein Coin „durch die Decke geht“. Die GPT-Entscheidung muss eine Einschätzung ihrer Unsicherheit, Geld-/Liquiditätsrisiken und Datenlücken berücksichtigen.

## Lokaler Bot: nur technischer Executor, keine zweite Handelsstrategie
- Empfängt **ausschließlich** authentifizierte, unveränderte GPT-Paper-Intents über den bestehenden R29-Vertrag (`strategy: GPT_ONLY`), prüft Zeitfenster, Hash, Signatur/Transport, Nonce/Duplikate, Chain/Contract/Pool, Paper-Modus, freie virtuelle Mittel und technische Sicherheits-/Ausführbarkeitsgrenzen.
- Führt bei gültigem BUY den erforderlichen **simulierten Quote-Asset-Tausch** sowie die Paper-Order zum unabhängig verifizierten handelbaren Preis aus; bei SELL entsprechend die virtuelle Rückwandlung. Nicht bloß den angezeigten Tokenpreis multiplizieren: Fees, Price Impact und Slippage berücksichtigen.
- Darf **keinen** Coin selbst auswählen, keinen Strategiewert optimieren, keinen Einsatz aus eigener Gewinnprognose bestimmen und keinen eigenen BUY-/SELL-Trigger aus Social oder Chart ableiten. Eine technische Ablehnung (`BLOCKED`, `REJECTED`) ist **kein** Ersatz-Handelssignal.
- Technische Notstopps/Failsafes dürfen Aufträge verhindern und die Ausführung aussetzen. Eigenständige Liquidation ist nur mit ausdrücklich vorab autorisierten technischen Stop-Regeln zulässig; kein autonomer Strategiehandel.
- Protokolliert vollständige GPT-Entscheidung, beobachtete Marktbelege, technische Quotierung, virtuelle Umwandlung, Fill/Ablehnung und Gebühren unveränderlich. **Nur `PAPER_FILLED` zählt als ausgeführter Trade**.
- Speichert Erfahrungen und Outcomes lokal und/oder in den bereits vorgesehenen GitHub-Journalpfaden; gespeicherte Erfahrungen sind **Eingaben für spätere GPT-Entscheidungen**, keine eingebauten Bot-Heuristiken.
- Gibt dem GPT aktuelle Paper-Positionen und Ausführungsergebnisse zurück; keine privaten Wallet-/Zahlungsdetails in öffentlichen GitHub-Dateien.

## Verbindliche Reihenfolge vor produktivem 24/7-Paper-Handel
1. **Zuerst** 60-Tage-Memecoin-Blindtest abschließen: neutraler Pool aller zum jeweiligen Zeitpunkt entdeckbaren Coins; as-of Käufer, News, LP, Contract, Swapbarkeit und Ausführungskosten; GPT-Entscheidungen **vor** Kenntnis späterer Outcomes einfrieren.
2. Unvollständige historische Tage explizit `DATA_GAP` lassen; Kursmodell auf historischen Binance-Paaren ist **kein** GPT-Memecoin-DEX-Ergebnis.
3. Reproduzierbare historische GPT-Entscheidungsakte und realistisch ausführbare Paper-BUY/SELL-Modellierung für 60 Tage, inkl. 1–24 GPT-Scans pro Tag und Positionsentwicklung; unabhängige Periode für Strategietuning.
4. **Erst danach** die signierte GPT-Intent → Bot-Validierung → simulierte Swap-/Fill-Quittung → GPT-Exit → Outcome-/Lernjournal-Kette live im 24/7-**Paper**-Betrieb nachweisen.

**Sperre:** Kein Echtgeldhandel, keine zweite autonom handelnde Bot-/Dot-Strategie, keine fiktiven historischen Gewinne und keine Mutation des bestehenden lokalen Paper-Guthabens durch Research/Backtests.

Referenzen: `SNIPERBOT_R29_START_HERE.md`, `runner/gpt-paper-protocol.mjs`, `research/r29/operations/DAILY_RESEARCH_AND_LEARNING_PROTOCOL_DE.md`, `research/replay-120d-real/strict-60day-backtest-gate.mjs`.
