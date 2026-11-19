# R29 V5.0 – Zielarchitektur und aktueller V4.9-Code

**VERBINDLICHER V5.0-ZIELVERTRAG (NUTZER GO):** [R29 V4.5–V4.9-Wissenschronik](../research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md) · [Autonomer GPT-Memecoin-Scout](../research/r29/operations/R29_V5_0_AUTONOMER_MEMECOIN_SCOUT_ZIELVERTRAG_20261118_DE.md) · [30-Tage-Fälle: ausdrücklich unbestätigt, nicht für Blindtest-Inputs](../research/r29/operations/R29_V5_0_MEMECOIN_30T_REFERENZFAELLE_UNVERIFIZIERT_20261118_DE.md). Die bisherige V4.9-Dokumentation unten ist der **technische Code-IST-Stand**, nicht die Definition eines bereits erreichten V5.0-Ergebnisses.

**V5.0 ist ein vom Nutzer freigegebenes Entwicklungsziel, KEIN Nachweis einer fertig installierten Handelsfunktion.** Aktueller belegter Code-IST ist R29 V4.9 (PR #65) plus Dokumentationsabgleich PR #66. Der parallele Entwicklungsauftrag darf nur mit echten Code-/CI-/Windows-/ChatGPT-Belegen als erfüllt markiert werden.

**Das Produktziel:** vorhandener 24/7-Windows-Collector sucht neu entstehende, vorher unbekannte Memecoins auf unterstützten Chains anhand aktueller Pools, Liquidität, Walletfluss, Social-/News-/Marktdaten. Die bestehende ChatGPT-Forward-Automation trifft **4–24 tatsächliche GPT-Vollreviews/Tag als Ziel**, priorisiert neue Ereignisse und entscheidet allein WATCH/BUY/HOLD/SELL/NO_TRADE, Einsatz und individuellen Exit. Stündlicher Wakeup ist NICHT garantiert eine GPT-Vollanalyse; 24/7 lokales Monitoring ist NICHT gleich 24/7 GPT-Aufrufe.

**Beweisziel:** eindeutiger unbekannter Contract + zeitgerechter Fund → echte GPT-Entscheidung → authentifizierter GitHub-BUY → unabhängiger lokaler Paper-Sicherheits-/Quote-Check → echter persönlicher Paper-Ledger-Fill → GPT-autorisierter kontinuierlich überwachter SELL → Netto-PnL im vorhandenen Dashboard. Isolierte Tests und NO_TRADE sind keine autonomen Trades.

**Zwei Konten, dieselben GPT-Signale (SOLL):** getrennte dynamische Paper-/Real-Präferenzen, Gesamtgrenzen, Positionen, Reservierungen und eigene Sicherheitsprüfungen. **IST V4.9:** Paper-Werte lokal dynamisch; Real READ-ONLY Wallet und LIVE_LOCKED ohne belegtes vollständiges eigenes Real-Handelsledger; privater lokaler Paper-/Real-Snapshot erreicht Cloud-GPT NICHT automatisch. Echtgeld bleibt gesperrt. Bestehende 1-%-/3-%-Paper-Risikogates gelten weiterhin und dürfen nicht stillschweigend entfallen.

**Historische 30-Tage-Tabelle:** 36 **unbestätigte Betreiber-Referenzen**, keine komplette Marktgesamtheit, keine verifizierten ausführbaren Gewinnquoten und KEINE Gewinner-Whitelist. Nur POSTFREEZE-Diagnose; Blindtests brauchen neutralen as-of-Markt inklusive Verlierern. 7+3 Blindtests, Frische-/Quellen- und historische Price-/Fee-/Sellability-Abnahme weiterhin offen.

**Nicht neu bauen:** zusätzlicher Bot/Dot, lokaler bezahlter OpenAI-API-Aufruf, GitHub-Kurier, repariertes Paging, neue UI, PayPal-/Wallet-Funktionen; keine vertraulichen Kontowerte in öffentliches GitHub, keine Echtgeldtransaktion.

**Rollenvertrag:** kontinuierlicher Collector liefert Events + neutrale technische Priorisierung; ChatGPT-Forward (bestehender stündlicher geplanter Task) als **einziger** strategischer Entscheider; vorhandener signierter GitHub-Kurier; lokaler Paper-Executor; vorhandene 30-Sekunden-Überwachung für vorab GPT-signierte Exits. Keine impliziten freien lokalen BUY-Strategien und keine Cloud-Localhost-Direktverbindung erfinden. 4–24 echte GPT-Analysen/Tag sind ein zu verifizierendes Ziel.

---

## Technischer Ausgangsstand R29 V4.9 (nachgewiesene Implementierung, historischer Kopf)

# R29 V4.9 – Aktuelle Architektur (18.11.2026)

**Aktuelle Referenz R29 V4.9:** [R29 V4.5-Wissensstand mit V4.6–V4.9-Nachträgen](../research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md). Die früheren Zustandszahlen und Altanweisungen unter der Archivmarkierung sind datierte Historie.

**Strategie:** ChatGPT allein entscheidet über neue Memecoins; GitHub übermittelt; der vorhandene Windows-Bot validiert und führt zulässige PAPER_ONLY-Aufträge aus. Ziel ist ein GPT-Signal mit **zwei getrennten dynamischen Kontozuständen**, nicht feste Einsätze und nicht ein zweiter Bot.

**Ist/Soll strikt unterscheiden:** Paper bevorzugter Einsatz und Gesamtbudget werden lokal gespeichert; Änderungen auf 45/35 sind möglich (PR #65). Real ist LIVE_LOCKED/read-only Wallet. Eigene persistierte Real-Preferred-/Gesamtlimits und Real-Positionsreserve sind derzeit **nicht belegt**. Keine reale Order und kein stillschweigendes Übernehmen von Paper-Werten in Echtgeld.

**Private Zustandsübermittlung:** GET /api/gpt/private/bot-state liefert nur lokal authentifiziert zwei Read-only-Snapshots. Ein sicherer privater Cloud-ChatGPT-Empfang ist **nicht nachgewiesen**. Kein Konto- oder Walletstand darf ins öffentliche GitHub.

**Risikogates:** Separate Paper-Limits von 1 % pro Einzelposition und 3 % Gesamtexposition sind noch wirksam und können das dynamische User-Limit enger fassen. PR #61/#63: positionsgebundene GPT-Exit-Policy + Monitor im Code; PR #64: nur isolierter Test-Paper-Fill, **kein** autonomer Trade im persönlichen Ledger. Sicherheits- und Quote-Gates unverändert, echte BUY/SELL-Abnahme offen.

**Betrieb:** ausschließlich Sniperbot_Starten.bat, keine lokale kostenpflichtige OpenAI-API, kein zusätzlicher API-Key, keine Echtgeld-Orders, keine neuen Bots/PayPal-/UI-Arbeiten, historische 10 as-of-Tests weiterhin getrennt.

---

## Historisches V0.3-Architekturdesign (nicht mehr der aktuelle Starter/Status)

# Architektur und Systemgrenzen

**Aktueller Code V0.3** (lokal testbar) und **Zielarchitektur** sind absichtlich getrennt dargestellt.

## Ist-System V0.3

```text
Windows 11 (Node.js 22+)
  Windows_Starten.bat
      └─ localhost:3030 HTTP / UI (runner/server.mjs)
          ├─ runner/dashboard.html       [HTML/JS, kein Build]
          ├─ runner/core.mjs             [virtuelles EUR/USDC-Ledger, BUY/SELL, HOLD/AUTO]
          ├─ runner/market.mjs           [öffentliche Read-only-APIs]
          │   ├─ GeckoTerminal: neue Pools, Poll ~90s
          │   └─ DEX Screener: Referenzpreise, Poll ~30s
          └─ .local/paper-state-v03.json [lokal, NICHT Git]
```

Das System nimmt keine echten Gelder an, erstellt keine Wallets, sendet keine signierten Transaktionen und ist kein Echtzeit-Sniper. Es gibt keine operative Verbindung zu ChatGPT-Dots.

## Zielarchitektur (noch nicht implementiert)

```text
   On-Chain events / sichere API-Streams / Public News / Social
                |                    |
        Discovery-Adapter      Market-Data-/News-Collector
                |                    |
                +-- persistent event queue + backfill ---+
                                                         |
             AGENT REGISTRY (dynamische 1..N Agenten)    |
     Discovery / News / Social / Onchain / Risk / QA / ...
                   |       |       |       |
                   +-- Signed CandidateEvent (versioned)
                                     |
                        Signal deduplication / TTL
                                     |
                      Central Decision Controller
                                     |
              HARD CONTRACT/LP/SELL/RISK GATE [VETO]
                   / REJECT  | WATCH   \ PAPER_ELIGIBLE
                                     |
                  PositionSizer / PortfolioGuard
                                     |
                      Route + Quote Simulator
                                     |
           PAPER EXECUTION LEDGER (event-sourced, persisted)
                                     |
                    Always-on Exit / Risk Monitor
                                     |
          Quotes / portfolio / audit --> Local Dashboard
```

## Vertrauenszonen

| Zone | Zulässige Aktionen | Noch nicht vorhanden |
|---|---|---|
| Öffentliche Datenadapter | Nur lesende WebSocket/HTTP-Aufrufe, Quellmetadaten, Rate-Limits | On-Chain-Verifikation, Reorg-/Gap-Erkennung |
| Agenten | Vorschläge, Scores, Belege, Status, keine Transaktionsrechte | Authentifizierter Broker/API-Kanal |
| Decision/Risk | Freigabe/Blockade hypothetischer Einstiege anhand deterministischer Regeln | Risk Engine und unabhängige Sell-Simulation |
| Paper Ledger | Virtuelle Buchung, Kostenmodell, Mark-to-Market | Ereignisprotokoll mit belastbaren Fills/Quotes |
| Wallet/Fiat (später) | **In dieser Version keinerlei Zugriffe** | Lizenzierter Provider, Identität, signierte Orders, separate Freigabe |

## Agentenskalierung und Unabhängigkeit

- `agent_id` ist eindeutig; Agents liefern **Vorschläge**, keine direkten Handelsbefehle. Jeder Vorschlag benötigt `chain`, `token_address`, `pool_address`, `observed_at_utc`, Quellen und Sicherheitserkenntnisse.
- Queues akzeptieren 1..N Agenten ohne Änderung des Controllers; Fan-in gruppiert nach `chain + token_address` und versieht jedes Signal mit TTL.
- Mehrfache Empfehlungen desselben Agents/der gleichen Quellen zählen nicht als zusätzliche Evidenz. Mehrheitsentscheid darf keine Contract-Fehler überstimmen.
- Risk Engine priorisiert **SELL-BERECHTIGUNG und LP-Sicherheit** über Hype-Scores. Fehlende Pflichtprüfung ist ein VETO für echten Handel; Paper-Recherche darf einen explizit ungeprüften Kandidaten enthalten, aber das darf nie als echte Handelbarkeit angezeigt werden.
- Kandidaten- und Handelsereignisse tragen `idempotency_key`, um Doppelorders bei Retries zu verhindern.
- Der lokale Exit-Manager verarbeitet Positionen **unabhängig** vom `entriesEnabled`-Schalter und Agenten-/ChatGPT-Verfügbarkeit.

## Windows-Runner / Ausfallsicherheit

- Node.js-Prozess bleibt nach Browser-Schluss aktiv; Sleep, Shutdown, Netzwerkfehler und Windows-Update können unterbrechen.
- Künftig: WS-Reconnect mit Exponential Backoff, HTTP-Backfill mit Blocknummer/Slot, Write-ahead-Log, Quote-Alterslimit, Zeitdriftprüfung, Statusansicht (`RUNNING`, `DEGRADED`, `OFFLINE`).
- Keine Endlos-Neustarts beim Crash ohne begrenzte Backoff-Policy; keine Echtgeldaktionen im Recovery-Pfad.
- Der Testserver bindet an 127.0.0.1 und akzeptiert `SNIPER_OFFLINE=1` für Netz-freie Tests; `SNIPER_DATA_DIR` isoliert Testdaten vom lokalen Portfolio.

## Schnittstellen/Verträge

Siehe [AGENT_PROTOCOL.md](AGENT_PROTOCOL.md). Für die aktuelle lokale API: `GET /api/health`, `GET /api/state`, `POST /api/command`. Erst eine sicherheitsgeprüfte externe Integrationsschicht darf die Agentensignale zum lokalen Controller transportieren.

## Zielerweiterung: Fünf kooperierende Review-Agenten mit gemeinsamem Belegspeicher (06.11.2026)

Referenz: [STRATEGY_5_AGENT_BIG_MOVES.md](STRATEGY_5_AGENT_BIG_MOVES.md). Die bestehende 1..N-Registry bleibt; die erste verbindliche Forschungskonfiguration hat fünf Rollen:

```text
read-only markets + news/social feeds -> persistent time-stamped evidence store
                                  |
     [A1 NEWS/LAUNCH] [A2 SOCIAL] [A3 ONCHAIN/LIQUIDITY]
                 [A4 CONTRACT/SCAM] [A5 QA/OPPORTUNITY]
                                  |
                evidence, counterevidence, agent_vote.v1
                                  |
             dedupe + provenance + 5/5 fresh reviews + TTL
                                  |
              independent HARD risk/sellability/quote VETO
                                  |
                  position sizing: 0 or min..max TEST-USDC
                                  |
                   PAPER BUY + portfolio / long HOLD
                                  |
         adaptive exit engine always monitors active positions
```

No direct Dot-to-local communication, signed events, persistent shared discussion or five-agent consensus currently exists. Hourly ChatGPT Dots are **research**, not low-latency trade engines; implementation is a Codex task. Confirm by synthetic local tests before any connectivity claim. The existing +15% AUTO trigger in `runner/core.mjs` is *legacy*, NOT a feature-complete adaptive exit.

Beware correlated sources, hindsight bias in multi-day social acceleration, stale data, slippage, whale/LP attacks, non-executable exits, browser closure, Windows sleep and crashes. `Bot AUS` must not cancel active exit monitoring. PAPER-only throughout.

## Verbindliche Zielarchitektur 07.11.2026: Multi-Instanz-Netz (noch NICHT implementiert)

Die lokale V0.4-Gateway-Implementierung wird durch zwei **Soll**-Ebenen ergänzt: (A) ein gemeinsamer fünfrollenbasierter Forschungskoordinator und ein abonniertes, sicheres **Signalverteilungsnetz**, (B) **N autonom entscheidende Client-Instanzen** für N unabhängige Nutzer und Geräte. Siehe [DISTRIBUTED_INSTANCES.md](DISTRIBUTED_INSTANCES.md) und [SIGNAL_DISTRIBUTION_PROTOCOL.md](SIGNAL_DISTRIBUTION_PROTOCOL.md).

Forschungsrollen gehören zentral zum Besitzerprojekt; Backend-/Event-Dienst muss separat betrieben werden (GitHub ist kein Dauerprozess). Publisher kennt weder Konten noch Guthaben/Wallets/offene Positionen. Jede Installation empfängt ausschließlich Version/Quellen/TTL/signierte Kandidaten und Exit-Hinweise, prüft lokal Contract/Sellability/Portfolio/Botstatus und entscheidet ggf. über eigene Paper-Orders. A=50 Test-USDC, B=200 Test-USDC, C=0 Test-USDC bleiben vollständig getrennt. Kein fremder Adminzugriff, kein ungeschützter Portforward; Authentisierung, TLS, Isolation, Opt-in, Revocation, Offline-Queue und separate lokale Datenbank.

Mobile App/PWA steuert nur die eigene Instanz. Eine vollständige mobile 24/7-Host-Engine ist noch kein bestätigter Bestand und braucht gesonderte Android/iOS-Hintergrundtests. Bot AUS sperrt neue Käufe, lokale Exits laufen unabhängig vom zentralen Forschungsnetz weiter. Konkrete Forschungsannahmen zu Haltefristen in [HOLD_EXIT_POLICY.md](HOLD_EXIT_POLICY.md), kein starres +15%-Gewinnziel als Wunschstrategie. Aktueller Nachweisstand in [IMPLEMENTATION_STATUS_2026-11-07.md](IMPLEMENTATION_STATUS_2026-11-07.md).

## R29 V5.5 – aktueller Paper-GPT-Status (19.11.2026)

**V5.5 (PR #74) – AUSFÜHRUNGSVERTRAG:** GPT ist alleiniger Marktstrategie-Entscheider. Die signierte GPT-PAPER-Route hat keine zweite Momentum-, 80-Punkte-, 1%-/3%-Strategie. In jeder Order bleiben aktuelle Kontoopt-in-, Contract/Pool-, frische Preis-, private Portfolio-Budget-/Cash-, LP-Impact- und unabhängig genaue Honeypot-Token+Pool-Sell-Simulation technisch Pflicht. UNKNOWN GoPlus-Metadaten sind nur in GPT-PAPER mit explizitem UNKNOWN-Acknowledgement und ohne bekannte Gefahrenzeichen zulässig. Alle Paper-Fills sind indikativ, keine ausgeführten realen Swaps; Solana bleibt technisch gesperrt. [Beleg](../research/r29/operations/R29_V5_5_GPT_ALLEINIGE_STRATEGIE_PAPER_GATES_AUDIT_20261119_DE.md).
