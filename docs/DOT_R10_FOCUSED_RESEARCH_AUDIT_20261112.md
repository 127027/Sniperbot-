# R10 – Zielgerichtete fünf Forschungs-Dots (12.11.2026)

## Bestätigte Engpässe
- Die fünf bestehenden stündlichen Prompts waren auf ca. 13–33 Tsd. Zeichen je Rolle angewachsen; R07/R09-Tests und wiederholte Sicherheitsabsätze konkurrieren mit der eigentlichen LIVE-Entdeckung.
- Auf `codex/research-gateway-v04` stammt `research/market/latest.json` noch von **2026-11-11T02:44:43.307Z**. Deshalb sind alte 75 Kandidaten, 24 Narrative und Alerts keine aktuellen Kauf- oder Entdeckungssignale.
- Die unabhängigen LIVE-Rollen haben trotz wiederholter Recherchen keine frische, vollständig verifizierte Chain:Token:Pool-Identität und keine bestätigte Sell-Route. JSON im Web teils erreichbar, aber nicht strukturiert zuverlässig auslesbar; einige Provider-/Pair-Requests schlagen fehl. Das ist eine **Daten-/Adapter-Lücke**, kein allein durch bessere Prompts lösbares Problem.
- In R09 sind nur die Social- und Contract-Security-Nachprüfungen als unabhängige historische Rollen abgeschlossen; die übrigen warten. Das isolierte R09-Testprojekt ist nicht mit der normalen LIVE-Suche zu vermischen.

## Neue LIVE-Arbeitsverteilung pro Lauf (zwingend)
Jede Rolle beendet ihren Bericht mit belegtem Ergebnis statt mit endloser breiter Suche. Ein stündlicher Dot ersetzt keine durchgehend laufende maschinelle Ereigniserfassung.

**Scout/news_discovery**: Erst ORIGINAL-EVENTS vor dem Coin, dann NEW-POOL-Erkennung. Priorität: (1) aktuelle eigene Originalereignisse (2) neue Launches (3) maximal fünf due-Watchlist-Rechecks. Ein auftauchendes Meme ohne Tokenadresse ist ein echter `NARRATIVE_WATCH`-Lead. Verwechsle den ersten beobachteten Zeitpunkt nicht mit einem rückwirkend behaupteten Veröffentlichungsdatum.

**Social/social_acceleration**: Recherche eigener originaler öffentlicher Posts/Autoren; prüfe mehrere voneinander unabhängige Quellen, organisches vs Paid/Bot-Muster. Ein positiv beschriebener Token ohne geprüften Pool erhält `SOCIAL_WATCH`, nicht BUY. Nicht nur den Scout wiedergeben.

**Onchain/onchain_liquidity**: Proaktiv Neu-Pools aus quellüberprüfbaren strukturierten Onchain-/DEX-Daten finden, Chain/Mint/Pool und Zeitpunkt begründen. Frischen Stale-Feed nie als 2026-Nachweis übernehmen. Wenn eine API nur als Websnippet oder unlesbares JSON verfügbar ist: `JSON_NOT_PARSED` plus verwendete Endpoint-URL; fehlender Schlüssel `AUTH_REQUIRED`, 429 `RATE_LIMIT`, sonst `SOURCE_UNAVAILABLE`, statt Präzision zu behaupten. Fehlende Sell-Route verhindert Handelsvorschlag, NICHT Dokumentation einer erkannten Coin-Identität.

**Contract/contract_security**: Prüfe die besten maximal fünf KONKRET vorliegenden Token-Identitäten, statt allgemeine Windows-Bot-Architektur zu recherchieren. Mint/Freeze, LP-/Holder-Konzentration, Tax/Blacklist/Proxy, unabhängige größenabhängige Sellability; bei fehlender belegbarer Prüfung `UNKNOWN`, niemals `PASS`. Wenn keine neuen Kandidaten vorhanden, priorisiere fehlende Sicherheitskontrollen der fünf höchstpriorisierten fälligen Bestands-Candidates; nur bei echter Quellenverfügbarkeit.

