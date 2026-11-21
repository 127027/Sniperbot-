# R29 Cleanroom — 24h historischer Blind-Replay (12. Oktober 2026)

**Tag:** 12.10.2026, 00:00–24:00 UTC = 12.10., 02:00 bis 13.10., 02:00 deutscher Sommerzeit.

**Zufallswahl:** vor Recherche mit `secrets.randbelow(48)` aus dem Zeitraum 01.10.–17.11.2026; Offset 11 → **12.10.2026**. Kein Gewinner war Auswahlkriterium.

**Simulation:** fünf Rollen-Wakes pro Stunde (:05, :15, :25, :35, :45 UTC). Ohne echte Marktdaten zur damaligen Marktdynamik bleibt Dot 1 bei 4 Vollreviews täglich. Dot 4 hätte um **00:35, 06:35, 12:35 und 18:35 UTC** Gelegenheit zum Vollreview. Das sind simulierte Takte, keine damals tatsächlich laufenden GPT-Sitzungen.

| UTC | Deutschland (MESZ) | Dot-4-Shadow-Ergebnis | BUY | SELL |
| --- | --- | --- | ---: | ---: |
| 00:35 | 02:35 | DATA_GAP / NO_TRADE (keine zulässigen Vorab-Snapshots) | 0 | 0 |
| 06:35 | 08:35 | DATA_GAP / NO_TRADE | 0 | 0 |
| 12:35 | 14:35 | DATA_GAP / NO_TRADE | 0 | 0 |
| 18:35 | 20:35 | DATA_GAP / NO_TRADE | 0 | 0 |

**Paper-Guthaben:** 5.000 → **5.000 TEST-USDC**, 0 Käufe, 0 Verkäufe, 0 echte Client-Receipts. Keine zukünftigen Coin-Gewinner in den Blind-Replay eingespeist.

## Nachträglich dokumentierte Chancen (NICHT im Blind-Replay verwendet)
- **BNBCAT** (BSC) +50.327 % 24h laut Tagesarchiv, [Tagesarchiv](https://dextape.com/launches/2026-10-12), [Pool](https://dexscreener.com/bsc/0x7cb3b9f0cb6a6af22e8b9c53e2153e2b2d311d7e)
- **CRAWLER** (Solana) +822 %, [Pool](https://dexscreener.com/solana/anrchvfjuzmtos8dgjpt2xkurvppyavldturasnwxcd4)
- **SEAN** (Solana) +1.228 %, [Pool](https://dexscreener.com/solana/cnvst3suymo1gfygnangygpqhwtnzzmb59wyyzqf1nvj)
- **MARG** (Ethereum, Uniswap-V4-Pool-ID) +407 %, [Pool](https://dexscreener.com/ethereum/0x436763bf49aa9ea6db1d8d4d80ac8c7b3c36ad58fa6281a06ea39c92d69e2f20)
- **BORDR** (Solana) +117 % laut datiertem [Artikel](https://memedesk.co/alpha/bordr-bordrless-clean-volume-reprice), aber ohne genaue Veröffentlichungsuhrzeit.
- **DOGU** (Solana) +1.031 % **in der ersten Stunde** laut [Artikel](https://memedesk.co/alpha/dogu-doge-guy-thin-liquidity-rocket), **kein** Nachweis eines +1.031%-24-Stunden-Ertrags.

Die Archive sind unvollständige, rückblickende Stichproben; insbesondere waren genaue Start-/Hoch-/Tiefpunkte, Anbieter-Kurszeitstempel und auf beiden Quellen übereinstimmende zeitgerechte Quotes nicht für den gesamten Tag verfügbar. Tagesanstiege sind nicht mit handelbaren Gewinnen gleichzusetzen.

## Prüfung der Reparatur V0.3
- Exakte Contract/Pool-URL-Prüfung und sichere Quittungswiederholung sind durch eigene Unit-Tests prüfbar.
- Der Blindtest kann **nicht** bestätigen, dass die Dots an diesem Tag die genannten Gewinner rechtzeitig gefunden oder gehandelt hätten.
- Die offengelegte Lücke besteht im fehlenden lückenlosen, zeitgestempelten historischen Marktfeed, nicht im künstlich unterdrückten Kauf.
- Der Repo-Test `src/historical-replay.mjs` prüft eine ausdrücklich synthetische BUY/SELL-Variante **isoliert**. Das ist kein historischer Coin-Trade.

**Nächste technische Maßnahme:** Jeden künftigen Cloud-Dot-Lauf mit tatsächlichen Beobachtungszeiten, originalen Quellen, vollständigen Pool-/Contractadressen, zwei unabhängig verglichenen Preisbelegen und GitHub-Journalen dauerhaft archivieren. Bereits vorhandene historische Daten dürfen nur dann in den Replay, wenn ihre ursprünglichen Erfassungszeitpunkte belegt sind.

Siehe [report.json](report.json) für alle 24 stündlichen Shadow-Takte und die Quellenklassifikation.
