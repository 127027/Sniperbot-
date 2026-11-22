# R29 V1.9 – D3-02: Zwei Quellen sind nicht automatisch unabhängig

**Datum:** 22.11.2026 · **Branch:** `codex/r29-cleanroom-paper-20261121` · **Status:** COMPLETE (targeted); End-to-End-/Provider-Nachweis weiter offen.

## Einbindung in das **eine** System

```
Dot 2: gecapturete Gecko-/DEX-Pooldaten (mit Original-Abrufzeit)
 → src/feed-handoff.mjs (source_observations; keine erfundenen Zeitstempel)
 → src/v19-dot3-source-pairs.mjs (Chain/Contract/Pool/Domain/Upstream)
 → src/v19-dot3-risk-status.mjs (identisch in LIVE_PAPER und HISTORICAL_ASOF)
 → src/v19-dot3-recheck-scheduler.mjs (fehlende Daten und nächste Aktion)
 → Dot 4: unverändert, **keine Order-Autorisierung**
```

Die Kette ist ausschließlich Research/Shadow, bis D3-03 bis D3-05 mit verifizierten tatsächlichen Belegen fertiggestellt sind. Einem `PAPER_ELIGIBLE`-Modellzustand ist kein echtes `trade_authorized` zugeordnet.

## Was technisch geprüft wird

- **Sechs Chains:** Solana, Ethereum, Base, BNB Chain (bsc), Robinhood Chain, Cronos. Für GeckoTerminal und DEX Screener werden pro Chain **API-Probe-Pfade** ausgegeben. Ein ausgegebener Endpoint ist **keine Behauptung**, dass er heute für diese Chain tatsächlich Daten liefert. Nicht unterstützte Quelle bedeutet DATA_GAP/Retry, kein pauschales Chain-Verbot.
- **Eindeutiger Pool:** Jeder Anbieter muss exakt dieselbe Chain, denselben Pool und denselben Token-Contract benennen. Doppelte Antworten derselben Domain zählen **einfach**.
- **Zwei Domains:** GeckoTerminal + DEX Screener kann einen `TWO_DOMAIN_INDICATIVE_ONLY`-Forschungsstatus ergeben. Es beweist weder unabhängigen gemeinsamen bzw. unterschiedlichen **Upstream**, noch einen handelbaren DEX-Preis.
- **Unabhängiger Upstream:** Bei gleicher berichteter Upstream-ID wird `SAME_REPORTED_UPSTREAM` mit neuem Nachprüfungsauftrag dokumentiert. Bei fehlenden oder unterschiedlichen IDs bleibt `real_upstream_independence_proven:false`, weil eine selbst gemeldete ID kein externer Beleg ist.
- **Zeitbezug:** `captured_at_utc` ist der Zeitpunkt des HTTP-Abrufs. `provider_quote_asof_utc` bleibt `null`, solange der Provider keine unabhängig überprüfbare Quotierungszeit liefert; keine Rückdatierung. Ein alter/future Capture wird ausgeschieden.
- **Risiko/Abweichungen:** Mehr als 3 % indikative Preisdivergenz, unter 5.000 USDC beobachtete Liquidität oder erkennbar gleicher Upstream führen in die nachzuprüfende Risiko-/WATCH-Klasse. Der Betrag von 5.000 USDC ist die bestehende starre Referenz; die spätere Risikorechnung D3-06 ist **nicht** vorweggenommen.

## Gezielte Regression und Grenzen

- `test/v19-dot3-source-pairs.test.mjs` (7 Node-Testfälle): Chain-Matrix, Domain-/Upstream-Unterscheidung, exakte Identität, 429-indirekte Datenlücke, Quelle in Zukunft, Preis-/Liquiditätskonflikt.
- `test/v19-dot3-source-pair-handoff.test.mjs` (3 Node-Testfälle): tatsächliche Übergabestruktur aus dem bestehenden Dot2-Format, kein fingierter Providerzeitstempel, identischer Dot3-Status und konkreter Recheck.
- Zusätzliche **21 isolierte Funktionskontrollen bestanden** (11 Source-/Handoff-Prüfungen + 10 Recheck-/Handoff-Gegenkontrollen). **Die vollständige `npm test`-/GitHub-Actions-Suite wurde dadurch nicht nachgewiesen.** Die bisher geprüften Werte sind synthetische Struktursamples, kein neuer Public-API-Durchlauf.

**Offen:** tatsächliche zweifache unabhängige Source-/Upstream-Verifikation, separate Provider-Quotezeit im Originalcapture (D3-03), authentischer Risikobeleg (D3-04), Sellability und Chain-Security-Belege (D3-05) sowie echte Endpoint-/Chain-Kompatibilität (D2-01). Null echte Paper-Orders; Dots pausiert.
