# V0.9.2 – Solana-Mint-Rechte und erklärbare Kandidatenakten
Stand: 10.11.2026; Branch `codex/v09-solana-mint-risk-gates-20261110`, PR #18 (Draft). Keine Echtgeldzahlungen, keine autonomen realen Paper-/Live-Orders.

## Technisch neue, echte Beobachtung
- `runner/onchain-existence-readback.mjs` fragt bisher öffentliche Solana-Mint-/Pool-Konten via `getAccountInfo`. Neu wird beim Mint die **82-Byte-Datenscheibe** abgefragt, statt alle Daten auf 0 Byte zu beschränken. Das Poolkonto bleibt bei 0 Byte, um Bandbreite zu sparen.
- `runner/solana-mint-risk.mjs` decodiert den öffentlichen, von Solana definierten SPL-Token-**Mint-Header**: Mint-Authority (4-Byte COption-Tag + 32-Byte Pubkey), aktuelle Supply (u64), Decimals, Initialized und Freeze-Authority (zweites 4-Byte COption). Es werden **keine** privaten Schlüssel erstellt oder übertragen.
- Ausschließlich die tatsächlichen Program-Owner `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` (klassisch) bzw. `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` (Token-2022) werden anerkannt. Defekte, verkürzte oder falsche Daten: `UNKNOWN`.
- **RETAINED** bei Mint-Authority bedeutet: Es kann weiterhin eine Nachpräge-Berechtigung bestehen. **RETAINED** bei Freeze-Authority bedeutet: Token-Konten können gegebenenfalls eingefroren werden. Beide sind Warnsignale, nicht automatisch nachgewiesener Betrug.
- **REVOKED** bedeutet: Das jeweilige Recht ist nach den vorliegenden Account-Bytes nicht mehr gesetzt. Das ist **kein** Nachweis sicherer Liquidität, unmanipulierter Nachfrage, fehlender Token-2022-Extensions, einer realisierbaren Verkaufsroute oder genereller Contract-Sicherheit.
- Für **Token-2022** werden zusätzliche Transfer-Fees, Transfer-Hooks, Freeze- und andere Extensions derzeit **nicht** vollständig untersucht; daher immer `extension_audit:REQUIRED` und `observed_risk:CAUTION`. Das Signal ist keine Kaufempfehlung.

## Von den Dots zu den sichtbaren Sperrgründen
- `runner/readback-public-bridge.mjs` gibt ausschließlich `solana_mint_program`, `solana_mint_authority`, `solana_freeze_authority` und `solana_mint_header_risk` als streng gefilterte, **nicht handelbare** Forschungsfakten an den bereits vorhandenen optionalen GitHub-Publisher.
- `runner/research-market-publisher.mjs` erzwingt dafür eine exakte Whitelist und verhindert zusätzliche Keys, falsche `PASS`-Signale und die Umdeutung einer Token-2022-Extension zu sicher.
- `runner/candidate-dossiers.mjs` erzeugt pro Kandidat eine prüfbare **Entscheidungsakte**: Anzahl der nur *erwähnenden* Dots, fehlende echte signierte YES-Stimmen, Pool-Abgleich, Existenzprüfung, Mint-/Freeze-Warnungen und für jeden blockierten Kauf konkrete offene Prüfungen.
- Der lokale Windows-Server stellt `GET /api/v09/dossiers` bereit, und das Dashboard **V0.9 · Systemprüfung** zeigt die ersten drei Entscheidungsakten.
- Jede Akte bleibt `decision:BLOCKED`, `paper_entry_authorized:false`, `objective_risk_pass:false`, `executable_sell_quote:false`. **5 öffentliche Forschungsberichte sind keine 5 gültigen signierten Freigaben.**
- Keine Änderung am Paper-Guthaben durch diese Features, keine Änderung an `main` oder Hixton, keine Seed-Phrasen im Repository, kein Zugriff auf PayPal.

## Quellen
- Solana SPL-Mint-Aufbau: https://solana.com/docs/tokens/basics/create-mint
- Solana Account-RPC: https://solana.com/de/docs/rpc/http/getaccountinfo
- Solana Token-2022-Erweiterungen: https://github.com/solana-labs/solana-program-library/blob/master/docs/src/token-2022.md

## Abnahme / Noch offen
Die Softwaretests laufen in GitHub Actions auf Linux und Windows. Ein dort durchgeführter read-only RPC-Quellentest ist **keine** Abnahme auf dem privaten Laptop und **kein** Kauf-/Verkaufsnachweis. Der wirklich autonome Paper-Trade erfordert weiterhin unabhängige Contract-/LP-/Holder- und Honeypot-Prüfungen, signierte aus dem tatsächlichen Dot-Prozess stammende Belege, reproduzierbare zeitgerechte Quellen und gültige betragsabhängige echte BUY/SELL-Quoten mit Verkaufsfähigkeit. Die Testinstrumente dürfen diese Nachweise nicht synthetisch vortäuschen.
