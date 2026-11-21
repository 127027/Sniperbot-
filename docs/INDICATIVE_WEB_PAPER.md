# V0.5: Indikative WEB-PAPER-Belege statt falscher Datenlücken

Der ursprüngliche Cleanroom-Vertrag unterscheidet:
- \`FRESH_WEB\`: bis 90 Sekunden alte Quoten (separate Zeitbelege).
- \`INDICATIVE_WEB_ONLY\`: **zwei echte, verschiedene öffentliche Pool-Detailseiten**, beim tatsächlichen Abruf vor maximal zehn Minuten mit genau gleicher Chain+Pool-Identität, vollem Token-Contract-Beleg, beiderseitigen Preisen und Liquiditäten. Dieses ist ausdrücklich ein Modellpreis, keine ausführbare Echtgeldquote; abweichende Anbieter-Preiszeitpunkte bleiben offen.

**Diagnose:** Dot 3 hatte teils nur deshalb jeden Kandidaten als DATA_GAP markiert, weil die Anbieter-HTML-Seite kein Kalenderdatum für den angezeigten Kurs enthielt. Für \`INDICATIVE_WEB_ONLY\` ist jedoch ein nachweisbarer **eigener Zeitpunkt, zu dem die öffentliche Seite mit dem angezeigten Preis wirklich gelesen wurde**, der deklarierte Webseiten-Beobachtungszeitpunkt. Er darf niemals als vom Anbieter selbst bestätigter Kurszeitpunkt etikettiert werden.

## Verbindliches Verhalten

1. Dot 2/3 lesen tatsächlich eine exakte, echte Pool-Detailseite von GeckoTerminal und eine von DEX Screener. Beide Seiten mit Preis/Liquidität im konkreten Cloud-Lauf erfassen.
2. Zu jeder Beobachtung ein **neues unveränderliches Original-Belegobjekt** mit Quell-URL, Chain, Token-Contract falls erkennbar, Pool, Symbol, tatsächlichem UTC-Abrufzeitpunkt, angezeigtem Preis/Liquidität, vom Anbieter belegtem Kurszeitpunkt oder \`null\` und Fehlern nach \`research/snapshots/YYYY-MM-DD/<runid>-<provider>.json\` speichern. Den echten Git-BLOB-SHA lesen. Eine gespeicherte Nacherzählung ohne abrufbare Quelle ist kein Beweis der Webdaten.
3. Dot 3 markiert \`INDICATIVE_PAPER_REVIEWABLE\`, **nicht** \`FRESH_PROVIDER_PRICE_VERIFIED\`, wenn zwei unterschiedliche tatsächliche Domains denselben Pool belegen, mindestens eine volle Contract-Identität direkt zeigt, beide Seiten im letzten 10-Minuten-Fenster tatsächlich beobachtet wurden, mindestens 5.000 USD angezeigte Liquidität vorhanden sind und die Preise um höchstens 3 % differieren. Ein fehlender separater Anbieter-Kurszeitpunkt ist als Restunsicherheit zu dokumentieren.
4. Dot 4 darf anhand dieses ausdrücklich indikativen Web-Paper-Befunds frei BUY/WATCH/NO_TRADE erwägen. Bei BUY/SELL führt er zunächst die gültige PAPER-Order-Publisherprüfung aus, verifiziert zuerst die Belegobjekt-SHAs und beobachtet, dass Order insgesamt binnen 5 Minuten abläuft. Er darf keinesfalls den Eintrag in \`signals/index.json\` fälschen, Papier-Fills vor einer realen Client-Quittung behaupten oder gegen belegtes Contract-/Risk-Versagen kaufen.
5. Bestehende Sicherheitsablehnungen (extrem niedrige Liquidität, unbestätigter Contract, divergierende Preise, ungeprüfte Sellability, mehrdeutiger Pool, blockierte Quellen) gelten weiter. Eine Webseite allein ist keine Sicherheit für die Verkaufsfähigkeit.
6. \`src/indicative-web-evidence.mjs\` prüft die interne Datensatzstruktur und kann KEINE Echtheit von Webbelegen oder SHA-Dateien bestätigen. GitHub-Blob und Originalquelle müssen über die Cloud-Recherche separat tatsächlich nachgewiesen werden.

**Training 12.10.2026 / Holdout 15.11.2026:** Diese Änderung ist nicht rückwirkend. Ein heute neu gelesener Poolpreis darf nicht als damalige Quotenbeobachtung eingetragen werden. Das Datum 15.11. bleibt ungeprüft, solange echte zeitgerechte Quellen fehlen.
