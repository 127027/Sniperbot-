# Sniperbot R29 – GPT-Entscheidungs- und Erfahrungswissen, Version 1

**Stand:** 15.11.2026. **Quelle:** vom Nutzer freigegebene Studie *Professionelles Meme-Coin-Früherkennungs- und Trading-System*, R29-/R30-Protokolle und tatsächlich erste lokale Beobachtung. Dies sind **vorläufige Heuristiken**, noch keine empirisch gewinnbringenden Regeln.

## Auftrag und Rollen

- **ChatGPT-Diagnoseführer:** EINZIGER strategischer Entscheider für neue automatische Paper-Einstiege, HOLD, REDUCE, SELL, WATCH oder NO_TRADE. Forschung 1–24 Mal pro Tag je nach belegter Marktaktivität. Keine lokale Kaufheuristik darf andere Coins automatisch kaufen.
- **Fünf Forschungsrollen:** Scout, Onchain, Social, Security, QA können Evidence liefern; ihre Berichte sind weder ChatGPT-Entscheidungen noch signierte Trades.
- **GitHub:** owner-attributed Transport mit datierten, write-once Forschungsentscheidungen, Beleg-/Hashbindung und öffentlichen, minimierten Paper-Quittungen. Ohne dokumentierte Berechtigungen niemals als kryptografischen Modellidentitätsnachweis bezeichnen.
- **Windows-R29-Bot:** nur Authentifizierung, Ed25519-Lokalsignatur, unabhängiger Risiko-/Contract-/Kurscheck, Paper-Buchung und Notfall-Sicherheitsstop. Keine autonome Coin-Auswahl.
- **Echtgeld:** immer AUS. Keine Wallet-Signatur, PayPal-Transaktion, reale DEX-Order oder kostenpflichtige KI-API.

## Welche Daten die GPT-Forschung benötigt

1. **Discovery:** alle beobachteten Token-/Pool-Neustarts auf Solana, Base, Ethereum und BNB; eindeutige Kennung `chain:contract:pool`, UTC-Eventzeit und UTC-erste lokale Beobachtung. Nicht nur spätere Gewinner erfassen.
2. **Zwei unabhängige Marktquellen:** GeckoTerminal und DEX Screener mit Preis, Pool-Adresse, USD-Liquidität, 5m-Volumen, Käufen/Verkäufen, Zeitstempel, Divergenz und möglicher Promotion. Fehlende zweite Quelle = ungeprüft.
3. **Security / Sellability:** EVM GoPlus-Hinweise zu Open Source, Mint-/Proxy-/Blacklist-/Pause-/Owner-Rechten plus Honeypot.is-Buy/Sell-Simulation, Tax und Pair-ID. Solana Mint-/Freeze-/Token-Authority und unabhängige Exit-Simulation – noch nicht als vollständiges lokales Gate verfügbar.
4. **Organische Adoption:** einzigartige Käufer, Wallet-Diversität, frische aktive Holder, Wiederholungskäufe, Funding-Cluster, Konzentration der größten Wallets; reine `buys_5m` sind **keine** Unique Buyers.
5. **Narrative:** nachweislich vor dem Decision-Timestamp veröffentlichte Posts, neue unabhängige Creators, Trends, Nachrichten, Catalyst, Alter/Erstveröffentlichung und mögliche bezahlte Kampagnen. Keine vorweggenommenen oder rückblickenden viral gewordenen Posts.
6. **Mikrostruktur:** 5m/15m/1h-Dynamik und Volumenbeschleunigung, Volumen/Liquidität-Anomalien, Rücksetzer, LP-Veränderungen, Preisimpact bei **geplanter Ordergröße**, bidirektionale Flow-Beweise.
7. **Positionen und spätere Ergebnisse:** GPT-eigene offene Paper-Positionen aus `research/r29/channel/gpt-paper-context.json`, Preise und Quellen; virtuelle Ausführungsquittungen aus `research/r29/channel/gpt-paper-receipt.json`. **Keine privaten Guthaben/Wallets über öffentliches GitHub**.
8. **Erfahrungswerte:** alle verworfenen, flachen, verlorenen und erfolgreichen Kandidaten gleichwertig erfassen. 1h, 6h, 24h, 7d, 14d und 30d Outcomes mit Datenlücken. Eine nicht wieder auffindbare Pool-Quote bleibt UNKNOWN.

## Vorläufige Ranking-Matrix NUR NACH Sicherheitsgate

| Faktor | Gewicht |
|---|---:|
| Contract & Security | 30 |
| Reale Liquidität und Execution Quality | 20 |
| Onchain-Adoption/organische Käufer | 15 |
| Momentum/Marktstruktur | 15 |
| Social-/Narrativ-Neuheit | 10 |
| Wallet-Qualität | 5 |
| Cross-Venue-Bestätigung | 5 |
| **Gesamt** | **100** |

- `80–100`: **höchstens BUY_CANDIDATE**, kein automatischer Anspruch auf Ausführung. 80 Punkte sind **keine 80 % Erfolgswahrscheinlichkeit**.
- `70–79`: WATCH; unter 70: NO_TRADE.
- **UNVERIFIED/UNKNOWN vor Score**: kein kaufbares Signal, auch wenn Preis/Volumen attraktiv aussehen.
- KO: bestätigter Honeypot/fehlgeschlagene Sell-Simulation, fehlende wesentliche Sicherheitsfelder, gefährliche Mint-/Freeze-/Blacklist-/Pause-Mechanismen, unkontrollierbare LP-Risiken, nicht belegbare Token- oder Pair-Identität, extremer Price Impact und akute Manipulationssignale.
- Keine Annahme, dass einzelne positive X-/Reddit-Mentions, Token-Boosts, hohe `volume_m5`, ein hoher KI-Score oder ein historisches ATH bereits einen handelbaren Trend begründen.

