# R29 V1.3 – Blindes, zeitgerechtes Erkennen statt Winner-List-Lernen

## Nutzervorgabe und Sperren
- Repo \`127027/Sniperbot-\`, nur Branch \`codex/r29-cleanroom-paper-20261121\`.
- Nur PAPER / 5.000 TEST-USDC als bestehendes virtuelles Konto / 50 TEST-USDC je Coin. Keine Echtgeld- und keine unbelegten Paper-Orders, keine Änderung bisheriger Kontostände.
- Die Excel-Datei \`R29_Memecoin_Gewinner_2026-10-12.xlsx\` ist **AUSSCHLIESSLICH nachträgliche Evaluation**. Weder Coinnamen noch Rangfolgen, gemeldete Kursanstiege oder Tagesgewinner dürfen vor der historischen Scanentscheidung in Features, Prioritäten, Trainingslabels oder Watchlists gelangen.
- Kein Prompt, keine Gewichtung und keine Quote darf heimlich anhand dieser Gewinnerliste verändert werden. Aufeinanderfolgende zeitlich gefrorene Datenfenster sind nötig.
- Jede Seite des Open-API-Captures ist eine begrenzte Stichprobe, **kein kompletter Markt**. Sechs Chains, aber je Capture nur eine Chain und eine API-Seite; eine stündliche Dot-Sitzung entspricht keinem sekundengenauen Indexer.

## Was die echte hochgeladene Gewinnerliste belegt
- 65 nummerierte Retrospektivmeldungen mit gemeldeten Anstiegen ≥100 %.
- Unter den 65: 27 Robinhood, 27 Solana, 7 Ethereum, 3 BNB, 1 Cronos.
- Nur **8** direkte Pool-Links. 57 Einträge ohne eindeutig zugeordneten Pool-Link.
- \`Übersicht\`: 64 Dextape-Tagesarchivmeldungen, 1 MemeDesk-Artikel, 45 Meme-/meme-nahe und 19 Projekt-/Utility-Archivmeldungen.
- Laut Originalbeschriftung: **0** Kursverläufe mit einem bereits nachgewiesenen exakt eingegrenzten UTC-Tief-zu-Hoch-Gewinn. Gemeldete Prozentwerte sind keine gesicherten Trades.
- Die sechs eingefrorenen Oktober-Pools sind **post hoc ausgewählt** und haben keine echten zeitgerechten historischen Dot2-/Risk-/Client-Signal-Records.

## Die bislang bewiesene Blockerkette
1. \`research/state/market-memory.json\` vor V1.3: 69 gespeicherte Pools und 69 vollständige Tokenadressen; ein bekannter Pool ist kein autonom erkanntes Kaufsignal.
2. \`planIncrementalScan\` sortierte die gesamte Queue nach dem ältesten \`last_seen\` und nahm immer die ersten sechs. Spätere Einträge konnten verhungern. V1.3 verwendet stattdessen \`src/discovery-fair-queue.mjs\` mit persistierter \`rechecks[key].attempt_at_utc\`; nie geprüfte Pools zuerst, dann am längsten nicht geprüfte, ohne Altersgrenze.
3. \`src/forward-learning.mjs\` speichert **ALLE tatsächlich vom API erfassten Pools** jeder kostenlosen öffentlichen Capture-Seite, unabhängig davon, ob sie später steigen oder fallen. \`research/observations/YYYY-MM-DD/<github-run-id>.json\` mit originalen Capture-UTC, Quelle, Chain+Pool+Contract, beobachtetem Preis, 24h-Volumen, Liquidität. Keine vorherigen Gewinnernamen.
4. Zweiter Beleg von anderem Zeitpunkt nötig. Einzelsichtung ist \`WATCH_INSUFFICIENT_REPEATED_EVIDENCE\`. Rangfolgen sind \`R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING\` und ausdrücklich **NOT_RISK_APPROVED**.
5. Erst **nach Ablauf von 24 Stunden**, mit tatsächlich vorliegenden neuen Beobachtungen im ±60-min-Zielfenster, darf \`labelAfterHorizon\` retrospektiv einen beobachteten Endpunktanstieg ≥100 %, positiven <100 % oder nichtpositiven Verlauf vergeben. Fehlende Quelle = \`UNLABELED_MISSING_24H_OUTCOME\`, nicht 0 % oder Verlierer. Ein Tageszwischenhoch ist nicht gleich Endpunktanstieg.
6. \`src/temporal-learning.mjs\` darf einen Kalibrierungs-Schwellenwert nur aus vollständig **vor dem Holdout** abgeschlossenen und gemischten Gewinner-/Nichtgewinnerfällen ableiten, mindestens 30 gelabelte Pools, darunter 5 positive und 5 negative. Ergebnis ist nur \`RESEARCH_ONLY\`; keine automatischen Handelsparameter und keine GitHub-Orders.
7. \`scripts/audit-v13-learning.mjs\` zählt as-of rankbare Coins, tatsächliche 24h-Labels, echte Precision@K/Recall@K sowie fehlende Daten. Ohne Kontrollen/negativen historischen Ausgangsmarkt gibt es keine zulässige Behauptung, mindestens 10 % der Oktober-Gewinner blind erkannt zu haben.

## Reales V1.3 Smoke-Test-Ergebnis (21. November 2026)
GitHub-Action [44938248515](https://github.com/127027/Sniperbot-/actions/runs/44938248515) erfolgreich, 6 neue Base-Pools (vollständige Contracts) aus \`new_pools\` page 1, alte bekannte Pools fair nachgeprüft. Persistiert:
- \`research/observations/2026-11-21/44938248515.json\` – **6** unselektierte Beobachtungen, 6 Preise und Liquiditäten;
- \`research/observations/2026-11-21/44938248515-asof-ranking.json\` – 6 beobachtet, **0 rankbar**, weil keine zweite zeitlich getrennte Capture zu denselben Pools vorliegt; 
- \`research/state/checkpoints/44938248515.json\` – 6 tatsächlich versuchte DEX-Prüfungen, 63 übrige faire Queue-Einträge, kompletter Quellenpfad;
- \`research/state/market-memory.json\` – 75 Pools, 75 Contracts. 
- **0 echte BUY-/SELL-Orders, 0 Client-Fills.** Ein Pool mit Liquidität von nur wenigen Tausendstel USD ist definitiv kein handelbares BUY-Signal.

## Aufgaben der fünf bestehenden Dots

**Dot 1 – Tempo:** Behalte getrennt API-Observations-Wakes und 4/8/12/24 GPT-Vollreviews. Bei Änderungen des Marktvolumens nur echte Zeitdeltas verwenden; 429 nicht als ruhigen Markt interpretieren. Einige tausend unbekannte Pools dürfen bei API-Limit nicht als "kein Markt" gelten.

**Dot 2 – Discovery:** Bei jedem tatsächlichen Wake genau einen JSON-Request auf dem Cleanroom-Branch starten; danach \`research/feeds/latest.json\`, \`research/state/latest.json\`, \`research/observations/YYYY-MM-DD/<run-id>.json\` und \`...-asof-ranking.json\` öffnen. Aktualisiere die eigene Queue auch mit alten/wieder aktiven Pools. Die Fair-Queue nicht durch Gewinnernamen oder manuelle Überrepräsentation überschreiben. Fehlende Chains / Pages / nicht gezählte Pools als unbedeckte Fläche melden.

**Dot 3 – Risiko:** Jede \`R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING\`-Priorität ist lediglich Forschungsinput. Vor ELIGIBLE müssen aktueller unabhängiger Preis, beide Liquiditäten, verifizierter Quote-Zeitpunkt, exakter Pool/Token, Honeypot/Tax/Sellability belegt sein. Bleibt das unklar: WATCH / DATA_GAP / REJECTED mit konkretem Gate, niemals automatische BUY-Freigabe.

**Dot 4 – Strategie:** Recherchiert neue und reaktivierte Pools mit der gesamten verfügbaren Historie, beobachtet offene bestätigte Paper-Positionen stündlich und plant 4/8/12/24 Vollreviews. Ein realer Paper-BUY ist weiterhin nur mit frischer gültiger zweifacher Quote, tatsächlichem Dot3-Gate, bestehender Publisher/Client-Pipeline und 50 TEST-USDC erlaubt. \`guarded_reentry\` ist bis zum separaten Blindtest nur Forschungs-Preset. Ein hoher Rang ohne Risikofreigabe führt zu WATCH/NO_TRADE.

**Dot 5 – QA:** Pro Lauf nachweisen: Captures, Datenlücken (Source/Chain/Page/429), fair aufgelöste Backlog-Einträge, as-of Scores, erst nach 24h gebildete Labels, positive und negative Fälle, temporal getrennte Trainings-/Holdout-Zeiten, tatsächliche Risk-Gates, GitHub Order-SHA, Client-Receipt. Ziel ≥10% rechtzeitige Erkennung ist **noch nicht gemessen**. Reportiere Zähler und Nenner, keine Winner-Ranglisten als Seed.

## Kriterien für den ersten ernsthaften Qualitätsnachweis
- Mindestens 2 zeitlich getrennte, verifizierte Beobachtungen für jedes bewertete Signal.
- Prospektives Fenster mit **allen tatsächlich erfassten Pools**, nicht nur nachträglich ausgesuchten Gewinnern.
- Nach vollständigen 24h: labelbare Gewinner und Nichtgewinner. Nicht beobachtbare Folgepreise bleiben unbekannt.
- Quantifiziere Precision@K, Recall@K, Missed Opportunity, Datenabdeckung, Entscheidungslatenz, Modell-PnL nach Kosten, tatsächliche echte Order/Fills **getrennt**.
- Unbekannter neuer Tag/Nachtest muss vom bisherigen Training unberührt sein. Schon auf sechs bekannten Oktober-Gewinnern optimierte gute Zahlen sind keine Prognoseleistung.
