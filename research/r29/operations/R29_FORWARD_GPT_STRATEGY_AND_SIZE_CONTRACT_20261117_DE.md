# R29 – 40 Lernfälle, GPT-Tagesplanung und private Einsatzverhandlung
Stand 17.11.2026 | PAPER_ONLY | versionierte Fortsetzungsnotiz.

## 1. Referenzen (KEINE historischen GPT-Prompts!)
Quelle: Aktueller Nutzerauftrag mit Material aus anderem Chat. Unter research/r29/gpt-strategy/references/USER_SUPPLIED_40_MEMECOIN_WINNERS_20261117.json sind exakt 40 Zeilen als USER_SUPPLIED_UNVERIFIED archiviert:
- 12 rückblickend berichtete Wallet-Kauf-/Verkauf-Beispiele, teils mit Restbeständen/ungefähren Daten.
- 16 berichtete historische Kursfenster (theoretisch, keine eigenen Fills).
- 12 24h-Tagesbewegungen (keine realistisch erzielten eigenen Erlöse).

Dacity Coin (wallet_09) und AudaCity / DacityCoin (market_16) sind ein mögliches Alias-Duplikat. PIZZA / berichtete Robinhood-Chain ist unbestätigt. Die unverifizierten Angaben sind nicht als 40 eindeutige Onchain-Contracts, geprüfte PnL oder realisierbare Extremrenditen zu zählen. Berichtete Quellen: DexTrading, PANews Meme Daily; Originalartikel-URLs und genaue Tx-/Pool-/Token-IDs fehlen.

**Verbindliche Blindtestsperre:** Die 40 Gewinner dürfen NICHT als Candidate-Input, Gewinner-Shortlist, Quellenliste, Suchwörter, Regelgewichte oder Zeitwissen in frühere GPT-Entscheidungen kommen. Die neue Referenzvalidierung ist in den historischen neutralen Eingabefilter eingebunden. Altes 60-Tage-Holdout = 18.09. bis 16.11.2026; Ergebnisse bis 17.11. liegen zumindest teilweise nach dem Holdout. Erst NACH eingefrorenen GPT-Entscheidungen dürfen die Labels rückblickend verglichen werden.

## 2. Verbindliche Zuständigkeiten und 24h-Tageszyklus
Einziger strategischer Entscheider bleibt GPT: Kandidatenauswahl, 1/4/12/24 tatsächliche Vollanalysen pro Tag, BUY/HOLD/SELL/WATCH/NO_TRADE, Einsatz 50–5.000 TEST-USDC und Exit-/Teilverkaufsstrategie. Der Bot wählt keine eigene Handelsstrategie. 08:00 Uhr Europe/Berlin ist der Beginn des Betriebstags. GPT prüft beim bestehenden stündlichen Wake erneut, ob eine Änderung der Vollscan-Frequenz sinnvoll ist. Keine falschen Modellaufrufe: Nur nachweislich durchgeführte Modellscans zählen, pro Tag maximal 24 und mindestens 1 Stunde Abstand.

Das bereits bestehende Modul research/r29/operations/adaptive-daily-cadence.mjs und der Tagesvertrag DAILY_RESEARCH_AND_LEARNING_PROTOCOL_DE.md enthalten die Stufen, Tagesgrenzen und Revisionsregeln. Ihre mathematischen Empfehlungen sind KEINE zweite autonome Handelsstrategie und kein Beweis tatsächlicher GPT-Aufrufe.

**Wichtig:** Die aktive vorhandene stündliche ChatGPT-Automation bearbeitet derzeit den HISTORISCHEN BLINDTEST (BACKTEST ONLY). Sie ist kein nachweislich angeschlossener produktiver 24/7-Forward-Paper-Trader. Sie darf nicht unbemerkt in Live-Paper-BUYs umgewandelt werden. Keine zweite Automation vortäuschen.

