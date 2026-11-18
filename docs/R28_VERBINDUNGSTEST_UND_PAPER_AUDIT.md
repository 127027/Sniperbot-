# R29 V5.0 – Verbindungstest und tatsächlicher GPT-Paper-Nachweis

**VERBINDLICHER V5.0-ZIELVERTRAG (NUTZER GO):** [Autonomer GPT-Memecoin-Scout](../research/r29/operations/R29_V5_0_AUTONOMER_MEMECOIN_SCOUT_ZIELVERTRAG_20261118_DE.md) · [30-Tage-Fälle: ausdrücklich unbestätigt, nicht für Blindtest-Inputs](../research/r29/operations/R29_V5_0_MEMECOIN_30T_REFERENZFAELLE_UNVERIFIZIERT_20261118_DE.md). Die bisherige V4.9-Dokumentation unten ist der **technische Code-IST-Stand**, nicht die Definition eines bereits erreichten V5.0-Ergebnisses.

**V5.0 ist ein vom Nutzer freigegebenes Entwicklungsziel, KEIN Nachweis einer fertig installierten Handelsfunktion.** Aktueller belegter Code-IST ist R29 V4.9 (PR #65) plus Dokumentationsabgleich PR #66. Der parallele Entwicklungsauftrag darf nur mit echten Code-/CI-/Windows-/ChatGPT-Belegen als erfüllt markiert werden.

**Das Produktziel:** vorhandener 24/7-Windows-Collector sucht neu entstehende, vorher unbekannte Memecoins auf unterstützten Chains anhand aktueller Pools, Liquidität, Walletfluss, Social-/News-/Marktdaten. Die bestehende ChatGPT-Forward-Automation trifft **4–24 tatsächliche GPT-Vollreviews/Tag als Ziel**, priorisiert neue Ereignisse und entscheidet allein WATCH/BUY/HOLD/SELL/NO_TRADE, Einsatz und individuellen Exit. Stündlicher Wakeup ist NICHT garantiert eine GPT-Vollanalyse; 24/7 lokales Monitoring ist NICHT gleich 24/7 GPT-Aufrufe.

**Beweisziel:** eindeutiger unbekannter Contract + zeitgerechter Fund → echte GPT-Entscheidung → authentifizierter GitHub-BUY → unabhängiger lokaler Paper-Sicherheits-/Quote-Check → echter persönlicher Paper-Ledger-Fill → GPT-autorisierter kontinuierlich überwachter SELL → Netto-PnL im vorhandenen Dashboard. Isolierte Tests und NO_TRADE sind keine autonomen Trades.

**Zwei Konten, dieselben GPT-Signale (SOLL):** getrennte dynamische Paper-/Real-Präferenzen, Gesamtgrenzen, Positionen, Reservierungen und eigene Sicherheitsprüfungen. **IST V4.9:** Paper-Werte lokal dynamisch; Real READ-ONLY Wallet und LIVE_LOCKED ohne belegtes vollständiges eigenes Real-Handelsledger; privater lokaler Paper-/Real-Snapshot erreicht Cloud-GPT NICHT automatisch. Echtgeld bleibt gesperrt. Bestehende 1-%-/3-%-Paper-Risikogates gelten weiterhin und dürfen nicht stillschweigend entfallen.

**Historische 30-Tage-Tabelle:** 36 **unbestätigte Betreiber-Referenzen**, keine komplette Marktgesamtheit, keine verifizierten ausführbaren Gewinnquoten und KEINE Gewinner-Whitelist. Nur POSTFREEZE-Diagnose; Blindtests brauchen neutralen as-of-Markt inklusive Verlierern. 7+3 Blindtests, Frische-/Quellen- und historische Price-/Fee-/Sellability-Abnahme weiterhin offen.

**Nicht neu bauen:** zusätzlicher Bot/Dot, lokaler bezahlter OpenAI-API-Aufruf, GitHub-Kurier, repariertes Paging, neue UI, PayPal-/Wallet-Funktionen; keine vertraulichen Kontowerte in öffentliches GitHub, keine Echtgeldtransaktion.

**Wichtig bei der Diagnose:** Die lokalen /api/health- und /api/gpt/paper/status-Endpunkte bestätigen Erreichbarkeit/Guards, jedoch weder 4–24 tatsächliche GPT-Forschungsaufrufe täglich noch sichere Coin-Identifikation, Modellautorenschaft, einen autonomen persönlichen Paper-Fill oder einen realen SELL. Vollständige Event→GPT→BUY→SELL-Zeitstempel/Quittungen separat kontrollieren.

---

## Technischer Ausgangsstand R29 V4.9 (nachgewiesene Implementierung, historischer Kopf)

> **AKTUELL R29 V4.9 (18.11.2026):** [V4.5-Wissenschronik mit V4.6–V4.9-Ergebnissen](../research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md). Diese Anleitung prüft ausschließlich öffentliche/localhost-Verbindung; sie beweist weder autonome ChatGPT-Orders noch den privaten Windows→Cloud-GPT-Zustandsabgleich. PR #65: getrennte lokale read-only Paper-/Real-Zustände, nur mit Authentifizierung. Echtgeld LIVE_LOCKED, eigene Echtgeld-Einsatz-/Gesamtbudgets noch nicht bestätigt. Bei fehlendem GPT-Exit-Monitor-Heartbeat keine neuen Paper-BUYs; gültige SELLs separat.

# R29 V4.9 – Windows-/ChatGPT-GitHub-Verbindungstest (R28-kompatibler Dateiname)

**Aktiv ab 18.11.2026 – GitHub-only, PAPER_ONLY.** Früheres R28-Diagnoseskript heißt aus Kompatibilität weiter `runner/r28-connection-diagnostic.mjs`. Der gesonderte lokale kostenpflichtige OpenAI-API-Kanal ist nach PR #59 **absichtlich deaktiviert** und darf nicht als Einrichtungsfehler ausgegeben werden. Frühere R28-API-Anleitung: [historisches Archiv](archive/R28_VERBINDUNGSTEST_LEGACY_LOKAL_API_20261115.md). Maßgeblich für die Projektfortsetzung ist [R29 V4.5](../research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md).

## Zielarchitektur

Vorhandene ChatGPT-R29-Automation trifft strategischen Entscheid → vorhandener GitHub-Decision-Archive/Pointer → bestehender R29-Windows-Kurier prüft Eigentümerverknüpfung, Hash, Ablauf → authentifizierter lokaler GPT-Receiver, technisches Paper-Gate und privates Paper-Ledger. **Keine zusätzliche lokale OpenAI-API, kein GPT-Key und kein `-WithCentralAI`**. Der localhost-Server ist nicht aus diesem Chat direkt erreichbar. GitHub ist keine KI und eine Commit-Eigentümerkontrolle keine kryptografische Modellautorschaft.

## Vor dem Test

1. Nutzer-PC-Daten unter `%LOCALAPPDATA%\MemeSniperPaper` und `.local` lokal **sichern und nicht löschen**. Bestehenden Bot mit Q in der bisherigen Konsole geordnet stoppen.
2. Kanonischen Branch `codex/r29-chatgpt-github-paper-cycle-20261115` in einen **neuen** Ordner entpacken; alten Ordner nicht überschreiben.
3. `Sniperbot_Starten.bat` normal doppelklicken. Konsolenfenster geöffnet lassen, ausschließlich Paper. Niemand soll API-Keys im Chat oder öffentlichen GitHub eintragen.

## Diagnosen in einer zweiten Konsole im NEUEN Ordner

```cmd
node runner/r28-connection-diagnostic.mjs
curl.exe -s http://127.0.0.1:3030/api/gpt/paper/status
```

Interpretation:

| Feld oder Fehler | Exakte Bedeutung |
|---|---|
| `bot.online:true` und /api/health 200 | Lokaler Server antwortet; beweist weder GitHub-GPT-Entscheid noch Trade |
| `BOT_NOT_REACHABLE` | Zuerst Startfenster, Port 3030, Pfad/Prozess und Log prüfen; NICHT automatisch API-Key-Fehler |
| `github_gpt_courier.local_signed_receiver_ready:true` | Neues V4.4+-Diagnoseschema hat grundsätzlich brauchbaren lokalen signierten GPT-GitHub-Receiver gemessen; kein tatsächlicher Order-Fill |
| `/api/gpt/paper/status.local_gpt_bridge_ready:true` | Vorhandener GitHub-Relay-/localhost-Gate-Zugang ist bereit |
| `gpt_follow_enabled:true` | GPT-Follow freigegeben; allein keine Kaufentscheidung |
| `paper_bot_enabled:true` | Paper-Einträge lokal eingeschaltet; keine technische Freigabe eines unbekannten Coins oder Exit-Schutzes |
| `received_decision_count:8` | Replay-/Empfangs-ID-Zähler, **keine** Anzahl von Trades |
| `central_ai.enabled:false` bzw. `GITHUB_GPT_ONLY_LOCAL_API_REMOVED` | **ERWARTET**; optionale alte lokale OpenAI-API ist absichtlich entfernt |
| `isolated_signed_paper_roundtrip.passed:true` | Nur separate In-Memory-Signaturprobe, privates Paper-Ledger unverändert, kein GPT-Trade |
| `PAPER_FILLED` im isolierten Test | Kein realer Nutzerledger-GPT-Fill; die Provenienz des konkreten Receipts prüfen |
| Fehlt `github_gpt_courier` komplett | Höchstwahrscheinlich ältere R28-Diagnose oder falscher Projektordner/Port; aktuelle Softwareversion auf dem Rechner kontrollieren |

## Zuletzt wirklich beobachtet (18.11.2026, nicht automatisch aktueller Zustand)

- 14:30:57 UTC: Windows-Collector **64 Pools / 16 RSS-Headlines**, Publisher-Commit `5037000270707e53471e9a8eb32897231f7f6155`; kanonischer GitHub-Research-Feed **64 Pools / 24 Alerts**, `CANONICAL_RESEARCH_FEED_RECENT`. Solana-Quotenindikationen keine sichere Sellability.
- 15:11:43 UTC: `BOT_NOT_REACHABLE`; im nächsten Test nach Start **15:12:52 UTC** `bot.online:true`, lokaler Snapshot **15:12:38 UTC**: **47 Pools / 16 Headlines**.
- Nachfolgender `/api/gpt/paper/status` vom Benutzer: `strategy:GPT_ONLY`, `local_gpt_bridge_ready:true`, `gpt_follow_enabled:true`, `paper_bot_enabled:true`, `received_decision_count:8`, `last_decision_id:gpt_e7c715480f009a0dd80040fa78c186a7`. Früheres Skript noch ohne neues `github_gpt_courier`-Feld, deshalb Laptop-V4.4-Installation **nicht** abschließend bestätigt.
- GitHub-Datei `research/r29/channel/gpt-paper-receipt.json`: genau diese ID am 17.11.2026 17:58:45 UTC, `NO_TRADE`, `origin_model_signature_verified:false`; `gpt-paper-context.json`: 0 GPT-Positionen zur damaligen Prüfung. **Kein GPT-BUY/SELL im echten lokalen Nutzer-Paper-Konto nachgewiesen.**

## Was für eine Abnahme zusätzlich nötig ist

Zeitgerechte echte ChatGPT-Modellentscheidung in der bestehenden prospektiven Automation → Archiv+Pointer/Source-Hash/Autorprüfung → gültiger signierter Windows-Receipt. Vor neuem automatischen Paper-BUY zusätzlich GPT-autorisierter kontinuierlicher **positionsgebundener** Exit (Restarts, Offline, Quote-Frische, SELL-Idempotenz), unabhängige Contract/Sellability-Prüfungen. `GPT_GUARD` allein ist noch keine solche Exit-Regel.

Die historische GPT-Automation ist ausschließlich Backtest; keine Referenz-Gewinnerdaten in historische Entscheidungsframes mischen. Keine echten Zahlungen/Wallet-Transaktionen, keine API-Schlüssel, Kontostände, Seeds oder Verzeichnisse ins öffentliche Repository veröffentlichen.
