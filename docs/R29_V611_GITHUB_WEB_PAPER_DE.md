# R29 V6.11 – GPT-Webpreis → GitHub → echtes **virtuelles** Windows-Paperkonto

## Ziel und Sicherheitsgrenze

Das bestehende R29-GPT-Modell bleibt alleiniger Entscheider über Chain, Token, Pool, BUY, SELL, Risiko und Exit-Policy. Die 50 TEST-USDC pro Coin (oder ein anderer vom Nutzer **lokal** eingestellter Betrag) legt der Bot fest. Windows verbindet sich wie gewünscht ausschließlich mit **GitHub REST** und der lokalen Dashboard-Loopback-Adresse, nicht mit irgendwelchen externen Markt-/Security-/OpenAI-APIs. Keine realen Wallet-Swaps.

**Die neue V4-Order simuliert den Kauf oder Verkauf zu einem auf zwei unabhängigen öffentlichen Webseiten beobachteten Kurs. Dies ist eine echte Buchung im virtuellen Paper-Ledger, aber KEIN unabhängig ausführbarer DEX-Trade.** Verkaufsfähigkeit, tatsächliche Liquidität, Slippage, Honeypot-Sicherheit und Preiswahrheit sind mangels unabhängiger API-/Blockchain-Prüfung NICHT nachgewiesen. Alle V4-BUY-Entscheidungen sind deshalb ausdrücklich `security_assessment=UNKNOWN`, `risk_level=HIGH`. Nie als „sicher“, „verifiziert“, „onchain“ oder tatsächlicher USD-Gewinn bezeichnen. Gewinn/Verlust im Dashboard ist indikativ.

## Aktueller GitHub-Nachrichtenkanal

- Bestehender Repo-/Branch-/R29-GPT-Pointer: `research/r29/channel/gpt-paper-decision.json` (unverändert).
- Bestehendes SHA-256-gesichertes Decision-Archiv: `research/r29/gpt-decisions/YYYY-MM-DD/gpt_<32hex>.json` (unverändert).
- Neu unterstützte Entscheidungs-Version: `sniper_r29_gpt_paper_decision.v4` mit **einem zusätzlichen Feld** `web_market_evidence`. Die restlichen V3-Felder bleiben vorhanden.
- Nur nach tatsächlich durchgeführtem Web-Review, schriftlicher Quellen-Dokumentation und echtem GPT-Entscheid darf eine BUY/SELL-V4-Order ins GitHub-Archiv geschrieben werden. Kein Demo-Signal, kein künstlich erzeugter Gewinner.
- Die bereits bestehende owner-attributed-Commit-Prüfung, SHA-256-Archivprüfung, authentifizierte localhost-Relay-Verbindung, Ed25519-lokale Paper-Signatur, Replay-Schutz, Portfolio-Budget und gespeicherte EXIT-Policy bleiben in Kraft.
- Empfangener GPT-Review oder GitHub-Pointer alleine ist **kein PAPER_FILLED**. Nur Windows-Fill im *regulären* Paper-Ledger und dazugehörige Receipt zählen.

## `web_market_evidence` (nur für BUY/SELL)

```json
{
  "schema": "sniper_r29_gpt_web_price_evidence.v1",
  "mode": "PAPER_ONLY",
  "chain": "solana",
  "token_address": "REAL_VALID_TOKEN_ADDRESS",
  "pool_address": "REAL_VALID_POOL_ADDRESS",
  "observed_at_utc": "2026-11-20T22:00:00.000Z",
  "price_usd": 0.000012,
  "liquidity_usd": 25000,
  "sources": [
    {
      "url": "https://dexscreener.com/solana/REAL_VALID_POOL_ADDRESS",
      "observed_at_utc": "2026-11-20T22:00:00.000Z",
      "price_usd": 0.0000121,
      "liquidity_usd": 24800
    },
    {
      "url": "https://www.geckoterminal.com/solana/pools/REAL_VALID_POOL_ADDRESS",
      "observed_at_utc": "2026-11-20T22:00:00.000Z",
      "price_usd": 0.0000119,
      "liquidity_usd": 24600
    }
  ],
  "quote_quality": "INDICATIVE_WEB_ONLY",
  "sellability_verified": false,
  "executable_quote_verified": false
}
```

