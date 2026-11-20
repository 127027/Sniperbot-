# R29 V6.5 – zusätzlicher manueller GPT-Full-Review am 20.11.2026, 17:08:45 UTC

**Art:** einmalige, vom Benutzer ausdrücklich angeforderte sofortige Ausführung der **bestehenden** `R29 GPT Forward Paper Scanner`-Automation (keine neue Automation). **Ausgang:** `NO_ACTION`, **kein BUY**, **kein GitHub-Order-Pointer**, **kein PAPER_FILLED**. PAPER_ONLY; Guthaben, Wallet und lokale Orders nicht berührt.

## 1. Tatsächlich beobachtete Prospektivdaten

- GitHub-Research-Pool-Snapshot `research/market/latest.json`, Git-Blob `32ec4344ff72e8572a6b2368a2dcc9226ce2a311`, tatsächlich beobachtet **2026-11-20T16:51:07.807Z**. Zum Review-Abschluss ~17 Minuten alt; ein Snapshot darf nicht als gerade ausgeführbarer Echtzeitpreis behandelt werden.
- **48 veröffentlichte Pool-Kandidaten**, **48 öffentliche V6.4-Ranking-Token-Leads**, **24 persistente WATCH-Beobachtungen**, **24 Research-Alerts**, **5 Nachrichten- und 24 DEX-Narrative-Leads**. Insgesamt bis zu **120 Kandidaten-/Beobachtungsdatensätze**, **nicht 120 nachweislich eindeutige Coins**; möglicherweise Überschneidungen. Von 48 Pool-Kandidaten sind mehrere nur `PROVIDER_ONLY`.
- `R29_RANKING_CROSS_PROVIDER_POOL` im kanonischen Snapshot: **0**. Die V6.5-Dateien sind im GitHub-Branch gemergt, aber die aktive V6.5-Integration auf diesem Windows-Collector ist durch diesen Snapshot **nicht bewiesen**. Möglich: noch alte lokale Dateien, fehlende Gegenpartien, Provider-Rate-Limits; **Ursache nicht belegt**.
- Getrennte lokale Nutzeranzeige (vom Nutzer geliefert): 18:03:01 MEZ lokaler Scan mit 57 Pools. GitHub-Canonical-Snapshot 17:51:07 MEZ mit 48 Pools; nicht als identisches Zeitfenster/gleiche Menge darstellen. Der aktuelle GitHub-Source-Health-Bericht meldet `LOCAL_COLLECTOR_STATUS_MISSING_OR_INVALID` trotz späterem Windows-Exit-Guard-Heartbeat. Prüfe die Veröffentlichungskette.
- Unabhängiger GitHub-Sicherheitsbericht `research/r29/channel/gpt-paper-security.json` um **16:53:34.602Z**, zwei konkret geprüfte EVM-Contracts, beide `full_gpt_buy_gate_passed=false`.
- Zusätzlich eigenständige Web-Recherche zum Beobachtungszeitpunkt **17:07–17:08 UTC**, unabhängig vom alten Quellenranking und ohne Rückgriff auf bekannte historische Gewinner-/Posthoc-Listen.

## 2. Aktuelle individuelle Kandidatenbewertung (8 Detailfälle)

