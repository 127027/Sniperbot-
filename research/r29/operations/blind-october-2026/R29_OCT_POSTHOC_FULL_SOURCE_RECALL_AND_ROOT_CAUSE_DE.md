# R29 – Warum der bisherige Oktober-GPT-Scanner vier konkrete Chancen verfehlte

**Abgeschlossen am 17.11.2026 – ausschließlich POSTHOC-DIAGNOSE, niemals Input in einen späteren historischen Blindtest.**

## 1. Erst Blindentscheid eingefroren, DANACH Namen/Mints abgeglichen

- Der zuvor feststehende historische Prüfzeitraum war **05.–11.10.2026 Vorbereitung**, **12.–21.10.2026 Handel** bei nominellen **5.000 TEST-USDC**. Der ursprüngliche auf as-of-Felder begrenzte 10-Tage-Replay hat 40 technische Prüffenster mit **320 unterschiedlichen Solana-Mints** aus den 470.123 in der Handelsphase aufgezeichneten Starts ausgewählt. Nur technische Quellenprüfung, keine 40 realen historischen Modellaufrufe und keine Fills.
- Eine nachträglich durch dieses GPT (am 17.11.2026) durchgeführte Namens-/Outcome-maskierte Prüfung der 320 as-of-Mint-Features wurde **vor** jeder Ziel-Contract-Identitätsrecherche eingefroren: [immutable JSON](R29_OCT_320_MINT_GPT_BLIND_REVIEW_SEALED.json), Commit `525446cc631b10cd40c80780a9d8dfca86a11060`. Datenartefakt (JSON inhaltlich kanonisiert), SHA-256 `a35744004c886aca385b02d48e359436a558eeba66a9a1185af413f6431f743e`; ursprünglicher Roh-JSON-Bytehash `0c1fd1f22ad7cb9d37498b99ccc65dfcf0ee6a32f8845a3b322e754f8ed9dad1`.
- GPT markierte **2** technisch interessante Mints nur als `WATCH_RESEARCH_ONLY` (14.10. 12:00 UTC Mint `3eSVzGDVo9ivvSySA83RTjtXyDCX4ZcYZhcjoBMppump` und 17.10. 06:00 UTC Mint `2JesF8EvrcpbVHiuXeGviK1NEuSUReFkGAzZ3eoapump`); **318** Kandidaten verfehlten mindestens eines der konservativen Frühfilterkriterien. Die beiden WATCH-Tokens hatten bereits Creator-Verkäufe. Keine unabhängige historische Contract-/LP-/Sellability- und bidirektionale, einsatzgrößenspezifische Quote => 0 BUY. Das war eine EINZIGE heutige GPT-Review über vergangene technische Features, KEINE 320 separaten Modellaufrufe und kein zeitgenössisches Trading.
- Strenge epistemische Grenze: Der Benutzer hatte den Assistenten vor der Blind-Feature-Prüfung bereits über einige historische Gewinnernamen informiert. Namen und spätere Kurse waren NICHT im übergebenen Kandidaten-Datensatz; die Prüfung ist daher *hindsight-masked*, aber nicht völlig unabhängig oder prospektiv.

## 2. Vollständiger Contract-Vergleich des damaligen Solana-Launch-Quellbestands

