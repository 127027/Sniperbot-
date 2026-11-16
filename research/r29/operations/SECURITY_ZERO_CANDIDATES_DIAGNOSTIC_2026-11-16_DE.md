# R29 – Warum bisher keine unabhängig geprüften EVM-Paperkandidaten durchkommen

**Stand:** 16.11.2026 (GitHub-Forschungsstand, nicht automatisch installierte Laptopversion)  
**Modus:** PAPER_ONLY · **keine neue Order**, keine Veränderung am Paper-Guthaben.

## Bestandsaufnahme der vorhandenen öffentlichen Quellen

Aus `research/r29/channel/dynamic-research-review.json`:
- Letzter beobachteter Research-Zeitpunkt `2026-11-16T16:56:47.536Z`.
- **12 erfasste öffentliche Stichproben**, darunter **10 Forschungsbeobachtungen und 2 explizite Test-/Kontrollfälle**. Dieser gesamte Satz ist unverändert archiviert unter `research/r29/operations/candidate-watch/snapshots/2026-11-16/20261116T165647536Z-69938eedf12bd93b.json`.
- **Alle zehn** echten Beobachtungen meldeten Contract-Sicherheit und Sellability noch **UNKNOWN**; daraus darf kein BUY abgeleitet werden.
- Auffällige Stichprobe: mindestens ein ETH-Pool hatte nur ca. **0,0248 USD beobachtete Liquidität** bei zugleich mehr als 3.800 USD 5-Minuten-Volumen. Solche Messungen dürfen nicht mit „gut handelbar“ verwechselt werden.

Aus `research/r29/channel/gpt-paper-security.json`:
- `candidate_check_count:0`, `status:DATA_GAP_NO_MATCHING_FRESH_EVM_CANDIDATE`.
- Das **bedeutet nur**, dass in diesem Lauf keine unabhängig passende und frische EVM-Rechercheprüfung zustande kam; NICHT, dass alle Memecoins gefährlich sind oder GPT schon einen historischen Kauf abgelehnt hätte.
- Die öffentliche GitHub-Datei enthält bisher keine detaillierte Ursache für die lokale Selektionslücke.

## Neuer konkreter Diagnose-Patch

In `runner/gpt-paper-security-research.mjs` wurden **nur lesende Diagnosen** ergänzt, ohne irgendetwas an BUY-/Wallet-/Geld-Limits zu lockern:

1. `explainSecurityResearchSelection()` zählt die lokalen beobachteten Poolzeilen und nur EVM-Pools.
2. Es klassifiziert die erste abgelehnte Selektionsstufe jedes Kandidaten: falsche Token-/Pool-Adresse, kein neutraler GeckoTerminal-New-Pool, kein **identischer unabhängiger DEX-Screener-Pair-Check**, Promotion, zu alter Pool, weniger als 20.000 USD Liquidität, weniger als 1.000 USD 5-Minuten-Volumen oder mehr als doppelt so viel 5-Minuten-Volumen wie Liquidität.
3. `local_market_read_status` unterscheidet den **fehlenden**, **ungültigen**, **zu großen**, **veralteten** oder korrekt gelesenen lokalen Marktsnapshot. Es werden nur kontrollierte Statuscodes ausgegeben, niemals Datei-/Wallet-Pfade oder Schlüssel.
4. `selection_diagnostic` ist **nur Diagnose** und hat keinerlei BUY-, SELL-, Risiko- oder Paper-Order-Berechtigung.

Der Selektionsprozess verlangt weiterhin exakte, unabhängige Identität und maximal zwei kostenlose Sicherheitschecks pro Stunde. Selbst wenn ein EVM-Sicherheitscheck positive Contract-/Honeypot-Indikatoren liefert, bleiben organische Käufer, LP-Rückholbarkeit, Pool-Tiefe und wirklich ausführbare Kauf-/Verkaufsquotes gesonderte Pflichtbeweise.

## Was noch verifiziert werden muss

1. GitHub-Code ist aktualisiert und mit isolierten Tests geprüft; er ist **nicht dadurch automatisch auf dem laufenden Windows-Laptop installiert**.
2. Nach dem Übernehmen der neuen R29-Version und kontrolliertem Neustart **ohne Guthaben-Reset** prüfen, ob `gpt-paper-security.json` die neuen Diagnosefelder enthält, und die tatsächlich belegten Kategorien auswerten.
3. Danach pro Stufe Ursachen gezielt beseitigen, **nicht** nur Schwellen heruntersetzen. Wenn der local 2-Minuten-Marktfeed ausfällt, zuerst Source-/Netz-/Zeitfehler beheben.
4. Bei erstmals unabhängig geeignetem Kandidaten vollständige Wallet-/Contract-/LP-/Sellability-/Slippage-Recherche nachziehen. Nur ein tatsächlich frischer, freigegebener GPT-Paper-BUY gefolgt von einem **PAPER_FILLED**-Receipt darf als erfolgreicher virtueller Kauf gelten. Verkauf genauso.
5. Weiterhin alle abgelehnten WATCH-/Research-Kandidaten im append-only Journal behalten und später mit belegbaren gleichen Marktquellen vergleichen.

**Noch nicht belegt:** Tatsächlich füllbare Memecoin-DEX-GPT-Kauf-/Verkaufsserie über 60 historische Handelstage oder ein profitsicherer Live-Bot.

**Echtgeld ausdrücklich gesperrt.**
