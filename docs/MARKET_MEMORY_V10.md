# R29 V1.0 – Gemeinsames Marktgedächtnis und vollständiger Rückblick

## Invarianten
- Nur Repo `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`. Niemals `main`, Altbot, echte Wallet oder Echtgeld.
- GitHub ist dauerhafter Speicher für **vorhandene Quellen**, nicht ein Beweis, dass die komplette Blockchain-Historie jemals abgefragt wurde.
- Der **Zugriff auf verfügbare Vergangenheit ist unbegrenzt**. Ein aktueller BUY-/SELL-Preis bleibt auf verifizierte frische Quellen im tatsächlichen Entscheidungsfenster begrenzt (vorhandene Preis-/Liquiditäts-/Sicherheits-Gates NICHT lockern).
- Die stündlichen Dot-Wakes sind getrennt von 4/8/12/24 vollständigen GPT-Strategiereviews. Keine Behauptung von 60 Minuten Dauerarbeit; jede Ausführung setzt von einem Checkpoint fort.
- Nachträgliche Gewinnerlisten (12.10. und 15.11.2026) sind TRAINING, niemals unabhängige prospektive Entdeckung.

## GitHub-Dateien
- `research/state/market-memory.json`: gemeinsamer persistent fortgeführter Pool-Index, geschlüsselt nach Chain + exakter Pool-ID; erste und letzte Beobachtung, Contract, Konflikte, letzte **nur indikative** Daten, Verweise auf Rohquellen, durchgesehene API-Seiten und offene Pagination.
- `research/state/latest.json`: aktueller Index-Pointer mit Zählwerten und Checkpoint.
- `research/state/checkpoints/<github-run-id>.json`: unveränderliche Fortschritts- und Fehlerbelege zu jedem echten kostenlosen JSON-Capture.
- `research/feeds/<date>/<run-id>/...`: unveränderte API-Antworten und ihr SHA-256, `evidence.json` und `dot2-to-dot3-handoff.json`.
- `research/requests/<date>/<UTC>-dot2-<runid>.json`: ein **einmaliger** von Dot2 tatsächlich ausgelöster Auftrag für die GitHub-Action.
- Vorhandene `research/journal`, `signals/orders`, `signals/index.json`, `receipts`, Paper-Historie und alle Kundenkonten ausdrücklich bewahren.

Keine automatisierte Löschung historischer Quellen, Meldungen, Orders oder Quittungen. Eine sichere Bereinigung erfordert vorher Archivnachweis und dokumentierte Änderung. Das aktuelle `compactMemoryWithoutEvidenceLoss` führt deshalb ausschließlich eine No-op-Prüfung durch.

## Was bei einem Erststart passiert
1. Bestehendes Marktgedächtnis öffnen, sonst mit leerem Index beginnen.
2. Bestehende tatsächlich belegte Dot2-Journale als SEPARATE Altbelege einlesen. Dokumentiere den ursprünglichen UTC-Zeitpunkt und die Quelle; niemals alte Daten zu angeblich frischen Quotes machen.
3. Aktuelle öffentlichen JSON-Seiten und ihre Chain-/Contract-/Pool-Identitäten erfassen; erste Kandidaten und Checkpoints schreiben.
4. Noch nicht erreichte Chains, Seiten und ältere Pools als **offene Arbeit** vermerken. Kein Versprechen, in einer Stunde den ganzen Markt durchzuarbeiten.

## Weitere Scans
1. `research/state/latest.json` und `research/state/market-memory.json` LESEN. Dann `research/feeds/latest.json` + den aktuellen Dot2/3-Journalstand.
2. Pro tatsächlich begonnenem Dot2-Wake einen neuen Request nach `docs/DOT2_CAPTURE_PROTOCOL_V09.md` auslösen. **Keinen** zweiten Request mit demselben Run-ID, keine Dauerwiederholungen nach HTTP429.
3. Der GitHub-Capture verwendet den bestehenden Chain-Rotationsmechanismus und pro ausgewählter Chain abwechselnd die erste, aktuell neue Seite und die nächste bisher nicht erfolgreich durchgearbeitete Seite. So bleiben Neuheiten und ältere ungeprüfte Seiten in Arbeit. API-Quoten und tatsächlich fehlende Seiten ausdrücklich berichten.
4. Neue Beobachtungen in `market-memory.json` mergen: bekannte Pools behalten, Duplikate deduplizieren, widersprüchliche Contracts gesondert markieren, niemals ungültige Quellen zu sicheren Fakten aufwerten.
5. Den nächsten Fortschrittsstand als neue unveränderliche Datei in `research/state/checkpoints/` ablegen. Bei Quotenlimit, Abbruch oder Context-Limit damit weiterarbeiten.
6. Nicht jede ältere Position tiefgreifend prüfen: `planIncrementalScan` begrenzt nur die **Anzahl Detailanfragen pro Wake**, nicht die rückblickend zugänglichen Informationen oder die dauerhaft gespeicherten Coins.
7. Bei jedem Scan ältere und wiederbelebte Pools gezielt beachten. Ein Pool darf nicht wegen 2h, 24h oder Kalenderwechsel aus dem Marktgedächtnis entfernt werden.

