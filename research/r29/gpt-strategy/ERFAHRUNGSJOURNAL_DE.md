# R29 GPT-Erfahrungsjournal – ausschließlich belegte Ereignisse

**Zweck:** Dieses Journal bewahrt nachvollziehbare Markt-/Signal-/Trading-Erfahrungen für spätere ChatGPT-Entscheidungen. Es wird **nicht** rückwirkend umgeschrieben; neue Ergebnisse erhalten neue datierte Dateien. Simulation, tatsächlicher lokaler Paper-Fill und Echtgeld werden strikt getrennt.

## 15.11.2026 · Erste laufende Marktbeobachtung

- **Erste bestätigte lokale Analyse:** `2026-11-15T17:40:24.709Z`.
- **Frequenz:** laut GitHub-Status `4 Analysen/UTC-Tag`; das bedeutet den geplanten Forschungstakt, nicht vier bereits vollzogene GPT-Aktionsentscheidungen.
- **Ergebnis:** 12 beobachtete Kandidaten (u. a. Solana und BNB Chain), keine bestätigte vollständige Contract-/LP-/Sellability-Prüfung.
- **Review-Hash:** `347a7e113a693790cd88aa84a1463d1a7899d4cc6ba99281099c7240fbff5455`.
- **Gegenbeleg:** Einige beobachtete BSC-Pools weisen extrem geringe indikative Liquidität auf, z. B. 0,0589 USD bei dennoch ausgewiesenem 5-Minuten-Volumen. Das ist ein starker Warnhinweis für unbrauchbare Liquidität und zeigt, warum Volumen/Trending niemals allein kaufen darf.
- **Datenlücken:** Keine vollständigen unabhängigen Sell-Simulationen, Contract-Authority-Checks, Pool-Impact-Kurven, organisch verifizierten Unique Buyers oder verlässliche Wallet-Cluster-Analyse im **öffentlichen** Review.
- **GPT-Bewertung:** `NO_TRADE`, keine unbekannte Sicherheit als positiv gewertet, kein erfundener Score, keine Gewinnwahrscheinlichkeit und kein virtueller Fill behauptet.
- **Archivierter GPT-Entscheid:** `research/r29/gpt-decisions/2026-11-15/gpt_20261115181100000000000000000000.json`.
- **Gültigerweise beobachtetes Ergebnis zu diesem Zeitpunkt:** Null bestätigte **GPT-autorisierte** Paper-BUY-/SELL-Ausführungen. Ein funktionierender lokaler Kurier- und Sicherheitskanal ist noch nicht mit dem auf dem Windows-Laptop installierten neuesten Programmstand bestätigt.

## Erfahrung, die künftig beim Screening angewandt wird

**Lektion E001 – Niedrige Liquidität schlägt auffälliges Volumen.** Ein Coin kann eine große 5-Minuten-Transaktionszahl anzeigen und trotzdem faktisch nicht sinnvoll in beide Richtungen handelbar sein. Den Score nicht auf bloße Volumenwerte stützen. Immer nominale Liquidität, unabhängige Quote, zulässige Ordergröße, tatsächliche Sell-Simulation und Manipulationsrisiko prüfen.

**Lektion E002 – UNKNOWN bleibt UNKNOWN.** Für beobachtete, aber nicht unabhängige verifizierte Contract-/Sellability-Daten kann keine überprüfte BUY-CANDIDATE-Wahrscheinlichkeit genannt werden. Korrektes Verhalten kann NO_TRADE sein, auch wenn später ein Coin stark steigt; bei Backtests zählen vorab verfügbare Fakten.

**Lektion E003 – Erstes Source-Universum ist kein vollständiger Markt.** Die bestehenden zwei GeckoTerminal-Seiten je Blockchain erfassen nicht jeden Tokenstart. Fehlende Coins sind nicht automatisch erfolgreich ausgelassene Trades und nicht automatisch unbekannte Kandidaten, die nie existierten.

**Lektion E004 – Historische Preise allein reichen nicht.** Das getrennte R30-Preisproxy-Experiment war bei 1/4/12/24 Entscheidungsfrequenzen im Minus und beweist keine profitabel funktionierende GPT-Strategie. Die neue GPT-only-Paper-Strecke benötigt authentifizierte echte Entscheidungsarchive und unabhängige Marktsignale.

## Vorgegebene zukünftige Ergebniskategorien

| Kategorie | Bedeutung |
|---|---|
| `SOURCE_OBSERVED` | Pool mit Datum und Originalquelle tatsächlich beobachtet |
| `SECURITY_UNKNOWN` | Sicherheitsnachweise fehlen, kein regulärer BUY |
| `GPT_NO_TRADE` | GPT hat **begründet** vom Kauf abgesehen |
| `GPT_BUY_REQUESTED` | GPT hat einen archivierten, frischen BUY verfasst; noch kein Fill |
| `PAPER_BLOCKED` | Lokale Signatur-/Quote-/Risk-Engine verweigert |
| `PAPER_FILLED` | **Nachweislich** im bestehenden regulären Testgeldkonto ausgeführt |
| `PAPER_SELL_FILLED` | Virtuelle Position geschlossen; realisierte modellierte P&L |
| `OUTCOME_UNKNOWN` | Fehlende spätere Same-Pool-Quelle, keine Rendite erfinden |
| `OUTCOME_INDICATIVE` | Späterer öffentlicher Preis, nicht zwingend ausführbare Quote |
| `POLICY_CHANGE_TEST_PENDING` | Neue Regel soll erst an noch ungesehenen Daten bewertet werden |

**Nächster Nachtrag** erst nach einer tatsächlichen neuen Marktanalyse, neuen unabhängigen Sicherheitsbelegen oder einem nachweislich veränderten GitHub-Receipt. Keine Selbstbestätigung durch wiederholte unveränderte Statuschecks.
