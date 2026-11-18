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

Die Zahl **8** bedeutet registrierte Entscheidungs-IDs im lokalen Replay-/Receiver-State, **NICHT** acht Aufträge und **NICHT** acht Trades.

**AKTUELLER BETRIEBS-HINWEIS:** Das letzte Nutzer-Status-JSON hatte zugleich `paper_bot_enabled:true` und `gpt_follow_enabled:true`. Der aktuelle `gpt-paper-local-receiver.mjs` prüft bei einem BUY das lokale `entriesEnabled`, aber **noch keinen vollständigen GPT-signierten dauerhaften Exit-Vertrag als technische Kaufvoraussetzung**. Deshalb darf aus der dokumentierten *Policy* „keine neuen automatischen BUYs bis Exit-Abnahme“ **nicht** geschlossen werden, dass dies bereits überall im Code erzwungen wird. **Bis ein sicherer Code-Exit-Gate implementiert/abgenommen ist, den Paper-Bot im Dashboard auf AUS stellen (neue Einträge sperren); bestehende signierte GPT-SELLs bleiben dabei laut PR #58 ausführbar.** Keine Paper-Positionen oder Guthaben löschen.
 Nutzer-Log enthielt noch alte R28-Diagnose ohne `github_gpt_courier`: Dieser einzelne Test wurde im vorhandenen Ordner `Sniperbot0.1` vor eindeutig bestätigtem V4.4-Laptop-Update ausgeführt. **Die tatsächlich installierte Codeversion kann nicht allein aus GitHub-Merge abgeleitet werden.**

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

---

## Nachtrag R29 V4.6 – 18.11.2026: GPT-Exit-Guard und tatsächlicher Forward-Quellentest

**Statuskategorien strikt unterscheiden:** CODE/CI-Implementierung des Guards, GPT-Entscheidung in bestehender Automation, MANUELL ANGESTOSSENER ChatGPT-Run-Now, öffentliches GitHub-Decision-Archiv und erst später tatsächliche lokale Windows-Orderquittung.

### Schritt 1 – Forward-GPT: was tatsächlich belegt ist

- **Bestehende, aktive Automation:** `R29 GPT Forward Paper Scanner` `Automation_800730e23f3481919d5780bc885e9868`, stündlicher Wakeup (keine neue Automation). Der vorhandene getrennte historische Task ist strikt BACKTEST_ONLY.
- **AUTOMATION / JOURNAL:** `research/r29/forward-scans/2026-11-18/gpt-forward-20261118T072736000Z-source-data-gap.json`: tatsächlich als `CHATGPT_SCHEDULED_INLINE` protokollierter GPT-6-Review **07:27:36 UTC**; `NO_TRADE`, kein aktueller handelbarer Kandidat, kein Paper-Auftrag, kein echter Order-Fill. Modellidentität kryptografisch nicht verifiziert. Scan-Journal selbst und Aufgabenmetadaten belegen eine dokumentierte Aufgabe, nicht eine vom Anbieter attestierte Provider-API-Antwort.
- **Neuer späterer Datenstand GITHUB LIVE:** `research/market/latest.json` **16:13:37.379 UTC**, **47** Pools / **24** Research-Alerts; `forward-source-health.json` **16:14:18.822 UTC** `CANONICAL_RESEARCH_FEED_RECENT`, `source_complete:false`. `gpt-paper-security.json` 15:31:27 UTC **DATA_GAP_NO_MATCHING_FRESH_EVM_CANDIDATE**; Solana `solana-forward-evidence.json` 16:14:14 UTC **INDICATIVE_TWO_WAY_PRICES_ONLY**, keine verifizierte vollständige Sellability/LP/Holders oder ausführbare bidirektionale Quotes. Somit **NO_TRADE** statt erfundener Gewinner-Käufe.
- **Echter neuer GPT-MANUELLER Inline-Review durch `run_now`, nicht als autonomer Stundenlauf ausgeben:** `gpt_9a02a1f1d8699bdd62f393ee2da028a0` am **16:19:33.859 UTC**, `NO_TRADE`, archived unter `research/r29/gpt-decisions/2026-11-18/` (Commit `f7ca63b946c76936350a736c92cca6e50f352f8d`), Pointer `research/r29/channel/gpt-paper-decision.json` (Commit `4263ebdec178577f2ff8bb42775c5d501bc21f6c`). Beide GitHub-Commit-Autoren `127027`, aber GitHub-Owner-Attribution ist keine kryptografische Modellidentität. **GITHUB-LIVE-RECEIPT INZWISCHEN TATSÄCHLICH EMPFANGEN:** `research/r29/channel/gpt-paper-receipt.json` mit derselben ID `gpt_9a02a1f1d8699bdd62f393ee2da028a0`, `received_at_utc:2026-11-18T16:21:09.742Z`, `status:NO_TRADE`, `reason:GPT_RESEARCH_NO_ORDER`, `submitted_by:GITHUB_OWNER_ATTRIBUTED_GPT_RELAY`, `origin_model_signature_verified:false`; Commit `6cf735a90ba2bb6a4de937c098b8faf249b36dfc` (GitHub-Benutzer 127027). **Gemessene GPT-Decision-Creation→lokale Windows-Quittung: 95,883 Sekunden** (16:19:33.859→16:21:09.742 UTC). Dies ist eine tatsächliche Paper-NO_TRADE-Empfangsquittung, keine BUY-/SELL-Fill-Quittung, keine garantierte End-to-End-Eventreaktionszeit und kein Beweis eines *autonom ausgelösten* Full-Reviews (Lauf wurde hier manuell mit `run_now` angestoßen).
- **Nachgewiesene Teil-Latenz vom Vortag:** Pointer `2026-11-17T17:58:12.581Z` → public Laptop-Receipt `2026-11-17T17:58:45.322Z` = **32,741 Sekunden** für `NO_TRADE`. **NICHT** die Latenz Markt-Event → GPT → BUY → Paper-Fill.
- **Tatsächliche GPT-Reaktionslücke:** um 16:13:37 UTC war der letzte dokumentierte tägliche vollständige Review von 07:27:36 UTC schon etwa **8 Stunden 46 Minuten** her; diese *später* entstandenen Quellen waren zu diesem Review noch nicht verfügbar. Keine gemessene Event-zu-GPT-Vollreview-Latenz für diesen Snapshot, da ein zweiter autonomer Full-Review bislang **nicht belegt** ist. Ein neuer Chat darf die 32,741 Sekunden deshalb nicht als garantierte Sniper-Reaktion verkaufen.

