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
