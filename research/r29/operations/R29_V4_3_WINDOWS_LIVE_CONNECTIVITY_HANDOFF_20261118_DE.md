# R29 V4.3 – Echte Windows-Daten- und GPT-Verbindung: konkrete Abnahme

Datum: 18.11.2026. **Keine neuen Bots, keine automatischen Live-Orders, PAPER_ONLY.** Dieses Dokument ist OPERATOR-KONTEXT, nicht historischer GPT-Blindtest-Input.

## Tatsächlich in GitHub überprüft (nicht auf Nutzer-PC gemessen)
- Der Windows-R29-Heartbeat wurde am **18.11.2026 14:00:00 UTC** veröffentlicht: `local_paper_http_healthy=true`, `paper_orders_automatically_enabled=false`. Dieser letzte Wert wird in `runner/r29-windows-courier.mjs:syncR29RegularPresence` **fest auf false gesetzt** und ist kein dynamischer GPT-Blockierungsnachweis.
- Kanonischer Research-Feed `research/market/latest.json`: **10.11.2026 11:32:51 UTC**; alter Research-Branch `codex/research-gateway-v04`: **11.11.2026 02:44:43 UTC**. **Beide veraltet.**
- `forward-source-health.json` und `solana-forward-evidence.json` fehlen im kanonischen Branch, obwohl der aktuelle Repository-Kurier sie im normalen R29-Betrieb zu veröffentlichen versucht.
- Letzte öffentliche GPT-Paper-Quittung: **NO_TRADE** am 17.11.2026 17:58:45 UTC, `origin_model_signature_verified=false`. Keine tatsächliche neue GPT-Provider-Response-ID oder GPT-BUY-/SELL-Ausführung verifiziert.
- Vorhandener `runner/research-market-publisher.mjs` veröffentlicht nur in den alten Branch `codex/research-gateway-v04`; der **bereits vorhandene** `runner/r29-canonical-market-relay.mjs` spiegelt aus der lokalen `.local/research-market/latest.json` in den kanonischen R29-Branch. Kein neuer Publisher erforderlich. Die Abwesenheit neuer kanonischer Captures beweist nicht allein, ob der Collector pausiert, das alte Windows-Build läuft oder die Veröffentlichung scheitert.
- `dynamic-research-review.json` beschreibt lokal heuristische, ausdrücklich **nicht** echte GPT-Strategieanalysen. Ihr Zeitstempel kann frischer sein als der öffentliche Rohfeed und beweist weder aktuelle Provider-IDs noch Handelsfähigkeit.

## Betriebskonfiguration (im Code überprüft)
- `Sniperbot_Starten.bat` übergibt bereits `-WithR29` an `runner/windows-supervisor.ps1`. Default-R29 startet GitHub-Kurier und den Marktcollector, **aber keine kostenpflichtige OpenAI-Responses-API**.
- Für direkte eigenständige lokale GPT-Modellaufrufe ist `Sniperbot_Starten.bat -WithCentralAI` vorhanden. Der Supervisor fragt den API-Key bei Bedarf verdeckt ab und speichert ihn verschlüsselt unter `%LOCALAPPDATA%\MemeSniperPaper\secrets\openai-api-key.dpapi`. OpenAI-API-Verbrauch kann gesonderte Kosten auslösen; ein ChatGPT-Abonnement stellt den API-Key nicht automatisch bereit.
- Bei `-WithCentralAI` wird `SNIPER_CENTRAL_AI_ENABLED=1`, **und der parallel konkurrierende GitHub-GPT-Orderempfänger absichtlich deaktiviert** (`SNIPER_GPT_PAPER_BRIDGE=0`). Der lokale GPT-Koordinator signiert seine eigenen Paper-Kommandos im vorhandenen Server, ist aber nicht dasselbe wie ein Cloud-ChatGPT-Dot-Auftrag. Die beiden Strategiekanäle nicht gleichzeitig aktivieren.
- In GitHub-GPT-Modus regeln `gptPaperFollow` und `entriesEnabled` die GPT-Empfangsstrecke. `paper_orders_automatically_enabled=false` ist ein statisches Heartbeat-Feld für den alten autonomen Kaufmechanismus; kein kausaler Nachweis gegen gültige GPT-Aufträge.
- **Sicherheitsblocker:** Für GPT-Positionen ist ein individuell autorisierter, signierter, fortlaufend überwachter Exit-Vertrag noch **nicht nachgewiesen**. Bis dahin neue Paper-Einstiege am Laptop **PAUSIERT lassen**. Ein echter Modell-WATCH-/NO_TRADE-Nachweis ohne Kauf ist zulässig, keine vorher erfundenen BUY/SELL-Fills.

