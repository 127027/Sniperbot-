# Memecoin Sniper: strategisches Paper-Kapital statt Score-Prozentformel

**Stand: 09.11.2026.** Nur Forschung und virtuelle TEST-USDC. Gilt nur im Arbeitsbranch `codex/research-gateway-v04`. Kein Echtgeld, keine Wallets, kein Merge auf `main`.

## Vom Nutzer bestätigte Logik

Die Kontogröße ist das **freie lokale Paper-Guthaben**. `minTrade` und `maxTrade` sind **Grenzen je Kauf**, keine Gesamtbudgetvorgabe und kein Prozentwert. Es sind mehrere Positionen zulässig. Eine erkannte Gelegenheit wird als eigene Entscheidung mit gesonderter, begründeter Kapitalempfehlung untersucht.

- **EXPLORATORY:** kleine, ausreichend geprüfte Beobachtungsposition zum Mindestbetrag (z. B. `50` bei `50–1.000`, `500` bei `500–5.000`). Ungenügende Risiko- und Sellability-Nachweise führen trotz kleiner Größe zu **0**.
- **TARGET:** ausdrücklich begründeter Betrag aus unabhängiger Forschung. Die lokale Engine klemmt ihn an das jeweilige `maxTrade`, verfügbare freie Gelder und die geprüfte technische Kapazität.
- **HIGH_CONVICTION:** nur bei getrennt belegtem, einstimmig gut begründetem Forschungskonsens und zusätzlicher Sicherheits-/Ausführungsfreigabe; bis zu `min(maxTrade, freeCapital, sellCapacity)` ohne starre Score-zu-Geld-Formel. Ein hoher Score allein reicht niemals.

**Beispiel A:** Konto 1.000 TEST-USDC, `min=50,max=100`: zwei kleine Prüffälle je 50 verbrauchen 100. Ein später separat begründeter starker Kandidat kann **maximal 100 je Kauf** erhalten, wenn noch frei und lokal freigegeben; der Restbetrag wird nicht ungefragt überschritten.

**Beispiel B:** Konto 5.000 TEST-USDC, `min=500,max=5.000`: drei kleine Plätze zu 500 verbrauchen 1.500, es bleiben 3.500. Eine spätere ausdrücklich gut belegte Gelegenheit kann 3.500 als **einen** weiteren Paper-Kauf bekommen, wenn der unabhängige Risk-Controller ausreichend simulierte Verkaufskapazität bestätigt. Kein Geld aus vorhandenen Positionen und keine heimliche Neukapitalerzeugung.

**Eine angebliche 95-%-Chance ist weder ein nachgewiesenes 95-%-Ereignis noch eine Kaufgröße.** Die 0–100 Forschungsratings bleiben zunächst unkalibrierte Ratings ohne Wahrscheinlichkeitsinterpretation. Für einen belegbaren 14-Tage-Ausbruch gilt vorläufig: Kurs mindestens 2× des zeitgleich erfassten Einstiegsreferenzpreises **innerhalb von 14 Tagen**. `runner/breakout-forecast.mjs` stellt reine Offline-Auswertungen und Kohorten-Kalibrierung mit mindestens 100 vollständigen unabhängigen Out-of-Sample-Fällen **pro Score-Bin** bereit. Ohne überprüfte historischen Launch-Kohorten bleibt die angezeigte Chance **NOT_CALIBRATED**, niemals pauschal 80, 92 oder 95 Prozent. Die empirische Gruppenfrequenz hat ein Konfidenzintervall und ist keine Garantie für einzelne Kandidaten.

## Fünf Cloud-Dots ↔ lokaler PC: bestätigte und offene Schichten

