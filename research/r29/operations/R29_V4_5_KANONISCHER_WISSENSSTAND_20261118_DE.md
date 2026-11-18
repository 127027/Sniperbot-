# Sniperbot R29 V4.5 – kanonischer Wissensstand und verbindliche Fortsetzung

**Aktiv ab 18.11.2026 (Europe/Berlin). Projektbetreiberfreigabe: GO für komplette Wissenssicherung.**
Repository: `127027/Sniperbot-`; einziger kanonischer Entwicklungsbranch:
`codex/r29-chatgpt-github-paper-cycle-20261115`.

> **DIES IST DIE AKTUELLE QUELLE DER WAHRHEIT FÜR DEN NÄCHSTEN CHAT / CODEX-LAUF.**
> Ein älterer Bericht darf als damalige Beobachtung erhalten bleiben, hat aber keine
> Vorrangwirkung vor diesem Dokument, dem tatsächlich aktuellen Code und frischer
> verifizierter GitHub-/Windows-Evidenz. Insbesondere keine API-Key-Einrichtung,
> keine Neuentwicklung von bereits existierenden Scannern/Kurieren und keine
> Behauptung von Modell-Fills aus einem isolierten Test.

## 0. Strenge Belegklassen und Gültigkeitsbereich

- **CODE:** konkrete Funktion im aktuellen R29-Branch; Implementierung allein beweist keinen Betrieb auf dem Benutzerrechner.
- **CI:** automatisierter, meist isolierter Windows-/Linux-Test; kann Signaturprotokoll, Simulation, Replay, Parsing und Fail-closed-Gates belegen, aber weder ChatGPT-Urheberschaft noch reale Preis-Fills.
- **WINDOWS:** vom Nutzer aus dem laufenden Laptop kopiertes Diagnoselog; ist punktuell beobachtet und kann nach Neustart/Branchwechsel veralten.
- **GITHUB LIVE:** nachgelesene öffentliche GitHub-Datei / Commit zu einem konkreten UTC-Zeitpunkt; eine später publizierte Datei überschreibt den damaligen Befund.
- **CHATGPT TURN:** tatsächlich in einer ChatGPT-Unterhaltung erzeugte Forschungsbewertung; dies beweist nicht den autonomen geplanten Task oder eine historische zeitgleiche Strategie.
- **OFFEN:** kein hinreichender unabhängiger End-to-End-Nachweis. NIE als abgeschlossen kennzeichnen.

Alle zeitgebundenen Zahlen gelten **nur für die genannten Zeitpunkte**; Fortschritt nur nach erneuter Quellenprüfung behaupten. `PAPER_ONLY` / Echtgeld `false` ist zwingend.

## 1. Produktziel, Nichtziele und Systemvertrag

Der Sniperbot soll unbekannte neue Memecoins **prospektiv** erkennen, mit echten zeitgerecht aufgezeichneten Markt-, Social-, News-, Liquidity-, Wallet-/Contract- und Risikosignalen untersuchen und im geschützten **virtuellen** Paper-Konto wiederholt verwalten. Der Nutzer toleriert strategische Fehlentscheidungen, nicht aber erfundene Daten, Hindsight-Leakage oder automatische Käufe außerhalb des vereinbarten Risikovertrags. Zielgrößen wie starke Ausbrüche sind **keine** zuverlässigen Gewinnwahrscheinlichkeiten.

**Einziger strategischer Entscheider: ChatGPT über bereits vorhandene R29-Automationen.**
ChatGPT entscheidet WATCH / BUY / HOLD / SELL / NO_TRADE, Priorisierung, virtuelle Einsatzhöhe und die bewusste positionsgebundene Exit-Strategie. Der bestehende Windows-Bot sammelt und archiviert Quellen, validiert Technik/Provenienz/TTL/Quote/Security/Budget und führt **nur freigegebene signierte Paper-Aufträge** aus. Er darf keine neuen Coins aus lokalem Heuristikscore selbst zum Kauf bestimmen.

