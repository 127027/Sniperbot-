# Sniper Research V1 – systematische Suche, gemeinsame Watchlist und Rollenauftrag

**Projekt:** `127027/Sniperbot-`; **Stand:** 09.11.2026; **ausschließlich nicht handelbare Forschung**. Historische Begründung: [MEMECOIN_10_CASE_STUDIES_20261109.md](MEMECOIN_10_CASE_STUDIES_20261109.md). **Dieses Playbook supersediert widersprüchliche ältere Suchanweisungen, nicht die Verhaltens-/Sicherheitsgrenzen.** Es schaltet weder externe Paper-Fills noch LIVE frei.

## 1. Wichtigster Fehler der bisherigen Pipeline und neue klare Arbeitsteilung

Bislang melden alle fünf Rollen nahezu stündlich `NO_VERIFIED_CANDIDATE`; Grund ist unter anderem ein Zirkelschluss: Der Scout wartet auf einen gemeinsamen überprüften Kandidaten, während Social/Onchain/Security/QA ebenfalls auf diesen warten. Zugleich wurden häufig nur dynamische Web-Neupoolindizes ohne Adressen gelesen.

**Neu: Discovery darf und SOLL einen Kandidaten nach erster nachweisbarer Identität allein auf die Watchlist setzen.** Ein **einziger** echter Pool mit eindeutig bestätigter `chain:token_address:pool_address`-Identität ist ein **Research-Kandidat**, keine Freigabe. Er benötigt noch keine fünf Stimmen, nicht einmal einen positiven Social-Trend, um beobachtet zu werden. Fehlt die überprüfbare Adresse, darf das System eine Indexnotiz aufbewahren, **aber keinen Kandidateneintrag erfinden**.

**Rollenverteilung:**
- **R1 news_discovery / Meme Scout:** Entdecken, Token/Pool-ID auflösen, Watchlist als **einziger Schreiber** führen; Sektoren/Chains abdecken, Recheck-Zeitpunkte setzen; bestehenden unveränderten `research_notice.v1`-Scout-Feed weiterpflegen.
- **R2 social_acceleration:** priorisierte Watchlist-Kandidaten; unabhängig organische Autoren/Community und Paid-Boosts voneinander unterscheiden. Nicht wiederum eigenständig dieselbe GeckoTerminal-Liste abtippen.
- **R3 onchain_liquidity:** aus den IDs der Watchlist konkrete Pools/Wallet-/Liquidity-Zeitreihen und mögliche Exit-Quotes untersuchen; fehlende Minutenserie als UNKNOWN.
- **R4 contract_security / Techniklabor:** für dieselben IDs Contract-/Tokenkonto-/LP-/Transfer-/Sellability-Risiken prüfen, separat technische Architektur-Erkenntnisse nur bei neuen verifizierten Befunden.
- **R5 opportunity_qa:** Forschung der anderen für dieselbe ID/Beobachtungsperiode zusammenführen, abhängige Quellen identifizieren, Negativhypothesen und Risikolücken dokumentieren. Keine fünfte Kopie derselben Neupool-Webseite.

**Getrennt:** unabhängiger echter Contract-/Pool-/Sellability-Validator, zentraler signierter Publisher und Live-Marktdienst sind **BLOCKED / nicht implementiert**. Fünf ChatGPT-Titel bedeuten weder 5/5 handelbares Quorum noch 24/7-Echtzeitbetrieb.

## 2. Reale Datenquellen, Kosten- und Qualitätsgrenzen

