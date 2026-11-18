# R29 V4.3 – GPT-only-Rollen, gezielte Sicherheit und Quellenfrische

Stand: 18.11.2026. **PAPER_ONLY.** Dieses Dokument ist OPERATOR-/POSTHOC-KONTEXT und darf nie in historische GPT-Blind-Entscheidungsframes geraten.

## Code-Ursachen und gezielte Abhilfe
1. Der frühere lokale Autopilot konnte neue Paper-BUYs auf Basis eigener Marktfilter signieren. Jetzt werden in `startLocalPaperAutopilot` **keine neuen autonomen Käufe** erzeugt, selbst wenn ein altes Opt-in-Flag gesetzt ist. Seine vorhandenen Legacy-Positionen dürfen weiterhin ihren bisherigen Exit-Schutz nutzen. Das ist kein neuer Bot und keine GPT-Strategie.
2. In `core.applyExits` war `GPT_GUARD` bisher an die globale historische Stop-Loss-Zahl gekoppelt. Das ist **keine individuelle GPT-Autorisierung**. Der generische Exit verkauft jetzt keine GPT-geführten Positionen mehr; auch globale SET_EXITS-Befehle überschreiben GPT-Marker nicht. **WARNUNG:** Dies stellt noch keinen funktionsfähigen kontinuierlichen GPT-Positionsschutz her! Ein solcher Schutz ist erst nach signierter, positionsgebundener GPT-Exit-Policy und validierten Markt-/Ausführungspreisen abnahmefähig.
3. Die lokale GPT-Receiver-Schranke blockierte selbst signierte GPT-SELLs, wenn `entriesEnabled=false` war. Jetzt blockiert dieser Schalter nur neue BUYs. GPT-Follow, Identitäts-, Markt-, Quotes-, Sicherheit-, Replay- und Budgetprüfungen bleiben bestehen.

## Direkt erneut geprüfter GitHub-Stand
- `regular-paper-presence.json`: zuletzt 18.11.2026 13:29:41 UTC.
- `gpt-paper-context.json`: 18.11.2026 13:24:42 UTC.
- `dynamic-research-review.json`: 18.11.2026 13:09:33 UTC, `sources_incomplete=true`.
- Kanonischer `research/market/latest.json`: **10.11.2026 11:32:51 UTC** (veraltet).
- `forward-source-health.json` und `solana-forward-evidence.json`: **fehlen**.
- Letzte `gpt-paper-receipt.json`: **NO_TRADE** vom 17.11.2026 17:58:45 UTC.
- **Keine tatsächlichen neuen GPT-BUY-/SELL-Fills, keine belegte gültige aktuelle GPT-Provider-Response-ID.** Ein Laptop-Heartbeat ist kein Frischebeleg.
- Offen: die Datenqualität von On-Chain-, Wallet-, Pool-, Liquiditäts-, Nachrichten-, Social- und Narrativquellen muss getrennt nach Coverage, Zeitversatz und Beitrag zum frühen Entdecken gemessen werden. Für 241.649 Tokenstarts fehlen historische Minutenmerkmale; dies ist noch nicht vollständig kausal aufgeschlüsselt.

## Nicht als Abschluss verkaufen
- Dieser Patch sichert lediglich Rollen und verhindert einen bislang unautorisierten globalen Exit; ein vollständiger automatischer GPT-BUY/HOLD/SELL-End-to-End-Zyklus mit dauerhaftem Schutz ist **noch nicht nachgewiesen**.
- Der laufende Nutzerlaptop kann nicht durch einen GitHub-Commit alleine aktualisiert werden. Bestehendes privates `.local` und Paper-Konto bleiben unberührt.
- Historische isolierte Konten und tatsächliches prospektives Windows-Paper-Ledger dürfen niemals vermischt werden. Echtgeld gesperrt.

## Nächste abnahmefähige Arbeiten
1. **Feed live bekommen:** Aktuellen lokalen Collector und Publisher-Version ohne Überschreiben privater Dateien installieren/verifizieren; zwei frische Quittungen mit zeitgerechten Source→Capture→Publish→GPT-Timestamps.
2. **Echte GPT-Strategie:** Nachweis der direkt erfolgten Modellaufrufe (gültige Provider-IDs), 1–24 pro UTC-Tag, mit neutralen neu entdeckten Kandidaten. Fehlende Daten explizit `UNKNOWN`, niemals als verifizierte Null.
3. **GPT-Vorab-Exit:** Neue BUY-Entscheidungen nur mit signiertem positionsgebundenem Stop-/Risiko-/Exit-Vertrag; vorhandener Executor muss ihn unabhängig vom Modellkontingent prüfen und zulässige SELL-Orders samt Originalquittungen idempotent ausführen. Vorher kein Schutzversprechen.
4. **Zwei getrennte Belege:** zehn vorab isolierte historische Studien; prospektiver echter GPT→Windows-Paper-BUY→Exit mit Kauf-/Verkaufsquotes, Gebühren und unverwechselbaren Quittungen.

Alle R29-Strategieerkenntnisse nach Beleglage speichern. Keine weiteren eigenständigen Bots, keine Echtgeldtransaktionen und keine erfundenen PnL-Angaben.

## Abnahme und konkret geschlossener Event-Bridge-Fehler
- [PR #58](https://github.com/127027/Sniperbot-/pull/58) am 18.11.2026 gemergt, Commit `d959b0f7695892e91f7d495d6a680cb7495b5e39`.
- [Windows-/Linux-Paper-CI 44317312613](https://github.com/127027/Sniperbot-/actions/runs/44317312613) auf finalem Head `2cda85e37520d20f8f3b5161f4fec3d499f56cf6`: **SUCCESS**.
- Neuer nachgewiesener Root Cause: `r27-early-bridge.mjs` hatte bisher aus neutralen frühen Markt-Alerts die ursprünglichen `event_id` und `event_type` entfernt. Der in PR #57 eingeführte fünfminütige GPT-Eventplaner fand deshalb in den wirklichen Übergabedaten keine triggerfähigen IDs.
- Repariert: `earlyEventResearchLeads` validiert diese originalen Research-Ereignisse strikt zum **as-of-Zeitstempel des Collector-Snapshots**, nicht zur späteren Systemuhr. Nur die überprüften Identitätstypen und Zeitstempel werden als `paper_only=true`, `actionable=false` übergeben; Migrationen/Poolstarts können jetzt in der vorhandenen GPT-Ereignisplanung erkannt werden.
- Regression: gültiges neues Poolereignis löst im reinen Zeitmodell eine frühe GPT-Fälligkeit aus; ungültige Identität nicht. **Noch kein tatsächlicher bezahlter Modellaufruf aus diesem Szenario, keine BUY-Order und keine Laptop-Evidenz.**