```text
Prospektive externe Read-only-Quellen (Providerqualität/Frische getrennt ausweisen)
    -> bestehender Windows-Markt-Collector + historisches lokales Archiv
    -> vorhandener GitHub-Publisher + kanonischer R29-Market-Relay
    -> kanonischer GitHub-Research-Feed (READ-ONLY, ohne private Guthaben)
    -> bestehende ChatGPT-R29-Aufgaben (einziger strategischer Entscheider)
    -> versionierter GPT-Entscheidungs-Archiveintrag + GitHub-Decision-Pointer
    -> bestehender R29-Windows-Kurier: GitHub-Commit-/Eigentümerprüfung
    -> authentifizierter localhost-GPT-Empfänger: Signatur/TTL/Replay/Gates
    -> ein einziges vorhandenes Paper-Ledger + Quittungs-/Statuskanal
    -> später nachweislicher persistenter GPT-autorisierter Exit-Schutz (OFFEN)
```

**Nicht tun:** neue Bots, zweite Cloud-/lokale Strategiemodelle, lokaler OpenAI-API-Key, `-WithCentralAI`, neues UI, PayPal-/Einzahlungsarbeiten, Echtgeld-Order, Wallet-Transfer, Hixton-Verknüpfung, öffentliche private Guthaben, alte Blindreplay-Aufträge mit nachträglich bekannten Gewinnernamen.

GitHub ist **Transport**, **nicht** das GPT-Modell, keine direkte Chat-zu-localhost-Sitzung und kein kryptografischer Beweis von Modellidentität. Bereits vorhandene GitHub-Verbindung allein garantiert weder, dass eine Automation läuft, noch, dass sie eine signierte Entscheidung schreibt.

## 2. Nachgewiesener Windows- und GitHub-Stand 18.11.2026

### A – Echter Marktdatentransport: erfolgreich beobachtet

**WINDOWS vom 18.11.2026 14:31:30.842 UTC:** Bot online, lokaler Capture `2026-11-18T14:30:57.370Z`; **64 Pools**, **16 Headlines**, `RUNNING_RESEARCH`; Publisher `publishing_enabled:true`, Commit `5037000270707e53471e9a8eb32897231f7f6155`. Isolierter in-memory signierter BUY-/SELL-Papertest bestanden, Originalkonto unverändert, **keine** Modell-/Markttrades.

**GITHUB LIVE unmittelbar danach:** `research/market/latest.json` sowohl im vorherigen `codex/research-gateway-v04` als auch im kanonischen R29-Branch hatte exakt Capture `14:30:57.370Z`, **64 Pools**, **24 Research-Alerts**. `research/r29/channel/forward-source-health.json`: `CANONICAL_RESEARCH_FEED_RECENT` mit getrennten Source-Zeitstempeln; `solana-forward-evidence.json` vorhanden, Quote `INDICATIVE_TWO_WAY_PRICES_ONLY`, fehlende verifizierte Sellability/Security. **Die alte Diagnose „kanonischer Feed dauerhaft vom 10.11.“ ist damit überholt.** Dies beweist keinen permanenten 24/7-Feed ohne spätere Monitoring-Prüfung.

**WINDOWS 18.11.2026 15:11:43.429 UTC:** `BOT_NOT_REACHABLE`; Prozess damals nicht gestartet. **Nächster Windows-Test 15:12:52.332 UTC:** Bot wieder online (15 Sekunden Uptime), aktueller Collector-Capture `15:12:38.036Z`, **47 Pools**, **16 Headlines**, isolierter Signaturtest bestanden. 47 statt 64 ist eine neue Momentaufnahme, **kein** beweisbarer Kandidatenverlust. Keine falsche Dauerdiagnose „offline“ aus dem ersten Zwischenstand ableiten.

### B – Tatsächlicher GitHub-GPT-Receiver: transportbereit, keine Fill-Bilanz

