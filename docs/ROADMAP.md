# R29 V5.0 – Priorisierte Roadmap (Ziel ≠ Implementierung)

**VERBINDLICHER V5.0-ZIELVERTRAG (NUTZER GO):** [R29 V4.5–V4.9-Wissenschronik](../research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md) · [Autonomer GPT-Memecoin-Scout](../research/r29/operations/R29_V5_0_AUTONOMER_MEMECOIN_SCOUT_ZIELVERTRAG_20261118_DE.md) · [30-Tage-Fälle: ausdrücklich unbestätigt, nicht für Blindtest-Inputs](../research/r29/operations/R29_V5_0_MEMECOIN_30T_REFERENZFAELLE_UNVERIFIZIERT_20261118_DE.md). Die bisherige V4.9-Dokumentation unten ist der **technische Code-IST-Stand**, nicht die Definition eines bereits erreichten V5.0-Ergebnisses.

**V5.0 ist ein vom Nutzer freigegebenes Entwicklungsziel, KEIN Nachweis einer fertig installierten Handelsfunktion.** Aktueller belegter Code-IST ist R29 V4.9 (PR #65) plus Dokumentationsabgleich PR #66. Der parallele Entwicklungsauftrag darf nur mit echten Code-/CI-/Windows-/ChatGPT-Belegen als erfüllt markiert werden.

**Das Produktziel:** vorhandener 24/7-Windows-Collector sucht neu entstehende, vorher unbekannte Memecoins auf unterstützten Chains anhand aktueller Pools, Liquidität, Walletfluss, Social-/News-/Marktdaten. Die bestehende ChatGPT-Forward-Automation trifft **4–24 tatsächliche GPT-Vollreviews/Tag als Ziel**, priorisiert neue Ereignisse und entscheidet allein WATCH/BUY/HOLD/SELL/NO_TRADE, Einsatz und individuellen Exit. Stündlicher Wakeup ist NICHT garantiert eine GPT-Vollanalyse; 24/7 lokales Monitoring ist NICHT gleich 24/7 GPT-Aufrufe.

**Beweisziel:** eindeutiger unbekannter Contract + zeitgerechter Fund → echte GPT-Entscheidung → authentifizierter GitHub-BUY → unabhängiger lokaler Paper-Sicherheits-/Quote-Check → echter persönlicher Paper-Ledger-Fill → GPT-autorisierter kontinuierlich überwachter SELL → Netto-PnL im vorhandenen Dashboard. Isolierte Tests und NO_TRADE sind keine autonomen Trades.

**Zwei Konten, dieselben GPT-Signale (SOLL):** getrennte dynamische Paper-/Real-Präferenzen, Gesamtgrenzen, Positionen, Reservierungen und eigene Sicherheitsprüfungen. **IST V4.9:** Paper-Werte lokal dynamisch; Real READ-ONLY Wallet und LIVE_LOCKED ohne belegtes vollständiges eigenes Real-Handelsledger; privater lokaler Paper-/Real-Snapshot erreicht Cloud-GPT NICHT automatisch. Echtgeld bleibt gesperrt. Bestehende 1-%-/3-%-Paper-Risikogates gelten weiterhin und dürfen nicht stillschweigend entfallen.

**Historische 30-Tage-Tabelle:** 36 **unbestätigte Betreiber-Referenzen**, keine komplette Marktgesamtheit, keine verifizierten ausführbaren Gewinnquoten und KEINE Gewinner-Whitelist. Nur POSTFREEZE-Diagnose; Blindtests brauchen neutralen as-of-Markt inklusive Verlierern. 7+3 Blindtests, Frische-/Quellen- und historische Price-/Fee-/Sellability-Abnahme weiterhin offen.

**Nicht neu bauen:** zusätzlicher Bot/Dot, lokaler bezahlter OpenAI-API-Aufruf, GitHub-Kurier, repariertes Paging, neue UI, PayPal-/Wallet-Funktionen; keine vertraulichen Kontowerte in öffentliches GitHub, keine Echtgeldtransaktion.

**Entwicklungsreihenfolge:** 1. Tatsächlich 4–24 GPT-Vollreviews/Tag und Marktereignis→Review-Latenz messen; 2. vorhandene Collector-/Source-Security-/Kandidatenpriorisierung mit echten neuen Coin-Inputs prüfen, ohne Paging neu zu bauen; 3. privaten revisionsgebundenen Bot→ChatGPT-Istzustand sicher zustellen, keine öffentlichen Kontodaten; 4. Paper-Kapitalgrenzen gegenüber dynamischen Nutzerlimits fachlich getrennt von Verlustrisiko klären; 5. prospektiven unbekannten GPT-Paper-BUY→HOLD→SELL mit Gebühren und privater Ledger-Quittung belegen; 6. historische 7+3 as-of-Prüfung ohne Gewinner-Leakage.

---

## Technischer Ausgangsstand R29 V4.9 (nachgewiesene Implementierung, historischer Kopf)

# R29 V4.9 – Aktuelle Roadmap (18.11.2026)

**Aktuelle Referenz R29 V4.9:** [R29 V4.5-Wissensstand mit V4.6–V4.9-Nachträgen](../research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md). Die früheren Zustandszahlen und Altanweisungen unter der Archivmarkierung sind datierte Historie.

**Strategie:** ChatGPT allein entscheidet über neue Memecoins; GitHub übermittelt; der vorhandene Windows-Bot validiert und führt zulässige PAPER_ONLY-Aufträge aus. Ziel ist ein GPT-Signal mit **zwei getrennten dynamischen Kontozuständen**, nicht feste Einsätze und nicht ein zweiter Bot.

**Ist/Soll strikt unterscheiden:** Paper bevorzugter Einsatz und Gesamtbudget werden lokal gespeichert; Änderungen auf 45/35 sind möglich (PR #65). Real ist LIVE_LOCKED/read-only Wallet. Eigene persistierte Real-Preferred-/Gesamtlimits und Real-Positionsreserve sind derzeit **nicht belegt**. Keine reale Order und kein stillschweigendes Übernehmen von Paper-Werten in Echtgeld.

**Private Zustandsübermittlung:** GET /api/gpt/private/bot-state liefert nur lokal authentifiziert zwei Read-only-Snapshots. Ein sicherer privater Cloud-ChatGPT-Empfang ist **nicht nachgewiesen**. Kein Konto- oder Walletstand darf ins öffentliche GitHub.

**Risikogates:** Separate Paper-Limits von 1 % pro Einzelposition und 3 % Gesamtexposition sind noch wirksam und können das dynamische User-Limit enger fassen. PR #61/#63: positionsgebundene GPT-Exit-Policy + Monitor im Code; PR #64: nur isolierter Test-Paper-Fill, **kein** autonomer Trade im persönlichen Ledger. Sicherheits- und Quote-Gates unverändert, echte BUY/SELL-Abnahme offen.

**Betrieb:** ausschließlich Sniperbot_Starten.bat, keine lokale kostenpflichtige OpenAI-API, kein zusätzlicher API-Key, keine Echtgeld-Orders, keine neuen Bots/PayPal-/UI-Arbeiten, historische 10 as-of-Tests weiterhin getrennt.

**Nächste Arbeit in dieser Reihenfolge:** 1) fehlenden vertraulichen Bot→ChatGPT-Zustandsweg und echte Kontorevisionen beweisen, ohne Public-GitHub-Leak; 2) prospektives GPT-Signal und sichere Paper-BUY/HOLD/SELL-Quittungen nachweisen; 3) Real-Kontoanforderungen später nach eigenständiger Freigabe sauber erfassen; 4) 10 historische 7+3-Blindtests getrennt fortsetzen. Keine erneute V4.2/V4.5-Entwicklung.

