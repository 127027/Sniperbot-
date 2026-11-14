# Memecoin Sniper V0.6 – Gesamtbudget und frühe Ereignis-Entdeckung

**Stand:** 10. November 2026 · **Branch:** `codex/research-gateway-v04` · **Paper-Trading** · **`main` unverändert**.

## 1. Eindeutige Benutzerregel

Die zwei vorhandenen Eingabefelder behalten ihre lokalen Werte, haben ab V0.6 aber eine **neue Bedeutung**:

- Feld 1 `minTrade` = **bevorzugter normaler Einzelkauf**, nicht mehr zwingende Mindestgröße.
- Feld 2 `maxTrade` = **Gesamtbudget für die gleichzeitig offenen Testpositionen**, nicht Höchstbetrag pro Einzelkauf.
- Neues optionales Persistenzfeld `portfolioBudgetUsdc` entspricht beim Speichern dem zweiten Feld. Wenn ältere private Papierdaten es nicht enthalten, nimmt die Engine konservativ `maxTrade` als Gesamtbudget, ohne Datenmigration oder Guthabenänderung.
- **Mindestgröße eines Einzelkaufs:** 50 TEST-USDC. `TARGET`-Käufe dürfen zwischen 50 und verbleibendem Gesamtbudget liegen. `EXPLORATORY` verwendet zunächst den bevorzugten Einsatz; `HIGH_CONVICTION` kann die tatsächlich noch verfügbare Budget-/Guthaben-/Kapazitätsobergrenze nutzen. Ein 0–100-Forschungsscore bestimmt die Kaufgröße nicht.
- Die harten Schranken sind `Summe(Kaufbetrag aller noch offenen Positionen) + neuer Kaufbetrag <= Gesamtbudget` **UND** `neuer Kaufbetrag <= freies virtuelles Guthaben`. Bewertungsgewinne auf offenen Positionen erzeugen dadurch nicht automatisch zusätzliche Einkaufskapazität. Bei Schließung wird der zugehörige ursprüngliche Kaufbetrag aus der Bindung freigegeben, die tatsächlichen Paper-Verkaufserlöse verändern separat den Kontostand.
- Wird das Budget unter den bereits gebundenen Betrag abgesenkt, werden Positionen **nicht** zwangsläufig oder heimlich verkauft; neue Käufe sind blockiert, bis genügend Budget durch normale Exits frei wird. Die bisherige An-/Aus-Schaltung neuer Einstiege lässt die bestehende Exit-Engine weiterhin arbeiten.

**Nachgewiesene Demo-/Unit-Beispiele** (keine echte Markthandelsentscheidung):

| Konfiguration | Zusätzlicher Kauf oder Verteilung | Ergebnis |
|---|---|---|
| bevorzugt 50, Gesamtbudget 5.000 | 100 verschiedene Coins zu je 50 | 5.000 belegt, Kauf Nr. 101 blockiert |
| bevorzugt 50, Gesamtbudget 5.000 | 2 × 2.500 | 5.000 belegt |
| bevorzugt 50, Gesamtbudget 5.000 | 1 × 5.000 | 5.000 belegt |
| bevorzugt 200, Gesamtbudget 300, Cash 5.000 | 50 + 50 + 200 | 300 belegt, weiteres 50 blockiert |
| bevorzugt 200, Gesamtbudget 300 | 200 + 200 | Zweiter Kauf wird abgewiesen |
| bevorzugt 200, Gesamtbudget 300 | Einzelne 100 | Zugelassen; 200 ist Präferenz, keine Mindestgröße |

`runner/portfolio-budget.mjs` bildet die Regeln ab. `runner/core.mjs`, `runner/research.mjs` und `runner/central-decisions.mjs` verwenden diese **gemeinsame** Policy. Die im Dashboard sichtbare Forschungswarteschlange ist **nicht handelbar** und zeigt allenfalls einen hypothetischen Rahmen nach freiem Gesamtbudget.

