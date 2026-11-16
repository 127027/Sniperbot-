# Sniperbot R29 · Echtdaten-Backtest V2 – tatsächlicher Fortschritt

**Stand 16.11.2026** · Repo `127027/Sniperbot-` · Branch `codex/r29-chatgpt-github-paper-cycle-20261115`

## Ergebnis in einem Satz

Der Code kann nun **echte historische Solana-Swap-Ereignisse einschließlich fehlgeschlagener Transaktionen** lesen und über einen zeitlich gesperrten Forschungs-Sicherheitsfilter bewerten. **Eine vollständige 60-Tage-GPT-Kauf-/Halte-/Verkaufsperformance ist aber weiterhin nicht nachgewiesen.** Keine Wallet, kein aktuelles Paper-Konto, keine produktive GitHub-Order wurde durch dieses Research verändert.

## 1. Tatsächlich verfügbare historische Daten

| Quelle | Tatsächlich geprüfte historische Daten | Grenzen |
|---|---:|---|
| `loopholetape/pumpfun-launches` | 2.713.057 erfasste Solana-Tokenstarts, 67 Tage, 1.608 stündliche Quellen-Prüfpunkte | 53 Tage fehlen im 120-Tage-Fenster; keine historischen Einzel-Swap-Quotes |
| Binance Spot | 12 vollständige Kurshistorien und 34.956 echte 1h-Kerzen | Rückblickend bekannte Coins, keine unabhängige Entdeckung neuer DEX-Memecoins |
| Pump.fun Monatsstatistiken | 138 Tageszeilen | Rückblickende Tagesstatistiken; keine unverfälschten damals verfügbaren Einzel-Coin-Signale |
| GeckoTerminal PEPE DEX | 119 echte Tageskerzen eines Pools | Nur ein Pool, historische Sellability/Slippage fehlt |
| Öffentlicher Pump.fun/PumpSwap-Einzeltags-Datensatz | 15.10.2026: 100 von über 42 Mio. Ereignissen als echter, lesbarer API-Ausschnitt | **Nur die ersten 100 Datensätze, keine Zufallsstichprobe oder kompletter Tag** |

## 2. Neue reale Blockchain-Transaktionsprüfung: 15.10.2026

Die öffentliche Quelle `pumpdatafun/pump-fun-trades-sample` wurde über die kostenlose Hugging Face Datasets Server API **tatsächlich abgefragt**. Eine zuvor verschachtelt verarbeitete Schema-Sonderform wurde korrigiert:

- **100/100** Quelldatensätze erfolgreich mit Zeitstempel und Tokenadresse eingelesen.
- **31** unterschiedliche Tokenadressen innerhalb dieser **nicht repräsentativen Stichprobe**.
- **37** tatsächlich erfolgreiche Blockchain-Handelsereignisse.
- **63** fehlgeschlagene Transaktionen, die ausdrücklich **keine ausgeführten Trades** sind.
- Alle eingelesenen Ereignisse tragen in diesem Ausschnitt den Block-Zeitstempel `2026-10-15T00:00:00Z`.
- Rohe Antwort-SHA-256: `abe5a208232facf9f1df2a03e781a7408c0656c067f355fdec66bc449232b42f`.

**Wichtiger Befund:** Einige echte Pump.fun-Trades verwenden **keinen SOL-Quote-Token**. Bei solchen Daten ist `sol_lamports` trotz erfolgreichem Trade NULL. Der Parser bewahrt das tatsächliche alternative Quote-Asset und verbietet einen erfundenen USD-/SOL-Einstandspreis. Ebenso behalten fehlgeschlagene Swaps unbekannte Beträge als NULL, nicht 0.

`trade-sample-probe.mjs` validiert die Quelldaten und erstellt nur einen zeitlich zulässigen Beobachtungsrahmen. `trade-sample-probe.test.mjs` schützt gegen spätere Trades, falsche Erfolgsmeldungen und Multi-Quote-Fehlbewertungen.

