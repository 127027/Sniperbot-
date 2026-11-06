# AI Memecoin Sniper — technischer Forschungsbericht
**Stand:** 06.11.2026, Europe/Berlin  
**Projektstatus:** Forschung / Paper-Trading-Konzeption; keinerlei Echtgeldeinsatz.  
**Abgrenzung:** Eigenständiges Projekt. Keine Änderungen an Hixton, dessen Repository, Dots oder bestehenden Forschungsautomationen.

## 1. Ergebnis in fünf Sätzen

1. Die sinnvollste erste Forschungsplattform ist **Solana**, weil mehrere Anbieter neue handelbare Pools und Token dort per API/WebSocket bereitstellen und Jupiter eine dokumentierte Swap-API anbietet. Dies ist eine technische Vorauswahl, keine nachgewiesene Profitabilitätsrangliste gegenüber Base, BNB Chain oder Ethereum.
2. Das System benötigt **zwei logische Agenten**: `SCOUT` zur Erkennung und Bewertung von Kandidaten und `SNIPER` zur unabhängigen Validierung sowie später zu simulierten Order- und Exitentscheidungen.
3. Die eigentliche Erkennung und Ordertechnik müssen **ereignisgesteuerte Dienste** sein. Eine stündliche ChatGPT-Automation kann Forschung liefern, aber keine sekundenschnelle On-Chain-Ausführung.
4. KI darf Nachrichten, Narrative und Anomalien analysieren; **harte Sicherheits-, Liquiditäts- und Risiko-Gates** müssen deterministisch über eine separate Risk Engine laufen.
5. Eine positive Paper-Trading-Performance ist erst aussagekräftig, wenn alle Launches (auch Delistings, Rug-Pulls, nicht verkäufliche Coins) sowie reale Kosten, Latenz und abgelehnte Orders erfasst werden.

## 2. Aktuell eingerichtete Forschungsaufgaben

- `Meme Scout – Forschungsradar`: angelegt und aktiviert. Aufgaben-ID `6aed110ecec48191b7c74a899068b7f1`; stündlicher bedingter Check, informiert nur bei wesentlichen neuen Ergebnissen.
- `Meme Sniper – Techniklabor`: Anlage versucht, aber vom **Limit von fünf gleichzeitig aktiven Automationen** blockiert.
- Vier Hixton-Aufgaben waren zum Zeitpunkt der Kontrolle aktiviert; eine fünfte Hixton-Dot-Aufgabe war deaktiviert. **Kein Bestand wurde geändert.**
- Über diese Oberfläche ist weder die Anlage zweier echter ChatGPT-Dots noch ein direkter asynchroner Dot-zu-Dot-Nachrichtenkanal verfügbar. Die neue Rechercheautomation ist **kein** autonomer Sniper-Daemon.
- `run_now` der Scout-Automation ergab einen Inline-Forschungsauftrag, der im aktuellen Gespräch durch diesen Bericht ausgeführt wird. Die planmäßigen Folgechecks bleiben aktiviert.

## 3. Funktionale Zielarchitektur

```text
[Birdeye new pair/listing]      [Helius On-Chain Events]    [DEX Screener / GeckoTerminal]
            \                          |                         /
              --> [Collector + Reconnect/Backfill + Zeitstempel] <--
                                    |
                                    v
                  [Queue / Dedupe / persistentes Ledger]
                                    |
                                    v
                  [SCOUT: heuristische Prüfung + LLM-News]
                                    |
                  CandidateEvent: Quelle, Chain, Mint, Pool,
                        Zeit, Signalscore, Belege
                                    |
                                    v
                     [HARTES SECURITY/RISK GATE]
              (Authority, Holder, Liquidity, Exit, Manipulation)
                                    |
                      reject / watch / paper_eligible
                                    |
                                    v
                 [SNIPER: unabhängiger Signalgate + Route]
                    Jupiter Swap v2 Quote / Transaktions-
                        simulation / Papier-Order
                                    |
                                    v
                      [Position Manager / Exit Engine]
                Slippage, Volatilität, Liquidität, Momentum,
                     Exit-Simulation, Kill-Switch
                                    |
                                    v
                   [Audit Log + Dashboard + Forschungsreport]
```