## 2. Mehr als nur Chart-Überwachung

**Alle fünf bisher laufenden Sniper-Forschungsautomationen** wurden ohne neuen Zeitplan mit einem proaktiven Quellenauftrag ergänzt: jede Rolle soll neue Coins auch aus Medien-Ereignissen, viralen Originalposts, neuen öffentlichen Tokenprofilen, Community-Übernahmen, DEX-Promotions, Launchpad-/Pool-Starts, Wallet-Cluster-Auffälligkeiten und konträren Sicherheitsbefunden finden. Jede Rolle hat weiterhin eine eigenständige Spezialität:

1. **News/Discovery:** neue Pools, neue öffentliche Viral-Narrative und originale datierte Ereignisse
2. **Social Acceleration:** X/TikTok/Reddit/YouTube/Farcaster/Bluesky/Telegram/Discord, soweit öffentlich tatsächlich verfügbar; echte Autoren und Diskussionen von Bezahlwerbung/Bots unterscheiden
3. **Onchain/Liquidity:** genaue Chain/Token/Pool-ID, Token-Neustarts, Transaktionen, echte Käuferwallets, Holder/LP-Cluster, Zeitfenster und Price Impact
4. **Contract/Security:** Mint/Freeze/Blacklist/Proxy/Tax, LP-Verwaltung, Honeypot, unabhängige Sell-Routen und Früh-Rug-Muster
5. **Opportunity QA:** eigene neue Trend-Entdeckung **und** Gegenprüfungen der anderen, fehlende Negativfälle/Lookahead-Fehler

Der **Windows-Collector** bleibt der engmaschige Prozess (ca. alle 120 Sekunden); alle fünf Cloud-Dots laufen nur ungefähr stündlich. Sie besitzen **keinen direkten Fernzugriff auf Windows**, dürfen und können keine privaten lokalen Portfoliodaten auslesen. Gemeinsamer Transport: öffentliche, `actionable:false`-GitHub-Forschungsdateien.

### Neue lokale Nicht-Chart-Datenquelle

`runner/research-narrative-radar.mjs` fragt als zusätzliche, schreibgeschützte öffentliche Quelle:

- `GET https://api.dexscreener.com/token-profiles/latest/v1` (neue öffentlich geführte Tokenprofile)
- `GET https://api.dexscreener.com/community-takeovers/latest/v1` (nicht verifizierte Übernahme-Claims)
- `GET https://api.dexscreener.com/token-boosts/latest/v1` (**bezahlte** Promotion)

Der Collector verknüpft das Ergebnis **nur bei exakter Chain+Token-Identität** mit einem bekannten DEX-Pool; ohne eindeutig verifizierten Pool bleibt `candidate_id:null`. Ergebnisse erscheinen als `narrative_leads[]` und `narrative_coverage[]` im GitHub-Markt-Snapshot und werden den fünf Dots als Rechercheanstoß zur Verfügung gestellt. Metadaten und Paid Boosts sind **kein Beleg eines organischen X-/Reddit-Trends**, kein 85/95%-Wahrscheinlichkeitsschätzer, kein BUY und kein Risk-PASS.

**Unverändert offen:** Vollständige live X/TikTok/Reddit/Telegram-Streams, großflächige Subsekunden-Launchpad-Events, unabhängige Vollerfassung aller neuen Coins und ein produktives kostenpflichtiges Datenfeed-/Brokersystem. Viele Feeds erfordern API-Zugänge, Bewilligungen, Latenzbudget und Rate-Limit-Handling. Wer keinen tatsächlich abrufbaren Originalbeleg hat, meldet `UNKNOWN` statt Hype zu behaupten. Grundlagen und Rate-Limits: https://docs.dexscreener.com/api/reference ; https://api.geckoterminal.com/docs/index.html .

## 3. Historische Daten – kein erfundener Rücktest

