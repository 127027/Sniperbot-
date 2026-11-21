# R29 V6.12 – Ursachenanalyse, nachgewiesene Korrekturen und verbleibende Handelslücken

**Stand:** 21.11.2026, vormittags MEZ. Repository `127027/Sniperbot-`, kanonischer Branch `codex/r29-chatgpt-github-paper-cycle-20261115`. Keine Änderung am realen Wallet oder am regulären privaten Paper-Ledger.

## Tatsächlich festgestellter Ausgangszustand

- Der lokale Windows-Bot publizierte in der Nacht weiterhin gültige Paper-Server-, Courier- und Exit-Monitor-Heartbeats. Öffentliche GPT-Paper-Positionen: 0.
- Am UTC-Tag 21.11. wurden bis 08:33 UTC drei modellautorisierte Web-Research-Journale abgelegt (00:25, 07:33, 08:33 UTC). Die Journal-Einschätzungen waren NO_ACTION. Unabhängige Modellherkunft ist damit **nicht kryptographisch attestiert**.
- Der GitHub-Entscheidungspointer blieb seit 19.11. um 22:26 UTC auf einem alten WATCH; kein neuer V4-BUY/SELL-Pointer. Die öffentliche Quittung blieb WATCH, kein nachgewiesener echter persönlicher PAPER_FILLED-Trade.
- Der lokale Collector wurde in V6.9 nach ausdrücklichem Wunsch abgeschaltet; `research/market/latest.json` war seit 20.11. 20:40 UTC veraltet. Ein stündlicher HTML-Webseiten-Review kann weder alle neu entstandenen Coins noch eine fortlaufende 30-Sekunden-Exit-Kursversorgung liefern.
- Die Journale zeigen fehlende doppelte Bestätigung der exakten Chain+Token+Pool-Identität. Einzelne aktuelle HTML-Seiten lieferten teilweise nur Tickersymbole/abgekürzte Token, zeitlich nicht verifizierte Preise oder unzugängliche zweite Pool-Detailseiten. Somit existierte **keine belegte valide frische V4-BUY/SELL-Webpreisbeobachtung**.
- Das V4-Webpreis-Gate in `runner/live-paper-risk.mjs` fordert <=90s Frische. Der Schema-Validator erlaubt maximal 120s. Der GitHub-Kurier pollt in `runner/r29-windows-courier.mjs` standardmäßig alle **45s nach abgeschlossenem Tick**; außerdem erfordert die Zustellung mehrere REST-GETs, Commit-/Blob-/Owner-Validierungen und ein lokales HTTP-Relay. Ein vor dem Archiv-Commit erstellter Preis kann bereits beim Empfang verfallen. Eine alte Webbeobachtung darf nicht neu gestempelt oder als handelbar bezeichnet werden.
- **Wichtiger zusätzlich nachgewiesener Datenfehler:** Der Reviewindex enthielt zwei syntaktisch ungültige Identifikatoren (einmal 33, einmal 31 Hex-Zeichen statt exakt 32). Dadurch verwarf der strikt validierende Windows-Sync **den gesamten Reviewindex**. Die tatsächlichen drei Journalereignisse waren vorhanden; die User-Oberfläche konnte sie nicht zuverlässig anzeigen.
- `target_per_day=12` und `next_due_at_utc=last+60min` standen im selben Reviewindex. Das ist nicht der Sollabstand von 120 Minuten bei 12 Reviews/Tag. Es besteht noch keine beweiskräftige automatische Umplanung der vorhandenen GPT-Automation; ein freier Text zur Frequenz ist keine tatsächliche Ausführung.
- Nur **ein** zentraler V4-Decision-Pointer ist für den Windows-Relay-Kanal vorhanden. Mehrere gleichzeitige Kaufaufträge innerhalb eines Scans erfordern einen belegbar ACK-sequenzierten zusätzlichen Transport. Unkontrolliertes Überschreiben könnte Orderverlust oder Staleness bewirken; V6.12 behauptet daher keine fertige Mehrfach-Order-Ausführung.

## V6.12 gezielt implementierte Korrekturen