---

## Historische V0.3-Roadmap / damaliger Plan (archiviert)

# Implementation roadmap / gap analysis

## Current version 0.3
- Local Node server + browser dashboard; zero npm dependencies for runtime.
- **Virtual** 50 EUR deposit, auto TEST-EUR to TEST-USDC conversion at fictional 1:1, buy/hold/sell paper positions.
- Entry bot switch separate from exit engine; HOLD default or AUTO TP/SL; adjustable 50–50, 200–400 etc.
- Read-only public GeckoTerminal new-pools discovery for Solana, Base, BNB and Ethereum. DEX Screener price marking and contract lookup. Provider availability and API formats **have not been verified in live deployment**.
- Scoring is an experimental heuristic from pool liquidity, age, 5m volume and trades; it is **not a safety or price prediction model**. No organic-wallet, freeze authority, mint authority, LP audit, honeypot or smart money validation.
- Scanner polls every ~90 s, positions every ~30 s; NOT low-latency sniping, NOT complete market coverage. Ordinary cryptocurrencies not on these four DEX networks cannot be traded in this prototype.
- Balances persist in `.local/paper-state-v03.json`. `.local` is ignored by git.

## Product milestones
- P1: Backfill and genuine market provenance, independent cross-source validation, scan status and error budgets.
- P2: Real risk engine + contract/holder/LP checks + liquidity depth and selling feasibility.
- P3: Event-driven scanner + research agent message queue, deduplication, audit timeline, alerting.
- P4: Paper-trading executable route/quote simulation, realistic fees + market impact, deep backtest with delistings.
- P5: Authenticated wallet and licensed fiat on/off ramp design after **new explicit approval**, never silently enable real transactions.

## Known risks
- Paper 1:1 EUR-to-USDC has **no connection to FX rates**, deposit/withdrawals and swaps are simulated and never transfer funds.
- Public API endpoints may be rate limited or change shape. The app should report provider errors; offline mode still permits simulated test signals.
- Mark-to-market valuations from public DEX price feeds are NOT reliable executable exit prices, especially in low-liquidity tokens.
- Closing laptop/sleep stops service, so 24/7 requires uptime and later Windows autostart/watchdog with explicit user consent.