**Zentrale Regel:** SCOUT kann einen Kandidaten vorschlagen, aber niemals unmittelbar einen echten Kauf auslösen. Die finale Instanz verwirft auch attraktive Signale, wenn Ausstieg oder Sicherheit nicht nachweisbar sind.

## 4. Datenquellen — überprüft am 06.11.2026

| Dienst | Zweck | Dokumentiertes Merkmal | Hinweis |
|---|---|---|---|
| Birdeye Data | Neue Solana-Token und Pools, Sicherheit, Halter, Liquidität, Trades | `GET /defi/v2/tokens/new_listing`; WebSocket `SUBSCRIBE_NEW_PAIR`, `SUBSCRIBE_TOKEN_NEW_LISTING` | Für echten Low-Latency-Stream kostenpflichtiger Zugriff; Paketberechtigung vor Vertragsabschluss mit API-Key prüfen |
| DEX Screener | Cross-Chain-Preis/Pool/Liquidität/Transaktionen und bezahlte Promotion | Paar-/Token-Endpunkte bis 300 Anfragen/Minute, Profile/Boosts 60/min (laut Anbieter) | `boosted` ist Werbesignal, kein Kauf- oder Sicherheitssignal |
| GeckoTerminal | Neue Pools, Trending, historische OHLCV, Trades | `/networks/{network}/new_pools`; öffentliches Beta-API | Supportseite nennt 30 Calls/min, API-Dokuseite teils ca. 10/min; konservativ begrenzen und live verifizieren |
| Jupiter Developer Platform | Solana Token-Klassifizierung und simulierte Handelbarkeit | Tokens V2 (`/tokens/v2/recent`, `toporganicscore/5m`), Swap API V2 mit `/order`/`/execute` und `/build`/`/submit` | Keine Wallet-Signatur oder Transaktion in Forschungsphase |
| Helius | RPC/WebSockets/Webhooks für Low-Latency-On-Chain-Events | Standard-WSS und kostenpflichtige Optionen | Stream-Ausfälle, Reorgs/Commitment und Backfill berücksichtigen |
| GoPlus Security | Ergänzende Token-Sicherheitsbewertung | Solana Token Security API (Beta) | Keine einzelne Scorequelle als alleinigen Sicherheitsbeweis verwenden |
| News/Social | Trends, Narrative, Risikosignale | Authentifizierte APIs, Quellenlisten, Zeitstempel | Engagement lässt sich kaufen/manipulieren, daher schwächer gewichten als On-Chain-Daten |

### Anbieterlinks

- DEX Screener: https://docs.dexscreener.com/api/reference
- GeckoTerminal: https://api.geckoterminal.com/docs/index.html
- Birdeye Launch-Erkennung: https://birdeye.so/data-api/blog/detail/solana-new-token-sniper-api-birdeye-data
- Birdeye Preise: https://birdeye.so/data-api/pricing
- Helius WebSocket/Webhook: https://www.helius.dev/solana-webhooks-websockets
- Jupiter Swap v2: https://developers.jup.ag/docs/swap/index.md
- Jupiter Organic Score: https://developers.jup.ag/blog/what-is-organic-score
- GoPlus Solana Security: https://docs.gopluslabs.io/reference/solanatokensecurityusingget
- Solana Tokenprogram: https://solana.com/docs/tokens

### Reihenfolge zur Quellenintegration

1. Kostenloser Collector: DEX Screener + GeckoTerminal + Jupiter-Tokenlisten, mit Backoff und einheitlicher Contract-ID.
2. Sicherheitsanreicherung: native Solana-RPC-Prüfung der Mint-/Freeze-Authority sowie Token-2022-Extensions; zusätzlich Birdeye/GoPlus, soweit verfügbar.
3. Erst nach Kosten-/Latenzbenchmark: Birdeye-WebSockets und/oder Helius-Events als Primärstrom integrieren.
4. Newsletter/Social-Media-Trends ausschließlich ergänzen; keine KI-gesteuerten Käufe aus einzelnen Posts.

## 5. Chain-Auswahl

