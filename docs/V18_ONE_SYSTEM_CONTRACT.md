# R29 V1.8 – EIN System, fünf Dots, zwei Zeitmodi

**Gültigkeit:** `127027/Sniperbot-`, nur Branch `codex/r29-cleanroom-paper-20261121`. Nur PAPER, keine Echtgeld-Transaktionen, kein `main` oder Legacy-Runner. Stand: 22.11.2026.

## Zwingender gemeinsamer Vertrag
Es gibt **keine eigenständige Backtest-Handelsstrategie**. Die zeitlich begrenzte Entscheidung ist für Live-Paper-Forschung und historischen As-of-Replay identisch:

| Funktion | EIN gemeinsamer Code | Live-Paper-Seite | Backtest-Seite |
|---|---|---|---|
| Dot1 4/8/12/24 | `src/cadence.mjs` | Tatsächlich beobachtete Aktivitätsfenster | Nur Aktivitäten vor virtuellem `as_of_utc` |
| Dot2 Discovery | `src/live-pool-discovery.mjs`, `src/market-memory.mjs`, `src/discovery-fair-queue.mjs` | Gegenwärtig erfasste Originalbeobachtungen | Identische zuvor tatsächlich verfügbare Beobachtungsobjekte |
| Dot3 Risk-/Quote-Check | `src/v18-shared-evidence-gate.mjs` und `src/core.mjs` | Gleiche Point-in-Time-Mindestgates | Gleiche Point-in-Time-Mindestgates |
| Dot4 Signal | **`src/unified-decision-v18.mjs`** | `src/v18-dot4-live-decision.mjs` | `src/point-in-time-strategy.mjs` |
| Exit-Beobachtung | **`decideUnifiedMarket`** | `src/protective-exit.mjs` Shadow mit selben SELL-Schwellen | `src/point-in-time-strategy.mjs`, auch zwischen Vollreviews |
| Dot5 QA | Quellenjournal, Event-/Order-/Receipt-Prüfungen | Tatsächliche Live-Paper-Ereignisse | Zeitgerechte Replay-Entscheidungen und erst *nachher* freigegebene Outcome-Labels |

Unterschied ist allein **Zeit-/Beobachtungsquelle**: `LIVE_PAPER` verwendet aktuelle tatsächlich vorliegende Quellen; `HISTORICAL_ASOF` verwendet ausschließlich zum virtuellen Datum nachweislich vorhandene Informationen. Gleiche Daten → gleiche deterministische Dot4-BUY/HOLD/SELL/WATCH-Regel. Die Dots werden **nicht** durch zusätzliche unabhängige Trading-Bots oder vier historische PnL-Forschungsstrategien ersetzt.

### Ablauf eines virtuellen oder heutigen 09:30/10:30-Takts
1. Dot2 entdeckt auch unvollständige/reanimierte Coins und **bewahrt** sie: Discovery und BUY-Zulässigkeit sind verschieden.
2. Dot3 klassifiziert verifizierte Risiken, `DATA_GAP` und `WATCH` einzeln. Nur für einen möglichen PAPER-BUY/Sell-Receipt müssen authentische Identität, aktuelle glaubhafte Quotes und realistischer Ausführungspreis bestehen.
3. Dot1 entscheidet anhand bis `as_of_utc` bekannter Aktivität über 4/8/12/24 Vollanalysen. Bereits Scan 1 kann auf 24 springen. Marktbeobachtung und Exit-Prüfung sind nicht durch diese Vollanalyse-Zahl begrenzt.
4. Dot4 verarbeitet alle Informationen aus dem **gleichen** Quellen- und Risikogate sowie `decideUnifiedMarket()`. Bei positivem vorherigem Momentum (Startwert 5%) ist auf dem ersten fälligen Review ein BUY möglich. Offene Positionen werden unabhängig vom Vollreview auf SELL/HOLD geprüft. Start-Schutzschwellen: −10%/+20%, nach **tatsächlich realisiertem Verlust** 60 min Reentry-Cooldown; nicht von Gewinnernamen abhängig. Diese Anfangswerte sind keine nachgewiesene optimale Strategie.
5. Dot4 darf ergänzende GPT-Prognosen nach 1/3/6 Stunden nur aus bis `as_of_utc` bekannten Inputs abgeben. `src/forecast-calibration-v18.mjs` ist derselbe zeitlich gesperrte Forschungsbaustein. Nicht kalibrierte Wahrscheinlichkeiten = `null`. Wenn eine echte autonome GPT-Entscheidung historisch nicht aufgezeichnet wurde, darf der Backtest keinen identischen GPT-Entscheider behaupten.
6. Dot5 prüft unabhängig Quellendeckung, falsche WATCH-/BUY-Signale, Exit-Lücken, Verluste, tatsächliche published PAPER-Orders und getrennte Client-Receipts. Labels/Oracle erst nach Ablauf der entsprechenden 1/3/6 Stunden auflösen.

