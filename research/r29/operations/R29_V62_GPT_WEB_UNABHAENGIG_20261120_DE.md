# R29 V6.2 – GPT-Recherche unabhängig vom GeckoTerminal-Collector

## Verbindlicher Betriebsvertrag

GPT führt die strategische Recherche 4–24 Mal pro UTC-Tag über die bereits bestehende stündliche GPT-Automation selbst aus. Öffentliche aktuelle Webrecherche nach neuen und reaktivierten Memecoins, Nachrichten-/Kulturkatalysatoren, exakten Contract-/Pool-Identitäten und Marktaktivität darf **nicht** vom Windows-Collector oder seiner kostenlosen GeckoTerminal-API abhängen. Fehlende Webwerkzeuge oder unbekannte Quellzuverlässigkeit müssen als Einschränkungen deklariert werden; erfundene externe Quellen sind verboten.

GeckoTerminal, DEX Screener, Solana-Ereignisse, lokales RSS-Newsarchiv, Narrative und WATCH-Speicher bleiben als unabhängige **optionale Zusatzbelege**. Rate-Limits, HTTP 429, fehlende Windows-Publikation oder lokale DATA_GAP verhindern eine GPT-Marktrecherche nicht. Sie verhindern weiterhin eine Order, wenn die konkrete unabhängige Sicherheits-/Verkaufs-/Quote-Evidenz fehlt.

## Sichere GPT-Review-Dokumentation ohne Collector

Das bestehende v1-Reviewindexformat bleibt mit alten Einträgen kompatibel. Neue optionale Quellenangaben:

* `source_mode: COLLECTOR_PLUS_GPT_WEB`: bestehender frischer `market_observed_at_utc` und tatsächlicher `market_source_blob_sha`, plus `web_source_evidence_sha256` und `independent_web_source_count`.
* `source_mode: GPT_INDEPENDENT_WEB_ONLY`: `market_observed_at_utc: null` und `market_source_blob_sha: null`, tatsächlicher SHA-256 über die unveränderliche Webrecherche-Quellliste/Beobachtungsdaten als `web_source_evidence_sha256`, mindestens zwei unabhängige belegte aktuelle Webquellen, `independent_web_source_count` 2–100.

Jeder Eintrag benötigt eine tatsächliche GPT-Analyse, konkretes datiertes Markdown-Erfahrungsjournal (mit URL, Abrufdatum und unabhängig zu prüfenden Contract-/Pool-Identitäten), eindeutige ID, mindestens 60 Minuten Abstand und valide Tageszählung. Der Eintrag ist **keine Modellattestierung, kein Auftrag und kein Paper-Fill**. Zähler dürfen niemals aus dem lokalen Collector übernommen werden. Das GitHub-Journal muss den SHA-256 der Webbelege prüfbar enthalten; die reine Formatvalidierung kann die Wahrheit der Webrecherche nicht beweisen.

## Handelssicherheit und Scope

V3-Paper-BUYs/SELLs ausschließlich aus GPT, GitHub authentifizierter Relay, unabhängiger lokaler Risk/Contract/Pool/LP/Sellability- und ausführbarer Zweiweg-Quote-Gate, User-fixed Stake, von GPT autorisierte Exits, Signing/Replay-Schutz. **Kein Echtgeld, keine neue Automation, kein lokaler strategischer Coin-Picker, keine kostenpflichtige OpenAI-API.**

## Abnahme

Code-Tests auf Ubuntu und Windows, auch WEB_ONLY ohne Marktblob, alter v1-Reviewindex und Ablehnung gefälschter Webquellennachweise. Danach echter stündlicher GPT-Review mit unabhängig sichtbaren Webbelegen und optionalem Windows-Capture verifizieren. Ein reiner GitHub-CI-Test beweist weder Internet-Entdeckung noch Paper-BUY/SELL. Nach Merge muss die neue UI auf dem Windows-PC aktualisiert werden.