# R29 Dot 4: zeitgerechte SELL-Prüfung auch außerhalb des Vollreviews

**Grund:** Bei nur vier vollständigen Analysen täglich liegen bis zu sechs Stunden zwischen neuen GPT-Marktreviews. Bereits offene Positionen benötigen dennoch bei jedem stündlichen Cloud-Wake eine priorisierte Verkaufskontrolle, soweit tatsächlich unabhängige, genaue und aktuell belegte Preise vorliegen.

- Bei jedem Dot-4-Wake **zuerst** GitHub-Client-Receipts lesen; eine Paper-Position gilt nur bei tatsächlichem PAPER_FILLED als bestätigt. Fehlende Receipts sind OFFLINE_OR_UNCONFIRMED.
- Bestehende Positionen ausschließlich anhand ihres belegten Einstandspreises und **neuer** echter Zwei-Quellen-Quoten prüfen. Kein Sell anhand veralteter Screenshots.
- Bei ausreichender Evidenz kann Dot 4 während des stündlichen Wake ein **gezieltes Positions-Review** ausführen, ohne den 4/8/12/24-Takt für vollständige Neucoin-Reviews künstlich zu verschieben.
- BUY, SELL und KEEP/HOLD sind begründete GPT-Entscheidungen; fixe Schwellen der Shadow-Teststrategie gelten **nur** für isolierte Unit-Tests, nicht automatisch für den produktiven Cloud-Dot.
- Ein echtes SELL erfordert dieselbe vollständige Identitäts-, Quellen- und Veröffentlichungsprüfung und wird **sofort** von Dot 4 über GitHub veröffentlicht; nie von Dot 5/6.
- Erkennbare Datenlücken werden als DATA_GAP, nicht als HOLD oder „Verkauf zum Höchstkurs“ ausgegeben.
- Dies **erhöht nicht** die Zahl vollständiger Marktreviews und führt niemals zu Echtgeldtransaktionen.

## Backtest-Integrität
Die neue Datei \`src/point-in-time-strategy.mjs\` ist eine vollständig isolierte und deterministische **SHADOW-Modellstrategie**, keine GPT-Automation. Sie berechnet BUY/SELL nur aus chronologischen, zeitlich zugelassenen Quellenbeobachtungen. Ihre synthetischen Tests beweisen den Codepfad, **nicht** echte historische Gewinne am 12.10.2026. Für einen realen Tages-Backtest müssen unabhängige, mit Zeitstempel und Originalquelle belegte Snapshot-Daten aus der Vergangenheit vorliegen; rückblickende Gewinnerlisten sind keine Marktsignale.