| Kandidat / Chain und eindeutige Identität | Befund aus tatsächlich vorhandener Quelle | GPT-Entscheidung und fehlender BUY-Nachweis |
| --- | --- | --- |
| BSC `0x9f4fb8f7a68f6f3175cebbc95d664ac3233b5809`, Pool `0x3f8f4e2baed6fe3ca5c302cef846330dc379afde` | Canonical: ca. 63.295 USD Liquidität, 12.663 USD m5 Volumen, 39 Käufe/18 Verkäufe; Cross-Provider-ID in Beobachtungsfeed | **REJECT für BUY**: unabhängiger Honeypot-/Sellability-Test nicht bestanden, Token-/Pool-Zuordnung in Honeypot-Prüfung nicht bestätigt; keine ausführbaren Zweiweg-Quotes |
| Ethereum `0xd67d78d207ce729f74cb823d74076ed57080d78c`, Pool `0x22818d4c5ad33846b5cb3bcba977c0b0054db264` | Canonical: 50.725 USD Liquidität, aber nur 1 Kauf/0 Verkäufe und ca. 1.293 USD m5 Volumen | **REJECT für BUY**: Proxy-Risikoflag und fehlende essentielle Contract-Autorisierungsindikatoren; vollständige LP-/Quote-/Sellability-Nachweise fehlen |
| Solana `61x8d8qX6MHEANbkpZqEmweb2xFJEw2C7uGG1FsvdcGm`, Pool `Afj4xQPbYV5oSMe3dvRb7jUaLyi2QHoCP3oeomNa9DVR` | Canonical: ~29.703 USD Liquidität, ~61.796 USD m5 Volumen, 362 Käufe/241 Verkäufe | **WATCH Forschung**, ungewöhnlich hohe Volumen-/Liquiditätsquote (~2,08) und fehlende Maker-/LP-/Mint-/Sellability-Beweise; Solana-Paper-Executor ist nicht abgenommen |
| Solana `AbUcsuRpLZc3rNXGCWFbRTSX9gXKDx1LposWTL9hb5yB`, Pool `ByiHZi6nQXVJ788qeq5ZKR6FLymA6oaG1xnjMKHTD6RS` | Canonical: ~18.469 USD Liquidität, ~16.202 USD m5 Volumen, 136 Käufe/59 Verkäufe | **WATCH Forschung**, keine unabhängigen Mint-/Exit-/LP- und ausführbaren Swap-Quotes; keine Solana-Paper-Executor-Freigabe |
| HUSS Solana `3umHFkiMHyphCkLxtbf8Aabie8r5hxn86QeBAovTpump` | DexTrading um 17:07 UTC: 0,0001946 USD, +463 % 24h, 404.400 USD 24h Volumen, 30.900 USD Liquidität, Pool `PumpSwap HUSS/SOL` **ohne im Quelltext bestätigte exakte Pool-Adresse** | **WATCH Forschung**, frühes Momentum ist nicht mit sicherem/noch nicht gestiegenem Einstieg gleichzusetzen; Poolidentität, Holder/LP, Mint, bidirektionale Quotes und Solana Executor fehlen |
| Community Token Solana `5quizdFsXvV3DKu8LgvnSkwDLKn5r8q5QQ3Ynq3hpump` | DexTrading um 17:07 UTC: 0,00007812 USD, +173 % 24h, 217.100 USD Volumen, 18.800 USD Liquidität; kurzfristige 5m-Bewegung -20,34 % | **WATCH / keine BUY-Eignung**, ungesicherte Sellability/Pool-ID und jüngster Rückgang; Solana Executor nicht abgenommen |
| GATO/GTA6CAT Solana `HsprHxBRgiVaQdRf3TnKNuZZtaX9JUSPgMFdAkk6pump` | Unabhängige MEMECOINY-Washtrade-gefilterte Liste: +115 % 24h, ~195.320 USD Poolliquidität, Volumen ~620.430 USD; Seite hat Zeitangabe '20 Nov, 17:20' **ohne explizite Zeitzone**, als Web-Sichtung, nicht als spätere Erstsichtung ausgeben | **WATCH Forschung**; kein nachgewiesener EVM-ähnlicher Solana-Mint-/LP-/Sellability-/Quote-Nachweis; ohne exakten lokalen Pool und Paper Executor kein BUY |
| 蚂蚁, BSC (unaufgelöster Namens-Lead) | DexTrading-Narrative 16:55 UTC: als ~3h jung mit Käufer-/Verkäufer-Verhältnis ~1,9 genannt | **RESEARCH ONLY**, Chain bekannt, aber Contract und Pool nicht unabhängig identifiziert; Namens-Duplikate möglich, keine Order |

**Wichtig:** Das sind acht vertieft besprochene Forschungsfälle, nicht acht vollständige Contract-Sicherheitsprüfungen. **Nur zwei** lokal dokumentierte EVM-Provider-Sicherheitsprüfungen sind vorhanden, und beide scheiterten an BUY-Voraussetzungen. Kein Fall verfügt über den erforderlichen zeitnahen kompletten Ausführungs- und Exit-Beleg.

## 3. Unabhängige aktuelle Webquellen und überprüfbarer Evidenz-Hash

