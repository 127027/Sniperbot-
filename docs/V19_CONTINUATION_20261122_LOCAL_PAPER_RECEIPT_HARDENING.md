# R29 V1.9 – Chat-Fortsetzung: lokale Paper-Receipt-Abnahme gehärtet

**Stand:** 22.11.2026, 21:18 UTC · **Repository:** `127027/Sniperbot-` · **ausschließlich Branch:** `codex/r29-cleanroom-paper-20261121`

## Anlass und Änderung

Nach Abbruch der vorherigen Chat-Verbindung wurde der Original-Soll-/Ist-Stand anhand des echten Cleanroom-Branches, der 61 Originalkriterien, des 48-Restpunkte-Registers und der erfolgreichen GitHub-CI neu abgeglichen. Keine Annahmen aus dem alten Legacy-Bot.

Vier aufeinanderfolgende Code-/Test-Commits, alle ausschließlich im Cleanroom-Branch:

1. [`d07df0c`](https://github.com/127027/Sniperbot-/commit/d07df0c053292a624c3bffe802a01c0ce64cf7bf): `src/v19-local-client-readonly-proof.mjs` prüft zusätzlich Original-Processed-Zeit gegen Receipt-Zeit, Sequenz-Chronologie, Event-Market-Key, Event-PnL, Gebühren/Quantity/Execution-Price-Arithmetik und Open-Lot-Einstand/Uhrzeit. Manipulierte lokale Modell-Datensätze werden als Blocker sichtbar; Quelle bleibt ausdrücklich *user-supplied* und nicht selbstbeglaubigt.
2. [`6aa44e1`](https://github.com/127027/Sniperbot-/commit/6aa44e1f6c2ec0a94287c1e63f2755cdf6bc73a1): drei neue Regressionstests für manipulierte Processed-/Event-/Lot-Daten, falsche BUY-/SELL-Gebühren und umgekehrte Fill-Zeitfolge.
3. [`27a136b`](https://github.com/127027/Sniperbot-/commit/27a136b9b51b31d9ff44ada1db4a23e38453524e): `src/v19-paper-exit-convergence.mjs` prüft `auditSingleExitReceipt` gegen tatsächliche unabhängige *lokale Modell-Snapshots* vor/nach der SELL-Abwicklung: einmaliger Lot-Abschluss, Cash/Proceeds, Quote-Arithmetik, Fee/PnL, unveränderte alte Receipts/History/Positions und chronologisch fortlaufender Zähler.
4. [`2a629b6`](https://github.com/127027/Sniperbot-/commit/2a629b6a88dfd9b8ec1e1bc354359e26969d75b6): zwei weitere Regressionstests für manipuliertes Cash, Zusatzlots, alte Belege, SELL-Proceeds, doppelte Events und falsche Sequenzen.

## Reale GitHub-Validierung (nicht nur lokal behauptet)

Quellstand `2a629b6a88dfd9b8ec1e1bc354359e26969d75b6`:
- [R29 Cleanroom Paper Tests, Run #45071174129](https://github.com/127027/Sniperbot-/actions/runs/45071174129) **SUCCESS**, Node 22 **656/656 PASS, 0 FAIL**.
- [R29 V1.9 Cleanroom Tests Only, Run #45071174113](https://github.com/127027/Sniperbot-/actions/runs/45071174113) **SUCCESS**, Node 22 **656/656 PASS, 0 FAIL**. Original-61-Aufgaben-Release-Gate wurde read-only ausgeführt und blieb erwartungsgemäß `NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE`. Historische Training-/Backtest-Schritte wurden nicht angefordert und nicht gestartet.

**Originalabnahme unverändert und nicht hochgezählt:** `13 PASS / 46 PARTIAL / 2 OPEN` von 61; `13/60` Nicht-Backtest-Aufgaben original PASS. Die verbessert geprüften Softwarepfade betreffen insbesondere `SYS-09`, `D4-08`, `D4-09`, `D5-02` und `D5-06`. Keine dieser Originalaufgaben erhält damit bereits einen echten Windows-/GPT-/Provider-End-to-End-PASS.

## Absolute Grenzen

- Kein Original-Oktober-29h-Backtest, kein Replay mit Backtestauftrag, keine Echtgeld-Order, **keine neue Paper-BUY/SELL-Order**, kein gefälschter `PAPER_FILLED`-Beleg.
- Bestehende 5.000 TEST-USDC und alle Kunden-/Client-Dateien unverändert; alter Windows-Bot/main nicht bearbeitet; fünf Dots und deren Zeitpläne nicht geändert.
- `D3-04` und `D3-05` bleiben **OPEN**; fehlende unabhängige Issuer-/Quotezeit-/Chain-Sellability-, neutrales Marktuniversum-, fünf echten GPT-Review- und Windows-Receipt-Nachweise bleiben **fehlend**.
- Die neuen lokalen Prüfer leisten stärkere Konsistenzkontrollen über *vorgelegte Dateien/Modellzustände*, keine Herkunftsauthentifizierung, Blockchain-Sellability oder tatsächlich extern ausgeführte Orders.

## Verbleibende Reihenfolge vor Backtest

Echte unabhängige Risk-/Quote-/Sellability-Belege erfassen, mehrstündige sechs-Chain- und 429-Continuity belegen, die fünf GPT-Review-Journale mitsamt ausgeführten 4/8/12/24-Frequenzen verifizieren, echte Windows-Paper-Client-Quittungen und Read-only-Kontobestand nachweisen, eingefrorenen Holdout nach dem 25.11.2026 mit neutralem Nenner auswerten und dann alle 60 Nicht-Backtest-Aufgaben neu abnehmen. **QA-04 Backtest nur nach separater ausdrücklicher Nutzerfreigabe.**

Verbindliche unveränderte Ursprungstabellen: `docs/V19_48_ORIGINAL_RESTBAUSTELLEN_VOR_BACKTEST_20261122.md`, `docs/V19_46_PARTIAL_ACCEPTANCE_AND_NEXT_BACKTEST_PLAN_20261122.md` und `research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json`.

## Nachtrag: clientübergreifende Lot-Abgrenzung und feldreihenfolgenfeste Markt-IDs

Nach dem oben dokumentierten 656-Test-Snapshot wurden noch zwei weitere kleine, sicherheitsrelevante Änderungen durchgeführt:

- [Commit `8a47ece`](https://github.com/127027/Sniperbot-/commit/8a47ece13966c6c49a8d73f18b9b9512f54b939f): Bei `auditSingleExitReceipt` bleiben `clientId`, `startedAt` und Paper-Schema vor/nach der Abwicklung identisch. Ein anderes Clientkonto darf den Receipt nicht übernehmen. Die Poolidentität wird anhand identischer `chain`, `contract`, `pool` geprüft, ohne von JSON-Schlüsselreihenfolge abzuhängen.
- [Commit `015604a`](https://github.com/127027/Sniperbot-/commit/015604a7ea3fa08b7e9aa0b3293c51e1c0236f59): neuer Regressionstest für denselben Pool mit anderer Feldreihenfolge und zwei verfälschte Client-Provenienzfelder.

**Neuster explizit bestätigter Source-SHA: `015604a7ea3fa08b7e9aa0b3293c51e1c0236f59`.** Die zwei echten GitHub-Workflows [#45071334292](https://github.com/127027/Sniperbot-/actions/runs/45071334292) und [#45071334277](https://github.com/127027/Sniperbot-/actions/runs/45071334277) endeten beide **SUCCESS** mit **657/657 Node-Tests PASS, 0 FAIL**. Keine Orders, keine backtestartige Wiederholung historischer Handelssimulation und kein Main-/Windows-Zugriff. Strenge Originalabnahme weiterhin 13/46/2, `QA-04` unberührt.
