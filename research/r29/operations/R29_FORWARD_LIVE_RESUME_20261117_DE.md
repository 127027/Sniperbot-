# R29 – Fortsetzung in neuen Chats und Echtzeit-Paper-Handel
Stand 17.11.2026. Nur PAPER_ONLY. Dieses Dokument ist OPERATOR-KONTEXT und darf wegen Rueckblickdaten niemals als Input in historische GPT-Blindtests eingespeist werden.

## Dauerhaftes Nutzerziel
GPT entscheidet als EINZIGER Stratege ueber Kandidaten aus neuen Memecoins, 1/4/12/24 wirklich durchgefuehrte GPT-Vollscans pro Betriebstag, BUY/HOLD/SELL/NO_TRADE, Einsatz 50 bis 5000 TEST-USDC innerhalb der tatsaechlich freien lokalen Paper-Kapazitaet, Ausstiege inklusive Teilverkaeufen und spaetere Fehleranalyse. Der lokale Windows-Bot darf die Entscheidung nur technisch und sicherheitlich pruefen, nicht selbst Coin/Einsatz/Strategie auswaehlen. Nur ein einziges regulaeres Paper-Konto und die einzige Startdatei Sniperbot_Starten.bat. 40 bekannte Gewinner aus anderen Chats sind strikt POSTHOC-REFERENZEN, keine historische Vorauswahlliste.

## Erster real bestaetigter Entscheid-Rundweg: 17.11.2026
- GPT aus dem gegenwaertigen Chat hat am 17.11.2026 17:58:12.581 UTC anhand des GitHub-Marktframes eine NO_TRADE-Entscheidung verfasst: 12 beobachtete Kandidaten, keine bestaetigte Contract-Sicherheit, Sellability oder bidirektional ausfuehrbare Kauf/Verkauf-Quotes. Das ist eine gegenwaertige echte GPT-Entscheidung, kein autonomes taegliches Modellscheduling.
- Decision-ID: gpt_e7c715480f009a0dd80040fa78c186a7
- Unveraenderliche Quelldatei: research/r29/gpt-decisions/2026-11-17/gpt_e7c715480f009a0dd80040fa78c186a7.json
- Archiv-Commit: 8e39ee6db8ba8a9505e8d5e50123538d1abdfeaa; Pointer-Commit: 61cdadb0024dbad9cd47a90aaa7d6c1fda326735
- Bot-Quittung unter research/r29/channel/gpt-paper-receipt.json: empfangen 2026-11-17T17:58:45.322Z, status NO_TRADE, action NO_TRADE, reason GPT_RESEARCH_NO_ORDER.
- Diese Quittung belegt GPT aus Chat → GitHub → laufenden lokalen Bot → GitHub. Es gab weder eine echte noch virtuelle Kauforder und keine Kontoveraenderung. GitHub-Account-Zuordnung ist KEINE kryptografisch gepruefte Modellidentitaet.

## Tatsachliche GitHub-Live-Pruefung am 17.11.2026
- REGULAERER Paper-HTTP-Bot erreichbar laut research/r29/channel/regular-paper-presence.json von 17:44:33.733 UTC.
- Research/r29/channel/gpt-paper-context.json von 17:47:56 UTC meldete beide Paper-Schalter aktiv, aber 0 GPT-eigene offene Positionen.
- Neueste dynamische Forschung in research/r29/channel/dynamic-research-review.json von 17:14:43 UTC: 12 Kandidaten, security_verified FALSE, nur lokale heuristische Reviews (keine echten 24 GPT-Modellcalls).
- Research/r29/channel/gpt-paper-security.json von 17:15:17 UTC: 0 unabhaengig freigegebene Coin-Sicherheitspruefungen.
- Der wichtige oeffentliche Marktfeed research/market/latest.json AUF codex/research-gateway-v04 war noch vom 11.11.2026 02:44:43 UTC und damit veraltet. Ein lebender Bot garantiert keinen frischen Marktfeed.
- Alte 2026-11-15-Sandbox-Belege mit +28.408 TEST-USDC sind NUR synthetische separate QA, keine aktuellen Benutzer-Paper-Gewinne.