**Grenze:** Eine kostenlos abrufbare `new_pools`-Seite ist kein lückenloser historischer Chain-Indexer. Nicht vorhandene Vergangenheit und alte unbearbeitete Pools bleiben explizit `DATA_GAP`. Das Schließen dieser Lücken ist eine getrennte Recherche mit Provider-Kontingenten und tatsächlichem Paging.

## Rollen und Wahrheitskriterien
- **Dot1:** vergleichen mindestens zwei zeitlich verifizierte Beobachtungen. Aus `market-memory` bekannte Gesamtzahl ist NICHT Anzahl neuer Pools der letzten Stunde. Automatisch 4/8/12/24; fehlende Daten nicht als ruhigen Markt ausgeben.
- **Dot2:** Source-of-truth ist der tatsächlich gelesene persistierte Feed plus altes Gedächtnis. Mindestens Kandidatenzahl, vollständige Contracts, neu/alter Pool, Chain, Provider, Zeitpunkt, Quellen-Git-SHAs, Checkpoint/Seiten-Status und offene Queue melden. Die 65 historischen Gewinner **nicht** als Seed eines unabhängigen ersten Scans nehmen.
- **Dot3:** sichtbare vollständige Identität, zwei aktuelle unabhängige zeitgerechte Anbieter, Preis, Liquidität, Steuern/Honeypot/Sellability und Konflikte prüfen. `RESEARCH_ONLY` und `WATCH` dürfen mehrfach vorkommen. Ein guter retrospektiver Chart oder ein vollständiger Contract ist **keine** Kauf-Freigabe.
- **Dot4:** alle bestätigten Positionen stündlich SELL/HOLD prüfen; 4/8/12/24 Vollreviews. BUY am ersten fälligen Review möglich, aber ausschließlich mit gültigem aktuellem Dot3-Risiko und frischen separaten Order-Quoten; `PAPER` 50 TEST-USDC/Coin wie zuvor, keine Wallet. Die Quoten der :15-Suche sind bei :35 möglicherweise zu alt.
- **Dot5** (inkl. täglicher Dot6-Analyse): Quellen, Checkpoints, Memory-Verlust, verpasste Seiten, 429, Dot2→3→4, GitHub-Order-SHAs und CLIENT-Receipts prüfen. Never confuse `RESEARCH BUY_EXPERIMENT` with `PAPER_FILLED`. Nutzerseitig lesbare Vorher-/Nachher-Zähler.

## Historische 24-Scan-Trainingssimulation
`src/historical-candles.mjs` kann mit `historyStartUtc` abgeschlossene Kerzen vor dem Tag einschließen; `src/research-paper-lab.mjs` kann jede bis zum Scan bekannte Kerze als Kontext einbeziehen und benötigt für eine BUY-Modellentscheidung weiterhin einen **jungen, abgeschlossenen** Beobachtungspreis. Im Oktober-Probe werden vorangehende Tage nur für bereits vor Oktober 12 existierende Pools und nur wenn die kostenlose Quelle tatsächlich liefert nachgeladen. Ergebnisse sind keine damaligen Live-Dot-Entdeckungen.

Vergleichsbericht enthält pro tatsächlichem Modellscan: Uhrzeit MESZ, verwendbare Vergangenheit, fehlende Quellen, reine BUY/WATCH/HOLD/SELL-Forschungsereignisse und für jede echte Dot-Rolle die neuesten belegten Daten – ohne historische Börseninformationen in den 12.10. hineinzuschmuggeln.

## Grenzen und Akzeptanztests
- Kein altes Fenster wird wegen Alter/Datum abgeschnitten; alte Poolhistorie im Gedächtnis nach >12 Monaten erhalten.
- Zweit-/Dritt-Wake ergänzt Beobachtungen, ohne Altpool zu löschen.
- Derselbe Rohbeleg wird nicht doppelt gezählt; ein Contract-Konflikt wird sichtbar, nicht still überschrieben.
- Nach API 429 bleibt die bekannte Queue erhalten und ein Checkpoint dokumentiert den Fehler.
- Alle GitHub-Orders/Receipts und Paper-Guthaben unverändert.
- 24-Scan-Backtest separat von echten Dot-Automationen, keine falschen Performance-Erfolge.
