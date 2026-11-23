# R29 – Originale SOL-/Mint-Kontostände und Solana-Blockreihenfolge vom 12.10.2026

**Stand:** 23.11.2026 UTC · `127027/Sniperbot-`, ausschließlich `codex/r29-cleanroom-paper-20261121`. Weder `main` noch Windows-Paper-Wallet noch Live-/Test-Orders wurden geändert.

## 1. Neuer tatsächlich ausgeführter Originaldaten-Nachweis

Nach dem vorherigen erfolgreichen ursprünglichen **4× Solana V1 getTransaction**-Read [Run #45135625789](https://github.com/127027/Sniperbot-/actions/runs/45135625789), 4 rohe Quell-SHA-256, wurden aus denselben unveränderten Rohbytes auch die **nativen SOL-Kontostände der exakten Pooladresse** ermittelt und mit den schon bestätigten **poolzugeordneten Mint-Token-Balances** verknüpft.

Wiederholter SHA-verifizierter Offline-Audit [Run #45140096805](https://github.com/127027/Sniperbot-/actions/runs/45140096805), **772/772 Tests erfolgreich**. [Komplettes Provenienz-Artefakt](https://github.com/127027/Sniperbot-/actions/runs/45140096805/artifacts/14801766568).

| Coin | Originalblockzeit (UTC) | Pool native SOL vor → nach | SOL Abfluss | Mint-Token Eingang |
|---|---|---|---:|---:|
| TANK | 12.10. 01:59:53 | 1,626025917 → 1,566503302 SOL | 0,059522615 SOL | Teil von TANK-Summe |
| TANK | 12.10. 01:59:57 | 1,066077318 → 1,063622247 SOL | 0,002455071 SOL | Teil von TANK-Summe |
| ARIANA | 12.10. 17:59:59 | 20,991859003 → 20,443008433 SOL | 0,548850570 SOL | Teil von ARIANA-Summe |
| ARIANA | 12.10. 17:59:59 | 21,484666527 → 20,991859003 SOL | 0,492807524 SOL | Teil von ARIANA-Summe |
| **TANK Summe der 2 TX** | – | – | **0,061977686 SOL** | **2.023.999,627513 TANK** |
| **ARIANA Summe der 2 TX** | – | – | **1,041658094 SOL** | **13.211.411,771910 ARIANA** |

Datenquelle: originales `transaction.meta.preBalances`/`postBalances` mit `accountKeys`-Index der **Pooladresse**, zusammen mit `meta.preTokenBalances`/`postTokenBalances` des Kontos mit `owner === pool` und `mint === token`. Ganze Zahlen, keine stillen USD-Umrechnungen.

**Einschränkung:** Das sind beobachtete **Kontobestände und Änderungen in einzelnen, konkreten Transaktionen**, NICHT automatisch die vollständigen Pump.fun-AMM-Programmreserven oder virtuellen Reserven. Native SOL-Lamports können unter anderem Mindestguthaben/Rent und sonstige Kontobewegungen enthalten. Aus `MINT_IN + SOL_OUT` folgt **keine unabhängig attestierte erfolgreiche 50-USDC-Route, keine 100%-Sellability und kein tatsächlicher Bot-Trade**.

## 2. Reihenfolge ARIANA innerhalb gleicher Blocksekunde exakt geprüft

Die beiden ARIANA-Transaktionen haben dieselbe Blocknummer `456137491` und denselben UTC-Blockzeitstempel `2026-10-12T17:59:59Z`.

**Original-Account-Kontinuität:** Die spätere Account-State-Logik lässt sich nur mit der Reihenfolge *Quell-Transaktion `original-tx-response-2-2.txt` zuerst; `original-tx-response-2-1.txt` danach* lückenfrei verknüpfen:
- native SOL: 21,484666527 → **20,991859003** → 20,443008433 SOL
- Mint-Rohbalance: 556.906.078.913.231 → **563.088.068.852.294** → 570.117.490.685.141 bei 6 Dezimalstellen

Zusätzlich wurde der **originale Block** über eine öffentliche `getBlock`-Signaturabfrage unabhängig von der Rechnungsfolge gelesen:

[**Run #45140546530 – drei exakt vorgegebene Originalblöcke**](https://github.com/127027/Sniperbot-/actions/runs/45140546530), **777/777 Tests bestanden**. [Alle drei unveränderten Blockantworten mit SHA-256](https://github.com/127027/Sniperbot-/actions/runs/45140546530/artifacts/14802011535).

| Block-Slot | Coin | Gefundene Position |
|---:|---|---|
| 455874036 | TANK | 834 |
| 455874058 | TANK | 887 |
| 456137491 | ARIANA | **98** (`2-2`) und **100** (`2-1`) |

Die Blockchain-Reihenfolge bestätigt die aus zwei unveränderten Poolkonto-Beständen errechnete ARIANA-Reihenfolge. Wegen Positionen 98 und 100 ist **mindestens eine andere Transaktion dazwischen**; daraus darf NICHT gefolgert werden, dass die zwei ARIANA-Pooltransaktionen direkt aufeinanderfolgen. Belegt ist allein, dass die **beiden beobachteten SOL-/Mint-Kontostände dazwischen gleich geblieben sind**.

**Weiter bestehende wichtige Lücke:** Der erfolgreiche RPC-Abruf erfolgte am 23.11., also **nach** dem Oktober-Blindtest. Er beweist nicht, dass das GPT-System den Block oder dessen Finalität **eine Sekunde später um 18:00** bereits hätte beobachten können.

## 3. Dot-3-Grenze mit echten Poolidentitäten regressionsgetestet

Neue Regression `test/v19-real-oct12-postevent-chain-dot3-boundary.test.mjs` verwendet genau die beiden tatsächlichen TANK-/ARIANA-Mints und Pooladressen, nicht nur synthetische Zufallscoins.

- Wird das tatsächlich erst am 23.11. beobachtete Source-Capture zum Oktober-Tick gereicht, liefert Dot 3 **DATA_GAP** / `POOL_CAPTURE_MISSING_STALE_OR_FUTURE`; **kein** Trade und **kein** Paper-Fill.
- Wird das Capture-Timestamp künstlich auf 12.10. gesetzt, verhindern weiterhin fehlende D3-Attestierungen und unabhängige Quellzeiten die positive Handelsfreigabe.
- Wird ein nachträgliches Gewinnlabel übergeben, sperrt Dot 3 es als `POST_EVENT_INPUT_QUARANTINED`.

[**Beide aktuellen Cleanroom-Testpipelines für 780/780 PASS**](https://github.com/127027/Sniperbot-/actions/runs/45140694972). Kein Umgehen des Source-Gates.

## 4. Tatsächliche GitHub-Dateien

- `src/v19-oct12-verified-pool-token-account-deltas.mjs`: SHA-verifizierte Originaltransaktionskonten, native Pool-SOL-Lamports und Mint-Tokenänderungen; Intra-Slot-2-Asset-Kontinuitätscheck nur `RESEARCH_ONLY`
- `test/v19-oct12-verified-pool-token-account-deltas.test.mjs`: positive Kontinuitäts- und Negativfälle
- `scripts/v19-audit-four-real-oct12-pool-owner-token-moves.mjs`: Offline-Audit mit unveränderten Quellebytes und 50-USDC-Quote-Fail-Close
- `src/v19-oct12-solana-verified-block-order.mjs`: exakt drei Source-Slots, `getBlock` Version 1, Hash-/Zeit-/Originalsignaturprüfung
- `test/v19-oct12-solana-verified-block-order.test.mjs`: Quellmodifikation, falsche Blockzeit, 429, unsortierte Originalsig, falsche JWT/Quote-Verwendung abgelehnt
- `scripts/v19-research-oct12-three-solana-blocks-order.mjs` und `.github/workflows/cleanroom-v19-oct12-original-three-slot-order.yml`: auf drei POST-Reads begrenzte isolierte Recherche
- `test/v19-real-oct12-postevent-chain-dot3-boundary.test.mjs`: echte historische Zeitgrenze für Dot-3-Research/Backtest-Lock

## 5. Fünf Dots und vollständige originale Abnahme

**Stand des Original-Gates UNVERÄNDERT:** **13 PASS / 46 PARTIAL / 2 OPEN**, echte Original-Release-Bereitschaft **21,31 %**, QA-04 `NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE` mit acht Beweisgates. **Eine grüne 780/780-Softwaretestsuite ist nicht 780 Original-Backtest-PASS-Nachweise.**

Für einen echten Oktober-Fünf-Dot-Blindtest fehlen weiterhin:
1. damalige vollständige neutrale Pool-/Contract-/Chain-Population (nicht nur 192 Solana-Mint-Stichproben);
2. Originalzeit-Verfügbarkeit und unabhängige (Issuer-/Upstream-)Beglaubigung von Kurs-/Quote-/Risikodaten;
3. tatsächliche Pumpfun-AMM-Programmzustände, Token-2022-Mint/Freeze-/Transfer-Hook-Rechte und **50-TEST-USDC BUY- und wieder SELL-Route mit Bid/Ask, Slippage, Netzgebühren, SOL-USDC-Umrechnung und Poolliquidität**;
4. echte unabhängige fünf GPT-Dot-Entscheidungsjournale, GitHub-Übergabe und Windows-Paper-Fill-Quittungen;
5. prospektiver Blind-Holdout erst am **25.11.2026 06:54 UTC** abgeschlossen.

**Priorität als Nächstes:** Eine ausführbare *historische Programmzustands-Rekonstruktion* müsste den ursprünglichen AMM-/Bonding-Curve-State zum jeweiligen Block/Slot aus vollständigen archivierten Transaktionen und verifizierten Programmdetails beweisen. Ein heutiges `getAccountInfo` liefert keinen alten Slotzustand. Dabei weder alte Gewinnerlisten noch heute gemessene Pool-Preise als Oktober-Kaufentscheidung verwenden. Kein echter QA-04-PASS vor vollständiger unabhängiger Abnahme.