## Aktueller Entwicklungsschritt
- runner/early-event-research.mjs: strikte neue Solana-Launch-/Migration- und Gecko-Terminal-Erstsichtungs-Research-Gate. Pool-Migrationen werden gegen aktuelle neutrale Poolkandidaten geprueft und vor bereits volumenstarken Kandidaten in begrenzten Forschungsreviews hervorgehoben. Keine automatische BUY-Freigabe.
- runner/dynamic-research-scheduler.mjs: lokale Frequenzheuristik kann gueltige junge Migrationen gesondert beruecksichtigen; das erzeugt noch KEINEN echten GPT-Modellcall. Unterstuetzte 1/4/12/24 Stufen bleiben lokal RESEARCH ONLY.
- runner/r29-adaptive-publisher.mjs: veroeffentlicht nur erlaubte Event-Felder, UTC-Empfangszeit, keine Signatur zum Kauf, keine Wallet, keinen Profit.
- runner/forward-source-health.mjs: geplanter oeffentlicher Diagnosestatus research/r29/channel/forward-source-health.json vom existierenden Windows-GitHub-Kurier, laeuft nach Code-Update ca. alle 10 Minuten; trennt lokalen Collector, Frische des echten oeffentlichen Research-Branchenfeeds, Provider-Stream-Verbindungsstatus und klassifizierte Publikationsfehler ohne private Daten. Wenn die Datei nicht erscheint, ist das neue Code-Update oder dessen Publikation auf dem Laptop noch NICHT belegt.
- Zusaetzliche Windows/Linux-CI-Tests fuer alte und neue Faelle. Kein zweiter Starter, kein zweites Guthaben.

## Verbleibende Blockaden
1. Laptop muss den neuesten kanonischen R29-Code laden, ohne private .local/ und LOCALAPPDATA/MemeSniperPaper zu loeschen; der GitHub-Connector kann NICHT ohne gesonderte Verbindung die Laufzeitdateien auf dem Windows-Laptop patchen.
2. Aktuelle Research-Publikation auf codex/research-gateway-v04 wiederherstellen und Quittungen nachweisen, bevor ein Coin aus einem neueren Frame als handelbar gilt.
3. Unabhaengige Chain-/Contract-/Pool-/LP-/Sellability-Pruefungen und fuer die konkrete Positionsgroesse echte bidirektionale DEX-Ausfuehrungsquotes mit Fees, Slippage und Finalitaet. Aktueller GPT-Solana-BUY-Receiver blockiert Solana aus Sicherheitsgruenden.
4. Private bidirektionale SIZE_REQUEST → SIZE_OFFER → GPT_SIZE_CHOICE → eigene signierte GitHub-BUY-Entscheidung → echte lokale Paper-FILL-Quittung noch nicht end-to-end angeschlossen. Das oeffentliche GitHub darf keine privaten Guthaben/Schluessel speichern.
5. Die aktive stündliche GPT-Automation ist derzeit ein HISTORISCHER BLINDTEST, kein nachweislich laufender eigenstaendiger Forward-Paper-GPT-Scanner. Ohne echte Modellaufrufe keine Behauptung von 1-24 GPT-Scans pro Tag. Alten Backtest NICHT stillschweigend in Live-Paper-Auftraege verwandeln.
6. Ein profitabler 60-Tage-Backtest und die Faehigkeit, neue Gewinner zu erkennen, sind NICHT bewiesen. Gewinne aus 40 rückblickenden Beispielen duerfen niemals als reale oder garantierte Erfolgsquote gelten.

## Verbindliche Reihenfolge bei jedem neuen GPT-Chat
1. GitHub-Repo 127027/Sniperbot- auf Branch codex/r29-chatgpt-github-paper-cycle-20261115 lesen, zuerst SNIPERBOT_R29_START_HERE.md, research/r29/operations/R29_LATEST_CHECKPOINT.json und dieses Dokument. Reale GitHub-Commits und CI pruefen.
2. Die letzten UTC-Zeitstempel von regular-paper-presence.json, gpt-paper-context.json, gpt-paper-receipt.json, dynamic-research-review.json, gpt-paper-security.json, forward-source-health.json und market/latest.json auf dem RICHTIGEN research-gateway-v04 Branch gegen die aktuelle Zeit abgleichen.
3. Neue, neutral entdeckte Coins anhand tatsaechlich damals aktueller Originalquellen untersuchen. Die 40 Nutzer-Beispiele nur als spaetere Benchmarks verwenden; bei fehlender Vertragssicherheit oder Datenfrische NO_TRADE.
4. Echte GPT-Entscheidungen nur ueber das bestehende immutable Archiv plus SHA-gebundenen Pointer im gpt-paper-protocol.mjs senden und die konkrete Bot-Receipt-ID nachpruefen. Keine unautorisierte GitHub-Datei als BUY nutzen.
5. Nach jedem verifizierten Schritt GitHub-Checkpoint/Operationsdokument und Tests aktualisieren. Keine erfundenen Marktgewinne oder USD-Paper-Fills.

Keine Echtgeldtransaktionen, kostenpflichtigen Provider-Streams oder PayPal-Aktionen. Nur PAPER_ONLY.