| Aufgabe | Quelltyp | Dokumentation | Warnung |
|---|---|---|---|
| neue Pools über Netzwerke | GeckoTerminal öffentliche API `/networks/{network}/new_pools` | https://api.geckoterminal.com/docs/index.html | öffentliche Limits/Rate-Limits, nur unterstützte Networks; einen HTML-Index **nicht** als eindeutige Adresse behandeln |
| Pool-/Mint-Adresse, DEX-Pair-Infos | DEX Screener `/token-pairs/v1/{chain}/{token}`, `/latest/dex/pairs/{chain}/{pair}`, `/tokens/v1/{chain}/{tokens}` | https://docs.dexscreener.com/api/reference | korrekte Chain-ID/Contract/Pair vergleichen; Pair-Suche nach Namen allein unzureichend |
| Pool-Zeitreihen und Trades | GeckoTerminal `/networks/{network}/pools/{pool}/ohlcv/{timeframe}` und `/trades` | https://api.geckoterminal.com/docs/index.html | API-Daten nicht als ausführbare Swap-/Sell-Quote ausgeben; Snapshot-Zeit belegen |
| Promotions-/Sichtbarkeitsmessung | DEX Screener `/token-boosts/latest/v1`, `/orders/v1/{chain}/{token}` | https://docs.dexscreener.com/api/reference | Boost/Ad ist **bezahltes Marketing**, kein organisches Kaufsignal |
| Contract-/Chain-Integrität | offizielle Explorer/RPCs + Contract-Transaktionen/Mint-/Pool-Creator | chainabhängig, technisch zu prüfen | ein Social-Post beweist keinen Contract; Quellen dürfen denselben Aggregator nicht doppelt zählen |
| öffentliche Social-Belege | datierte, direkt verlinkbare öffentliche Posts/Threads, ggf. verfügbare offizielle APIs | nur nach tatsächlich verfügbarem legitimen Zugriff | keine erfundenen Unique-Author-/Follower-Zeitreihen, private/unerlaubte APIs/Umgehungen |
| Risk/Sellability | unabhängige vertrauenswürdige Chain-/Contract-Validatoren und komplette plausible Sell-Route | **aktuell BLOCKED** | ein Kurschart, Pair-Listing oder bloßes `PASS` von KI ist keine reale Sell-Ausführung |

Keine kostenpflichtigen Abonnements, verdeckten API-Zugänge, Wallet-Keys, Chain-RPC-Accounts oder Dienstverträge selbständig anlegen. Bei fehlendem Quellzugang präzise `SOURCE_UNAVAILABLE` protokollieren und mit unabhängiger legaler kostenloser Quelle fortfahren oder UNKNOWN markieren.

## 3. Vom ersten Sichtkontakt zur langfristigen Beobachtung

### T0: Neue Pool-Entdeckung (Scout)
1. Prüfe pro Lauf **jede der vier vorhandenen Kernchains** (Solana, Base, Ethereum, BNB). Zusätzliche Chains **nur** mit unterstützten Token-/Pool-IDs und tatsächlich erreichbaren Daten; wenn keine, als coverage_gap dokumentieren.
2. Beschränke zunächst auf DEX-Pools mit neuem `created_at`/Pair-Zeitstempel; danach auf *früher entdeckte* Pools mit neuen Ereignissen. Nicht nur Top-Trending, weil diese oft bereits hoch gelaufen sind.
3. Extrahiere Chain, echten Token-Mint/Contract, echten Pool-/Pair-Contract und Quellen-URL. Validiere Adressform **chainabhängig**. Nutze zweite Datenstelle/Explorer für Zuordnung und Pair-Zeit; bei Konflikt als `IDENTITY_CONFLICT` notieren, nicht zusammenführen.
4. Sobald Chain+Token+Pool plausibel und quellbelegt: **`CANDIDATE_OBSERVED` mit dieser eindeutigen ID** publizieren – selbst wenn Preis, Sellability und soziales Wachstum noch UNKNOWN sind. Das ist keine Trade-Freigabe. Sei defensiv bei Klonen.
5. Schreibe/aktualisiere die **persistente** nicht handelbare Watchlist `research/watchlist/current.json` als alleiniger Writer mit Datei-SHA und Readback. Jeder tatsächliche Schreib-Commit muss als eigenes Ergebnis protokolliert werden.