**WINDOWS user-supplied lokal** `GET http://127.0.0.1:3030/api/gpt/paper/status`:
```json
{
  "ok": true,
  "mode": "PAPER_ONLY",
  "strategy": "GPT_ONLY",
  "gpt_follow_enabled": true,
  "paper_bot_enabled": true,
  "local_gpt_bridge_ready": true,
  "old_local_autopilot_enabled": false,
  "received_decision_count": 8,
  "last_decision_id": "gpt_e7c715480f009a0dd80040fa78c186a7",
  "paid_openai_api_required": false,
  "real_trading_enabled": false
}
```

Die Zahl **8** bedeutet registrierte Entscheidungs-IDs im lokalen Replay-/Receiver-State, **NICHT** acht Aufträge und **NICHT** acht Trades. Nutzer-Log enthielt noch alte R28-Diagnose ohne `github_gpt_courier`: Dieser einzelne Test wurde im vorhandenen Ordner `Sniperbot0.1` vor eindeutig bestätigtem V4.4-Laptop-Update ausgeführt. **Die tatsächlich installierte Codeversion kann nicht allein aus GitHub-Merge abgeleitet werden.**

**GITHUB LIVE** `research/r29/channel/gpt-paper-receipt.json`: letzte passende ID
`gpt_e7c715480f009a0dd80040fa78c186a7`, `received_at_utc: 2026-11-17T17:58:45.322Z`, `action:NO_TRADE`, `status:NO_TRADE`, `reason:GPT_RESEARCH_NO_ORDER`, `submitted_by:GITHUB_OWNER_ATTRIBUTED_GPT_RELAY`, `origin_model_signature_verified:false`; kein Wallet-/Kontobeleg. `research/r29/channel/gpt-paper-context.json` beim geprüften Stand `observed_at_utc:2026-11-18T15:12:44.163Z`, `gpt_follow_enabled:true`, `paper_bot_enabled:true`, `positions:[]`.

**Interpretation:** Der GitHub-Entscheidungs-/Receipt-Kanal kann Nachrichten und NO_TRADE aufeinander beziehen. **Weiterhin unbewiesen:** individuell authentifizierte Modellherkunft, neu prospektiv tatsächlich von der autonomen Aufgabe entschiedener unbekannter Coin mit echter lokal signierter BUY- und SELL-Quittung, positiver/negativer Paper-PnL; kontinuierlicher positionsgebundener Exit. Ein 200-HTTP-Code oder `local_gpt_bridge_ready:true` beweist keinen Kauf.

### C – Bestehende GPT-Automationen, keine neuen erzeugen

Am 18.11.2026 in den Automations-Metadaten als **aktiv** geprüft:
- **R29 GPT Forward Paper Scanner**, Kennung `Automation_800730e23f3481919d5780bc885e9868`: prospektive GPT-/Paper-Forschung, stündlicher Wakeup. Dies ist die Rolle für echte neue Kandidaten.
- **Sniperbot R29 GPT-Paper-Diagnoseführer**, Kennung `6af9cdf5ba548191a1c2304988e4d3ab`: historischer as-of GPT-Blindtest, stündlicher Wakeup, **BACKTEST ONLY**.

Beide Aufgaben sind **unterschiedliche Workflows**, nicht gegeneinander austauschbare unabhängige Live-Trading-Bots. Ein „Wecklauf abgeschlossen“ beweist nicht automatisch eine vollständige Marktanalyse oder einen veröffentlichten signierten BUY. Vor Änderungen aktuellen Lauf/Output/Branch verifizieren; Schedule nicht neu erstellen oder verdoppeln. Für historische Entscheidungen niemals post-facto Gewinnerdateien in den Modellinput einspeisen.

## 3. Konsolidierte Entwicklungsgeschichte / bereits erledigte Arbeit

