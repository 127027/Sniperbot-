# R29 – V2.3/V2.4: Neutrale Oktober-Mint-Discovery, Quellenausfälle und adaptiver API-Retry

**Stand:** 23. November 2026, 20:43 UTC. **Repo:** `127027/Sniperbot-`, **nur** `codex/r29-cleanroom-paper-20261121`. **Modus:** Research-only, null Trade-Orders, null Echtgeld, null Windows-Paper-Client-Änderung.

## Nutzerziel

Am 12.10.2026 um **00:00 UTC** sollen die fünf Dots alle bis dahin **tatsächlich verfügbar gewesenen** Marktinformationen inklusive älterer Historie berücksichtigen dürfen, dann in stündlichen Wakes Informationen ergänzen. Dot1 adaptiert 4/8/12/24 Vollreviews. Daten die erst im November 2026 erhoben wurden dürfen **nicht** zu Oktober-Originalwissen erklärt werden; die 65 später identifizierten Gewinner dürfen **nie** den Kandidaten-Scanner starten. Die fünf Stunden ab 11.10. 19:00 UTC sind ein Arbeitsvorlauf und keine Beschränkung der Markthistorie.

## Aktuell verifizierter Endstand der zwei neutralen Stunden (20:43 UTC)

**Das 429-Resume hat für beide Stunden tatsächlich funktioniert!**

