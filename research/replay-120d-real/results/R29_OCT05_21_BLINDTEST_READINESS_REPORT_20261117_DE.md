# R29 – Historischer Blindtest 05.–21. Oktober 2026: belegbares Zwischenergebnis

**Testphasen:** Vorbereitung 05.–11.10.2026 (UTC), gewünschte Paper-Handelstage 12.–21.10.2026 (UTC). **Startkapital:** 5.000 TEST-USDC, nur isolierter rechnerischer Referenzwert. **Keine Echtgeld- oder Benutzer-Paper-Kontoänderung.**

## Prüfstand 17. November 2026 – tatsächlicher GitHub-Actions-Lauf

- [Unabhängiger, vollständig bestandener Oktober-Replay](https://github.com/127027/Sniperbot-/actions/runs/44157627593). Der Lauf lädt das bereits vorher erzeugte unveränderliche neutrale Originaldaten-Artefakt `r29-real-43day-fresh5minute-candidates-no-fills-v2` aus GitHub-Actions-Run `44048309420`, Artefakt `14312891173`.
- Die Rohdaten sind mit Tagesdatei-SHA-256 auf den Datensatz-Commit `9b9a04e7e3e85775d614d16105daad2e69ce8544` festgelegt. Beim Replay werden nur zeitlich vor dem jeweiligen Checkpunkt beobachtete Datenfelder gelesen; bekannte Gewinnerlisten, Namen, spätere Höchstpreise, Rug- und Graduation-Outcomes sind ausgeschlossen.
- Der erste vollständige Source-Lauf `44157312238` bestand ebenfalls; der Folgelauf `44157627593` prüft zusätzlich: Änderungen an Daten eines zukünftigen Tages dürfen vorherige Modellfenster und Scanfrequenzen nicht beeinflussen.
- Das vollständige maschinenlesbare 10-Tage-Resultat, **alle 320 neutralen Mint-Adressen und deren Zeitstempel**, steht als GitHub-Actions-Output-Artefakt `r29-oct05-21-asof-source-only-trade-not-proven` beim obigen Lauf. Die Ausgabe umfasst **keine** vollständige 470.123-Token-Handelsinventur, sondern 40 zeitpunktbezogene neutral sortierte 8er-Stichproben.

## Quellenabdeckung, sauber getrennt von Handelsfähigkeit

| Kennzahl | Vorbereitung 05.–11.10. | Handelstage 12.–21.10. |
|---|---:|---:|
| Aufgezeichnete Tokenstarts, **nicht** geprüfte handelbare Memecoins | 351.726 | 470.123 |
| Tatsächliche zeitpunktbezogene Minuten-Merkmalszeilen | 939.433 | 1.357.033 |
| Technische vollständige UTC-Stundenframes | 168 | 240 |
| Nach vorherigen Daten als Forschungsplan gewählte Prüffenster | nur Warmup | 40 (4 täglich) |
| Verschiedene in 40 Prüffenstern beobachtete Solana-Mints | – | 320 |
| Tatsächlich historisch ausgeführte separate GPT-Modellaufrufe | 0 | 0 |
| Tatsächlich ausgeführte historische BUY-/SELL-Paper-Fills | 0 | 0 |
| Unabhängig nachgewiesene historische USDC-Quotes und Verkaufbarkeit | nein | nein |
| Historisch beweisbarer realisierter PnL | **unbekannt** | **unbekannt** |

Die 40 Prüffenster sind ein **vorab definierter, auf früheren Daten beruhender technischer Forschungsplan**, keine tatsächlich zu Oktoberzeiten ausgeführten 40 GPT-Modellaufrufe. Die bewusste Strategiebeschränkung aufgrund fehlender Handelsnachweise erzeugt `BLOCKED_DATA_GAP`; sie darf nicht als damals von GPT selbst entschiedener gewinnbringender `NO_TRADE` dargestellt werden.

## Handelstage – tagesgenaue geprüfte Abdeckung

| Datum 2026 | Roh-Tokenstarts | Minuten-Merkmalszeilen | Forschungsfenster | Neutrale Mint-Stichprobe | Handelsstatus |
|---|---:|---:|---:|---:|---|
| 12.10. | 49.568 | 137.969 | 4 | 32 | DATA_GAP, keine Fills |
| 13.10. | 42.638 | 134.864 | 4 | 32 | DATA_GAP, keine Fills |
| 14.10. | 41.600 | 131.532 | 4 | 32 | DATA_GAP, keine Fills |
| 15.10. | 46.421 | 140.939 | 4 | 32 | DATA_GAP, keine Fills |
| 16.10. | 49.822 | 138.180 | 4 | 32 | DATA_GAP, keine Fills |
| 17.10. | 44.819 | 126.184 | 4 | 32 | DATA_GAP, keine Fills |
| 18.10. | 43.316 | 129.480 | 4 | 32 | DATA_GAP, keine Fills |
| 19.10. | 52.196 | 148.404 | 4 | 32 | DATA_GAP, keine Fills |
| 20.10. | 50.857 | 136.502 | 4 | 32 | DATA_GAP, keine Fills |
| 21.10. | 48.886 | 132.979 | 4 | 32 | DATA_GAP, keine Fills |

Beispiel vom **12.10.2026, 06:00 UTC**: neutral beobachtete Solana-Mints `2ArGaCDifdQYddXoCebGapgZ59KrJZNKKHh4rqHjpump` und `2U5dtbWHNBkaRJUuXQHtCSck3tnZqb7sDzKMtgNkpump` stehen mit originalem Capture-Timestamp im Archiv. Das sind **keine Empfehlungen** und keine nachgewiesenen profitablen Coins.

## Technische Abnahme

1. **Historische Datenaufnahme → zeitlich abgesperrte Quellenselektion: BESTANDEN.** Alle 17 vorhandenen Source-Tage haben 24 Stundenframes; die 40 ausgewählten Prüffenster enthalten ausschließlich 0–300 Sekunden alte, vor dem Checkpunkt beobachtete Quellenkandidaten. Jeder Tag wird per Quellen-SHA-256 gegen die im Repository archivierten Tagesbelege geprüft. Datum, Vorlauf und UTC-Grenzen sind fest.
2. **Zukunfts- und Gewinnerlisten-Sperre: BESTANDEN für den technischen Replay-Input.** Kein späteres Gewinner-Label/ATH/Rug-Outcomes in Modellfenstern; Tests manipulieren spätere Tage und belegen, dass frühere Auswahl unverändert bleibt.
3. **Strategische GPT-Signale im historischen virtuellen Zeitpunkt: NICHT BESTANDEN / NICHT AUSGEFÜHRT.** Die Vorarbeit hat GPT-fähige Marktfenster erzeugt, aber noch keine 40 unabhängigen tatsächlich durch GPT getroffenen BUY/HOLD/SELL/NO_TRADE-Entscheidungen mit jeweils separatem Modellaufruf.
4. **Paper-Order-Protokoll: isolierte synthetische Offline-Tests bestanden.** Im selben Actions-Lauf wurden GPT-Paper-Bridge- und 50–5000-TEST-USDC-Budget-Vertragstests ausgeführt. Diese beweisen keine historischen Token-Fills im normal laufenden Windows-Bot.
5. **Ausführbare historische BUY- und SELL-Quotes: FEHLEN.** Eine reine Coin-Start-/Minutenmerkmal-Sammlung enthält keine für einen 50–5000-TEST-USDC-Einsatz nachgewiesene bidirektionale Handelbarkeit, LP-/Contract-Sicherheit oder tatsächlich realisierte Verkaufssummen. Ein historischer Gewinn kann deshalb nicht seriös berechnet werden.
6. **Kapital:** 5.000 TEST-USDC Startwert, 0 ausgeführte Orders in diesem isolierten Quellenlauf. Der rechnerische unveränderte Saldo ist 5.000 TEST-USDC, doch **dies ist kein nachgewiesener rentabler Handel und kein berechenbarer Strategierendite-Backtest.** Der echte Benutzer-Paper-Ledger blieb unberührt.

## Wesentliche historische Provenienzeinschränkung

Der aufgezeichnete Quell-Datensatz wurde nach den Oktober-Handelstagen in der festgelegten Fassung veröffentlicht. Er hat historische Capture-/Event-Zeitstempel, aber die zeitgleiche Auslieferung dieser konkreten Daten an einen damaligen handelnden GPT-Bot ist NICHT unabhängig nachgewiesen. Der Test ist daher ein sauber gegateter retrospektiver Source-Replay und **noch kein strenger full-stack Blind-PnL-Test**. Die 40 bekannten Gewinner des Nutzers sind NICHT Testkandidaten und wurden bei der neutralen Auswahl NICHT verwendet.

## Nächster tatsächlich notwendiger Schritt

Für einen **vollständigen** ehrlichen 10-Tage-Blindtest müssen unabhängige ursprüngliche Swap-/Pool-/LP-/Holder-Belege mit as-of-Zustellzeiten auf Coin-Ebene verfügbar werden, außerdem belastbare 50–5000-TEST-USDC-Kauf-/Verkaufsquotes und Slippage, pro Checkpunkt getrennte GPT-Modellentscheidungen und ein abgekoppelter lokaler Paper-Fill-Executor. Keine Trades bzw. Erträge behaupten, bis diese Belege vorhanden sind. Danach dieselben zehn Tage **ohne nachträgliches Policy-Tuning** durchlaufen; die bisherigen Replay-Ausgaben unverändert als Ausgangspunkt behalten.

**Einzige erlaubte Aussage:** historische Source- und Paper-Protokoll-Komponenten sind prüfbar; historische 10-Tage-GPT-PnL und tatsächliche Memecoin-Gewinner-Erkennung werden von diesem Versuch **nicht** bewiesen.
