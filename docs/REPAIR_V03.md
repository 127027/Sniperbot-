# R29 Cleanroom: nachgewiesene Ursachen und V0.3-Korrekturen

**Bereich:** ausschließlich `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`. Paper-only, kein main, kein alter Bot.

## Befunde
- **Contract-Auflösung:** Dot 2 dokumentierte sieben Pools, aber keinen vollständigen Token-Contract. Dot 3 konnte DRB erst durch den eindeutigen DEX-Screener-Explorerlink zuordnen. Die Lösung ist auf Recherche-/Quellenebene nötig: Auf exakten Pool-Detailseiten nach vollständigen verlinkten Tokenadressen suchen, niemals aus Tickern oder Pooladressen erraten. Ein Explorerlink ist nur begrenzter Identitätsbeleg.
- **Quelle/pool-Mismatch:** Der lokale Client prüfte zwar unterschiedliche HTTPS-Domains, aber bisher nicht, ob die URLs wirklich genau denselben Pool enthalten. V0.3 validiert zugelassene öffentliche Detail-URLs von GeckoTerminal und DEX Screener mit identischer Chain/Pooladresse. Indikative Orders mit Dummy-Contract werden abgelehnt.
- **Preiszeitstempel:** Anzeigen wie „11:18 UTC“ ohne verifizierbares Kalenderdatum dürfen nicht als nachweislich frische Anbieter-Quotes interpretiert werden. Dieser externe Datenmangel lässt sich nicht per Codepatch beheben: mit DATA_GAP protokollieren; niemals ein Anbieter-Datum aus der Abrufzeit ableiten.
- **GitHub-Receipts:** Bei verlorener Antwort oder einer Wiederholung konnte GitHub „Datei existiert“ melden. V0.3 vergleicht bereits veröffentlichte Quittungen exakt und erklärt nur identischen Inhalt als zugestellt; fremde Receipts werden nicht überschrieben.
- **Unzureichende Discovery-Abdeckung:** Dot 2 untersuchte nur sieben Pooldetails und keine vollständig paginierte Marktmenge. Dot 2 muss echte untersuchte Listen/Seiten, Fehler sowie Auswahlgrenzen dokumentieren, Dot 3 gezielt zweite Poolseiten und Explorerlinks prüfen. Kein künstlicher Anspruch auf vollständige Abdeckung.

## Betriebsauftrag an die Cloud-Dots
Dot 2: Je Chain aktuelle New-Pairs-, Trending- und Revival-Listen inklusive tatsächlich abrufbarer weiterer Seiten durchsuchen. Alle gefundenen Pool-IDs, Original-URLs, Zeiten und riskante/unvollständige Kandidaten erfassen. Explorer-/Tokenlinks verfolgen und vollständigen Contract nur mit Quellenbeleg nachtragen.

Dot 3: Priorisierte konkrete Pool-IDs auf einer zweiten unabhängigen HTML-Pool-Detaildomain prüfen, tatsächlichen Contract-Link und Chain abgleichen, Preis/Liquidität und Abrufzeit getrennt von einer **belegten Anbieter-Kurszeit** abspeichern. Ohne belegbare Daten nicht ELIGIBLE erklären.

Dot 4: Keine rückblickenden Gewinner als Vorauswahl; gültige neue Quelle und Preise wirklich unmittelbar vor Orderpublikation prüfen. Keine erfundenen Zeitstempel oder synthetischen BUYs.

Dot 5/6: Fortschritt anhand der Contract-Vollständigkeit, 2-Quellen-Quote-Coverage, tatsächlicher Signals/Receipts und verpasster >100%-Coins messen und dokumentieren.

## Technische Abnahme
`npm test` auf dem Cleanroom-Branch muss die vorhandenen und zusätzlichen Sicherheits-, Mehrgeräte- und Retry-Tests bestehen. Ein solcher Test ist **kein** echter Paper-Trade. Offen bleiben prospektive Market-Coverage, echte Dot-4-BUY/SELL-Orders und echte Client-Quittungen.
