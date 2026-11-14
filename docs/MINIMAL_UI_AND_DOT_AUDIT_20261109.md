# Sniperbot – Dot-Status, Soll/Ist-Prüfung und minimales Dashboard

**Prüfdatum:** 09.11.2026. **Branch:** `codex/research-gateway-v04`. **Keine Änderung an `main` oder Hixton.**

## 1. Fünf reale ChatGPT-Automationen – Stand der Nachprüfung am 09.11.2026

Alle fünf aktiven Forschungsaufgaben meldeten abgeschlossene geplante Läufe und haben ihre jeweiligen `research/roles/<role>/latest.json`-Snapshots über GitHub gespeichert:

| Rolle | Quelle | Letzter geprüfter Snapshot (UTC) | Resultat |
|---|---|---|---|
| `news_discovery` | Meme Scout – Forschungsradar | 11:40:18.861 | NO_VERIFIED_CANDIDATE; candidates=[] |
| `social_acceleration` | Sniper Social Research | 11:37:09 | NO_VERIFIED_CANDIDATE; candidates=[] |
| `onchain_liquidity` | Sniper Onchain Research | 11:49:28 | NO_VERIFIED_CANDIDATE; candidates=[] |
| `contract_security` | Meme Sniper – Techniklabor | 12:18:11.876 | NO_VERIFIED_CANDIDATE; candidates=[] |
| `opportunity_qa` | Sniper Opportunity QA | 11:53:31 | NO_VERIFIED_CANDIDATE; candidates=[] |

Die fünf Rollen lesen nachweislich gegenseitig GitHub-Snapshots und markieren abgeleitete Befunde. **Das ist ein funktionierender verzögerter Austausch von Forschungsinformationen, kein gesicherter Echtzeit-Konsens oder signierter Order-Publisher.** Unabhängig belegte `chain:token_address:pool_address`-Kandidaten, Wallet-Zeitreihen, bestätigte Sellerouten und aktuelle 5/5-Bewertungen liegen noch nicht vor.

Recherchierte, wechselnde Indexbeispiele (etwa 67Bonk/Bonk, TEMPER/SOL, LaMisery/SOL, Sheep/SOL, BANK/SOL) sind **keine** freigegebenen Empfehlungen. Ohne stabile Contract-/Pool-IDs und Einstiegs- plus Ausstiegszeitpunkt kann man keinen seriösen hypothetischen ROI oder Trefferquotenwert berechnen. Der Stand ist deshalb **0 validierte Kaufkandidaten**, nicht „0 profitable Coins am Markt“.

Das Techniklabor meldete zusätzlich aus Solana-Primärdokumentation relevante Token-2022-Risiken: `CpiGuard` und `MemoTransfer` können bestimmte Transfer-/DEX-Routen beeinträchtigen. Das ist ein technischer Fortschritt, aber kein Coin-spezifischer PASS/SELL-Quote. `REAL_VALIDATOR_UNAVAILABLE` bleibt korrekt.

Die 5er-Rollenkoordination startete erst am **07.11.2026**. Eine behauptete 17-/18-Tage-Performance ist nicht belegt; ein Zeitraum von zwei bis drei Wochen kann allenfalls ein hypothetischer Haltehorizont sein, kein nachgewiesenes Ergebnis.

## 2. Tatsächliche Handelsfunktionen – wichtige Unterscheidung

| Funktion | Istzustand im Code | Soll / Blocker |
|---|---|---|
| Bot EIN/AUS, lokaler Zustand und Positionen | Vorhanden; Bot AUS sperrt neue Paper-Einstiege, laufender Prozess kann Exit-Regeln prüfen | Prozess-AUS/Schlafmodus: keine Überwachung |
| Virtual Paper-Konto | Lokales `cashUsdc`, `cashEur` sowie Ledger/Persistenz. Neu: `SET_PAPER_BALANCE` setzt **Gesamtguthaben** nur bei Bot AUS und ohne Positionen auf 0–100.000 Test-USDC mit Centgenauigkeit | Keine virtuelle Auszahlung nötig; kein Live-Fiat |
| Einsatz bei zentralem Score | `allocation.mjs` implementiert 80–92-Interpolation, lokale Min/Max und Cash-/Kapazitätsgrenzen, nur in separat getesteter Paper-Entscheidung | Keine statistisch kalibrierte Gewinnwahrscheinlichkeit |
| Signaturverifikation | `central-decisions.mjs` besitzt Ed25519-Verifier, externe Keys lokal konfigurierbar | Echter zentraler Publisher/gesicherter Schlüssel/Queue noch nicht belegt |
| Echter Coin-Kauf durch Dots | `research_notice.v1` bleibt strikt nicht handelbar. `paper_execution_decision.v1` ist separater lokaler Eingang, für externe Coins ohne echte Validatoren blockiert | Strukturierte 5/5-Dot-Reviews, unabhängiger Contract-/LP-/Sellability-Risk und echte Quotes fehlen |
| Paper EUR→USDC | `core.mjs` führt nur die bewusst **fiktive 1:1-Umrechnung** durch, kein Wechselkurs/Onchain-Swap | Für einen späteren echten Kauf wären Fiat-Ramp, geeignete Chain-Assets, Gas-Token, Routing, Gebühren, Slippage, Bridge- und DEX-Swap-/Exit-Adapter separat nötig |
| LIVE-Konto/PayPal/Wiederabhebung | **Nicht implementiert**; keine echten Ein-/Auszahlungen, kein Wallet, keine Live-Orders | LIVE bleibt gesperrt und wird nicht durch einen UI-Schalter aktiviert |
| Exit-/Trailing/Labor | Existieren technisch weiter, erscheinen **nicht** mehr als gewöhnliche UI-Schalter. HOLD kann als alter Zustand bestehen | Ohne wirklich ausführbare SELL-Quote sind errechnete Kursgewinne keine realisierbaren Fills. Legacy manuelle externe Paper-SELLs anhand indikativer Preise benötigen vor weiterer Verwendung einen Safety-Fix. |

