# R29 V2.9 – Datenanbindung repariert, 24-Scan-Strategie erneut getestet

**Prüftag 12. Oktober 2026, UTC. Status: 24/24 integrierte Software-Scans erfolgreich; noch kein nachgewiesener historischer handelbarer Backtest.**

Der ursprüngliche 24h-Backtest meldete bei allen Scans leere Kandidatenlisten (`DATA_GAP_NO_FRESH_QUOTES`). Die SHA-geprüften 259.851 Rohfeature-Zeilen vom 11./12. Oktober wurden nun durch den neuen, streng zeitlichen Dot2-Screening-Funnel geführt und **in den bestehenden `backtestOnRequest` → `replaySignalDecisions` Strategie-Code eingebunden**. Die 61 Mints gehören jetzt zu den jeweiligen Scans im tatsächlichen Modellentscheidungsprotokoll; der Dot3-Kauf-/Verkaufsschutz bleibt unverändert und sperrt alle nicht belegten Quoten.

**Echt ausgeführt:** [V2.9 Source-Feature-Screening #45344389914](https://github.com/127027/Sniperbot-/actions/runs/45344389914): 9 Python-Tests bestanden, 259.851 Originalfeatures, 61 Screening-PASS über 24 Stunden. [V2.9 integrierter Shared-Strategy-Backtest #45345154849](https://github.com/127027/Sniperbot-/actions/runs/45345154849): **886/886 Node-Regressionen + 6/6 strikte Adaptertests bestanden**, 24/24 Modell-Scans, 61 Research-Screening-PASS, **0 BUY, 0 HOLD, 0 SELL, 0 Original-GPT-Reviews und 0 Windows-Paper-Fills**.

Die 61 Mints sind bei diesen 24 Stundenchecks **61 unterschiedliche Mint-Adressen**, weil jedes Mint in dieser Quelle nur einmal durch den ersten Screening-PASS kam. Sie sind jedoch **nicht** 61 nachweisbar kaufbare Memecoins, keine 65 späteren Gewinner und keine 61 validen historischen Echtgeld- oder Paper-Orders.

## Die angeforderten 24 Scanner

| Scan | UTC | Kumulativ rekonstruiert | Frisch 10 Min | Forschungs-Screening-PASS | BUY | HOLD | SELL | Top-Mints (gekürzt) |
|---:|:---:|---:|---:|---:|:---:|:---:|:---:|---|
| 1 | 00:00 | 30.181 | 315 | 0 | – | – | – | – |
| 2 | 01:00 | 31.288 | 287 | 1 | – | – | – | 5LfEyHPK…Fpump |
| 3 | 02:00 | 32.660 | 319 | 1 | – | – | – | 7LdbvUSb…Tpump |
| 4 | 03:00 | 33.917 | 344 | 3 | – | – | – | AAy8BWuc…8WJaG, 6fj8RpJh…Gpump, HKeVuPtZ…yJ5Lj |
| 5 | 04:00 | 34.878 | 265 | 2 | – | – | – | 5uPr98Fo…iLDHq, GWi9d4WH…8zrzL |
| 6 | 05:00 | 36.002 | 324 | 4 | – | – | – | 3g4iiLXU…9pump, GKJ9j1AM…Apump, 8QBeQm8J…XjhcG |
| 7 | 06:00 | 36.938 | 257 | 4 | – | – | – | 6Xj5qhrG…npump, 8uBQFFv4…Ypump, 6xdXjJXV…Wpump |
| 8 | 07:00 | 37.795 | 244 | 4 | – | – | – | AwmtQBGb…Ppump, GihDwjp2…Fpump, 3t1BMXpT…ipump |
| 9 | 08:00 | 38.797 | 268 | 0 | – | – | – | – |
| 10 | 09:00 | 39.920 | 298 | 3 | – | – | – | A2F8RAW1…wpump, 7MKsF76r…Nworm, 6haciZiu…Rpump |
| 11 | 10:00 | 41.102 | 296 | 4 | – | – | – | 2oB95KUm…Epump, LZUapVYW…4pump, 6N1sCUTq…Epump |
| 12 | 11:00 | 42.266 | 311 | 3 | – | – | – | 98ZPuQVe…Cpump, 7PNYF4tg…FJSDu, FzSaUjFH…Wpump |
| 13 | 12:00 | 43.589 | 304 | 6 | – | – | – | B3iNZuQi…ASVLh, 2XFGaryh…BGQhs, HxMP1afp…J4wsG |
| 14 | 13:00 | 44.942 | 354 | 1 | – | – | – | H6mj55CT…xpump |
| 15 | 14:00 | 46.568 | 376 | 2 | – | – | – | EJQ2PTob…Qpump, DtRcYCWk…Spump |
| 16 | 15:00 | 48.380 | 403 | 2 | – | – | – | 133MMssE…XNC2u, 5h4ZtgDS…BhQ5V |
| 17 | 16:00 | 50.296 | 445 | 0 | – | – | – | – |
| 18 | 17:00 | 52.506 | 523 | 3 | – | – | – | AYHMjgc9…upump, ACmz9U6h…jpump, ARrCZLj3…xpump |
| 19 | 18:00 | 54.293 | 412 | 7 | – | – | – | 7Ms4fGWQ…wpump, 3L4GQ3tb…Lpump, B14H4Juk…bpump |
| 20 | 19:00 | 56.312 | 457 | 4 | – | – | – | 3vov6Wqc…gpump, 5SoZbB7Q…jpump, MGuqrk6c…Wpump |
| 21 | 20:00 | 58.406 | 488 | 4 | – | – | – | 9Jbk7BEH…Xpump, 4zzz4QoM…EVxbb, 5kkxuJKN…Tpump |
| 22 | 21:00 | 60.547 | 367 | 2 | – | – | – | 8wF71z3f…qpump, 9xtiGL2u…2pump |
| 23 | 22:00 | 62.293 | 375 | 1 | – | – | – | 4vk779s7…1pump |
| 24 | 23:00 | 63.890 | 304 | 0 | – | – | – | – |

**BUY/HOLD/SELL durchgehend 0:** Es existiert noch kein unabhängig authentifizierter Original-Oktober-Provider-Capture mit exaktem Marktpreis, 50-TEST-USDC-BUY- UND SELL-Ausführbarkeit, Gebühren, Slippage und Token-Sellability. Ein `SCREEN_PASS` erzeugt ausschließlich eine Forschungs-Prüfwarteschlange. Der Bot soll nicht blind auf Risiko handeln.

## Alle 61 tatsächlich vorgemerkten Solana-Mints mit exakter Scan-Zuordnung

**Scan 2 (01:00 UTC), 1 Forschungs-Mints:**

- `5LfEyHPKWGrsiWXYtjjRKywhhiJU9WWpjQFe2jjFpump`

**Scan 3 (02:00 UTC), 1 Forschungs-Mints:**

- `7LdbvUSbZmKkg8R27u1ZtQFZBUJEbQnjK5L7XGhTpump`

**Scan 4 (03:00 UTC), 3 Forschungs-Mints:**

- `AAy8BWucZoLhxdpZ8C3VXarhzfKPhLaxVyqCeJM8WJaG`
- `6fj8RpJhDfjYTWz7tovtnnNRcZABzX7i7xiWbhCGpump`
- `HKeVuPtZUPNCBhUrEMPWHNLBXtozXgKYHz7UatAyJ5Lj`

**Scan 5 (04:00 UTC), 2 Forschungs-Mints:**

- `5uPr98Foqx8LAUoGcrA2qd2XBMkpPZjP1SiCSRbiLDHq`
- `GWi9d4WHgXzQtUNQSs5vRNUggM71QU7KC57zr7C8zrzL`

**Scan 6 (05:00 UTC), 4 Forschungs-Mints:**

- `3g4iiLXUxZc8ef9wUY9CLJ5NAb6647YfRuTDjza9pump`
- `GKJ9j1AMDduL5TVeJxu92FFdxt7VxonTXWuWLxkApump`
- `8QBeQm8JFLTzCkxK4tQKCkFAYhaHaFXyWAe3EaSXjhcG`
- `XtqYxv5roYnDie7cRNSV9dgrPBA2Ccrxh8rFcAzpump`

**Scan 7 (06:00 UTC), 4 Forschungs-Mints:**

- `6Xj5qhrGrUMSxzTYNFhN6GXzdaocjci53RqC89Anpump`
- `8uBQFFv4WGfEcKxBCbpzhHgLnHZU9adVwCy5mT8Ypump`
- `6xdXjJXV8GhMCZv4WrSxuyxT2srGsGEp2HEfuT9Wpump`
- `9vERmAC9AMaHN7FytUx8BcUb9AmMjQYLiDLvPonapump`

**Scan 8 (07:00 UTC), 4 Forschungs-Mints:**

- `AwmtQBGbV7TbzkMB6TJQkPoy2ZA5cGxjneaPcMfPpump`
- `GihDwjp2S3PJKPcoVjeUQcHPeW9G5AyELsBHHkUFpump`
- `3t1BMXpTnGZ8CbfLDBace9pDzJ6S1F5oycuCouNipump`
- `BWACkojaB2cKax14HwgK8SGvxsCZD2ktZk8rVSGPpump`

**Scan 10 (09:00 UTC), 3 Forschungs-Mints:**

- `A2F8RAW1n6La8rkQ98r2eVT41kwUDKYy89PGnKSwpump`
- `7MKsF76rx5UMAdtUS1WLNeu4NYdpAfiCccV62upNworm`
- `6haciZiuNuUvBvUnJa6SFB7bsxnpoW3Bz4R2cmpRpump`

**Scan 11 (10:00 UTC), 4 Forschungs-Mints:**

- `2oB95KUmDfcVKDbVkMXW5jqMA3uN74U7MNmu3Z7Epump`
- `LZUapVYWpjs9AJBj3fsTqWmnRosMqYeLVfEGGC4pump`
- `6N1sCUTqGs7soAcpfrT2d7ZH7xdk4xf947iBeCgEpump`
- `2rwCkJfgxdzDVYvEciV85akAPmKpiurG7KJsBugNpump`

**Scan 12 (11:00 UTC), 3 Forschungs-Mints:**

- `98ZPuQVemjZzioQmRVsHyrYHHBuVqi1mf9WUme9Cpump`
- `7PNYF4tgjbvg2AyUvRR1jgTPMqHKRHSLsT4FmS2FJSDu`
- `FzSaUjFHzAEswubEKocH6BBk44piu3UgF5m2zRLWpump`

**Scan 13 (12:00 UTC), 6 Forschungs-Mints:**

- `B3iNZuQiCn5HAnawco283SfXnHchVVQrYLZBhuGASVLh`
- `2XFGaryhk6LouBgMW22jRQP9NxMoLTK3JErBQZsBGQhs`
- `HxMP1afpdL65rf7EFpBj4Pbn2YgEf8Ki1wR7QtHJ4wsG`
- `BBm41HNZ48n2KBSEzPkoSre4ZDbiPbYbyKvgPoC9Kpad`
- `F8HxQVfQ8DoHAPqdzJV7e2ptMhgAwqsU7EGPLAnypump`
- `8jzyAkV7NmqMyFbkytW67XDWuizWzYKVpKpuXzPWGpad`

**Scan 14 (13:00 UTC), 1 Forschungs-Mints:**

- `H6mj55CTjKwM1nuUniuHLtkFFZTAuK12fqWbPhBxpump`

**Scan 15 (14:00 UTC), 2 Forschungs-Mints:**

- `EJQ2PTobDZjZ5cGMwAoVTgKNGTFf7U7XkbTuMW2Qpump`
- `DtRcYCWkAK5vrxoK4xmwEkqtGnXvdchwzrnfJYzSpump`

**Scan 16 (15:00 UTC), 2 Forschungs-Mints:**

- `133MMssEQSoh31oG5fK9RwjWJCPXCTMgbvvbt62XNC2u`
- `5h4ZtgDSGanjAA5ZvWQx4XTNX8PjK9QY9KMbJ2zBhQ5V`

**Scan 18 (17:00 UTC), 3 Forschungs-Mints:**

- `AYHMjgc9mt6Tiy69sf3CiKLbdj5qBGXZU2yGuDupump`
- `ACmz9U6hczZ5Wj9KHmtRJQERSL3rWSfv61eqkKBjpump`
- `ARrCZLj3uTAX7MmwDCznteQNjteQuViYxUw3DBfxpump`

**Scan 19 (18:00 UTC), 7 Forschungs-Mints:**

- `7Ms4fGWQ6uQAzWgwEU5FSv2SNC1BVVdQf7b7Uo1wpump`
- `3L4GQ3tb352HkXZhkDrwHtAWao1JpzMGyWYqV5MLpump`
- `B14H4JukS4yDHXT2LwZuDLHkYDfEnY9ydurEbwcbpump`
- `86dw4im9PfUEgdp5DNadzZf573AuqLVoNAwXg3yndag3`
- `BME9xSJ82BKx2y13xCAnqR72tQgszERwE6EoxShtMJb3`
- `BhnCKQUqk3or3LXzwbxnL95VRCpSUqCtFd6DpoAfC1Y4`
- `EsLSosNxQDqLADgs2qGWNeh7jMiwMPPJurUyWCbjpump`

**Scan 20 (19:00 UTC), 4 Forschungs-Mints:**

- `3vov6Wqcd4JYzSb4NNwp8nu55qYJ7bSqtZNBBKegpump`
- `5SoZbB7QKrmY2UeKShspj8jU6EiL3jX6rYcyVMbjpump`
- `MGuqrk6cd6hPPAzPS14ar1hjNyf2PjZEsxVamZWpump`
- `9dJdonu7gzpHkzCw6hY7URkfChCEkorxC77mBMACpump`

**Scan 21 (20:00 UTC), 4 Forschungs-Mints:**

- `9Jbk7BEHgSVsBQhrnD1dFvxrwqNpTdWGHxf6eiDXpump`
- `4zzz4QoMXHa5WyYqyRuFmH2joGpMxf9sqVhfrAvEVxbb`
- `5kkxuJKNVV4VahoATGbC5mjNWsKHqjh9GEYQFPMTpump`
- `4PzSRMPCNJ61jW7uS9cnXb244XWjbKhEd3JT4Af7pump`

**Scan 22 (21:00 UTC), 2 Forschungs-Mints:**

- `8wF71z3fQM7BF5EvwSkfZYFjw1Ei2E4u4isnjRzqpump`
- `9xtiGL2uTS6EQUkxaF3ZL14sMWCL2hXJaKTMXGz2pump`

**Scan 23 (22:00 UTC), 1 Forschungs-Mints:**

- `4vk779s7C7m4BBF9ttbS6r1LzAa7jQQjvM2xm7x1pump`

## Warum das der bisherige Engpass war – und was weiter fehlt

Der neue Forschungs-Code `src/v29-retro-candidate-funnel.py` erzeugt die 24 chronologischen Kandidatenlisten; `src/v29-retro-research-bridge.mjs` validiert ihre Herkunft und bindet sie in `src/point-in-time-strategy.mjs` sowie `src/v18-requested-backtest.mjs` ein. Damit gibt es eine nachvollziehbare Verbindung vom historisch rekonstruierbaren Markt über den Kandidatenfilter zu den echten Modell-Entscheidungstakten.

**Sicherheits-Hinweis:** Der Datenanbieter veröffentlichte die Feature-Dateien erst **nach** dem 12. Oktober. Ein Feature-Zeitstempel allein beweist **nicht**, dass der Bot es damals empfangen hat. Auch eine Reserve `f_rs` ist kein USD-Ausführungspreis und eine `p_rug`-Schätzung keine Original-Dot3-Risikobestätigung. Keine damaligen SELL-Quoten oder eigenen Fills wurden erzeugt oder rückdatiert. Die 65 rückblickenden Referenzmeldungen wurden nicht als Eingangsdaten geladen.

**Weitere Priorität:** Für die jetzt 61 konkret identifizierten Kandidaten müssen exakte historische Poolidentitäten und eine unabhängige Quelle für die damalige Quote + SOL/USDC, Liquidität, Tokensteuer, Transfer-Hooks sowie historisch verifizierte 50-USDC-BUY-/SELL-Ausführung beschafft oder als `UNKNOWN` dokumentiert werden. Nicht erneut bei leeren 24-Stunden-Reports beginnen. Für einen späteren Leistungsnachweis ist außerdem ein unbekannter prospektiver Holdout nötig.

## Originalbelege

- Source-V2.9-Artifact: `r29-v29-24hour-feature-candidates-45344389914` (ID 14896668543), SHA-256 `24-scans.json`: `3922c0d9fee93e3e54ba68e5a397d148269fdacfc38aad17459ae2ca50724fea`.
- Shared-Strategy-Artifact: `r29-v29-integrated-shared-strategy-45345154849` (ID 14897063976), SHA-256 `24-scans-strategy.json`: `95aac1693e71906202c872418ce673a22b59b5e97d02c760e74dc432e8447fe3`.
- Kompletter persistierter JSON-Screening-Ledger: `research/audits/2026-11-24/r29-v29-24-hour-integrated-retest-candidates.json`.
- Originales formelles QA-04-Abnahme-Gate ist weiterhin **13/60 PASS = 21,67 %, acht externe Beweisblocker**. Keine Veränderung des Windows-Paper-Guthabens, keine Echtgeld-Orders, kein Merge nach `main`, keine unnötige Dot-Aktivierung.
