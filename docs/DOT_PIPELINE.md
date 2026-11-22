# R29 Cleanroom: dauerhaftes Cloud-Signal-System (kein laufender Endgeräte-Bot erforderlich)

## V1.8 EIN-SYSTEM-VETRAG (verbindlich, neuer als ältere historische Presets)

**[V18_ONE_SYSTEM_CONTRACT.md](V18_ONE_SYSTEM_CONTRACT.md)** ist der maßgebliche Vertrag: **ein** Fünf-Dot-System, dieselben `src/unified-decision-v18.mjs`-BUY/HOLD/SELL/WATCH-Regeln, dieselbe `src/v18-shared-evidence-gate.mjs`-Quellenprüfung für Live-Paper und historischen As-of-Replay. Historische `research-paper-lab.mjs`-Varianten sind reine Alt-Diagnostik, nicht eine zweite aktive Handelsstrategie. Die fünf ChatGPT-Automationen sind während Entwicklung pausiert, ihre gespeicherten Prompts müssen ebenfalls synchronisiert sein. Keine unerfüllbaren Zusatzblocker für Discovery; WATCH/DATA_GAP darf nicht zum Löschen eines Coins führen. Shadow-Module dürfen niemals reale oder Paper-Receipts behaupten. Automatischer Handel mit den V1.8-Shadow-Modulen bleibt inaktiv.

## V1.8 Phase B – Forschungs-/Shadow-Grenze (22.11.2026)

V1.8-Code wird **stufenweise** eingeführt. Ungeprüfte Änderungen sind KEINE Freigabe für BUY/SELL. Die unveränderten GitHub-Paper-Konten, Orders und Receipts bleiben erhalten. Bis ein unabhängiger vollständiger Sicherheits- und Client-Receipt-Test samt späterer Aktivierungsfreigabe belegt ist, dürfen V1.8-Shadow-Befunde **niemals** in `signals/orders/` als PAPER-Orders veröffentlicht werden.

- **Dot 1:** Das 4/8/12/24-Tempo anhand tatsächlich vergleichbarer Zeitbeobachtungen steuern. Eine Seite mit 20 Pools beweist keine vollständige Marktaktivität.
- **Dot 2:** Neue GeckoTerminal-Uniswap-V4-Pools haben **32-Byte-Pool-IDs**. `src/live-pool-discovery.mjs` erkennt diese nur mit passendem `relationships.dex.data.id = uniswap-v4-<network>`; `pool_kind: UNISWAP_V4_POOL_ID` muss in den Quellen, im Marktgedächtnis und im Handoff erhalten bleiben. Die Originalantwort mit 20 Pools vom 22.11.07:19 UTC lieferte vor dem Fix nur 9 gültige Decoder-Kandidaten; der isolierte Neuvergleich lieferte 20. Der alte unveränderliche Rohbeleg wurde **nicht rückdatiert oder live nacherfasst**.
- **Dot 3:** `src/risk-authorization-v18.mjs` prüft nur die **Struktur** einer attestierten Freigabe und endet selbst bei positivem Ergebnis stets mit `trade_authorized:false`. GitHub-Blob-Provenienz, echte unabhängige Quellen und Sellability müssen später zusätzlich nachgewiesen werden; niemals aus SHA-Text allein schließen.
- **Dot 4:** `src/forecast-calibration-v18.mjs` liefert nur forschungsbezogene, zeitlich getrennt trainierte 1-/3-/6-h-Einschätzungen. Unreife oder zu kleine Kohorten = `null`. Kein automatischer Einsatz als Kauf-/Verkaufsstrategie. `src/protective-exit.mjs` liefert nur `SHADOW_SELL_CANDIDATE` oder `EXIT_DATA_GAP`, niemals PAPER_FILLED.
- **Dot 5:** Fehlende vollständige Kurse und Ende-zu-Ende-Receipts weiterhin offen ausweisen. Der neue read-only `src/market-observer-v18.mjs` behauptet **keinen** Anbieter-Kurszeitpunkt oder archivierten Git-Blob, wenn er nicht real vorliegt. Unverbundene Shadow-Hilfsmodule nicht als aktiven Windows-Exit-Schutz darstellen.