| Zeitpunkt / PR | Tatsächlich geliefert / bewiesen | Was ausdrücklich NICHT bewiesen wurde |
|---|---|---|
| V0.4–V0.20 (Nov 2026) | Papier-Ledger, Marktforschung, Signaturpipeline, Windows-Starter, UI, lokale synthetische BUY/SELL-Regressionen | echte Cloud-GPT-Orders oder Echtgeldhandel |
| V4.1 PR #54, Merge `b32bf8e3e3c9953fa7c9737a2e4189b93edefe06` | Oktober-Quelle 821.849 Solana-Launches, 2.296.466 Minutenmerkmale, 408 chronologische Stundenframes, Zeit-/Source-Prüfungen, Cache-Laufzeitfix und CI | 10 unabhängige historische GPT-Trading-Holdouts, historische Gewinne |
| V4.1 PR #55, Merge `67a51e834d67ba1c1291fdec99fc85bf7a32db48` | technische lokale GPT-Response-Option, as-of-knowledge-loader und Event-Timing-Forschung im Code, Regressions-Tests | ein tatsächlich gestarteter und zahlender Provider-Aufruf auf dem Laptop; diese API-Option wurde später **absichtlich abgeklemmt** |
| V4.2 PR #56, Merge `8ad1220cb789d95204aa79f9834c056344f23109` | Seiten-0-Verlust beseitigt: **310.540 / 310.540** geeignete Kandidaten-Zeitpunkt-Paare, **5.054 Seiten**, Paging-Verlust **0** | Quellenabdeckung der 241.649 historischen Starts ohne Minutenmerkmale; tatsächliche historische GPT-BUY/SELL |
| V4.3 PR #57, Merge `d0215a0ea75c9a4504e650e66d3b6d16e280e97a` | 5-Minuten-Quellenpoll und Event-Priorisierungslogik, 1–24 Modellversuche/Tag als experimentelle lokale Altkomponente | echte GPT-Aufrufe oder Trades |
| V4.3 PR #58, Merge `d959b0f7695892e91f7d495d6a680cb7495b5e39` | unerlaubte lokale Autopilot-BUYs verhindert; echtes Event-ID-Weiterreichen; bei `entriesEnabled=false` weiterhin GPT-SELL möglich; globaler Exit darf `GPT_GUARD` nicht fremd auslösen | individuell GPT-autorisierte dauerhafte Exit-Policy |
| V4.4 PR #59, Merge `0c6604ab9252a9781616f3d14c9d727ba08ed864` | **einziger Strategiekanal GitHub ChatGPT**, lokal bezahlte API-Option/Key-Abfrage aus Start und Server entfernt; GitHub-GPT-Diagnose; Windows-/Linux-CI grün [44328749706](https://github.com/127027/Sniperbot-/actions/runs/44328749706) | durch GitHub-Commit allein bestätigte Laptop-Installation oder späterer echter Modell-Fill |

Die historische masked-16-Kandidaten-ChatGPT-Forschungsbewertung (12.10.-Frame, am 18.11. erzeugt): **6 WATCH / 10 NO_TRADE / 0 BUY/SELL**, 14 zuvor nicht auf Seite 0. **Heutiger Konversationsentscheid über vergangene Daten**, kein authentischer Oktober-2026-Tradinglauf und keine Holdout-PnL. FTR-/PIERRE-/Dacity-/Trump-Contract-Namen sind ausschließlich POSTFREEZE-Diagnose für den Operator; historische GPT-Frames dürfen diese nicht sehen. Bei fünf Rollen ist eine Rolle eine **Analysefunktion**, keine Notwendigkeit für fünf zusätzliche aktive Tasks.

## 4. Das Fehler- und Lernjournal: NICHT WIEDERHOLEN

