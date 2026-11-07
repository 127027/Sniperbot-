# Sniper Halte- und Exit-Strategie – zu validierende Forschungsannahmen

**Sollzustand, nicht automatisch aktiv.** Der Produktwunsch ist frühe Entdeckung seltener Memecoin-Ausreißer, variable Positionen (etwa 50–200 oder 50–1000 Test-USDC) und langes Begleiten intakter Trends **ohne pauschales +15-%-Take-Profit**. Auch +1.000 % oder 100× sind Extrembeispiele, keine prognostizierbaren sicheren Gewinne. Totalverlust, LP-Abzug und fehlender Verkaufspfad können auftreten.

## Lokale autonome Kontrolle

- Jede **getrennte Instanz** erhält dieselben zentralen Research-/Exit-Hinweise, besitzt aber eigene offene Positionen, eigene Steuerung, eigene Historie und eigene Exit-Parameter.
- `Bot AUS` stoppt **nur neue Einstiege**; offene Positionen werden unabhängig vom zentralen Publisher weiter beobachtet. In V0.4 gibt es HOLD, LEGACY AUTO und TRAILING; echte externe Sell-Quote-Validation fehlt.
- Ein globaler Research-Exit-Hinweis ist **kein Sell-Befehl**. Die lokale Engine prüft die konkrete eigene Position gegen aktuelle Verkaufbarkeit, Risikozustand, Verfügbarkeit und Nutzerregeln. Für Coins ohne lokale Position keine Aktion.
- Ein **fehlender Hype** allein reicht **nicht** zum automatischen Verkaufen; messbare Kombination aus wegfallenden einzigartigen Käufern, Liquidität, Wallet-Flows, Informationslage, Kurs-/Volumensignal und alternativer Kapitalnutzung prüfen.
- Auch ein Verkauf von einem ursprünglichen Einsatz von 50 auf 25 Test-USDC ist zulässig, wenn die Investmentthese beschädigt und ein simuliert **ausführbarer** Exit verfügbar ist. Es lässt sich nicht sicher vorhersagen, dass ein Coin nie wieder steigt.
- Nur virtuelle Testgelder. Kein ungeprüfter Mid-Price-Exit; beim `EXIT_UNAVAILABLE` keine Gewinn-/Verlustrealisierung erfinden.

## Hypothetischer Überwachungsplan – Backtest, kein festes Verkaufsdatum

| Alter seit Einstieg | Forschungs-/Positionsprüfung |
|---|---|
| 0–24 h | Sehr enge Bewertung von Pool-Liquidität, Contract-Risiko, organischen Käufern, Volatilität und neuen Signalen |
| Tag 2–7 | Prüfung, ob der anfängliche Hype organisch weiterwächst oder nur wenige koordinierte Wallets aktiv waren |
| Tag 7–14 | Formale Erneuerung der Investmentthese; negatives Gesamtbild erlaubt Exit mit Verlust |
| Tag 14–30 | Längere Haltezeit nur bei nachweislich intakter Nachfrage, Verkaufbarkeit und sinnvoller Kapitalbindung |
| Nach 30 Tagen | Konkrete neue Haltebegründung erforderlich, keine passive Endlosschleife |
| Nach 90 Tagen | Nur begründete Ausnahme, andernfalls kritische Überprüfung und Kapitalalternativen |

**Diese Zeitfenster sind vorgeschlagene Reviewpunkte, keine statistisch belegten optimalen Haltedauern oder automatische Verkaufsfristen.** Erforderlich sind historische, zeitkorrekte Analysen von zufällig und vollständig gewählten Launch-Kohorten (auch gescheiterte/geruggte Coins), Out-of-sample-/Walk-forward-Tests, Ausführungskosten und Exit-Fail-Rates. Keine aus vergangenen Gewinnern abgeleiteten perfekten Einstieg-/Ausstiegsregeln oder Lookahead.

## Offene Aufgaben an Codex

- Separate `research_exit_advisory.v1` / `EXIT_ALERT` als **Information** an alle abonnierten Nutzerbots verteilen; der Publisher kennt deren Positionen nicht.
- Lokale kombinierte Risiko-/Trend-/Momentum-/Liquiditäts-Exit-Regeln entwickeln; je Position dauerhaft speichern und nach Neustart laden.
- Adaptive Volatilitäts-Trailings, kritischer LP-/Authority-Alarm, wirtschaftlicher Exit bei Thesisbruch und optionale Teilverkäufe gegen reines HOLD/LEGACY AUTO testen.
- Selbst bei ausgeschaltetem Browser und deaktivierten Neueinstiegen weiterlaufen; ausgeschaltete/rechnerseitig schlafende Prozesse oder fehlende Quotes als `UNAVAILABLE` kennzeichnen, nicht als 24/7 überwacht darstellen.
- Evaluation: Median/Perzentile der Haltedauer, Risiko nach 7/14/30/90 Tagen, Trefferquoten, Netto-PnL, Drawdown, Exit-Fails, Illiquidität und Anteil der Erträge durch seltene Ausreißer.

**Keine Ausweitung von Hixton; keine echten Trades oder Zahlungen.** Siehe [DISTRIBUTED_INSTANCES.md](DISTRIBUTED_INSTANCES.md).
