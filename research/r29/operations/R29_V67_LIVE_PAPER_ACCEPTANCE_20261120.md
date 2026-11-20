# R29 V6.7 – Live-Markt-Paperhandel: belegte Hindernisse und Abnahmekriterien

Stand: 20.11.2026. Gültig für den bestehenden **einen** lokalen Windows-Sniperbot, ausschließlich PAPER_ONLY.

## Was bereits nachgewiesen ist
- Kanonischer Marktfeed liefert aktuelle, nicht handelbare Pool-Snapshots; zuletzt bei der Prüfung vom 20.11.2026 18:44:56 UTC: **62 Pools / 48 Ranking-Leads**, keine `R29_RANKING_CROSS_PROVIDER_POOL` Kandidaten.
- Nachweisbare signierte Papier-BUY/SELL- und Policy-Exit-Simulationen bestehen in isolierten CI-Fixtures. Diese sind **keine realen Markt-Orders**.
- Index vom 20.11.2026: **5 echte, dokumentierte GPT-Reviews bei Ziel 12**; letzter um 17:08:45 UTC. Kein neues `PAPER_FILLED` für einen live beobachteten Memecoin, nur ältere lokale Testtrades.
- Public Security-Research meldet bei den untersuchten EVM-Pools keinen vollständigen Contract-, Sellability- und Zweiweg-Quote-/LP-Nachweis. Ein V3-GPT-BUY darf nicht an fehlenden Schutzgates vorbei.

## Was V6.7 konkret ändert
1. Das Ranking→Pool-Probing liefert ab jetzt auf dem **Windows-Collector** gezählte Versuche und Gründe: `NO_ELIGIBLE_TOKEN_LEADS`, `POOL_IDENTITY_NOT_CROSS_PROVIDER_CONFIRMED`, `RATE_LIMITED`, `CROSS_PROVIDER_PRICE_MISMATCH` usw.; diese Zahlen werden streng validiert und ohne Token-/Wallet-Leaks über den bestehenden kanonischen GitHub-Marktfeed transportiert. Ohne neue lokale Windows-Dateien bleibt dieser Nachweis fehlend, nicht automatisch „OK“.
2. Eine durch die gespeicherte signierte GPT-Exit-Policy ausgelöste automatische **SELL-Versuchsausführung** hinterlässt zusätzlich zum unveränderten Paper-Ledger einen **lokalen append-only JSONL-Datensatz** unter `%LOCALAPPDATA%\MemeSniperPaper\gpt-paper\decision-journal\YYYY-MM-DD.jsonl`. Enthält zugehörige BUY-Entscheidungs-ID, Position, Chain, Token, Pool, Preis- und Zeitstempel, Trigger, PAPER_FILLED/BLOCKED-Receipt, niemals private Wallet-/Kontobeträge. Ein fehlgeschlagener Journal-Schreibvorgang wird als `LOCAL_JOURNAL_FAILED` angezeigt und nicht als erfolgreiche Dokumentation ausgegeben.
3. Keine neuen Bots, Automationen, Wallettransaktionen, GPT-Strategien oder automatischen Echtgeldfreigaben. Sicherungs-/Exit-Gates unverändert.

## Abnahme: real beobachteter Memecoin, virtuell gehandelt
Bei einem neuen Trade die folgenden Beweise **in dieser Reihenfolge** verlangen:
1. Marktpool in einer **zuvor aufgezeichneten** aktuellen Collector-Stichprobe mit Chain, Contract, Pool, Erstbeobachtungszeit und Quellidentität, nicht als posthoc Gewinnerliste.
2. GPT-Modellreview im UTC-Review-Index mit URL-Zeitstempeln und archivierter WATCH/BUY-Entscheidung. Bloßer lokaler SCOUT-Score zählt nicht.
3. V3-PAPER_ONLY BUY-Archiv samt SHA-Pointer, lokal empfangen, unabhängige Contract-, Honeypot-, LP-, Zweiweg-Quote- und Exit-Policy-Gates erfolgreich bestanden. Benutzereinsatz aus UI, kein GPT-Schätzwert.
4. **Lokaler** `PAPER_FILLED`-BUY-Receipt und ein GPT-verwalteter offener Positionseintrag mit tatsächlichem Beobachtungskurs, Menge und Kosten; ausdrücklich **modellierte Ausführung**, nicht On-Chain-Transaktion.
5. Laufende Quote-/Exit-Prüfung, spätere lokal bestätigte Policy- oder GPT-`PAPER_FILLED`-SELL-Quittung, PnL im **gleichen** Konto, eindeutige Zuordnung im lokalen Audit-JSONL, einmaliger Write/Replay-Schutz.
6. Linux+Windows CI und nach Windows-Update tatsächliche lokale Statusbelege. Wenn ein Schritt fehlt, präzisen Grund melden, keine Fills erfinden und keine Gates abschwächen.

## Offene Risiken
- Nicht alle Memecoins besitzen ausreichend sichere EVM-/Solana-Sellability-/Ausführungsdaten. Insbesondere bleibt Solana-GPT-Paper-BUY ohne unabhängige Executor-Abnahme gesperrt.
- Die neue UI V6.6 zeigt vereinfachte Daten; sie repariert keine fehlende GPT-Order. Ein älterer Dashboard-Zähler (3/12 vs. GitHub 5/12) benötigt lokale Kurier- und Datei-Timestamps; GitHub-Zähler allein wird nicht künstlich übernommen.
- **Erfolgskriterium** für den nächsten Nutzer-Check: *prospektiv erkannter echter Contract → eigenes gültiges GPT-Signal → dokumentierter virtueller BUY → dokumentierter virtueller SELL*. Bis alle Schritte belegt sind: „noch nicht funktioniert“, nicht „erledigt“.
