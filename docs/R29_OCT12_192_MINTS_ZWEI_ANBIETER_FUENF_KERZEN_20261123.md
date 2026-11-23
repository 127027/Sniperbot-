# R29 – 192 neutrale Oktober-Mints: exakter Pool-Abgleich und historische Kurse (Forschungsstand)

**Stand 23.11.2026, 07:39 UTC.** Nur GitHub-Branch `codex/r29-cleanroom-paper-20261121`. **Kein Live-Trading, kein Änderung bestehender Paper-Wallet, keine historische GPT-Order-Fiktion.**

## 1. Tatsächlich ausgeführte Quellenchecks

- 24 korrekte Stundenticks 12.10.2026 **00:00 bis 23:00 UTC**, davor 5h past-only Warmup ab 11.10. 19:00 UTC. Isolierte Original-Diagnose [#45129883818](https://github.com/127027/Sniperbot-/actions/runs/45129883818), **744/744 PASS**. Handelsinputs = 0 echte Oktober-Quotes; Modellentscheidungen BUY = 0, SELL = 0, Fills = 0. **DATA_GAP, nicht `es gab keine Coins`.**
- 192 unterschiedliche Mints der in November erfassten neutralen Solana-Zeitfenster, rückblickend **2.598** Mint-Nennungen (mit Wiederholungen) und **11.226** Marktdaten-Merkmalszeilen in 24 disjunkten, jeweils nur 5-Minuten-Quellfenstern.
- Erste tatsächlich ausgeführte öffentliche Token-Pool-Abfrage [DexScreener Run #45132061221](https://github.com/127027/Sniperbot-/actions/runs/45132061221): **7/7 HTTP 200**, 192 neutral übergebene Mints, **2 exakte Mint-Pool-Treffer**, 190 heute nicht beim abgefragten Anbieter gelistet, **751/751 Tests**. [Original-HTTP-Bytes und SHA-256](https://github.com/127027/Sniperbot-/actions/runs/45132061221/artifacts/14798535846).
- Zweiter tatsächlich ausgeführter öffentlicher Datenanbieter [GeckoTerminal Run #45132577450](https://github.com/127027/Sniperbot-/actions/runs/45132577450): **4/4 HTTP 200**, **2/2** exakte Pooladresse/Mint/WSOL-Token-Beziehungen auch dort gemeldet; **5** nachträglich aus 12.10. gespeicherte, vor ihren Scanzeitpunkten abgeschlossene Minutenkerzen; **758/758 Tests**. [Gecko-Originalantworten und SHA-256](https://github.com/127027/Sniperbot-/actions/runs/45132577450/artifacts/14798357350).
- **Achtung:** Beide Anbieter wurden am 23.11.2026 abgefragt. Zwei verschiedene Domains beweisen nicht voneinander unabhängige Upstreamdaten. Auch zusammen beweisen sie **weder originale historische Bereitstellung noch verlässlich ausführbare 50-USDC-Transaktionen oder unabhängige Sellability**. Die 190 nicht aktuellen Listings sind ausdrücklich **UNKNOWN**, nicht nachweislich nicht handelbar im Oktober.

## 2. Zwei neue exakte, aber nur retrospektive Pool-Identitäten

| Virtueller Scan (UTC) | Heute gemeldeter Coinname | Mint / Token Contract | Exakter Pool | Beide Anbieter melden Pool-Erstellung |
|---|---|---|---|---|
| 12.10. 02:00 | TANK / SOL | `3nXL1jYC4rTL9hWnEYz1w4WkbbKceFmb5jxX7RL5pump` | `CTemNiKyDcmqrYMB2EF6fp4LcRprYm7LeCBoM14228sT` | 12.10. **01:57:46 UTC** |
| 12.10. 18:00 | ARIANA / SOL | `28FFbG2j5d5XGvyuLSdDixAgQnmN4YDZqmSVbbzJpump` | `8TgpUYKfnG2UM43rFQMV9v3XRiciAqqDSp8BgXSBcq7P` | 12.10. **17:58:47 UTC** |

Die mintseitigen historischen neutralen Beobachtungszeiten lauten TANK **01:59:40.907 UTC** und ARIANA **17:59:04.257 UTC**. Beides liegt vor den jeweiligen Stundenscans, aber die Beweislast für damalige Anbieterzustellung bleibt offen. Den Namen TANK/ARIANA lieferte erst die am 23.11. abgefragte GeckoTerminal-Poolantwort; er ist keine originale historische Nachricht oder Medienhype-Bestätigung.

## 3. Erst am 23.11. abgefragte USD-Minutenkerzen, keine ausführbaren Orders

GeckoTerminal-Quellenaufruf `/networks/solana/pools/{pool}/ohlcv/minute`, historische `before_timestamp`-Abfrage, `currency=usd`, `token={mint}`. Candles dürfen nur für die Forschung verwendet werden, wenn die Minute **spätestens zum virtuellen Scanende geschlossen war**. Beim exakten 00-Sekunden-Tick ist selbst die damalige Veröffentlichung des gerade geschlossenen OHLCV-Werts nicht belegt.

| Token | Erste nachträglich abgefragte Minutenkerze | Letzte vollständig geschlossene Minutenkerze bis Scan | Rechnerische Open→Close-Bewegung | Aussage |
|---|---|---|---:|---|
| TANK | 01:57 UTC Open `0.00000342480649` USD | 01:59 UTC Close `0.00000330289326` USD | **−3,56 %** | hoher Intraminutenbereich, aber kein belegter 50-USDC-BUY |
| ARIANA | 17:58 UTC Open `0.00000339571440` USD | 17:59 UTC Close `0.00000807186925` USD | **+137,71 %** | nur nachträglicher OHLCV-Ausschnitt; kein nachgewiesener ausführbarer Gewinn |

Für TANK wurden 3, ARIANA 2 **bis zum Scanabschluss geschlossene** 1-Minuten-Kerzen im 100-Minuten-Lookback gemeldet. Beide Quellantworten enthalten außerdem eine mit der Scanzeit startende 1-Minuten-Kerze, die **nicht** in den Stand des exakt an dieser Sekunde getriggerten Scans gelangt. ARIANAs +137,71 % ist ein retrospektiver rechnerischer Kursverlauf aus Open/Close, **nicht** eine tatsächliche oder realisierbare Rendite für den Bot. Die 65er-Referenzliste enthält keinen der beiden Namen; das Universum aller über +100 % gestiegenen Coins ist ungeklärt.

## 4. Evidenzstufen – kritische Trennung

| Evidenz | TANK | ARIANA |
|---|:---:|:---:|
| neutrale Mint in nachträglichem Originalquellenarchiv | Ja | Ja |
| exakter Pool/Mint/WSOL von DexScreener am 23.11. | Ja | Ja |
| exakter Pool/Mint/WSOL von GeckoTerminal am 23.11. | Ja | Ja |
| von beiden heute als am 12.10. vor dem Scan erstellt gemeldet | Ja | Ja |
| nachträglich abrufbare bis zum Scan geschlossene OHLCV-Kerze | Ja | Ja |
| originale tatsächlich 12.10. veröffentlichte Preis-/Providerbelege | **Nein** | **Nein** |
| unabhängiger Onchain-BUY+SELL für 50 USDC mit Gebühren, Slippage, Pool-Reserve | **Nein** | **Nein** |
| D3-04 Issuer/Quote, D3-05 Honeypot-/Blacklist-/Tax-/Exit-Attestierung | **Nein** | **Nein** |
| tatsächliche 5-GPT-Dot-Review-/Windows-Paper-Fill-Quittung | **Nein** | **Nein** |

## 5. Änderungen auf GitHub

- `src/v19-postrun-solana-mint-pool-lookup.mjs`: nur post-run, streng sieben Batches maximal 30 Mints, exakte Pool/Mint-Beziehung, Byte-Hashes, Fehlerklassen pro Batch, keine Zukunftsquote in historischen Entscheidungen.
- `test/v19-postrun-solana-mint-pool-lookup.test.mjs`: sieben Negativ-/Positivfälle gegen schlechte Chain/Pool-Identität, 429, Rohhash-Manipulation, Zukunftsstempel.
- `scripts/v19-research-retro-192-mint-pool-links.mjs` und `.github/workflows/cleanroom-v19-postrun-mint-pool-lookup.yml`: original GitHub-Rohbytes, öffentliche keylose Abfrage, kein Order-Client.
- `src/v19-postrun-two-pool-gecko-crosscheck.mjs`: exakt zwei vom vorherigen Quellresultat unverändert gepinnte Mints und Pools; exaktes `solana_{mint}`/`solana_{WSOL}`-Paar; 1-Minuten-Kerzen mit Ende **höchstens** zur Scanzeit; Ausgabe immer RESEARCH_ONLY.
- `test/v19-postrun-two-pool-gecko-crosscheck.test.mjs`: sieben Negativ-/Positivfälle, inklusive OHLCV-Candle in der Zukunft, fremde Poolidentität, 404 und Manipulation des API-Originalhashes.
- `scripts/v19-research-gecko-two-pools.mjs` und `.github/workflows/cleanroom-v19-postrun-two-pools-gecko.yml`: vier maximal erlaubte GET-Abfragen, ohne API-Schlüssel, ohne GitHub-Paper-Order, 50-TEST-USDC-Modell untouched.

**Aktuelle ursprüngliche Abnahme:** 13 PASS/46 PARTIAL/2 OPEN. `QA-04` bleibt `NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE` mit 8 Originalbeleg-Sperren. Abnahmeprozente steigen nicht automatisch, nur weil ein Forschungs-Endpoint grün ist.

## 6. Echter verbleibender Blocker

Der nächste sinnvolle Schritt braucht **damals tatsächlich vorhandene Onchain-Signaturen/Pool-Reserve-Zustände**, erstellte Originaltransaktionszeiten und eine quellenprüfbare historische **50-USDC-BUY- und SELL-Quote** einschließlich verfügbarem SOL/USDC-Umrechnungskurs, Gebühren, Slippage, Tax, unverändertem Contract und erfolgreicher Exitroute. Historische Kerzen allein können diese Sperre technisch nicht auflösen.

Ein zweiter Kernbefund: **ARIANA stieg laut rückblickendem 1-Minuten-Preis von 17:58 bis 17:59 um ~138 %.** Ein stündlicher GPT-Review um 18:00 könnte diesen bereits geschehenen Anstieg nicht am 17:58-Minutenbeginn handeln. Historische schnelle Scanner-/Watchereignisse müssten getrennt von GPT-Vollanalysen bewertet werden, ohne die maximalen GPT-Reviews/Tag oder den Paper-Order-Sicherheitsgate zu umgehen.