**QA/opportunity_qa**: Prüfe die stärksten Forschungsleads adversarial; Quellenunabhängigkeit und zeitliche Aktualität, Schutz vor Pump-/Marketing-Lookahead, Fehlalarme und bewusst abgelehnte Fälle. Liefere `WATCH`, `NEEDS_MORE_DATA`, `BOT_REVIEW_CANDIDATE`, `REJECT` mit Gegenbeleg. Keine scheinpräzisen 95-%-Erfolgswahrscheinlichkeiten ohne valide Kalibration.

## Begrenzter Ablauf / Output
1. **Freshness-Gate**: Marktfeed älter als 45 Minuten als `STALE` kennzeichnen, keine Kaufdaten aus ihm ableiten. Pro Rolle unabhängige neue Quelle versuchen. `published_at_utc` und `observed_at_utc` unterscheiden.
2. **Bounded Search**: Zunächst 3 verschiedene Quellfamilien versuchen (z. B. neue Pool-/Explorer-Daten, Original-Social/News, direktes Pair-/RPC-Readback); höchstens 12 gezielte Live-Quellenabfragen, danach Bericht mit Quellenproblemen. Nicht dutzende alte Artikel wiederholen. Maximal 5 NEW-Leads und 5 priorisierte Bestands-Rechecks pro Rolle berichten; keine Vollständigkeit behaupten.
3. **Stufen**: `NARRATIVE_WATCH` (Meme ohne Coin), `TOKEN_IDENTIFIED` (Chain+Mint+Pool), `RISK_REVIEW`, `BOT_REVIEW_CANDIDATE` (nur bei unabhängiger Security + verkaufbarer aktueller Quote). Unvollständige Voraussetzungen blockieren den *nächsten* Status, nicht den früheren Fund.
4. **Provenienz**: Original-URL, Uhrzeit, Art der Beobachtung, Original-/abgeleitete Quelle, idempotente Ereignis-ID, was noch unklar ist. Niemals Coin-Contract aus einem Symbol raten; Promotion ≠ unabhängiger Hype. Bei leerem Fund: Quelle/HTTP- oder Parser-Blockade samt exaktem Fehlgrund melden. Keine ausführbare Order/Signatur.
5. **Output kompakt**: UTC, gescannte Quellen/Erfolge/Fehler, 0–5 neue Beobachtungen mit Erstzeit und Kategorie, 0–5 neue überprüfte Identitäten, 0–5 Widersprüche/Risiken, nächste konkrete Daten-Lücke. Reuse `research/roles/<role>/latest.json` auf dem bestehenden research-Gateway-Branch **nur wenn bereits autorisiert**, bestehendes JSON-Schema validieren und Git-SHA-Konflikte nie übergehen. Keine anderen Role-Dateien überschreiben; LIVE und Historie getrennt.

## Historische R09-Aufgabe
Einmalig weiterführen **nur wenn** `research/historical/R09/independent/<role>.json` auf `codex/dots-r09-source-grade-20261112` noch `PENDING` ist. Historie nicht in jeden Live-Bericht hineinziehen. Die bisherige validierte R09-Provenienz ist bindend; ein `inline_run` ist kein selbstständiger geplanter Cloud-Dot-Lauf. QA darf erst nach vier nachweislich unabhängigen Berichten attestieren.

## Messkriterien
- LIVE: neue Originalnarrative / Stunde, neue exakte Pool-Identitäten / Stunde, Verifikationsquote, Anteil frischer Quellen, durchschnittliche Minuten bis erste Beobachtung, provider- und parserspezifische Fehler, Doppelzählungen.
- R09: tatsächlich unabhängige Rollenberichte, ursprüngliche Tages-Capture-Belege, sichere historische Token/Pool-/Quote-Daten, getrennte Fehl-/Gewinnerkohorten. Datierte öffentliche Beiträge ohne as-of-Originalbytes sind nur vorläufig, kein bewiesener Paper-Kauf.
- Zusätzliche Windows-/Cloud-Collector-Integration ist erforderlich: Ein Stunden-Dot kann Ereignisse, die in Minuten entstehen, nicht lückenlos überwachen. Diese Infrastruktur gehört in den separaten Bot-/Collector-Entwicklungsauftrag; hier nur Nachweise und Schnittstellen spezifizieren.

**Sicherheitsgrenze:** ausschließlich Research. Kein Echtgeld, kein Paper-Bestand, keine Wallet, keine Trading-Engine verändern. Der Bot entscheidet allein über Kapital und Ausführung.