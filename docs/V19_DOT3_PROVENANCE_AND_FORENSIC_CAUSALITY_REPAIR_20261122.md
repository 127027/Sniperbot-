# R29 V1.9 – Dot-3-Preisrisiko und fünfstufige Kausalkette: Fehlerdiagnose und Codefixes

**Prüfdatum:** 22.11.2026 · **Repository:** `127027/Sniperbot-` · **Branch:** `codex/r29-cleanroom-paper-20261121`. **Arbeit auf bereits freigegebenem Cleanroom-Research-/Paper-Code; kein Backtest ausgeführt, keine Orders, keine echte oder bestehende Paper-Wallet geändert, keine Dots neu angelegt oder automatisiert ausgelöst.**

## Ziel

Die fünf Dots sollen bei einem historischen Test **wissen, was bis zum jeweiligen virtuellen Zeitpunkt tatsächlich sichtbar gewesen wäre**, bei jedem Pool die eigene Tätigkeit und die vorgelagerte Entscheidung konkret begründen und fehlende Belege als DATA_GAP erkennen. Die 65 rückblickend bekannten Oktober-Coin-/Poolmeldungen bleiben **Post-Run-Oracle**, nicht Input für Discovery oder Risikoentscheidungen.

Der nachfolgende Review unterscheidet scharf:
1. **Reparierte Software-Regel** = reproduzierbare Unit-/CI-Regression (keine Herkunftsbestätigung des Realmarkts).
2. **Tatsächlich archivierte externe Daten** = Source-Datei mit Byte-Hash, aber nicht zwingend unabhängige Provider-Quotezeit.
3. **Tatsächliche GPT- oder Client-Ausführung** = benötigt separate unabhängige Quittung; **nicht** durch JSON-Angaben, einen signierten Self-Claim oder erfolgreichen Node-Test belegt.

## Fehlersuche – nachgewiesene Schwachstellen und Reparatur

| Defekt | Tatsächlicher Fehler im vorherigen Code | Reparatur (mit Datei) | Nachweis / neue Regression |
|---|---|---|---|
| D3-T01 – Frische HTTP-Antwort, veralteter Provider-Kurs | `src/v19-dot3-source-pairs.mjs` betrachtete für die Endklasse `TWO_DOMAIN_INDICATIVE_ONLY` nur HTTP-Capture-Alter der zwei Domains. Der Klassifikator erkannte eine veraltete Provider-Zeit zwar intern, hob sie aber nicht in den Paarstatus. | Klasse `PROVIDER_QUOTE_STALE`, `REFRESH_STALE_PROVIDER_QUOTE_AND_CHECK_ORIGIN`; HTTP-Alter und Provider-Quote-Alter in getrennten Feldern; fehlende Provider-Zeit **nicht** als volle Quote-Frische zählen. | `test/v19-dot3-source-pairs.test.mjs`: neuer HTTP-Response + alter Provider-Stand, unknown timestamp, zwei formal frische aber weiter unbestätigte Quellen |
| D3-T02 – Attestierung überstimmt beobachtete Kandidatenrisiken im Synthetikmodus | `src/v19-dot3-risk-status.mjs` prüfte bei vorhandener attestationsähnlicher Struktur im synthetischen PAPER_ELIGIBLE-Pfad weder `quoteMissing` noch direkte Konflikte/geringe Liquidität der Kandidatendaten. | Dieselben Grenzprüfungen greifen nun **vor** positiver Modellklasse: WATCH bei Preisabweichung/geringem Liquiditätssignal, DATA_GAP bei fehlender Quote. LIVE/HISTORICAL bleiben zusätzlich ohne echte D3-Beweise gesperrt. | `test/v19-dot3-risk-status.test.mjs`: positive künstliche Attestierung bei dünner Liquidität, fehlender Unabhängigkeit und ausdrücklich altem Providerkurs |
| D3-T03 – Reportierter Prozentwert kann reale Preisabweichung verbergen | `price_disagreement_pct` aus einem Kandidaten konnte kleiner als der tatsächlich aus `primary_quote_usd` und `second_source_price_usd` errechnete Unterschied sein. | Abweichung wird zusätzlich direkt aus den beiden Preisen berechnet; die konservative höhere Abweichung entscheidet. Gemeldete und berechnete Prozentwerte werden beide protokolliert. | Tests: absichtlich zu kleine Prozentangabe bei großen Kursunterschieden, fehlende Prozentangabe |
| D3-T04 – Nicht eindeutige Uhrzeiten | Dot-3-Quotezeit, Source-Pair, Sellability und Risk-Status akzeptierten bislang `Date.parse()` auch für Strings ohne UTC-Z. | Einheitlich strenger `asOfMillis`-Klassifikator für explizite `YYYY-MM-DDTHH:MM:SS[.mmm]Z`-UTC. Lokale oder Offset-Zeitangaben werden als ungültig ausgewiesen; keine stille Host-Zeitzonenkonversion. | Je eigene Tests in `test/v19-dot3-quote-time.test.mjs`, `test/v19-dot3-risk-status.test.mjs`, `test/v19-dot3-sellability.test.mjs` |
| D3-T05 – Retrospektive/orakuläre Quelle in 2-Domain-Auswertung | Eine formal syntaktisch korrekte Quote mit expliziter `source_class=POST_EVENT_ORACLE` oder `RETRO_ASOF_RECONSTRUCTION` wurde im Source-Pair nicht ausdrücklich ausgeschlossen. | Rejektionsgrund `RETRO_OR_ORACLE_QUOTE_NOT_CONTEMPORANEOUS`, auch bei `reported_gain_pct` oder `future_winner_label`; kein Vortäuschen des zweiten historischen Providers. | `test/v19-dot3-source-pairs.test.mjs`: vier Fälle, keine künstliche Doppelfreigabe |
| D5-C01 – Unverkettete positive Ereignisse in Berichten | `src/v19-five-dot-forensic-trace.mjs` kontrollierte nur **wenn** Vorgänger-IDs vorhanden waren. Eine positive Dot-3-/BUY-/SELL-/Dot-5-PASS-Buchung ohne entsprechende Ursachen-IDs blieb formal unbeanstandet. | `BUY_WITHOUT_PRIOR_ELIGIBLE_DOT3_LINK`, `SELL_WITHOUT_RECORDED_POSITION_OR_BUY_LINK`, `ELIGIBLE_WITHOUT_DOT2_DISCOVERY_LINEAGE`, `DOT5_PASS_WITHOUT_ANY_CAUSAL_LINK` in der **Diagnose**. Kein erfundener Fill, kein automatischer Blindkauf. | `test/v19-five-dot-forensic-trace.test.mjs` testet fehlende und vollständige Fünf-Rollen-Ketten |
| D5-C02 – EVM-Schreibweise spaltet einen echten Pool | Der Kausalkettenvergleich und per-Pool-Key nutzten bei `0x`-Adressen direkte case-sensitive Strings; gültige EVM-Adressen können unterschiedlich großgeschrieben sein. | Normalisierte EVM-Contract-/Poolschlüssel, Solana bleibt case-sensitive. Dadurch keine falsche Pool-Aufteilung, keine künstliche fehlende Kausalkette. | Test mit demselben Pool einmal in Klein- und einmal in Großbuchstaben |