### T1: Vertiefung (alle anderen Rollen)
1. **Immer zuerst** Watchlist und fremde Rollen-Snapshots lesen; *maximal 5* priorisierte fällige IDs vertiefen, statt ohne Adressen immer wieder beliebige Trefferlisten zu durchforsten.
2. Pro ID und unabhängigem Beobachtungsfenster messen oder `UNKNOWN` melden. Gegenbelege ausdrücklich sichern; dieselbe Primärquelle über andere Artikel zählt nur einmal. Eine Rolle kann mehrere IDs beobachten.
3. Niedrige Priorität sofort nur dann neu prüfen, wenn ein neues reales Ereignis oder `next_check_not_before_utc` erreicht ist.
4. Findings im **eigenen bestehenden** `research_role_snapshot.v1`-Schema und eigener Rollen-Datei veröffentlichen (nur Information, exakte zugelassene Felder). Keine zusätzlichen Felder in diese bestehenden strikten Nachrichten hineinmogeln.
5. Keine Kauf-/Verkaufssignale, echten `risk_assessment.v1`-PASS oder Ed25519-Signaturen erzeugen. Bei Konflikten `WATCH`/UNKNOWN und Hinweis im `summary`.

### T2: Review / Status-/Zeitplanung (Scout als Watchlist-Verantwortlicher)
1. Übernehme nur **nachweisbare eigene** und abgeleitete Rollenerkenntnisse; aktualisiere `last_checked_at_utc`, `next_check_not_before_utc`, `state`, `priority` und vorhandene `unresolved_checks`.
2. Watchlist-Zustände: `NEW` (unbestätigte Tiefe), `WATCH` (beobachten), `DEEP_REVIEW` (aktuell relevante Gegen-/Positivbelege), `REJECTED` (belegte Risk-/Identitäts-/Unverkäuflichkeitsprobleme), `DORMANT` (vorläufig inaktiv), `ARCHIVED` (mit Grund/Revision). **Kein Zustand ist PAPER_ELIGIBLE.**
3. Wiedervorlage gemäß Forschungs-Dringlichkeit und echten Daten: `DEEP_REVIEW` beim nächsten stündlichen Dot-Lauf; `WATCH` nach 1–6 Stunden; `DORMANT` nach 24 h oder wenn wirklich neue Ereignisse eintreffen; `REJECTED` nur bei nachprüfbarem Fehler neu öffnen. Dies sind **Forschungsintervalle**, keine Echtzeit-Handelsintervalle.
4. Coin ohne neue Prüfung nicht unendlich als „aktuell“ betrachten; jeder beibehaltene Befund bekommt eigene `observed_at_utc`, `freshness` und wiederverwendete Quellenkennzeichnung.
5. Die Historie im Repo/Commits lässt alte Watchlist-Versionen nachvollziehen, ist aber kein zuverlässiger eigener Event-Store; für lange Zeitreihen braucht das Projekt einen separaten persistenten Daten-Collector.

### Identitäts- und Zeitregeln
- `candidate_id = chain:token_address:pool_address`; EVM-Adressen lowercase, Solana Base58 case-sensitive. Paare mit demselben Token aber **unterschiedlichen Pools** sind getrennte Kandidaten (für Token-Aggregation eine separat definierte token_id).
- `first_seen_at_utc` = **erstmals vom System beobachtet**, NICHT ohne On-chain-Beleg das Erstellungsdatum. `created_at_utc` als separates Feld nur wenn quellbelegt; `last_checked_at_utc` ist kein Kursstempel.
- Nicht dieselbe `summary` fünfmal als unabhängige Bestätigung zählen. Refuse malformed/duplizierte IDs, Zukunfts-Zeitstempel, verlorene SHA-Konkurrenz, Key-/Wallet-Felder.
- `status=NO_VERIFIED_CANDIDATE` bleibt korrekt, wenn die Identität **nicht** verifizierbar ist – aber nicht, weil noch kein QA-/Risk-PASS vorliegt.