- Originalprobe 02:00: [#45261003896](https://github.com/127027/Sniperbot-/actions/runs/45261003896), 5/8 aktuelle Mint+Pool-Identitäten, 3 HTTP429. Gezielt NUR Zeilen `[5,6,7]` mit 20.000 ms Drosselung erneut gelesen: [#45261696018](https://github.com/127027/Sniperbot-/actions/runs/45261696018), 3/3 HTTP200, **damit 8/8 Mints mit je exaktem Pool belegt**.
- Originalprobe 18:00: [#45261044088](https://github.com/127027/Sniperbot-/actions/runs/45261044088), 5/8 aktuell exakte Mint+Pool-Zuordnungen, 3 HTTP429. Gezielt NUR Zeilen `[5,6,7]` mit 20.000 ms Drosselung erneut gelesen: [#45262076422](https://github.com/127027/Sniperbot-/actions/runs/45262076422), 3/3 HTTP200, **damit 8/8 Mints mit je exaktem Pool belegt**.
- **Gesamt tatsächlich nachträglich identifiziert: 16 von 192 NEUTRALEN Solana-Mints**, jeweils eine heutige exakte Poolzuordnung. **Weitere 176 Mints aus den übrigen 22 Stundenstichproben sind in diesem Gecko-Hourly-Pfad NOCH NICHT ABGEFRAGT**. Das ist keine 16/65 Gewinnerquote, keine Marktgesamtabdeckung und keine Oktober-Originalverfügbarkeit.
- Alle **22** öffentlichen Gecko-HTTP-Abfragen im vierfachen Test: **16 HTTP200** mit exakten Mint+Pool-Belegen und **6 HTTP429** in den Erstläufen; die sechs wurden später erfolgreich nachgefragt, ohne die ersten zehn erneut zu verbrauchen.
- Jüngste erfolgreiche vollständige Software-CI: **[871/871 Tests, 0 FAIL, keine Orderwrites](https://github.com/127027/Sniperbot-/actions/runs/45261523593)**. Beide gezielten Resume-Läufe ebenfalls **871/871 PASS**.
- Maschinenlesbare Übergabe mit den vier originalen GitHub-Run-IDs und dem echten Abdeckungsstand: `research/audits/2026-11-23/r29-v24-two-neutral-scan-hours-source-progress.json`.
- **Kein echter historischer BUY, SELL, GPT-Entscheid oder Client-Fill bewiesen.** Das Original-Gate bleibt bei 13/60, nicht bei 16/60; die sechzehn sind **zusätzliche heutige Quell-Identitäten**, keine formal abgenommenen Originalanforderungen.

## 1. Gegenprobe zur Erklärung "keine Coins vorhanden"

[**R29 V2.3 GitHub-Run #45259327293**](https://github.com/127027/Sniperbot-/actions/runs/45259327293) führte **tatsächlich** sieben offizielle öffentliche DexScreener-Token-Sammelabfragen mit allen **192** unveränderten, SHA-geprüften neutralen Solana-Mints aus dem retrospektiven Archiv aus:

- 30+30+30+30+30+30+12 = 192 eindeutige Mint-Adressen; KEINE Gewinner-Oracle-Selektion.
- **7/7 HTTP200**, aber **7x JSON `[]`**, also **0** aktuelle Token-/Pool-Treffer aus genau diesem Sammelendpunkt.
- Die Rohantwort hatte in allen sieben Fällen SHA-256 `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` (`[]`).
- Dies beweist **weder** die historische Nicht-Existenz der Pools **noch** eine 0%-Erkennungsquote.

[**R29 V2.3 Kontroll-Run #45259783782**](https://github.com/127027/Sniperbot-/actions/runs/45259783782): Zwei zuvor im NEUTRALEN Research über unabhängige Novemberbelege gefundene Solana-Mint-/Pool-IDs (TANK und ARIANA), drei DexScreener-Routen pro Mint: `tokens/v1`, `token-pairs/v1`, `latest/dex/pairs`. **6/6 HTTP200**, **0/6 exakte Treffer**. Es handelt sich um eine aktuelle **Provider-Indexlücke oder Datenrückgabe-Lücke**, nicht um einen Beweis, dass die Pools am 12. Oktober nicht handelbar existiert hätten.

[**R29 V2.3 Gecko-Fallback #45260335717**](https://github.com/127027/Sniperbot-/actions/runs/45260335717): Dieselben beiden neutralen Mints über öffentliche GeckoTerminal-API `/networks/solana/tokens/{mint}/pools` und exakte Pool-Abfrage:
**4/4 HTTP200 und 4/4 exakt gleiche Solana-Mint+Pool-Zuordnungen erfolgreich.** Pooladressen wurden mit `relationships.base_token/quote_token` und `included[].attributes.address` auf exakte Mint-Identität geprüft; bloßer Coinname reicht nicht. Das ist **ausdrücklich NOVEMBER-Quellenkontrolle**, keine original Oktoberdatenfreigabe.

**Technischer Befund:** Ein leerer DexScreener-Index ist keine ausreichende Ausschlussregel. GeckoTerminal bietet für diese zwei konkreten neutralen Pools eine alternative *heutige* Identitätsquelle. Der Scanner muss Quellenlücken protokollieren und Anbieter-Fallbacks zulassen, darf aber keine falschen Originaloktober-Fills erzeugen.

## 2. V2.4 neutrale 8er-Quellen-Warteschlange

Neu: `src/v24-gecko-neutral-hourly-queue.mjs`, `scripts/v24-gecko-neutral-hourly-eight.mjs`, `test/v24-gecko-neutral-hourly-queue.test.mjs` und GitHub-Workflow `.github/workflows/cleanroom-v24-explicit-neutral-hourly8-gecko.yml`.

Jeder **explizit autorisierte** Quellendurchlauf liest eine von **24** retrospektiven Stundenstichproben mit je **8** Solana-Mints. Originalarchiv `r29-real-43day-fresh5minute-candidates-no-fills-v2`, GitHub Run `44048309420`, Artefakt `14312891173` und SHA-256 des 12.10. `8a03d0b3f065a6f6fd35867cd7c61719fb37f2cca06134aef6a81f14b3d7d3ab` werden auf Byte-Ebene geprüft. Die vorhandene `auditRetrospectiveNeutral24HourlySource`-Quarantäne bleibt aktiv. Nur exakte, in der Gecko-Antwort zusätzlich eingeschlossene Mint+Pool-IDs werden gezählt. Kein Preis, keine Buyerlaubnis, keine Wallet, keine GPT-Aufrufe.

Tatsächlich ausgeführte zwei Acht-Mint-Durchläufe:
- [**02:00 Uhr, #45261003896**](https://github.com/127027/Sniperbot-/actions/runs/45261003896): **8** API-Abfragen, **5 HTTP200 + 5 exakte heutige Mint+Pool-Treffer**, **3 HTTP429**.
- [**18:00 Uhr, #45261044088**](https://github.com/127027/Sniperbot-/actions/runs/45261044088): **8** API-Abfragen, **5 HTTP200 + 5 exakte heutige Mint+Pool-Treffer**, **3 HTTP429**.
- **Zwischenstand direkt nach den Erstläufen:** 10 von 16 mit exakter heutiger Poolidentität, 6 wegen 429 zunächst UNBEKANNT. **Nach den zwei erfolgreichen Slow-Resume-Läufen: 16/16 heutige Identitäten bestätigt.**
- Die offenen 22 übrigen neutralen Acht-Mint-Stundenproben sind **nicht ausgeführt** und die Gesamtdeckung aller 192 ist **nicht** bewiesen.

Die vier früheren Gecko-Kontrollabfragen sind teilweise **dieselben beiden** Mints wie in den Acht-Mint-Proben und dürfen **nicht zusätzlich als neue unterschiedliche Coins gezählt werden**.

## 3. Ein echter API-Bug bei den zwei 8er-Proben erkannt und korrigiert

GeckoTerminal lieferte jeweils nach **fünf** erfolgreichen Abfragen `HTTP 429`; die ursprüngliche achtteilige Diagnoseroutine hatte danach auch noch die restlichen zwei Anfragen gesendet. Dieser unnötige API-Verbrauch ist behoben:

1. Bei `HTTP 429` oder `503` stoppt die Routine ab sofort zusätzliche Anfragen im selben Lauf. Noch nicht abgefragte Token erscheinen als `DEFERRED_AFTER_PUBLIC_RATE_LIMIT`, **nicht** als tatsächliche HTTP-Rohantwort, fehlender Coin oder 0-Fill.
2. Ein expliziter `row_indexes`-Filter erlaubt nur die noch fehlenden Indizes (z. B. `[5,6,7]`) erneut abzufragen, ohne die ersten fünf sicher belegten Quellenergebnisse zu überschreiben.
3. Dynamische, request-kontrollierte Pausen **6.500–30.000 ms** erlauben konservative Drosselung; Public-API-Limits können auch provider- oder IP-übergreifend schwanken.
4. Die sichere Source-Summary trennt `public_provider_requests`, `unattempted_due_to_provider_rate_limit` und `unknown_current_identity_mints` von echter 200-Quellenabdeckung.

**[GitHub source-only CI #45261523593](https://github.com/127027/Sniperbot-/actions/runs/45261523593): 871/871 Tests erfolgreich**, einschließlich der neuen 429- und Resume-Regressionen, null Client-Orderwrites. Danach wurde die Pacing-Konfiguration nochmals für langsame Retry-Requests parameterisiert.

## 4. Unverändert offener historischer Anspruch

Keine der nachträglichen Abfragen belegt die **originale Oktober-Dot2-Providerlieferung**, original verifizierte onchain 50-USDC-BUY- und SELL-Ausführbarkeit, Dot3-D3-04/D3-05 oder die fünf echten damals laufenden GPT-Journale. 65 spätere Referenzmeldungen bleiben **AUS** dem Scanner. `main`, Windows-Paper-Konto und Echtgeld untouched.

**Formelles QA-04 ist weiterhin `NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE`** – ursprüngliche Non-Backtest-Abnahme **13/60 = 21,67 %**, acht externe Beweisblocker. Neue 200-Quellenantworten dürfen das Release-Gate nicht hochzählen.

## Nächste Arbeit

- **ERLEDIGT:** Drei 429-unterbrochene Zeilen je getesteter Stunde über `row_indexes:[5,6,7]` mit 20-Sekunden-Pacing nachgeladen; exakte Antwortbytes/SHA behalten und keinerlei erneute Abfrage der zuvor fünf bestätigten Mints.
- Übrige 22 Stunden **in unabhängigen, gedrosselten Schritten** aus dem neutralen Stichprobenarchiv untersuchen; Persistenz der Quellengaps und klare `UNKNOWN`-Bedeutung beibehalten.
- Für original historische Erkennbarkeit **neutralen Onchain-Eventstrom, zeitlich belegte Publikation und unabhängige handelbare Quotes** konstruieren. November-Gecko-Pools nie rückwirkend als Oktober-Asofrecherche freigeben.
