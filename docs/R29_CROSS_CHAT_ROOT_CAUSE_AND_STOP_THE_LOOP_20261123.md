# R29 – Chatübergreifende Bestandsaufnahme: WIRKLICHE Ursache und Verbot von Doppelarbeit

**Prüfstand:** 23.11.2026, 21:41 UTC. **Repo:** `127027/Sniperbot-`, nur `codex/r29-cleanroom-paper-20261121`. **Sicherheitsmodus:** Kein Echtgeld, keine neuen Paper-Client-Orders, keine Dot-Automationsänderung, kein alter Legacy-Bot-Code. Dies ist die gemeinsame Übergabe für weitere Chats und Dots.

## 1. Warum es wie ein Kreis aussah

Die bisherigen Entwicklungsrunden bearbeiteten **verschiedene Prüfziele** unter demselben Etikett „Backtest-Fortschritt“:

1. **Legacy-Codebranch** `codex/r29-chatgpt-github-paper-cycle-20261115`: 43 Tage Solana-Minutenfeature-Daten (24.09.–05.11.2026) mit **5.645.886 Rohfeature-Zeilen** und 1.032 stündlichen Frame-Endpunkten waren belegt. Doch der explizite alte Frameexport speicherte **nur die ersten acht** neutralen Kandidaten je Stunde (8.256 Kandidatenbeobachtungen statt vollständiger stündlicher Marktidentitäten). Quelle: `research/replay-120d-real/43_TAGE_MINUTEN_DATEN_QUELLEN_AUDIT_DE.md` auf diesem ALTEN Branch. Im alten Dokument steht außerdem: **0 echte GPT-Replays**, **0 historische eigene Kauf-Verkaufs-Belege**. Historische Daten wurden nachträglich veröffentlicht und bevorzugen aktive Token. Nicht die Legacy-Bot-Software übernehmen.
2. **Aktueller Cleanroom V2.3–V2.5**: Zwei bereits archivierte Sha-fixierte Oktobertage, mit **24 neutralen Stundenstichproben à 8 Mint-Adressen = 192 Mints**. Diese 192 waren **nie** der vollständige 12.-Oktober-Markt und auch **nicht** die 65 späteren Gewinner. Stundenweise waren in den jeweils nur **letzten fünf Minuten** tatsächlich **2.598 frische Mint-Vorkommen** gezählt, jedoch nur **192 konkrete Mint-Adressen exportiert**. Gleichzeitig gab es **11.226 Feature-Zeilen** in diesen 24 × fünfminütigen Fenstern. Das umfasst nur **120 der 1.440 Tagesminuten**.
3. **V2.4** hatte 16/16 konkrete Mint+Pool-Zuordnungen heute via GeckoTerminal bestätigt. **V2.5 [#45266204458](https://github.com/127027/Sniperbot-/actions/runs/45266204458)** begann weitere **176 post-event Mint-/Pool-Recherchen** mit geteilter öffentlicher Anbieterquote, während Dot2 verständlicherweise neue Capture-Requests zurückstellte. Mehr Treffer derselben 192 lösen die fehlende historische Gesamtpopulation NICHT.
4. **Bestehende Softwaretests** liefen zuletzt **880/880 erfolgreich**, beweisen aber ausschließlich implementierte Sicherheits-/Datenregeln. Die originale QA-04-Abnahme bleibt **13/60 Nicht-Backtest-Aufgaben PASS = 21,67 %, acht externe Beweisblocker**. Eine hohe Testzahl ist KEIN belegtes historisches GPT-Paper-Ergebnis.

**Verbindliche Entscheidung ab hier:** Keine erneuten V2.3/V2.4/V2.5-Einzelmint-Proben als „weitere 12.-Oktober-Backtest-Fortschrittsprozent“ deklarieren und keine neue Schleife von 24 × acht neutralen Scans starten. Vor jeder weiteren Implementierung muss ein **neuer datierter, SHA-prüfbarer Beweis** entstehen, der einen originalen Abnahmeblocker tatsächlich reduziert.

## 2. ENDLICH ein nachweislicher Datenumfang-Sprung – V2.6

**[GitHub Actions #45272055484, SUCCESS](https://github.com/127027/Sniperbot-/actions/runs/45272055484)**. Neuer, separat erstellter Source-Only-Code **`scripts/v26-rebuild-oct12-full-raw-feature-population.py`**, isolierte Workflow-Datei `.github/workflows/cleanroom-v26-explicit-full-oct12-raw-parquet-coverage.yml`, Python-Sicherheitstests `test/v26-full-parquet-coverage.test.py`. Kein alter Bot-Code wurde kopiert.

Der V2.6-Lauf hat die beiden unveränderten Parquet-Dateien aus der ursprünglichen Hugging-Face-Version `9b9a04e7e3e85775d614d16105daad2e69ce8544` tatsächlich erneut geladen und über SHA-256 **und** Zeilenzahl überprüft:

| Quelle | Exakter SHA-256 | Rohfeature-Zeilen | Akzeptierte Mint/Zeit-Einträge |
|---|---|---:|---:|
| `data/features/2026-10-11.parquet` | `31ee4072b892ac91def9ea64152426acb3f4c7a1749ce63085203bc44f5be786` | 121.882 | 121.882 |
| `data/features/2026-10-12.parquet` | `c455b6b6761aba0ff17337e018d068f256f4141be8290e7cbde615d6457bd20d` | 137.969 | 137.969 |
| **Zusammen** | **beide Originaldateien SHA-PASS** | **259.851** | **259.851** |

Nun werden aus **allen** dieser Einträge **24 chronologische, nach Mint deduplizierte** Research-Snapshots aufgebaut. Eine Row mit Featurezeitstempel **exakt auf dem Scan-Tick oder danach** ist ausgeschlossen. Ergebnis des tatsächlich ausgeführten V2.6-Sourcejobs:

- **00:00 Uhr, 12.10. UTC:** **30.181** unterschiedliche Solana-Mints im bisherigen aus **11.10.** rekonstruierten Feature-Speicher.
- **23:00 Uhr, 12.10. UTC:** **63.890** unterschiedliche Solana-Mints im bis zu diesem virtuellen Tick kumulierten **11./12.-Oktober**-Research-Speicher.
- Full-SHA validierte Sourceblobs; **alle späteren Gewinner-/Rug-/Outcome-Spalten bereits beim Decoding ausgeschlossen**, nur `mint` und `t` wurden geladen. Eine identische Mint mit vielen Featurezeilen zählt nur einmal in `unique_mints`.
- Unveränderliches ursprüngliches 43-Tage-Framearchiv **#14312891173, Run #44048309420**, Abgleich am alten Tag-SHA, beide Original-Raw-SHAs separat. Neues komprimiertes GitHub Source-Artefakt **`r29-v26-full-oct12-raw-neutral-source-45272055484`, ID #14865617008** mit `final-audit.json` und `neutral-oct12-full-feature-mint-visibility.json.gz`.
- **0** Original-GPT-Reviewreceipts, **0** historische tradable 50-USDC-BUY/SELL-Quotes, **0** echte Paper-Fills, **0** Orders.

**Wichtige Einschränkung:** Auch 63.890 bedeutet **NICHT** vollständige Erfassung aller Solana-Starts oder aller sechs Chains. Der einzelne Rohdatenanbieter bevorzugt möglicherweise aktive Coins, die Originaldaten wurden erst im November veröffentlicht; ein Token-Ereignis mit Zeitstempel vom Oktober ist **kein Beweis**, dass Dot2 die Information damals empfangen hat. Vor 11.10. existierende ältere Pools fehlen weiterhin aus dieser Zwei-Tage-Rekonstruktion. Das Dataset ist ein größeres **postevent Research-Universe**, keine Trading-/Original-as-of-Freigabe.

## 3. Relevante Entscheidungen aus vorangegangenen Chats (nicht vermischen)

- Nutzer verlangt **Cleanroom auf eigenem Branch** und **keine Übernahme des alten Bot-Codes oder alter Handelslogik**. Alte Reports sind Forschungsquellen, keine Ausführungsberechtigung.
- Für den 12.10.2026 00:00–13.10. 00:00 UTC werden **fünf Dots** geprüft: Dot1 adaptive **4/8/12/24 GPT-Vollreviews/Tag** (nicht 24 Provider-Scans oder 24 synchronisierte Internetabfragen), Dot2 breite kontinuierliche Market-/Pool-Discovery inklusive älterer Pools, Dot3 unabhängig belegte Risiko-/Buy-Sell-Liquidität, Dot4 BUY/HOLD/SELL bei 50 TEST-USDC je Coin mit einem isolierten Startguthaben 5.000 TEST-USDC, Dot5 unveränderliches QA-/Kettenjournal.
- Die **65 rückblickenden Referenzmeldungen** (46 vorläufig meme/meme-nah, 19 unklar) gehören ausschließlich zur **Bewertung nach** einem unabhängig chronologischen Durchlauf. Manche Einträge sind Pool-/Chain-Dubletten, nicht alle Peaks sind nachweislich vollständig während dieses Tages und nicht alle sind handelbar.
- Der Oktober-Diagnosetag bleibt ein **Entwicklungstest**. Nach konsistenter Quellen- und ausführbarer BUY/SELL-Kette benötigt R29 einen **neuen unbekannten 24h-Holdout**.
- Reale 24/7-Paper-Clientfunktion am Windows-Laptop ist getrennt vom theoretisch rekonstruierbaren Research. Die 982 gespeicherten November-Pools/587 Erstcapturen beweisen **nicht**, dass am 12. Oktober 982/65 Coins erkannt worden seien.

## 4. Konkrete Reihenfolge der verbliebenen Root-Blocker – keine Doppelarbeit

| Reihenfolge | Echter Blocker | Was als nächster NEUER Beweis zählt | Wann erfolgreich |
|---:|---|---|---|
| 1 | **Historische Universums-/Kausalitätsabdeckung** | Multichain-Events aus tatsächlich datierten historischen Quellen mit Chain+Mint+Pool und Originalpublikations-/Finalitätszeitpunkt; insbesondere die 65 Referenzkandidaten erst im nachträglichen Oracle-Abgleich. Das neue Solana-Research-Universe darf nicht einfach als authentifizierter damaliger Provider-Capture markiert werden. | Zeitgerechte, eigenständig belegte Discovery-Quellen einschließlich Nichtgewinnern |
| 2 | **Dot3 D3-04/D3-05** | Historische Contract-/Issuer-, Pool-/Reserve- und tatsächliche 50-USDC-Hin-/Rückswapdaten einschließlich Gebühren, Liquidität und Slippage, **für dieselbe Pool-ID** | Erstmals unabhängiger Source-SHA + plausible Ausführbarkeit, NO_TRADE bei Unsicherheit |
| 3 | **Dot1–Dot5 echte Transkripte** | Originale GPT-Reviewreceipts mit Request-Hash, unveränderlich dokumentierter Input-Sicht, Output-Hash, realem GPT-Laufzeitpunkt, 4/8/12/24 Regel und stündlicher Exit-Kontrolle | Keine Verwechslung von Algorithmus-/CI-Ticks mit GPT-Reviews |
| 4 | **Windows-Client-E2E** | Durchgängiger PAPER_ONLY GitHub Signal → lokaler Empfang → berechtigter Paper-Fill → Receipt/Exit und Notstopp, ohne echte Geldmittel | Technisch reproduzierbares Papierportfolio |
| 5 | **Holdout und Erfolgskriterien** | Erst nach erstem belegtem historischen Diagnose-Tag: neuer, nicht vorab bekannter Zeitraum, alle Gewinne/Verluste/Kosten | Vergleichbare, bestätigte Erstleistung ohne Gewinner-Orakel |

**Nicht mehr „Fortschritt“ nennen:** denselben 12.-Oktober-Unit-Scan erneut starten; 880 vs. 900 Softwaretests als historischen PnL deuten; mehr November-Gecko-Aufrufe auf die 192 Samples; 63.890 Quell-Mints zu 63.890 Kaufgelegenheiten aufblasen; dieselben 65 Gewinner als Dot2-Startliste verwenden.

## 5. Unveränderte Sicherheits- und Arbeitsregeln

- Nur `codex/r29-cleanroom-paper-20261121`, kein `main`, kein Echtgeld, kein alter Bot-Import, keine zusätzlichen zahlungspflichtigen Anbieter-/OpenAI-APIs.
- 5.000 TEST-USDC nur **isoliertes Backtest-Modell**, keine Veränderung des bestehenden Windows-Guthabens.
- Die laufenden fünf stündlichen Dot-Automationen weder unnötig reaktivieren noch ohne gesonderte Freigabe umstellen.
- Weiterarbeiten nur an einem **anderen, originalen** Beweisblocker nach Konsolidierung des letzten SHA-Audits. Der zustandsführende V2.5-176-Mint-Lauf **#45266204458** ist getrennt: Ein eventueller Erfolg seiner heutigen Mint-/Pool-Nachfragen darf die QA-04-Original-Akzeptanz nicht erhöhen.