## 4. Getrennte Suchregime statt alles beliebig oft zu suchen

| Regime | Ziel | Rollen / Recheck |
|---|---|---|
| **Launch / Pool Birth** | in neuen Poollisten echte Token-/Pair-Adressen finden | Scout T0 jede vorhandene Chain, neue Listings seit letztem Check; zeitlich begrenzter Rückblick bei Ausfall |
| **Acceleration** | ungewöhnlich starke **qualitätsgeprüfte** Liquiditäts-, Wallet- und Social-Beschleunigung | Social/Onchain eigene fällige Watchlist-IDs; Vergleich mit *eigener* voriger Messung |
| **Reacceleration** | längere bekannte Community mit neuem Kaufdruck, Chain-Welle oder offiziellem Listing | Scout/QA Watchlist DORMANT mit neuer überprüfbarer Nachricht wieder eröffnen |
| **Exit/Risk Deterioration** | große Holder-Abverkäufe, LP-Entzug, unbrauchbare Sell-Route, stagnierende Käufer | Onchain/Security/QA; nur Research-Warnung, kein automatischer SELL |
| **Blacklist/Negative Controls** | gescheiterte Wellen/Manipulationen, false positives zur Bewertung | QA jede Woche anhand dokumentierter Beispiele, keine nachträglichen Profit-Fiktionen |

**Bewertungs-Hypothesen, noch NICHT kalibriert:** (1) unabhängige Käufer **und** unabhängige organische Autoren beschleunigen; (2) relative Chain-/Sektor-Liquidität verbessert sich; (3) Listings sind zeitlich dokumentiert (nicht nur Gerüchte); (4) neue Community hält über mehrere Stunden/Tage; (5) Contract-/Sellability-/LP-Risiken sind unabhängig überprüfbar. Fehlende (5) blockiert eine spätere Handelsfreigabe immer, ist aber **kein Grund**, den Kandidaten nicht zu beobachten.

**Keine erfundenen Werte:** wenn nur `priceChange.m5` bekannt ist, daraus kein 5-Minuten-Handelsvolumen oder unique-buyer-Zahl machen; wenn Paid-Boost vorhanden ist, nicht als organische Follower-Zunahme ausgeben. Vor jeder Prozentveränderung müssen Basiswert, Datenquelle und Zeitraum vorhanden sein.

## 5. Snapshot-/Watchlist-Vertrag – vollständige Datentrennung

**Bestehende fünf Rollen-Snapshots unverändert:** `research/roles/{role}/latest.json` mit exakt `schema, role, producer, snapshot_id, published_at_utc, paper_only:true, actionable:false, status, candidates, summary`; jeder `candidates[]`-Eintrag hat `chain, token_address, pool_address, candidate_id, observed_at_utc, source_urls, evidence_summary, risk_flags`. `status` ist ausschließlich `CANDIDATE_OBSERVED` oder `NO_VERIFIED_CANDIDATE`. Keine zusätzliche `vote`-Fantasie, kein `paper_execution_decision.v1`.

**Neue Watchlist:** `research/watchlist/current.json`. **Eigentümer nur Scout**; andere lesen und schreiben allein in eigenen Rollen-Dateien. Sie ist *Research only*, nicht automatischer Trading-Eingang.

```json
{
  "schema": "research_watchlist.v1",
  "producer": "Meme Scout – Forschungsradar",
  "published_at_utc": null,
  "paper_only": true,
  "actionable": false,
  "candidates": []
}
```

Bei echten Kandidaten enthalten die Watchlist-Einträge genau `chain`, `token_address`, `pool_address`, `candidate_id`, `first_seen_at_utc`, `last_checked_at_utc`, `next_check_not_before_utc`, `state`, `priority` (`HIGH|NORMAL|LOW`), `source_urls`, `reason`, `unresolved_checks`. **Keine** zentralen Kapitalwerte, Kauforder, Schlüsseldaten, behaupteten Gewinne, börslichen Preisziele oder erfundenen Token.