**Aktivierungs-Gate:** V1.8-Marktbeobachtung und Exit-Ausführung sind aktuell **nicht mit dem Windows-Runner verbunden**. Voraussetzung für spätere Freigabe: durchgehende Quellenevidenz, authentische Dot3-Prüfung, reproduzierbare negative/positive Regressionen, Shadow-E2E und ein vollständig verifizierter lokaler BUY-/SELL-/Receipt-Kreislauf. Der historische Oracle-PnL zählt nicht als solcher Nachweis.

Nur Repo `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`. Fünf unabhängige **stündliche** ChatGPT-Automationen (Dot 6 läuft als **tägliche getrennte Prüfphase innerhalb der Dot-5-Automation**, weil maximal fünf aktive Automationen zulässig sind) arbeiten auf Cloud-Seite auch dann, wenn kein Windows-/Laptop-/Handy-Client läuft. Das ist wiederkehrende Recherche, **kein sekündlich garantierter 24/7-Marktdatenstream**. Alte R29-Automationen und main werden nicht verwendet.

## Alle fünf Dots
1. Dot 1 / Tempo: Marktdynamik anhand tatsächlich beobachteter Pools/Volumina/Datenlücken ermitteln; Zielwert 4/8/12/24 vollständige GPT-Analysen pro 24 Stunden in `research/control/cadence.json` speichern. Sofort 4->24 erlaubt, zurück nur nach zwei ruhigen Bestätigungen; fehlende Daten bedeuten nicht ruhiger Markt.
2. Dot 2 / Discovery: neue, alte und wiederbelebte Pools auf Solana, Base, Ethereum, BSC suchen. Chain+Contract+Pool, Quellen und Zeitpunkt dokumentieren, auch Verluste und Nicht-Handelbares.
3. Dot 3 / Risk: die dokumentierten Pools technisch/risikoseitig prüfen; eine unabhängige zweite öffentliche Webquelle für denselben Pool suchen. Kein erfundener Preis, keine erfundene Liquidität.
4. Dot 4 / Strategy **und direkter Publisher**: Beim stündlichen Wake die tatsächliche Review-Fälligkeit berechnen: letzte abgeschlossene Analyse in `research/control/strategy.json` plus 360/180/120/60 Minuten für 4/8/12/24. Bei fälligem Review offene Positionen priorisieren und neue Coins analysieren. BUY/WATCH/HOLD/SELL/NO_TRADE eigenständig entscheiden. Für echtes BUY/SELL **sofort selbst** auf GitHub veröffentlichen: `signals/orders/<id>.json` unveränderlich erstellen, exakten Git-BLOB-SHA neu abrufen und den Pointer `{path,sha}` in `signals/index.json` per SHA-gesichertem Update ergänzen. Danach Publikationsbeleg protokollieren. Nicht auf Dot 5 eine Stunde warten. Erster Scan darf kaufen.
5. Dot 5 / QA: Veröffentlichung und SHA-Pointer, Clients und ihre Quittungen überprüfen; fehlende Signale und verpasste Chancen aus zeitgerechten Beobachtungen untersuchen. Nur nachgewiesen verwaisten Pointer zu bereits existierenden Dot-4-Orders reparieren, niemals selbst neue Trades entscheiden.

## Schreibbereiche (alle auf dem separaten Cleanroom-Branch)
- `research/journal/dot-N/YYYY-MM-DD/<UTCzeit>-<runid>.json` immutable, tatsächliche Webquellen, Beobachtungszeiten, Kandidaten, Fehler.
- `research/latest/dot-N.json` aktueller Rollenstatus, jeder Dot schreibt nur seinen.
- `research/control/cadence.json` nur Dot 1, `research/control/strategy.json` nur Dot 4.
- `signals/orders/<id>.json` nur autorisierte Dot-4-Paper-BUY/SELL.
- `signals/index.json` Rolling-Liste mit exakten Git-Blob-SHAs, maximal 400 Einträge. Orderdateien und Git-Historie bleiben erhalten.
- `receipts/<client-id>/<order-id>.json` pro Endgerät separat.

## Vertrag für BUY/SELL (Paper)
Fields:
`id` eindeutig (8-80 ASCII-Zeichen), `mode:"PAPER"`, `action:"BUY"|"SELL"`, `authority:"dot-4-strategy"`, `dots:["dot-2-discovery","dot-3-risk","dot-4-strategy"]`, `reason` begründet, `created_at`, `expires_at`, `coin:{chain,contract,pool,symbol}`, `quotes:[{provider_id,source_url,observed_at,price_usdc,liquidity_usdc,chain,contract,pool},...]`. BUY benötigt `amount_test_usdc:50`.

