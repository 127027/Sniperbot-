# R29 V4.4 – Verbindlicher Fokus: ChatGPT ↔ GitHub ↔ Windows-Paper-Bot

Stand 18.11.2026. Freigabe durch Nutzer: **KEINE separate OpenAI-API auf dem Laptop.** Bestehende ChatGPT-/GitHub-Aufgaben als einzige Quelle strategischer Entscheidungen. Kein neues Modell, kein neuer Bot, kein zweiter kostenpflichtiger API-Pfad.

## Warum bislang ein lokaler API-Key vorgeschlagen wurde

**Ja, der separate Weg stand tatsächlich im bestehenden Repository:**
- `runner/windows-supervisor.ps1`: optionale Schalter `-WithCentralAI`, `-ResetAiKey`, Funktion zur verdeckten Erfassung und Speicherung von `openai-api-key.dpapi` sowie `SNIPER_CENTRAL_AI_ENABLED=1`.
- `runner/server.mjs`: bedingter Direktaufruf des kostenpflichtigen lokalen Responses-API-Koordinators.
- `runner/r29-windows-courier.mjs`: frühere gegenseitige Umschaltung zwischen lokalem Modellkanal und GitHub.

Der R29-Normalstarter `Sniperbot_Starten.bat` verwendete **bereits vorher** `-WithR29` und fragte standardmäßig keinen separaten OpenAI-API-Key ab. Der frühere Vorschlag, mit `-WithCentralAI` zu starten, war für die vereinbarte GitHub-only-Architektur falsch. **Hiermit explizit widerrufen.**

## Technische Änderungen V4.4

1. `runner/windows-supervisor.ps1`: `-WithCentralAI`/`-ResetAiKey`, Key-Abfrage, API-Key-Entschlüsselung und direkte lokale Modellaktivierung aus dem regulären Startpfad entfernt. Das Skript entfernt etwaige geerbte `SNIPER_OPENAI_API_KEY`- und `SNIPER_CENTRAL_AI_ENABLED`-Umgebungsvariablen und setzt letztere für den Bot explizit auf `0`.
2. `runner/server.mjs`: kein Aufruf von `startCentralAiCoordinator`, kein direkter Modell-API-Start mehr. Bestehende `/api/gpt/paper-decision`-Receiver-, Signatur-, Replay- und Risk-Pfade bleiben erhalten. `/api/central-ai/status` gibt als kompatiblen Diagnosestatus `enabled:false` und `GITHUB_GPT_ONLY_LOCAL_API_REMOVED` zurück.
3. `runner/r29-windows-courier.mjs`: authentifizierter GitHub-GPT-Kurier nicht mehr durch optionalen alternativen lokalem API-Modus abgeschaltet.
4. `runner/r28-connection-diagnostic.mjs`: misst `/api/gpt/paper/status` und den lokalen R29-Presence-Status. Bei transportbereitem GPT-Receiver lautet die neutrale Diagnose `BOT_AND_GITHUB_GPT_RECEIVER_READY_NO_ORDER_PROOF`. `central_ai.enabled=false` ist in diesem Modus **erwartet, kein Problem**.
5. Regressionstests gegen versehentliche Wiedereinführung des lokalen kostenpflichtigen API-Startwegs und gegen fälschliche Modelle-/Paper-Fill-Behauptungen.

Das frühere, jetzt **nicht mehr in den Server importierte** Modul `runner/central-ai-coordinator.mjs` samt historischer Tests verbleibt als bisheriges Forschungs-/Regressionsmaterial; es wird beim regulären R29-Start nicht geladen oder aufgerufen. Kein Löschen von Studien oder vergangenen Testnachweisen.

## Nachweis: aktuelle Datenübertragung funktioniert (keine neue Infrastruktur)