**Wichtig:** `TWO_DOMAIN_INDICATIVE_ONLY` bleibt weiterhin lediglich Forschungsindiz, unabhängig von zwei URLs. Selbst zwei nachweislich frische Zeitfelder ersetzen weder unabhängige Original-HTTP-Bytes noch den echten Providerzeit-Herkunftsnachweis. `PAPER_ELIGIBLE` im ausdrücklich synthetischen Testmodus ist **kein** echtes Paper-Orderrecht.

## Für den späteren detaillierten Backtestbericht

Der forensische Report muss jeden Fehler mit Rolle, UTC, exakter Chain/Contract/Pool-ID, Source-Datei, Provenienzklasse, verknüpfter vorheriger Aktion, WHY/WHAT, risk gate und nächster Reparatur-ID ausweisen. Die neuen Kausalprobleme sind **Hinweise auf fehlende Belege im vorgelegten Protokoll**, nicht automatisch Beweis, dass ein Dot zur historischen Zeit wirklich nichts tat. Eine bereits vor Start vorhandene Position muss ihr ursprüngliches Lot-/Receipt als separate belegte Ursache angeben, andernfalls bleibt die SELL-Herkunft unbekannt.

Die 29h-Zeitleiste, unmittelbar erlaubte Startentscheidung um 12.10.2026 00:00 UTC, 4/8/12/24 adaptive tatsächliche GPT-Vollreviews, Vorbereitungswissen vor Testbeginn und isolierte 5.000 TEST-USDC mit 50 TEST-USDC/Coin bleiben unverändert.

## Noch offen – nicht durch diese Softwareänderungen ersetzbar

- Original `D3-04`: **unabhängiger** vertrauenswürdiger Issuer, Originalquelle und Quotezeit, echte Signatur-/Byte-Verifikationskette.
- Original `D3-05`: empirische Chain- und Pool-spezifische Honeypot-/Blacklist-/Transfer-/Tax-/Sellability-Probe mit realen Originaldaten.
- Vollständige fünf echte GPT-Journal-Quittungen und alle Dot-2→Dot-3→Dot-4→Dot-5-Bindungen; separate echte Windows-Paper-BUY/SELL-/Lot-Receipts.
- Neutraler historischer Markt- und News-Nenner auch für Nichtgewinner; 65 spätere Coinmeldungen nur blind **nachher** vergleichen. Original Oktober-Daten fehlen noch.
- Prospektiver eigener Holdout erst ab tatsächlicher Reife nach 25.11.2026 06:54 UTC mit überprüften Labels.

**Strenge Original-Abnahme (unverändert): 13 PASS / 46 PARTIAL / 2 OPEN = 21,31% voll verifiziert.** Unit-Test-Zähler sind separate Softwarequalität, keine systemweite 100%-Freigabe. `QA-04` und Echtgeld bleiben nicht ausgeführt.


## Bestätigte GitHub-CI-Abnahme der technischen Korrekturen

**GitHub-Code-SHA:** `df06abaa8efea7a998085dd66a1d2cee28c7431c`. Beide echten GitHub Actions Jobs erfolgreich mit `node --test` auf Node 22, **717 Tests / 717 PASS / 0 FAIL**:

- [R29 Cleanroom Paper Tests #45075311441](https://github.com/127027/Sniperbot-/actions/runs/45075311441)
- [R29 V1.9 Cleanroom Tests Only #45075311435](https://github.com/127027/Sniperbot-/actions/runs/45075311435)

Diese erfolgreichen Softwaretests belegen **nur** die neue Entscheidungs-/Forensik-Logik an echten bzw. synthetischen Test-Fixtures. Kein historisches GPT-Research vom Oktober wurde dadurch ausgeführt; es existiert weiterhin **keine** externe Signatur- und Sellability-Originalabnahme.