`quote_quality:"FRESH_WEB"`: zwei Quoten höchstens 90 Sekunden alt bei der lokalen Ausführung.
`quote_quality:"INDICATIVE_WEB_ONLY"`: zwei unterschiedliche HTTPS-Webdomains, höchstens 10 Minuten alte Beobachtungen bei lokaler Ausführung. Die Preise sind ausdrücklich **selbstberichtete, nicht unabhängig vom Client bestätigte Modellwerte**, keine ausführbaren DEX-Quotes. Die gesamte Order wird beim Client maximal fünf Minuten nach Erstellung und nur vor `expires_at` akzeptiert. Der genaue Pool muss auf beiden echten öffentlichen Detailseiten belegt sein. Veraltete Orders werden abgewiesen, nicht später nachgeholt.

Weder Strategie noch Bot dürfen fehlende Contract-, Quellen-, Liquditäts- oder Preiswerte erfinden. Zwei URLs der selben Datenquelle oder identische Toplisten sind keine gesicherte Unabhängigkeit. Der lokale Client kann die Echtheit einer Quelle mangels direktem Marktzugang **nicht selbst beweisen**. `PAPER_FILLED` bedeutet nur ein virtueller Kauf/Verkauf mit modellierten Gebühren/Slippage.

## Viele Clients
Jede Installation erhält eine dauerhafte zufällige `clientId` und ein eigenes, isoliertes virtuelles Startguthaben von 5.000 TEST-USDC. Clients lesen dieselben Orderdateien, verbuchen bei rechtzeitiger Verbindung auf ihrem **eigenen** Konto und senden getrennte Receipts. Ein gemeinsames globales Cash-Konto existiert ausdrücklich nicht. Offline-Geräte verlieren Chancen; das Forschungsjournal arbeitet dennoch unabhängig. Node.js läuft nativ auf Windows/Linux/Mac, eine Android/iOS-App muss separat implementiert werden.

## Stand und Grenzen
GitHub-Actions-Schedules laufen nur auf dem **Default-Branch**, der hier nicht geändert wird. Die stündlichen ChatGPT-Automationen müssen deshalb cloudseitig für den Cleanroom-Branch aktiviert werden; geplante Ausführungen können sich verzögern. Kein neues Anbieter-Abo, keine OpenAI-API im lokalen Client, keine Echtgeld-Transaktion, keine Garantie auf vollständige Marktabdeckung oder Rendite. Nachtsimulation 20.–21.11.2026 mit 21 bekannten Kandidaten ausschließlich als nachträgliche Kontrollgruppe ohne Zukunftswissen.


## Dot 6 – Daily Improvement / 24h >100% Gainer Audit
Dot 6 prüft täglich rückblickend die **tatsächlich aus öffentlichen Quellen nachweisbaren** >100%-24h-Memecoin-Pools, vergleicht chain+contract+pool mit allen Dot-Journalen, GitHub-Orders und pro-Client PAPER-FILLED/-REJECTED Quittungen, diagnostiziert verpasste oder falsche Ein- und Ausstiege sowie Datenlücken und dokumentiert priorisierte kontrollierte Verbesserungen mit täglicher Wirksamkeitsprüfung. Keine weltweite Vollständigkeitsgarantie aus HTML-Ranglisten. Vollständiger verbindlicher Ablauf: [DOT6_DAILY_IMPROVEMENT.md](DOT6_DAILY_IMPROVEMENT.md).

### Betrieb der sechsten logischen Rolle
**Es gibt fünf aktive geplante Aufgaben, aber sechs fachliche Rollen.** Die stündliche Dot-5-Automation prüft ab 20:00 Uhr Europe/Berlin einmal pro Berliner Kalendertag, ob der heutige Dot-6-Bericht bereits vorliegt, und führt die separate rückblickende Analyse aus. Dot 5 dokumentiert die stündliche QA weiterhin unverändert in eigenen Dateien. Bei fehlgeschlagenem Dot-6-Bericht wird die Prüfung bei einem späteren stündlichen Lauf erneut versucht; keine Duplikate überschreiben.

