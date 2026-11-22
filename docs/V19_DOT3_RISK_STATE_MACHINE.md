# R29 V1.9 – Dot 3: Einheitliche Risikostatuslogik (D3-01)

**Stand:** 22.11.2026. Repository `127027/Sniperbot-`, ausschließlich Branch `codex/r29-cleanroom-paper-20261121`. Alle fünf ChatGPT-Dot-Automationen bleiben **pausiert**, kein Echtgeld, kein `main` oder Windows-Paper-Kontozugriff.

## 1. Ziel und Geltungsbereich

**Ein System.** Live-Paper und historischer As-of-Replay verwenden die identischen Statusfunktionen in `src/v19-dot3-risk-status.mjs`. Die Zeitquelle und Marktinputs unterscheiden sich, nicht die Klassifikationsregeln. Der gemeinsame Dot4-BUY/HOLD/SELL-Kern bleibt `src/unified-decision-v18.mjs`; die Dot3-Statusprüfung ist **kein zweiter Trading-Bot**.

## 2. Verbindliche Status- und Aktionsmatrix

| Status | Bedeutung | Erforderliche Folgeaktion | Kauf autorisiert? |
|---|---|---|---|
| `DISCOVERED` | Pool aufgenommen, aber Pool-/Chain-Identität noch nicht ausreichend | Identität prüfen | Nein |
| `DATA_GAP` | Contract-/Timestamp-/Provider-/Attestierungsnachweis fehlt oder ist veraltet | Fehlenden Nachweis gezielt nachfordern; nicht endgültig aussortieren | Nein |
| `WATCH` | Auffällige Differenz, schwache Liquidität oder andere vorläufige Risikoindizien | Quoten und Liquidität wiederholen; Security-/Sellability-Check nachfordern | Nein |
| `REJECTED` | Schweres Risiko tatsächlich nachgewiesen | Beleg und Ablehnungsgrund unveränderlich dokumentieren | Nein |
| `PAPER_ELIGIBLE` | Alle Voraussetzungen erfüllt – bislang **nur simulierte positive Regression**, nicht unabhängige Echtheitsbestätigung | Separaten authentifizierten Publisher-/Paper-Core-Prüfweg durchlaufen | **Auch hier zunächst nein** |

**Unterschied zwischen dem getesteten Modellpfad und tatsächlicher Freigabe:** Die Funktion kann in `SYNTHETIC_REGRESSION_ONLY` bei einem vollständigen, strukturell gültigen Fixture den Modellstatus `PAPER_ELIGIBLE` erreichen. Sie gibt dabei ausnahmslos `trade_authorized:false`, `paper_filled:false`, `issuer_authentication_verified:false` zurück. **Bei `LIVE_PAPER` und `HISTORICAL_ASOF`** genügt derselbe selbst behauptete Datensatz nicht: Der Status bleibt `DATA_GAP`, solange externe Quelle und signierender Dot3-Akteur nicht tatsächlich unabhängig bestätigt wurden. Der real positive Dot3-Pfad ist weiterhin bei **D3-04**, Quellfähigkeit bei **D3-02/D3-03** und Sellability bei **D3-05** offen.

Eine `verified:true`-Behauptung, Quellen-Hash-Zeichenfolge oder zwei übereinstimmende Webseiten begründen keine tatsächliche Kaufberechtigung. Die bestehende `src/risk-authorization-v18.mjs` prüft Struktur, nicht Quellenwahrheit.

## 3. Ein einziger Risikostatus-Entscheider

- **Live-Paper:** `scripts/cloud-discovery-runner.mjs` liest den bestehenden `src/feed-handoff.mjs`-Output und erzeugt `dot3-research-risk-status-preview.json`. Das ist eine **read-only** Einstufung; es werden weder Risk-Orders noch Paper-Receipts erzeugt.
- **Nachprüfung:** `src/v19-dot3-recheck-scheduler.mjs` nutzt **denselben** `assessDot3RiskStatus()` und ergänzt pro Coin `missing_fields`, `next_action`, `next_recheck_at_utc` und HTTP-429-Wiederholung. Dadurch widersprechen sich Recheck-Status und Live-Vorschau nicht.
- **Backtest:** `src/v18-requested-backtest.mjs` nutzt denselben `summarizeDot3RiskStatuses()` für **optionale, zeitgerechte** `dot3_risk_handoffs`. Verspätete Handoffs werden abgewiesen. Diese Importdaten bleiben unbestätigte Forschungsevidenz, sie erhöhen weder tatsächlich gelaufene GPT-Dots noch echte Handelszahlen.

## 4. Reales archiviertes Beispiel vom 22.11.2026

`research/feeds/2026-11-22/45002280249/dot2-to-dot3-handoff.json` enthält zwei Ethereum-Pools: **Bigfoot** und **Mfer**. In diesem Handoff fallen die hohen Preisabweichungen zweier Anbieter (über 100%) und die sehr kleinen Liquiditäten auf. Security/Sellability und Anbieterquotezeiten sind nicht unabhängig nachgewiesen.

Neue Klassifikation: **2 × `WATCH`**, **0 × bestätigtes `REJECTED`**, **0 × tatsächlich `PAPER_ELIGIBLE`**, **0 echte Orders**. Beide Pools bleiben in der Recheck-Warteschlange, die API-/Security-Nachprüfungen sind noch **nicht** ausgeführt. Dies behauptet **keine** Erholungschance oder Handelsqualität.

## 5. Gezielte Regression und Grenzen

- `test/v19-dot3-risk-status.test.mjs`: positive vollständige **synthetische** Risikokette, echte LIVE/HISTORICAL-Sperre, Quotezeit-/Liquiditätsfehler, Future-/Oracle-Quarantäne und reales archiviertes Handoff.
- `test/v19-dot3-recheck-scheduler.test.mjs`: gemeinsame `WATCH`-Klassifikation mit dem Recheck-Plan, 429-Cooldown und kein Fake-Fill.
- `test/v19-dot3-live-replay-consistency.test.mjs`: gleiche Status-/Begründungsklassifikation bei Live und Backtest, Zurückweisung späterer Risk-Handoffs.

**Gezielte direkte Funktionskontrollen:** 12/12 auf positive/negative Riskzustände, 10/10 auf gemeinsame Live-/Replay-/Queue-Integration. Neue Node-Regressionen sind auf GitHub gespeichert; eine vollständige `npm test`-/GitHub-Actions-Abnahme wurde **nicht** ausgeführt und bleibt QA-06.

## 6. Nächste Abhängigkeiten

1. **D3-02/03:** unabhängige Provider-Fähigkeit, verifizierte Aktualität der Quotes, authentische Providerzeiten und erlaubte indikative Research-Quote.
2. **D3-04:** tatsächliche Byte- und Issuer-Authentizität der Dot3-Risikobelege, TTL, GitHub-Veröffentlichungs-/Lesepfad.
3. **D3-05:** chain-spezifische Sellability-/Tax-/Honeypot-/Routing-Nachweise.
4. **D3-07:** echte Datennachprüfungen durchführen und deren `DATA_GAP → WATCH → ...`-Verlauf samt P95 und Zeit bis zur Risikoprüfung messen.
5. **QA-06:** komplette Node-/Actions-Ausführung belegen, bevor die Pipeline als end-to-end-funktionsfähig gilt.

**Niemals** durch eine bloße Testfreigabe die fünf Dots reaktivieren, eine echte Wallet anschließen, eine Order veröffentlichen oder das vorhandene Windows-Testguthaben verändern.