- [DexTrading, narratives](https://dextrading.com/narratives), Datenstand auf der Seite: 2026-11-20T16:55:00Z. Names-only-Trends sind keine eindeutigen Contracts; HUSS/Community wurden erst durch einzelne token-spezifische Seiten untersucht.
- [DexTrading HUSS mit Contract](https://dextrading.com/tokens/solana/3umHFkiMHyphCkLxtbf8Aabie8r5hxn86QeBAovTpump), Datenstand 17:07 UTC.
- [DexTrading Community mit Contract](https://dextrading.com/tokens/solana/5quizdFsXvV3DKu8LgvnSkwDLKn5r8q5QQ3Ynq3hpump), Datenstand 17:07 UTC.
- [MEMECOINY unabhängiger Washtrade-gefilterter Markt](https://www.memecoiny.pl/en/market/leaderboard), abgerufen während dieser Recherche; Quellzeile 'Nov 20, 17:20' ohne Zeitzone. Der Anbieter filtert Pool-Alter unter 72 Stunden und ist damit für hyperfrühe Starts unvollständig.

**Unabhängige Webdomains:** 2 (dextrading.com und memecoiny.pl). Der folgende Hash ist **SHA-256 des tatsächlich hier protokollierten normalisierten Quellen-Evidenzmanifests**, **kein** Hash vollständiger fremder HTML-Seiten und **kein** Echtheitsnachweis der Anbieter:

`4fa06e05e547a3bd424d0628ea96aba12842dd3e411f4fa654c95345d240f0be`

```text
R29_V65_WEB_EVIDENCE_MANIFEST_V1
observed_at_utc=2026-11-20T17:07:56Z
https://dextrading.com/narratives | page_asof=2026-11-20T16:55:00Z | early_tokens=HUSS,Community Token,Mom Mum Mim(Solana),蚂蚁(BSC)
https://dextrading.com/tokens/solana/3umHFkiMHyphCkLxtbf8Aabie8r5hxn86QeBAovTpump | page_asof=2026-11-20T17:07:00Z | price=0.0001946 | liquidity_usd=30900 | volume_24h_usd=404400 | 24h=+463%
https://dextrading.com/tokens/solana/5quizdFsXvV3DKu8LgvnSkwDLKn5r8q5QQ3Ynq3hpump | page_asof=2026-11-20T17:07:00Z | price=0.00007812 | liquidity_usd=18800 | volume_24h_usd=217100 | 24h=+173%
https://www.memecoiny.pl/en/market/leaderboard | page_label_asof=Nov20_17:20_timezone_unknown | Solana_GATO_24h=+115% | liquidity_usd=195320
github:research/market/latest.json | blob_sha=32ec4344ff72e8572a6b2368a2dcc9226ce2a311 | observed_at_utc=2026-11-20T16:51:07.807Z | 48 pools 48 ranking leads 24 watch
github:research/r29/channel/gpt-paper-security.json | asof=2026-11-20T16:53:34.602Z | BSC and ETH candidates full_gpt_buy_gate_passed=false
```

Der SHA-256 wurde aus exakt diesen Manifestzeilen einschließlich terminalem Zeilenumbruch berechnet. Die externen Seiten sind dynamisch; Preise und Zeitangaben gelten nur zum dokumentierten Quellenzeitpunkt.

## 4. Strategisches Ergebnis und Übergabe

**Modellentscheidung: `NO_ACTION` für neue Paper-Orders.** Es gab keine aktuellen ausreichend vollständigen BUY-Gates (Contract-/LP-/Honeypot-/Sellability-/ausführbarer Buy/Sell-Quote-/Slippage-Nachweis plus autorisierte Exit-Policy). Deshalb wird **kein BUY-Archiv, kein V3-Pointer und keine Order** veröffentlicht. GitHub-Kurier und lokaler Paper-Ledger bleiben unverändert. Die zwei alten lokalen TEST-Trades sind keine GPT-Trades.

- **Befund V6.5-Deployment:** 0 öffentlich bestätigte `R29_RANKING_CROSS_PROVIDER_POOL` in der aktuellen kanonischen Stichprobe, daher tatsächliche Windows-Aktivierung der Funktion unbekannt.
- **Anzeigeabweichung:** Nutzer-Dashboard 3/12 Reviews, beim Nachlesen im GitHub-Journal bereits 4/12 vor diesem manuellen Review. Erst nach erfolgreichem Indexupdate und Empfang frischer Kurierdaten kann ein fünfter echter GPT-Review lokal erscheinen.
- **Aufgabenstand:** Der zusätzliche manuelle Review wurde tatsächlich als ChatGPT-Modellrecherche mit zwei voneinander unabhängigen Webdomains durchgeführt. Modelleinträge und GitHub-Commit sind **keine unabhängige kryptografische GPT-Attestierung**.
- **Nächste fällige echte Analyse:** nicht vor 18:08:45 UTC (19:08:45 MEZ) bei mindestens 60 Minuten Abstand. Die bestehende stündliche Automation und deren Zeitplan bleiben unverändert.