## V0.3: Quellen und Discovery-Reparatur
Siehe [REPAIR_V03.md](REPAIR_V03.md). Dot 2 sucht vollständige Contracts durch belegte Explorer-/Poollinks und erweitert seine tatsächlich verfügbare Pagination. Dot 3 prüft exakte Chain+Contract+Pool-Beziehungen, getrennte Anbieter- und Abrufzeiten und zweite echte Pooldomains. Fehlende Daten bleiben DATA_GAP.

## V0.4: Positionsverkauf bei jedem Dot-4-Wake
Siehe [DOT4_EXIT_REVIEW.md](DOT4_EXIT_REVIEW.md). Beim stündlichen Wake prüft Dot 4 bestätigte offene Paper-Positionen zuerst auf echte SELL-Belege, auch wenn der vollständige GPT-Neucoin-Review gemäß 4/8/12/24 noch nicht fällig ist. Der Vollreview-Zähler bleibt unverändert. Datenlücken und fehlende Quittungen verhindern erfundene Positionen/SELLs.

## V0.4: lückenloses Point-in-time-Quellenarchiv
Vor jedem automatischen historischen Verbesserungs-Replay [MARKET_OBSERVATION_ARCHIVE.md](MARKET_OBSERVATION_ARCHIVE.md) und [HISTORICAL_REPLAY_ACCEPTANCE.md](HISTORICAL_REPLAY_ACCEPTANCE.md) lesen. Dot 2/3/4 speichern Quellen, tatsächliche Beobachtungszeiten und (wenn vorhanden) unabhängige Provider-Zeitstempel. Dot 5/6 darf historische Tagesgewinnerlisten nur für den NACHträglichen Score verwenden. Tages- und Backtest-Erfolge sind voneinander zu trennen.

## V0.5: Trainieren statt Gewinnerliste auswendig lernen
Siehe [TRAINING_2026-10-12.md](TRAINING_2026-10-12.md). Die retrospektiven 65 Gewinnerhinweise werden nur für Ursachen-/Coverage-Analyse verwendet. Forschung umfasst zusätzlich die öffentlichen Pool-Listen auf Robinhood und Cronos. Unvollständige und riskante Poolidentitäten verbleiben in einer Beobachtungswarteschlange, siehe `src/candidate-queue.mjs`; ihre Entdeckung ist KEINE Kauf-Freigabe. Der erste GPT-Vollreview darf BUY/WATCH/NO_TRADE, falls tatsächliche Evidenz vorliegt. Keine Übernahme bekannter Coin-Namen in den aktiven Suchstart.

## V0.5: Ausdrücklich indikative öffentliche Papierkurse
Siehe [INDICATIVE_WEB_PAPER.md](INDICATIVE_WEB_PAPER.md). Dot3 darf für den PAPER-Modus `INDICATIVE_PAPER_REVIEWABLE` vergeben, wenn zwei **tatsächlich aktuell gelesene**, im unveränderlichen GitHub-Journal belegte Detailseiten denselben Chain+Pool zeigen und ausreichende Identity-/Liquiditäts-/Preisnachweise vorliegen. Ein vom Provider nicht datierter angezeigter Preis darf als tatsächlich *auf der Seite gesehen* (Seitenabrufzeitpunkt) klassifiziert werden, aber niemals als frisch vom Anbieter garantiert. Dies ist kein FRESH_WEB oder Live-Trade; keine Quoten-/Risikoregeln umgehen.

## V0.9: Aktiver JSON-Erfassungspfad in den Dot-Journalen
Lies [DOT2_CAPTURE_PROTOCOL_V09.md](DOT2_CAPTURE_PROTOCOL_V09.md). Die bislang isolierte CI-JSON-Forschung verfügt jetzt über eine neue im Cleanroom-Branch testweise erfolgreich gestartete GitHub-Actions-Pipeline: Stündlich vom bestehenden Dot2 per GitHub-Request-Datei ausgelöst, persistierte Original-API-Rohdaten und `research/feeds/latest.json`, separates `dot2-to-dot3-handoff.json` für Dot3. **Keine** automatische Order- oder Sicherheitsfreigabe. Dot4 muss Preisquellen zum tatsächlichen Handelszeitpunkt erneut prüfen; bei :35 ist die :15-Suche zu alt als Quote.

