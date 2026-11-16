# Erfahrungsjournal R29 · Verlustfilter aus realen historischen CEX-Kursmodellen

**Veröffentlicht:** 2026-11-16 · **Status:** `EXPLORATORY_NOT_FORWARD_VALIDATED` · **Keine automatische Live-Paper-Änderung**.

**Beobachtung:** Der bereits bekannte 60-Tage-CEX-Schattenhandel (18.09.–16.11.2026, rückblickend bekannte Binance-Symbole, historische Kurswerte und modellierte 1%-Kosten je Seite) hat bei Staffelbeträgen 250/100/50 von 5.000 TEST-USDC auf **4.801,78** indikativen Endwert verloren. **33** geschlossene Trades, davon **3 Gewinne und 30 Verluste**. Das ist KEIN reales GPT-DEX-Backtestergebnis.

**Tatsächlicher Eingriff im Forschungssimulator, NICHT im Laptop:** Eine *nur spätere* Kaufannahme wurde abgelehnt, wenn dasselbe Coinsymbol in den **vorangegangenen sieben oder vierzehn Kalendertagen** bereits mindestens zwei geschlossene negative Modelltrades hatte. Gleichzeitig datierte Abschlüsse werden aus Vorsicht nicht als vorher bekannt verwendet. Alle anderen historischen Kauf-/Verkaufssignale und Kurswerte blieben unverändert. Die 60-Tage-Quelle war bereits bei Entwurf sichtbar.

| Szenario | Modellierte Gesamt-Endequity | Ablehnungen | Modellierte Gewinner / Verlierer |
|---|---:|---:|---:|
| Original (kein Filter) | 4.801,78 | 0 | 3 / 30 |
| Zwei vorausgehende Verluste binnen 7 Tagen | 4.824,02 | 3 | 3 / 27 |
| Zwei vorausgehende Verluste binnen 14 Tagen | 4.848,20 | 7 | 3 / 23 |

**Einschränkungen:** Aus schon gesehenen 60 Tagen entworfener Filter; daher **kein** unabhängiger Out-of-sample-Beweis, keine valide „+46,42 USDC Strategieverbesserung“ und keine Gewinngarantie. Das alte Signaluniversum ist selbst vom ursprünglichen Positionsplan abhängig, sodass unter anderen offenen Slots zusätzliche Signale entstehen könnten, die der Gegenversuch nicht erfasst. Dass er in dieser Quelle die drei Gewinner erhält, ist historische Beobachtung, keine Erwartung für nächste Trades.

**Lernhypothesen zur separaten zukünftigen Überprüfung:**
- Risikogrenze für neue Eintritte nach wiederholtem **tatsächlich lokal quittiertem** Verlust einer *gleichen Token-/Pooladresse*, nicht blind nach ähnlichem Tokenname.
- Neue sichere Coin-Chancen dennoch unabhängig analysieren und dokumentieren. Bei 2 Verlusten in zeitlichem Kontext zunächst WATCH statt automatischer Folge-BUY.
- Zusätzlich unabhängige Exit-Sellability, LP-Rückzug, organische Wallet-Adoption und ausführbare Quote stärker gewichten als reinen Preisimpuls.
- Erst mit **neuen Forward-Paper-Daten** die Wirksamkeit belegen; Vergleich mit gleicher Kandidatenmenge, gleichen Kosten, gleichem Risikobudget und Quittungsnachweisen. Kein Backtest-Tuning, um nachträglich einen Plusbetrag zu präsentieren.

**Unveränderliche Quelle und Code:** `research/replay-120d-real/60_TAGE_VERLUSTANALYSE_VERBESSERUNGSPLAN_DE.md`; `research/replay-120d-real/results/60_TAGE_VORHERIGE_VERLUSTE_COOLDOWN_NUR_DIAGNOSE.json`; `research/replay-120d-real/cex-loss-control-diagnostic.mjs`; CI https://github.com/127027/Sniperbot-/actions/runs/43947405737.

**Keine Folgerung für echtes Geld, Wallet- oder aktuelle GPT-Orderfreigabe. PAPER_ONLY und sämtliche Security-KO-Regeln bleiben unverändert.**