[Erfolgreicher echter Sample-Abruf, inklusive sechs isolierter Regressionstests](https://github.com/127027/Sniperbot-/actions/runs/43912077855)

[Letzter kombinierter Source- und Security-Preflight-Test, insgesamt elf bestandene Tests](https://github.com/127027/Sniperbot-/actions/runs/43912667223)

[Verifiziertes kleines Quellenartefakt mit Checksumme und dem Sample-Ergebnis](https://github.com/127027/Sniperbot-/actions/runs/43912667223/artifacts/14247448450)

Originalquelle: https://huggingface.co/datasets/pumpdatafun/pump-fun-trades-sample

## 3. Historische BUY-Prüfung darf nichts erfinden

Neu hinzugefügt: `historical-evidence-gate.mjs`. Es verlangt **sechs unabhängige, datierte Nachweisarten**:

1. Eindeutige, damals bekannte Tokenidentität aus einem neutralen Token-Launch-Katalog.
2. Tatsächlich zum Entscheidungszeitpunkt dokumentierter Pool und Reserven.
3. Damalige Contract-/Mint-/Freeze-Sicherheitsprüfung.
4. Historisch belegte unabhängige Käufer/Wallet-Demand.
5. Unabhängig belegte bidirektionale Kauf- und Verkaufbarkeit.
6. Tatsächlich plausibel ausführbares historisches Preis-/Gebühren-/Slippage-Quote zum Zeitpunkt.

Evidenz nach dem virtuellen Zeitpunkt oder für einen anderen Token wird verworfen. Pools/Quotes älter als fünf Minuten werden zurückgewiesen. Fehlt irgendeine obligatorische Klasse, lautet der Status **`NO_ORDER_EVIDENCE_GAP`**.

**Achtung:** Dies ist ein **technischer Sicherheits-Vorfilter**, keine vom historischen GPT strategisch getroffene `NO_TRADE`-Entscheidung. Selbst bei bestandener Evidenz wird **nicht** automatisch ein BUY generiert: Es folgt erst die GPT-Entscheidung. Es wurden **keine echten historischen GPT-BUYs, -HOLDs oder -SELLs** als belegte Trades ausgegeben.

Die neuen Tests prüfen insbesondere zukünftige, falschen Token zugeordnete und veraltete Nachweise sowie fehlende Sellability.

## 4. Zusätzliche verifizierte Datenanbieter und Verfügbarkeit

| Anbieter | Historische Einzeldaten | Freie Teilmenge | Vollständige 60 Tage |
|---|---|---|---|
| `pumpdata.fun` | Swaps, Fehler, Kurven-/PumpSwap-Handelsdaten, später auch Ledger-Signaturen | Ja: **15.10.2026** mit über 42 Mio. Handels-/Fehlschlagsereignissen, großvolumige Parquet-Dateien | Laut Anbieter kostenpflichtiger vollständiger Monats-/Zeitraumexport, ab etwa **250 USD pro Monat** (Preisstand recherchiert am 16.11.2026) |
| `Bitquery` | Pump.fun-Swaps, Migrationen, per-Token-OHLCV | Öffentliche Beispieldateien | Vollständiger historischer Datensatz kostenpflichtig, zuletzt ab etwa **300 USD für den Monatsauszug** |
| `GeckoTerminal` | Vergangene Pool-OHLCV-Kerzen | Für einzelne bekannte Pools abrufbar | Kein automatisch bewiesenes neutrales Launch-Universum; keine rückwirkenden Sellability-/Swap-Quotes pro Coin |
| `Hugging Face loopholetape` | Tatsächliche neue Solana-Tokenstarts | 67 Tage kostenfrei | Keine eindeutigen historischen Einzel-Swap-Ein-/Ausgangsquotes; 53/120 Tage fehlen |
| `Binance` | Historische Stundenkurse etablierter Handelspaare | Öffentliche API | Nur rückblickend bekannte börsennotierte Paare, nicht frühe Pump.fun-Launches |

Offizielle Anbieterinformationen:
- https://pumpdata.fun/pump-fun-bulk-data
- https://huggingface.co/datasets/pumpdatafun/pump-fun-trades-sample
- https://www.bitquery.io/datastore/datasets/pumpfun
- https://huggingface.co/datasets/loopholetape/pumpfun-launches
- https://api.geckoterminal.com/docs/index.html

**Keine Kosten ausgelöst und keine Bezahlung autorisiert.**

## 5. Offener Unterschied zwischen Technik und echter Handelsstrategie

Bereits vorhandener Datenstand:
- **1.480** vollständige chronologische **Kurs-Algorithmus-Prüfzeitpunkte** (kein tatsächlicher GPT-Aufruf).
- 60-Tage-Preisvergleich mit modellierten BUY/SELL: konservativ 36 Käufe, dynamisch 30 Käufe; beide im Minus.
- Vollständiger historischer GPT-DEX-Replay mit realen individuellen Token-Daten, unabhängiger damaliger Sicherheit und ausführbaren Preisen: **nicht durchgeführt**.

Der neue kostenlose Einzeltag zeigt zwar reale Käufe, Verkäufe und Fehler aus dem damaligen Block, aber **100 frühe Datenbankzeilen ergeben weder einen vollständigen Token-Tagesverlauf noch ein belastbares 60-Tage-Portfolio**. Aus dem Sample eine vollständige Trade-Tabelle oder einen Gewinn zu konstruieren wäre falsch.

## 6. Technisch nächster zwingender Schritt

Für einen belastbaren Echt-GPT-Blindtest müssen wir nach und nach vollständige, historisch überprüfbare **Token- und Pool-spezifische Swapfolgen** sowie Zustandsdaten zum Zeitpunkt T beschaffen. Die kostenlose 15.10.-Stichprobe kann den Parser und das Fail-Closed-Risikoverhalten beweisen, aber noch keine historischen Coin-Exits.

Anschließend muss GPT für jeden versiegelten historischen Zeitpunkt **tatsächlich** das damalige Kandidatenpaket lesen, einen begründeten BUY/WATCH/HOLD/SELL/NO_TRADE-Entscheid erstellen, sein tatsächliches Modellaufrufdatum neben der virtuellen Uhr protokollieren und die Entscheidung in einem separaten Paper-Replay überprüfen. Ein heutiges Modell kann außerdem Vorwissen über die Zukunft haben; diese Unsicherheit muss gesondert dokumentiert werden.

**Bis dahin: nur Paper-Trading; Echtgeld nicht freigeben.**
