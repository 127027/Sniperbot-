# R29 V4.2 – vollständiger Kandidatentrichter nach gezielter Paging-Reparatur

**Bestätigt am 18.11.2026. PAPER_ONLY. Diese Datei ist OPERATOR-/POSTHOC-KONTEXT, niemals Input eines unabhängigen historischen GPT-Blindtests.**

## 1. Umgesetzter exakt nachgewiesener Bugfix

- [PR #56](https://github.com/127027/Sniperbot-/pull/56) **erfolgreich gemergt**, Merge-Commit `8ad1220cb789d95204aa79f9834c056344f23109`.
- [Vollständige erfolgreiche Oktober-CI einschließlich Referenzabgleich](https://github.com/127027/Sniperbot-/actions/runs/44265274289) auf finalem PR-Head `af9325ea668889f8fd0b97599313935d4400fed9`. Vorheriger ausführlicher gleichwertiger Echtdatenlauf: [44264148662](https://github.com/127027/Sniperbot-/actions/runs/44264148662). Windows-/Linux-Paper-Regressionen: [44265274356](https://github.com/127027/Sniperbot-/actions/runs/44265274356), **SUCCESS**.
- Ursache war `reviews.append(review_at_cached(..., cutoff))` ohne Seitennummer: die historische `ASOF_HOURLY_RESEARCH_QUEUE.json` exportierte nur Seite 0 mit maximal 64 Mints pro Stunde. **284.521** Kandidaten-Prüfzeitpunkt-Paare fehlten in diesem Export.
- **Jetzt:** `review_all_pages_at_cached` bildet alle Seiten aus genau **einer** deterministisch sortierten as-of Momentaufnahme je Stundencheck. Alle Kandidaten werden unter `hourly-pages/YYYY-MM-DD.jsonl.gz` gespeichert, jede Original-Merkmalsentscheidung einschließlich negativem Grund unter `feature-decisions/YYYY-MM-DD.jsonl.gz` und eine auf höchstens 16 pro potenziellem Stunden-GPT-Aufruf begrenzte, nicht handelnde Forschungspriorisierung unter `model-shortlists/YYYY-MM-DD.jsonl.gz`.
- Die vorbestehende `hourly_asof_research_queue_frames`-Zusammenfassung enthält aus Kompatibilitätsgründen weiterhin Seite 0. **Sie ist ausdrücklich nicht mehr das vollständige Forschungsergebnis.** Verbindlich sind die SHA-256-validierten komprimierten vollständigen Seiten plus das `hourly_asof_full_export_index` und die Verlustausschlusskontrolle.

## 2. Tatsächlich gemessene vollständige Originaldatenbilanz

| Messwert | Echtes Oktober-Ergebnis |
|---|---:|
| Gepinnte Solana-Launch-IDs 05.–21.10.2026 | 821.849 |
| Mints mit mindestens einem verknüpften Minutenmerkmal | 580.200 |
| Mints ohne jemals verknüpftes Minutenmerkmal | **241.649** |
| Originale Minutenmerkmal-Ereignisse | **2.296.466** |
| Mit Originalstarts verknüpfte Minutenmerkmale | 2.295.579 |
| Minutenmerkmal-Ereignisse, die technische Eignung erfüllten | 79.473 |
| Minutenmerkmal-Ereignisse, die technische Eignung NICHT erfüllten | 2.216.993 |
| As-of-Stundenprüfungen | 408 |
| Technisch zulässige Kandidaten-Prüfzeitpunkt-Paare | **310.540** |
| Vollständig exportierte Kandidaten-Prüfzeitpunkt-Paare | **310.540** |
| **Durch Paging unbemerkt verlorene Paare** | **0** |
| Persistierte as-of-Seiten insgesamt | **5.054** |
| Nicht handelnde vorgeschlagene GPT-Recherchekandidaten über alle Stunden | **6.325** |
| Wegen Quoten/Freshness zurückgestellt, aber vollständig archiviert | 304.215 |
| Echte historisch automatisch ausgeführte GPT-Modellaufrufe | **0** |
| Historische belegbare GPT-BUY-/SELL-Fills | **0** |
| Historisch realisierbarer Netto-PnL | **UNVERIFIED / null** |

Die Zahlen 79.473, 2.216.993 und 310.540 betreffen **Merkmalsereignisse bzw. wiederholte Kandidaten je Stundenpunkt**, nicht so viele unterschiedliche handelbare Coins. Die Source-Coverage bleibt auf das gepinnte retrospektive Solana-Archiv beschränkt und belegt keine damalige Live-Zustelllatenz.

**Jedes Merkmalsereignis hat jetzt einen technischen Grund.** Aggregierte Gründe (nicht unterschiedliche Coins):

| Grund | Historische Ereignisse |
|---|---:|
| Beobachtetes Pool-/Bundle-Risiko | 893.092 |
| Unbekannter experimenteller Launchmodus | 651.645 |
| Fehlendes Käufer-/SOL-Reserve-Signal | 337.361 |
| Technisch unzureichendes as-of Interesse | 305.702 |
| Hohe beobachtete Konzentration | 28.306 |
| Kein originaler Mint-Start verknüpfbar | 409 |
| Ungültiges Original-Merkmalsereignis | 228 |
| Merkmal liegt vor Original-Start | 250 |
| **Technisch positiv** | **79.473** |

Die Ablehnungen sind weder ein Beweis für Scam noch für schlechte Chancen; es sind konservative **technische Entscheidungen auf den vorhandenen Archivfeldern**. Sicherheitsregeln dürfen nicht deshalb abgeschaltet werden, weil ein Contract nachträglich als Gewinner bekannt wurde.

## 3. Genaue Oktober-Referenzverläufe (NUR POSTFREEZE)

Die Namen/Contracts waren **nicht** im Collector, Score oder GPT-Recherchequeue. Erst im separaten nach der neutralen Archiv-Freeze ausgeführten Job `r29-v4-postfreeze-funnel-reference.py` wurden sechs originale Verträge mit dem versiegelten neutralen Archiv abgeglichen.

| Fall | Erster archivierter Start UTC | Erste Merkmalsbeobachtung | Erste technische Eignung | Erste vollständige Seite / Rang | Erste potenzielle GPT-Recherche |
|---|---|---|---|---|---|
| PIERRE (Referenz 1) | 18.10., 16:22:16 | 16:22:42 | Keine | Keine | Keine |
| PIERRE (gleichnamiger Contract) | 18.10., 20:09:52 | 20:10:23 | Keine | Keine | Keine |
| **FTR** | **15.10., 01:59:28** | 01:59:34 | **02:00:35 (1,115 min nach Start)** | **03:00 UTC, Seite 7, Rang 460** | **03:00 UTC (60,526 min nach Start)** |
| Dacity (Referenz 1) | 11.10., 11:16:34 | 11:17:06 | Keine | Keine | Keine |
| Dacity (abweichender Contract) | 15.10., 13:22:47 | 13:23:17 | Keine | Keine | Keine |
| Trump $1 Coin | 15.10., 20:16:05 | 20:17:39 | Keine | Keine | Keine |

- **PIERRE:** beide Contracts hatten jeweils sechs technische Ereignisse mit Pool-/Bundle-Risikoflag, daher kein positives technisches Signal. Ob diese Archive-Flags eine real handelbare andere Poolidentität falsch klassifiziert haben, ist unabhängig zu prüfen; kein Gewinner-Whitelist-Patch.
- **Dacity:** erster Contract sieben, zweiter sechs technische Ereignisse mit `NO_OBSERVED_BUY_AND_RESERVE_SIGNAL`. Das reicht nicht für einen aktuellen BUY, obwohl die Mints erfasst wurden.
- **Trump $1:** vier Ereignisse ohne ausreichendes Käufer-/Reserve-Signal.
- **FTR:** ein zunächst unzureichendes Ereignis, dann technisch positiv (Score 7). In der **gesamten** Seitenhistorie war er zwar auf **Seite 7 (Rang 460)** sichtbar, aber von der früheren 64er-Seite ausgeschlossen. Die neue as-of Warteschlange hätte ihn **03:00 UTC** als Recherchevorschlag `HIGH_ASOF_PRIORITY` erfasst. Das ist **kein** tatsächlich erfolgter historischer GPT-Aufruf.
- Für **alle sechs** historisch tatsächlich `GPT_WATCH/BUY/SELL`: **MISSING**; historische Fills: **MISSING**, PnL: **null**.

Das authentische Postfreeze-Ergebnis inklusive exakter Mint-Adressen und jeder Ausschlussbegründung befindet sich als Actions-Artefakt bei [44265274289](https://github.com/127027/Sniperbot-/actions/runs/44265274289). Die Quelle selbst darf niemals als unsichtbar mittransportierte Blind-Prompt-Erfahrung verwendet werden.

## 4. Tatsächlich vom aktuellen GPT analysierte neue Forschungswarteschlange

**Nach Reparatur** wurde nach einem neutralen, nicht anhand bekannter Gewinner ausgewählten Regeln bestimmten Zeitpunkt `2026-10-12T01:00:00Z` ein Eingang aus **16 anonymisierten** Kandidaten zusammengestellt; **14** davon kamen aus den bisher nicht exportierten Seiten. `833` geeignete Coin-Zustände wurden auf `14` vollständigen Archiv-Seiten aufbewahrt. Maskierter Quelleninput-Digest: `8c894958662a7d5fdf116fa07e227694e4b072950320abfee60e6908ce0e518f`.

- Eine aktuelle GPT-6-Konversationsentscheidung wurde **vor dem erneuten Entsiegeln der IDs** im Commit `af9325ea668889f8fd0b97599313935d4400fed9` geschrieben: **6 WATCH, 10 NO_TRADE, 0 BUY, 0 SELL**. [Vollständige 16 Entscheidungen](../../replay-120d-real/reviews/2026-11-18-v4-2-01h-masked-complete-page-actual-gpt-decision.json).
- [Nur OPERATOR-seitige nachträgliche Case-ID-zu-Mint-Zuordnung](postfreeze/2026-11-18/R29_V4_2_MASKED_GPT_16_CONTRACT_UNSEAL_OPERATOR_ONLY.json), erst nach dem Entscheidungs-Commit veröffentlicht.
- Es handelt sich um **eine tatsächliche heutige GPT-Bewertung historischer Merkmale**, jedoch **KEINEN** unabhängigen, historisch damals gelaufenen Modellaufruf, keinen über externe API belegten modellgesteuerten Laptop-Trade und keinen neutralen unabhängigen Holdout. Der Chat kannte bereits historische Fallgruppen. Die sechs WATCH-Kandidaten sind unbewiesene Forschungsanlässe, keine Gewinner.
- Fehlende unabhängige Wallet-/Social-/Sicherheits- und bidirektionale Ausführungsdaten erlauben **keinen** belastbaren BUY-Fill oder Preis-/Gewinnausweis.

## 5. Live-Feed: aktuelle überprüfte Grenze (keine Scheinreparatur)

- Der bestehende Code kann bereits lokale aktuelle Pools via `runner/research-market-daemon.mjs` und `runner/r29-canonical-market-relay.mjs` auf den GPT-kanonischen Branch veröffentlichen.
- `research/market/latest.json` auf diesem Branch hatte bei letzter Diagnose nur `published_at_utc=2026-11-10T11:32:51.066Z`.
- Die echte GitHub-Laptop-Statusmeldung `research/r29/channel/regular-paper-presence.json` war zwar `2026-11-18T08:01:33.197Z` und meldete lokalen Paper-HTTP-Prozess erreichbar, jedoch **keine belegte aktuelle Marktfeed-Veröffentlichung**.
- Die erwarteten Quellen-Quittungen `research/r29/channel/forward-source-health.json` und `research/r29/channel/solana-forward-evidence.json` waren zum Prüfzeitpunkt auf dem kanonischen Branch nicht veröffentlicht (GitHub 404).
- **Es ist damit UNBEWIESEN, dass auf dem persönlichen Laptop bereits die neuesten Market-Collector-/Courier-Updates installiert sind bzw. dass die erforderliche lokal geschützte GitHub-Publisher-Berechtigung aktiv ist.** Ein GitHub-Commit kann den privat laufenden Windows-Prozess nicht ohne einen eingerichteten Rollout ersetzen. Keine Veröffentlichung aus alten Quellen als angeblich frisch.
- Konkretes nächstes lokales Abnahmekriterium: mindestens zwei aufeinanderfolgende frische, vom Laptop verfasste Original-Capture-Zeitstempel im kanonischen `research/market/latest.json` plus korrespondierende `forward-source-health.json`-Quittung; die GPT-Lesezeit/-Eingabezeit messen. Kein Echtgeld und kein historischer Kontozugriff.

## 6. Drei weitere Prioritäten – KEINE neuen Bots/Oberflächen

1. **Frühe Datenabdeckung/technische Qualitätsprüfung:** 241.649 Original-Mints ohne Minutensignale, Pool-/Bundle- und Experimentflags gegen unabhängige Quellen untersuchen; Gefahr falscher Ausschlüsse messen, nicht Gewinner nachträglich freischalten.
2. **Event→GPT-Latenz:** FTR zeigt 1,115 Minuten bis technische Eignung, aber 60,526 Minuten bis stündliche Forschungsempfehlung. Echtzeit-/5-Minuten-Ereignisreaktion nur innerhalb 1–24 tatsächlicher GPT-Analysen/Tag optimieren und als wirklich erfolgte Providerentscheidungen protokollieren.
3. **Originaler Live-Paper-Bot:** bereits vorhandenen lokalen Canonical-Publisher mit aktuellem Laptop-Build und Original-Quittungen nachweisen, dann authentifizierte tatsächliche GPT-WATCH-/BUY-/SELL-Receipts und wirklich marktpreisgestützte Paper-Fills nachweisen. Solange Live-Quellen/Sicherheit fehlen keine simulierten Gewinne zu echten Erfolgen erklären.

Die **zehn** historischen Tests mit sieben Entwicklungs- und drei unabhängigen Holdout-Fenstern bleiben Gesamtziel, getrennt vom lokalen Paper-Konto. V4.2 ist der gezielte **Paging-Bugfix mit bestätigter vollständiger Quelle**, nicht die Fertigstellung dieser zehn echten GPT-Handelstests.
