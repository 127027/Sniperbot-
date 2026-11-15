# Sniperbot R29: ChatGPT → GitHub → lokaler Paper-Bot

**Stand 15.11.2026 · Version R29 bleibt unverändert · NUR virtuelles TEST-USDC.**

## Architektur und Vertrauensgrenzen

1. Die stündlich geplante **ChatGPT-Diagnose** mit Aufgabe `6af9cdf5ba548191a1c2304988e4d3ab` untersucht aktuelle öffentliche Research-Snapshots, unabhängige Quellen, offene GPT-Positionen und vorhandene Erfahrungen. Bei ruhigem Markt ist eine volle Analyse pro Tag ausreichend; bei geänderten Quell-Hashes oder neuen Positionsevidenzen bis 24/Tag. Es ist **keine** autonome, dauerhaft laufende GPT-API auf dem Laptop.
2. GPT schreibt einen **eigenständigen datierten JSON-Entscheid** unter `research/r29/gpt-decisions/YYYY-MM-DD/gpt_<32 hex>.json`. Dieser wird beim ersten Schreiben angelegt und nicht überschrieben. Ein paralleler SHA-256-Zeiger unter `research/r29/channel/gpt-paper-decision.json` weist auf die exakte Archivdatei.
3. Der bisherige R29-GitHub-Kurier liest über den **bereits lokal per DPAPI gespeicherten GitHub-Token**: Zeiger und Archiv; die jeweiligen **dateispezifischen** letzten GitHub-Commits. GitHub-Owner `127027`, Committer `127027`, unveränderte Blob-SHA und Archiv-SHA-256 müssen stimmen.
4. **Sicherheitsgrenze:** Das beweist die Zuordnung zu einem GitHub-Konto, nicht kryptografisch die Erzeugung durch das Modell. Ein kompromittiertes owner-berechtigtes GitHub-Konto wäre weiterhin eine Risikoursache. Vor echter Vermögensnutzung wäre kryptografische Attestierung/Bot-Autorisierung auf einem anderen Sicherheitsniveau nötig; hier strikt PAPER_ONLY.
5. Der Windows-Supervisor erzeugt beim **einzigen Start** einen zufälligen lokalen 256-Bit-Bridge-Schlüssel. Er wird nur an **BOT** und **R29-Kurier**, nicht an GitHub oder den Collector, weitergegeben. Jeder Auftrag wird über einen authentifizierten lokalen `POST /api/gpt/paper-decision` abgegeben. Kein öffentlicher HTTP-Port; Host muss `127.0.0.1:3030` sein.
6. Der lokale GPT-Receiver prüft Archiv-Hash erneut, JSON-Felder, TTL (für BUY/SELL max. 180 Sekunden), Replay-ID, Opt-in, Coin/Contract/Pool und aktuellen Markt-Snapshot. Er trifft **keine** eigene strategische Coin-Auswahl.
7. Bei GPT-BUY folgt **zusätzlich** ein frischer, unabhängiger DEX-Preis und EVM-Contract-/Sell-Simulation über GoPlus/Honeypot.is, vor dem Fill ein erneuter Risiko-/Budgetcheck. Erst danach signiert der lokale Session-Key den bestehenden `sniper_agent_trade_signal.v1`-Paper-Auftrag. **Kein unbekannter Pool, keine veraltete oder unsichere Quelle, kein BUY ohne neue GPT-Entscheidung.**
8. Bei GPT-SELL darf nur eine **durch GPT eröffnete** virtuelle Position mit identischer Chain, Token- und Pool-Adresse geschlossen werden. Eine Notfall-Loss-Guard darf als harter Sicherheitsmechanismus unabhängig von GPT eingreifen. Teilverkäufe (REDUCE) sind bis zu einem gesondert geprüften Modul lediglich unverbindliche Forschung.
9. Die normale Paper-Engine schreibt den virtuellen P&L in dasselbe bestehende `paper-state-v03.json`, der GPT-Receiver vermerkt `gptDecisionReplay` dort mit. Die Quittung `research/r29/channel/gpt-paper-receipt.json` enthält **keinen** Guthaben-, Positionsgrößen- oder Walletwert.
10. Der Kurier publiziert `research/r29/channel/gpt-paper-context.json` mit öffentlichen Identitäten und Einstiegskursen ausschließlich der GPT-eigenen Testpositionen, **niemals** mit privatem Kontoguthaben, Testeinsatzgrößen, Wallet-Adressen, Schlüsselmaterial oder Zahlungsdaten. So kann GPT neue reale Marktfakten heranziehen, um nach BUY auch SELL/HOLD fachlich zu beurteilen.

## Start und Freigabe am bisherigen Windows-Botordner