Nutzer-Diagnose vom 18.11.2026 14:31:30.842 UTC:
- Echter lokaler Markt-Collector: `RUNNING_RESEARCH`, Capture `2026-11-18T14:30:57.370Z`, **64** Kandidaten, **16** RSS-Nachrichten.
- Lokaler GitHub-Publisher: `publishing_enabled:true`, gemeldeter Commit `5037000270707e53471e9a8eb32897231f7f6155`.
- Unabhängig über GitHub nachgelesen: **64** Kandidaten und **24** Forschungs-Alerts sowohl in `codex/research-gateway-v04` als auch im R29-Kanon-Branch. `forward-source-health.json`: `CANONICAL_RESEARCH_FEED_RECENT`.
- Lokale isolierte signierte BUY-/SELL-Tests: erfolgreich, **keine** tatsächliche GPT-/Marktorder.
- `gpt_follow_enabled:true` beim letzten GitHub-Paper-Kontext; `paper_orders_automatically_enabled:false` ist ein **statischer** Heartbeat-Wert des Legacy-Paper-Autopiloten und belegt keine Blockierung gültiger GPT-GitHub-Signale.

## Windows-Handlung – erst nach PR-Merge/Branch-Update

1. Neue Paper-Einstiege im Dashboard pausieren. Aktuellen Bot mit **Q** in der laufenden Konsole geordnet beenden.
2. Vor Änderungen das private lokale `%LOCALAPPDATA%\MemeSniperPaper` samt `secrets` und die alte Projekt-`.local`-Forschungskopie auf dem eigenen Rechner **sichern**; weder löschen noch nach GitHub laden.
3. Den **kanonischen R29-Branch** `codex/r29-chatgpt-github-paper-cycle-20261115` neu als ZIP in einen separaten Ordner herunterladen; die bisherige `.local`-Forschungskopie **kopieren**, nicht verschieben. Die private zentrale `%LOCALAPPDATA%\MemeSniperPaper`-Ablage unverändert lassen.
4. Normal mit **Doppelklick** auf `Sniperbot_Starten.bat` starten. **NICHT** `-WithCentralAI`, **NICHT** `-ResetAiKey`, **NICHT** nach OpenAI-Key fragen.
5. Sicheres lokales Diagnosekommando: `node runner/r28-connection-diagnostic.mjs`; insbesondere `github_gpt_courier.local_signed_receiver_ready` und die neuen Statusfelder prüfen. `central_ai.enabled=false` ist erwartetes Ergebnis. Kein separater API-Key, keine zusätzliche API-Abrechnung.
6. Für tatsächlichen ChatGPT-Strategiebeweis müssen die **bestehenden** R29-ChatGPT-Aufgaben einen individuellen unbekannten Kandidaten tatsächlich bewerten und ihre Herkunft/Entscheidung separat belegbar veröffentlichen; GitHub ist nur Transport, keine automatische KI. Ein R29-Heartbeat oder Research-Review ist niemals ein Nachweis eines echten ChatGPT-Modellentscheids.

## Weiterhin offen (nicht verschleiern)

- Kein neuer tatsächlich von ChatGPT erstellter und lokal ausgeführter signierter BUY/SELL, kein echter Paper-PnL für einen neuen unbekannten Coin.
- Die GitHub-Eigentümerkontrolle eines Auftrags ist **keine kryptografische Modellidentität**. Ohne belegte GPT-Herkunft kein Erfolgsnachweis.
- Kein durchgängig getesteter, GPT-autorisierter **positionsgebundener Exit-Vertrag** mit kontinuierlicher Überwachung, Neustart-/Replay-Sicherheit und frischen zweiseitigen ausführbaren Quotes. **Bis zur Abnahme keine prospektiven automatischen Paper-BUYs.**
- Historische 10 GPT-Blindtests bleiben getrennt und dürfen weder Wallet noch aktuelles Paper-Konto beeinflussen.
- Echtgeld, PayPal, Ein- und Auszahlungen und neue Bots sind ausdrücklich nicht Bestandteil dieser Änderung.

**Abnahmekette:** Aktuelle GitHub-Marktdaten → nachweislicher ChatGPT-Aufruf/Entscheid in vorhandener R29-Aufgabe → authentifizierter GitHub-Orderpointer → gültiger lokaler signierter Paper-Receiver-Receipt → nur bei bestandenem Exit-Schutz später Paper-BUY, Positionsüberwachung und Paper-SELL.
