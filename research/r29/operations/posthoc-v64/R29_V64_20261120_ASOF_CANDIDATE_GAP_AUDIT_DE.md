# R29 V6.4 – zeitgerechte Kandidatenlücken, 20.11.2026 (POSTHOC-AUDIT, NICHT GPT-INPUT)

## Zweck und Sicherheitsgrenze
Die vom Nutzer nachträglich genannten Kursgewinner sind **ausschließlich Audit-Referenzen**. Weder diese Datei noch ihre Coinnamen oder Contracts dürfen als Prospektiv-Seed, Trainingslabel, Gewichtung oder Trading-Order in den Forward-Scanner eingespeist werden. Die beobachteten großen 24h-Kursveränderungen beweisen keinen vor dem Anstieg möglichen Einstieg, keine Sellability und keinen realisierten Gewinn. Pool-Startzeit, Source-Erstsichtung, Modell-Review und Paper-Fill sind vier verschiedene Ereignisse.

## Tatsächlich archivierte GitHub-Markt-Samples (nicht vollständige 2-Minuten-Historie)
Öffentlicher Canonical-Pfad `research/market/latest.json` im Branch `codex/r29-chatgpt-github-paper-cycle-20261115`. Nach Datum sortierte Commit-SHA-Referenzen, je ein Snapshot um die unten angegebenen Beobachtungszeiten (UTC):
- 19.11. 11:54:22 `db33c7c90be1311ed387166ecc180c9592b3070c` (58 candidates)
- 19.11. 17:54:09 `3fee31d2608569161eceae3076eaf935e8ba54f0` (54)
- 19.11. 22:58:13 `7f6cd326c2eb35aff4ae2e1fe880620db6866315` (54, 24 watch)
- 20.11. 02:00:31 `3e506fea95c224fa2688471712b5eeb27429e0f6` (61, 24 watch)
- 20.11. 04:04:11 `8ea9f0b06d436cb611f9610ba9322b2e353f125d` (64, 24 watch)
- 20.11. 05:55:41 `61cf4018c2dea0d9cbc89ff3d3409e8f203d3b38` (56, 24 watch)
- 20.11. 08:02:59 `7c43a7894a5549d5dfe356d008b14f5571a19e9c` (60, 24 watch)
- 20.11. 09:54:45 `43aaead247660d9ffa4dd0da0daad4ad117e77b9` (57, 24 watch)
- 20.11. 11:54:49 `7ea7353b40d009ea35a2a0c4d3cc88841c0888c1` (48, 24 watch, 24 narrative)
- 20.11. 14:00:41 `6c61a11ee84361ac821cd9f00ffc405e1a9305a3` (57, 24 watch, 24 narrative)
- 20.11. 15:03:33 `134a2a150b03925e970ae63c5cb5c66655f6923f` (52, 24 watch, 24 narrative)

**Prüfmethode:** In jedem dieser elf Versionen exakte `token_address` in `candidates`, `watch_candidates`, `narrative_leads` und ggf. `ranking_leads` auf Chain/Adresse abgeglichen. Dies sind Stichproben; daraus darf NICHT `never seen` oder eine absolute erste Sichtungszeit für alle lokalen Snapshots gefolgert werden.

| Nur Posthoc-Referenz | Chain | Exakter Contract | Belegt in 11 öffentlichen Samples | Was der Befund NICHT beweist |
|---|---|---|---|---|
| Fiona the Hippo | Solana | `B34nXKzCgsJb9ChLuSHPRpXLE3WFSWyeT8Cqkzzmpump` | Nicht gefunden | Nicht belegt, ob zwischen Samples lokal erfasst |
| Cool Dog / LOOSY | Solana | `HF2RBPrfNBk9TxggL2cYZFEKSgirzh5HKCngLENTpump` | Nicht gefunden | Kein ausreichender Beleg für frühen GPT-Einstieg |
| GIANT | Base | `0x7361f72ed815760ca7e0a1f4888decb6a2e0a68c` | Nicht gefunden | Trotz kompatibler Chain kein belegt erreichbarer Pool |
| Fiona the Hippo | BNB | `0xb97676f1d101f8f5ac7a4ea4750a81b6116a24d3` | **20.11. 11:54:49 UTC in `narrative_leads`**; nicht in `candidates` | DEX-Metadaten sind bezahlungs-/promotionanfällig, weder Pool-Identität noch BUY |
| ANT | BNB | `0xded53e79d394d05c9553bcc91a1d176ad58a7777` | Nicht gefunden | Keine vollständige historische 2-min-Lokalprüfung |
| DacityCoin | Solana | `3sPSveVe8eq62Y8ZbS3W17HN1o9tjca1GY2ijBn2YHMt` | Nicht gefunden | Späte gemeldete Poolöffnung, kein Frühkauf bewiesen |
| Stand With Jensen | Solana | `gHZhqEnFnitWCJ1MA2i9BzqTReFMhsGmbdL17xypump` | Nicht gefunden | Rein historischer Watch-Kandidat |

