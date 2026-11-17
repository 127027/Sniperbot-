# Sniperbot R29 – Phase 1: Kostenfreier Solana-Echtzeitstream
**Stand 17.11.2026** · **PAPER_ONLY / Research-only** · Teil des dauerhaften R29-Operator-Protokolls.

> Für neue Chats: **Zuerst** [SNIPERBOT_R29_START_HERE.md](../SNIPERBOT_R29_START_HERE.md) und diesen Bericht auf dem aktuellen R29-Branch lesen. Keine frühere Chat-Antwort als GitHub-Beweis behandeln. Dieser Bericht enthält retrospektive Projektkenntnis und ist **kein** zulässiger Input für einen historischen Blindtest-GPT.

## Auftrag und tatsächlich geänderte Dateien
Ziel war, zukünftige Memecoin-Ereignisse *vor* einer möglichen Rallye zu beobachten: insbesondere Tokenstart und Pool-Migration, ohne dass der Benutzer neue Bots oder Startdateien benötigt.

- \`runner/solana-live-events.mjs\`: strikter Eingangsvalidator für PumpPortal-Launch- und Migrationsereignisse, lokale Empfangszeit (UTC), SHA-Deduplikations-ID, Pool-/Mint-/Signaturidentität, unverifizierte Chain-Finality, Research-only-Schema. **Keine** Ausführbarkeit, keine impliziten Gewinne, kein erfundener Blockzeitpunkt.
- \`runner/solana-live-stream.mjs\`: genau **ein** dauerhafter WebSocket \`wss://pumpportal.fun/api/data\`, ausschließlich die beiden **kostenlosen** Methoden \`subscribeNewToken\` und \`subscribeMigration\`. Kein \`subscribeTokenTrade\`, kein \`subscribeAccountTrade\`, keine bezahlte API, keine echten Transaktionen, keine Secrets. Wiederverbinden mit begrenztem Backoff, Stale-Feed-Erkennung, Lock gegen Doppelstart, Supervisor-Shutdown.
- \`runner/research-market-daemon.mjs\`: liest zusätzlich die frischen Stream-Research-Leads lokal und ergänzt sie strikt non-actionable in der bestehenden \`research_alerts[]\`-Marktforschung. Keine direkte Trade-Pipeline.
- \`runner/research-market-publisher.mjs\`: behebt die vorhandene Schnittstellenlücke: Früherkennung \`NEW_POOL_FIRST_OBSERVED\` und beide WebSocket-Lead-Typen werden nur mit geprüfter, begrenzter Schema-/Zeit-/Identitätslage im öffentlichen Dot-Feed zugelassen.
- \`runner/windows-supervisor.ps1\`: startet bei normalem \`-WithR29\` denselben Stream als intern beaufsichtigten Kindprozess, weiterhin ausschließlich \`Sniperbot_Starten.bat\` als Benutzerstarter. Nutzt den bereits vorhandenen DPAPI-GitHub-Token für das **bestehende** Research-Publishing; erzeugt keinen zweiten. Stream-Child erhält diesen Token nicht.
- \`runner/solana-live-stream.test.mjs\`, \`runner/solana-dot-bridge.test.mjs\`, \`.github/workflows/tests.yml\`: Offline-Mocktests des Stream-Sockets, nur gratis abonnierte Kanäle, lokales Journal, Deduplikation, GitHub-Rechercheannahme und Ablehnung eingeschleuster Orders; komplette Linux-/Windows-Regressionsmatrix.

## Quellen / Verbindliche Betriebsbedingungen
Offizielle Dokumentation:
- https://pumpportal.fun/data-api/real-time/
- https://pumpportal.fun/fees/

Stand 17.11.2026: **Tokenstarts und Migrationen kosten laut Anbieter nichts**. Das Abrufen von Token-/Wallet-Trade-Streams ist seit 01.05.2026 nur mit API-Key und aufgeladenem Anbieter-Wallet möglich und **kostenpflichtig**. Deshalb werden diese beiden Methoden in R29 **nicht** verwendet. Wird ein Schlüssel oder Zahlung für unsere beiden kostenlosen Methoden verlangt, muss der Feed mit Status \`PROVIDER_REJECTED\` blockieren. Keine Zahlungs- oder Credential-Autoeinrichtung.

Der WebSocket liefert **Provider-Ereignisse**; sie sind vor RPC-Finalitätsprüfung nicht endgültig. Weder providerseitige Blockzeit noch Empfangslatenz auf Kettenebene ist für den Free-Stream garantiert. Eine gemessene \`observed_at_utc\` ist ausschließlich der Zeitpunkt, an dem der Laptop das Paket empfing. Eine 22-Sekunden-Kaufchance ist damit **nicht** nachgewiesen.

## Speicherung und Fortsetzung statt Neuaufbau
Die aktuelle GitHub-Version, Tests und dieser Bericht sind dauerhaft versioniert. **Geheime Schlüssel, lokale Portfolios oder komplette Rohstreams werden nicht ins öffentliche GitHub hochgeladen.**

Nur auf dem tatsächlich gestarteten Windows-Laptop entstehen:
- \`.local/solana-live-stream/status.json\`: Verbindungsstatus, Counts, letzter Empfang, Datenlücken, Reconnects und Fehler. Keine Gebühren/Währungen.
- \`.local/solana-live-stream/recent.json\`: max. 512 validierte öffentliche Forschungsleads.
- \`.local/solana-live-stream/archive/YYYY-MM-DD.jsonl\`: append-only lokale Tagesdatei öffentlicher validierter Events (max. 25 MiB/Tag; bei Überschreitung \`BLOCKED_PERSISTENCE\` statt unbemerktem Verlust).
- \`.local/research-market/latest.json\`, \`.local/research-learning/market-alerts.json\`: vorhandene lokale 2-Minuten-Marktforschung.
- Der vorhandene GitHub-Forschungsfeed: \`research/market/latest.json\` auf \`codex/research-gateway-v04\`, nur dann aktualisiert, wenn der bestehende Collector und Token erfolgreich publizieren. Research-Frequenz weiterhin maximal ca. alle 15 Minuten. Der neue Stream **schreibt nicht** alle Events als separate Commits und kann nicht behaupten, jedes Ereignis an jeden Dot geliefert zu haben.

**Nie** \`.local/\` oder \`%LOCALAPPDATA%\MemeSniperPaper\` löschen, um neu zu installieren. \`.local\` ist absichtlich von Git ausgeschlossen. Vor einem Bot-Update beide Ordner sichern, besonders \`paper-state-v03.json\`. Ein Computer, der dauerhaft offline ist, kann auch keine 24/7-Marktüberwachung leisten.

## Windows-Einrichtung / Ein einziger Starter
1. Vorhandenen Bot im Fenster mit **Q** regulär schließen.
2. Aktuelle R29-Branch-Dateien aus GitHub aktualisieren, ohne lokale \`.local\`-/\`MemeSniperPaper\`-Daten zu ersetzen.
3. Weiterhin ausschließlich **\`Sniperbot_Starten.bat\`** ausführen. Der interne Supervisor startet Paper-Bot, Research-Collector, kostenlosen Solana-Stream und GitHub-Kurier. Keine zweite BAT-Datei.
4. Unter \`.local/solana-live-stream/status.json\` nach \`CONNECTED_FREE_ONLY\`, Empfangszählern oder \`PROVIDER_REJECTED\` sehen. Ohne echte Empfangsdaten ist die Verbindung nicht als funktionierend nachgewiesen.
5. Prüfen, ob \`research/market/latest.json\` auf dem bestehenden Research-Branch aktualisiert wurde und die Dots tatsächlich den geänderten Research-Feed lesen. Veröffentlichung kann fehlschlagen oder später eintreffen.
6. Optionales Abschalten des Stream-Childs vor dem Start: Umgebungsvariable \`SNIPER_SOLANA_STREAM=0\`. Der Bot bleibt weiterhin Paper-only. Offline-Testmodus \`SNIPER_OFFLINE=1\` startet keine echten WebSockets.

## Explizite offene Punkte
- **Keine bestätigte reale Verbindung auf dem Benutzerlaptop** durch GitHub-CI. CI nutzt gefälschte WebSocket-Ereignisse und prüft Code/Protokoll, nicht echte Eintrefflatenzen.
- **Keine 22-Sekunden-Handelsbereitschaft**. GPT und fünf Cloud-Dots entscheiden nicht im Sekundentakt; GitHub-Publishing bleibt periodisch. Neue Provider-Ereignisse werden zunächst lokal erkannt. Ein direkter authentifizierter Event-zu-GPT-Evaluierungsdienst benötigt separate Entwicklung.
- **Keine Wallet-Buy/Sell-Transaktionsüberwachung** im Free-Stream, weil die entsprechenden PumpPortal-Methoden kostenpflichtig sind. Alternativer unabhängiger kostenloser Quelle-/Onchain-Stream nötig.
- **Keine von GPT selbst gewählten historischen BUY-/SELL-Fills** über 60 Tage, keine nachgewiesenen 50–5.000-USDC-DEX-Quotes für jedes Marktfenster, keine perfekte Finalitäts- und Sellability-Garantie. Blindtest-PnL bleibt **UNKNOWN**.
- **Keine automatische Echtzeit-Anbindung der fünf Dots** garantiert: Der Forschungsfeed ist der vorhandene GitHub-Transport. Für wirkliche 24/7-Modellentscheidungen braucht es einen authentifizierten Modell-Dienst und einen nachgewiesenen kontinuierlichen Empfang.
- **Begrenzte Forschungsfeed-Abdeckung**: Aus vielen sehr schnellen Tokenstarts wird der letzte Teil der maximal 512 lokalen Recent-Events bzw. höchstens 24 GitHub-Alerts weitergegeben. Der lokale Archivstrom (sofern nicht gesperrt) enthält mehr und muss für spätere zeitliche Analysen ausgewertet werden. Archive führen keine heutigen Marktgewinne herbei.
- Die parallel laufenden alten 60-Tage-Replay-Workflows nutzen eigene historische Quellen. **Jetzt** gestartete Live-Snapshots dürfen keine historischen Entscheidungen vom 18.09.–16.11.2026 nachträglich beeinflussen.

## Nächste klar abgegrenzte Arbeit
1. Reale lokale WS-Verbindung und Datenqualität mit Status/Logs belegen, Provider-Errors, Latenzen und Migration-Identität messen.
2. Zweiten unabhängigen Solana-Finality-/DEX-Datenweg nachrüsten, weiterhin read-only und ohne unbeabsichtigte Gebühren. Event-Missing/Rate-Limit-Gaps protokollieren.
3. Event-getriggerte unabhängige GPT-Recherche *wirklich* abrufen (nicht Heuristik als Modellcall bezeichnen). Dot-Rollenstatus und Empfangsquittungen getrennt belegen.
4. Nur nach technischer Quote/Sellability/Signaturprüfung echte **virtuelle** PAPER_BUY/HOLD/PAPER_SELL samt Teilverkäufen und vollständigem gemeinsamen Ledger.
5. Unabhängigen 60-Tage-Blindtest, Out-of-Sample/Forward-Sampling und Fehleranalyse abschließen.

**Erfolgsmeldung nur mit echte CI-/lokale Quittungen. Keine Live-Trades, keine unbekannten Guthabenwerte, keine rückdatierten GPT-Entscheidungen.**
