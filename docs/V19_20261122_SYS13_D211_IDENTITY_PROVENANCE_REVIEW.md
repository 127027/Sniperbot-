# R29 V1.9 – SYS-13 + D2-11: Pool-/Token-Identität und zeitgerechte Quellprovenienz

**Prüftag:** 22.11.2026 · **Branch ausschließlich:** `codex/r29-cleanroom-paper-20261121` · **Repo:** `127027/Sniperbot-`. Ausgangsstand nach vorherigem API-Umbau: **10/61 PASS, 24/61 PARTIAL, 27/61 OPEN**, alte 50,8 % sind nur historische technisch bearbeitete Arbeitspakete.

## 1. Warum der Schritt API- und Datenverlustprobleme konkret reduziert

Der aktuelle unveränderte GitHub-Originalindex `research/state/market-memory.json` enthält **409 Pools auf sechs Chains**, davon **61 mit Uniswap-V4-Pool-ID** (32 Byte). Die Provider APIs benutzen teils Aliase wie BNB/bsc, eth/ethereum, cro/cronos und robinhoodchain/robinhood. Symbole sind **nicht** eindeutig; verschiedene Pools können denselben Token enthalten; derselbe Pool mit widersprechender Tokenadresse muss im Research sichtbar bleiben, ohne falsche Trade-Freigabe.

Zusätzlich muss unterschieden werden zwischen:
- **`original_pool_created_at_utc`**: vom externen Provider behauptetes Pool-Erstellungsdatum;
- **`observed_at_utc`**: tatsächlicher Zeitpunkt eines empfangenen/archivierten HTTP-Snapshots, unabhängig davon ob der Decoder den Pool damals erkannte;
- **`first_dot2_detected_at_utc`**: erstmals im tatsächlichen Dot2-Capture verarbeitete Pool-ID – NICHT bloß später rekonstruierter alter HTTP-Eingang;
- **`first_archive_reconstructed_at_utc`**: Zeitpunkt, zu dem alte API-Rohbytes bei einer späteren Code-Reparatur retrospektiv ausgewertet wurden.

**Keine Rückdatierung:** Die im originalen November-API-Rohtext enthaltenen, wegen Parserfehlern zunächst verworfenen V4-Pools dürfen nicht behaupten, Dot2 hätte sie damals tatsächlich erkannt. `reconstructedAtUtc` wird beim bestehenden archivierten V4-Recovery im selben Runner gesetzt. Verweis auf Rohdaten ist keine unabhängige Quellzeitattestierung, kein aktueller Trade-Kurs und kein Kaufrecht.

## 2. SYS-13 – ORIGINAL-AKZEPTANZ: PASS

**Originaltext:** „Canonical Chain+Contract+Typed Pool, eindeutiger Pool- und Token-Schlüssel (Mehrfachpools), historische Migration ohne Neubewertung“ und „V4 32-byte, Solana, Robinhood, BNB, doppelte Symbole und Konflikte getestet“.

Neue pure Datei `src/v19-canonical-market-identity.mjs`:
- Canonical Chain Aliases; EVM-Contract-Adressen und 20-Byte-Pools lowercase, Solana-Base58 case-sensitive.
- Separate typisierte Pool-ID `<chain>|<pool_kind>|<normalized_pool>` und Token-ID `<chain>|TOKEN|<normalized_contract>`.
- 32-Byte-`UNISWAP_V4_POOL_ID` niemals als 20-Byte-Pool oder Token interpretieren; fehlerhafte V4-Tags als ungültig markieren statt still umetikettieren.
- Zwei Pools desselben Tokens erhalten unterschiedliche Pool-Keys aber denselben Token-Key; doppelte Symbole spielen keine Identitätsrolle.
- Bei unterschiedlichem Tokencontract für denselben Pool **`token_identity_key=null` / `CONFLICT`** und protokollierte mögliche Token-Keys; Alias-Kollisionen werden quarantänisiert, nicht zusammengeführt.
- Die **originalen Legacy-Mapkeys**, `source_refs`, `snapshot`, Erstbeobachtung, letzte Beobachtung, `checkpoints`, `rechecks` und `ingested_sources` werden weder gelöscht noch neu sortiert. `historical_trade_decisions_recomputed:0`.
- In `scripts/cloud-discovery-runner.mjs` wird diese **additive** Migration beim nächsten tatsächlich gestarteten Capture vor der persistierten JSON-Ausgabe aufgerufen. Die vorhandene `research/state/market-memory.json` wurde für die Prüfung **NICHT** überschrieben.

Testdatei: `test/v19-sys13-canonical-identity.test.mjs`. **7 neue Tests inklusive vollständigem echten 409-Pool-Index, aller 61 V4-IDs, Fake-Kollisionen, Token-Konflikten, Solana-Case, BNB- und Robinhood-Alias sowie idempotenter Migration.** Exakt dieselbe FAIR-Queue vor/nach Migration.

**Abnahmeentscheidung:** SYS-13 `OPEN → PASS` (ursprüngliche Software-Kriterien vollständig nachgewiesen; keine Behauptung einer externen/realen Onchain-Contract-Attestierung).

## 3. D2-11 – ORIGINAL-AKZEPTANZ: PASS für Quellindex und Zeitunterscheidung

**Originaltext:** „Pro Quelle Full-page + Immutable-Beobachtungs-Index mit `discovered_at` vs `observed_at`“ und „First seen by Dot2 getrennt von Pool created und Rekonstruiert“.