### Verhältnismäßige Sicherheitsgrenzen
- **Keine Filterung vor Discovery:** Fehlende Riskdaten = `WATCH/DATA_GAP` und erneute Prüfung, kein stiller Verlust aus der Kandidatenqueue.
- **PAPER_INDICATIVE:** Zwei tatsächlich zuvor erfasste, voneinander unabhängige Poolseiten mit genau gleichem Chain/Contract/Pool und überprüfter Aktualität dürfen Forschungs-PAPER-Signale erzeugen. Fehlende eigene Anbieter-Kurszeit darf mit explizit `quote_quality:'INDICATIVE_WEB_ONLY'` und `provider_time_unknown_acknowledged:true` als Unsicherheit bezeichnet werden, **niemals** als belegte Anbieterzeit oder ausführbarer Echtgeldpreis.
- Ein tatsächliches `PAPER_FILLED` benötigt die im gemeinsamen Paper-Core vorgesehene gültige Order, realistische Quote-/Liquiditätsrechnung und authentifizierbaren Receipt. Eine structurally gültige Dot3-SHA-Behauptung allein authentifiziert keinen echten Quellen- oder Sicherheitsbeleg. Der neue V1.8-Shadow-Risk-Preflight bleibt bis zur vollständigen Prüfung nicht-autorisierend.
- Kein falscher Stop-Preis: Der Schutzverkaufs-Shadow nutzt die **gleiche SELL-Signalregel** wie Replay/Dot4; Schätzwerte nutzen konservativere Kursannahmen und zählen nie als ausgeführte Verkäufe. Unverkäuflichkeit ist nicht einfach ein erledigter Stop-Loss.

### Zwei Bezeichnungen, kein zweiter Trading-Algorithmus
`node scripts/v18-dot4-decision.mjs --input <snapshot.json>` verwendet dieselbe Dot4-Eingabe für `LIVE_PAPER` bzw. `HISTORICAL_ASOF`; beide sind aktuell **read-only Entscheidungsvorschauen**, keine Order-Publisher.

`node scripts/v18-backtest-on-demand.mjs --date YYYY-MM-DD --input <asof-input.json>` verwendet den gleichen Common-Dot4-Signal-Kernel, das gleiche gemeinsame Quell-/Risk-Gate und `src/core.mjs` für getrennte Modell-Fills; niemals Kontodaten überschreiben oder echte Orders publizieren. Ohne geeignete historische Inputs = DATA_GAP, nicht 0% Trefferquote.

Der optionale `--training-reference` mit sechs rückblickend ausgewählten Pools und vier älteren Presets ist ausdrücklich **nur alte retrospektive Diagnosereferenz**, KEINE alternative aktive Dot4-Strategie, kein unabhängiger Holdout und kein Nachweis echter Oktober-Paper-Fills.

## Pausierte Automationen und Live-Entwicklungsziel
Alle fünf vorhandenen R29-ChatGPT-Automationen bleiben deaktiviert. Ihr gespeicherter Prompt muss diesen Vertragsstand ebenfalls enthalten; die Rollen dürfen vor einer späteren Freigabe keinen eigenständigen Backtest-Algorithmus erfinden. Das Pausieren hindert das Aktualisieren gespeicherter Prompts nicht.

Solange pausiert, können die On-Demand-CLI-Tools **deterministische** Rollen- und Kauf-/Verkaufsentscheidungen testen; sie ersetzen nicht die tatsächliche historische Ausführung von fünf selbstständig arbeitenden GPT-Dots. Für echte GPT-Historienläufe wären separat kontrollierte, zeitlich eingeschränkte Dot-Ausführungen erforderlich. Nicht so tun, als sei dies bereits erreicht.

## Offene Abnahmen
- GitHub-Actions-`npm test` / lokale volle Node-Suite: tatsächliche Lauf-/CI-Artefakte müssen noch vorliegen.
- Ursprünglich vollständiger, nicht nach späteren Gewinnern ausgewählter Oktober-12-Marktindex: fehlt; die sechs bekannten Tapes dienen nur retrospektiver Forschung.
- Windows-Runner verwendet noch alte signierte GitHub-Orders und wurde nicht an einen aktivierten autonomen V1.8-Schutzhandel angeschlossen; weiterhin kein Live-Handel durch neue Shadow-Module.
- Unveränderliche, externe Original-Risk-SHAs und tatsächliche Sellability-/Liquiditätsprüfung für End-to-End-Fills sind noch nicht vollständig nachgewiesen.
- Holdout mit vorher festgelegtem Zeitpunkt und negativen Kontrollcoins ist offen; bekannte historische +1000%-Gewinner dürfen nicht als Scan-Input verwendet werden.

**Freigabekriterien:** gleiche normalisierte Daten → identische Entscheidung in LIVE_PAPER/HISTORICAL_ASOF; keine Zukunftsinformation; Discovery darf auch mit DATA_GAP weiterlaufen; kein Fake-Fill; keine automatische Echtgeldtransaktion; fünf Dot-Anweisungen und GitHub-Version synchron.
