# R29 V1.4 – Öffentlichkeit, Nachrichten & Meme-Früherkennung: realer Start und A/B-Basis

**21. November 2026, 21:36–21:40 UTC.** Repository \`127027/Sniperbot-\`, ausschließlich Branch \`codex/r29-cleanroom-paper-20261121\`; PAPER ONLY. Keine Echtgeldausführung, keine Orderausgabe aus Medien.

## Konkrete Umsetzung
- \`src/media-research.mjs\`: kostenlose RSS-/Bluesky-Feeds, sichere Entschlüsselung von Veröffentlichungs-/HTTP-Erfassungszeit, URL-Deduplizierung, Schutz gegen Zukunftsinformationen, nur begrenzte öffentliche Artikel-/Post-Metadaten, Themen-Tags und persistente Media-Memory.
- \`scripts/cloud-media-capture.mjs\`: automatisch bei **jedem tatsächlichen** stündlichen Dot2-GitHub-Capture unmittelbar nach dem echten Markt-Datensammler; Resultate in \`research/media/\`.
- \`src/media-ab-evaluation.mjs\`: A = unveränderte zeitgerechte Marktrangliste, B = exakt dasselbe Marktuniversum plus nur solche öffentlichen Medien-Hinweise, die **vor der jeweiligen Marktentscheidung tatsächlich erfasst** wurden und ausdrücklich den vollständigen Contract nennen. NAME/Trump/DOGE-Buzz allein ist kein Contract-Match und kein BUY.
- \`docs/MEDIA_TREND_V14.md\`: verbindliche Anweisungen für alle fünf Dots; die fünf bestehenden stündlichen Automations-Prompts wurden um V1.4 erweitert.
- Kein zusätzlicher Bot, kein kostenpflichtiger API-Key, keine Änderung an gespeichertem Guthaben, \`signals/index.json\` oder Receipts.

## Zwei echte Github-Captures
| Beleg | Run 44952405266 | Run 44952763048 |
|---|---:|---:|
| Marktdaten/Medienworkflow | erfolgreich | erfolgreich |
| CoinDesk-RSS | HTTP OK, 25 Artikel | HTTP OK, 25 Artikel |
| Cointelegraph-RSS | HTTP OK, 30 Artikel | HTTP OK, 30 Artikel |
| Öffentliche Google-News-Meme-Suche | HTTP OK, 36 Meldungen | HTTP OK, 36 Meldungen |
| Öffentliche Google-News-Persönlichkeiten-Suche | HTTP OK, 34 Meldungen | HTTP OK, 33 Meldungen |
| Bluesky-öffentlicher Hot-Feed | HTTP OK, 0 thematisch passende Posts | HTTP OK, 0 thematisch passende Posts |
| Als RSS/Feed-Metadaten akzeptierte Einträge | 125 | 124 |
| Neue eindeutige Medien-URLs im Gedächtnis | 125 | **0** |
| Bereits bekannte URLs erneut gesehen | 0 | **124** |
| Mediengedächtnis einzigartiger URLs kumuliert | 125 | **125** |
| Datierte Einträge mit mindestens einem Meme-/Krypto-Themen-Tag kumuliert | 67 | **67** |
| Unterscheidbare beobachtete Themen | 8 | 8 |
| Marktspeicher Pools | 130 | **132** |
| Paper-Orders veröffentlicht | 0 | 0 |

**Wichtig:** Die 125 einzigartigen Einträge sind **nicht** 125 Memecoin-Signale. Ein Teil der Nachrichten ist thematisch unpassend. Die zwei Google-News-Abfragen bilden absichtlich vorgefilterte Treffermengen ab; deren Häufigkeit beweist keine zusätzliche Aufmerksamkeit der Öffentlichkeit. Die Zahl 8 ist die Anzahl definierter tatsächlich beobachteter Themenkategorien, nicht acht ausgebrochene Coins.

**X und Reddit:** kein berechtigter kostenloser Zugang zu einer vollständigen automatisierten Postsuch-API; im Quellenstatus \`NO_AUTHORIZED_FREE_SEARCH_ACCESS\`. Die X-/Reddit-Kanäle wurden nicht abgefragt, 0 gefundene Posts ist **keine** 0 tatsächliche Posts.

## Aktueller A/B-Status
Run 44952763048 speicherte \`research/media/2026-11-21/44952763048/paired-ab-market-media.json\`:
- Markt-Kandidaten in A und B jeweils **70**, identische Chain-/Pool-IDs.
- **0** mediale Originalmeldungen mit zweifelsfrei erkanntem **vollständigem Token-Contract** zum korrespondierenden damaligen Zeitpunkt.
- **0** validierte 24h-Ausgangslabels; A/B-Status \`WAIT_FOR_MATURED_FORWARD_LABELS\`.
- Entsprechend aktuell **keine gemessene Verbesserung** von Erkennungsquote, Prognosequalität oder echter Paper-Trading-Rendite.
- Vergangene Oktober-Erfolge bleiben Nachkontrolle, niemals Vorwissen oder A/B-Trainingsinput.
- Für ein 24h-Fenster mit Vergleich zum vorherigen 24h-Fenster braucht es **mindestens 48h tatsächliche Quellhistorie**. Mit zwei nur vier Minuten entfernten Captures darf keine Aufmerksamkeitsexplosion konstruiert werden. \`attention_delta_observed=null\` bis zur Mindestdeckung (plus weiter bestehender Quellabdeckungsunsicherheit).

## Besondere Grenzen
- News-Feeds enthalten nur Veröffentlichungsmetadaten, keine komplette historische Social-Media-Abdeckung; die zeitliche HTTP-Erfassung ist für Blindtests maßgeblich. 
- Für Social-Hype sind aktuelle Originalposts besser als Sekundärberichte; Bluesky hatte in den ersten beiden öffentlichen Hot-Feed-Samples **0** passend markierte Posts, X und Reddit sind nicht automatisch integriert.
- Mediennamen sind mehrdeutig, Hersteller-/Prominenten-Unterstützung ist unbewiesen. Keine News kann die Dot3-Validierung ersetzen.
- Der Nachrichtensammler identifiziert Themen ohne Token-Contract als Forschungshypothesen, nicht als Order.
- Erst nach vollständigen beobachteten Marktverläufen, positiven und negativen Fällen, unabhängigem zeitlichem Holdout und echten ordnungsgemäßen Paper-Fills ist eine tatsächliche Steigerung messbar.
- Der erfolgreiche Markt-/Medien-Sammelworkflow ist **kein** Nachweis laufender 60-minütiger GPT-Recherche pro Stunde.

## Originalbelege
- [Erster tatsächlicher Medien-Capture](https://github.com/127027/Sniperbot-/actions/runs/44952405266)
- [Zweiter echter Capture mit gepaartem Markt-/Medienvergleich](https://github.com/127027/Sniperbot-/actions/runs/44952763048)
- \`research/media/latest.json\`
- \`research/media/state/memory.json\`
- \`research/media/2026-11-21/44952763048/evidence.json\`
- \`research/media/2026-11-21/44952763048/asof-signals.json\`
- \`research/media/2026-11-21/44952763048/paired-ab-market-media.json\`

## Erweiterung – Dritter echter Capture mit originalen Mastodon-Posts (21:45 UTC)
- Erfolgreiche [GitHub-Action 44953166515](https://github.com/127027/Sniperbot-/actions/runs/44953166515): sieben kostenlose öffentliche Quellen HTTP-OK.
- Mastodon-Hashtags "memecoin" und "dogecoin": **40 + 38 = 78** tatsächlich öffentlich abrufbare Posts.
- Insgesamt 201 Einträge im dritten Capture; **203** kumulierte eindeutige Artikel- und Post-URLs, davon **145** mit mindestens einem Thema-Tag. 78 neu; 123 wiederholt.
- Keine passenden Bluesky-Posts aus dem öffentlichen allgemeinen Hot-Feed; X/Reddit unverbunden. Mastodon bildet nur eine einzelne Instanz ab.
- Marktgedächtnis **133 Pools** / 133 vollständige Contracts.
- Der A/B-Test hat **73** aktuelle Markt-Kandidaten, noch **0** zweifelsfreie Contract-Erwähnungen in bis dahin gespeicherten Medienquellen; der 24h-Nachbeobachtungszeitraum ist nicht abgeschlossen. Deshalb keinerlei Beweis eines früheren oder besseren Kaufs.
- Kein fingierter Attention-Delta bei nur wenigen Minuten Medienhistorie; keine tatsächlichen Paper-Orders.
