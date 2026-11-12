# R08 – Ursachenanalyse zum historischen Fünf-Dot-Blindtest R07

**Stand: 12.11.2026 · nur Sniperbot-Forschungsrollen · keine Trading-Engine-Änderungen.**

## Ergebnis: Alle fünf R07-Rollen haben abgeschlossen, aber nicht die historische Datensimulation

GitHub-Prüfung der tatsächlich gespeicherten Dateien `research/historical/R07/{news_discovery,social_acceleration,onchain_liquidity,contract_security,opportunity_qa}.json` auf Branch `codex/dots-r07-two-month-blind-20261112`:

| Rolle | Zustand | Tage mit behaupteter Prüfung | Tatsächlich vorgelegte Tageszeilen | Belegte originale As-of-Ereignisse | verifizierte Erstfunde | hypothetische qualifizierte Paper-Buy-Advisories |
|---|---|---:|---:|---:|---:|---:|
| News Discovery | BLOCKED | 0 | 0 | 0 | 0 | 0 |
| Social Acceleration | BLOCKED | 0 | 0 | 0 | 0 | 0 |
| Onchain Liquidity | BLOCKED | 61 | 61× nur UNAVAILABLE_ASOF | 0 | 0 | 0 |
| Contract Security | BLOCKED | 61 (Evidenz-Suffizienz) | 0 | 0 | 0 | 0 |
| Opportunity QA | BLOCKED | 0 | 0 | 0 | 0 | 0 |

Die fünf Berichte sind real abgegeben. **Der beabsichtigte 61-Tage-Replay der fünf LLMs mit hinreichend historischen Inputdaten fand NICHT statt.** Die 61 Leer-/UNAVAILABLE-ASOF-Notizen sind keine 61 echten Marktbeobachtungen. Daraus lässt sich weder „fünf Dots sind blind“ noch „fünf Dots hätten GOAT erkannt“ ableiten. Richtige Messung: `INPUT_DATA_UNAVAILABLE_DO_NOT_SCORE_DETECTION` und `UNTESTABLE_NOT_MISSED_WINNER`.

## Ursachen nach Einfluss

1. **Hauptblocker: Datenverfügbarkeit statt allein Modell-Prompt.** R07 verlangt zeitlich authentifizierte Originalposts/Archive, exakte historische Pair-Identität, damaligen Contract-Zustand und realistische Kauf-/Sell-Quotes. Keine der Rollen konnte einen vollständigen belegten historischen Input aufbauen. Mehr Modellzeit allein löst fehlende Quelldaten nicht.
2. **Zu enges Quellen-Gate / mangelnde Quellen-Normalisierung.** Ein WARC-/Wayback-Capture ist ein starkes Web-Provenienzformat, aber nicht die einzige potenzielle As-of-Quelle. Unveränderliche Onchain-Transaktionen mit originalem Slot/Blockzeit und **bis zum virtuellen Tag rekonstruierter** Reserve-/Pool-/Tokenhistorie sind ebenfalls aussagekräftig. Heutiger `getAccountInfo` liefert NICHT den Zustand von 2024. Bei unvollständiger Archiv-Historie explizit `UNAVAILABLE` notieren.
3. **Verkettung der Phasen: Event-, Token- und Trade-Entdeckung verwechselt.** Ein neues virales Meme ohne Mint/Pool ist eine erfolgreiche **Narrativ-Früherkennung**, aber keine Handelschance. Ein neuer Pool mit offener Security ist eine erfolgreiche **Token-Entdeckung**, aber kein BUY. Erst unabhängige Security/Sellroute/Quote -> sichere **QA-Prüfbarkeit**. R07 meldete nur 0 qualifizierte BUYs, nicht die Frühphasen.
4. **Kein auditierter Tages-Input und keine vollständige Negativkohorte.** R07 ließ die Rollen im heutigen Web recherchieren und nicht eine vorab vorgefertigte, byteweise versiegelte 2024-Originalquellen-Liste je Tag abarbeiten. Rückblickende Coinlisten als Trefferziel sind selektionsverzerrt; die Dots durften nicht gezielt Gewinner kennen. Ohne andere Tokens/Fehlstarts sind Präzision/Recall und Prozentwahrscheinlichkeiten nicht kalibrierbar.
5. **Unterschiedliche „Tage geprüft“-Definition.** 61 gleichlautende SOURCE_UNAVAILABLE-Einträge sind keine 61 historischen Markt-Snapshots. QA hat diese Diskrepanz erkannt. R08 zählt Tage mit konkreten as-of-Datensätzen getrennt von Tagen mit bloßer Fehlerprüfung.
6. **Aktuelle produktive Datensammlung weiterhin kritisch.** Der in den Forschungsberichten 12.11.2026 verwendete gemeinsame Windows-GitHub-Marktfeed war >35h alt, bei Base/BSC gab es API-Ratelimits, und die fehlende aktuelle Social-/Pool-/Sell-Quote-Abdeckung ist für Minuten-Hypes ein separates LIVE-Problem. R07 beweist nicht dessen Ausmaß, deutet aber auf Dateninfrastruktur als Engpass.
7. **Keine echte historische Ausführung.** Fünf Rollen haben Archiv-Recherchen gemacht, keine unveränderte Botinstanz „im Jahr 2024“ betrieben. Kein echter Ed25519-Dot-Publisher, kein zeitlich korrekter 2024-DEX-Fill, keine +9900%-Behauptung.