Bestehende Watchlist beim Aktualisieren per SHA einlesen, Kandidaten-ID deduplizieren und `first_seen_at_utc` erhalten, selbst wenn neue Preise oder Namen erscheinen. Bei `REJECTED` Blocker sowie Recheck-Auslöser dokumentieren. Fehlende Kandidaten **nicht automatisch** löschen, sonst fängt die nächste Forschung wieder bei Null an.

Der pure, offline ausführbare Helper `runner/research-watchlist.mjs` liefert eine validierbare deterministische Merge-/Fälligkeitslogik; das ist **kein** laufender Agent oder GitHub-Actions-Cron.

## 6. Unabhängiger Qualitäts-/Performance-Messplan

Für jeden *damals* in Watchlist aufgenommenen Kandidaten unveränderlich sichern: Kandidaten-ID, Beobachtungszeit, Datenherkunft, unbekannte Felder, initialer Messwert, spätere Quotes/Preissnapshots (nur auf gleichem Venue/Pool, sonst nicht vergleichbar), nächste 1h/6h/24h/7d/14d/18d Zeiten, Scheitern/Exit-Unmöglichkeit. Diese Horizonte sind **Evaluationsfenster**, keine Profitversprechen oder feste Haltedauer.

Gegenproben als echte neu entdeckte Pool-Kohorten derselben Stunde/Chain auswählen, darunter erfolglose Coins, unterbrochene Liquidität, unvollständige Daten und prominente Werbe-Pumps. Ergebnisse: `precision@k`, Recall nur wenn Grundgesamtheit hinreichend vollständig, Coverage, False Positive Rate, Signallatenz, Drawdown, Market-Impact und Sell-Quote-Erfolgsquote. **Nicht** nur Topgewinner im Nachhinein zählen.

Ein Score 80/92 bestimmt lokal die *Positionsgröße*, aber die Dots dürfen ihn ohne Out-of-Sample-Validierung nicht als „80%/92% Gewinnwahrscheinlichkeit“ verkaufen. Aus `CANDIDATE_OBSERVED` wird **nicht** automatisch ein `PAPER_BUY`.

## 7. Umsetzungsschranken / Folgen der Umstellung

- Betroffen sind ausschließlich fünf bestehende Sniper-Automationsprompts; alle IDs, Zeitpläne, Aktivierungsflags, Hixton und `main` müssen bleiben. Scout behält den bewiesenen `research/feed/meme-scout-latest.json`-Statusfeed für den alten Windows-Info-Empfänger.
- Eine stündliche Recherche mit `condition_watch` kann Zeitpunkte verschieben. Angebliche 5-/15-Minuten-Messung muss von separatem externem Datendienst kommen oder **UNKNOWN** sein.
- Der Bot hat noch keinen echten Ed25519-Publisher-/Broker und keine unabhängige Contract-/Sellability-Adapter. Nicht handelbare GitHub-Forschungsdateien dürfen **nie** an `/api/decisions/events` als signierte Entscheidung weitergegeben werden.
- Keine Datenzugriffe jenseits tatsächlich vorhandener Quellen, keine zusätzlichen zahlungspflichtigen Dienste, kein Echtgeld, keine Wallet/PayPal und keine Token-Orders.

**Abnahmekriterium für Research-V1:** Ein Scout-Lauf bestätigt erstmals einen echten Pool/Token, setzt die korrekte ID in Watchlist und eigenen Snapshot, mindestens zwei weitere Rollen liefern unabhängig belegte oder ausdrücklich UNKNOWN-Berichte **für genau diese ID**; QA markiert Quellenabhängigkeiten. Das ist ein **Forschungs-Erfolg**, noch kein Kaufsignal.