**BESTEHENDE Forward-Automation gezielt korrigiert (kein neuer Task):** `Automation_800730e23f3481919d5780bc885e9868` hat weiterhin dieselbe aktive stündliche RRULE, aber einen zusätzlichen V4.6-Sicherheitsprompt. Er untersagt ausdrücklich jedes GPT-BUY-Pointer-Publishing, solange die V4.6-Exit-Guard-Installation und unabhängige Quellen nicht lokal abgenommen wurden, verlangt V2-Exit-Policy bei späterem BUY und prüft bei jedem stündlichen Wake **auch nach dem ersten Tagesreview** neue frische Ereignisse, damit `plan=1` nicht alle späteren Kandidaten ignoriert. Der historische Task blieb unverändert. **Das beschleunigt nur die Priorisierung innerhalb des bestehenden Stundenrasters, niemals auf Sekunden/5-Minuten-GPT-Reaktionen.**

**Architekturgrenze:** ChatGPT-Automationen können gemäß vorhandener Schedulersteuerung **höchstens stündlich** ausgeführt werden. Der aktuelle Task erlaubt selbst bei 24 Analysen/Tag keine Vollrecherche öfter als einmal pro Stunde; ein Ausbruch innerhalb weniger Minuten ist so nicht zuverlässig handelbar. Ein lokaler 5-Minuten-Collector ändert diese Cloud-Latenz nicht. **Kostenfreie Verbesserung innerhalb des vorhandenen Systems:** die gleiche bestehende Automation konsequent mit maximal stündlicher, ereignispriorisierter *tatsächlicher* GPT-Vollprüfung für frische neue as-of-Ereignisse betreiben, ihren einmal täglichen `plan:1`-Fallback nicht als Grund nutzen, neue Ereignisse zu ignorieren; das lokale Research-/Watch-Archiv priorisiert 5-Minuten-Ereignisse für den nächsten Wecklauf. **Eine sub-stündliche GPT-Automation ist nicht verfügbar; keine neue Task, keine zweite API ohne ausdrückliche Freigabe.** Realistische Verzögerung bleibt im ungünstigen Fall fast eine volle Stunde plus GitHub-/lokalem Courier-Takt und Source-Lags. Für sekundenschnelle Erstkäufe ist diese Architektur ungeeignet, solange sie unverändert bleibt.

### Schritt 2 – Hard-Guard und kontinuierliche GPT-Policy-Exits (PR #61)

