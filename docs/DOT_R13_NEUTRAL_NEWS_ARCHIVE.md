# R13 – Neutraler historischer Nachrichtenfeed statt Gewinnerliste

## Stand
- **Tag 1, 10.09.2024**: geprüftes, unveränderliches Wikipedia-Revisionspermalink vom 10.09.2024 21:46 UTC: https://en.wikipedia.org/w/index.php?oldid=1245075863&title=Portal:Current_events/2024_September_10.
- Metadatensatz `research/historical/NEUTRAL_NEWS_2024/2024-09-10.json`, bewusst ohne Gewinnernamen, Kurshöchststände oder Target-Coins. Diese Quelle ist eine **redaktionelle Sekundärübersicht**. Nicht vollständige Nachrichten-/Social-Abdeckung, keine Originalbelege der zitierten Medien und keine geprüften Token-/Pooldaten.
- Einträge stammen in dieser Revisionsfassung nachweislich spätestens vom Revisionszeitpunkt; ein bereits früheres Vorkommen ist damit NICHT bewiesen. Niemals frühere Tagesstunden damit rückwirkend füllen. Die heutige Wikipedia-Fassung wurde später mehrfach geändert und ist für die damalige Entscheidung **nicht zulässig**.

## Automatisierbarer, nicht ausgeführter Import
`runner/dot-neutral-wiki-news.mjs` implementiert ein öffentliches MediaWiki-Revisions-Gateway mit `rvstart=<Tag 23:59:59Z>`, `rvdir=older`, `rvprop=ids|timestamp|content`, `rvslots=main`. Es verlangt, dass die erhaltene Revision tatsächlich nicht später ist, sichert die Revisions-ID, historische UTC-Zeit, einen SHA-256-Hash des ausgegebenen Wiki-Quelltextes und das exakte Oldid-Permalink.

Manueller Offline-Aufruf (Node 20+, **nur öffentliches MediaWiki, nie Bot-API**):

```bash
node runner/dot-neutral-wiki-news.mjs 2024-09-10 2024-11-09 neutral-news-archive.json
```

Dieser Befehl ruft bei tatsächlich erfolgter Ausführung bis zu 61 historische, unveränderliche Tagesrevisionen ab und schreibt sie als lokales JSON. Er wurde **nicht auf dem Windows-PC und nicht über GitHub Actions tatsächlich ausgeführt**. Die GitHub-CI prüft nur offline synthetische Mocks. Keine API-Verfügbarkeit oder 61/61 Quellenabdeckung vorab behaupten; MediaWiki-Fehler bleiben `errors[]`, fehlende historische Revisionen `UNAVAILABLE_ASOF`.

Quelle zur API-Abfrage: https://www.mediawiki.org/wiki/API:Revisions.

## Abgleich gegen vollständigen Memecoin-Trainingsplan
- Wikipedia-News können Neutralereignisse bieten, aber viele virale Katzen-/Tier-/Community-Memes entstehen zuerst außerhalb etablierter Nachrichten. **Ohne historischen Social-Feed keine volle Memecoin-Erkennung.**
- Für realistische BUY/SELL benötigt der Bot historische DEX-Pool- und Swap-Originaldaten. Bitquery Solana Archivaggregate seit 01.06.2024 sind laut Dokumentation nur mit historical add-on verfügbar, Einzeltrades 2024 werden erst sukzessive aufgefüllt: https://docs.bitquery.io/docs/blockchain/Solana/historical-aggregate-data/
- GDELT DOC API historische normale ArticleList-Abfragen reichen laut Dokumentation nur ca. drei Monate zurück; 2024 erfordert eine andere Quelle: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
- Die Excel-Memecoin-Gewinnerliste des Nutzers und sämtliche 2026 verfügbaren ATH/Peak-Daten bleiben ausschließlich in der **separaten Evaluierung**. Nicht als JSON, Namen oder Tipps auf den Dot-Branches veröffentlichen.
- Auch wenn der historische Test bestanden wird, keine automatisierte BUY/SELL-Weitergabe an Windows-Bot ohne separat validierte, signierte paper-only Signal-/Risiko-/Liquiditätspipeline und ausdrückliche neue Betriebsfreigabe.

## Stündliche QA
Fünf aktive Automations sind das Planmaximum. Opportunity-QA hat zusätzlich die stündliche Prüfung der vier anderen Dots übernommen (Task-ID `Automation_f0bc047f97d48191873d6d3910c2a405`). Tatsächliche Quell-/Zeitbelege und chronologische Entscheidungspunkte messen, stagnierende Rollen gezielt nachbessern; niemals frühere leere Tage als geprüft bezeichnen.

## Quellenqualitätsregel
Ein altes Wiki-Revisionspermalink ist **nicht** automatisch ein erster Meme-Post, kein unabhängiger Originalbericht und kein historischer Swap-Preis. Es hilft, spätere Nachrichtenergänzungen auszuschließen und einen neutralen öffentlichen Nachrichtenhintergrund zu rekonstruieren. Der Quelltext der Seite unterliegt der CC-BY-SA-Lizenz; Urheber-/Lizenzpflicht bei Export und Weitergabe beachten.