## 8. Belegter erster Lauf nach der Umstellung: Datenzugangsblocker

Im **wirklich geplanten Scout-Lauf am 09.11.2026 um 13:03 UTC** wurden dieses Playbook, die zehn Fallstudien und die vier fremden Rollen-Snapshots erfolgreich gelesen. Der Scout rief strukturierte GeckoTerminal-Neupool-Endpunkte für Solana, Base, BNB und Ethereum auf. **Aus dieser konkreten Automationslaufzeit** kamen bei Solana keine auswertbaren Pools zurück; Base/BNB/Ethereum lieferten Web-Zugriffsfehler, und ein direkter API-Aufruf scheiterte an DNS. Der Scout erzeugte weder Contract-/Pool-Adressen noch fiktive Käuferdaten. Er schrieb aber per GitHub-SHA-Konfliktschutz drei vorhandene/ausdrücklich freigegebene Research-Dateien mit Readback, einschließlich dieser Watchlist mit `published_at_utc=2026-11-09T13:03:33.025Z` und weiterhin `candidates=[]`. Die tatsächlich veröffentlichte Watchlist ist **nur Research, kein Signier-/Marktfeed**.

**Anpassung an den konkreten Blocker:** 
- Im selben Lauf **keinen identischen DNS-/HTTP-Fehler fünfmal wiederholen**. Nach einem belegten Ausfall pro Provider/Chain den tatsächlichen Fehlertyp in die Zusammenfassung aufnehmen. Einen zweiten strukturierten, zulässigen kostenlosen Anbieter **nur bei tatsächlich verfügbarem Toolzugang** prüfen; niemals JSON, Token, Quote oder Adressen aus alten Berichten als frisch ausgeben.
- Bei wiederholt blockierter Quellkombination die betreffenden APIs für den **nächsten Research-Lauf** auf `SOURCE_UNAVAILABLE` setzen; höchstens einen kontrollierten Wiederholungsversuch je Quelle und Lauf, mit dokumentiertem Zeitstempel. Freiwerdende Recherchezeit für bereits bestätigte Watchlist-IDs oder neue unabhängige Quellen nutzen. Die Watchlist bei fehlenden Daten **nicht leeren**.
- Wenn **alle** direkt brauchbaren API-/RPC-Zugriffe in der Cloud-Automation blockiert sind: `BLOCKED_RESEARCH_DATA_ACCESS` ausdrücklich an das Entwicklerprojekt melden. Durch bloß mehr textuelle Suchanfragen oder weitere Dot-Titel wird dieser Blocker **nicht** gelöst.
- Der sinnvolle nächste technische Baustein ist ein dauerhaft laufender, getrennter **read-only Markt-/Pool-Collector** auf autorisiertem Host (Laptop oder anderer erreichbarer Dienst) mit dokumentierten öffentlichen APIs/RPCs, Rate-Limits, timestampeten JSON-Fakten, resilientem Backfill und abgesicherter Veröffentlichungsstrecke. Dieser Datenprozess darf **keine** Wallet-, Guthaben- oder Trade-Berechtigungen erhalten. **Er ist hier weder eingerichtet noch auf dem Windows-Laptop gestartet.**
- Die stündliche ChatGPT-Forschung bleibt Zusatzanalyse; sekunden-/minütliche Detektion ist aus ihr allein unmöglich. Bei vermeintlichen 5m-/15m-Trends ohne solche Rohdaten immer UNKNOWN.

**Wichtige Coding-Praxis:** GitHub Actions-Tests dürfen nicht erwarten, dass eine von einem echten Dot regelmäßig aktualisierte Watchlist ewig ihren ursprünglichen `published_at_utc:null` behält. `runner/research-watchlist.test.mjs` prüft stattdessen das **Schema und die Nicht-Handelbarkeit** der jeweils vorliegenden Datei.
