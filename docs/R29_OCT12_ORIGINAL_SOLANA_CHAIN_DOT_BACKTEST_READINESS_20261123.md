# R29 – Originale Solana-Onchain-Quellen, vier Blockchain-Transaktionen und ehrliche Fünf-Dot-Backtest-Readiness

**Zeitpunkt:** 23.11.2026 (UTC) · **Repository:** `127027/Sniperbot-` · **Arbeitsbranch ausschließlich:** `codex/r29-cleanroom-paper-20261121` · **Mode:** RESEARCH ONLY / PAPER-ISOLATED / ZERO LIVE ORDERS.

## 1. Nutzerauftrag / Abnahmeregel

Anweisung: „Ok Mach das so das alle dots endlich den backtest bestehen“. Ziel: fünf tatsächlich zusammenarbeitende Dots; historische Warmupdaten bis 12.10.00:00 UTC kennen, dann 24 identische stündliche BUY/HOLD/SELL-Review-Punkte bis 23:00, **keine zukünftigen Gewinner oder nachträglich erfassten API-Ergebnisse für Trades verwenden**. 50 TEST-USDC pro Coin, isoliertes Originalmodell 5.000 TEST-USDC, bestehendes Windows-Paper-Guthaben unangetastet.

**Wichtig:** Die ursprüngliche 61-Punkte-Matrix lässt sich nicht durch einen neuen grünen Unit-Test oder synthetische Daten „bestehen“. Der Original-Release-Gate ist absichtlich weiterhin **NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE**: **13 PASS / 46 PARTIAL / 2 OPEN** (13/60 Nicht-Backtest-PASS; 21,31 % tatsächlich vollständig abgenommen). Kein echter QA-04-Fünf-GPT-Dot-Backtest autorisiert; keine historischen GPT- oder Windows-Fills erfunden. Bei Original-Holdout frühestens nach Ende 25.11.2026 06:54 UTC erneut prüfen.

## 2. VORHER GESICHERT: Zwei neutrale, nicht von der Gewinnerliste ausgewählte Oktober-Pools

| Neutraler Stundenscan 12.10. UTC | Heute gefundener Name | Token-Mint | Exakter Pool |
|---|---|---|---|
| 02:00 | TANK | `3nXL1jYC4rTL9hWnEYz1w4WkbbKceFmb5jxX7RL5pump` | `CTemNiKyDcmqrYMB2EF6fp4LcRprYm7LeCBoM14228sT` |
| 18:00 | ARIANA | `28FFbG2j5d5XGvyuLSdDixAgQnmN4YDZqmSVbbzJpump` | `8TgpUYKfnG2UM43rFQMV9v3XRiciAqqDSp8BgXSBcq7P` |

Die Pools stammen nicht aus den 65 retrospektiven Gewinnernamen, sondern aus der **nachträglichen neutralen 192er Solana-Mint-Stichprobe**. Erst am 23.11. bestätigen DexScreener und GeckoTerminal die aktuellen Pool-/Mint-Identitäten; historische 5-min-/1-min-Daten sind rückblickend, **nicht** original zeitgleich verfügbare 50-USDC-Quotes.

## 3. Neue tatsächlich ausgeführte Onchain-Abfragen und Fehlerkorrekturen

### Erste bounded 100er-Transaktionsseiten

