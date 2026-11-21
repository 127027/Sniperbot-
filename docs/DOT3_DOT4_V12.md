# R29 V1.2 – Dot3 Risk-Recheck und Dot4 kontrollierte Wiedereinstiege

Nur Repository \`127027/Sniperbot-\`, Branch \`codex/r29-cleanroom-paper-20261121\`. PAPER ONLY. Keine Echtgeldorder, keine OpenAI-/Bezahl-API, keine Löschung von Marktgedächtnis, Balance oder Receipts.

## Istzustand / konkrete Blocker

Letzter tatsächlicher Dot3-Bericht vor diesem Patch: \`research/latest/dot-3.json\`, 2026-11-21T18:22:01Z: 20 Kandidaten, 0 ELIGIBLE, 3 WATCH, 2 REJECTED, 15 DATA_GAP. Wiederkehrende Gate-Codes: \`NO_COMPLETE_INDEPENDENT_QUOTE_MATCH\`, \`PROVIDER_QUOTE_ASOF_UNKNOWN\`, \`NO_TAX_HONEYPOT_SELLABILITY_PROOF\`, \`LIQUIDITY_MISSING_SECOND_OR_PRIMARY\`, \`PRICE_DISAGREEMENT_OVER_3_PERCENT\`.

Ein vollständiger Contract (Dot2) oder eine Zweiquellen-Preisübereinstimmung beweist keine Sellability. Auch für virtuellen Papierhandel darf Dot3 fehlende Sicherheitsnachweise nicht als ELIGIBLE behandeln. Dot4 kann kein tatsächliches BUY publizieren, solange Dot3 0 ELIGIBLE hat, unabhängig von der Größe historischer Gewinner.

## Dot3 stündlich: strukturierter Recheck-Funnel

\`src/risk-recheck-queue.mjs\` implementiert \`buildRiskRecheckQueue\` mit per-Coin Gate-Codes. Lesen aus \`research/latest/dot-3.json\` und zuletzt tatsächlich veröffentlichtem Dot2-Feed. Pro Pool echte Chain, volle Contract+Pool-Identität, beide konkreten Providerzeiten, aktuelle Preisdifferenz, **beide** Liquiditätswerte und Sellability nachprüfen. Queuereihenfolge: zuerst bereits identifizierte zwei-Provider-Kandidaten mit belegter preislicher Übereinstimmung, danach fehlende Quellen; abweichende und Liquiditätsarme separat. Fehlende Provider-\`quote_asof\`-Zeit niemals mit der eigenen HTTP-Erfassungszeit gleichsetzen.

Blocker separat protokollieren, neu eintreffende Belege mit Git-Blob-SHA+UTC unveränderlich speichern, beim folgenden Wake nur offene Prüfungen wiederholen. Maximal tatsächlich verfügbare API-Requests pro Lauf und 429 dokumentieren; nicht erfinden, dass ein Sicherheits-API-Zugriff funktioniert, wenn er nicht verfügbar ist.

\`buildRiskRecheckQueue\` ist **eine Diagnose**, keine automatische Risikofreigabe. Alle Worklist-Kandidaten bleiben \`eligible_for_buy:false\`. Dot3 kann erst nach realer unabhängiger sellability-/Tax-/Honeypot-Prüfung sowie aktuellen zwei Quellen eine begründete ELIGIBLE-Freigabe mit Nachweis erteilen. Bei Quellenproblemen steht WATCH/DATA_GAP/REJECTED statt einer falschen Order.

## Dot4 stündlich: Wiedereinstiegsschutz und 24-Scan-Forschung

\`src/research-paper-lab.mjs\` enthält neben den bisherigen unveränderten Presets das ausdrücklich separate **Forschungs-Preset \`guarded_reentry\`**. Es begrenzt höchstens zwei BUYs pro Coin pro Tag, hält sechs Stunden Abstand zwischen zwei Käufen desselben Coins, fordert mindestens drei vorher abgeschlossene historische Kerzen und einen hinreichend stabilen jüngeren Kursbereich. Preis und Volumen müssen die eingestellten Mindestbedingungen erfüllen.

Das ist **noch keine genehmigte neue LIVE-Paper-BUY-Regel** und ersetzt weder Dot3 noch die aktuell erforderlichen zwei frischen unabhängigen Kaufquotes. Die bereits bestätigten offenen Papierpositionen müssen unverändert weiter stündlich überwacht werden; ein Re-Entry-Timeout darf ein notwendiges SELL niemals blockieren.

Dot4 soll in seinem Journal mindestens \`cooled_down\`, \`max_entries_reached\`, \`risk_blocked\`, \`fresh_quote_blocked\`, \`watched\`, \`paper_order_published\`, \`paper_client_fill\` getrennt zählen. Mit fehlenden Quellen oder unzureichender Sellability -> NO_TRADE / WATCH, nicht BUY. Bei ausreichenden echten Belegen: bestehender SHA-verifizierter GitHub-Publisher; niemals Forschungsergebnisse als reale Orders übernehmen.

## Frozen Benchmark ohne neues API-Ratenlimit

\`scripts/replay-v12-frozen-risk.mjs\` lädt ausschließlich \`research/training/2026-10-12/frozen-v11\` mit sechs rückblickend ausgewählten Pool-Kursverläufen und 24 as-of-Modellscans. Es behauptet keine damaligen echten Dot2-Entdeckungen, keine tatsächliche Sellability oder Client-Fills. Es verifiziert mit strikter PnL- und Zählwert-Kontrolle, dass die drei bisherigen Presets auf den gleichen sechs Frozen-Pools **unverändert** laufen. Ergebnis und 24-Scan-CSV im GitHub-Actions-Artefakt \`historical-ohlcv-probe\` (\`oct12-v12-frozen-risk-strategy.json\` und \`.csv\`).

Der neue Wiedereinstiegsschutz ist **in-sample erprobt**. Eine bessere Modell-PnL auf den bereits bekannten Gewinnern belegt keine Verbesserung am unbekannten Folgetag. Offene Positionen erhalten keinen erfundenen Schlusswert.

## Definition für erfolgreiches End-to-End

Dot2 dauerhafter Chain+Contract+Pool mit Zeit/Quelle -> Dot3 unabhängige aktuelle Poolquotes, Liquidität, Sellability -> Dot4 BUY/SELL-Order korrekt signiert bzw. SHA-publiziert -> Windows-Paper-Client verarbeitet und schreibt echten \`PAPER_FILLED\` Receipt -> Dot5 verifiziert den SHA und den Kontostand. Solange dieser Funnel nicht vollständig belegt ist, gilt **keine nachgewiesene Trading-Verbesserung**.

Keine Live-Geldtransaktion. Keine Änderung an 50 TEST-USDC/Coin oder dem gespeicherten virtuellen Bestand.
