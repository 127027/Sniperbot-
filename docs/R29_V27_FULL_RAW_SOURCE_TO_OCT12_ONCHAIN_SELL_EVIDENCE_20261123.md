# R29 V2.7 – Vollständige neutrale Oktobermarktdaten mit tatsächlichen vier Original-Blockchain-Verkäufen verbunden

**Stand:** 23.11.2026, ca. 22:09 UTC. **Repository:** `127027/Sniperbot-`; **ausschließlich Branch:** `codex/r29-cleanroom-paper-20261121`. **Modus:** forensisches RESEARCH-ONLY / kein Windows-Client, keine neuen Orders, kein Echtgeld.

## 1. Verbindlicher Auftrag und gefundener Kreisfehler

Der Benutzer hat angewiesen: „Ok Mach das und notiere alles bei github“. Die aktuelle Priorität ist **nicht**, dieselben 192 Mints, dieselben 65 Gewinner oder stündliche 24-Tick-Modelldiagnosen immer wieder zu testen. Stattdessen ist die breite neutrale historische Candidate-Research-Population mit **prüfbaren historischen Quellenereignissen und realistischen BUY-/SELL-Sicherheitsbeweisen** zu verbinden. Der vollständige fünf-Dot-Oktober-Backtest bleibt ohne zeitgerechte Original-Providerlieferung und echte unabhängige 50-TEST-USDC-Quoten blockiert.