Der unabhängige [bestandene GitHub-Actions-Vollvergleich](https://github.com/127027/Sniperbot-/actions/runs/44160022497) hat **17 originale tägliche Parquet-Launchdateien** und insgesamt **821.849 aufgezeichnete Tokenstarts** (351.726 aus dem Vorlauf + 470.123 aus den Handelstagen) gegen die in R29 archivierten SHA-256-Quellpins geprüft. Quelle: `loopholetape/pumpfun-launches`, Revision `9b9a04e7e3e85775d614d16105daad2e69ce8544`. Nur erst beim Launch bekannte `mint`, `name`, `symbol`, `t0`, `launched_at` wurden gelesen; spätere Preis-/Gewinnerlabels waren NICHT Entscheidungs-Input. Ein Mal nach dem Freeze wurde ein Contract-/Namensvergleich durchgeführt.

| Referenz | Quellmint / Launch laut archiviertem Originaldatensatz (UTC) | Im vollständigen Rohdatensatz | Unter den 320 zuvor an GPT weitergegebenen Mints | Bis zum nächsten starren 4x/Tag-Prüffenster |
|---|---|---|---|---|
| French Goku Hero (PIERRE, DexTrading) | `D3S6J9s1byrNBt3ZKwEDiPsNRqHtoEP8zQKdhyBdpump` – 18.10. 16:22:16 | Ja | **Nein** | **1:37:43** |
| PIERRE (abweichender gleichnamiger Contract) | `8GroyR3X7C2qTWX33EY6T2tLYkvXFTuvoTExUVTApump` – 18.10. 20:09:52 | Ja | **Nein** | 3:50:07 |
| Flying Tesla Roadster (FTR, KuCoin) | `DFMt2FyLpB6ekPNAzVErLXgpSnJ9CRf1VnxBAkTLpump` – 15.10. 01:59:28 | Ja | **Nein** | **4:00:31** |
| Dacity Coin (Dacity, DexTrading) | `nxPqZ4F7ux8Vph5NFu25rEP6Kx9Gr1U6Fmj36Rjpump` – **11.10. 11:16:34** (Vorbereitungsphase!) | Ja | **Nein** | **18:43:25 bis erster Handelstest-Check** |
| AudaCity (DacityCoin, anderer Contract) | `DKYcjobF7HPtL9RyQBRdeRQ2iWvizpfbgWwPWNXdpump` – 15.10. 13:22:47 | Ja | **Nein** | 4:37:12 |
| Trump $1 Coin (1, DexTrading) | `2bCCHQadi4QeHWPKG3w13siCyWWQPgkFtniouTqVpump` – 15.10. 20:16:05 | Ja | **Nein** | **3:43:54** |

**Resultat: 4 von 4 benannten Fallgruppen waren zumindest durch ihre konkret recherchierten Solana-Mint-Adressen im vollständigen archivierten Launch-Korpus enthalten; 0 von 4 wurden von der bisherigen 320er-GPT-Stichprobe weitergereicht.** Der Fall war also **PRESELECTION_SAMPLING_MISS**, nicht `GPT_REJECTED_AFTER_EVALUATION`. Die Original-DEX-Wallet-Gewinntransaktionen und spätere Profit-Höhe wurden NICHT gegen diese Mints nachgeprüft; das ist kein Renditenachweis.

Die zahlreichen gleichnamigen oder gleich abgekürzten Coins im Launch-Korpus beweisen zudem, dass ein Modell **niemals anhand eines Tickers allein** als ‚Treffer‘ gewertet werden darf. PIERRE und Dacity aus der Nutzerliste bezeichnen möglicherweise mehrere wirtschaftlich unterschiedliche Contracts. Es zählt nur ein exakter Mint-/Pool-/Chain-Abgleich.

## 3. Ursachenanalyse – funktional statt Infrastruktur

Der bisherige Blind-Replay nutzte gerade einmal 40 fixe Stunden-Checkpunkte, ungefähr 06:00/12:00/18:00/00:00 UTC. Pro Checkpunkt wurden ausschließlich die **acht neuesten Tokens unter fünf Minuten Alter** an GPT weitergegeben. Das sind **320/470.123 ≈ 0,068 %** der Launch-Ereignisse; dies ist Stichproben-Abdeckung, ausdrücklich **keine** belastbare Erkennungsquote. Eine Token-Eröffnung mehr als fünf Minuten vor dem nächsten festen Check wurde automatisch fallen gelassen. Deshalb fehlten die vier oben identifizierten Contracts schon im modellseitigen Eingang. Dacity wurde am 11.10. während der Vorbereitung aufgezeichnet und für den späteren Handel nicht mit einer länger lebenden Watchlist mitgenommen.

**Keine davon wurde bereits wegen ungenügender Kaufwürdigkeit von GPT abgelehnt.** Ein Sicherheits- oder Rendite-Ranking der vier anhand historischer voller Quotes wurde noch nicht möglich gemacht und darf nicht erfunden werden.

## 4. Direkte Zielkorrektur – ab jetzt Auswahl statt Infrastruktur

1. `DISCOVERY`: JEDEN von der Quelle tatsächlich erfassten neu gestarteten Mint einmal als neutralen, eindeutig identifizierten Candidate registrieren. Keine Verengung auf 8 Tokens kurz vor 4 Uhrzeit-Checkpunkten. Die umfassende Erfassung ist eine technische Listenoperation, kein kostenpflichtiger GPT-Aufruf pro Token.
2. `PERSISTENCE`: Kandidaten nach Erstsichtung für mindestens 24–48 Stunden über die Checkpunkte weiterbeobachten, auch über Tagesgrenzen und vom Vorlauf in den Handelstest. Relevante Risikosignale können sie vorher aussortieren. Neue Migrationen, Volumenänderungen und echte Pool-Liquidität sollen einen Recheck ermöglichen.
3. `GPT`: GPT ist der einzige Entscheider über Kandidaten-Empfehlung, BUY/HOLD/SELL/NO_TRADE und 1–24 **tatsächliche** Vollanalysen täglich. Der technische Collector darf vorsortieren, aber keinen historisch bekannten Sieger künstlich auf die Kandidatenliste setzen. Bei Realtime-Ausbrüchen braucht es zudem ein überprüfbares Event→GPT-Signal, nicht nur 4 fixe Termine.
4. `REVIEW`: Für jeden as-of entdeckten Kandidaten Mint, Chain, initiales Event, Vorlauf, nachfolgende bis dahin bekannte Merkmale, Auswahl-/Ablehnungsgrund und damaligen Stand des echten verfügbaren Paper-Kapitals festhalten. Spätere Preislabels nur nach **unveränderlichem Commit** der ursprünglichen Entscheidung zur Validierung öffnen.
5. `PROOF`: Vergleiche Treffer, übersehene Kandidaten, Scheinalarme, Einstiegs-/Exit-Latenz. Buy/Sell nur mit belastbaren damals verfügbaren bidirektionalen Kosten-/Slippage-/Sellability-Nachweisen; sonst `UNVERIFIED`, 5.000 TEST-USDC nicht als Handelsgewinn ausgeben.

**Wichtig:** Da PIERRE/FTR/Dacity/Trump jetzt nachträglich aufgelöst sind, darf eine Anpassung nach diesen Fällen NICHT erneut als unvoreingenommener Gewinn-Blindtest auf denselben Tagen gelten. Die Korrektur muss auf danach ungesehenen, chronologisch versiegelten Tagen unabhängig geprüft werden.

## Nachweise / Pfade

- Vorab eingefrorene GPT-Auswahl: `research/r29/operations/blind-october-2026/R29_OCT_320_MINT_GPT_BLIND_REVIEW_SEALED.json`, Commit `525446cc631b10cd40c80780a9d8dfca86a11060`.
- Originaldaten-Quellen- und Kalenderbericht: `research/replay-120d-real/results/R29_OCT05_21_BLINDTEST_READINESS_REPORT_20261117_DE.md`, CI `44158031458`.
- Vollvergleich aller 17 Launchdateien und benchmark-spezifische Contract-/Name-/Ticker-Zählungen: [Github Actions Run 44160022497](https://github.com/127027/Sniperbot-/actions/runs/44160022497), Artefakt `r29-oct-posthoc-full-launch-identity-recall-no-trades` (enthält die exakten historischen Mint-Matches). Analysecode auf `codex/r29-oct-posthoc-recall-20261117` unter `research/replay-120d-real/october-posthoc-contract-recall.py`.
- Name-/Mint-Quellen erst **nach** Freeze: DexTrading PIERRE/Dacity/Trump, KuCoin Alpha FTR. Keine Handelsberatungs- oder Pumpversprechen daraus ableiten.
