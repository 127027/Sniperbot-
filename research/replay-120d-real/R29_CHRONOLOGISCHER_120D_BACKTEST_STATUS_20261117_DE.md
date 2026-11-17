# R29 – 120-Tage-GPT-Walkforward: aktueller Implementierungs- und Quellenstand

**Datum:** 17.11.2026. **Nur Forschung / PAPER_ONLY; keine echten Transaktionen und keine neuen historischen PnL-Behauptungen.**

## Nutzeranforderung und genaue Zeitfolge

**Zentrum ist GPT, nicht der Bot.** 120 historische Tage werden chronologisch vom ältesten zum jüngsten betrachtet, ohne spätere Ereignisse oder später veröffentlichte Informationen vorwegzunehmen. Die Phase 20.07.–17.09.2026 (Tag 120 bis 61) dient dem historischen Lernen. Die Phase 18.09.–16.11.2026 (Tag 60 bis 1) soll mit demselben Gedächtnis, aber zunächst **eingefrorener, vorab dokumentierter Trading-Policy** realistische BUY→HOLD→SELL-/NO_TRADE-Entscheidungen und Kapitalentwicklung liefern. Auch Nichtkäufe, zu früher/später Ausstieg und zu langes Halten müssen im Outcome-Journal stehen. Dazwischen tägliche 1/4/12/24 GPT-Full-Scans, bei jeder Stunde neue Situationsprüfung; die Stundenfrequenz kann am selben Tag von 4 auf 24 steigen.

## Auf GitHub tatsächlich umgesetzt und getestet

- `research/replay-120d-real/chronological-120d-controller.mjs`: chronologische 120-Tage-Kalenderkontrolle; as-of-/Publikationszeitkontrolle; Revisionsfähigkeit von 1/4/12/24; GPT-Transkript-Hashschutz mit **tatsächlichem** Modelllaufzeitpunkt; Proof-Gate für rekonstruierte BUY-/SELL-Fills; Outcome-/Erfahrungsereignisse erst **nach** ihrem tatsächlichen Offenlegungszeitpunkt; Quellenabgleich über 120 historische Tage. Der Code enthält **keine** eigene Tradingstrategie und ruft kein Modell auf.
- `research/replay-120d-real/chronological-120d-controller.test.mjs`: sieben unabhängige Regressionstests.
- `runner/gpt-paper-capacity-report.mjs`: **rein lokale, private** technische Kapazitätsantwort des Executors, 50 bis max. 5.000 TEST-USDC, begrenzt durch freie Mittel, reservierte Positionen und technische Limits. Beispiel: 4.999 frei → Antwort `50–4999`. Euro-Guthaben wird **nicht** fälschlich 1:1 als USDC gezählt. **Noch keine** private, authentifizierte GPT-Rücktransportstrecke, daher keine Behauptung, GPT könne schon den aktuellen lokalen Betrag empfangen.
- `runner/gpt-paper-capacity-report.test.mjs`: vier weitere Regressionstests.
- `.github/workflows/r29-120day-chronological-proof.yml`: Test der zwei Module und täglicher 120-Tage-Abdeckungsnachweis. **Erfolgreicher Lauf:** https://github.com/127027/Sniperbot-/actions/runs/44044451031 (insgesamt **11/11 Tests bestanden**). **Original-Artefakt:** https://github.com/127027/Sniperbot-/actions/runs/44044451031/artifacts/14311730558 .
- Dauerhaft archivierte **alle 120 Tageszeilen**: `research/replay-120d-real/results/R29_120D_GPT_WALKFORWARD_SOURCE_READINESS_20261117.csv`, abgeleitet aus den zwei vorhandenen unveränderten SHA-bewiesenen 120d-Launch-/60d-Holdout-Matrizen.
- Erfahrungs-/Methodenakte: `research/r29/gpt-strategy/experiences/2026-11-17/120d-chronologisches-gedaechtnis-und-executor-vertrag-v2.md`.

### Quelleabdeckung – KEINE Performance

| Bereich | Quellenbeleg |
|---|---:|
| **Train** 60 Kalendertage, 20.07.–17.09. | 18 Tage neutral erfasste historische Solana-Launch-Identitäten, **42 Trainingstage ohne diese Quelle** |
| Train – historisch zeitgerechte Minuten-/Wallet-/Contract-/DEX-Signale über den ganzen Tag | **0/60 vollständig nachgewiesen** |
| **Holdout** 60 Kalendertage, 18.09.–16.11. | 49 Tage Launch-Identitäten |
| Holdout – Solana-Minutenfeatures | **43/60** |
| Holdout – vollständig archivierte Drittwallet-DEX-Swaps für ein neutrales Sample | **1/60** |
| Vollständig belegte damalige GPT-BUY→HOLD→SELL-Ausführungs-/PnL-Tage | **0/60** |
| Valider Gewinn/Verlust der neuen GPT-Memecoin-Strategie | **UNKNOWN**, keine 0-USDC-Behauptung |

