# V0.9 – Von den 5 Dots zum lokalen Coin-Abgleich (Entwicklungsnachweis)
**Stand: 10.11.2026. Branch: `codex/v09-live-pool-readback-20261110`. PAPER ONLY. Kein Echtgeld, keine tatsächliche Wallet und keine autonomen realen Token-Käufe.**

## Umsetzung
1. `runner/research-network.mjs` holt die fünf vorhandenen öffentlichen Rollenberichte aus `codex/research-gateway-v04`. Hier wird **kein** BUY/SELL erzeugt.
2. `runner/readback-batch.mjs` wählt höchstens drei priorisierte, nicht archivierte Watchlist-Kandidaten aus frischem Research. Der laufende Windows-Server ruft `runner/live-pool-readback.mjs` beim ersten gültigen GitHub-Forschungsabruf und anschließend höchstens alle 5 Minuten auf.
3. `runner/live-pool-readback.mjs` fragt exakt angegebene Chain + Token + Pool bei **GeckoTerminal** und **DEX Screener** nach. HTTP-Abbruch, Größenbegrenzung (256 KiB je Antwort), Adressvalidierung, Preis- und Liquiditätskonflikt, Timeout, Quellenfehler. Stets `paper_entry_authorized:false`, `contract_status:'UNKNOWN'`, `sellability_status:'UNKNOWN'`, `executable_sell_quote:false`.
**Ergänzung (RPC):** `runner/onchain-existence-readback.mjs` prüft parallel nur die **Existenz** öffentlicher Konten/Contract-Bytecodes via `getAccountInfo` (Solana) bzw. `eth_chainId`+`eth_getCode` (Ethereum, Base, BSC), ohne Transaktion, Keys, Wallet oder Buy-/Sell-Swap. Eine fehlende RPC-Antwort, falsche Chain-ID oder fehlender Contract-Code erzeugt `UNKNOWN`. Auch vorhandene Contracts erhalten **niemals** `contract_security:'PASS'` oder `sellability:'PASS'`. Das Chain-Ergebnis wird lediglich als `onchain_existence_status` in der streng begrenzten GitHub-Rückmeldung mitgegeben. Öffentliche RPC-Endpunkte können rate-limited oder nicht produktionsgeeignet sein.

4. `runner/readback-history.mjs` speichert jedes Ergebnis in einem lokalen append-only UTC-Evidenzarchiv unter `.local/research-learning/pool-readbacks/history/` und die letzte gesicherte Momentaufnahme als `latest.json`. Kein Zugriff auf `%LOCALAPPDATA%\MemeSniperPaper`-Kontostände.
5. `GET /api/v09/pool-readbacks` sowie das Dashboard **V0.9 · Systemprüfung** zeigen die **abgerufenen** oder ausdrücklich `UNVERIFIED` gebliebenen Poolidentitäten. Identität zweier Kursaggregatoren bedeutet keine unabhängige On-chain-Bestätigung, keine Sicherheitsfreigabe und keine ausführbare BUY-/SELL-Quote.
6. Der bestehende separate Windows-Markt-Collector verwendet `runner/readback-public-bridge.mjs`, um aus `latest.json` höchstens drei bis 15 Minuten alte, streng auf öffentliche Felder reduzierte Pool-Notizen zurück in sein bereits bestehendes `research/market/latest.json` zu geben. Veröffentlichung erfolgt **nur wenn der bereits gesicherte optionale GitHub-Publishing-Modus eingeschaltet ist**; kein Passwort, Seed, PayPal, Saldo oder Signal mit Handelsfreigabe.
7. `runner/research-market-publisher.mjs` verweigert alle zusätzlichen oder geänderten readback-Felder, insbesondere risk PASS, angeblich ausführbare Sell-Quotes und private Schlüssel. Dies ist die vorgesehene GitHub-Rückrichtung zum Forschungsnetzwerk, aber noch **kein live von deinem privaten Laptop quittierter End-to-End-Test**.
8. `runner/signed-research-quorum.mjs` validiert sechs künftige unabhängige **Ed25519-signierte Behauptungen**: fünf unterschiedliche Forschungsrollen und separater Risk-Controller, je ein eigener Publisher-/Schlüssel-/Quellenhost, TTL, VETO und Revisions-/Identitätskonsistenz. Die Modul-Tests erzeugen nur flüchtige Testschlüssel. Ein echter unabhängiger Signierdienst ist **nicht angeschlossen**, und selbst sechs gültige Signaturen sind **keine objektive Contract-/Sellability-/Quote-Prüfung**.

