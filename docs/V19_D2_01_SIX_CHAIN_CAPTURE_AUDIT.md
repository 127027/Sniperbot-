# R29 V1.9 – D2-01: Sechs-Chain-Abdeckung aus tatsächlich archivierten HTTP-Antworten

**Stand: 22. November 2026 · Branch: `codex/r29-cleanroom-paper-20261121`**

**Status: PARTIAL, NICHT als abgeschlossene Aufgabe zählen. Projektstand: 24/61 = 39,3 %, 37 offen.** D2-02 ist dagegen bereits **COMPLETE (targeted)** und darf **nicht** doppelt gezählt werden.

## 1. Was anhand echter, unveränderter Rohdateien nachgewiesen ist

Die 6 Referenzen in `research/audits/v19-six-chain-originals-2026-11-22.json` stammen aus dem bereits vorhandenen GitHub-Dot2-Marktspeicher. Jede `raw.json`-Datei und der zugehörige `evidence.json`-HTTP-Beleg wurden auf dem Cleanroom-Branch tatsächlich gelesen; **alle sechs** unabhängigen Neu-Berechnungen von HTTP-`SHA256` und Git-Blob-`SHA1` stimmen mit den separat über den GitHub-Connector gelesenen Originalreferenzen überein. Die Hash-Algorithmen wurden mit bekannten Testvektoren geprüft. Das beweist identische Archivbytes, **nicht** unabhängige Beglaubigung des behaupteten Abrufzeitpunkts.

| Chain | Original-HTTP-Erfassung (UTC) | Seite | Tatsächlich enthaltene Poolzeilen | Doppelter Byte-Hash |
| --- | --- | ---: | ---: | --- |
| BNB Chain (BSC) | 22.11. 03:18:32.933 | 1 | 20 | OK |
| Robinhood Chain | 22.11. 04:14:40.645 | 3 | 20 | OK |
| Cronos | 22.11. 05:11:26.161 | 3 | **0** | OK (leere Antwort) |
| Solana | 22.11. 06:16:51.739 | 3 | 20 | OK |
| Base | 22.11. 07:19:40.439 | 3 | 20 | OK |
| Ethereum | 22.11. 08:19:45.239 | 3 | 20 | OK |

Die tatsächlich nachgewiesene Spanne zwischen erster und letzter Antwort beträgt **301,21 Minuten** (~5 Stunden und 1 Minute). Die URL- und Seitenzuordnung ist mit den Archivdaten geprüft: Ethereum verwendet bei Gecko `eth`, Cronos `cro`, aber die kanonischen Chain-IDs heißen `ethereum` und `cronos`.

Im abgeschlossenen 24-Stunden-Fenster **21.11.2026 09:00 UTC bis 22.11.2026 09:00 UTC** liegen **6/6** verifizierte HTTP-Samples. Im konkret geprüften Fünf-Stunden-Fenster **22.11.2026 03:18–08:18 UTC** liegen hingegen **nur 5/6** (Ethereum fehlt). **Damit ist die Fünf-Stunden-Vorgabe gerade nicht nachgewiesen.**

Cronos lieferte ein gültiges HTTP 200 mit `data:[]`; das ist **erreichte API**, aber **kein beobachteter neuer Coin**. `HTTP 200` allein belegt weder globale Chain-Abdeckung, vollständiges Paging noch Kauffähigkeit. Diese sechs Quellen stammen außerdem aus **getrennten bestehenden Captures**, nicht aus einem nachweislich erfolgreichen **neuen** Multi-Chain-Runner-Durchlauf, und **nicht** aus dem Oktober-Warmup.

## 2. Nachgewiesener Fehler im archivierten UTF-8-Größenfeld

Der Original-Runner schrieb `raw_bytes_utf8:text.length`. Das misst bei Unicode-Token-Namen die **UTF-16-Zeicheneinheiten**, nicht die wirkliche UTF-8-Bytezahl. Die echten HTTP-Byte-Hashwerte sind vollständig konsistent, aber zwei historische Metadatenwerte waren zu klein:

| Chain | Altes `raw_bytes_utf8` | Echte neu berechnete UTF-8-Bytes |
| --- | ---: | ---: |
| BSC | 35.882 | **35.996** |
| Robinhood Chain | 37.055 | **37.063** |

Der Runner benutzt jetzt `Buffer.byteLength(text,'utf8')`. `src/v19-six-chain-capture-audit.mjs` markiert alte Bytezahl-Abweichungen ausdrücklich, ohne eine intakte kryptografisch geprüfte HTTP-Rohdatei als gefälscht einzustufen. **Die ursprünglichen Archivberichte und Rohdateien werden nicht umgeschrieben**, damit der damalige Fehler weiterhin nachvollziehbar bleibt.

## 3. Echter Planungsengpass bei Dot 2

Die letzte archivierte Anfrage `research/requests/2026-11-22/20261122T081936481Z-dot2-dot2-v16-wake11-20261122T081936481Z.json` forderte zwar alle **sechs** Chains an, setzte jedoch **`max_gecko_requests:1`**. Damit kann ein einzelner Run nur **eine** Gecko-Poolseite untersuchen. Ein `6/6`-Ergebnis nach nur diesem einen Run wäre mathematisch ausgeschlossen.

