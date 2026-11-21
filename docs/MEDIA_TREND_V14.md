# R29 V1.4 – Öffentliche Medien-/Meme-Früherkennung ohne Kaufsignal

## Rechts-/Kosten-/Architekturgrenzen
Nur \`127027/Sniperbot-\`, Branch \`codex/r29-cleanroom-paper-20261121\`, fünf bestehende Dots, kostenloses öffentlich erreichbares HTTPS, keinerlei heimliches Scraping, keine kostenpflichtigen APIs, keine echten Wallet-Transaktionen, **PAPER ONLY**. Existierende \`signals/index.json\`, alle Receipts, Historie und Konto nicht verändern.

**Wichtig:** Eine stündliche ChatGPT-Automation kann nicht garantiert 60 Minuten im Hintergrund recherchieren. Dot2 löst im bestehenden Cleanroom-Branch genau einen zeitgerechten GitHub-JSON-Capture aus. Dieser erfasst den Markt und im Anschluss innerhalb desselben GitHub-Actions-Laufs automatisch die öffentlichen Medien. Vollständige Weltüberwachung ist weder behauptet noch technisch belegt.

## Quellen im echten kostenfreien Capturer (21.11.2026)
\`scripts/cloud-media-capture.mjs\`, in \`.github/workflows/cleanroom-dot2-capture.yml\` direkt nach dem bestehenden Markt-Capture:
- \`COINDESK_RSS\`: \`https://www.coindesk.com/arc/outboundfeeds/rss/\` (publizierte Artikel-Metadaten)
- \`COINTELEGRAPH_RSS\`: \`https://cointelegraph.com/rss\`
- \`GOOGLE_NEWS_MEME_RSS\`: öffentliche Google-News-RSS-Suche zu Memecoins/Dogecoin (nur Trefferausschnitt)
- \`GOOGLE_NEWS_CELEBRITY_RSS\`: öffentliche News-RSS-Suche zu Trump/Elon + Krypto/Memes
- \`BLUESKY_WHATS_HOT\`: öffentlich zugänglicher Bluesky-Feed, filtert ausschließlich tatsächlich enthaltene Meme-/Krypto-Begriffe. **Nicht** die gesamte Bluesky-Postsuchenfläche. Die unauthentifizierte \`searchPosts\`-API kann HTTP 403 liefern.
- \`X_SEARCH\` und \`REDDIT_SEARCH\`: \`NO_AUTHORIZED_FREE_SEARCH_ACCESS\`, nicht heimlich aufgerufen. X kann bezahlte Such-/Datenberechtigung verlangen. Reddit hat RSS am 13.11.2026 beendet und ändert öffentliche API-Berechtigungen. KEINE kostenpflichtigen APIs ergänzen.

Jede Quelle führt HTTP-Status, konkreten Source-Link, eigene Start-/Empfangszeit, SHA256 der erhaltenen Antwort und begrenzte Metadaten zu einzelnen Posts/Artikeln. Aus Urheberrechts-/Datensparsamkeitsgründen **keine kompletten RSS-Feeds, Artikelseiten, Social-Threads oder X-Scrapes in GitHub speichern**. Ein Nachrichtenaggregator und seine Originalpublisher können dieselbe Geschichte enthalten; Aussagen aus mehreren Websites sind nicht automatisch unabhängige Ereignisse.

## Persistierte Dateien
- \`research/media/YYYY-MM-DD/<run-id>/evidence.json\`: gesonderte Status-/Quellen-Zeitnachweise und öffentlich sichtbare kurze Headlines/URLs/Themen
- \`research/media/YYYY-MM-DD/<run-id>/asof-signals.json\`: ausschließlich vor dem jeweiligen UTC-Zeitpunkt erstmals beobachtete Ereignisse
- \`research/media/YYYY-MM-DD/<run-id>/pool-hypotheses.json\`: allenfalls unsichere Themen-Hypothesen; **0 kaufgenehmigte Coins**
- \`research/media/state/memory.json\`: über Stundengrenzen hinweg unveränderlich referenzierter Medienindex, dedupliziert nach Quell-ID + exakter URL
- \`research/media/latest.json\`: Pointer zum echten letzten Medien-Capture
- \`research/feeds/latest.json\`: ursprünglicher Markt-Capture bleibt separate Quelle und Referenz
- Kein Medienbeleg wird nachträglich als bereits historisch verfügbar ausgegeben: \`published_at_utc\` UND \`first_captured_at_utc\` müssen vor dem simulierten Entscheidungstermin liegen.

## Signalinterpretation
Gezählt werden nur die **innerhalb der tatsächlich abgerufenen RSS-/Feed-Ausschnitte** beobachteten unterschiedlichen URLs; dies ist **kein globales Mention-Volumen**, kein Kurs-/Volumenanstieg, kein echter Trending-Nachweis. Likes/Reposts sind höchstens am HTTP-Capture beobachtete Schnappschusswerte ohne historische Zeitreihe. Eine Geschichte, die erneut gelesen wird, zählt nicht als neue Geschichte.

Dot2 darf aus Meldungen Themen ermitteln, auch bevor es einen zugehörigen Token gibt. **Trump/DOGE/PEPE/Elon** sind mehrdeutig: Der gleiche Name ist **kein** exakter Contract-/Pool-Beleg, kein offizielles Endorsement und kein BUY. Nur durch getrennte tatsächliche Blockchain-Identitäts- und Risiko-Prüfung kann aus einer Hypothese eine spätere Kaufprüfung werden.

## Aufgaben je Rolle
1. **Dot1 Tempo:** Bestätigte Medien-Sprünge sind zusätzliche, aber sekundäre Marktdynamik-Hinweise; Quellenfehler bedeuten nicht ruhigen Markt. 4/8/12/24 echte GPT-Vollreviews adaptiv, stündliche Datenaufnahme davon getrennt.
2. **Dot2 Discovery:** JEDEN tatsächlichen stündlichen Wake \`research/media/latest.json\`, aktuellen \`asof-signals\`-Beleg und den Zeitstempel im selben GitHub-Run wie Markt-Capture lesen. Meme-Themen ohne Token als WATCH-THEMEN aufbewahren, mögliche Coins ausschließlich mit vollem Chain+Contract+Pool belegen. Nur tatsächlich gesehene News/Postquellen zählen. Neutrale Pools weiterhin alle erfassen (inkl. Verlierer und unauffällige).
3. **Dot3 Risiko:** Priorisierte Kandidaten können aus Marktdaten, Medien oder beidem stammen. Unabhängige zeitgerechte zwei Anbieterquotes, genügend Liquidität, Contract-Identität, Honeypot/Tax/Sellability zwingend. Selbst massenhaft virale Posts geben **kein** ELIGIBLE bei DATA_GAP.
4. **Dot4 Strategie:** Bei fälligem GPT-Review historische Market+Media-Checks mit tatsächlichen As-of-Schnappschüssen betrachten, aber keine Medien-Reichweitenzahlen erfinden und niemals einen bekannten späteren Gewinner als historisches Vorwissen einbauen. BUY nur nach echter Dot3-Sicherheitsfreigabe + frischen Quote-Gates. Stündlich bestätigte offene Positionen auf SELL/HOLD prüfen.
5. **Dot5 Kontrolle:** Bei jedem QA-Wake Quelle je Plattform, HTTP-Status, SHA-256, Veröffentlichungs- und Erfassungszeit, Anzahl einzelner neuer Medienereignisse, Coin-Hypothesen, Datenlücken und tatsächliche Dot3/4-Paper-Orders/Client-Fills gesondert ausweisen. X-/Reddit-Sperren offen melden, niemals 0 Beiträge daraus folgern.

## Vergleich A (Markt) gegen B (Markt + Medien)
Beide Modelle erhalten dieselben Kandidaten zur selben Uhrzeit. B erhält NUR diejenigen Medienbelege, die spätestens zu dieser Scanzeit **tatsächlich erfasst** wurden. Die Nachrichtenpriorität ohne irgendeinen verifizierten Token-/Pool-Bezug bleibt eine Beobachtungs-Hypothese. Keine Gewinnerliste als Seed; identische Kosten, Liquiditätsprüfung und Trade-Policy.

Unbekannte künftige Coins, Verlustcoins, virale Nicht-Trendcoins gehören in die Grundgesamtheit. Erst bei kompletten 24h-Folgemessungen und neuer ungesehener Periode Precision/Recall, Falschalarme, Erkennungsverzug, Gebühren-PnL getrennt berechnen. **Aktuell keine bewiesene Verbesserung der Trade-Rendite durch Nachrichten.** Wenn eine Quellenplattform unzugänglich bleibt, kein künstliches Nullsignal für X/Reddit erzeugen.

## Definition von Done
- GitHub-Capture + mindestens eine tatsächlich funktionierende öffentliche Quelle mit belegten Events oder eindeutig dokumentierter Quellenfehler.
- Dauerhaftes gemeinsames Mediengedächtnis, nachvollziehbares As-of-Signal und kein Halluzinieren eines Token-Contracts.
- Alle fünf bestehenden Dots lesen den Vertrag ohne zusätzliche Automationen.
- Grundlegende Code- und GitHub-Action-Tests grün; mindestens ein reales Capture mit Quellenstatus.
- Kein Echtgeld, keine BUY-Freigabe aus Social allein, keine Beschönigung von Fehltrades oder Quellenlücken.
