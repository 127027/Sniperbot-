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


### R29 V4.6 – GitHub-Kurier-Presence tatsächlich bestätigt (18.11.2026, 16:42:56 UTC)

**WINDOWS user-provided:** `GET /api/r29/presence` → `connected:true`, `checked_at_utc:2026-11-18T16:42:56.921Z`, `bot_http_healthy:true`, `github_courier_enabled:true`, `paper_orders_automatically_enabled:false`, `real_trading_enabled:false`. Der echte lokale Kurier war also **verbunden und meldete sich frisch**. Paralleler `GET /api/gpt/paper/status`: `local_gpt_bridge_ready:true`, `exit_guard_required_for_new_gpt_buy:true`, `continuous_gpt_exit_monitor_enabled:true`, 9 Replay-Entscheidungen, letzte `gpt_9a02a1f1d8699bdd62f393ee2da028a0`; **0 aktuelle GPT-Positionen und kein echter GPT-BUY/SELL-Fill**.

**ROOT CAUSE der früheren falschen Diagnose `local_courier_heartbeat_recent:false`:** Das alte `runner/r28-connection-diagnostic.mjs` las fälschlich `presence.local_paper_http_healthy`/`courier_enabled` statt des tatsächlich vom HTTP-Endpunkt ausgegebenen *flachen* `bot_http_healthy`/`github_courier_enabled` plus `connected`. Kein neues Transportproblem! [PR #62](https://github.com/127027/Sniperbot-/pull/62), Merge `2e20d7821ab6a2486a1c1942ddeb2fbbacea8463`, mit grünen [Windows-/Linux-Tests](https://github.com/127027/Sniperbot-/actions/runs/44350976793), korrigiert nur die Diagnose samt 4-Minuten-Frischetest. Keine Handelsregeln oder lokalen User-Daten verändert. Der persönliche Laptop verwendet das alte Diagnoseskript eventuell bis zum nächsten Softwareupdate; **kein Neustart allein wegen des alten falschen Flags nötig**.

**Wichtige Unterscheidung:** `paper_orders_automatically_enabled:false` im Presence-Heartbeat bezieht sich auf den separaten alten Autopilot-/Heartbeat-Pfad; es sagt NICHT, dass GPT-Paper-Einstiege im Dashboard gesperrt sind. Im selben echten Windows-Status war `paper_bot_enabled:true`; daher für die Sicherheitsabnahme bitte **Dashboard Bot AUS**, anschließend `paper_bot_enabled:false` verifizieren. `gpt_follow_enabled:true` erhalten, sodass gültige GPT-SELLs nicht versehentlich abgeschaltet werden. Die reale GPT-Policy-Exit-Ausführung am persönlichen Rechner bleibt unbewiesen, da 0 GPT-Positionen vorhanden sind.


### R29 V4.7 – 24/7-Paper-Forschungs- und Sicherheitsbetrieb (18.11.2026)

**Nutzerfreigabe:** „falls alles ok go papir kann 24/7 arbeiten“. Die Freigabe bezieht sich auf **PAPER_ONLY**, bestehende ChatGPT-/GitHub-/Windows-Infrastruktur, keinen neuen Bot/API-Key/Echtgeldhandel. **Sie ist keine Erlaubnis, bisher fehlende Sicherheitsbeweise zu überspringen oder einen BUY zu erzwingen.** Der aktuelle Benutzerstatus zeigte zuletzt `paper_bot_enabled:true`, obwohl der Nutzer den Dashboard-Bot als AUS verstand; bis ein eindeutiges `false` nachgewiesen wird, ist die vom Nutzer beabsichtigte neue-Paper-Einstiegspause **nicht bestätigt**.

**Neue CODE-Root-Cause PR #63:** Der V4.6-`gptPaperReceiver.monitor()` erstellte beim Policy-Trigger lokal signierte `GPT_GITHUB_POLICY_EXIT`-SELLs. Die Funktion `submitSignedAgentPaperOrder` in `runner/server.mjs` erlaubte die nur während einer Sitzung gültige Ed25519-Trustliste aber lediglich für `CENTRAL_AI_LOCAL`, `LOCAL_PAPER_AUTOPILOT` und `GPT_GITHUB_LOCAL`. Ein tatsächlicher Monitor-SELL auf dem Windows-Server konnte darum vor der Signaturprüfung abgewiesen werden, während isolierte Mocktests den Server-Trust-Pfad übergingen. **Reparatur:** Der bestehende Server akzeptiert auch `GPT_GITHUB_POLICY_EXIT` mit exakt derselben unabhängigen Ed25519-Verifikation, positionsgebundenem Policy-Digest, Trigger-Neuprüfung, frischer Poolidentität und Paper-Ledger-Replay-Sperre. Keine neuen Trading-Strategien und keine reale Onchain-Order.

**Nachweisbare Monitor-Liveness:** `runner/server.mjs` speichert **nur im RAM** das letzte Ergebnis der vorhandenen 30-Sekunden-Exit-Überwachung (Zeit, OK/ERROR, geprüfte GPT-Positionen, ausgeführte Policy-Paper-Exits). Der schreibgeschützte `/api/gpt/paper/status` zeigt zusätzlich `gpt_exit_monitor_heartbeat_recent`, `gpt_exit_monitor_last_checked_at_utc`, `gpt_exit_monitor_last_outcome`. Der echte lokale Executor blockiert **alle neuen GPT-BUYs**, wenn der kontinuierliche Exit-Monitor in den letzten **90 Sekunden** nicht erfolgreich gelaufen ist – sogar wenn ein signierter V2-Exit-Vertrag vorhanden ist und der Dashboard-Bot auf AN steht. **Konfiguriert** (`continuous_gpt_exit_monitor_enabled:true`) ist somit nicht länger dasselbe wie **laufend** (`gpt_exit_monitor_heartbeat_recent:true`). Die Prüfung bei 0 GPT-Positionen ist ein Liveness-Tick, noch kein getesteter tatsächlicher Verkauf.

**Vorhandener GitHub-Kurier, keine zweite Infrastruktur:** `/api/gpt/paper/context` und der bereits existierende `runner/gpt-paper-position-publisher.mjs` publizieren nun ausschließlich bereinigte boolesche Exit-Guard-/Monitor-Liveness-Werte samt aktuellem Zeitstempel in `research/r29/channel/gpt-paper-context.json`. Keine Paper-Beträge, Wallet-Daten oder private Schlüssel. Bei gesundem Monitor erfolgt spätestens ungefähr alle zwei Minuten eine neue Context-Veröffentlichung, sofern der bestehende Kurier läuft und GitHub erreichbar ist. Fehlender, veralteter oder inkonsistenter Tick wird zu `exit_monitor_heartbeat_recent:false` heruntergestuft. **Wichtig:** GitHub-Kontext beweist nie den direkt ausführbaren Swap oder eine kryptografische Modellidentität; für den BUY entscheidet am Ende das lokale Software-Gate.

**Dashboard-Missverständnis behoben:** Bisher wurde `TOGGLE_BOT` ausgeführt (jeder Klick kehrt den Zustand um); die Schaltfläche war je nach Zustand mit „Bot pausieren“ oder „Bot starten“ beschriftet. Der bestehende Button sendet künftig eine eindeutige idempotente `SET_BOT_ENTRIES`-Anweisung mit `enabled:true/false`, überprüft die Serverbestätigung und zeigt ausdrücklich `Neue Paper-Käufe PAUSIEREN` beziehungsweise `Neue Paper-Käufe AKTIVIEREN` (für die Aktivierung Rückfrage). Wiederholtes AUS kann die Funktion nicht versehentlich einschalten. Der getrennte GPT-Follow-Schalter und autorisierte SELLs bleiben bei pausierten Einstiegen erhalten.

**CI-Belege:** `runner/integration.test.mjs` testet den echten isolierten localhost-Endpunkt, mehrfaches AUS, Restart-Persistenz, getrenntes GPT-Follow und offline keine fingierten Monitor-Heartbeats. `runner/gpt-position-exit.test.mjs` verweigert V2-BUY ohne frischen Monitor-Tick, `runner/minimal-ui.test.mjs` schützt gegen erneute falsche Server-Vertrauensliste und UI-Toggles. `runner/gpt-paper-position-publisher.test.mjs` prüft sanitisierte GitHub-Liveness-Werte, kurze Gültigkeit, Legacy-Fail-Closed und keine öffentlichen Guthaben. Alle Tests laufen ohne Nutzer-Paper-Konto und ohne OpenAI-API.

**24/7-Grenzen:** Der lokale Windows-Collector, GitHub-Kurier und Exit-Monitor können kontinuierlich arbeiten, **solange Rechner nicht schläft, Netzwerk besteht und der Supervisor-Prozess läuft**. Kein automatischer Windows-Autostart aus GitHub allein, keine garantierte Überwachung bei abgestelltem Bot oder Netzausfall. Der bestehende ChatGPT-Forward-Task hat weiterhin einen **stündlichen** Wakeup (mit möglichen Ausführungsverzögerungen); kein sekunden- oder minütlicher Cloud-GPT-Scalper ohne Architektur-/Kostenänderung. 1–24 GPT-Vollreviews pro Tag höchstens, ereignisgesteuert. Historische Backtests getrennt.

**LAPTOP noch nicht aktualisiert auf V4.7:** Letzter vom Nutzer kopierter V4.6-Status `paper_bot_enabled:true`, `gpt_follow_enabled:true`, `continuous_gpt_exit_monitor_enabled:true`, 9 Entscheidungs-IDs, 0 GPT-Positionen/0 echte GPT-Fills. Nach PR-Merge V4.7 nur mit privatem Backup und separatem Ordner installieren, Dashboard-Einstiege AUS bestätigen und `gpt_exit_monitor_heartbeat_recent:true` sowie den neuen öffentlichen Context-Status unabhängig prüfen. Kein erzwungener unbekannter Coin-BUY. Fehlen unabhängige Contract-, Holder-/LP-/Sellability- oder auf dem Paper-Executor zulässige frische zweiseitige Kurse, ist `NO_TRADE` korrekt.


**R29 V4.7 Integrationsabnahme (GitHub, 18.11.2026):** [PR #63](https://github.com/127027/Sniperbot-/pull/63) wurde auf dem getesteten finalen Head `2dc3d0637883ba2b9badcb47754e8b8453a0333f` nach erfolgreicher [Windows-/Linux-PAPER_ONLY-CI](https://github.com/127027/Sniperbot-/actions/runs/44355629704) gemergt, Merge `a77b31bddfcb623afc9f74d260267217a82b2a8e`. Der ursprüngliche lokal signierte Policy-SELL-Quellfehler ist im Servercode repariert; V2-GPT-BUYs brauchen jetzt neben Exit-Policy auch einen lokalen erfolgreichen Monitor-Tick der letzten 90s. Vorhandene R29-GitHub-Context-Veröffentlichung stellt ausschließlich bereinigte Laufzeitbelege bereit. **Der Nutzer-Laptop ist bis zum separaten V4.7-Update noch nicht als aktualisiert belegt; weder ein neuer echter GPT-Paper-Fill noch ein echter positionsgebundener Windows-Policy-SELL sind bewiesen.** Bestehende stündliche Forward-Automation hat denselben Zeitplan und aktualisierte V4.7-Gates; historischer Task unverändert. 24/7 bedeutet hier bei durchlaufendem Rechner/Kurier/Server, NICHT 24/7 sekündliche GPT-Entscheidungen oder garantierte Exits bei Schlaf, Prozess- oder Netzunterbrechung.


### R29 V4.8 – Echter GPT-Paper-Minimum-Stake-Deadlock + sichtbare lokale Aktivitäten (18.11.2026)

**NEUE ROOT CAUSE aus Code und Nutzer-Dashboard:** Bei zuletzt beobachteten 4.999,01 TEST-USDC und unverändertem 1-%-Einzeltrade-Limit `MAX_SINGLE_SHARE=0.01` war der verfügbare maximale BUY-Einsatz **49,99 TEST-USDC**. Die zuvor in `portfolio-budget.mjs`, `gpt-paper-protocol.mjs`, `gpt-paper-capacity-report.mjs` und `live-paper-risk.mjs` teilweise hart verdrahtete Mindestgröße **50 TEST-USDC** machte also **jeden** neuen GPT-BUY für diesen Kontostand mathematisch unmöglich – sogar bei einem wirklich geeigneten GPT-Coin. Ein höheres Guthaben zu erfinden, Handelsrisiken zu erhöhen oder einen Test-BUY zu fälschen ist keine Lösung.

**Gezielter CODE-Fix:** Signierte und durch den tatsächlichen GitHub-GPT-Receiver unabhängige Sicherheits-/Evidenz-/Exit-Gates laufende `GPT_SIGNED_BUY`-Orders dürfen mit **5 TEST-USDC** beginnen, bleiben aber **unter dem bisherigen 1-%-Equity-Cap**, 3-%-Total-Cap, Stop-/Drawdown- und frischen Markt-/Contract-Sicherheitsprüfungen. Manuelle `BUY`-Kommandos und fremde/Legacy-Publisher behalten weiterhin die Mindestgrenze **50 TEST-USDC**. `GPT_SIGNED_BUY` ist **keine** erlaubte localhost-`/api/command`-Aktion, nur eine interne Ausführung nach unabhängiger signierter GPT-Order. Der private GPT-Kapazitätsvorschlag beschränkt zusätzlich die Obergrenze auf **1 % der frisch bewertbaren Paper-Equity**, statt fälschlich die gesamten 4.999 TEST-USDC als für einen Einzeltrade verfügbar zu behaupten. Unvollständige oder stale aktuelle Positionsbewertungen = keine neue Kapazitätsfreigabe.

**Sichtbare UI:** Das EXISTIERENDE Dashboard bekommt ein dezentes `GPT-Aktivität & Paper-Handel`-Panel mit den tatsächlich lokal empfangenen, zeitgestempelten Entscheidungs-IDs (WATCH/NO_TRADE/BLOCKED/PAPER_FILLED), der ausschließlich aus dem echten lokalen Ledger berechneten Anzahl GPT-GitHub-Paper-Fills und der unveränderten offenen Paper-Positionen/realisierten PnL. Keine neue Wallet, keine neue Ansicht für Scheingewinne, keine vermischten historischen Replays. Sichtbare Forschungsmeldung heißt **nicht**, dass ein Coin gekauft wurde; nur `PAPER_FILLED` mit tatsächlich aktualisiertem privatem Paper-Konto zählt als Kauf/Verkauf. Quell-Attribution durch GitHub-Owner bleibt von kryptografischer Modellidentität zu unterscheiden.

**TEST-Nachweis (CI, nicht Nutzer-Windows):** Aus einem virtuellen, ursprünglich 4.999,01 TEST-USDC schweren unabhängigen Testledger ermittelt das unveränderte 1-%-Risk-Gate korrekt 49,99 TEST-USDC Maximalorder. Ein gültiger archivierter V2-GPT-Paper-BUY über 25 TEST-USDC, signer-validiert, vollständig mit kontrolliertem Independent-Quote- und Security-Testfixture, muss lokal `PAPER_FILLED` erzeugen und als Position in `paperDashboardView` erscheinen; ein späteres signiertes SELL muss dieselbe Position schließen und den realisierten TEST-PnL sowie den Trade-Verlauf verändern. Der Test behauptet **keinen echten prospektiven Modellkauf** auf dem Nutzer-PC. Ein übergroßer GPT-BUY über 50 TEST-USDC bei 4.999,01 Gesamtwert wird blockiert; manuelle 25 TEST-USDC sind weiterhin unmöglich.

**Weiter offene echte Betriebsblocker:** Fehlende vollständige echte unabhängige Contract-/Honeypot-/Holder-/LP-/Verkaufbarkeitsnachweise für vorliegende Memecoins; keine nachgewiesene tatsächlich vom GPT-Modell prospektiv freigegebene V2-BUY-Signalfolge, keine neue persönliche Windows-Paper-Position; Benutzer hat `paper_bot_enabled:false` zuletzt korrekt bestätigt. V4.8 nur nach erfolgreicher CI/Merge und sicherem privaten Windows-Update installieren. **Neue Paper-Käufe bleiben pausiert**, bis Monitor, Marktquellen, richtige Modellentscheidung und Nutzer-UI-Freigabe tatsächlich nachgewiesen sind. Keine Neuentwicklung eines Scanners, zweiten Bots oder OpenAI-Kostenpfads.


---

## R29 V4.9 – Dynamische getrennte Paper-/Echtgeld-Istzustände (18.11.2026)

**Nutzerfreigabe: GO.** Ziel ist ein GPT-Strategieentscheider für beide getrennten Konten und dynamische Nutzerlimits. Dieser Auftrag ermächtigt **nicht** zur Echtgeldorder, PayPal-/Wallet-Änderung, neuen UI, neuer Cloud-/API-Anbindung, neuen Bots oder Veröffentlichung privater Kontodaten.

### Tatsächliche Bestandsaufnahme (CODE, nicht behaupteter Windows-/Cloud-End-to-End-Beweis)

1. **Paper ist tatsächlich gespeichert:** `runner/storage.mjs` liest `%LOCALAPPDATA%\MemeSniperPaper\paper-state-v03.json`; `runner/core.mjs` speichert `minTrade` (bevorzugter Paper-Einsatz), `portfolioBudgetUsdc` (oder Legacy-`maxTrade`) als gesamtes gleichzeitig investiertes Paper-Kapitallimit, `cashUsdc`/`cashEur`, `positions`, `entriesEnabled`, `gptPaperFollow`. `portfolioBudget()` berechnet offene Einsatzkosten und freien Cap. Die alten `SET_RANGE`-/UI-Validatoren hatten die dynamische Präferenz stillschweigend auf mindestens 50 begrenzt; **V4.9** erlaubt technisch gespeicherte gültige Beträge wie **75→45→35** ohne neue Steuerelemente; die unveränderten echten BUY-/Signaturminima sind **separate** Ausführungsvorgaben und werden dadurch nicht geändert.
2. **Echtgeld ist tatsächlich nur teilweise implementiert:** `runner/live-mode-policy.mjs` meldet immer `LOCKED / enabled:false / can_enable:false`, ausdrücklich **keine autonome Swap-Ausführung**. `runner/real-wallet-overview.mjs` kann lediglich verifizierte onchain SOL-/USDC-Bestände anzeigen. `real_open_positions:null` und `real_fill_history_verified:false`. Im aktuellen `runner/server.mjs`/`runner/dashboard.html` existiert **keine belegte eigenständige gespeicherte Echtgeld-Strategiepräferenz, kein gespeichertes Echtgeld-Totalexposure-Limit und kein realer Bot-Positions-/Reserveledger**. Der Echtgeldtab ist eine Wallet-Anzeige, keine unabhängige vollwertige Kauf-/Verkaufsausführung. Paper-Werte dürfen deshalb **niemals** stillschweigend als Echtgeld-Grenzen verwendet werden. Der derzeit ausgewählte Dashboard-Tab ist nur Ansicht, **keine** persisterte Modus-/Handelsfreigabe.
3. **Privater Kanal reicht nicht bis zu Cloud-GPT:** `POST /api/gpt/paper-size-request` liefert über eine zufällige authentifizierte localhost-Capability ein privates Paper-Size-Offer und protokolliert es nur lokal. ChatGPT-Automationen laufen in der Cloud und können weder `127.0.0.1` des Benutzerlaptops erreichen noch aus dem bisherigen öffentlichen `research/r29/channel/gpt-paper-context.json` echte Kontostände ablesen; die öffentliche Datei ist bewusst redigiert. **Ein autonomer sicherer Windows→ChatGPT-Kanal für beide vollständigen PRIVATEN Kontozustände ist NICHT implementiert/NOT VERIFIED.** Daher ist „GPT hat beide aktuellen Werte automatisch erhalten“ **nicht** bewiesen und darf nicht behauptet werden. Kein Umweg über öffentliches GitHub, keine zweite kostenpflichtige Modell-API.
4. **Vorhandene Risikogates bleiben transparent:** `runner/live-paper-risk.mjs` berechnet Paper-Einzelpositionen derzeit unter **1 %** frischer Equity, Gesamtexposition unter **3 %**, zusätzlich ein nominelles Verlustbudget/Stop-/Volumen-/Contract-/Liquiditätsgate; tatsächliches nominales Kapital ist nicht gleich Verlustgefahr. Diese festen technischen Caps können Nutzerlimits (z. B. bevorzugt 75, Gesamtkapital 3.400) aktuell stärker einschränken. Die V4.9-Prüfung **ändert die Kapitalrisiko-Sperren nicht**: aus einer geänderten Dashboard-Präferenz folgt kein Anspruch auf automatische Ausführung oberhalb dieser Risikogates. Ihre fachliche Neubewertung/individualisierbare Risikopolitik benötigt eine gesonderte Sicherheitsabnahme, keine stillschweigende Lockerung.

### V4.9 gezielte Code-Arbeit (CODE/CI, noch keine Cloud-/Windows-Modellzustellung)

- `runner/gpt-private-bot-state.mjs` erstellt ausschließlich **lokal** zwei getrennte, kurzlebige READ-ONLY-Kontodatensätze `PAPER`/`REAL`, jeweils mit eigenem `local_state_revision`, UTC-Snapshot und maximal 120 Sekunden Lebensdauer. Paper meldet echte aktuell gespeicherte Präferenz, Nutzer-Gesamtexposure, verfügbares virtuelles Kapital, offene und reservierte Positionskosten, aktuelle freie Capacity und die **separaten** bestehenden 1-/3-%-Technikcaps; bei alten/missing Quotes oder offenen Reservierungen ohne Nachweis fail-closed/UNKNOWN. Real meldet nur unabhängig belegte Solana-USDC-Wallet-Daten (sofern abrufbar), ansonsten **null** und `LIVE_LOCKED`; fehlende Echtgeldeinsätze/Live-Positionen bleiben **null**. Kein privater Schlüssel, keine Wallet-Adresse, keine Speicherung, keine neue Kontofunktion.
- Ein **neuer rein lokaler lesender Endpunkt** `GET /api/gpt/private/bot-state` nutzt **dieselbe** vorhandene private `x-sniper-gpt-bridge`-Capability wie die bisherige private Size-Verhandlung, verbietet Browser-Origin und unautorisierte Abfragen, gibt keinen Wert an öffentlichen GitHub-Publisher weiter und führt keine Kontotransaktion aus. Der Endpunkt macht private Daten innerhalb des lokalen Geräts verfügbar; er **schafft keinen** automatisch erreichbaren privaten Cloud-GPT-Zustellweg.
- `runner/gpt-paper-size-negotiation.mjs` bindet neue private Size-Angebote an die eindeutige **lokale Paper-Settings-/Guthaben-/Position-Revision** und lehnt eine alte Größenwahl nach veränderten gespeicherten Einstellungen ab, selbst wenn der Betrag weiterhin möglich wäre. Ausführungsschritte prüfen unabhängig weiter das aktuelle Konto. Die eigentliche öffentliche GitHub-BUY-Decision V2 trägt bisher **keine** vertraulich/privat zugestellte Zwei-Konto-State-Revision; echte autonome Cloud-GPT-Autorenschaft und State-Bindung bleibt **OFFEN**. Kein vorgetäuschter v3-Trade-Adapter.
- `inspectDualAccountSignal` ist eine **pure isolierte Vorprüfung**: dieselbe GPT-BUY-/SELL-Signalabsicht wird für beide Konten unabhängig beurteilt; Paper-Entscheide erfordern frische passende Paper-Revision/Budget/Schalter, Real bleibt unabhängig `LIVE_TRADING_LOCKED`, SELL verlangt passende Kontoposition. **Keine** Produktiv-Live-Order wurde angebunden oder ermöglicht; `real_trading_enabled:false` garantiert.

### Verbindliche Test-/Abnahmegrenzen

Die ergänzten Tests prüfen dynamische Paper-Präferenzen 75/45/35, geändertes Gesamtlimit, gesonderte Echtgeld-Settings als **synthetische Testfixtures** ohne deren Existenz zu behaupten, unabhängige Revisionen, neue/veräußerte Positionen, alte/stale Angebote, bekannte lokale Auth-Fähigkeit, keinen Wallet-/Cash-Abfluss zum öffentlichen GitHub-Research-Kanal und hart gesperrtes LIVE einschließlich manipulierter Mode-POSTs. **Jede** simulierte Freigabe trägt `transaction_sent:false`.

**Zum Abschluss noch OFFEN (nicht mit „erledigt“ verwechseln):** (1) belegte persistierte separate Echtgeld-Prefs/Reservierungs-/Positionsledger, (2) ein verifizierbarer vertraulicher Cloud-Rückkanal für beide Accounts und ein modellautorisierter, kurzlebiger an das passende Account-Revision-Paar gebundener Strategieentscheiddatensatz, (3) zulässiger eigenständiger Real-Executor nach gesonderter Freigabe, (4) genuine Modell-GPT-BUY/SELL im persönlichen Paper-Konto. **Kein** realer Kauf, keine neue Freigabe, keine Veränderung des vorhandenen Echtgeld-Dashboards.


**R29 V4.9 – Finaler GitHub-Abschluss (18.11.2026):** [PR #65](https://github.com/127027/Sniperbot-/pull/65) wurde nach erfolgreicher [Windows-/Linux-Gesamt-CI](https://github.com/127027/Sniperbot-/actions/runs/44374851463) auf finalem PR-Head `ae6fa2a07cfc7dabed50e6bc45c3efb5e814f6b2` gemergt; Merge-Commit `5dc28679938c1fb29a58796f58c9cc6e6abf4604`. Implementiert/geprüft: privater lokaler Paper/Real-Lesezustand mit getrennten Revisionen und Ablauf, dynamischer Paper-Preferenzeinsatz einschließlich 35/45, privates Paper-Size-Offer mit gespeicherter State-Revision und Ablehnung geänderter Einstellungen, fehlende Real-Bot-Einstellungen als `UNKNOWN`, streng erhaltene gesperrte Real-Wallet-/Live-Ausführung. Eine zuvor einmal fehlgeschlagene separate Windows-QA-Fixture für generischen signierten Paper-Roundtrip bestand beim erneuten vollständigen Lauf; zusätzliche Testdiagnose bleibt erhalten, **keine** Echtgeld- oder Nutzer-Paper-Transaktion. **Weiterhin nicht nachgewiesen:** automatische private Windows→Cloud-ChatGPT-Zustellung, eigenständige persistierte Echtgeld-Prefs/Real-Positionsbuchhaltung, vollständige automatisierte doppelte Kontoführung oder echter GPT-BUY/SELL. Ein GitHub-Merge aktualisiert nicht den privaten Windows-Bot. Keine öffentliche Veröffentlichung privater Kontozahlen/Walletdaten.
