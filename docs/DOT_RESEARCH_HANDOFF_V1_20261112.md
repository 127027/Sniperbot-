# DOT Research Handoff V1 — Forschungsübergabe an den separaten Bot (12.11.2026)

**Gilt ausschließlich für Research.** Die fünf bestehenden Automations-Snapshots behalten das strikte `research_role_snapshot.v1`-Schema und ihre bisherigen Schreibrechte. Dieses Dokument ist eine **zukünftige, separate aggregierte Schnittstellen-Spezifikation**; keine laufende Pipeline schreibt sie bereits, kein Client darf daraus automatisch BUY/SELL ableiten. Paper und Echtgeld bleiben unberührt.

## Abgrenzung
- Dieses Forschungsprojekt: Meme-/Event-Discovery, unabhängige Social-/Onchain-/Sicherheitsnachweise, zeitbezogene Prognose-Evaluation, QA.
- Separates Bot-Projekt: Kapitalverteilung 50–100.000+ (nur gemäß tatsächlich vorhandenem Budget und Risiko-/Liquiditätslimits), Ausführung, Ledger, Ausstiegssteuerung, Live-Sperre.
- Signing-/Execution-Risk-Controller: unabhängiges System, nicht die fünf ChatGPT-Automationen. Forschungsdateien allein sind niemals signierte Orders.

## Kaskade vor einer Handoff
1. `UNMATCHED_EVENT`: originärer Meme-/Promi-/Politik-Auslöser mit Originalquellen, event UTC und first_seen UTC, **ohne** identifizierten Coin; KEINE Kaufbarkeit.
2. `TOKEN_IDENTIFIED`: eindeutig belegtes `chain:token_address:pool_address`, Pool/Chain-Adressen und unabhängiger Pair-Nachweis, aber Risiko/Sellability noch offen.
3. `RESEARCH_REVIEW`: eine oder mehrere unabhängige Rollen beurteilen Hype, zeitliche Frühphase, Liquidität, Scam-Risiko, Quellenkorrelation und mögliche Kauf-/Verkaufsrouten.
4. `BOT_EVALUATION_CANDIDATE`: QA sieht ausreichend belastbare, datierte Forschungsgründe, damit **der Bot** eine separate Entscheidungs-/Risikoprüfung *beginnt*. KEINE Kaufaufforderung, KEIN Auftrag, KEIN signierter Publisher, KEINE Handelsfreigabe. Ein echtes Sicherheits-Veto verbietet Eskalation; UNKNOWN bleibt explizit unbewertet.

## Separates zukünftiges Research-Handoff-Dokument (Proposed Schema)
Beispiel nur als Struktur/Vertrag, kein echter Coin:
```json
{
  "schema": "sniper_research_handoff.v1",
  "paper_only": true,
  "actionable": false,
  "status": "RESEARCH_REVIEW",
  "candidate_id": "solana:EXAMPLE_TOKEN:EXAMPLE_POOL",
  "event": {
    "type": "PUBLIC_MEME_EVENT",
    "original_url": null,
    "original_event_at_utc": null,
    "first_observed_at_utc": null,
    "original_capture_at_utc": null
  },
  "identity": {
    "chain": "solana",
    "token_address": null,
    "pool_address": null,
    "identity_verified": false,
    "source_urls": []
  },
  "hype_phase": "UNKNOWN",
  "role_evidence": {
    "news_discovery": null,
    "social_acceleration": null,
    "onchain_liquidity": null,
    "contract_security": null,
    "opportunity_qa": null
  },
  "market": {
    "observed_at_utc": null,
    "entry_quote_usd": null,
    "liquidity_usd": null,
    "sell_route_verified": false
  },
  "probability_forecasts": {
    "model_id": null,
    "calibration_status": "UNAVAILABLE",
    "horizon_hours": [24, 168, 720],
    "probabilities": {
      "at_least_2x": null,
      "at_least_6x": null,
      "at_least_11x": null,
      "at_least_51x": null,
      "at_least_101x": null,
      "near_total_loss": null
    }
  },
  "uncalibrated_opportunity_score": null,
  "risk_veto": "UNKNOWN",
  "counterevidence": [],
  "bot_action": "REVIEW_ONLY",
  "created_at_utc": null
}
```
**Achtung:** Die Platzhalter in diesem Beispiel sind KEINE gültige Token-/Pool-Identität. Niemals als Trade verwenden. `EXAMPLE_TOKEN` und `EXAMPLE_POOL` dienen nur der Lesbarkeit.

