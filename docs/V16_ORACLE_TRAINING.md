# R29 V1.6 – Oracle-Training aus der hochgeladenen ZIP

## Sicherheit und Geltungsbereich
Repository `127027/Sniperbot-`, ausschließlich `codex/r29-cleanroom-paper-20261121`. Bestehende fünf Dots, kein sechster Handels-Dot. Nur Forschungs-/Paper-Modell; kein Echtgeld, keine Veränderung von TEST-USDC, `signals/index.json` oder Windows-Client. Keine Oracle-Datei in das Live-Discovery-, Risk- oder Publisher-Modul importieren.

**Quellmaterial:** Original `R29_Oracle_Training_2026-10-12(1).zip`, darunter `manifest_65.json`, `ermittle_oracle.mjs`, `TRAININGSBERICHT_DOTS.md`, `BOT_AUSWERTUNGS_AUFTRAG.md`, `QUELLENKONFLIKTE_BNBCAT.md`, `R29_Audit_65_Coins_Stundenbacktest_2026-10-12.xlsx`. Prüfsumme des Original-Manifesttextes: `e61a5cec7201a118c99df0a4988239776ae4685b358e576bcc57034cf3333760` (SHA-256).

## Echte Befunde aus dem ZIP-Audit
- **65 rückblickende Meldungen**, 16 nichtleere Pool-ID-/Adressfelder, davon nach strenger Syntax **15 gültig**. Die Solana-Pool-ID von `MarsX` (Eintrag 22) enthält einen unzulässigen Base58-Buchstaben. Nicht stillschweigend korrigieren.
- **7** mit historisch im Manifest genannter Token-Contract-Adresse. Diese sind vor der unabhängigen Chain-/Pool-/Tokenprüfung noch NICHT als handelbar bestätigt.
- 49 Meldungen ohne Pool-ID, zehn weitere eingetragene Poolfelder außerhalb der sechs im Cleanroom eingefrorenen Kursverläufe. Die sechs Kursreihen sind **nachträglich ausgewählte Poolbeispiele**, keine originale historische Marktbreiten-Discovery.
- Das hochgeladene Oracle-Skript ist **eine erst auszuführende Abruf- und Forschungsroutine**, kein fertiger Oracle-Ergebnisdatensatz. Die mitgelieferte Excel enthält keine unabhängig nachgewiesenen optimalen Handelsminuten. Keine erfundenen historischen Preise, Verifikationsschritte oder Handelsbelege.

### Code-Prüfung: Vor einer Wiederverwendung beachten
- Exakter Pool und zugehöriger Token müssen unabhängig zugeordnet werden. Im gelieferten Skript kann ohne ursprünglich dokumentierten Contract eine bloße Symbolübereinstimmung als `POOL_SYMBOL_MATCH_CONTRACT_NOT_IN_ORIGINAL_LIST` gelten; das reicht NICHT für Dot3-ELIGIBLE.
- `tryArchivePool` versucht %-Meldungen im HTML dem folgenden Link zuzuordnen. Dies ist eine retrospektive **Heuristik**, keine Zeit-/Identitätsverifikation.
- API-HTTP-Zeitpunkt ist nicht der damalige Kerzen-/Provider-Quotenzeitpunkt. 429, 404, Paginationsgrenzen, unvollständige Minutenreihen und fehlende Liquidität getrennt dokumentieren.
- Die 24h-rollierende Dextape-Prozentangabe und Coinrankings historischer BNBCAT-ATH von angeblich 93,77 USD sind andere Messgrößen. Kein Mittelwert und kein Kauf-Label ohne eindeutige Contract-/Quote-/Dezimal-/Swap-Prüfung.
- Der Quellcode selbst erstellt keine Wallet-Transaktionen. Trotzdem NICHT unbesehen als GitHub-Publisher integrieren.

## Implementierte separate Pipeline
`research/training/2026-10-12/oracle-source/manifest-65.min.gzip.base64`: aus der Original-ZIP **abgeleitete** und gezielt auf acht Identitäts-/Quellfelder reduzierte 65er-Liste. Sie ist nicht das Originalmanifest; Original-SHA und Herkunft stehen oben.

`src/oracle-training.mjs`:
- `auditOracleManifest`: 65 Referenzen mit strikter Chain-/Pool-/Contractsyntax und Zeitreise-/BUY-Sperre.
- `normalizeOracleTape`: vorhandene rekonstruierte historische Anbieterkerzen; ältere, tatsächlich vorhandene Kerzen für rückblickende **As-of-Features** erhalten, Tages-Oracle aber nur im Testfenster.
- `bestCloseOracle`: kleinster früherer Schlusskurs und bester **späterer** Schlusskurs; Candle-Wicks separat als nicht ausführbare obere Schranke.
- `forecastFeatureLabelSeparation`: 24 Modellscans mit `FEATURES_PAST_ONLY`; völlig gesonderte `LABEL_FUTURE`-Ziele für 1, 3 und 6 Stunden. Unvollständige Zukunftsdaten = UNKNOWN, NICHT automatisch 0%/Verlierer. Wahrscheinlichkeiten bleiben `null`, solange keine trainierte Kalibrierung existiert.
- `oracleMissReason`: Ursache mit offenem Daten-/Risk-Status statt fiktivem Kundenprofit.