## 3. Umgesetztes UI-Redesign

Hauptseite zeigt nur noch: **PAPER / LIVE gesperrt**, **Bot EIN/AUS**, **gesamtes virtuelles Vermögen**, **freies Guthaben**, **offene Positionen**, **zentralen Follow-/Publisher-Status** und **lokal bestätigten Dot-Empfang**. Scroll-/Bedienkomplexität minimiert; responsive CSS für Smartphone-Breite.

Kleine zuklappbare Bereiche: **Testkapital verwalten** (Gesamtguthaben exakt festlegen / auf 0 setzen; nur Bot AUS ohne Positionen), **Einstellungen** (Min/Max, zentraler Paper-Follower) und **Aktivitäten und Diagnose**. Alte Fake-Einzahlung/-Auszahlung/-EUR-Umtauschbuttons, Legacy-TP-/SL-/Trailing-Slider und Labor-Trade-Knöpfe sind aus der UI entfernt. Die zugrundeliegende Legacy-Simulation bleibt zur Regression in bestehenden Tests/Backend verfügbar, wurde nicht als Echtgeldfunktion ausgegeben.

Bestehender Dot-Empfang wird weiterhin aus lokal gespeicherten Zeitstempeln abgeleitet und unterscheidet reguläre Nachrichten, historische Proben, veraltete Nachrichten, Abruffehler und Runner offline. **Noch kein lokaler Empfangsbeleg bedeutet Anzeige „Noch kein Bot-Empfang“, selbst wenn eine Rolle auf GitHub schreibt.** Keine neuen Handelswege aus dem Dot-Status.

**Sicherheitsbedingung:** LIVE ist als deaktivierter, nicht betätigbarer Modus gekennzeichnet; keine echten Zahlungs-/Tradingfunktionen aktiviert.

## 4. Verifikation und Betrieb

Zusätzliche automatisierte Tests in `runner/minimal-ui.test.mjs`: exakte Paper-Gesamtsumme, sicheres Zurücksetzen, Blockade während Bot AN/offener Position, ungültige Beträge, UI-Struktur, gesperrter LIVE-Modus und syntaktische Prüfung des Inline-JavaScript. Bestehender `runner/dot-status.test.mjs` kontrolliert korrekte Empfangsdaten und historische Nachrichten.

Alle Änderungen wurden ausschließlich im Arbeitsbranch versioniert und durch GitHub Actions geprüft. Die CI-Ergebnisse und exakten Commits sind im GitHub-Workflow nachzuprüfen.

**Wichtig:** Der laufende Windows-Laptop wurde aus diesem GPT-Chat **nicht** aktualisiert oder neu gestartet; lokale 1.000 Test-USDC wurden nicht verändert. Zur Nutzung muss der Nutzer die neue Version auf seinen Windows-PC übernehmen und den Runner neu starten.

## 5. Noch nicht erreichter Sollzustand

Auch das minimalistische Dashboard macht den Bot **nicht** zu einer vollwertigen Live-Trading-App. Die wesentlichen fehlenden Teile sind 24/7-Discovery mit eindeutigen Contract-/Pool-IDs, getrennte echt unabhängige Coin-Sicherheits- und Sell-Routenprüfungen, konsistente zentrale Forschungsentscheidungen, ein produktiv abgesicherter Ed25519-Signierdienst mit Queue und echte per-chain Ausführungsadapter. Echte Einzahlung/Auszahlung erfordert Zahlungsanbieter- und regulatorische Prüfung sowie gesonderte Freigabe.

**Kein main-Merge, keine Geldbewegung, kein Hixton-Eingriff, kein Aktivieren von Echtgeld.**