## Konkret umgesetzte Forschungsänderung

- Alle fünf **bereits bestehenden** stündlichen Automationen erhielten einen ergänzenden R08-Rollenauftrag mit Schwerpunkt auf unabhängigem Live-Ereignis-/Coin-Discovery, Quellenverfügbarkeit, historischer Ledger-Verifizierbarkeit, kritischer Quellenprovenienz und sauberer Phasentrennung. Keine Änderung der Intervalle, keine Echtgeld-/Order-Freigabe, kein automatisches Nachspielen eines datenlosen R07.
- `runner/dot-replay-coverage.mjs`: maschinenlesbare R07-Fehleranalyse, getrennte Phasen `EARLY_NARRATIVE_WATCH_ONLY`, `TOKEN_FOUND_TRADE_NOT_EVALUABLE` und `CANDIDATE_FOR_QA_REVIEW_NOT_AN_ORDER`, plus deklarativer as-of-Gate für WARC oder verifizierte historische Chain-Transaktionen.
- `runner/dot-replay-coverage.test.mjs`: Tests für Quellenmangel, falsche 61-Tage-Interpretation, verfrühte Blockchain-Ereignisse, fehlende Archive, Sicherheits-/Sellroute-Trennung und Fehlschlüsse beim Rollenvergleich.

**Wichtig:** Der neue Gate-Code prüft deklarierte Provenienz-Felder und technische Zeit-/Formregeln. Er lädt **nicht** selbst Archive oder Ledger-Daten herunter und verifiziert deren Hash/Authentizität nicht selbstständig. Seine Tests sind daher Pipeline-Tests, keine historische Coin-Erkennungsvalidierung. Eine real verfügbare Quelle ist weiterhin Pflicht.

## Fachlich geeignete Datenquellen für einen zweiten, echten Blindtest

- Archive-/Originaltext: Internet Archive CDX/Wayback (mit tatsächlichem Capture-UTC, WARC-Bytes, Quell-URL und Inhalt), Archive-It, Common Crawl WARC. Archiv-„Published At“ allein genügt nicht; alle Plattform-/API-Limits respektieren.
- Solana/andere Chains: historisch **finalisierte ursprüngliche** Ledger-Transaktionen, gemessene alte Slots, Pool-Init-Events und rekonstruierte Gebühren-/Reserven-/Token-Authority-Veränderungen. Archive-RPC kann historische Signaturen/Transaktionen liefern, aber Provider-Untergrenzen und Lücken müssen nachweisbar geprüft werden.
- Negative Beispiele: Launchpad-/Pool-Gesamtkohorte derselben Tage, inklusive kurzlebiger und manipulierter Tokens, statt einer später zusammengestellten Gewinnerliste.

Referenzen:
- https://github.com/internetarchive/wayback/blob/master/wayback-cdx-server/README.md
- https://commoncrawl.org/get-started
- https://solana.com/de/docs/rpc/http/getsignaturesforaddress
- https://solana.com/de/docs/rpc/http/getblock

## Neue Pflicht-Schrittfolge für einen fairen Folgetest

A. ZUERST archivierte Originalquellen und aktuelle Ledger-/Provider-Zugänglichkeit prüfen; jeden Tag Quellenanzahl und Abdeckung speichern. Kein R07-ähnlicher Leerlauf ohne Input.
B. Aus dem vollständigen Pool-/Post-Sample vierfach auseinanderhalten: `UNMATCHED_NARRATIVE` -> `TOKEN_OBSERVED` -> `QA_REVIEW` -> `NON_EXECUTABLE_BUY_ADVISORY`.
C. Vollständige 61-Tage-Maschine nachweislich mit den **identischen versiegelten historischen Dokumenten** der fünf Dots ausführen, ohne Live-Web-Zugriff auf spätere Informationen.
D. Nach abgeschlossenem Lauf versiegeltes Truth-/Ergebnislabel öffnen, Erkenntnis-First-Seen-Zeit und tatsächlich mögliche damalige Kauf-/Sell-Quotes vergleichen.
E. `0 detections / 0 verified input` = INCONCLUSIVE. Erst wenn `verified input > 0` und die Kohorte einen nachweisbar auffindbaren Token enthält, kann ein tatsächlich verpasster Coin als `DETECTION_MISS` bewertet werden.

**Keine Trading-Engine-Veränderung, keine echten Kauf-/Verkaufsaufträge, kein Wallet-/PayPal-Eingriff.**
