# R23 – Historischer Mehr-Coin-Sprint statt leerem PEPE-Polling

Stand: 14.11.2026. RESEARCH_ONLY, TRAINING_ONLY. Kein Echtgeld, keine Wallet,
keine Änderung am bestehenden Paper-Konto und keine zusätzlichen kostenpflichtigen
Modellaufrufe. Der gespeicherte R20-Stand war 8/62 Tage, 0 belegte Trades.

## Das eigentliche Ziel

Mindestens **50 WEITERE echte historische Memecoins** in unterschiedlichen
historischen Zeitfenstern entdecken und unabhängig bewerten, darunter Gewinner,
Fehlschläge, Rug-Pulls und unbeachtete Coins. Keine rückblickend ausgesuchten
Gewinnerlisten als Blindtest-Eingabe verwenden.

Zählungen strikt trennen:
1. Neu entdeckte historische DEX-Pool-KANDIDATEN.
2. Aus damaligen Belegen unabhängig als Memecoin klassifizierte TOKEN.
3. Historisch ausführbare Paper-Signale.
4. Nach versiegeltem Replay simulierte FILLS und Nettoergebnisse.

Ein Pool ist KEIN Beweis für (2), (3) oder (4). Bisher sind 50 weitere echte
Memecoins nicht nachgewiesen.

## Neuer schneller, kostenschonender Datensammler

Datei: research/replay-controller/r23-onchain-discovery.mjs
- Ethereum Uniswap V2 PairCreated-Logs werden über eine blockweise, gebündelte
  Ethereum RPC Abfrage erfasst, nicht mittels fünf stündlichen Dot-Pings.
- Nur nach zeitpunktunabhängiger Regel ausgewählte WETH-/USDC-/USDT-Paare.
  Alle Pools nach dieser Regel einbeziehen, auch spätere Fehlschläge.
- Optional liefert ein zweiter unabhängiger Archiv-RPC eine Gegenprüfung.
  Ohne zweiten Provider werden Event-Belege NICHT als verifiziert markiert.
- Kein Social-, Market- oder Security-Beleg wird erfunden.
- Fortsetzen via --resume-from-block; jeder Batch erhält eigene Ausgabedatei.

Datei: research/replay-controller/r23-merge-batches.mjs
- Verbindet ausschließlich lückenlos aufeinanderfolgende Blöcke.
- Verweigert Dubletten, Überlappungen, Lücken, inkompatible Fenster.
- Berichtet Poolkandidaten getrennt von Memecoin-Klassifikationen und Trades.
- Die inkludierten 2023-Blockdaten sind NICHT schon historisch beschafft.

Die Sammlung deckt zunächst nur Ethereum Uniswap V2 ab. Für alle Chains
müssen weitere regelbasiert ausgewählte Kohorten folgen.

## Betrieb ohne gekaufte APIs

Voraussetzung: Node 22 und ein erlaubter Ethereum Archive-RPC, der für 2023
eth_getLogs unterstützt. Kostenlose öffentliche RPCs können diese Abfragen
begrenzen oder sperren. Keinen kostenpflichtigen Dienst automatisch buchen.
Ein zweiter wirklich unabhängiger Anbieter erhöht die Nachprüfbarkeit.

In PowerShell:

    $env:RESEARCH_RPC_URL = "https://DEIN_ARCHIVE_RPC"
    $env:RESEARCH_RPC_SECONDARY_URL = "https://DEIN_ZWEITER_RPC"
    node research/replay-controller/r23-onchain-discovery.mjs --output=PRIVATE/r23/part1.json --max-chunks=50 --step=1200

Danach die angezeigte continuation_from_block ablesen:

    node research/replay-controller/r23-onchain-discovery.mjs --output=PRIVATE/r23/part2.json --resume-from-block=NUMMER --max-chunks=50 --step=1200

Nur wenn beide Pakete den Blockbereich lückenlos abdecken:

    node research/replay-controller/r23-merge-batches.mjs PRIVATE/r23/merged.json PRIVATE/r23/part1.json PRIVATE/r23/part2.json

Der Merge-Output enthält eine Eigenschaft asof_corpus. Diese Eigenschaft als
separate private JSON-Datei speichern und mit r22-intake.mjs intake verwenden.
Die gesamte Merge-Hülle ist KEIN asof_corpus.v1. Die Quelle kann eine
unabhängige Vollständigkeitsattestierung nicht selbst erzeugen: Ein neutraler
BLIND-Test bleibt daher bis zur unabhängigen Prüfung blockiert.

Quellen zu Protokoll/Factory:
https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Factory.sol
https://ethereum.github.io/execution-apis/api/methods/eth_getLogs/

## Rollenaufträge auf belegte Datenpakete umstellen

Scout: Alle in einem historischen Paket sichtbaren neuen Coin-Pools
identifizieren, deduplizieren und nach damaligen Signalen sortieren; keine
späteren Erfolgspreise oder selektiven Gewinnernamen.

Social: Die damals veröffentlichte UND archivierte Aufmerksamkeit belegen,
mit ursprünglicher Zeit und unveränderlichem Quellenhash. Fehlender
Zeitbeleg bedeutet UNKNOWN, nicht 0 Engagement.

Onchain: Token-, Pool-, Mint-, Swap-, Reserven- und Ausführungsdaten aus
damaligen Chain-Blöcken verifizieren; PoolCreation != Kaufbarkeit.

Security: Historische Vertragsrechte, Honeypot-/Sellability-, LP- und
Adminrisiken blockzeitgerecht prüfen. UNKNOWN statt unbelegtem Ja.

QA: Erst nach vier echten gleichzeitigen Rollenprüfungen Paper-BUY/SELL/HOLD
formulieren; ohne Quote, Security, Liquidität keine simulierte Fill-Behauptung.

Keine fünf Statusberichte pro fehlendem Tag: zunächst Quellpakete sammeln,
leere oder unvollständige Tage als DATA_GAP markieren. Diese GitHub-Anweisung
ist KEIN Nachweis, dass die fünf bestehenden ChatGPT-Automationen aktualisiert
wurden. Beim späteren chronologischen Replay dürfen keine historischen Frames
übersprungen oder Fake-Rollenstimmen erzeugt werden.

## Abnahmekriterien

- Mindestens 50 weitere ECHTE historische Memecoin-Klassifikationen aus
  nachvollziehbar zeitgerecht verfügbaren Daten und neutralen Kohorten.
- Bewertung von Gewinnern, Fehlschlägen und übersehenen Projekten.
- Kauf/Verkauf nur zu späteren verifizierten, ausführbaren Quotes inklusive
  Gas, Slippage, Liquidität, Steuern/Gebühren, fehlgeschlagenen Exits.
- Entwicklung, Validierung und Holdout getrennt; keine Winner-Leakage.
- CI mit Mock-RPC ist nur ein technischer Test, kein realer Quellen- oder
  Live-Markt-Test, kein beendeter 62-Tage-Blindtest.

Keine Änderung von R20-Rollenfiles oder laufenden Paper-Trading-Daten.