- **Solana:** erste Entwicklungsplattform wegen dokumentierter Discovery-Streams, Datenanbieter, Jupiter-Routing und hoher Memecoin-Aktivität. Risiken: extreme Bot-Konkurrenz, manipulierte Launches, häufige Liquiditätsbrüche.
- **Base:** später als zweite EVM-Chain untersuchen; Fokus auf Pool-Events, Token-Contract-Risiken, Aggregator-Routing und EVM-Sell-Simulation.
- **BNB Chain:** später; zusätzlicher Fokus auf Honeypots, modifizierbare Token-Transfers und reale Verkaufsausführbarkeit.
- **Ethereum Mainnet:** später; Gas- und MEV-Kosten können für 100-USDC-Trades unverhältnismäßig sein. Nicht pauschal ausschließen, sondern effektive Round-Trip-Kosten messen.

**MVP-Entscheidung:** Zunächst *nur Solana* und *nur Coins mit bereits nachweisbarer handelbarer Pool-Liquidität*. Pre-Pool-/Pre-Bonding-Sniping als gesondertes, deutlich riskanteres Forschungsthema.

## 6. Unverhandelbare Ausschlussprüfungen (Fail Closed)

Jeder Coin ist zuerst `REJECTED` oder `WATCH_ONLY`, bis die Sicherheitsprüfungen bestanden sind.

- Coin-Adresse **nicht** nur nach Ticker oder Symbol identifizieren; Mint, Chain und Pool-Adresse eindeutig bestimmen.
- Keine unerwartete aktive Mint-/Freeze-Authority; bei Token-2022 zusätzlich Transfer-Fees, Permanent Delegate, Transfer Hooks und Default Account State prüfen.
- Holder-Verteilung prüfen: Creator-/Dev-Cluster, miteinander verbundene Wallets, Insider und Top-Holder exklusive Pool-/Systemadressen unterscheiden.
- Pool-Liquidität und **reale Verkaufstiefe** getrennt messen; faire Hin- und Rücktauschquote abfragen/simulieren.
- Rug-Pull-Risiko: Eigentümer-/LP-Rechte, auffällige Liquidity-Withdrawals, kurzfristiger Ein-/Ausfluss.
- Manipulationsrisiko: Wash Trades, Scheinvolumen, Bot-Cluster, recycelte Social-Media-Profile, kopierte Contracts.
- Datenaktualität und Feed-Konsistenz prüfen; veraltete oder widersprüchliche Daten führen zu `WATCH_ONLY`, nicht zu einem Trade.
- Bei fehlender Verkaufsroute, nicht verifizierbarer Quote, Simulationsfehlern oder Datenfeed-Ausfällen: **kein Trade**.

**Forschungsbasis:** Studien zu Millionen von Launches berichten häufige Rug-Pull-Muster und gezielte Manipulationen. Solana-Risiken betreffen oft die Liquidität und soziale Dynamik, nicht nur die Token-Codeberechtigungen. Die Studienwerte sind **keine verlässliche Vorhersage für einen einzelnen Coin**.

- https://arxiv.org/abs/2608.20271
- https://arxiv.org/abs/2609.10246

## 7. Schnittstelle zwischen SCOUT und SNIPER

Dieses Event ist ein zukünftiges **Schemasoll**, kein aktuell eingerichteter Nachrichtenkanal:

```json
{
  "event_type": "candidate.v1",
  "event_id": "generated-unique-id",
  "observed_at_utc": "ISO-8601",
  "chain": "solana",
  "token_mint": "BASE58_TOKEN_MINT",
  "pool_address": "BASE58_POOL_ADDRESS",
  "sources": [
    {"provider": "birdeye", "observed_at_utc": "ISO-8601"}
  ],
  "metrics": {
    "pool_age_seconds": null,
    "liquidity_usd": null,
    "organic_buyers_5m": null,
    "buy_volume_5m_usd": null,
    "sell_volume_5m_usd": null,
    "top_holder_share_ex_pools": null
  },
  "risk": {
    "mint_authority_checked": false,
    "freeze_authority_checked": false,
    "sell_route_verified": false,
    "contract_extensions_checked": false
  },
  "scout_score": null,
  "decision": "WATCH_ONLY",
  "paper_only": true
}
```