| Fehler / falsche Schlussfolgerung | Reale Ursache, Reparatur oder Entscheidungsregel |
|---|---|
| „GitHub-/Laptop-Verbindung fehlt, neue Bots/Transport bauen“ | Existierender R29-Windows-Kurier + DPAPI-GitHub-Token + `r29-canonical-market-relay` + GPT-Receipt sind vorhanden; 18.11. echte Read-only-Übertragung bewiesen. Vor jeder Neuentwicklung echte aktuelle Endpunkte, SHA, UTC und Fehler prüfen. |
| „API-Key nötig, weil `central_ai.enabled:false`“ | **Falsch.** `central_ai` war eine getrennte optionale lokal kostenpflichtige API-Variante. V4.4 hat `-WithCentralAI` und Direkt-Responses-Start entfernt. `central_ai.enabled:false` ist gewollt. GPT läuft nur über vorhandene ChatGPT-Automationen und GitHub. |
| „Nur Seite 0 der historischen Kandidaten“ | V4.2 Paging-Export repariert. Kompatibilitäts-`hourly_asof_research_queue_frames` bleibt Seite-0-Zusammenfassung; wahre Vollständigkeit in SHA-geprüften `hourly-pages` + Index + `feature-decisions` + `model-shortlists`. NICHT erneut Paging-Sweeps als fehlenden Fix verkaufen. |
| „Quotenreduzierung = verschwundene Kandidaten“ | Vollständig archivierter Trichter getrennt von modellbegrenzter priorisierter Watchlist. 310.540 eligible Checks ≠ 310.540 notwendige GPT-Aufrufe. Wer zurückgestellt wird, bleibt mit Grund sichtbar. |
| „Aktueller GitHub Feed noch vom 10.11.“ | Am 18.11. später durch echten lokalen Capture, Publisher-Commit und kanonische GitHub-Kopie überholt. Stale-Findings **datieren**, nicht historisch löschen. Bei erneutem Stale-Fall zuerst lokalen Collector/Relay-Status und Publisher-Fehler messen. |
| „Server offline = Modellfehler“ | Ein `BOT_NOT_REACHABLE` bei gestopptem Prozess ist zunächst Start-/Portstatus; folgender Windows-Test zeigte online. Nicht deshalb neuer Transport/API einrichten. |
| „8 empfangene Entscheidungen = 8 Käufe“ | Replay-IDs sind kein Handelsjournal. Aktuelle letzte Quittung war NO_TRADE. Echtgeld und Paper getrennt. Kein Gewinn ohne lokales Original-Ledger, unabhängige Quotes, Kosten und Abrechnungsreceipt. |
| „`GPT_GUARD` = vollständiger laufender GPT-Exit“ | Falsch: bisher generischer globaler Stop entfernt, ohne positionsgebundene signierte GPT-Policy zu schaffen. Risiko: ein GPT-Paper-BUY könnte ohne zulässigen autonomen Sell-Schutz verbleiben; **keine neuen automatischen Paper-BUYs** bis abgenommen. |
| „GitHub Owner commit beweist KI-Signatur“ | Der Courier prüft Owner-verknüpfte Pointer und Archive, nicht die kryptografische Modellidentität. Provenienz separat belegen; Repo-Datei ist Input, nie alleinige Orderberechtigung. |
| „Solana zwei Richtungen = ausführbare Sell-Quote“ | `INDICATIVE_TWO_WAY_PRICES_ONLY`, Finality/LP/Holders/Contract/Sellability unbekannt. In `gpt-paper-local-receiver.mjs` sind neue Solana-Handels-Sicherheitsgates noch gesperrt; nicht als Live-Solana-BUY ausgeben. |
| „Ergebnisse historischer Gewinner helfen dem Blindtest“ | Hindsight/Leakage verboten. Nur vorab versiegelte as-of Originalzeitfenster und unabhängige Modellentscheidung; Referenznamen getrennt als postfreeze Operator-Material. |
| „Langer CI-Lauf durch längeres Timeout lösen“ | PR #54 reparierte ineffiziente wiederholte SQL JOIN/COUNT/SORT-Abfragen mit inkrementellem Index; verdeckte Timeout-Erhöhung ist kein kausaler Fix. |
| „Unit-Test oder nur Labor-Gewinn beweist Live-Profit“ | Ein isolierter BUY/SELL-Selftest mit simulierter +48,01/-30,398 Test-USDC verändert kein reales Benutzer-Paper-Konto, ist kein echter GPT-Trade und kein Profitnachweis. |
| „Neuer GitHub-Commit aktualisiert Windows sofort“ | Falsch: Nutzer-Ordner `Sniperbot0.1` bleibt bis zum expliziten Backup/Neudownload/Start alte Version. Nie ohne lokales Versions-/Endpunktprofil behaupten, die neue Software laufe auf dem Laptop. |