`src/market-memory.mjs::mergeMemory` erhält *additive* Indexfelder und Belegattribute:
- `source_refs[].source_class` `LIVE_DOT2_CAPTURE` / `ARCHIVED_RAW_RECONSTRUCTION` / `DERIVED_OR_LEGACY_IMPORT` einschließlich unverändertem Originalpfad, Zeit, SHA, Quellseite und Original-Zeilenindex, wenn vorhanden;
- `first_original_pool_created_at_utc` kann vor Originalcapture liegen; Zukunftstimestamps werden **nicht** akzeptiert;
- `first_dot2_detected_at_utc` + `first_dot2_detected_source_path` nur bei tatsächlichem `GECKOTERMINAL`-/`TRENDING`-Capture mit `fetchStatus=OK` und einem `research/feeds/`-Quellpfad;
- `first_archive_reconstructed_at_utc` + Rekonstruktionspfad nur bei expliziter gültiger, späterer `reconstructedAtUtc`; die Quelle erhält **nie** durch Retrodaten eine künstliche frühere Dot2-Erkennung;
- Legacy-Journal-Importe erzeugen keine Live-Dot2-Entdeckung; ursprüngliches `first_seen_at_utc` bleibt aus Kompatibilitätsgründen erhalten und wird **nicht** als Dot2-Beweis umetikettiert.

Vollständige API-Seiten und Rohantworten bleiben in den vorhandenen unveränderlichen `research/feeds/<date>/<run>/gecko-<chain>-page*.raw.json`-Dateien; `research/state/page-coverage.json` verzeichnet die Seiten-Cursor inkl. Fehler/Deferred; zusätzlich erhält jede gespeicherte Pool-Referenz Quellseite, Zeile und Quellklassifikation. Diese getrennten Original-/Index-Ebenen dürfen niemals als 100-%-Marktdeckung interpretiert werden.

Testdatei: `test/v19-d211-provenance-timestamps.test.mjs`. **5 neue Tests**, einschließlich Wiederherstellung aus den *echten* GitHub-Originalrohbytes `research/feeds/2026-11-22/44997708364/gecko-base-page3.raw.json`, falscher rückdatierter Rekonstruktion, Legacy-Journal-Quarantäne und unveränderten 409 Marktindexeinträgen.

**Abnahmeentscheidung:** D2-11 `OPEN → PASS` für die geforderte zeitliche Trennung und Full-Page-/Source-Row-Indexierung. Ältere 409 Legacy-Einträge werden absichtlich **nicht** ohne belegten neuen Live-Capture rückwirkend mit einem erfundenen `first_dot2_detected_at_utc` gefüllt.

## 4. Verifizierte CI und Status

**GitHub Node22 Test-only:** [#45050581906](https://github.com/127027/Sniperbot-/actions/runs/45050581906), Source-Code-SHA `b2b29f8431205f5691bc05f43e7c52f7c92598ad`, **498/498 PASS, 0 FAIL**. Die zugehörigen Paper-/Signal-Check-Tests sind in der bestehenden CI enthalten; keine echten Order-Inserts. Code-Wirkung außerhalb synthetischem Test/Snapshot-Migration bleibt zunächst prospektiv zu prüfen. Keine echten neuen API-Requests oder Dot-Trading-Ausführungen durch diesen Umbau. Echtgeld, main, Legacy und Windows-Paper-State bleiben unangetastet.

**NEUER STRENGER AKZEPTANZSTAND:** **12/61 = 19,7 % PASS, 24/61 = 39,3 % PARTIAL, 25/61 = 41,0 % OPEN**. Bereits **36/61 = 59,0 %** Aufgaben mit technischem Code/Tests begonnen oder abgenommen, aber die 59 % dürfen **NICHT** als vollständige Abnahme genannt werden.

## 5. Noch fehlende echte Betriebsbeweise (nicht als PASS hochstufen)

- `SYS-11` und `QA-03` verbleiben `PARTIAL`: Der neu eingeführte persistente API-Limiter wurde noch **nicht** in zwei tatsächlichen aufeinanderfolgenden GitHub-Provider-Captures verifiziert. Letzter echter GeckoTerminal-429-Backoff war bis **2026-11-22T18:31:56.465Z** gesperrt. Niemals vor Ablauf erneut abrufen.
- `D1-04` bleibt `PARTIAL`: 5/15/30/60-Minuten-Sampling ist nur Research-Advice; die fünf bestehenden ChatGPT-Dots bleiben pausiert, und es gibt keinen selbstständig aktiven 24/7-Scan.
- `D2-02` weiterhin `PARTIAL`: Bewegliche API-Seiten können zwischen Aufrufen überspringen; beobachtete Seite + Hash ist nicht das gesamte Marktuniversum.
- `D3`-/`D4`-Kaufpfade bleiben fail-closed: keine unabhängigen frischen Sellability-/Issuer-/Executable-Quote-Attestierungen, keine tatsächlichen Windows-Paper-Fills und kein Echtgeld.

**Nächste Priorität:** Einen vorsichtigen echt bestätigten API-Mehrlauf abseits bestehender Provider-429-Sperren verifizieren, ohne aus hypothetischen 429-/Dauerlauf-Tests ein Live-Success-Signal zu machen. Danach echte Kurs-/Risk-Entscheidungsreife je Pool statt „marktweit 100 %“ prüfen.
