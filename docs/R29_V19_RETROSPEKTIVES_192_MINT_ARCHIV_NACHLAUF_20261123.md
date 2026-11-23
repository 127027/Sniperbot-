# R29 – SHA-geprüfte neutrale Oktober-Daten an den 24-Scan-Nachbericht angebunden

**Stand:** 23.11.2026 UTC · **Repo:** `127027/Sniperbot-` · **Branch:** ausschließlich `codex/r29-cleanroom-paper-20261121`.

## 1. Was tatsächlich ausgeführt wurde

Der Nutzer hat die Arbeit an der historisch fehlenden Datenversorgung ausdrücklich freigegeben. Die bereits existierende **isolierte 24-Stunden-Offlinediagnose** wurde um eine **erst nach Abschluss der Entscheidungen hinzugefügte** neutrale historische Quellenbeilage erweitert. Der zugehörige GitHub Actions Lauf [#45129883818](https://github.com/127027/Sniperbot-/actions/runs/45129883818) wurde **erfolgreich abgeschlossen**, **744/744 Tests bestanden, 0 Fehler**.

- Konkreter ausgeführter Request-Commit: `701a1760f6ef499a6ca4f07fa299b3e95b3ae9a1`.
- GitHub Actions Ergebnis-Artefakt: [r29-24hour-user-diagnostic-45129883818](https://github.com/127027/Sniperbot-/actions/runs/45129883818/artifacts/14797581421). Das Archiv enthält den 24-Stunden-Entscheidungsbericht, die separate **192-Mint-Forschungsbeilage**, den nachgelagerten 65-Zeilen-Oracle-Vergleich, 24-stündiges Markdown-Protokoll und die Original-Release-Gate-Diagnose.
- 24 **algorithmische** Offline-Prüfzeitpunkte **12.10.2026 00:00, 01:00, ... 23:00 UTC**, 5h Vorlauf ab 11.10. 19:00 UTC.
- Ergebnis: **0 MODELL-BUY, 0 MODELL-SELL, 0 historische GPT-Dot-Originalaufrufe, 0 verifizierte Windows-Paper-Fills**. Keine weitere Authentizität künstlich behauptet.
- Die ursprüngliche QA-04-Gesamtfreigabe bleibt **nicht bereit**: 13 PASS / 46 PARTIAL / 2 OPEN von 61 Originalanforderungen; 13/60 Nicht-Backtest-PASS. 8 separate Beweisgates bleiben offen; **keine** Haupt- oder Wallet-Freigaben umgangen.

## 2. Herangezogene neutrale Quellen

Original GitHub Actions [#44048309420](https://github.com/127027/Sniperbot-/actions/runs/44048309420), Artefakt ID `14312891173`, Name `r29-real-43day-fresh5minute-candidates-no-fills-v2`. Das Artefakt wurde **am 17.11.2026, nach dem historischen Testfenster**, erstellt. Dessen originaler ZIP-SHA256 ist `71665923352ed392e6314cad9afcf9219354cc46390b050019f6426c026b96b1`.

Die zwei tatsächlich aus dem ZIP extrahierten Tagesdateien sind gegen den **jeweils unveränderten SHA256 der Originalbytes** gepinnt:

- `2026-10-11.json`: `7b4e917ec5904ab089452029564baf09fa99bbda9c11e91db8d54a79cd49097c`
- `2026-10-12.json`: `8a03d0b3f065a6f6fd35867cd7c61719fb37f2cca06134aef6a81f14b3d7d3ab`

Der erste neue Workflow-Versuch [#45129558700](https://github.com/127027/Sniperbot-/actions/runs/45129558700) wurde korrekt **fail-closed** abgebrochen: Im Integrationscode fehlten bei der zweiten Tages-SHA zwei Hex-Zeichen. Daraufhin wurden die vollständigen 64-stelligen SHA-Werte in **eine kanonische Konstante** gezogen, mit Regression abgesichert und der Lauf erfolgreich wiederholt. Die ursprüngliche Quelle war in beiden Fällen authentisch vom GitHub-Artefakt heruntergeladen worden; der Fehler lag im Prüfwert.

## 3. Was tatsächlich in den 24 historischen Zeitfenstern vorliegt

| Forschungsabdeckung | Beobachtung |
|---|---:|
| 24 je fünfminütige, **nicht volle 60-minütige** Solana-Pump.fun-Archivfenster | 24 |
| Mint-Nennungen über die 24 Fenster (Wiederholungen möglich) | 2.598 |
| historische Feature-Zeilen in diesen Fenstern | 11.226 |
| acht neutral aus dem separaten Quellarchiv ausgewählte Mint-Adressen je Stunde | 192 |
| unterschiedliche Mints in diesen Samples | 192 |
| Quellfeld `age_at_scan_s` abweichend von aus Eventzeit und Scanzeit berechnetem Abstand (über 1 s) | 191 / 192 |
| bestätigte ausgeführte 50-TEST-USDC-Kauf- und Verkaufsquoten | 0 |
| unabhängig attestierte Onchain-Sellability | 0 |
| alle Coins mit mehr als +100 % an diesem Tag | **unbekannt** |

Der **00:00**-Researchframe stammt aus `2026-10-11.json` mit Abschluss um 12.10. 00:00 UTC. Die **01:00 bis 23:00** Frames stammen aus der entsprechenden `2026-10-12.json`, jeweils nur mit vor dem Scannerzeitpunkt datierten Ereignissen. Der nächste Frame am 13.10. 00:00 wird wegen der exklusiven Testendgrenze ausgeschlossen.

`age_at_scan_s` ist **nicht** als reiner Quellen-Beobachtungszeitabstand zu verstehen: bei 191 Samples stimmt das Feld nicht mit `scan_at_utc - observed_at_utc` überein. In den nachgelagerten Forschungsdaten wird der Abstand deshalb explizit nachgerechnet und das Quellfeld **nicht** als Beleg für historische Kursfrische genutzt. Über die beabsichtigte Ursprungsemantik des Altersfeldes wird nicht spekuliert.

**Nur die absolut notwendige Forschungsidentität wird exponiert:** Solana-Mint-Adresse, historisch behaupteter Beobachtungszeitpunkt, selbst errechnete Sekunden vor Scan, Provenienz `POST_EVENT_NEUTRAL_ARCHIVE_RESEARCH_ONLY`. Vorab später bekannte Outcomes, modellierte SOL-Kurse, Rug- oder Graduation-Flags, FOMO-Gewinner-Labels und selbst attestierte SELL-Freigaben sind **nicht** im neuen Kandidatenansichtsobjekt enthalten.

## 4. Implementierung und Zugriffstrennung

- `src/v19-retrospective-neutral-source-overlay.mjs`: Source-Day-Schema, Originaldigest-Konstanten, 24 chronologische Frames, 192 syntaktisch gültige Base58-Mints, Eventzeitpunkte und sichere Projektion ohne kurshandelbare Felder; fail-closed auf Fehler.
- `src/v19-hourly-scanner-comparison.mjs`: optionale nachträgliche **Forschungs**-Anreicherung von schon abgeschlossenen Stundenentscheidungen, aber keine Rückkopplung in Dot2/3/4 oder das 50-TEST-USDC-Modellledger.
- `scripts/v19-run-explicit-hourly-diagnostic.mjs`: die **24 bisherigen Modellentscheidungen werden zuerst berechnet und eingefroren**, dann erst die SHA-gepinnte ältere Quelle heruntergeladener Dateibytes geöffnet und schließlich die 65er-Oracle-Tabelle als abschließende Vergleichsliste eingelesen. Die Protokolle werden ausschließlich unter `probe-artifacts/` geschrieben.
- `.github/workflows/cleanroom-v19-explicit-24-hour-diagnostic.yml`: ausschließlich explizit committeter neuer Request triggert den isolierten Job; `actions:read`, `contents:read`, nie Handel; heruntergeladen wird allein das bekannte historische Actions-Artefakt.
- `test/v19-retrospective-neutral-source-overlay.test.mjs`: echte Quelle im GitHub-Lauf und synthetische Negativfälle, darunter falscher Mint, zukünftiger Zeitpunkt, Oracle-/Provenienzverletzung, inkonsistente Stunden, unvollständige SHA-Pins.

## 5. Warum 0 BUY/SELL nicht bedeutet, dass der Bot keine Gewinner hätte kaufen können

Der Handels-Backtest selbst bleibt ohne verifizierte **Original-Pool-/Contract-/2-Provider-USDC-Quote-Zeitpaare**, authentifizierte D3-04-Issuer- und D3-05-Sellability-Belege und unabhängige historische GPT-/Windows-Quittungen. Das alte Archiv ist *erst im November veröffentlicht* und enthält keine nachgewiesenen historisch ausführbaren 50-TEST-USDC-Swaps. Eine Retro-2026-Mint-Adresse allein ist keine kaufbare validierte Pool-Adresse. Die 65 gemeldeten +100%-Referenzen sind keine vollständige Gewinnergrundgesamtheit. Deshalb bleiben historische Gewinner-Trefferquote und PnL **unbekannt**, und die Handels-Sicherheitsgates dürfen nicht abgesenkt werden.

## 6. Nächste belegbare Arbeit

**Priorität 1:** neutrale historische Original-Marktdaten über alle sechs Chains **mit vollständiger Chain/Contract/Pool-Identität, und damaliger Quellen-/Providerverfügbarkeit** für 11.10.19:00–13.10.00:00 UTC beschaffen; ebenso passende unabhängige Preis-/Liquiditäts-Originalbytes für **ENTRY und EXIT**. Reine spätere OHLC/Launch-/Volume-Rekonstruktionen bleiben als Retro gelabelt.

**Priorität 2:** tatsächliche D3-04/D3-05-Originalverifizierung von Tax, Honeypot, Holder-, Blacklist-, Freeze- und Sellroute. Nur dann den neutralen Batch wieder durch den **gleichen** 24-Scan- und 5-Dot-Paper-Gate führen, anschließend Referenzen erst nach Abschluss lesen.

**Priorität 3:** die echte autonomen fünf Dot-GPT-Ausführung mit gerichtetem Journal-/Git-SHA-/Windows-Paper-Lot-Receipt nachweisen und separat klassifizieren; aktuelles offline-regelbasierte Replay ist kein echter 24-maliger GPT-Chat-Aufruf.

**Nie:** WINNER-Oracle zum Startscannen verwenden; 192 Mints als nachweislich +100%-Gewinner bezeichnen; synthetische Kauf-Simulation als echten damals möglichen Fill oder reale Bilanz behaupten.