1. **Reviewindex repariert:** Die beiden fehlerhaften IDs wurden nachweislich anhand ihrer vorhandenen, unveränderten `web_source_evidence_sha256`-Werte auf exakt 32 Hex-Zeichen korrigiert. Die drei tatsächlichen Ereignisse, UTC-Zeiten, Journale, Quellen-Hashes, Bewertungen und Nummern wurden nicht erhöht oder rückdatiert.
2. **Künftige Indexfehler früh erkennen:** `runner/r29-review-index-integrity.mjs` validiert vor Veröffentlichung alle Journale, IDs und vorhandene Hash-Verweise. Der neue reine Validierungsworkflow `r29-gpt-review-index-integrity.yml` prüft Indexänderungen auf GitHub, **ohne** Coins zu kaufen oder APIs für Marktdaten aufzurufen. Ein Hash beweist Dateiintegrität, nicht die Wahrheit einer Webpreisangabe.
3. **Abgelaufene V4-Signale sichtbar:** In `runner/gpt-paper-github-relay.mjs` wird bei einer owner-/SHA-validen, ansonsten wohlgeformten V4-Entscheidung mit zwischenzeitlich abgelaufener Webpreisbeobachtung **ohne lokalen BUY/SELL** eine öffentliche `REJECTED`-Quittung mit `GPT_WEB_PRICE_STALE_OR_FUTURE` bzw. `GPT_WEB_SOURCE_STALE_OR_FUTURE` geschrieben, statt nur im Courier stderr zu verschwinden. Unverändert: 90s Kauf-Gate, keine verlängerte TTL, keine falschen Fills.
4. **4/8/12/24 Frequenzen prüfbar:** `runner/r29-gpt-review-cadence.mjs` berechnet den nächsten fachlich zulässigen GPT-Review-Zeitpunkt mit 4→24-Aufschaltung ab nächstem mindestens 60 Minuten entfernten Modellreview, 24/UTC-Tag-Obergrenze, UTC-Tagwechsel und der tatsächlichen bisherigen Zahl. Es markiert Widersprüche im Index. Das ist ein Planer für die **bestehende** stündliche GPT-Automation, kein weiterer Scheduler, kein lokaler Strategiebot und keine eigenständige Websuche.
5. **Windows-Regression:** Der ältere signierte Agenten-HTTP-Test berichtet beim SELL-Fehler künftig den tatsächlich zurückgegebenen Blockierungsgrund. Der isolierte Test ist **kein** Beleg für einen GPT-V4-Live-Paper-Trade.

## Technisch notwendige Bedingungen vor einem echten autonomen GPT-Paper-Trade

- Neutraler, zukunftsblinder Kandidatentrichter mit tatsächlich beobachteten exakten Chain-/Token-/Pool-Daten und realen Quellenzeitpunkten, nicht nur eine retrospektive Top-Gewinnerliste.
- Schnelle, unabhängige zweite HTML-Pool-Detailseite mit zeitlich belastbaren USD-Preis-/Liquiditätswerten zu **derselben** Identität und maximal 10% Preisabweichung. Der jetzige GPT-Webbrowser und nicht verifizierte gecachte HTML-Übersichten erfüllen das nicht zuverlässig.
- Die signierte V4-Entscheidung muss *während ihrer tatsächlichen Gültigkeit* (max. 180s, Preis <=90s beim lokalen Gate) den Windows-Kurier erreichen; spätere Quellenpreise dürfen nicht rückdatiert werden. Bei Verfall nur Rejection, kein Trade.
- Echte lokale persönliche `PAPER_FILLED`-Quittung und belegte reguläre Position. Später *neue* valide V4-SELL-Webpreisbestätigung und zweite `PAPER_FILLED`-Quittung. Stündliche GPT-Reviews können Minuten-Pumps und Stop-Loss-Ausführung nicht garantiert abdecken.
- Mehrere V4-Order-Signale pro Scan sind mangels bestätigter ACK-Queue **nicht** abgenommen. Ein einzelner zentraler Pointer darf nicht vor der Windows-Receipt blind überschrieben werden.
- Historische Nacht 20.11. 22:00 bis 21.11. 09:00 MEZ: Die vorhandenen Webjournale und zurückblickenden Gewinnerübersichten reichen für eine **vollständige** minute-by-minute as-of BUY/HOLD/SELL-Simulation nicht. Contract-/Pool-Verlauf, Minutenkurse, negative Kandidaten, Exit-Ausführbarkeit und Originalcapture fehlen teilweise. Gewinnernamen und -prozentwerte dürfen nicht vor den hypothetischen Entscheidungen eingegeben werden.

## Abnahme

Die V6.12-Patches verhindern unsichtbar verlorene/ungültige Review-/Stale-Quote-Ereignisse und dokumentieren einen nachvollziehbaren Frequenzplan. Das bestehende isolierte V6.11-GPT-V4-Testsystem kann weiterhin einen signierten virtuellen BUY→SELL-Durchlauf mit synthetischen Quellenwerten ausführen. **Es wurde mit V6.12 noch kein tatsächlicher Prospektiv-Kauf oder -Verkauf auf dem persönlichen Windows-Paper-Konto nachgewiesen.**

Eine tatsächliche Handelsabnahme ist ausdrücklich erst erreicht, wenn ein konkretes heute neu entdecktes Token mit gültiger Chain/Token/Pool-Identität, unabhängigen tatsächlich aktuell beobachteten V4-Quellen, frischem GitHub-Pointer, Windows-Relay-Receipt `PAPER_FILLED` und späterem neuem V4-SELL-Receipt `PAPER_FILLED` nachgewiesen ist. Sie darf nicht durch CI, WATCH, Datumsdiagramme oder angenommene Höchstkurse ersetzt werden.

**Datenschutz:** Keine Zugangstoken, privaten Wallets, Paper-Bestände oder Echtgeldbeträge werden durch diese Patches nach GitHub geschrieben; GitHub REST und Windows localhost bleiben die einzigen laufenden Bot-Kommunikationsendpunkte.