- Vor Aktualisierung unbedingt vollständiges Backup des bisherigen Botordners inklusive `.local` und **`%LOCALAPPDATA%\MemeSniperPaper`**. Insbesondere `paper-state-v03.json`, `*.bak`, DPAPI-Token, echte Wallet-Dateien und alte Handelslogs niemals überschreiben.
- Bot im bisherigen Fenster mit `Q` stoppen. Aus **dem bereits benutzten** Ordner nur die aktuellen Programmdateien des Branches `codex/r29-chatgpt-github-paper-cycle-20261115` aktualisieren. Keine zusätzliche `.bat`, kein zweites Konto oder neues Sniperbot-Verzeichnis.
- Ausschließlich `Sniperbot_Starten.bat` starten. Der Supervisor schaltet den alten regelbasierten autonomen Kaufprozess `SNIPER_PAPER_AUTOPILOT=0` ab und startet den authentifizierten GPT-Kanal. `[AI] Kostenpflichtige lokale OpenAI-API AUS` ist **kein** Fehler; der GPT-Entscheidungsprozess läuft als getrennte ChatGPT-Automation.
- Auf `http://127.0.0.1:3030` Paper-Bot starten und dann ausdrücklich **GPT-Paper-Freigabe aktivieren**. Ohne beides sind strategische BUY-/SELL-GPT-Orders gesperrt. Die lokale Risikomaschine kann auch dann zulässige GPT-Trades ablehnen.
- Statuskontrolle: `http://127.0.0.1:3030/api/gpt/paper/status` muss `local_gpt_bridge_ready:true` und bei Freigabe `gpt_follow_enabled:true` anzeigen.
- GitHub-Belege: `research/r29/channel/gpt-paper-decision.json` → Archiv → `research/r29/channel/gpt-paper-receipt.json`. Eine `NO_TRADE`-Quittung bestätigt nur den sicheren Empfang; erst `status:PAPER_FILLED` beweist einen **virtuellen** Kauf oder Verkauf.

## Befunde und Grenzen, die nicht als Erfolge dargestellt werden dürfen

- Am **15.11.2026 um 17:40:24.709 UTC** wurde erstmals ein lokaler Research-Review mit 12 Kandidaten und Research-Frequenz 4/Tag bestätigt. Security/Sellability dieser zwölf waren **UNKNOWN**.
- Die erste GPT-Entscheidung lautet **NO_TRADE**; Archiv ID `gpt_20261115181100000000000000000000`. Ohne belegten echten Security-Nachweis kein BUY. Diese Entscheidung ist **bereits auf GitHub erstellt**, aber der Windows-Bot muss mit dem neuen Code starten, bevor ein Empfang als belegt gelten kann.
- Alte R30-Backtest-Ergebnisse waren Preis-/Volumen-Proxies, **kein GPT-Echtzeit-Research** und in allen getesteten Frequenzen netto negativ.
- GitHub-Actions mit Mock-Daten testen die Kette; sie sind **kein Beweis**, dass dein Windows-Laptop bereits eine GPT-Entscheidung empfangen und einen handelbaren Memecoin automatisch eröffnet/geschlossen hat.
- Die lokale Ausführung verwendet **öffentliche, indikative DEX-Spotkurse** mit je 1 % modellierten Gebühren. Ein realer DEX-Trade könnte an Liquidität, MEV, Slippage oder Contract-Änderungen scheitern. Keine tatsächliche Live-Trading-Erfolgsaussage.
- GoPlus/Honeypot.is können Limits/Bedingungen ändern. Die Implementierung benutzt nur frei erreichbare Endpunkte und blockiert bei HTTP-Fehlern. Es fallen keine absichtlich gebuchten KI-/Paid-Data-Abonnements an.
- Die Bot-Forschung startet nicht selbstständig auf deinem Rechner, wenn das Fenster geschlossen/der PC offline ist. Die ChatGPT-Automation kann außerdem nur erfolgreich schreiben, soweit der GitHub-Connector zur Laufzeit tatsächlich verbunden und autorisiert ist. Bei Störungen `DATA_GAP` und keine ausgedachten Trades.

## Nächster Funktionstest (nach Laptop-Update)

1. In `/api/gpt/paper/status` `local_gpt_bridge_ready:true` prüfen.
2. Im GitHub-Receipt prüfen, ob der archivierte **NO_TRADE**-Entscheid mit korrekter `decision_id`, `status:NO_TRADE` und `GPT_RESEARCH_NO_ORDER` erscheint. Konto dabei unverändert.
3. Einen neuen GPT-Entscheid auf Basis späterer **neuer** Marktdaten erstellen; nur wenn vollständiges unabhängiges Security-Gate `VERIFIED` und 50-TEST-USDC-Risikolimit tatsächlich zulässig sind, BUY. Sonst erneut NO_TRADE/WATCH.
4. Nach lokalem `PAPER_FILLED` die genau eine neue Position im normalen Dashboard verifizieren, bei SELL Quittung und P&L nachvollziehen. Erst diese Schritte sind der nicht-synthetische Abschluss.

**Daten-/Erfahrungsablage:** `research/r29/gpt-strategy/MARKTFORSCHUNG_WISSENSBASIS_DE.md`, `ERFAHRUNGSJOURNAL_DE.md`, weitere datierte Erfahrungen, unveränderte archivierte Research-Reviews und die lokalen Forward-Outcomes.
