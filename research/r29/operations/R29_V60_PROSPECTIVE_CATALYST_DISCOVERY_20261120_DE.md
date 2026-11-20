# R29 V6.0 – prospektive Nachrichten-/Breakout-Erkennung (20.11.2026)

## Problem (aus unabhängiger Nachtprüfung)
Die kanonischen öffentlichen `research/market/latest.json`-Snapshots enthielten keine
`news_leads` oder `narrative_leads`, obwohl der lokale Daemon beide sammelt.
Der Collector las vor allem neueste Pools: ältere Pools mit frischem Momentum
konnten deshalb nicht als Kandidaten erscheinen. Sieben archivierte Nacht-Snapshots
enthielten keinen der sieben nachträglich ausgewählten Beispielcontracts.
Das ist kein Beweis eines verpassten *sicheren* BUYs: Ausführbarkeit, zeitgerechter
Preiseinstieg und spätere historische Gewinnzahlen sind unabhängig zu verifizieren.

## Umsetzung in diesem PR
1. Der lokale RSS-Forscher fragt zusätzlich fünf allgemeine BBC-Ressorts ab.
   Breite, nicht auf Gewinnernamen trainierte Schlagwörter für gesellschaftliche,
   kulturelle, Gaming-, Tier- und KI/IPO-Ereignisse erzeugen ausschließlich
   `GENERAL_EVENT_CATALYST_CANDIDATE`-Hinweise. Ein rotiertes Auswahlfenster
   reserviert Raum für allgemeine Quellen neben den Kryptonachrichten.
2. Pro Chain wird neben zwei neuesten GeckoTerminal-Poolseiten ein 5-Minuten-
   Trending-Poolfenster gelesen. Das erhöht die Erreichbarkeit *älterer*
   wiederbelebter Pools, behauptet aber keine Vollabdeckung aller DEXs. Höchstens
   24 publizierte Pools je Chain bleiben bestehen; HTTP-429 führt nicht zu Retry-Spam.
   Rohidentitäten und Begrenzungen bleiben diagnostizierbar.
3. Der kanonische GitHub-Relay projiziert `news_leads`, `narrative_leads` sowie
   die jeweiligen Quellenstatusfelder nach einer restriktiven Whitelist.
   First-observed-Timestamps bleiben erhalten; spätere Artikel dürfen sich nicht
   in frühere Entscheidungen einschleichen. DEX-Booster sind keine organischen
   Nachfragebelege, nicht mit News-Events verknüpfte Tokens bleiben unzugeordnet.
4. Die EVM-Sicherheitsrecherche darf neutrale ältere Trending-Pools prüfen,
   **niemals aber die unabhängigen Contract-, LP-, Sellability- und Zweiweg-Quote-
   Gates verkürzen**. Auch hier werden weder Guthaben noch Walletdaten übertragen.
5. Regressionstests decken generische Nachrichten, Quellen-Fairness, alte
   Trending-Pools, unveränderte Sicherheitsgates und nicht handelbare Übergaben ab.

## Betrieb und Kontrollgrenzen
- GPT als einziger strategischer Entscheider soll bei jedem *tatsächlichen*
  Vollreview die neuen Felder aus dem frischen kanonischen Snapshot ausdrücklich
  lesen, zeitlich bewerten und bei einer plausiblen Nachricht-Token-Verknüpfung
  den **exakten Contract/Pool unabhängig verifizieren**.
- `news_leads` sind bloße RSS-Beobachtungen: keine unmittelbare Vertragsadresse.
  `narrative_leads` sind DEX-Metadaten, teilweise bezahlte Promotionen: keine
  unabhängigen Social-/Onchain-Nachweise.
- Bei erfüllten Gates darf GPT einen authentifizierten V3-PAPER-BUY mit
  `sizing_mode=LOCAL_USER_COIN_STAKE` ausgeben; die Einsatzhöhe setzt nur
  der Nutzer lokal. Der bestehende Windows-Bot muss diesen BUY unabhängig prüfen
  und einen separaten lokalen PAPER_FILLED-Nachweis liefern.
- Solana-Executor-Unterstützung und persönliche Windows-V6-Installation sind
  durch diesen PR **nicht** hergestellt oder nachgewiesen. Kein Echtgeld, keine
  künstlichen Orders, keine erzwungenen Käufe.
- Mindestens vier echte GPT-Vollreviews pro UTC-Tag und 4–24 adaptive Reviews
  sind eine bestehende V5.9-Anforderung, nicht durch News/Trending-Collector
  automatisch erbracht.
- Auch mit mehreren Quellen können enge Snapshot-Limits oder durchgehende
  Provider-Ausfälle Kandidaten verdrängen. Die tatsächliche Recall-Quote muss
  mit prospektiven First-Seen-Logs und vollständigen unabhängigen Negativfällen
  quantifiziert werden. Niemals rückblickende Gewinner als Modellinput senden.

## Abnahme
`node --test runner/research-news-rss.test.mjs runner/research-market-collector.test.mjs runner/r29-canonical-market-relay.test.mjs runner/gpt-paper-security-research.test.mjs`

`node --check runner/research-news-rss.mjs`

`node --check runner/research-market-collector.mjs`

`node --check runner/r29-canonical-market-relay.mjs`

`node --check runner/gpt-paper-security-research.mjs`

Anschließend Ubuntu/Windows-CI, aktuelle originale Provider-Captures und einen
vollständigen authentifizierten PAPER-BUY→PAPER_FILLED→SELL-Zyklus separat prüfen.
Ein grüner Unit-Test allein ist keine Live-Fill-Abnahme.