## 5. Verbindliche Code- und Evidence-Landkarte

- **Start:** `Sniperbot_Starten.bat` -> `runner/windows-supervisor.ps1 -WithR29`. Kein weiterer BAT-Starter.
- **Einziger Strategieweg:** `runner/r29-windows-courier.mjs` + `runner/gpt-paper-github-relay.mjs` -> `runner/gpt-paper-local-receiver.mjs`; `runner/gpt-paper-protocol.mjs` (Format, Hash, Deadline, Archiv).
- **Feed:** `runner/research-market-collector.mjs`, `runner/research-market-daemon.mjs`, `runner/research-market-publisher.mjs` (älterer Gateway-Zielbranch), `runner/r29-canonical-market-relay.mjs` (kanonischer R29-Branch), `runner/forward-source-health.mjs`, Solana Stream/Quote-Research.
- **Paper:** `runner/server.mjs`, `runner/core.mjs`, `runner/paper-agent-pipeline.mjs`, `runner/live-paper-risk.mjs` + `runner/live-paper-security.mjs`. Lokale Heuristik `runner/live-paper-autopilot.mjs` darf unter R29 keine neuen unabhängigen BUYs starten.
- **Diagnose:** `node runner/r28-connection-diagnostic.mjs`, `/api/gpt/paper/status`, `/api/gpt/paper/context`, `/api/health`. Bei neuem R29-Build `github_gpt_courier` auswerten. `central_ai.enabled:false` erwartet. Keine Chat-/Laptop-Direktverbindung.
- **Github proof:** `research/market/latest.json`, `research/r29/channel/forward-source-health.json`, `solana-forward-evidence.json`, `regular-paper-presence.json`, `gpt-paper-decision.json`, `gpt-paper-receipt.json`, `gpt-paper-context.json`.
- **Historischer Volltrichter:** `research/r29/operations/R29_V4_2_VOLLSTAENDIGER_KANDIDATENTRICHTER_20261118_DE.md`; die as-of gzip-Speicher, SHA-Index, geblindete Quellen und Holdout-Gates unverändert.
- **Legacy / NICHT LIVE:** `runner/central-ai-coordinator.mjs` und ältere V0.21-/R28-API-Dokumente sind **archivierte nicht gestartete Altpfade**, keine Lizenz für `-WithCentralAI` oder Zahlungsaufforderung.

## 6. Abnahme-Gates vor einem neuen GPT-Paper-Kauf