Weitere Contracts wie Robinhood Chain / Arc sind im Collector bislang gar keine unterstützten Chains; die V6.4-Ranking-Forschung führt deren Tokens lediglich als `UNSUPPORTED_CHAIN_RESEARCH_ONLY`-Kontext, **nicht** als tradable pools.

## Nachgewiesene Trichter-Lücken
1. Collector `MARKETS` enthält nur Solana, Base, BSC und Ethereum; Robinhood Chain und Arc fehlen.
2. `new_pools?page=1,2` betrachtet nur den jüngsten Teil des neutralen Quellenuniversums. Die unabhängigen `trending_pools`-Abfragen wurden öffentlich mehrfach mit HTTP 429 bzw. `SKIPPED_AFTER_RATE_LIMIT` erfasst.
3. Die `chooseBoundedResearchCandidates`-Auswahl transportiert maximal 24 pro Chain, höchstens 96 insgesamt. Beispiel 20.11. 14:51:23 UTC: 62 genaue Pool-Identitäten vor lokaler Cap-Auswahl; 50 Kandidaten an GitHub, 12 verloren.
4. `narrative_leads` können exakte Token-Adressen melden, aber sie enthalten selbst keine unabhängige Pool-Identität und erscheinen nicht automatisch in den `candidates`. BSC FIONA zeigt dies im Stichprobenarchiv.
5. Ein GPT-Review wird nur bei tatsächlicher Modellrecherche und Dokumentation gezählt. Sicherheits-Blocker können einen BUY verhindern, erklären aber nicht den gesamten Entdeckungstrichter. Ein WATCH oder NO_ACTION ist nicht automatisch eine fehlerhafte Strategie.

## V6.4-Änderung
Unabhängige, künftig fortlaufend datierte **öffentliche Ranking-Token-Leads** von neutral feststehenden Seiten; Fetch mit max. 30-Minuten-Intervall, begrenzte Seiten und leads, sichere Contract/Chain-Parser, kein rückdatierter Coin-Fund und kein Transfer von Preisen als ausführbare Quoten. Robinhood/Arc ausschließlich read-only Hinweise. Veröffentlichung in `ranking_leads` + `ranking_coverage` des bestehenden öffentlichen Snapshots; ohne Pool-/Quote-/Safety-/Order-Rechte. Dies ist eine **zusätzliche Discovery-Abdeckung**, kein nachgewiesener historischer Sieg und noch kein Nachweis, dass der Windows-PC die externen Seiten erfolgreich abrufen kann.

## Noch notwendige Abnahme
- Nach Windows-Update frische `ranking_coverage` mit tatsächlichen Erfolg-/Fehlerstatus prüfen. Fehler 403/429, Parser-Nullresultate und fehlende externe Zugriffe nie als leeren Markt melden.
- Für historische vollständige Zwei-Minuten-Rekonstruktion die privaten lokalen `.local/research-market/history/snapshot-*.json.gz` bzw. das R27-First-Seen-Archiv und tatsächliche Zeitstempel separat untersuchen. Öffentliche GitHub-Versionen sind nur Stichproben.
- Für vor Ausbruch erreichbare Coins nachprüfen: First-Seen-Event → neutraler Kandidatenstatus → GPT-Review → unabhängige Sicherheits- und Zweiwege-Quotes → signierter Paper-Auftrag → persönlicher Windows-Paper-Fill. Fehlende Belege bleiben UNKNOWN; niemals GO auf Basis einer Gewinnerliste.
