# R29 V1.9 – D2-06: V4-Pool-ID-Regressionsabnahme an Originalcaptures

**Stand:** 22.11.2026 · **Branch:** `codex/r29-cleanroom-paper-20261121` · **Status:** COMPLETE (targeted), vollständige Node-/Actions-End-to-End-Abnahme separat offen.

## Nachgewiesene eigentliche Ursache

In `src/live-pool-discovery.mjs` wurde der GeckoTerminal-API-Netzwerkslug (`eth`, `cro`) irrtümlich zugleich als Bestandteil der **DEX-Beziehungs-ID** verwendet. Auf Ethereum erwartete der Parser daher `uniswap-v4-eth`, während die originale Gecko-Antwort eindeutig `relationships.dex.data.id: "uniswap-v4-ethereum"` enthält. Die gemeldete `attributes.address` dieser V4-Pools ist eine **32-Byte-Pool-ID**, keine 20-Byte-Pool-Vertragsadresse.

**Sicherheitsrelevante Korrektur:** Die V4-Kennung wird nur bei passendem kanonischen Chain-/DEX-Bezeichner und exakt 32-Byte-Pool-ID gesetzt (`uniswap-v4-${chain}`). Die Gecko-HTTP-Netzwerk-Slugs (`eth`, `cro`) bleiben bei API-Pfaden erhalten, werden aber **nicht** für den V4-DEX-Namen verwendet. Der Contract wird weiterhin ausschließlich aus `relationships.base_token` und dem verknüpften `included`-Objekt gelesen, niemals aus dem 32-Byte-Pool-Identifier. Ein fingiertes `uniswap-v4-eth` wird nicht als echte Ethereum-V4-DEX-ID anerkannt.

## Reproduzierbare Originalquelle

`research/feeds/2026-11-22/45002280249/gecko-ethereum-page3.raw.json`

`research/feeds/2026-11-22/45002280249/evidence.json`

- Originalbeleg: **22.11.2026, 08:19:45.239 UTC**, öffentliche GeckoTerminal-Antwort, Ethereum, **Seite 3**, 20 ursprüngliche Quellzeilen.
- HTTP-Archiv-SHA-256: `3ddf82cda515d3001aeb4ed6312a926ba19e213f2f91918b211bb3ecee3788c2`. Der Wert wurde mit einem eigenständigen SHA-256-Algorithmus nochmals aus den geladenen GitHub-Originalbytes berechnet und stimmt **exakt** überein; Byteanzahl ebenfalls **34.888 / 34.888**. SHA prüft Dateiidentität, nicht unabhängig die vom Provider behauptete ursprüngliche Uhrzeit oder spätere Handelbarkeit.
- **Damals archivierter fehlerhafter Decoderbericht:** 2 akzeptiert, 18 unter `POOL_ADDRESS_MISSING_OR_INVALID` abgewiesen, sämtliche 18 mit `dex_id=uniswap-v4-ethereum`.
- **Jetzt reproduzierbare Neuverarbeitung derselben unveränderten Rohantwort:** 20/20 akzeptierte Pool-IDs, **18 korrekt als `UNISWAP_V4_POOL_ID`**, 2 andere EVM-Pools, **20/20 gültige separate Token-Contracts**, 0 Parser-Rejects.
- `src/v18-archived-v4-recovery.mjs` reproduziert den Unterschied als **18 spätere Re-Indexierungen des Originalcaptures**, ausdrücklich `original_dot2_discovery_verified:false` und `trade_authorized:false`; niemals als tatsächlich damals durch Dot2 verarbeitete Kandidaten umetikettieren.

**Unabhängige Base-Gegenkontrolle:** Original `research/feeds/2026-11-22/44997708364/gecko-base-page3.raw.json`; fehlerhafter Archivbericht 9 akzeptiert, 11 V4 abgewiesen; neuer Decoder weiterhin **20/20**, 11 V4, 9 Standard-Pools, 20 separate Token-Contracts. Der Ethereum-Fix beschädigt also nicht die bereits funktionierende Base-V4-Erkennung.

## Anbindung an EIN System

Die neu abgeleiteten Ethereum-Originaldaten wurden **rein lesend** in den existierenden Rechenpfad eingebracht:

```text
Verifizierte archivierte Rohdaten (22.11.)
  -> decodeGeckoNewPools (20/20, 18 V4 getypt)
  -> mergeMemory (alter Bestand 2 + archivierte 18 => 20 eindeutige Pools)
  -> makeResearchHandoff (20, Typ UNISWAP_V4_POOL_ID erhalten)
  -> summarizeDot3RiskStatuses (20 zur Risikoforschung; kein real PAPER_ELIGIBLE)
  -> buildDot5DiscoveryLedger (20 identifizierbare Forschungseinträge)
  -> planHotFairRechecks (20 beobachtet, 6 für limitierte Nachprüfung ausgewählt,
                         14 verbleiben sichtbar im Forschungsbacklog)
```

Zur durchgängigen Typ-Erhaltung wurde auch `src/v19-dot3-risk-status.mjs` korrigiert: Der Risikostatus enthält jetzt `pool_kind`, statt V4 auf eine ungekennzeichnete Adresse zurückzustufen. Alle Erkennungs- und Prüfschritte bleiben **RESEARCH_ONLY**. Bei fehlender unabhängiger Dex-Quote, Sellability oder bestätigter Providerzeit bleibt `WATCH`/`DATA_GAP`; null echte GPT-/Paper-Trades.

## Tests und klare Grenzen

- **22/22 gezielte isolierte End-to-End-Funktionskontrollen** bestanden: Original 2→20, 18 getypte V4, 20 Contracts, Speicherindex 2+18=20, deduplizierte Warteschlange, 20 Dot2-/Dot3-/Dot5-Datensätze ohne Trade-Freigabe.
- Eigenständiger SHA-256-Gegenvergleich der GitHub-Originalbytes bestand inklusive `abc`-Selbsttest; 34.888 Bytes wie protokolliert.
- Base-V4-Gegenkontrolle 9→20 mit 11 V4 ebenfalls bestanden.
- `test/v19-ethereum-v4-original-capture.test.mjs`: **7 zusätzliche echte Node-22-Regressionsfälle im GitHub-Branch eingecheckt**, darunter unveränderliches HTTP-Archiv, 20er Decoder, Rückwärtskompatibilität Speicher, vollständiger Dot2→Dot3→Dot5-Researchpfad und Negativfall mit falscher V4-DEX-ID. **Ein vollständiges `npm test` oder GitHub-Actions-Green für diese neue Testdatei konnte bislang NICHT nachgewiesen werden**. Die isolierte Integrationsausführung verwendete einen Mock nur für `createHash` im Dot5-Event-ID-Test; Original-SHA-256 wurde hiervon unabhängig echt berechnet.

**Nicht bewiesen:** Vollständigkeit aller Seiten und Chains (D2-01/02), ob diese 18 Coins brauchbar waren, verifizierbare Preise/Handelsrouten (D3-03/04/05), Oktober-Originalerkennung, tatsächliche GPT-Entscheidungen oder bestätigte Paper-Orders. Originale GitHub-Quellen und alte `evidence.json`-Zähler bleiben unverändert als Fehlerbeweis erhalten; es wurde keine historische Forschungsdatei überschrieben.

**Zähler nach dieser gezielten Code-/Regressionsabnahme: 24/61 = 39,3 %, 37 offen.** Alle Dots pausiert, ausschließlich Cleanroom, kein Echtgeld/`main`/Legacy-/Windows-Paper-Eingriff.