## Konkrete sichere Windows-Handlungen (Benutzer vor Ort)
1. Im alten Sniperbot-Konsolenfenster **Q** drücken und das ordnungsgemäße Beenden abwarten. Vorher im Dashboard **neue Paper-Einstiege/Bot AUS** lassen. Keine Guthaben-/Reset-Funktion betätigen.
2. In PowerShell im bisherigen Bot-Ordner lokale Daten **nach Beenden** sichern (Backup muss auf eigenem Rechner bleiben, enthält möglicherweise private Zugangsdaten):
   ```powershell
   $backup=Join-Path $env:LOCALAPPDATA ('SniperbotBackups\R29_'+(Get-Date -Format 'yyyyMMdd_HHmmss'))
   New-Item -ItemType Directory -Force -Path $backup | Out-Null
   $data=Join-Path $env:LOCALAPPDATA 'MemeSniperPaper'
   if(Test-Path -LiteralPath $data){Copy-Item -LiteralPath $data -Destination (Join-Path $backup 'MemeSniperPaper') -Recurse -Force}
   if(Test-Path -LiteralPath '.\.local'){Copy-Item -LiteralPath '.\.local' -Destination (Join-Path $backup 'research-local') -Recurse -Force}
   Write-Host 'Backup lokal angelegt:' $backup
   ```
3. In GitHub **Branch `codex/r29-chatgpt-github-paper-cycle-20261115` → Code → Download ZIP** wählen, in einen **neuen lokalen Ordner** entpacken. Den alten Bot-Ordner nicht löschen oder überschreiben. Nach ordnungsgemäßem Stopp die `.local`-Verzeichnisdaten **kopieren**, nicht verschieben, vom alten in den neuen Bot-Ordner. Die zentrale `%LOCALAPPDATA%\MemeSniperPaper`-Ablage unverändert lassen. Kein `-ResetToken` / `-ResetAiKey`.
4. Im **neuen** Bot-Ordner PowerShell öffnen. Einen tatsächlichen Modell-API-Aufruf vorbereiten:
   ```powershell
   .\Sniperbot_Starten.bat -WithCentralAI
   ```
   Bei neuer Installation wird ein eigener OpenAI-API-Key **nur im Windows-Fenster verdeckt eingegeben**. **Niemals im Chat oder auf GitHub veröffentlichen.** Wenn kein API-Key verfügbar ist, wird die bezahlte Modell-API NICHT aktiv. Ein API-Key kann gesonderte Kosten verursachen.
5. In **zweitem** PowerShell-Fenster im neuen Bot-Ordner die folgenden **read-only** Diagnosen ausführen:
   ```powershell
   node runner/r28-connection-diagnostic.mjs
   $ai=(Invoke-RestMethod http://127.0.0.1:3030/api/central-ai/status).coordinator
   $ai | Select-Object enabled,last_run_utc,last_outcome,model,response_id,actual_provider_response_count,last_api_response_is_real_provider_invocation,last_error,model_budget_exhausted
   $g=Invoke-RestMethod http://127.0.0.1:3030/api/gpt/paper/status
   $g | Select-Object gpt_follow_enabled,paper_bot_enabled,local_gpt_bridge_ready
   if(Test-Path '.\.local\research-market\status.json'){
     Get-Content '.\.local\research-market\status.json' -Raw | ConvertFrom-Json |
       Select-Object status,last_check_at_utc,candidate_count,publishing_enabled,publish_error,published_commit
   }else{Write-Host 'MARKET_STATUS_MISSING'}
   if(Test-Path '.\.local\research-market\latest.json'){
     Get-Content '.\.local\research-market\latest.json' -Raw | ConvertFrom-Json |
       Select-Object published_at_utc,collection_status,@{Name='candidate_count';Expression={$_.candidates.Count}}
   }else{Write-Host 'MARKET_CAPTURE_MISSING'}
   if(Test-Path '.\.local\solana-live-stream\status.json'){
     Get-Content '.\.local\solana-live-stream\status.json' -Raw | ConvertFrom-Json |
       Select-Object status,connected,last_connected_at_utc,last_event_received_at_utc
   }else{Write-Host 'SOLANA_STREAM_STATUS_MISSING'}
   ```
6. Den Diagnosebericht und diese ausgewählten Statusfelder ohne Secrets bereitstellen. **Keine kompletten `/api/state`-Antworten, Kontostände, Tokens, Keys, `.dpapi`-Dateien, Wallet-Adressen oder vollständigen lokalen Dateien kopieren.**
7. Akzeptanz in Reihenfolge:
   - Frischer tatsächlicher lokaler Capture `last_check_at_utc` + `published_at_utc`, danach kanonisches GitHub-Update und Source-Health-Quittung;
   - ein echter GPT-Provider-`resp_...`-Aufruf mit Modellantwort und `last_api_response_is_real_provider_invocation=true`, Ergebnis z. B. `WATCH` oder `NO_TRADE`;
   - weiterhin **kein neuer Paper-BUY**, bevor GPT-autorisierte positionsgebundene Exit-Überwachung, Reboot/Replay/Datenalterprüfung und Quotefähigkeit bestanden wurden;
   - erst danach GPT-autorisiertes BUY und SELL inklusive lokalem Paper-Fill und unverwechselbaren Quittungen belegen.

## Ergebnisgrenze dieses Schritts
GitHub-Repo-Verifikation **ja**. Fernzugriff auf persönliche Windows-Prozesse, verschlüsselten API-Key oder lokales Paperkonto **nein**. Daher kein tatsächlicher frischer API-Modellaufruf und kein GPT→Windows-PAPER_FILLED behauptet. Historische Backtests isoliert; Echtgeld vollständig gesperrt.