## Prozentkorrektheit
- Bei einer Rendite von +100 % => Endwert 2× Einstieg.
- +500 % => 6×, +1.000 % => 11×, +5.000 % => 51×, +10.000 % => 101×.
- Diese Werte sind PROGNOSEN für exakt bezeichnete Zeitfenster und eine echte Eintrittsquote, **keine** garantiere Rendite oder Kapitalgrößenempfehlung.
- Prognosen sind ohne auf negative UND positive Vergleichsfälle und getrennte Zeitfenster geprüfte Calibration **null**. Scores 0–100 sind unabhängig von Prozentwerten und keine echten Wahrscheinlichkeiten. QA darf fehlende Daten nicht mit erfundenen Schätzwerten kompensieren.
- Falls künftig echte Wahrscheinlichkeiten vorhanden sind: `P(>=101x) <= P(>=51x) <= P(>=11x) <= P(>=6x) <= P(>=2x)` für denselben Horizon, Basispreis und Datenstand; sonst ungültig.
- 24h/7d/30d Horizonte benötigen eigene Kalibration. Eine volatile Pump-Spitze mit nicht verkaufbarer Liquidität zählt nicht als realisierter Gewinn.
- Prognoserevisionen sind append-only mit `as_of`, `horizon`, `model_id`, `evidence_ids` und späterem tatsächlichen Outcome. Verluste, Fehlstarts, und nicht verfügbare Daten zählen in die Qualitätsstatistik.

## Empfangs- und Sicherheitsanforderungen
- Gemeinsame candidate_id: `chain:token_address:pool_address`, EVM lowercase und Solana Base58 case-sensitive.
- `first_observed_at_utc` ist das erste wirkliche Systemsehen, nicht das später behauptete Erstveröffentlichungsdatum.
- Originalpost-/Quelleninhalt und Capture-Zeit chronologisch beweisen, kein Backtest mit Zukunftsinformation.
- Quellenausfälle und stale market snapshots sind explizit; alte Feeds nicht als aktuelle Signale darstellen.
- Keine Claim-Mehrfachzählung: fünf Agenten, die denselben Aggregator lesen, sind keine fünf unabhängigen Nachweise.
- Unvollständiger Contract, fehlende Sellability, honeypot und Liquiditätsproblem => keine Execution-Weitergabe.
- Bot muss bei eigener Prüfung Wallet/Quote/Portfolio/Slippage/Fees/Rate-Limits/Replay und Kapitalbudget erneut prüfen.
- Niemals Github-Research-File als Ed25519-Signatur, `paper_execution_decision.v1`, `sniper_agent_trade_signal.v1` oder Kaufauftrag ausgeben.

## Erfolgsmessung pro Event-Kohorte
Unabhängig davon, ob ein Token bereits existiert: `event_first_seen`, `mint/pool_first_seen`, `source_capture_at`, `earliest_valid_quote`, `earliest_independent_social_evidence`, `review_time`, `time_of_first_2x/6x/11x/51x/101x` sofern später mit belegbarer Quote verfügbar. Führe negative Kohorten und Ghost-Tokens mit. Kennzahlen: Datenerfassungsquote, frühzeitiger Recall, Precision, Falschalarmquote, kalibrierte Brier-/Reliability-Werte und erreichbare Exit-Liquidität.

## Offene Blocker / aktueller Stand
Am 12.11.2026 sind fünf Research-Automationen aktiv. Letzter geprüfter GitHub-Research-Zustand: alle fünf `NO_VERIFIED_CANDIDATE`; Watchlist enthält 137 alte Identitäten, letzter Windows-Marktsnapshot aus 11.11.2026 02:44Z und stale. Kein echter signierter Dot-Publisher, keine verifizierte Research-to-Order-Ausführung. Historische Excel-Datei ist ein Fallindex, keine vollständige unverzerrte as-of-Trainingstabelle. Die Übergabe ist hier **dokumentiert, nicht implementiert**, und darf im anderen Bot-Chat erst durch validierten Adapter als Research-only konsumiert werden.

## Dot-Rollen und Schreibrechte
- Scout: eigene `research/roles/news_discovery/latest.json` und autorisierte Watchlist.
- Social: nur `research/roles/social_acceleration/latest.json`.
- Onchain: nur `research/roles/onchain_liquidity/latest.json`.
- Contract: nur `research/roles/contract_security/latest.json`.
- QA: nur `research/roles/opportunity_qa/latest.json`.
- Neues vorgeschlagenes Aggregat: Bot-Team entwickelt Read-only-Schnittstelle mit gesonderter Rechte- und Schemaprüfung. Dots ändern ihren Vertrag nicht und können keine Orders ausstellen.