**Werte oben sind ausdrücklich ein Strukturbeispiel, keine echte Marktbeobachtung und dürfen NIEMALS als reale Entscheidung veröffentlicht werden.** Für den tatsächlichen Einsatz müssen Token/Pool und Preise aus zwei real und aktuell kontrollierten Webseiten stammen. Keine API-Adressen, keine Ticker-/Symbolverwechslung, keine rückdatierten Preise. Die beiden URLs müssen exakt denselben Token oder Pool enthalten; sie müssen zwei unabhängigen zugelassenen Webseiten-Domains gehören. Die zentralen und zwei Quellenpreise dürfen um höchstens ±10 % voneinander abweichen. Die Liquiditätsangaben müssen ebenfalls konsistent sein. Der Quellenstempel darf beim Empfang nicht älter als 90 Sekunden sein; im Schema-Validator max. 120 Sekunden. Mindestbeobachtungsliquidität 10.000 USD, 50-TEST-USDC-Einsatz weiterhin durch maximal 0,5 % der gemeldeten Poolliquidität und das normale Guthaben begrenzt.

**V4 BUY:** `amount_test_usdc=null`, `sizing_mode=LOCAL_USER_COIN_STAKE`, `exit_policy` nach bestehendem v2/v3-Exit-Schema, `security_assessment=UNKNOWN`, `risk_level=HIGH`, aktuelle Quellen- und Recherche-Zeitstempel, max. 180s Ablauf.

**V4 SELL:** eigene neue `decision_id` + frische, unabhängig von der BUY-Beobachtung eingeholte Webpreisquellen für dieselbe Chain/Token/Pool-Kombination; `exit_policy=null`, `sizing_mode=null`, weiterhin `security_assessment=UNKNOWN` und `risk_level=HIGH`. Kein SELL bei bloßem rückblickendem Hoch; PnL nur mit dem zeitlich gültigen Verkaufsbeleg.

**GPT-Frequenz:** Die bestehende GPT-Automation läuft nur stündlich. Sie kann deshalb weder einen 30-Sekunden-Marktfeed noch jederzeit einen Stop-Loss-Exit ersetzen. V4-Positionen dürfen nicht mit alten Preisen automatisch glattgestellt werden. Bis eine unabhängige, laufende GitHub-Preiserneuerung implementiert und abgenommen ist, benötigt ein V4-Verkauf eine neue explizite signierte GPT-V4-SELL-Entscheidung mit zwei aktuellen Webseitenpreisen. Der vorhandene 30s-Exitmonitor bleibt aktiv, **löst bei V4-Positionen ohne frische zulässige Daten aber keine künstlichen Verkäufe aus**. Ein positiver Preis/hoher Stundenanstieg bedeutet keinen garantierten Erfolg.

## Tests und Nachweise

- `runner/gpt-web-price-evidence.test.mjs`: gültige Webseite-/Solana-Identitäten, stale/future/tampered/Domain-Spoof/Preiswiderspruch/fehlende Quellen.
- `runner/gpt-web-v4-paper-roundtrip.test.mjs`: echtes Ed25519-signiertes BUY→PAPER_FILLED→neue SELL→PAPER_FILLED im **isolierten lokalen** regulären Paper-State; kein externer API-Aufruf und kein Live-Wallet-Kontakt, keine doppelte Einbuchung, Pause neuer Käufe verhindert SELL nicht, Risikostufe nicht weichzeichnbar.
- Bestehende Windows+Linux Offline-CI, lokaler HTTP-Test, V3-Kauf-/Verkaufregression und Github-only-Egress-Sperre müssen weiter bestanden bleiben.

## Abnahme auf dem Benutzer-Windows-PC

Es ist erst dann ein **genuine autonomer Paper-Trade** nachgewiesen, wenn der Windows-Bot auf die aktuelle V6.11-Version aktualisiert wurde, GPT eine wirkliche zeitnahe V4-Order veröffentlicht, der GitHub-Kurier ihren SHA-geprüften Inhalt erhalten hat, und im echten Benutzer-Paper-Ledger ein `PAPER_FILLED`-BUY mit offener Position erscheint. Ein V4-SELL braucht eine eigenständige neue Prüfung und eigenen tatsächlichen `PAPER_FILLED`-Receipt. Die Tests und GitHub-Recherche selbst erfüllen diese Abnahme **nicht**. Ein Nutzer muss die laufende Windows-Version gezielt aktualisieren; ein GitHub-Merge aktualisiert keine bereits gestarteten Prozesse.

Kein neues Bot-Fenster, keine zusätzliche Handelsautomation, keine API-Kosten, kein Echtgeld.
