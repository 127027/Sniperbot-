# R29 V1.7 — Identitätskonflikte in der Discovery-Warteschlange

Gültig nur für `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`, PAPER ONLY.

## Bestätigter Codebefund
Die bisherige `prioritizeDiscoveredPools`-Deduplizierung verwendete Chain+Pool als Schlüssel und wählte bei mehreren Eingängen einen Repräsentanten nach Fehlerzahl und Priorität. Unterschiedliche gültige Token-Contracts für denselben Pool wurden dabei nicht ausdrücklich als Konflikt zurückgemeldet. Die Ursprungszeilen zählten zwar als Duplikat, aber die Risikowarteschlange konnte die widersprüchliche Identität leicht übersehen.

## Korrektur
- Für denselben gültigen Chain+Pool-Schlüssel werden alle **gültigen vollständigen** Contract-Identitäten auf Widersprüche geprüft (EVM-Adressen ohne Beachtung der Groß-/Kleinschreibung, Solana exakt).
- Bei mehr als einer Identität wird `CONTRACT_IDENTITY_CONFLICT` im Kandidaten gesetzt, sein Status bleibt `WATCH_OR_VERIFY`, und `identity_conflicts` führt die betroffenen Contracts.
- `duplicates` hält nun auch Contract, Ursprungsindex und Quellen-URL fest; der Input wird nicht als zweifach eigenständiger Marktpool gezählt.
- Fehlende, ungültige und unbestätigte Contract-Adressen werden weiterhin als eigene Datenlücke behandelt und sind **kein** Beweis zweier widersprüchlicher gültiger Identitäten.
- Das ist **keine** Sicherheitsfreigabe. Der Check trennt Identitätsrisiken sauberer.

## Dot2 und Dot3 ab sofort
Dot2 muss im Journal alle neuen `identity_conflicts` mit tatsächlichen Detailquellen und Beobachtungszeiten erfassen; keinen der konfligierenden Contracts stillschweigend zum kanonischen Token erklären. Dot3 prüft die Pool-/Token-Seiten und gegebenenfalls Quote-/Base-/Token-Orientierung und vermerkt das Ergebnis als `DATA_GAP` oder `REJECTED`, bis die Identität unabhängig aufgeklärt ist. Kein `ELIGIBLE` und keine Dot4-BUY-Order, solange `CONTRACT_IDENTITY_CONFLICT` ungeklärt bleibt.

## Operative Blocker, die weiterhin bestehen
Stand 2026-11-22, letzter eingesehener Dot3-Bericht 06:26:56 UTC: 21 geprüfte Kandidaten, 0 ELIGIBLE, 20 REJECTED, 1 DATA_GAP; die dokumentierten Hauptgründe sind unvollständige unabhängige aktuelle Poolquotes, Liquiditäts-/Preiskonflikte und fehlende Sellability-/Tax-/Honeypot-Belege. Eine Discovery-Deduplizierungsreparatur löst diese externen Risiken nicht automatisch.

## Abnahme
Neuer Regressionstest `test/candidate-identity-conflict.test.mjs` deckt (1) echte widersprüchliche gültige Contracts, (2) EVM-Groß-/Kleinschreibung und (3) unvollständige Identität ab. Der neue Test ist eingecheckt; `npm test` und GitHub Actions müssen noch separat als ausgeführt und bestanden nachgewiesen werden.

Weiterhin weder Live-Orders noch erfundene `PAPER_FILLED`-Receipts.