## Offizieller externer API-Stand
- DEX Screener Pair API `GET /latest/dex/pairs/{chainId}/{pairId}`, URL, Base-Token-Adresse, Pair-Adresse, Preis und Liquidity (Aggregatordaten): https://docs.dexscreener.com/api/reference
- GeckoTerminal `GET /networks/{network}/pools/{address}` ist eine öffentliche **Beta-API**, ungefähr 10 Requests/min, mit über die Plattform aggregierten Pools: https://api.geckoterminal.com/docs/index.html
- Direkte, nur lesende RPC-Methoden: https://ethereum.org/developers/docs/apis/json-rpc/ ; https://basehub.org/api-reference/rpc-overview/ ; https://docs.bnbchain.org/bnb-smart-chain/developers/wallet-configuration/ ; https://solana.com/docs/references/clusters

- Die neue zusätzliche 3er-Batch-Frequenz hat bewusst ein kleines eigenes Budget. Bestehende Quellen können Rate Limits, unterschiedliche Caches und widersprüchliche Poolreserven besitzen; bei Konflikt wird nicht gehandelt.

## Nachgewiesene Tests
- Linux: `node --test runner/*.test.mjs`
- Windows: `runner/live-pool-readback.test.mjs`, `runner/readback-batch.test.mjs`, `runner/readback-history.test.mjs`, `runner/readback-public-bridge.test.mjs`, `runner/signed-research-quorum.test.mjs`
- Echter lokaler Node-Server-Boot mit deaktiviertem Netzwerk und separatem Testkonto sowie Windows-Supervisor/DPAPI-Selbsttest; kein persönlicher Laptop.
- Public-GitHub-Publisher-Test: lokale gefälschte GitHub-Antworten; er verhindert das Veröffentlichen unerlaubter Privatfelder. **Das ist kein Beweis einer tatsächlichen Zustellung an GitHub**.
- Ein separater einmaliger, rein lesender GitHub-Action-Webprobe kann je nach Netz/API `IDENTITY_MATCHED`, `UNVERIFIED` oder `INCONCLUSIVE` ausgeben; diese Ergebnisse niemals als Contract-PASS oder Kaufprofit missdeuten.

## Noch zu bauen, bevor ein neuer Memecoin automatisch gekauft werden dürfte
1. Nachgewiesene **echte** Signaturen und Rollenreviews aus dem bestehenden Dot-Netzwerk samt unabhängigem Risk-Controller und gegen die Quelltexte validierten Beweis-Hashes.
2. Direkte On-chain RPC-Abfragen und Chain-spezifische Contract-/Mint-/Freeze-/Blacklist-/LP-/Holder-/Tax-Prüfungen; für risikoreiche Eigenschaften gilt **UNKNOWN ist nicht PASS**.
3. Sichere, tatsächlich ausführbare **betragsabhängige** Kauf- und Verkaufsquotes/Exits, bei Bedarf routes mit Slippage-/Gas-/MEV- und Rollback-Prüfung. **Indikative USD-Poolpreise sind nicht ausführbar.**
4. Integrationsstufe für signierte Quorum-Bundles + konkrete Risk-Attestations + lokale Quote-Engine zum eigenständigen Paper-BUY/SELL mit idempotenten Order-Receipts, ohne Remote-Zugriff auf fremde Guthaben.
5. Vollständige as-of historische Rücktests einschließlich zeitgleicher Fehlstarts, falscher Coins und nie verkaufbarer Positionen; 17-Tage-Chancen erst nach Holdout-Kalibrierung.
6. Echter Windows-Laptop-24/7-Test mit neuer Version, aktiver Forschungsrückübertragung, GitHub-Readback und Empfangsquittung – keine Prognosen oder Fills ohne konkrete Testbelege.

## Status der derzeit laufenden V0.9
Das bisher installierte V0.9-ZIP besitzt diese neueren Funktionen **noch nicht**. Der laufende Bot bleibt unverändert, bis die neue Version bewusst heruntergeladen, unter Sicherung des lokalen Paper-Datenordners geprüft und gestartet wird.