Aus der vom Nutzer bereitgestellten Excel-Forschung lassen sich **historische Falltypen** und reine Vorher-/Nachher-Referenzkurse als Hypothesen nutzen. Die Datei wird **nicht** in das öffentliche GitHub hochgeladen. Ihr Material enthält keine lückenlose as-of-Pre-Hype-Nachrichten-/Onchain-/Poolhistorie samt validen Ein-/Ausgangsquotes **und** vollständigem, zeitgleichen Datensatz auch erfolgloser Starts. Ein echter Rücktest mit behaupteter Trefferquote wäre damit Lookahead-/Survivorship-Bias.

`runner/historical-replay-readiness.mjs` prüft für später eingespielte, datierte und unabhängig bestätigte Datensätze, ob solche Tests zulässig wären: Chain+Token+Pool exakt, Poolstart und erste Welle zeitlich bekannt, originale Quellpublikation und Archivaufnahme **vor** der Welle, negative vollständige Launch-Kohorte, realistische Verkaufbarkeit. Sonst Ergebnis ausdrücklich `UNTESTABLE_MISSING_DATA`, weder erkannter Gewinner noch belegter Fehlstart. Ein `REPLAY_READY` ist weiterhin **keine** behauptete erfolgreiche Vorhersage.

Forschungsziele bleiben 2×, 5×, 10×, 50× und 200× innerhalb von 14 Tagen; beobachtete Kurs-Spikes sind nicht automatisch tatsächlich verkaufbare Gewinne.

## 4. Bleibende Handelssperren

Die Forschung und das Test-Kapitalbudget sind implementiert und offline/CI getestet. **Noch nicht implementiert oder verifiziert:** echte unabhängige Onchain Contract-/LP-/Honeypot-Prüfung für alle Chains, betragsabhängige tatsächlich ausführbare BUY-/SELL-Quoten, signierte Echtwelt-Fünf-Dot-Entscheidungen, sichere Kauf-/Verkaufs-Fills auf realen DEX-Tokens und über lange Zeit statistisch nachgewiesene selbstständige Prognoseverbesserung. Die zentrale Ausführung realer Coins bleibt `BLOCKED_REAL_VALIDATOR_UNAVAILABLE`, `automaticPaperBuys=false` und `centralPaperFollow=false` in neuen Konten. Bei bestehenden privaten Konten bleiben die zuvor gespeicherten Flags unverändert.

Die synthetische 5-Rollen-Laborstrecke und die Trailing-Exit-Engine bleiben erhalten. Kein echtes Geld, keine Wallet/PayPal-Integration, keine falschen 95%-Wahrscheinlichkeiten oder Renditegarantien.

## 5. Windows-Update

1. Existierenden Bot über Taste **Q** beenden; vor dem Update **`Sniperbot0.1\.local` und `%LOCALAPPDATA%\MemeSniperPaper`** separat sichern.
2. Aktuellen Branch als ZIP herunterladen, entpacken und **nur Programmdateien** in den bisherigen Projektordner kopieren. Private `.local`-Dateien nicht überschreiben.
3. Einziger regulärer Starter: **`Sniperbot_Starten.bat`**. Dashboard `http://127.0.0.1:3030`, Bereich Einstellungen: `Bevorzugter Einsatz` / `Gesamtbudget USDC` prüfen und gewünschte Werte speichern. Ein alter 200–300-Eintrag wird ab V0.6 als Wunsch 200 / Gesamtbudget 300 gelesen; die virtuelle Cash-Anzeige ändert sich dabei nicht.
4. Forschung: `/api/research/network`, `/api/research/advisories`, `/api/research/learning`. Fehlende Daten nach Start sind keine Bestätigung eines funktionsfähigen Echtzeitfeeds.

GitHub Actions: `node runner/test.mjs`, `node --test runner/*.test.mjs`, Windows native Supervisor-/DPAPI- und erweitertes V0.6-Testset. Ein CI-PASS belegt **nicht**, dass diese ZIP auf dem privaten Laptop läuft oder jemals einen historischen Gewinn vorhersagen konnte.