1. **Quellen-/Snapshot-Gate:** aktuelle und getrennt zeitgestempelte unabhängige Marktquellen, vollständige Contract-Pool-Kettenidentität, eindeutiger erster lokaler Beobachtungszeitpunkt, Quelle/As-of und No-future-Info.
2. **Strategie-Gate:** ein tatsächlicher ChatGPT-R29-Automationslauf mit nachvollziehbarer Eingabe und Entscheidung; `NO_TRADE` bleibt valide und darf nicht in BUY konvertiert werden.
3. **Transport-Gate:** immutable GitHub-Archiv + Pointer/Hash + Owner-Attribution + lokale Capability, signiertes Paper-Envelope, TTL/Replay-Proof, echte Windows-Receipt-ID. Das allein ist kein Modell-Signaturbeweis.
4. **Sicherheits-Gate:** unabhängige aktuelle Contract/LP/Holders/Rug-/Route-/Liquiditäts-/Sellability-Prüfungen; bei UNKNOWN/Stale kein BUY.
5. **Exit-Gate (aktuell FEHLT):** vor Kauf vom GPT autorisierte persistierte positionsgebundene Policy (Risiko/Stop/Trailing/Timeout/Markt-Notfall) mit frischer ausführbarer Zweiweg-Quote, idempotentem signed SELL und Überwachung auch bei Bot-AUS, Offline, Neustart und Modell-Kontingentpause; sicherer Fehlermodus und nachvollziehbare Quittungen.
6. **Paper-Buchungs-Gate:** nur vorhandene virtuelle Guthaben, dokumentierte Kosten/Slippage-Modellannahmen, dokumentiertes `PAPER_FILLED` auf dem realen Benutzer-Paper-Ledger (keine isolierte Testledger-Quittung), später unabhängiger BUY→HOLD→SELL-Zeitstempel und PnL.
7. **Echtgeld-Gate:** weiterhin dauerhaft **AUS**; eigenständige ausdrückliche Freigabe und regulatorische/technische Abnahme wären nötig, sind nicht Teil von R29.

**Bis Gate 5 wirklich bestanden ist: keine neuen autonomen Paper-BUYs.** Bereits vorhandene Paper-Positionen nicht löschen oder per blindem Reset abschalten. Das Pausieren neuer Käufe darf gültige signierte GPT-SELLs nicht verhindern.

## 7. Verbindliche nächste Schritte (nicht noch eine Bestandsaufnahme)

1. **R29 V4.5 Wissensbereinigung** mit PR, Win/Linux CI, Dokumentation-Guard und Aktualisierung maschinenlesbarer Checkpoint. Alte Zeugnisse datieren/archivieren, nicht fälschen.
2. **Prospektive tatsächliche ChatGPT-Automationsentscheidung** für frische neue Kandidaten nachweisen: Input-As-of, Prüfuhrzeit, Modellentscheidung, GitHub-Archiv/Pointer, Signatur-/Transport-Quittung; keine simulierte Ersatzentscheidung.
3. **GPT-autorisierter Positions-Exit** technisch implementieren und in bestehenden Komponenten testen, einschließlich Neustart, stale/failing Quote, Bot-AUS und Idempotenz.
4. Erst nach Abnahme von Schritt 3: vom GPT genehmigter unbekannter Coin PAPER-BUY, dauerhafte HOLD-/Risikoprüfung und signierter PAPER-SELL mit nachvollziehbarer Ledger-Quittung.
5. **Historischer 7+3 Blindtest** parallel getrennt fortsetzen; Datenlücken (241.649 Starts ohne Minutenmerkmale) als UNKNOWN behandeln; keine Vorhersagegenauigkeit oder PnL erfinden.

Nicht erneut: Scanner/Paging-Export neu implementieren, neuen GitHub-Kurier erfinden, neue Agenten/Dots kreieren, API-Key bestellen, PayPal anbinden, gänzlich neues UI bauen.

## 8. Windows-Operator-Verfahren / sicherer versionsgebundener Start