- **CODE:** `runner/gpt-paper-protocol.mjs` akzeptiert rückwärtskompatible V1-WATCH/SELL/NO_TRADE, erfordert aber für *neue* GPT-BUYs V2 mit exakt validierter und im Hash des vollständigen GitHub-Entscheidungsarchivs enthaltener `exit_policy`.
- **CODE doppelt fail-closed:** `runner/gpt-paper-local-receiver.mjs` blockiert V1-BUYs explizit; `runner/paper-agent-pipeline.mjs` blockiert selbst direkte signierte GPT-BUYs ohne `gptExitAuth`. Ein Dashboard-Schalter allein genügt nicht.
- **CODE:** Bei einem tatsächlich akzeptierten GPT-BUY werden exakt die ursprüngliche GPT-`decision_id`, der kanonische Policy-Digest und Stop-/Profit-/Trailing-/Max-Hold-/Quote-/Liquiditäts-Grenzen der konkreten Paper-Position zugeordnet. Kein globaler Legacy-Stop ersetzt die GPT-Autorisierung.
- **CODE:** der **bereits vorhandene** `runner/server.mjs` führt bei laufendem Programm alle 30 Sekunden `gptPaperReceiver.monitor()` aus; die Policy bleibt beim Neustart in demselben Paper-Ledger. Eine lokale, kurzlebige Ed25519-Signatur auf einem positionsgebundenen SELL, Replay-Tombstones und ein 1-Minuten-Versuchsfenster schützen gegen unautorisierte Doppelverkaufe. `entriesEnabled:false` und `gptPaperFollow:false` dürfen einen **vorab genehmigten Policy-SELL** nicht unterdrücken.
- **Beleggrenze:** Preisbewertungen basieren weiterhin auf **indikativen** DEX-Screener-Marktquotierungen plus modelliertem 1%-Paper-Fee. Keine ausführbaren echten DEX-Sell-Quotes, kein reales Routing oder Onchain-Sellability-Nachweis. Bei fehlenden, alten oder inkonsistenten Pool-/Quote-Daten wird **kein fiktiver Paper-SELL** gebucht; Monitorstatus bleibt prüfbar. Die Überwachung kann während eines ausgeschalteten Windows-Prozesses weder prüfen noch verkaufen; sie setzt bei Neustart fort. **PAPER_ONLY**.
- **CI:** `runner/gpt-position-exit.test.mjs` prüft abgesicherte V1-BUY-Ablehnung, V2-Policy, Bot AUS, unabhängigen Stoppverlust, fehlende/stale Quote, Neustart, signierten SELL und Replay. Zusätzlich bestehende GPT-Paper-Regressionen und tatsächliches isoliertes localhost-HTTP-Gateway; weder UI-Test noch Mock sind echter GPT-Modell-Trade.
- **LAPTOP-ABNAHME OFFEN:** PR-/CI-Code und Benutzer-Laptop können verschiedene Versionen haben. Vor neuer Paper-Kauffreigabe **explizite Windows-V4.6-Installation und lokalen Monitor-/Statusnachweis** abwarten.

### Schritt 3 – echter vollständiger GPT-Paper-Handelszyklus

**Weiterhin OFFEN:** Die aktuelle echte GPT-Entscheidung lautet begründet NO_TRADE. Daher sind `GPT-BUY → lokaler Paper-Fill → Modell-HOLD → Policy-/GPT-SELL → PnL` noch nicht durch ein reales prospektives Markt-/Windows-Ledger nachgewiesen. Ein isolierter BUY/SELL-Test mit Fixture-Preisen ist nur eine Architekturregression und ersetzt keinen echten GPT-Order-Turn. Kein Trade erzwingen.

### Sichere Windows-Rollout-Abfolge für diesen Patch (erst nach PR-Merge und grüner CI)

1. Bestehenden Dashboard-Bot für neue Einträge AUS lassen, offene Paper-Positionen dokumentieren, bisherige Konsole geordnet mit `Q` stoppen.
2. `%LOCALAPPDATA%\MemeSniperPaper` (inkl. privatem Ledger/DPAPI) und bisheriges Ordner-`.local` lokal **sichern**, niemals nach GitHub hochladen/überschreiben.
3. Aktuellen **kanonischen** R29-Branch in einen **separaten** Windows-Ordner entpacken, gegebenenfalls alte `.local`-Forschungsdaten kopieren; bestehende zentrale LocalAppData-Paper-Daten unverändert lassen.
4. `Sniperbot_Starten.bat` normal doppelklicken (GitHub-only, **kein `-WithCentralAI`, kein OpenAI-API-Key**).
5. Zweite Konsole im neuen Ordner: `node runner/r28-connection-diagnostic.mjs`, danach `curl.exe -s http://127.0.0.1:3030/api/gpt/paper/status`. Auf `exit_guard_required_for_new_gpt_buy:true`, `continuous_gpt_exit_monitor_enabled:true`, `local_gpt_bridge_ready:true`, aktuelle Quelle und den laufenden Paper-Bot achten; GPT-Positionen in altem v1-Format haben **noch keine** autorisierte Policy. Nicht automatisch kaufen, falls ein Versions-/Quote-/Monitorstatus abweicht.
6. Erst nach **tatsächlicher** Sicherheitsabnahme am Windows-PC und unabhängigen ausreichenden Quellen/GPT-Entscheiden die Kaufpause neu bewerten; niemals ein NO_TRADE übergehen.