- [GitHub Run #45134860911](https://github.com/127027/Sniperbot-/actions/runs/45134860911) **SUCCESS**, **765/765 Tests PASS**, 8/8 öffentliche `https://api.mainnet.solana.com` JSON-RPC-POST-Abfragen `getSignaturesForAddress`. Rohdaten mit SHA/UTC [Source-Artefakt #14799422230](https://github.com/127027/Sniperbot-/actions/runs/45134860911/artifacts/14799422230).
- 4 × 100 Signaturen je Pool erreichten nur **TANK 02:07:58** und **ARIANA 18:08:55 UTC**, beides *nach* dem Stundenscan. Richtiger Status: `INCOMPLETE_HISTORY_OLDER_PAGES_NOT_FETCHED`, nicht „keine Trades“.

### Vertiefte 1.000er-Signaturseiten, begrenzt

- [GitHub Run #45135241060](https://github.com/127027/Sniperbot-/actions/runs/45135241060) **SUCCESS**, **766/766 Tests PASS**, 14 sichere Read-only-RPC-Aufrufe, 3 volle/angebrochene Historienseiten TANK, 7 ARIANA und jeweils 2 Detailaufrufe. [Original-Raw-Artefakt #14798898526](https://github.com/127027/Sniperbot-/actions/runs/45135241060/artifacts/14798898526).
- Historisch gemeldete **vor dem jeweiligen Scan erfolgreiche Blockchain-Signaturkandidaten**: **597 für TANK, 1.192 für ARIANA**. Diese Zahl ist **keine** Anzahl tatsächlich vom Bot ausgeführter Swaps; auch aus einem `getSignaturesForAddress` wird keine ursprüngliche GPT-Empfangsbestätigung.
- Der öffentliche RPC antwortete auf alle vier `getTransaction`-Abrufe **HTTP 200 mit JSON-RPC Fehler -32015**: Transaction Version **1** erforderlich, im ersten Code war `maxSupportedTransactionVersion:0`. Keine Fills erzeugt.

### Exakt vier Detailaufrufe mit Version 1 statt Version 0

- [GitHub Run #45135625789](https://github.com/127027/Sniperbot-/actions/runs/45135625789) **SUCCESS**, **767/767 Tests PASS**, **4/4 JSON-RPC HTTP200/RPC_OK**, 4 nach `blockTime` vor Scan liegende, erfolgreiche finale Solana-Transaktionsdetails; 8 Mint-Tokenkonto-Änderungszeilen. [Original-Raw-Artefakt #14798694515](https://github.com/127027/Sniperbot-/actions/runs/45135625789/artifacts/14798694515).
- Die historischen Originaltransaktionen sind **Solana Version 1** und enthalten die exakten Pooladressen unter ihren referenzierten Accounts. Diese Blockchain-Metadaten wurden erst am 23.11. abgefragt. Die Finalisierung zum tatsächlichen 12.10.-Scannerzeitpunkt ist damit NICHT unabhängig bestätigt.
- Fehlerbehebung `src/v19-october-solana-chain-research.mjs`: JSON-RPC `getTransaction` jetzt `maxSupportedTransactionVersion:1`, Negativtests für -32015 und weiterhin `trade_authorized:false`.
- Forschungs-Code: `scripts/v19-research-oct12-two-solana-pools-rpc.mjs`, `.github/workflows/cleanroom-v19-oct12-solana-onchain-readonly.yml`, `scripts/v19-research-oct12-solana-v1-details-only.mjs`, `.github/workflows/cleanroom-v19-oct12-solana-v1-details-retry.yml`, dazu reproduzierbare Tests.

## 4. Originale Pool-Konto-Mint-Tokenbewegungen, ohne wirtschaftliche Swap-Behauptung

- [GitHub Run #45136126517](https://github.com/127027/Sniperbot-/actions/runs/45136126517) **SUCCESS**, **770/770 Tests PASS**, **keine** zusätzliche API-Abfrage; ausschließlich vier ursprüngliche SHA-256-gepinnte GetTransaction-Originalbytes mit ihrem `meta.preTokenBalances`/`meta.postTokenBalances` ausgewertet. [Ergebnis-Artefakt #14800076359](https://github.com/127027/Sniperbot-/actions/runs/45136126517/artifacts/14800076359).
- `src/v19-oct12-verified-pool-token-account-deltas.mjs` und `scripts/v19-audit-four-real-oct12-pool-owner-token-moves.mjs` erlauben nur die vier exakt gepinnten Byte-SHAs. Die Eigentümeradresse des Mint-Tokenkontos musste der exakten Pooladresse entsprechen. Als Befund darf ausschließlich **Tokenkontobewegung (EINGANG)** gemeldet werden.

| Pool | Original-Solana-Blockzeit UTC am 12.10. | Sekunden bis zum virtuellen Scanner | Eingehende Mint-Token | Token-Dezimalstellen |
|---|---|---:|---:|---:|
| TANK | 01:59:53 | 7 | Teil des Gesamtwerts | 6 |
| TANK | 01:59:57 | 3 | Teil des Gesamtwerts | 6 |
| ARIANA | 17:59:59 | 1 | Teil des Gesamtwerts | 6 |
| ARIANA | 17:59:59 | 1 | Teil des Gesamtwerts | 6 |
| **TANK-Summe** | 2 Originaltransaktionen | — | **2.023.999,627513 TANK** | 6 |
| **ARIANA-Summe** | 2 Originaltransaktionen | — | **13.211.411,771910 ARIANA** | 6 |

**Das sind KEINE SOL-, USDC-, Dollar- oder gewinnrelevanten Beträge.** Insbesondere wird aus bloß eingehenden Token NICHT behauptet, dass ein 50-USDC-Verkauf oder eine sichere Exitroute stattgefunden hat. Der stündliche GPT-Scanner kann nicht unterstellen, dass eine um 17:59:59 in einem Block enthaltene Transaktion schon um 18:00 komplett bestätigt und extern empfangen wurde.

## 5. Fünf Dots: echtes Abnahme- und Fehlerbild

| Dot | Bewiesene technische Teilfunktion | Für echten QA04 noch zwingend |
|---|---|---|
| **1 Tempo** | Zeitplan 00:00, 01:00...23:00, adaptive 4/8/12/24 Architektur und as-of Modell-Tests | original bestätigte, tatsächlich ausgeführte Taktentscheidungen, Subminuten-Beobachtung wo nötig, ursprüngliche GPT-Aufruf-Journals |
| **2 Discovery** | November-Source-Snapshots + 192 neutrale retrospektive Solana-Mints, 2 heutige Poolidentitäten, 1.789 vor-Scan Signaturhinweise | die **ursprünglich zum Oktobertick verfügbare neutrale Marktpopulation** für alle sechs Chains + signierte Original-Datenverfügbarkeit |
| **3 Risiko** | unabhängige Pool-/Mint-Beziehung von zwei heutigen Domains, 4 Original-Onchain-Transaktionen mit Poolkontobewegungen; Risiko-Gates greifen | **D3-04 original issuer+quote authentication** und **D3-05 wirkliche 50-USDC-BUY+SELL-Route am Originalslot inkl. Slippage, SOL/USDC, Tax, Freeze, Blacklist, Liquidity, eventuell Token-2022 Hooks** |
| **4 Strategie** | bei synthetischen Inputs BUY schon 00:00, SELL bestehend + BUY neu 01:00, keine Zukunftslabels, kein Sofort-Wiederkauf nach SELL | genügend wirklich zeitgerechte tradable Original-Kandidaten und signierte GPT-Entscheidung/Modellledger-Quittungen |
| **5 Audit** | SHA-verifizierte Capture-/Risikojournale, reproduzierbare Tests, Original-Quote und Chain-Gaps offengelegt | vollständige kausal verbundene **fünf original GPT-Journals**, unabhängig nachprüfbarer Windows-Paper-Client und abgeschlossener blind/prospektiver Holdout |

Das ursprüngliche Original-Gate meldet **acht** technische und externe Blocker; diese Forschungsbelege lassen keines der sechs Chains oder 60 Nicht-Backtest-Anforderungen künstlich vollständig erscheinen.

## 6. Nächster sicherer Ausbau – ohne falsche PASS-Behauptung

1. Für beide konkreten Pools im exakt historischen **Slotbereich** bidirektionale Poolreserven und Programzustand (Mint/Fee/Freeze/Transfer-Hook/Token-2022), verfügbare SOL-/USDC-Preis- und Gebührenbelege sowie dokumentierte 50-TEST-USDC-BUY- und Exitquote zum Stundenscan rekonstruieren. Heutiger `getAccountInfo`-Zustand ist NICHT der damalige Zustand. Mehr Originaltransaktionen allein reichen nicht.
2. Alle Marktstarts auf sechs Chains im Blind-Fenster neutral abdecken; als `COVERAGE_UNKNOWN` behandeln, wenn spätere historische Archive keine damalige Anbieter-Verfügbarkeit nachweisen.
3. Fünf getrennte **echte GPT-Journals** mit originalen externen Datenabhängigkeiten und GitHub-/Windows-Quittung für Paper-Only ausführen, sobald die Originale vorliegen. Keine synthetische Kaufquittung als GPT.
4. Kein echter QA-04-PASS vor authentischer Original-60/60-Abnahme, unabhängigen D3-04/D3-05-Nachweisen, Windows-Fill-Ursprung und Holdout Ende **25.11.2026 06:54 UTC**.

**Keine Echtgeld-Orders, keinerlei 50-TEST-USDC-Fills veröffentlicht, kein `main`, keine Wallet geändert, kein zusätzlicher vendor-spezifischer API-Key nötig.**