In `src/v19-discovery-budget-plan.mjs` sind nun folgende Größen ausdrücklich enthalten: `requested_chain_count`, `minimum_gecko_page_requests_for_one_attempt_per_chain`, `scheduled_chain_count`, `unscheduled_chains_due_to_budget`, `unscheduled_chains_due_to_cooldown`, `incomplete_chain_attempts_are_a_data_gap` und eine Empfehlung zu mindestens einer page pro Chain, **falls das kostenlose API-Limit dies zulässt**. Der Plan wird niemals mit einem erfolgreichen HTTP-Capture gleichgesetzt. Bei einem Budget von 6 kann er 6 Chains **einplanen**; bei Budget 1 bleiben 5 unversorgte Chains sichtbar; bei HTTP-429 bleibt die Chain unbestätigt, auch wenn Budget frei wäre.

`scripts/cloud-discovery-runner.mjs` protokolliert dazu `metrics.v19_actual_chain_capture`: gewünschte, versuchte und tatsächlich erfolgreich empfangene Chains. Fehlende Chains werden als `DATA_GAP` behandelt, nicht als `MARKET_CALM`. Zusätzliche OHLCV- und Trending-Requests sind bereits im gemeinsamen 12-Request-Gecko-Budget zu berücksichtigen. **Weder dieser Plan noch der Report startet automatisch zusätzliche Dots oder API-Läufe.**

## Reproduzierbarer lokaler Audit-Befehl

Nach dem synchronisierten Checkout des **separaten** Cleanroom-Branches kann der reine Lese-Audit ohne Anbieter-API, GPT und Paper-Runner ausgeführt werden:

```bash
npm run audit:dot2-chains
```

`scripts/v19-audit-six-chain-captures.mjs` liest ausschließlich die sechs fest im Forschungsmanifest hinterlegten Rohdateien, ihre HTTP-Belege und deren Git-Blob-IDs. Es gibt das geprüfte 24h- und 5h-Fenster, fehlende Chains und historische Bytezahl-Metadatenfehler als JSON aus. Wenn ein Hash oder eine ursprüngliche Dateireferenz nicht mehr stimmt, bricht es ab. Der Befehl erzeugt keine Datei, keinen API-Aufruf, keinen Order-Upload und keine Wallet-Änderung. **Die tatsächliche Ausführung dieses Node-CLI auf GitHub Actions oder Windows ist noch offen**; die getrennten isolierten Funktionskontrollen ersetzen sie nicht.

## 4. GitHub-Code, Tests und offene Abnahme

- `src/v19-six-chain-capture-audit.mjs`: getrennte Prüfung von originalen HTTP-Bytes, tatsächlichen Git-Blob-SHA1-Referenzen, HTTP-Anbieter-URL, Chain, Seite, Zeitfenster, abgefragten Zeilen und tatsächlichem Decoderergebnis. **Kein** Handel, kein GPT, kein Netzwerkabruf.
- `research/audits/v19-six-chain-originals-2026-11-22.json`: sechs ursprüngliche File-Pfade und echte GitHub-Blob-IDs; strikt Research-Dokument.
- `test/v19-six-chain-original-coverage.test.mjs`: **8** Node-Regressionstests eingecheckt (echte Originaldateien, 24h 6/6 vs. 5h 5/6, Cronos leer, manipulierte Datei/URL/SHA, Oktober-Zukunftswissen, Unicode-Größenfehler).
- `test/v19-multichain-discovery-budget.test.mjs`: **3** weitere Node-Tests ergänzt zu Budget 1/6 und Rate-Limit-Cooldown.
- Gezielte Prüfung: **6/6 doppelte echte Byte-Hashes (SHA-256 + Git-Blob-SHA1)** unabhängig berechnet; **12/12 isolierte Audit-/Zeitfenster-Kontrollen** bestanden, dabei ein V8-Mock für die Integrations-Schnittstelle nach bereits separater Hashprüfung. **12/12 isolierte Scheduler-Kontrollen** und Code-Syntaxprüfung bestanden. **Die 11 neuen/erweiterten echten Node-Testfälle sind eingecheckt, aber ein vollständiger `npm test`-/Actions-PASS ist weiterhin nicht nachgewiesen (QA-06).**
- Offene Voraussetzungen für **D2-01**: tatsächlich mindestens eine erfolgreiche, neue **Multi-Chain-Budget-Anfrage** mit gespeicherten Originaldaten und pro-Chain/Seite-HTTP-Evidenz, nachgewiesene fünfstündige Abdeckung unter echten API-Ratenlimits und gegebenenfalls sachgerechte as-of-Replay-Abdeckung. Originale Oktober-Captures dürfen nicht durch Nachberechnung am 22.11. fingiert werden. `D2-02` ist als Code-Regression schon gezielt abgeschlossen; bewegliche Gecko-Offset-Seiten bleiben nicht als global vollständig bestätigt.

Die vorhandene `research/state/market-memory.json` und alle sechs Originalarchive bleiben unverändert. Sämtliche fünf Dots pausiert, keine neuen Orders, keine Echtgeld-Transaktionen, keine Änderungen an `main`/Legacy oder lokalem Windows-Paper-Guthaben.