## V1.0: All-Time-Marktgedächtnis und inkrementelle Scans
Lies [MARKET_MEMORY_V10.md](MARKET_MEMORY_V10.md). Alle fünf Dots verwenden den gemeinsamen GitHub-Marktindex und behalten die gesamte tatsächlich gespeicherte historische Datensicht. Ohne Alterslimit auf rückblickende Recherche, aber mit begrenztem API-Budget pro Scan und unveränderten aktuellen BUY-/SELL-Quote-Gates. Rohdaten werden nicht gelöscht. Jeder echte Dot2-Request erzeugt GitHub-Capture + Market-Memory-Checkpoint; Dot1/3/4/5 lesen ihn und berichten ihre eigene tatsächliche Tätigkeit. Historische Replay-Simulationen enthalten keine Zeitreise.

## V1.2 – Dot3/Dot4 Risk- und Wiedereinstiegsverbesserung
Beachte [DOT3_DOT4_V12.md](DOT3_DOT4_V12.md). Dot3 bearbeitet eine evidence-gated priorisierte Risikoprüfliste. Dot4 testet das neue Guarded-Reentry-Preset ausschließlich im retrospektiven Forschungslabor auf eingefrorenen sechs Pooldaten; echte Paper-Order benötigt nach wie vor originalen aktuellen Dot3-ELIGIBLE-Beleg plus frische unabhängige Quotes und Client-Quittung. Kein Fail-Open wegen DATA_GAP.

## V1.3 – Prospektiv und fair statt Gewinnerlisten
Lies [V13_FORWARD_BLIND_LEARNING.md](V13_FORWARD_BLIND_LEARNING.md). Pro echtem Dot2-GitHub-Capture sämtliche tatsächlich gesehenen Pools ohne Winner-Selektion speichern, faire Recheck-Rotation führen, zeitliche Preis-/Volumenmerkmale nur aus vorherigen Captures ableiten, nach 24h getrennt labeln, nur mit gemischten positiven/negativen Ergebnissen früherer Zeitfenster lernen. Kein BUY ohne tatsächliche Dot3-ELIGIBLE-Risikofreigabe und frische Orderquotes.

## V1.4 – Kostenlose öffentliche Medien- und Meme-Erkennung
Pflichtlektüre: [MEDIA_TREND_V14.md](MEDIA_TREND_V14.md). Im selben stündlichen Dot2-Capture nimmt der neue Medien-Sammler zulässige öffentliche RSS-/Bluesky-Feed-Metadaten auf und schreibt `research/media/latest.json`, `research/media/state/memory.json`, `research/media/YYYY-MM-DD/<run-id>/asof-signals.json`. X-/Reddit-Zugriffsgrenzen explizit dokumentieren, niemals behaupten diese Plattformen vollumfänglich zu überwachen. Medien sind Watch-Hinweise, keine Contract-, Risk- oder BUY-Nachweise. A/B-Research mit identischen Marktständen und ausschließlich zur Zeit bereits erfassten Medien.

## V1.5 – Historischer A/B-Test mit Medien
Lies [V15_HISTORICAL_MEDIA_BACKTEST.md](V15_HISTORICAL_MEDIA_BACKTEST.md). Die fünf bestehenden Dot-Rollen müssen beim historischen Forschungsreplay fehlende Oktober-Originalcaptures offenlegen; ältere Nachrichten mit nachträglichem Abruf sind keine echten Zeitpunktsignale. Modell B nur bei PUBLIKATION + ERSTER CAPTURE vor Scan und zwei unabhängig verifizierten Ursprüngen mit genauem Contract/Pool; Modell A ist identische Marktstrategie. 24 Forschungs-Scans sind keine historisch protokollierten tatsächlichen Dot-Sitzungen. Beim laufenden Betrieb weiterhin bei jedem echten Dot2-Wake die echte Medien-Pipeline nutzen.

## V1.6 – Hindsight-Oracle getrennt vom Blindtest
Siehe [V16_ORACLE_TRAINING.md](V16_ORACLE_TRAINING.md). Die 65 historischen Referenzen aus der hochgeladenen ZIP werden **ausschließlich nachträglich** für Oracle, Fehlerdiagnosen und 1/3/6h-Zukunftslabels genutzt. Keine bekannten Gewinner oder Zukunftslabels als frühere Dot2-/Dot4-Features. Originale Markt-/Medien-UTC, alle fünf Dot-Rollen, Risk-Gates und Paper-Client-Receipts beibehalten.