**Kommunikation für später:** `SCOUT` publiziert in Redis Streams oder eine kleine Postgres-Outbox; `SNIPER` liest idempotent mit `event_id`, prüft erneut und schreibt eigene Entscheidungen in ein unveränderliches Audit-Log. Quellen und Daten-Snapshots müssen für den Backtest gespeichert werden. Keine Kontoschlüssel in Events oder Logs.

## 8. Signale, Positionsgröße und Ausstieg

### Signale, die getestet werden sollten

- 1-/5-/15-Minuten-Momentum mit zunehmendem **organischen** Käuferinteresse und Nettokapitalzuflüssen.
- Neukäuferwachstum statt bloßem Gesamt-Transaktionsvolumen.
- Stabile, wachsende Liquidität und ausreichende Sell-Side-Quote.
- Frühes Akkumulations- gegenüber Verteilungsverhalten großer Wallet-Cluster.
- News/Social nur als Kontext; optional separater LLM-Narrative-Score.
- Bewertungs- und Historienmerkmale getrennt für frisch erzeugte Pools und länger existierende Coins kalibrieren.

### Positionsgröße

- Der Nutzungswunsch ist **100–1.000 USDC nominal je Position**, kein festgelegtes verfügbares Gesamtbudget.
- 100 USDC als **Startbetrag in der Simulation**; 1.000 USDC nur, wenn Liquidität, Preisauswirkung und Gesamtverlustbudget es zulassen.
- Formelprinzip: `position = min(gewünschte Größe, risikobasierte Obergrenze, liquiditätsbasierte Obergrenze, verfügbare freie Mittel)`.
- Ein nicht ausführbarer Stop-Loss schützt im Rug-Pull nicht: **Totalverlust des eingesetzten Betrags** in Szenarien berücksichtigen.

### Exit-Hypothesen im Paper-Trading

- Volatilitätsabhängiger Trailing-Exit mit unabhängiger Kill-Switch-Logik.
- Teilgewinnmitnahmen gegenüber vollständigem Exit gegentesten.
- Exit bei zunehmendem Sell-Pressure, abruptem Liquidity-Withdraw, stark sinkendem organischen Kaufinteresse oder technischem Risiko.
- Zeitbasierter Exit für fehlgeschlagene Momentum-Hypothesen.
- Nicht nur Kurs-Highs verwenden: tatsächliche handelbare Sell-Quotes unter Slippage, Gebühren, Ausführungsversagen und Verzögerungen simulieren.

## 9. Realistische Validierung vor Live-Freigabe

1. **Zeitlich korrekte Daten:** Der Backtest darf nur Informationen kennen, die zu seinem Entscheidungszeitpunkt existierten; keine rückwirkend hinzugefügten Scam-Labels als Frühindikator.
2. **Vollständiges Universum:** Einschließlich gescheiterter Coins, Rug-Pulls, Pool-Schließungen und Märkten ohne verkäufliche Tiefe.
3. **Quote-basiertes Paper-Trading:** Latenz zwischen Entdeckung, Risikoprüfung, Quote, simuliertem Fill und Exit messen; Market-Impact realistisch abschätzen.
4. **Walk-forward und Out-of-sample:** Parameter auf Trainingsdaten wählen, auf späteren Cohorts blind testen; Ergebnisse nach Marktregime und Chain auswerten.
5. **Kennzahlen:** Nettorendite nach allen Kosten, Drawdown, Trefferquote, Profit-Factor, Median-Trade, 95%-Verlust, Sell-Fail-Rate, Exposition, Zeit bis Exit, Datengaps, p50/p95/p99-Latenz.
6. **Sicherheitsabnahme:** Null Echtgeldorder, keine Secrets in Logs, Wiederanlauf nach Feedverlust, deduplizierte Events, idempotente Entscheidungen und manuell getesteter globaler Kill-Switch.
7. **Freigabe:** Ohne gesonderte, spätere ausdrückliche Erlaubnis keine Wallet-Verbindung, keine privaten Schlüssel und keine Echtgeldtransaktionen.

## 10. Vorläufige Kosten (öffentliche Anbieterpreise, USD/Monat)

