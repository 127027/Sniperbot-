# R29 – Technische Vorbereitung des nächsten Fünf-Dot-Backtests: echte Git-Journale und Original-Solana-Sell-Belege

**Stand 23.11.2026, 11:37 UTC** · Repo `127027/Sniperbot-` · **nur** Branch `codex/r29-cleanroom-paper-20261121`. Nutzerauftrag: „Dann weiter bis die Dots bereit sind für einen weiteren backtest“. **Es wurde kein neuer Backtest gestartet** und weder Dot-Trading noch Echtgeld/Windows-Paper-Guthaben aktiviert oder verändert.

## 1. Die zwei getrennten Freigabearten

**Technische Forschungs-Diagnose:** 5h Warmup ab `2026-10-11T19:00:00.000Z`, 24 stündliche Scans von `2026-10-12T00:00` bis `23:00` UTC; reine regelbasierte Software- und As-of-Testbarkeit ist **JA**. Kein positives 50-TEST-USDC-Original-Fill daraus ableiten; eine Stunden-Uhr ist kein historischer GPT-Aufruf.

**Originaler forensischer QA-04-Fünf-Dot-Blindtest:** **NEIN / NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE**, unverändert **13 PASS / 46 PARTIAL / 2 OPEN** in der 61-Originalmatrix, **13/60** Nicht-Backtest-Kriterien PASS. ACHT gesperrte Originalbeweis-Stufen: `NON_BACKTEST_ORIGINAL_TASK_ACCEPTANCE`, `PROSPECTIVE_HOLDOUT`, `ORIGINAL_OCTOBER_MARKET_POPULATION`, `PROSPECTIVE_HOLDOUT_OUTCOMES`, `DOT3_INDEPENDENT_ISSUER_AND_QUOTE`, `DOT3_CHAIN_SELLABILITY`, `FIVE_DOT_GPT_JOURNALS`, `WINDOWS_CLIENT_END_TO_END`. Holdout endet erst **25.11.2026 06:54:05 UTC**; auch danach bleiben nicht automatisch andere Gates erfüllt.

## 2. Tatsächliche Fünf-Dot-Preflight-Läufe