1. Altes Bot-Fenster mit `Q` sauber schließen; **vor Update** private lokale Daten in `%LOCALAPPDATA%\MemeSniperPaper` und projektspezifisch `.local` sichern. Backups lokal halten, nie ins öffentliche Repository pushen.
2. Den **kanonischen Branch** separat als ZIP entpacken; nur die projektgebundene `.local`-Kopie in den neuen Root übernehmen, wenn benötigt; die zentrale LocalAppData-Ablage unangetastet lassen.
3. `Sniperbot_Starten.bat` per Doppelklick ohne Parameter. **Kein** `-WithCentralAI`, `-ResetAiKey`, OpenAI-Key, kein zusätzlicher Token außer vorhandener lokal verschlüsselter GitHub-PAT.
4. Zweite Konsole: `node runner/r28-connection-diagnostic.mjs` oder `curl.exe -s http://127.0.0.1:3030/api/gpt/paper/status`. Bot-online, aktuelle Feed-Captures und `local_gpt_bridge_ready` getrennt prüfen.
5. Falls Diagnose **kein** `github_gpt_courier` enthält, kann die laufende **ältere** Diagnoseversion oder ein anderer Bot-Prozess beteiligt sein. Version und aktuell laufenden Port/Prozess prüfen, bevor neue Entwicklungsarbeit beschlossen wird.
6. Persönliche Ledger-Datei, Wallet, Seed, DPAPI-Keys, GitHub-PAT und Kontostände niemals in Chat/GitHub übertragen. Bei Fehler zuerst angezeigte Fehlerklasse, keine Secrets posten.

## 9. Fortsetzungsprotokoll für jeden neuen Entwickler/Chat

**Zuerst lesen:** `AGENTS.md` → dieses Dokument → `SNIPERBOT_R29_START_HERE.md` (nur aktueller Kopf und belegbare Links) → `research/r29/operations/R29_LATEST_CHECKPOINT.json` → aktuelle R29-GitHub-Kanäle/PRs/CI. Keine Wiederholung alter GO-Fragen. Relevante Dateien mit ihrem **aktuellen** GitHub-Branch/SHA erneut lesen.

Bei jedem relevanten Abschluss:
- Fakten mit **CODE / CI / WINDOWS / GITHUB LIVE / CHATGPT TURN / OFFEN** klassifizieren.
- UTC-Quellen-/Publish-/Receiver-Quittungen mit SHA und belegtem Status festhalten.
- In genau diesem Dokument den kanonischen Stand ergänzen und Checkpoint aktualisieren, nicht beliebige neue „START_HERE“-Varianten erzeugen.
- PR mit Win-/Linux-Testlauf und überprüftem HEAD; keine Merge-Behauptung auf Basis abgebrochenem, altem oder fremdem SHA.
- Abschließend **eine nächste konkrete Aufgabe**, eine Liste offener Blocker, und was vor allem **nicht** wieder gebaut werden soll.
- Eine Cloud-GitHub-Änderung kann den persönlichen Laptop nicht eigenständig patchen.

## 10. Versionierte Historie und Prioritätsregel

1. **Aktuell verbindlich:** dieses R29-V4.5-Dokument, `AGENTS.md`-V4.5-Kopf, `ERSTER_START.txt`-V4.5-Kopf, aktuelle technische Sourcefiles.
2. **Maschinenlesbarer aktueller Stand:** `research/r29/operations/R29_LATEST_CHECKPOINT.json` und der zu V4.5 gehörende Docs-Audit.
3. **Unterstützend:** R29 V4.4 GitHub-only, V4.3 Sicherheitsrollen, V4.2 Paging-Vollständigkeit, PRs #54–#59.
4. **Archiv / chronologische Originalzeugnisse:** ältere V0.x-/R27-/R28-/V4.1-Dokumente, inklusive ursprünglicher API-basierter V0.21-Variante und damaliger fehlender Connectivity. Historische Aussagen sind **nicht** gelöscht, aber als heutige Windows-Anleitung **außer Kraft**.
5. **Nie als historischer GPT-Input:** diese Entwicklererkenntnisse, nachträglich bekannte Gewinner, Postfreeze-Namenslisten, spätere Kursverläufe, Nutzer-Bot-Zustand.

**Abschlussdefinition:** Keine falsche Kostenaufforderung, keine widersprüchlichen Aktivanweisungen, keine Duplikat-Infrastruktur, keine unwahren Handelsnachweise; das neue Team kann reproduzierbar genau am verbleibenden Modell-/Exit-/Paper-Receipt-Blocker fortsetzen.