**Zuvor abgeschlossen:**
- [V2.6, vollständiger SHA-geprüfter Original-Rohdatenlauf #45272055484](https://github.com/127027/Sniperbot-/actions/runs/45272055484), Artefakt #14865617008: 11.10. **121.882** Parquet-Mint-/Feature-Zeilen, 12.10. **137.969**, zusammen **259.851**; 24 zeitlich begrenzte Research-Frames aus einem nachträglich veröffentlichten Solana-Provider. **30.181 verschiedene Solana-Mints um 00:00**, **63.890 um 23:00 UTC** in dieser zweitägigen Research-Quelle; nicht das gesamte Multichain-Universum.
- [V2.5, 176er HTTP-Gecko-Recherche #45266204458](https://github.com/127027/Sniperbot-/actions/runs/45266204458), tatsächlich **SUCCESS**: **176/176** noch offene neutrale Mints abgefragt, 173 zusätzlich heute mit exakten Pools verbunden, plus bisher 16 = **189/192** aktuell identifiziert, **3 UNKNOWN**. 176 × HTTP200, 0 × 429. Dieses Ergebnis ist **nur NOVEMBER-Quellenidentität** und kein Oktober-GPT-Backtest.
- Originale vier Blockchain-Transaktionen: [getTransaction V1 #45135625789](https://github.com/127027/Sniperbot-/actions/runs/45135625789), Artefakt #14798694515; tatsächliche Fremd-Verkaufs-/Token-2022-Transferprüfung [#45166769490](https://github.com/127027/Sniperbot-/actions/runs/45166769490), Artefakt #14815010884.

## 2. Neuer wirklicher Quellen-JOIN, in GitHub Actions ausgeführt

**[V2.7 source-/chain-evidence bridge #45276830073 – SUCCESS](https://github.com/127027/Sniperbot-/actions/runs/45276830073)**. Die exakt drei ursprünglichen archivierten Quellen wurden erneut mit Hashvalidierung gelesen:

| Originalquelle | Pin / Hash |
|---|---|
| V2.6 `final-audit.json` | SHA-256 `40c8578fb30537e5b0bb5c8396b10f53f022bf51593fdf2581d1b55c15eea532` |
| V2.6 komprimierte 24h-Population `neutral-oct12-full-feature-mint-visibility.json.gz` | SHA-256 `ad5defbfd86a3f230e0924b0feddd5ab6af592e4dee276570be6835e88c490e6` |
| Originale SellV2/V3-Audit-Rohantwort `sell-instructions.json` | SHA-256 `e88ca1d749bd502ff64d3e1b442f2c265bc5272dea2ab71678e22012a3ed0c25` |
| Vier tatsächliche Solana-v1-`getTransaction`-Antworten | Jede Rohdatei erneut exakt gegen ihren **individuellen Original-SHA-256 aus dem Sell-Audit** geprüft; zusätzlich Original-Signatur, Solana-Slot, Blockzeit, Pool-Account-Index, Token-2022-Mint-Owner-Account sowie die ursprünglichen ganzzahligen Token-/Lamport-Deltas rechnerisch erneut geprüft |

**Neue echte Dateien im Cleanroom:**
- `scripts/v27-bridge-neutral-raw-features-to-original-solana-sells.py`: vollständig neu geschriebener, extern read-only, ausschließlich gegen drei archivierte Quellen ausführbarer Verknüpfungs-/Forensikalgorithmus; **keine** Wiederverwendung des alten Trading-Bots.
- `test/v27-feature-chain-evidence-bridge.test.py`: **7/7 Unit-/Negativtests PASS**, darunter Zukunftsleck, falsche SHA, manipulierte SOL-Kontobewegung, Zeitmanipulation und exakte Poolidentität.
- `.github/workflows/cleanroom-v27-explicit-full-source-chain-sells-bridge.yml`: Single-Request-GitHub-Workflow mit nur `contents: read` und `actions: read`, drei Original-Artefakt-Downloads und unveränderlichem Ergebnis.
- `research/full-chain-bridge-requests/2026-11-23/r29-user-go-original-neutral-chain-bridge.json`: explizite isolierte Research-Freigabe für die tatsächliche Ausführung, Commit `65b897488ade7d23da723acb44fa6e9fe40bb047`.
- Ausführungs-Artefakt: **`r29-v27-three-source-neutral-onchain-bridge-45276830073`**, Artefakt-ID **14867317504**, maschinenlesbar `v27-source-chain-bridge-45276830073/join-report.json`.

**Tatsächliches CI-Ergebnis:** 24/24 Original-Research-Stunden gegen den vollständig bytegepinnten V2.6-Rohstand geprüft; **2/2** konkrete zuvor neutral ausgewählte Mints in den exakten Stundenframes vorhanden, **4/4** echte Solana-SellV2/V3-Transaktionen samt SHA, Signatur, Slot, Account- und Token-Bewegung erneut verifiziert; **0** neue BUY/SELL-Client-Orders und **0** authentifizierte originale GPT-Laufreceipts.

## 3. Exakte tatsächliche Zeitfolge des 12. Oktober 2026

| Münze (neutral, nicht Gewinnerliste) | Virtueller Scan UTC | 1. Rohfeature in V2.6-Rekonstruktion UTC | Letztes Feature vor Scan UTC | Zahl Rohfeature-Beobachtungen zum Scan | Erfolgreiche historische Drittverkäufe vor dem Scan |
|---|---|---|---|---:|---|
| **TANK** | **02:00:00** | **01:58:40.470** | **01:59:40.907** | **2** | **01:59:53** und **01:59:57**, 2× SellV2/V3 |
| **ARIANA** | **18:00:00** | **17:59:04.257** | **17:59:04.257** | **1** | **17:59:59** und **17:59:59**, 2× SellV3 |

- **TANK:** Mint `3nXL1jYC4rTL9hWnEYz1w4WkbbKceFmb5jxX7RL5pump`; Pool `CTemNiKyDcmqrYMB2EF6fp4LcRprYm7LeCBoM14228sT`. Zum simulierten Tick im größeren neutralen Raw-Archiv **32.660** verschiedene Solana-Mint-Adressen im kumulierten zweitägigen Research-Speicher. Beide echten Token-2022-Fremdverkäufe ergeben zusammen **2.023.999,627513 TANK in den Pool** und **0,061977686 native SOL aus dem Pool**.
- **ARIANA:** Mint `28FFbG2j5d5XGvyuLSdDixAgQnmN4YDZqmSVbbzJpump`; Pool `8TgpUYKfnG2UM43rFQMV9v3XRiciAqqDSp8BgXSBcq7P`. Zum simulierten Tick **54.293** verschiedene Solana-Mint-Adressen aus dem zweitägigen Raw-Research-Speicher. Die beiden echten Drittverkäufe ergeben zusammen **13.211.411,771910 ARIANA in den Pool** und **1,041658094 native SOL aus dem Pool**.
- Die vier konkreten **SOL-Pool-Kontodeltas pro Verkauf** ergeben eine berechenbare Beobachtungsrelation von abgeflossenen SOL pro eingegangenen Token. Der neue Bericht enthält diese Werte ausschließlich als **`observed_ratio_is_not_executable_quote: true`**. Es sind **KEINE SOL/USDC-Quoten, KEINE verifizierten Reserve-Kurven, KEINE tatsächlichen Bot-Exit-Preise**. Token-2022-Gebühren, Transfer-Hooks, Blacklist, Slippage, SOL/USD-Umrechnung und vollständiger Poolzustand sind nicht unabhängig geprüft.

**Verbindlicher Kausalitätsvorbehalt:** Ein im originalen Chainblock gespeichertes `block_time_utc` und ein in einem später veröffentlichten Feature-Archiv enthaltener früherer `t`-Zeitpunkt beweisen, dass die Chain-/Featurehistorie rekonstruierbar ist; sie beweisen **NICHT**, dass Dot2, Dot3 oder Dot4 das Signal, die finale Blockchain und den Handelskurs damals **vor** 02:00/18:00 vom jeweiligen Anbieter erhalten haben. Ein Source-Capture aus November darf nie auf Oktober zurückdatiert werden. Ein erfolgreicher Verkauf einer *anderen* Wallet beweist weder einen eigenen **50-USDC-BUY** noch einen für unseren Bot ausführbaren **50-USDC-SELL** zum nächsten Tick.

## 4. Evidenzstufen und noch fehlende Originalbeweise – keine weitere Schleife

| Evidenzstufe | TANK | ARIANA | Status |
|---|---|---|---|
| Neutrale Mint-ID in großer zeitbegrenzter Rohdatenrecherche, ohne Gewinner-Oracle | JA | JA | **In V2.7 verifiziert** |
| Exakte Blockchain-Pool-ID und fremde erfolgreiche Verkaufs-/Tokenbewegung mit Original-SHA | JA, 2 TX | JA, 2 TX | **In V2.7 erneut verifiziert** |
| Originale öffentliche Provider-Lieferung an GPT zum historischen Tick | NEIN | NEIN | **BLOCKER: Zeitpunkt der externen Bereitstellung** |
| Original unabhängige Issuer-/Mint-/Freeze-/Transfer-Hook-Sicherheit | NEIN | NEIN | **D3-04 BLOCKER** |
| Tatsächlicher kompletter Pool-/AMM-Reservestand und belastbarer Zwei-Wege-Quote zu 50 TEST-USDC einschließlich Slippage/Fees/FX | NEIN | NEIN | **D3-05 BLOCKER** |
| Die fünf original unabhängigen GPT-Journale, GitHub-Publisher- und Windows-Paper-Receipts | NEIN | NEIN | **QA-04 BLOCKER** |

**Original-Release-Gate unverändert:** **13/60** originale Non-Backtest-Kriterien PASS (**21,67 %**), **acht** externe Beweisblocker, `NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE`. V2.7 ist ein echter technischer und forensischer **Teilerfolg**, nicht ein bestandener Original-Backtest und keine errechnete historische PnL.

### Nächster sinnvoller Arbeitsschritt

**Nicht** erneut alle 192 Mints, 24 Takte oder dieselben Verkäufe recherchieren. Stattdessen eine Original-**BUY**-Transaktion für einen nicht rückblickend nach Gewinnern gewählten neutralen Pool samt Original-SHA, Token-2022-Mint-/Freeze-/Transfer-Hook-Parametern und zeitlich vollständigem Poolzustand prüfen, danach einen **realistisch skalierbaren Zwei-Wege-50-USDC-Quote-Check** entwickeln. Ein Dritt-BUY allein wird noch keinen eigenen 50-USDC-Fill beweisen; Daten müssen eventuell kostenpflichtig und bei fehlender Quelle `UNKNOWN` bleiben. Erst mit unabhängiger historischer Quoten-/Originalproviderzeit können Dot3/Dot4 konservativ Paper-Signale zulassen.

**Sicherheitsstatus:** kein Order-/Signal-Publishing, kein Zugriff auf User-Wallet oder Windows-Paper-Konto, keine Dot-Aktivierung, kein Branch-Merge auf `main`, keine kostenpflichtige API.