**Wesentliche Quellen- und Hindsight-Falle:** Der Datenanbieter hat viele historischen Events erst am 12.11.2026 veröffentlicht. Für die strenge historische Entscheidung zählt sowohl `event_at_utc` als auch `published_at_utc` und das belegte `was_available_asof_utc`. Heute rekonstruierte historische Daten dürfen zur Forschung verwendet werden, aber nicht als damals tatsächlich GPT-verfügbare Information ausgegeben werden, wenn das nicht belegbar ist.

## Nächste vollständige Tradingvalidierung – bisherige echte Lücke

Ein komplettes 60-Tage-GPT-Handelsjournal müsste für jeden Scantag unter anderem archivieren: `virtual_asof`, tatsächlich heute verfasstes GPT-Transkript und SHA, gelesene nur bis dahin verfügbare Erfahrungsakten, neutrale Kandidaten, Sicherheitsnachweise, aktuelle technische Broker-/Executor-Kapazität, BUY/HOLD/SELL/NO_TRADE und deren echten Kosten, offene Positionen, verfügbare Kosten-/Swap-Quotes, Receipt/Fills und späteres separat veröffentlichtes Ergebnis. Noch **nicht** vorhanden. Dass Code solche Einträge validieren kann, bedeutet nicht, dass diese Handelsdaten schon vorliegen.

Für exekutionsnahe DEX-Daten sind verifiziert öffentlich dokumentiert:
- Dune `dex_solana.trades`: historische transaktionsbasierte Solana-DEX-Swaps und Token-/Vault-/Fee-Felder, https://dune.com/data/dex_solana.trades (Zugriff/Kosten/Abfragebudget separat zu prüfen; Swap-Print allein beweist nicht die eigene Poolquote).
- Pumpdata Bulk Trade History: https://pumpdata.fun/pricing ; genannte Preise ab **$250 pro historischem Datenmonat**, inkl. gelandeter und fehlgeschlagener Trades; keine Bestellung durch uns.
- Bitquery Solana DEX/Pumpfun: https://bitquery.io/datastore/datasets/solana-dex-all ; Beispiel kommerzielle Last-6-Months-Handels-/Pool-Historie, nicht als kostenlose Komplettarchivquelle verbuchen.

**Wichtig:** Preise, Lieferumfang und API-Verfügbarkeit sind externe, sich ändernde Anbieterangaben. Datenkäufe erfordern gesonderte ausdrückliche Nutzerfreigabe. Keine fiktiven Trades aus durch Jahre getrennten Beispielen.

## Lern-/Risikokorrekturen

Wichtigste neue technische Risikofeststellung: `runner/portfolio-budget.mjs` addiert vorhandene `cashUsdc` und `cashEur`. Ohne dokumentierte FX-Umrechnung darf ein GPT-Kapazitäts-Protokoll dies nicht als USDC interpretieren. Die NEUE private Kapazitätsmeldung sperrt Eurobestände konservativ, bis sie unabhängig in ein USDC-Testguthaben umgewandelt/verbucht wurden. Die bestehende produktive lokale Budgetberechnung wurde **nicht** ohne vollständige Regression geändert. Das ist ein klarer Schutzpunkt für den späteren lokalen Ausführungsadapter.

Für das laufende Offline-Projekt gilt: **No BUY before verified 60-day backtest**, keine Veränderung des existierenden lokalen Paper-Ledgers, keine Wallet-Transaktion. Der Wunsch nach späterer PayPal-Ein-/Auszahlung ist als **separates zukünftiges Echtgeld-/Onramp-Projekt** notiert; weder PayPal-Zahlungsfähigkeit noch reale Orderausführung wird durch diesen Backtest impliziert.

## Status

**120-day timeline/time-/evidence-/risk-safety preflight: PASSED (11/11 Tests).**
**120-day chronological GPT model + historical executable 60-day trading PnL: NOT COMPLETED.**

Die einzige bereits aktive stündliche R29-Automation führt die Backtest-Forschung eigenständig weiter. Keine zweite Automation und keine automatischen Live-Trades.