## Produktanforderungen aus der aktuellen Freigabe (November 2026)
- Freies **1..N-Agentensystem** mit unabhängiger Bewertung und VETO; bestehende ChatGPT-Forschungsautoms sind nicht direkt verbunden.
- Mehrere automatische Paper-Käufe, wenn neue Kandidaten auftauchen; Positionshöhe aus frei wählbarem Min/Max, Kapital- und Sicherheitslimits. Stand V0.3: nur **eine** Position.
- Langfristiges HOLD über Tage, Wochen, Monate und später konfigurierte KI-/Risikostrategien für Ausstieg. Gewinnziele sind keine Renditegarantie.
- Quellcode/Dokumentation für Codex: `AGENTS.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, `AGENT_PROTOCOL.md`, `CODEX_TASKS.md`, `KNOWN_ISSUES.md`, `SECURITY.md`.
- Priorität zuerst Windows-Lauffähigkeit und nachweisbare Paper-Funktion statt Echtgeld-Integration.

## Neues verbindliches Ziel – High-Upside-Sniper mit fünf Agenten (06.11.2026)

Siehe [STRATEGY_5_AGENT_BIG_MOVES.md](STRATEGY_5_AGENT_BIG_MOVES.md).

1. P0: Bereits veröffentlichte V0.3 auf dem echten Windows-Laptop installieren, Fehler beheben, Paper-End-to-end absichern.
2. P1: fünf unabhängige logische Agentenrollen, gemeinsamer Evidence-Store, 5/5-Review plus hard Risk-VETO, synthetische Gateway-Integration und Audits.
3. P2: zeitlich korrekte On-Chain-/Social-Daten, Kandidaten früh vor Hype erkennen (keine Social-Bots und kein Backtest-Look-ahead).
4. P3: Min-/Max-Positionsgrößen einschließlich 50–1000 TEST-USDC, Kapitallimits, Pool-Tiefe, mehrere Positionen, keine Pflicht zum Maximaleinsatz.
5. P4: bisherige +15-%-AUTO-TP als Legacy ersetzen durch nachweisbar adaptive Trend-/Risk-/Liquidity-/Trailing-Exitstrategie; Bot AUS sperrt nur Einstieg.
6. P5: historische vollständige Launch-Kohorten, lange HOLDs, Exit-Fails und tatsächliche modellierte Kosten, Out-of-sample-Validierung.
7. Später separat: echter Zahlungs- und Wallet-Betrieb nur nach expliziter neuer Freigabe.

Aktueller Quellcode ist **noch unverändert** und besitzt weiterhin den +15-%-Demo-AUTO-Exit. Zwei stündliche ChatGPT-Forschungsautomationen sind nicht gleich fünf verbundene Agenten; Verbindung und Quorum erst implementieren.

## Neue verbindliche Roadmap: unabhängige Nutzergeräte, zentrale Forschung (07.11.2026)

**Goal:** Eigentümer und Freunde installieren jeweils einen eigenen Bot und verwalten 100 % getrennt ihr eigenes Guthaben/Coins/Wallets. Ein gemeinsamer Forschungsdienst mit fünf überprüfenden Rollen sendet BUY- und EXIT-Hinweise an alle abonnierten Instanzen, nie direkte Kontobefehle. Spezifikation: [DISTRIBUTED_INSTANCES.md](DISTRIBUTED_INSTANCES.md); [SIGNAL_DISTRIBUTION_PROTOCOL.md](SIGNAL_DISTRIBUTION_PROTOCOL.md).

- M0: Echter Dot-zu-lokal-Gateway-Test mit tatsächlicher Serverantwort + identischer Event-ID (weiter offen).
- M1: Signierter zentraler Research-/Exit-Advisory-Broker mit authentifiziertem, ausgehendem Client-Abonnement, Replay-/TTL-/Offline-Schutz; kein GitHub-as-Broker.
- M2: Separater Instanz-Onboarding-/Account-/Credential-/Storage-Lifecycle und 3-isolierte-Clients-Test, eigene Paper-Kontostände und Entscheidungen trotz gleicher Signalsendung.
- M3: Authentifizierte mobile Remote-UI nur für den eigenen Bot; Android/iOS-Host nur nach gesonderter Plattformvalidierung.
- M4: Adaptive Position-/Halte-/Exit-Regeln inklusive Signalbewertungen und echter sellbarer Paper-Quotes, historische vollständige Kohorten, keine garantierte Rendite.
- M5: Echter Wallet-/PayPal-/Fiat-Service erst mit erneuter expliziter Autorisierung und Compliance-/Sicherheitsprüfung.

**Stand V0.4:** Ein lokaler Rollen-Gateway ist vorhanden; kein bestätigter echter Dot, kein verteilter Broker, kein plattformübergreifender produktiver Dienst und keine echten Gelder. Hixton unangetastet.