`scripts/replay-v16-oracle.mjs`: liest ausschließlich den festen historischen sechs-Pool-Bestand `research/training/2026-10-12/frozen-v11/`, hält 5.000 TEST-USDC und 50 TEST-USDC je Coin als unveränderte Forschungsannahme und **prüft, dass die bisherigen V1.2/V1.5-Trades nicht durch die spätere Oracle-Liste verändert wurden**.

Aufruf: `node scripts/replay-v16-oracle.mjs`. Ergebnisse unter `probe-artifacts/r29-v16-oracle-audit.json`, `r29-v16-oracle-coins.csv`, `r29-v16-24-scans.csv`, `r29-v16-features-past-only.json` und `r29-v16-label-future-only.json` (GitHub-Action-Artefakt, kein Trading-Feed).

## Pflichten der fünf stündlichen Dots
**Dot 1 (Tempo):** Tatsächlich beobachtete Markt-/News-Veränderung und Datenlücken für die Auswahl 4/8/12/24 GPT-Analysen benutzen. 24 historische Modellscans NICHT als 24 originale GPT-Wakes ausgeben. Forecast-Fehlerraten erst nach vollständigen Horizonten zur künftigen Kadenzplanung verwenden.

**Dot 2 (Discovery):** 65 bekannte Oracle-Namen/Contracts **niemals** als Vorab-Seed bei historischen oder aktuellen Markt-Scans. Neue, alte, reaktivierte, gewinnende und verlierende Coins weiterhin anhand eigener zeitgestempelter Captures erfassen. Fehlen Pool-Identität, Paging oder Provider, den konkreten Daten-Gap zählen.

**Dot 3 (Risiko):** Unzulässige Pool-ID (z. B. MarsX-ZIP-Eintrag 22), Symbolkollision, unbestätigter BNBCAT-Höchstpreis, Quote-/Providerzeit-Konflikte, Honeypot/Tax/Sellability und zu geringe Liquidität explizit prüfen. Kein Oracle-Wert ersetzt unabhängige Risk-ELIGIBLE-Prüfung.

**Dot 4 (Strategie):** Stündlich tatsächliche Paper-Positionen HOLD/SELL prüfen. Wenn ausreichende **vor dem Zeitpunkt erfasste** Markt-/Meme-Features vorliegen, Prognosen für +20/+50/+100% in 1h/3h/6h als unsichere bzw. unkallibrierte Forschung dokumentieren. Nur bei tatsächlich kalibrierten Wahrscheinlichkeiten aus vorherigen gemischten Daten Zahlen nennen; sonst `null`. Ein echter Paper-BUY benötigt aktuelle doppelte Quote, Dot3-Gate, signierten GitHub-Auftrag und Client-Receipt. 50 TEST-USDC/Coin.

**Dot 5 (Kontrolle + Oracle):** Nach 1/3/6h die künftigen Labels von den FEATURES getrennt freigeben, Prognosefehler und False Positives auch für Nichtgewinner messen, Ursache in NOT_DISCOVERED/PAGINATION/STALE_DATA/CONTRACT_AMBIGUITY/LIQUIDITY_INSUFFICIENT/RISK_REJECT/GPT_NOT_DUE/BUY_GATE/SELL_TOO_EARLY/SELL_TOO_LATE/CLIENT_OFFLINE/DATA_GAP prüfen. Das Oracle nur **nach** dem Blindtest als theoretischen Benchmark anzeigen. Mindestens ein vorab unbekannter Folgezeitraum plus negatives Kontrolluniversum erforderlich.

## Ehrliche Erfolgsdefinition
Ein identischer Modell-PnL nach der Integration ist kein Lernfehlschlag und kein Prognoseerfolg. Oracle ist zunächst ein **Messinstrument**, nicht die durch Nachhinein optimierte Kaufstrategie. Die sechs Kurven können theoretische Kursmöglichkeiten zeigen, aber ohne tatsächliche Daten zu damaligen Risikofreigaben und ausführbaren Quotes keinerlei verifizierte 65-Coin-BUY- oder SELL-Erfolgsquote. Keine Datenverbreitung an `main`; alle bisherigen R29-Protokolle erhalten.
