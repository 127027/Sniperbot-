# R29 – frischer GitHub-Marktfeed, Doppelbranch-Problem und Sicherheitsgrenzen
Stand 17.11.2026. Nur PAPER_ONLY. Keine Echtgeld-, Wallet- oder PayPal-Aktion.

## Tatsächlich festgestelltes Problem
- Kanonischer GPT-Paper-Branch: codex/r29-chatgpt-github-paper-cycle-20261115.
- Bisheriger Markt-Collector schreibt nur in den getrennten Branch codex/research-gateway-v04.
- research/market/latest.json auf dem Gateway-Branch hatte beim Check 17.11.2026 den letzten Capture-Timestamp 2026-11-11T02:44:43.307Z.
- Der HTTP-Bot ist über regular-paper-presence.json erreichbar. Dieser Heartbeat beweist WEDER einen aktuellen Marktfeed NOCH eine bestätigte lokale Installation des neuen kostenlosen Solana-WebSockets.
- forward-source-health.json war bei dieser Untersuchung auf GitHub noch nicht vorhanden.

## Implementierte Abhilfe in diesem Feature-Branch
1. runner/r29-canonical-market-relay.mjs: der bestehende R29-Windows-GitHub-Kurier kann frische lokale .local/research-market/latest.json direkt in den kanonischen R29-Branch unter research/market/latest.json spiegeln. Alter Gateway-Publisher bleibt bestehen.
2. Vor dem öffentlichen GitHub-Schreiben wird die Eingabe mit dem vorhandenen Research-Publisher validiert und auf erlaubte Chain-/Token-/Pool-Identitäten, vertrauenswürdige GeckoTerminal-/DexScreener-Quellen, UTC-Zeiten, wenige marktbezogene Werte und sicher abgegrenzte früh erkannte Forschungsevents projiziert.
3. Snapshot muss <= 10 Minuten alt sein; eine neuere oder gleiche GitHub-Datei wird nie durch eine alte überschrieben. Keine Veröffentlichung von Secrets, Wallet, privaten Kontobeträgen oder Orderdaten.
4. runner/forward-source-health.mjs: prüft jetzt den kanonischen GPT-Forschungsfeed UND den alten Gateway getrennt, mit Quellendaten-Frische und Fehlertypen; der bestehende R29-Kurier nutzt dafür weiter seine einzige Prozessinstanz.
5. Windows-/Linux-CI testet Daten-Gates, Quell-Zeitstempel, Solana-Ereignisse, Dubletten, keine Guthabenlecks und keine Handelsbefehle.

## Unverzichtbare Aktualisierung des tatsächlichen Laptops
- GitHub-Code/CI kann nicht beweisen, dass die laufenden Windows-Programmdateien aktualisiert sind.
- Sniperbot_Starten.bat mit Q beenden. Anschließend die neuesten Programmdateien vom kanonischen R29-Branch aktualisieren, aber .local, LOCALAPPDATA/MemeSniperPaper, bestehende Positionen/Guthaben, Windows-DPAPI-Token und andere persönliche Kontodaten NICHT überschreiben/löschen. Weiter genau eine Startdatei Sniperbot_Starten.bat.
- Wieder starten; der bestehende Supervisor betreibt intern BOT, optional MARKET, kostenlosen SOLANA-Stream und R29-Kurier. Die weiterlaufende GitHub-Verbindung allein bedeutet nicht, dass der Marktfeed frisch ist.
- Nach Neustart UTC-Timestamps in research/r29/channel/forward-source-health.json, research/market/latest.json auf kanonischem Branch, dynamic-research-review.json, regular-paper-presence.json, gpt-paper-receipt.json vergleichen.
- Fehlt die Health-Datei oder bleibt der kanonische Marktfeed alt: lokalen R29-Kurier und MARKET-Prozesslogs prüfen, Recherche-Provider/Berechtigung/Source-BLOCKED ansehen. Kein BUY bei Datenlücken, ohne API-Keys öffentlich zu posten.

## KI-Handel und historische Referenzen
- Die vom Nutzer gelieferten 40 vergangenen Gewinner sind lediglich posthoc referenzierte und bisher nicht unabhängig verifizierte Fälle; niemals als blinde historische GPT-Kandidatenlisten nutzen.
- Bestehende lokale 1/4/12/24-Research-Frequenz ist KEIN Beweis echter GPT-Modellanalysen; 1–24 GPT-Forward-Scans müssen durch echte getrennte Modellaufrufe mit Zeitstempeln nachgewiesen werden. Bestehender historischer GPT-Wecklauf bleibt Backtest-only.
- GPT ist alleiniger strategischer Entscheider, lokaler Bot nur Sicherheits-/Guthaben-/Quote-Prüfer. Solana-Paper-BUY bleibt bis zur unabhängigen Contract-, LP-, Sellability-, bidirektional ausführbaren Quote- und Gebührenprüfung gesperrt.
- Kein separater Echtgeldhandel, keine zweite Paper-Bilanz, keine automatisch aus einer WebSocket-Benachrichtigung erzeugten BUYs. 60-Tage-GPT-DEX-PnL bleibt UNKNOWN.

## Fortsetzung neuer Chats
Vor jedem Eingriff: SNIPERBOT_R29_START_HERE.md, research/r29/operations/R29_LATEST_CHECKPOINT.json, research/r29/operations/R29_FORWARD_LIVE_RESUME_20261117_DE.md und dieses Runbook lesen; dann echte GitHub-Quittungen/Zeitstempel prüfen und Code/Tests bis zum grünen CI fortführen.