## 3. Geplanter Kaufdialog, aktueller Codefortschritt
1. GPT findet einen Coin aus aktuellen unabhängigen Quellendaten und formuliert die nicht handelbare SIZE_REQUEST (Request-ID, Chain, Token, Pool, Quellenhash, Uhrzeit).
2. Der Bot prüft seine aktuelle EINE reale lokale virtuelle Paper-Buchhaltung. Die neue private Route POST /api/gpt/paper-size-request ist nur mit der vorhandenen zufälligen Supervisor-Capability am Localhost nutzbar und niemals ein Trade.
3. Der Bot gibt im privaten Angebot mindestens 50 und höchstens 5.000 TEST-USDC frei, aber niemals über dem tatsächlichen freien lokalen Limit. Bei 4.999 freiem TEST-USDC-Kapital ist die Angebotsgrenze 4.999 (ein simuliertes Testbeispiel, KEINE bestätigte Live-Balance). Der Bot erstellt dazu ein lokales Journal unter MemeSniperPaper/gpt-paper/private-size-requests/YYYY-MM-DD.jsonl.
4. GPT wählt z. B. 250 TEST-USDC mit einer SHA-gebundenen SIZE_CHOICE. Die Wahl wird zeitlich begrenzt und bei Annahme gegen das neueste lokale Budget erneut geprüft. Kein Bot-Investmenttipp und kein unautorisierter Kauf.
5. Erst ein separater autorisierter, nachweislich GPT-originierter GitHub-BUY-Entscheid mit eigenständiger Contract-/LP-/Sellability-/Quote-/Fee-/Nonceprüfung darf zu einer echten VIRTUELLEN PAPER_FILLED-Quittung führen. Die aktuelle GitHub-Owner-Commitprüfung ist KEIN kryptografischer Nachweis der GPT-Modellidentität. Solana ist im aktuellen Receiver weiterhin technisch gesperrt, bis die notwendige unabhängige Sicherheit/ausführbare Quote existiert.
6. Das bestehende eine Paper-Portfolio zeigt Balance, offene Positionen, Einsatz, indikative Gewinne/Verluste und künftig die Kennzeichnung GPT-geführter Positionen sowie den letzten bestätigten GPT-Receipt. Forschung und Tests dürfen keine Kontoguthaben verändern.

Ergänzte Codepfade: runner/gpt-paper-size-negotiation.mjs, runner/gpt-paper-local-receiver.mjs, runner/server.mjs, runner/dashboard-portfolio.mjs, runner/dashboard.html. Testbelege: runner/gpt-paper-size-negotiation.test.mjs, runner/gpt-paper-local-http-e2e.mjs, runner/dashboard-portfolio.test.mjs, historische 40-Fall-Validator-Tests und bestehende Windows/Linux-CI-Matrix.

## 4. Verbleibende harte Lücken – vor 24/7-Betrieb zu schließen
- Die **komplette** automatische GPT→GitHub→private lokale Einsatzangebot→GPT-Antwort→GitHub-Order-Kette ist noch NICHT angeschlossen. Die private Kapazitätsantwort ist heute nur über authentifiziertes Localhost abrufbar. Public GitHub darf keine private Paper-Balance, Wallet- oder PayPal-Daten enthalten. Zuerst ist eine tatsächlich verbundene und authentifizierte private Modell-Rückkanal-Komponente nötig.
- Kein nachgewiesener dauerhafter GPT-Forward-Live-Vollscan mit 1–24 Takt und tatsächlichen Modellsignaturen. Die vorhandene stündliche Automation ist Backtest-only.
- Keine bestätigten Solana-GPT-BUY/SELL-PAPER_FILLED-Quittungen, keine nachweisbaren realistischen 22-Sekunden-Ausführungen, keine unabhängig getesteten bidirektional ausführbaren Solana-DEX-Angebote, Gebühren-/Slippage-/Rug-Gates und Teilverkäufe.
- Die 40 rückblickenden Gewinner sind noch nicht per eindeutigen Onchain-Adressen, Originaltransaktionen und damaligen Quellendaten unabhängig verifiziert. Für einen Blindtest nicht verwendbar.
- Der 60-Tage-GPT-PnL bleibt UNKNOWN. Weder nachträglich beobachtete ATH-Preise noch fremde Wallet-Trades sind eigene realisierbare Paper-Fills.
- CI testet reproduzierbare lokale/synthetische Daten. Aktualisierte Windows-Installation, echter Bot-Start, GPT-Prozess und Marktempfang auf dem Laptop noch nicht persönlich nachgewiesen.

## 5. Nächste Arbeit (keine Neuerfindung)
A. Private GPT-SIZE_OFFER-Zustellung aus dem lokalen authentifizierten Bot zu einem wirklich verbundenen GPT-Modell-Dienst.
B. GPT-Tagesfrequenz und tatsächliche Vollscan-Läufe append-only im GitHub-Botordner nachweisen (1/4/12/24, mit überprüfbaren Modellaufruf-IDs).
C. Prospektive Coin-Forschung neutral und unabhängig von den 40 Referenzen, technisch verifizierte Kauf- und SELL-Quotes sowie modellierte 50–5.000-USDC-Fills inklusive Kosten.
D. UI und Bot-Empfang über die einzige bestehende Sniperbot_Starten.bat auf dem echten Windows-Laptop nachweisbar abnehmen.
E. Quelleneindeutigkeit der 40 Fälle NACH den unabhängigen Entscheidungen auflösen und als separaten Benchmark verwenden.

Für neue Chats zuerst SNIPERBOT_R29_START_HERE.md, R29_LATEST_CHECKPOINT.json und diesen Bericht lesen. main, Wallets, PayPal und private .local-/MemeSniperPaper-Ordner bleiben unangetastet. Nur PAPER_ONLY.
