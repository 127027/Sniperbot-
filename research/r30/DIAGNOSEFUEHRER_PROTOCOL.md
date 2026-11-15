# Sniperbot R29 – Protokoll des GPT-Diagnoseführers (Paper Only)

**Dies ist KEINE neue Bot-Version.** Das Verzeichnis `research/r30/` bezeichnet einen **30-Tage-Diagnosetest**, keine R30-App.
Freigegebener Projektbranch: `codex/r29-chatgpt-github-paper-cycle-20261115`.

## Aufgabenverteilung

- **GPT (Diagnoseführer):** bewertet prospektiv die zuletzt belegten Coin-/Market-/News-/Social-/Security-Ereignisse, erstellt begründete BUY_CANDIDATE / WATCH / HOLD / REDUCE / EXIT / NO_TRADE **Empfehlungen** mit unveränderlichem Analysezeitpunkt und Evidence-IDs. Kein Walletzugriff.
- **GitHub:** transportiert nur versionierte, nachvollziehbare Statusmeldungen, Forschungsnachweise, Anfragen und Quittungen. **Eine angezeigte Forschungsdatei ist KEIN Handelsauftrag.**
- **Lokaler R29-Bot:** validiert signierte, explizit erlaubte Paper-Aufträge, prüft Risiko/Quote/Datenalter/Eindeutigkeit und schreibt Empfang, Ablehnung oder virtuellen Fill zurück. Kein Echtgeldhandel.
- **Risk Engine:** verweigert Aufträge bei fehlender Sicherheit, veralteten Daten, Risiko- oder Expositionsüberschreitung. GPT darf diese Entscheidungen nicht überschreiben.

## Strikter Tagesablauf (30-Tage-Replay bzw. künftiger Paper-Live-Zyklus)

1. Zu jedem Analysezeitpunkt das zum Zeitpunkt T **sichtbare** Universum aller tatsächlich nachgewiesenen neuen Pools/Tokenstarts rekonstruieren; nicht retrospektiv bekannte Gewinner bevorzugen.
2. Für jeden Kandidaten `chain_id + mint/contract`, Pool, `event_time`, `ingest_time`, Quelldaten und Originalbeleg binden.
3. Sicherheits-KOs **vor** dem Ranking: Sellability/Honeypot, Mint-/Freeze-/Blacklist-/Pause-Rechte, LP-Entzug, Deployer/Wallet-Cluster, Manipulation. Ungeprüft bedeutet UNKNOWN/NO BUY, niemals SAFE.
4. Das Forschungs-Score-Schema von 100 Punkten **nur nach Security Gate** verwenden: Security 30, Liquidity 20, Adoption 15, Momentum 15, Narrative 10, Wallet Quality 5, Cross-Venue 5. Ab 80 erst BUY_CANDIDATE, nicht blind kaufen. Score 80 ist **keine 80-%-Gewinnchance**.
5. Eintrittsvorbedingung: tatsächlich handelbare Liquidität, geschätzter Price Impact höchstens 1–1,5 %, organische unabhängige Käufer, keine manipulative Kerze, plausible Entry-Struktur.
6. Kapital: riskiertes Kapital pro Trade höchstens 0,25 % des gesamten Paper-Werts; bei sehr jungem Token höchstens 1 % Nominalposition; insgesamt höchstens 3 % Meme-Coin-Exposition; täglich 1 % und wöchentlich 2,5 % Verlustgrenzen. Der R29-Mindestkauf von 50 TEST-USDC gilt nur, wenn diese strengeren Regeln noch erfüllt werden.
7. Offene Positionen kontinuierlich auf Security/Liquidity/Momentum/Narrative/Trailing prüfen, unabhängig von Recherchefrequenz; im Zweifel EXIT oder pausieren. **Weder ein ungetesteter Quote noch ein backtestgenerierter Indikator erzeugt einen signierten Auftrag.**
8. Entscheidungen journalisieren, Bot-Quittung einholen und bestehende Kontostände unverändert belassen, bis ein separat freigegebener, validierter Paper-Auftrag vorliegt.

## Historische Datenhygiene

- Nur Fakten mit unabhängig belegter Verfügbarkeit spätestens zu T. Keine Daten von T+1, spätere ATHs, rückblickende Gewinnerlisten oder heutige Token-Trends als damalige Evidenz.
- Vollständigkeit des historischen Coin-Universums getrennt von einzelnen Nachrichten- oder Kursbelegen bestätigen.
- Bei fehlenden historischen Security-, Pool-, Social- oder DEX-Quotes `DATA_GAP`, **nicht `NO_TRADE` und nicht 0 Gewinn**.
- Für alle vier Frequenzen dieselben Universums-, Positions-, Exit-, Gebühren- und Risk-Regeln; nur Untersuchungstakt unterschiedlich.
- 30-Tage-Experiment: 16.10.2026 00:00 UTC bis 15.11.2026 00:00 UTC exklusiv, je 5.000 virtuelle Einheiten. Frequenzen 1/4/12/24 pro Tag => 30/120/360/720 Scans.

## Status des ausgeführten Tests

Die Tagesjournale und Binance-Proxy-Bilanzen liegen in `research/r30/results/`.
Der Code `research/r30/r30_backtest.py` bewertet nur das **R26-Preis-/Volumen-Proxymodell** gegen öffentliche historische Binance-Stundenkerzen. Diese virtuellen BUY/SELL-Proxys erfüllen **nicht** die oben beschriebenen Sicherheits- und GPT-Evidenzvorgaben, können nicht als GPT-Paper-Aufträge an den lokalen Bot gesendet werden und werden deshalb nur diagnostisch protokolliert.

Ohne unabhängig belegtes Point-in-Time-Pooluniversum, Security-Snapshots, News/Social-Ereignisse und DEX-Quotes gibt es derzeit **kein belegtes vollständiges GPT-P&L oder valides Ergebnis zur optimalen GPT-Recherchefrequenz**.

## Vorschlag für spätere Nachrichtenfelder, noch NICHT als ausführendes R29-API-Protokoll implementiert

```json
{
  "schema": "sniper_research_recommendation.v1",
  "mode": "PAPER_RESEARCH_ONLY",
  "actionable": false,
  "asof_utc": "2026-11-14T12:00:00Z",
  "chain_id": "solana",
  "contract_or_mint": "EXAMPLE_ONLY_NOT_REAL_TOKEN",
  "evidence_ids": [],
  "source_hash": null,
  "security_gate": "UNKNOWN",
  "score_0_100": null,
  "recommendation": "DATA_GAP",
  "reason": "Missing independent as-of pool, security and execution evidence"
}
```

Das Beispiel darf **nie** als BUY/SELL interpretiert werden. Ein wirklicher Paper-Intent benötigt den bestehenden signierten R29-Vertrag und eine gesonderte Validierung.
