# R29 Cleanroom: dauerhaftes Cloud-Signal-System (kein laufender Endgeräte-Bot erforderlich)

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