- [Erster Lauf #45165554683](https://github.com/127027/Sniperbot-/actions/runs/45165554683): **792/792 Unit-Tests**, **5/5** frische Git-Forensikprotokolle, 24/24 korrekte Software-Zeitfenster, **859 aktuelle Research-Pools**; Journal-Inventar zeigt 6 Inkonsistenzen. [Original-Artefakt](https://github.com/127027/Sniperbot-/actions/runs/45165554683/artifacts/14813758189).
- Tatsächlicher Fehler gefunden: Die Dot-2-Latest-JSON vom 11:14:36 UTC ist **korrekt `CAPTURE_PENDING_DATA_GAP`**. In ihr gibt es nur eine SHA-gepinnte Forschungs-Forensikdatei und kein abgeschlossenes kanonisches GPT-Journal. Alte Regression verlangte fälschlich bei ALLEN fünf Dots immer `journal_path`, scheiterte **785/786**. Das wurde nicht durch ein erfundenes Journal „repariert“, sondern durch echte SHA-Verifikation der separat gespeicherten Dot-2-Forensik und expliziten `PENDING`-Status.
- Die Latest-Quelle aus [GitHub Dot2 HTTP-Capture #45163438714](https://github.com/127027/Sniperbot-/actions/runs/45163438714) hat denselben Request-Pfad und die übereinstimmende `captured_at_utc` **11:15:03.093 UTC**. Das Quell-HTTP ist fertig, GPT-Auswertung dieser Quelle **nicht** automatisch.
- Dot 1 nutzt rollen-eigenes `gpt_execution_at_utc` und einen `kind`-losen Tempo-Journaltyp mit gültigem unverändertem Git-Hash. Dot 5 nutzt eine `kind`-lose, rollen-eigene `dot-5-control`-Forensikdatei, ebenfalls SHA-geprüft. Beide werden nun exakt als solche geprüft, **nicht** als independent GPT-authenticated.
- [Nachbesserungs-Preflight #45166087625](https://github.com/127027/Sniperbot-/actions/runs/45166087625): **792/792 PASS**, **5/5** vorhandene frische Git-Forensikprotokolle, **Journal-Inventar-Fehler von 6 auf 2 gesenkt**, aktueller source feed `45163438714` zeit- und requestgenau matched. **Übrig:** offizielle `research/latest/dot-3.json` und `dot-4.json` stammen noch vom 22.11. 21:21/21:33 UTC, obwohl am 23.11. um 10:22 bzw. 10:35 Uhr neuere forensische Forschungsprotokolle vorliegen. **Keine** nachträglich erfundenen kanonischen Dot3-/Dot4-GPT-Journale; diese Dots müssen beim nächsten authentischen GPT-Review ihren jeweiligen `journal_path`, `journal_blob_sha`, ursprünglichen Source-Run, `forensic_trace_path` und `latest` selbst konsistent veröffentlichen.

**Neue Code-Dateien:** `src/v19-next-backtest-five-dot-freshness.mjs`, `test/v19-next-backtest-five-dot-freshness.test.mjs`, `scripts/v19-next-backtest-five-dot-preflight.mjs`, `.github/workflows/cleanroom-v19-next-backtest-five-dot-preflight.yml`; Dot-2-PENDING- und rollen-nativen Schema-Fix in `src/v19-dot-journal-inventory.mjs`, `scripts/v19-audit-current-dot-journals-readonly.mjs` und `test/v19-dot-journal-inventory.test.mjs`.

## 3. Neue reale Originalbelege für Dot 3 – vier erfolgreiche fremde Verkaufsinstruktionen

Die vier bereits per SHA-256 validierten Solana-v1-Originaltransaktionen waren am **12.10.2026 vor dem jeweiligen Stundenscan** in tatsächlich erfolgreichen Blockchain-Blöcken enthalten. [Original-V1-Transaktionen #45135625789](https://github.com/127027/Sniperbot-/actions/runs/45135625789); [Slot-Reihenfolge #45140546530](https://github.com/127027/Sniperbot-/actions/runs/45140546530).

**Erneute nachweisbare Quellprüfung:** [GitHub CI #45166769490](https://github.com/127027/Sniperbot-/actions/runs/45166769490), **795/795 Tests PASS**. Sie verifiziert **nicht nur** `meta.err===null`, sondern für jedes Original:
- `Program log: Instruction: SellV2` oder `SellV3`, zusammen mit dem aufgerufenen und erfolgreichen Onchain-Programm `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`;
- die genaue `SPL Token-2022`-`transferChecked`-Übertragung vom fremden Tokenkonto an das exakt per Account-Index dem Pool zugeordnete Mint-Tokenkonto;
- exakte **Übereinstimmung** der rohen Transfermenge mit `meta.postTokenBalances - meta.preTokenBalances` des Original-Poolkontos;
- gleichzeitig verringerter nativer SOL-Kontostand der jeweiligen Pooladresse.

| Coin | Historische Uhrzeit | Erfolgreiche Original-Verkaufsinstruktionen | Token-2022-Eingänge (reale Token) | Veränderung natives Pool-SOL-Konto |
|---|---|---|---:|---:|
| TANK | 12.10. 01:59:53, 01:59:57 UTC | **1× SellV2, 1× SellV3** | **2.023.999,627513 TANK** | **−0,061977686 SOL** |
| ARIANA | 12.10. zweimal 17:59:59 UTC | **2× SellV3** | **13.211.411,771910 ARIANA** | **−1,041658094 SOL** |

[Original-Audit- und Hash-Artefakt #14815010884](https://github.com/127027/Sniperbot-/actions/runs/45166769490/artifacts/14815010884). Implementiert in `src/v19-oct12-original-sell-instruction-audit.mjs`, `test/v19-oct12-original-sell-instruction-audit.test.mjs`, `scripts/v19-audit-four-original-oct12-third-party-sells.mjs`, `.github/workflows/cleanroom-v19-oct12-original-third-party-sell-instructions.yml`.

**Ehrliche Beweisgrenze:** Für beide Token sind **historische Verkäufe anderer Marktteilnehmer nachgewiesen**. Nicht bewiesen sind die Original-Verfügbarkeit dieser Daten um 02:00/18:00 für GPT, ein kaufbarer 50-TEST-USDC-Einstieg, die komplette Geldwäsche-/Freeze-/Blacklist-/Transferhook-Sicherheit des konkreten Token-2022-Vertrags, die Sellroute unseres Bots mit Gebühren und Slippage, Upstream-Unabhängigkeit oder eine originale Windows-Paper-Fill-Quittung. `D3-04`, `D3-05`, `QA-04` bleiben **NICHT PASS**; kein Token-/SOL-Konto des Nutzers wurde geändert.

## 4. Verbindliche nächsten Schritte, um den nächsten echten Backtest nicht erneut mit 0 Inputs zu starten

1. **Dot 3 und 4:** Nur jeweils selbst geschriebene **neue kanonische, SHA-geprüfte GPT-Research-Journale** mit tatsächlicher Review-Zeit, Status, exaktem aktuellem Source-Run, Forensik-Pfad, `NO_TRADE` und Zuordnung zur neuesten GitHub-Feed-Revision veröffentlichen. Nur dann die eigenen `research/latest/dot-3.json` / `dot-4.json` via CAS aktualisieren. Ein fremder GPT-Forensikbericht darf nicht einfach als unterschriebene Original-Journalquittung umetikettiert werden.
2. **Dot 2:** Nach HTTP-Capture die neue Feed-Version nur **separat** als aktuellen Source-Stand darstellen und im nächsten tatsächlich ausgeführten GPT-Wake auswerten; Pending-Source-Journal nicht rückwirkend zu completed machen.
3. **Dot 3:** Den echten dritten-Partei-SellV2/V3-Beleg als **historische Marktaktivität** markieren, aber erst mit unabhängig beglaubigten originalen Provider-/Issuer-Quoten, Token-2022-Mint-/Transfer-Hook-/Freeze-Sicherheit, 50-USDC-BUY/SELL-Slippage und -Exit als **BOT_PAPER_ELIGIBLE** klassifizieren.
4. **Dot 1/5:** 29h-Uhr und Source-/as-of-/holdout-Gates bewahren; Dot5 darf die `5/5` aktuellen Git-Forensiken nicht als `5/5 GPT unabhängige Authentifizierung` bewerten.
5. **Schließlich:** Originale neutrale 6-Chain-Oktober-Marktdaten; alle 60 eigentlichen Abnahmeaufgaben; echtes Windows-Paper-End-to-End; reifer prospektiver Holdout. Erst dann den **ursprünglichen QA-04** freigeben. Ein separater **Software-Diagnosebacktest** kann bei Bedarf früher laufen, ist aber kein echter QA-04-PASS und darf bei 0 Originalquotes keine echten Käufe melden.

**Kein Livehandel, keine Ausführung von Orders, kein neuer Backtest in diesem Arbeitsdurchgang.**