**V4.6-PR-Abnahme (18.11.2026):** [PR #61](https://github.com/127027/Sniperbot-/pull/61) wurde nach erfolgreicher [Windows-/Linux-Gesamt-CI](https://github.com/127027/Sniperbot-/actions/runs/44348046342) auf finalem PR-Head `59385e09d928249d925b77bc2e1edb5b6376d6a3` gemergt. Merge-Commit `d9f972efe08f232e3810bf8db4b22898fbd55179`. Eingebaute Regressionen validieren v1-BUY-Fail-Closed, v2-Policy-Bindung, Bot-AUS-Exit, Neustart, Quote-Ausfall, signierten und gegen voreiligen Exit geprüften SELL. **CI ist kein persönlicher Windows-Rollout und kein realer GPT-BUY/SELL-Handelsbeleg.** Nächste verbindliche Aktion: lokale V4.6-Abnahme auf dem Benutzerrechner, ohne vorhandenes Paper-Ledger anzufassen.


### R29 V4.6 – tatsächliche Windows-Statusabnahme, 18.11.2026, 16:39:24 UTC

**WINDOWS vom Nutzer direkt aus dem lokalen `Sniperbot0.1`-Ordner:** `node runner/r28-connection-diagnostic.mjs` und `curl.exe -s http://127.0.0.1:3030/api/gpt/paper/status` zeigen den geladenen neueren V4.6-Paper-Server: `bot.online:true` (Uptime 44 s), `github_gpt_courier.local_signed_receiver_ready:true`, `local_gpt_bridge_ready:true`, `exit_guard_required_for_new_gpt_buy:true`, `continuous_gpt_exit_monitor_enabled:true`, `paid_openai_api_required:false`, `real_trading_enabled:false`. Der neue technische BUY-V2-Exit-Schutz ist somit **auf dem Nutzer-Laptop nachweislich geladen**. Das Status-Flag beweist noch keine tatsächlich über mehrere Ticks ausgeführte Exit-Transaktion.

**WINDOWS State:** `gpt_positions_with_validated_exit_contract:0`, `gpt_positions_missing_exit_contract:0`; somit gab es beim Test keine nach diesem Mechanismus gemeldeten GPT-Positionen. `latest_gpt_exit_status:null`, `latest_gpt_exit_reason:null` zeigen noch keinen positionsbezogenen Exit-Erfolg. Lokaler GPT-Receiver hat `received_decision_count:9` mit derselben neuesten `decision_id:gpt_9a02a1f1d8699bdd62f393ee2da028a0` wie die tatsächliche 16:21:09 UTC öffentliche `NO_TRADE`-GitHub-Quittung. `total_paper_fills_recorded:0` und `actual_gpt_paper_buy_sell_roundtrip_verified:false`. Die isolierte signierte Paper-Probe bestand, privater Paper-Stand unverändert.

**WINDOWS Sources:** `research_archive.active:true`, Quelle zuletzt `2026-11-18T16:38:40.231Z`, 52 beobachtete Pools und 16 Headlines. Der lokale gebührenpflichtige Modellpfad `central_ai.enabled:false` ist **erwartet**, kein OpenAI-Key notwendig.

**Noch offen / nächster Operator-Schritt:** `new_paper_entries_enabled:true` und `paper_bot_enabled:true` – für die laufende Abnahme den **Dashboard-Bot AUS schalten**, ohne die Fähigkeit zu validen signierten GPT-SELLs zu verändern. `local_courier_heartbeat_recent:false` ist ein **weiterer Diagnosepunkt**: das alte R28-Skript berechnet diesen Status aus `/api/r29/presence`, `checked_at_utc` innerhalb 30 Minuten, `local_paper_http_healthy:true` und `courier_enabled:true`. 44 Sekunden Prozesslaufzeit allein reichen nicht als Beleg, dass der Kurier dauerhaft getrennt ist. `curl.exe -s http://127.0.0.1:3030/api/r29/presence` als **schreibgeschützte** Folgediagnose. Kein neuer Bot, kein neuer OpenAI-API-Key, kein erzwungener BUY und keine Änderung an privaten Guthaben.

**Abnahmegrenze:** Die Version und der lokale Empfänger sind bestätigt; technische neue V2-BUY-Sperre laut geladenem Status/CI aktiviert. Der echte positionsgebundene kontinuierliche SELL auf persönlichem Windows-Ledger, die unabhängigen aktuellen Contract-/Sellability-/ausführbaren Quote-Gates und ein prospektiver GPT-BUY-HOLD-SELL mit PnL bleiben **OFFEN**, bis ein natürlicher vollständig zugelassener GPT-Kandidat existiert.
