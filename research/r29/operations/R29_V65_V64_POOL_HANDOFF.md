# R29 V6.5 – V6.4-Ranking-Leads in genaue Pool-Identitäten auflösen

## Warum
- V6.4 (PR #83) liefert bis zu 48 zeitgestempelte Rankings, häufig nur Token-Adressen.
- Der bestehende lokale R29-Einstieg verlangte ausschließlich `GECKOTERMINAL_NEW_POOLS`; ältere Pool-Quellen wurden unabhängig von der Qualität der Identitätsbelege blockiert.
- Die GitHub-Entscheidungskette hat noch keinen nachgewiesenen GPT-BUY/Windows-PAPER_FILLED-Zyklus. Es besteht keinerlei Grund, fehlende Sicherheitsdaten als positiv zu behandeln.

## Was der Änderungssatz tatsächlich umsetzt
1. Der vorhandene Windows-Marktcollector nimmt eine **begrenzte Auswahl von maximal zwei zeitgerecht erfassten V6.4-Ranking-Token pro Durchlauf** und fragt deren Poolidentitäten über die bestehenden frei zugänglichen Anbieter ab: DexScreener `/token-pairs/v1` und GeckoTerminal `/networks/{chain}/tokens/{token}/pools`.
2. Nur **exakt übereinstimmende Blockchain-, Contract- und Pool-Adressen** werden als `R29_RANKING_CROSS_PROVIDER_POOL` in den bestehenden Kandidaten-Trichter aufgenommen. Die beiden Preise dürfen um höchstens 15 % abweichen. Kein bloßer Ticker-/Namensabgleich, keine rückwirkende Zeitkorrektur.
3. 96-gesamt/24-pro-Chain-Limits bleiben bestehen. Nicht bestätigte, zu alte und unsupported-chain Ranked-Leads bleiben Forschung und werden **nicht** zu handelbaren Kandidaten.
4. Der kanonische GitHub-Research-Relay und die unabhängige EVM-Sicherheitsrecherche verstehen die neue Pool-Quelle.
5. Der lokale Paper-Risiko-Einstieg kann ältere **exakt unabhängig verifizierte** Trending-/Ranking-Pools durch die **bestehenden** Contract-, Honeypot-/Sellability-, Liquiditäts-, Preis-, Guthaben- und Ablaufprüfungen schicken. Quelle allein führt niemals zu `ALLOW_PAPER`; keine Erleichterung für `PROVIDER_ONLY`-Paaridentitäten oder bezahlte Promotionen.
6. Unverändert: Nur GPT darf strategische V3 `PAPER_ONLY`-BUY/HOLD/SELL-Entscheidungen erstellen. Der Benutzer setzt den festen Einsatz. GitHub weist allein einen Eigentümerkontakt nach, **keine kryptografische Modellidentität**. Nur lokal verifizierte, signierte und ausgeführte Paper-Aufträge dürfen als Fills gezählt werden.

## Verifikation und ehrliche Grenzen
- Offline-Provider-Mocks testen beide unabhängigen Anbieter, falsche Pools, abweichende Preise, 429, Lookahead, Source-Whitelist und die bestehenden BUY-Sicherheitsgates.
- V6.4-Rankings können Gewinner **erst nach dem Anstieg** anzeigen: Ranking ist eine Erkennungsquelle für **jetzt** und beweist keinen frühen Kauf.
- 2 Tokens pro 2-Minuten-Tick und Anbieterlimits bedeuten unvollständige Abdeckung. Original-Veröffentlichungs- und First-Seen-Zeiten sind getrennt zu behandeln. Es gibt keine Gewinnprognose-Garantie.
- Nach dem Merge muss der tatsächliche Windows-Collector den neuen Code auschecken und neue, unveränderte Market-Feeds veröffentlichen. PR/Merge aktiviert lokale Windows-Codeänderungen nicht automatisch.
- Solana ist durch diese Änderung **nicht** als GPT-Paper-BUY ausführbar; dafür bleibt ein echter Solana-Quote-/Security-/Executor-Nachweis erforderlich.
- Das Repository enthält derzeit keine unabhängig belegten LIVE-GPT-PAPER-FILLED-Trades für 20.11.2026. Ein synthetischer CI-Fill ist kein echter aktueller GPT-Kauf.

## Testaufrufe
`node --test runner/r29-ranking-pool-resolver.test.mjs runner/research-public-ranking-discovery.test.mjs runner/r29-canonical-market-relay.test.mjs runner/gpt-paper-security-research.test.mjs runner/live-paper-autopilot.test.mjs`

`node --check runner/r29-ranking-pool-resolver.mjs && node --check runner/research-market-daemon.mjs && node --check runner/live-paper-risk.mjs`

## Noch zu erledigende echte Abnahme
1. Auf Windows in der bestehenden lokalen zwei-Minuten-Datensammlung die neuen `R29_RANKING_CROSS_PROVIDER_POOL` Kandidaten mit ursprünglichem Erfassungszeitpunkt nachweisen (keine gefälschten Daten).
2. Eine tatsächliche GPT-Vollanalyse mit einem solchen Pool archivieren, anhand aktuellen unabhängigen Sicherheitsdaten entscheiden; einen BUY **nur bei bestandenem Gate** veröffentlichen.
3. Die GitHub-Herkunft und den Archivhash prüfen, danach lokalen `PAPER_FILLED`-Beleg und später SELL/Exit überwachen. Bei fehlendem Gate WATCH und exakten Blockgrund melden.