- **Bestätigt:** Lokaler Windows-Collector → nicht handelbarer Markt-Snapshot auf öffentlichem GitHub → fünf stündliche Forschungsrollen lesen gemeinsam. Scout schreibt Watchlist/Forschungsfeed; weitere Rollen schreiben getrennte Reports. `runner/research-network.mjs` liest **alle fünf** aktuellen Rollenstände und die Watchlist periodisch **nur lesend** in den PC, angezeigt im Dashboard und als öffentliche Summary unter `.local/research-network/status.json`. Kein Zugriff der Cloud-Dots auf private lokale Paper-Salden oder Windows-Bedienung.
- **Bestätigt:** Scout-Notices über `research/feed/meme-scout-latest.json` → lokaler Research-Inbox; `actionable:false`. Ein GitHub-Forschungsfile ist **kein** signiertes Kaufsignal.
- **Im synthetischen Labor getestet:** Fünf `agent_vote.v1`-Bestätigungen und unabhängiges Risiko-Objekt → explizite Kapitalintention → hypothetischer Paper-Kauf unter lokalen Grenzen. Das neue optionale Feld `allocation_intent` bei jeder Stimme ist `EXPLORATORY` oder `HIGH_CONVICTION`. Nur wenn alle fünf Rollen ausdrücklich **HIGH_CONVICTION** nennen, wird die größere Stufe innerhalb des lokalen synthetischen `research.mjs`-Tests zulässig. Ein fehlendes Feld bedeutet **EXPLORATORY**.
- **Signierte synthetische Entscheiderschnittstelle:** Der bestehende v1-Kaufvertrag kann optional das signierte Paar `allocation_intent` und `target_test_usdc` enthalten; ohne beide bleibt die Entscheidung konservativ EXPLORATORY. Ungültige oder einseitige Angaben werden abgewiesen. `HIGH_CONVICTION` verlangt neben separatem Quorum/Risiko/Quote auch `convictionPass:true` aus unabhängigem Testkontext. Keine Remote-Steuerung von Salden.
- **Noch NICHT implementiert:** echter unabhängiger Contract-/LP-/Sellability-Validator, vertrauenswürdige signierte zentrale Kaufpublikation, automatische fünf Rollenbewertungen im lokalen Paper-Gateway, reale neue Coins als automatisch gekaufte Paper-Positionen, kalibrierte tatsächliche Ausbruchswahrscheinlichkeit und autonomes Lernen aus historischen vollständigen Launchkohorten. **Alle realen externen Auto-Käufe bleiben `BLOCKED_REAL_VALIDATOR_UNAVAILABLE`.**

## Technischer Nachweis

`runner/allocation.mjs` berücksichtigt explizite Kapitalabsicht statt Ratings. `runner/research.mjs` und `runner/central-decisions.mjs` werten die Absicht erst **nach** ihren bisherigen Sperren aus. Der lokale Berechnungsweg nimmt stets die echten eigenen `minTrade`, `maxTrade` und `cashEur+cashUsdc` aus dem gespeicherten Paper-Ledger. Bestehende Guthaben und Einstellungen werden **nicht** durch den GitHub-Commit geändert; ein GitHub-Download ersetzt auch keine laufende Windows-Installation.

Tests: `node runner/test.mjs`, `node --test runner/*.test.mjs`, Windows-One-Click-Smoke-Test und GitHub Actions. Portfolio-Tests decken u. a. **3 × 500 → 3.500 Rest**, `50–100` mit maximal 100 sowie unabhängige High-Conviction-Sperren ab. Historische 14-Tage-Auswertungen werden mit simulierten Fällen als Rechenlogik getestet, **nicht** als Nachweis einer echten Prognosegüte.

**Risiko:** Auch Paper-Daten auf unvollständigen oder manipulierten DEX-Preisen können eine falsche Rendite suggerieren. Eine tatsächliche 95-%-Ausbruchswahrscheinlichkeit ist weder nachgewiesen noch derzeit seriös anzeigbar. Kein Zwang, Kapital voll zu investieren. Große Memecoin-Konzentration kann einem Totalverlust gleichkommen.
