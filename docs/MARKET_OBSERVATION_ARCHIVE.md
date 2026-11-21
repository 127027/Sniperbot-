# R29 – point-in-time Quellenbelege für künftige reale Tages-Replays

Ohne einen echten damals beobachteten Datenstand kann auch eine perfekte Paper-Engine nicht beweisen, welcher Coin rechtzeitig entdeckt wurde. Darum in **jedem neuen Dot-2/3-Journal** pro beobachtetem Kandidaten diese Felder erfassen (unverändert auf separatem Cleanroom-Branch; keine neuen Anbieter-APIs im Client):

\`\`\`json
{
  "chain": "base",
  "contract": null,
  "pool": null,
  "symbol": null,
  "source_url": null,
  "page_captured_at_utc": null,
  "page_price_usd": null,
  "page_liquidity_usd": null,
  "provider_quote_asof_utc": null,
  "provider_timestamp_basis": "UNVERIFIED",
  "second_independent_pool_page": null,
  "second_page_captured_at_utc": null,
  "second_provider_quote_asof_utc": null,
  "identity_status": "UNVERIFIED",
  "data_status": "DATA_GAP",
  "source_archive_blob_sha": null
}
\`\`\`

Dies ist eine **Schema-Vorlage, keine echte Marktbeobachtung**. Null ist zulässig und bei fehlenden Daten verpflichtend.

- Dot 2: neutral Poolseiten mit überprüfter vollständiger Adresse, Chain und vollständigem Token-Contract dokumentieren; ALLE gefundenen Kandidaten (auch abgelehnte) und alle tatsächlich besuchten Seiten mit Pagination aufbewahren. Contract nicht aus dem Ticker raten.
- Dot 3: auf zwei eigenständigen exakten Poolseiten beide gegenwärtig gesehenen USD-Preise und Liquiditätszahlen sowie **den tatsächlichen Moment der Sichtung** sichern; zusätzlich expliziten Anbieterzeitstempel, falls auf der Seite wirklich gezeigt. Die Abrufzeit ist **kein Beweis** für den internen Zeitpunkt der Anbieteraktualisierung. Wenn nur alte Such-Caches, abgekürzte Texte oder fehlende Zeitangaben vorliegen, als DATA_GAP klassifizieren.
- Dot 4: für LIVE Cloud-Paper-Orders vollständig belegte, frische Quotendaten im Moment der Order erneut prüfen. Auch wenn der Client später synthetische Preise simuliert, bleibt die auf Webseiten basierende Preisqualität ausdrücklich INDIKATIV.
- Dot 5/6: GitHub-BLOB-SHA nach echter Journal-Erstellung separat verifizieren; verwende keinen erfundenen 40-stelligen Platzhalter. Pro Coin \`first_seen_at\`, \`risk_checked_at\`, \`strategy_at\`, \`order_published_at\`, \`receipt_at\` bzw. DATA_GAP ausweisen.
- Das tägliche Replay nutzt ältere GitHub-Journals erst, nachdem auch deren ursprüngliches Erstell-/Sichtungsdatum plausibilisiert ist. Eine zu einem späteren Zeitpunkt beschaffte Tagesgewinnerliste darf nicht rückwirkend als damalige Entdeckung gelten.