| Komponente | Forschungsstart | Echtzeit-Ausbau |
|---|---:|---:|
| DEX Screener API | keine dokumentierte API-Abogebühr für die genannten Public Endpoints | bei höheren Anforderungen alternative Anbieter prüfen |
| GeckoTerminal Public API | frei nutzbare Rate-limitierte Beta-API | CoinGecko-Pro-Plan je nach Bedarf |
| Helius RPC/WebSockets | Free $0 | Developer $49; weitere Stufen und Spezial-Streams kosten extra |
| Birdeye Data | Standard Free; Lite $39; Starter $99 | Premium mit WebSocket ab $199 (Paketansprüche prüfen) |
| Eigenes Hosting | noch nicht bepreist | VPS/VM, Monitoring, Storage, Backups und eventuelle Egress-Kosten separat |
| LLM-Newsanalyse | API-Nutzung volumenabhängig | Tokenkosten plus jeweilige Nachrichten-/Social-API-Lizenzen |

**Anmerkung:** Preise sind Anbieterangaben vom Recherchezeitpunkt; vor der Buchung erneut prüfen. Nicht jede Funktion ist in jedem Tarif enthalten. Ein kostenloser MVP kann auf Datenlimits treffen, die für echtes sekundenschnelles Sniping ungeeignet sind.

Preislinks:
- https://www.helius.dev/pricing
- https://birdeye.so/data-api/pricing

## 11. Empfohlene Implementierungsreihenfolge

**P0 – jetzt, Recherche:** Datenanbieter, Bedrohungsmodell, Datenmodell, rechtliche und steuerliche Anforderungen klären. Keine zusätzlichen bestehenden Hixton-Ressourcen verwenden.

**P1 – eigener Quellcode:** Neues, separat angelegtes Projekt/Repository mit Collector, normalisierten Eventdaten, Datenbank, Tests und ausschließlich `paper_mode=true`. Kein gemeinsames Deployment mit Hixton.

**P2 – Security Gate:** Authority-, Extension-, Wallet-, Pool- und Sell-Quote-Prüfungen mit negativen Testfällen; jede fehlende Prüfung blockiert eine Handelsfreigabe.

**P3 – Backtest:** Kohorten neuer Solana-Token erfassen und realistische Fill-/Exit-Simulation aufbauen; Blacklist und Sicherheitstests datumsgetreu.

**P4 – 24/7 Paper-Daemon:** Dedizierter Host, WebSocket-Reconnect, Backfill, Monitoring, Alarmierung, Dashboard und unveränderliche Experimentlogs. Strategievergleich auf Out-of-sample-Daten.

**P5 – Review:** Finanzielle und technische Ergebnisse kritisch prüfen. Erst danach eventuell separaten Echtgeldbetrieb entwerfen und ausdrücklich genehmigen lassen.

## 12. Aktuelle Grenzen und offene Punkte

- Echte ChatGPT-Dots sind laut derzeitiger OpenAI-Dokumentation nicht in allen Plänen und Regionen verfügbar; die hier angelegte Scout-Aufgabe ist eine **Automation**, keine zusätzliche Dot-Instanz.
- ChatGPT-Automationen unterstützen höchstens stündliche Trigger. Damit lassen sich keine Gewinne aus kursrelevanten Sekundenbruchteilen versprechen oder erzielen.
- Die zweite neue Automation konnte wegen des Limits von fünf aktiven Tasks nicht erstellt werden. Vier aktive Hixton-Aufgaben blieben unangetastet.
- Ein eigenständiges GitHub-Repository ist noch nicht erstellt. Es wurde bewusst keine Datei im bestehenden Hixton-Repository angelegt.
- Marktdaten- und Paper-Fill-Performance wurden **noch nicht praktisch benchmarked**. Keine der Kosten-/Latenzangaben ist ein Profitversprechen.
- Eine derzeitige Empfehlung für bestimmte Coins lässt sich ohne zeitnahe, tokenadressbezogene Live-Checks nicht verantwortbar aussprechen.

**Quellen zur Produktverfügbarkeit:**  
https://help.openai.com/en/articles/20001530-getting-started-with-your-dot
