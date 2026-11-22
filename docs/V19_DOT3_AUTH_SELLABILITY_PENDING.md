# R29 V1.9 – D3-04 / D3-05: Sicherheitsbausteine, noch NICHT abgenommen

**22.11.2026 · Branch `codex/r29-cleanroom-paper-20261121`.**

## D3-04 – Order-Signatur + GitHub-Risikodokument (TEILIMPLEMENTIERT)

`src/v19-dot3-authenticated-gate.mjs` führt im bestehenden System eine zusätzliche Prüfung durch, die keine zweite Trading-Strategie erzeugt:

- Jede PAPER-Order verweist auf **zwei per Git-Blob-SHA gebundene** JSON-Dateien unter `research/risk/bindings/` und `research/risk/attestations/`. GitHubTransport.read prüft die echte Blob-Identität vor dem Verarbeiten. Wer nur `dots:['dot-3-risk']` in eine Order schreibt, wird abgewiesen.
- Die Bindung signiert per **Ed25519** einen kanonischen, versionsgebundenen Datensatz mit Order-ID, BUY/SELL, Chain, Contract, Pool/Pool-Art, unveränderlichem Risikodokument-SHA, Ausstellungs- und Ablaufzeit (höchstens fünf Minuten).
- Der Public-Key wird ausschließlich aus einer **externen vertrauenswürdigen lokalen Konfiguration** (`R29_DOT3_TRUSTED_PUBLIC_KEY_PEM` und `R29_DOT3_TRUSTED_KEY_ID`) verwendet. **Kein privater Schlüssel** wird im Repository gespeichert. Ein vom Auftrag selbst gelieferter Public-Key kann Vertrauen nicht ersetzen. Ohne echten festgelegten Issuer bleibt die Prüfung geschlossen.
- `src/runner.mjs` validiert **vor `settlePaper`**, `src/publisher.mjs` **vor dem Schreiben in `signals/orders/`**. Beide sind **fail-closed**: Selbst eine korrekt signierte Selbstbehauptung über Sicherheit/Sellability ergibt `SIGNED_RISK_PACKET_RESEARCH_ONLY` und ausdrücklich **`trade_authorized:false`**. Der aktuelle Code löst daher keine neuen PAPER-Orders aus (weder BUY noch SELL). Eine spätere EXIT-Sonderpolitik für **bereits offene** Paper-Positionen ist zusammen mit D4-08 sicher zu spezifizieren.

**Tests:** `test/v19-dot3-authenticated-gate.test.mjs` enthält sieben Node-Tests inklusive echter Ed25519-Schlüssel im Testprozess, Missbrauch fremder Keys, abgelaufener Bindung, manipuliertem Order-/Risiko-SHA und Publisher-Verweigerung ohne Schreibzugriff. Zusätzlich **8/8 isolierte Struktur-/Fail-Closed-Prüfungen** ausgeführt; diese letzteren verwendeten einen **Mock-Verifier** und zählen **nicht** als ausgeführte kryptografische Ed25519-Integration. Die vollständigen echten Node-/Actions-Tests sind noch **offen**.

**D3-04 bleibt offen**, bis ein echter vertrauenswürdiger Issuer/Workflow mit festgelegter Key-Lifecycle-Politik, Source-Proofs und vollständiger Node-/CI-Abnahme etabliert ist. Signatur beweist nur *wer eine Aussage signiert hat*, nicht, dass ein Pool sicher/verkaufbar ist.

## D3-05 – Sellability und Honeypot-Risiko (TEILIMPLEMENTIERT)

`src/v19-dot3-sellability.mjs` wird von der **gleichen** Dot3-Statusmaschine `src/v19-dot3-risk-status.mjs` für Live-Paper und Historical-As-of verwendet. Alle Daten sind indikative **Research-Beobachtungen**, keine echte RPC-Simulation:

- **EVM-Chains:** Ethereum, Base, BSC, Robinhood und Cronos: Token-Transfer, exakte Buy-/Sell-Route, Owner/Upgrade-Privilegien, Steuern und Blacklist-Risiken getrennt prüfen.
- **Solana:** SPL-Mint-/Freeze-Autoritäten, Tokenprogramm einschließlich Token-2022-Hooks, exakte Pool-Verkaufsroute und tatsächliche `simulateTransaction`-Quelle als Nachweis erforderlich.
- Fehlende Daten → `DATA_GAP`; Warnsignale wie fehlgeschlagene SELL-Route, extreme Steuer oder Freeze-Authority → `WATCH` mit Nachprüfung. Kein dauerhafter `REJECTED` nur wegen unbestätigter Provider-Flags.
- Vollständige **synthetische** Eingaben erzeugen höchstens `SYNTHETIC_POSSIBLE_SELLABILITY`. Ein Live-BUY wird **nie** freigegeben; Quelle, erwartete Route, Chain-Zeit und echter On-Chain-Proof fehlen.

**Tests:** `test/v19-dot3-sellability.test.mjs` enthält sechs Node-Regressionsfälle; **9/9 isolierte Funktionskontrollen bestanden**. Keine wirklichen privaten oder öffentlichen RPC-/DEX-Transaktionen oder Chain-weiten Live-Tests ausgeführt.

**D3-05 bleibt offen**, bis ein tatsächlicher Anbieter/RPC-Beleg mit echtem Sell-Routing, dynamischer Tax/Slippage-Einschätzung und unabhängiger Byte-/Issuer-Provenienz archiviert und als as-of gültig nachgewiesen wurde.

## Unverändert

Nur `codex/r29-cleanroom-paper-20261121`, keine neuen Dots, keine Aktivierung der fünf bestehenden Dots, kein `main`, keine Echtgeldtransaktionen und kein Zugriff auf das alte Windows-Paper-Konto. Diese dokumentierten Teile sind weder positive reale BUY-Eignung noch ein erfolgreich abgeschlossener Oktober-PnL-Backtest.