## Ein- und Ausstieg

**GPT-BUY:** Coin mit exakt belegter Identität; frische unabhängige Marktdaten, verifizierte Security und Exit-Simulation, organisches Interesse und gültiges Budget. GPT nennt vorgeschlagene TEST-USDC und explizite Risiken; lokaler Sicherheitsmotor darf Betrag **verweigern**, aber nie erhöhen. Kein BUY aus WATCH/NO_TRADE.

**GPT-HOLD/SELL:** GPT verfolgt seine tatsächlich eröffneten Paper-Positionen, nicht nur täglich neu gestartete Pools. Kritische Gegenbeweise: Liquiditätsentzug, Sellability-/Authority-Änderung, drastische Käuferabnahme, Wash Trading, bestätigter Narrative-Bruch. Ein vollumfänglicher SELL benötigt aktuelle Pool-Quote. REDUCE wird erst dann ausführbar, wenn die bestehende Paper-Pipeline echte Teilverkäufe unterstützt; bis dahin Research-Empfehlung, keine heimliche Komplettliquidation.

**Notfall:** die lokale Risk Engine darf einen Sicherheitsstopp auf vorhandene GPT-Positionen ausführen; dies ist eine vorab freigegebene harte Verlustschutzregel, **keine** autonome Gewinnerstrategie.

## Fixe Risk-Regeln

- Risiko max. 0,25 % des virtuellen Portfolio-Werts pro Trade; nominal max. 1 % je jungem Coin und max. 3 % gesamte neue Meme-Exposition.
- Ab 1 % täglichem oder 2,5 % wöchentlichem Verlust: weitere Eintritte sperren. Unvollständig bewertete offene Positionen: weitere Eintritte sperren.
- Mindestorder 50 TEST-USDC. Bei 5.000 TEST-USDC Konto dürfen nominal zunächst maximal **50 TEST-USDC** in einen neuen Coin – die übrigen 4.950 sind nicht automatisch einzusetzen.
- Lokal angesetzte Gebühren aktuell 1 % Entry und 1 % Exit; echte Ausführbarkeit/MEV/Slippage nicht bewiesen. Gewinne als **virtuell und indikativ** bezeichnen.

## Korrektur- und Lernregeln

1. Die initialen Gewichte und Schwellen sind **nicht empirisch validiert**. Keine Selbstbehauptung, GPT könne ohne Outcome-Daten Wahrscheinlichkeiten zuverlässig schätzen.
2. Jede Entscheidung verbindet `decision_id`, Timestamp, Input-/Review-SHA, Evidence-IDs, Gründe, Risikoprüfung, virtuelle Quittung und nachfolgende Outcomes.
3. Fehlende Daten führen zu `DATA_GAP`/NO_TRADE, nicht zu erfundenem Gewinn oder `0 % Verlust`.
4. Beobachtungsvorlauf beginnt mit echtem lokalen R29-Review am **2026-11-15T17:40:24.709Z**. Die folgenden 30 Tage dienen getrennten Forward-Tests mit vorab fixierten Regeln.
5. Regeländerungen werden mit Datum, Begründung, Auswirkungen, vorheriger Version und neuem unabhängigen Zeitraum gespeichert; keine rückwirkende Änderung von bereits archivierten BUY/SELL-Entscheidungen.
6. Die GitHub-ChatGPT-Automation kann stündlich nach Evidenz sehen, garantiert aber ohne tatsächlichen erfolgreichen Lauf/Repository-Schreibrechte nicht, 24 echte vollständige Analysen auszuführen. Keine nicht stattgefundenen Analysen behaupten.
7. Die alten R30-Preis-Proxies waren **in allen vier Frequenzen verlustreich**; sie beweisen weder GPT-Kompetenz noch erlauben sie ungesicherte Live-BUYs. Das erste R29-Marktfenster enthält 12 **nicht sicherheitsverifizierte** Research-Kandidaten.
8. Ein Krypto-/Pool-Name allein ist **nie** ausreichende Identität. Immer Chain, Contract/Mint und Pooladresse verwenden.

## Persistente Belegstruktur

- Letzter öffentlich lesbarer Markt-Review: `research/r29/channel/dynamic-research-review.json`.
- GPT-Entscheidungsarchiv: `research/r29/gpt-decisions/YYYY-MM-DD/gpt_<32hex>.json` (pro ID einmalig über GitHub `create_file`; niemals überschreiben).
- Aktueller, SHA-gebundener Zeiger: `research/r29/channel/gpt-paper-decision.json`.
- GPT-Paper-Quittung: `research/r29/channel/gpt-paper-receipt.json`.
- GPT-Paper-Positionskontext ohne Guthaben: `research/r29/channel/gpt-paper-context.json`.
- Lokal: `%LOCALAPPDATA%\MemeSniperPaper\gpt-paper\decision-journal\YYYY-MM-DD.jsonl`; außerdem bestehende `dynamic-research\reviews\` und `outcomes\`.
- Erfahrungen und Strategieänderungen: `research/r29/gpt-strategy/` als erklärbare Markdown-Dateien. Keine Secret Keys, Guthaben, Wallets, Nutzerkennzeichen oder persönlichen Daten im öffentlichen GitHub-Branch.
