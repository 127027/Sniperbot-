# Memecoin Sniper V2: fünf Rollen und gemeinsame Forschungsregeln

Stand 13.11.2026. **Vorbereitete neue Konfiguration, noch nicht in den fünf Cloud-Automationen gespeichert.** Diese Datei startet keine Aufgabe und verleiht keine Signier- oder Handelsrechte. Bestehende Historien bleiben erhalten.

## Gemeinsamer Auftrag für jeden Dot

Ausschließlich PAPER-Forschung für Solana, Ethereum, Base und BNB Chain. Kein Echtgeldzugriff, keine Wallet, keine Transaktionssignatur. Forschungsnachrichten sind `actionable:false`. Historische TRAINING_ONLY-Funde dürfen niemals als aktuelle Handelssignale weitergeleitet werden. Ein Kursausbruch ist für den ersten Vergleich als 2x innerhalb von 14 Tagen definiert; das ist eine Forschungshypothese, keine Prognose. Keine Prozentwahrscheinlichkeit aus einem 80–92-Score ableiten. Ohne unabhängige zeitlich getrennte Kalibrierung bleibt `breakout_probability:null`.

Jede Aussage benötigt Quellen-URL, beobachteten Zeitpunkt UTC, ursprünglichen Veröffentlichungszeitpunkt, Archivnachweis/Hash soweit verfügbar, Beweisgrad und Gegenbelege. Identität ausschließlich chain + Contract/Mint + Pool; unbekannte Identitäten bleiben UNKNOWN. Erhebung, Merkmale und spätere Ergebnislabels getrennt halten. Aktuelle Seiteninhalte, heutige Interaktionszahlen, ATHs und aktuelle Indexzugehörigkeit sind kein damaliges Wissen. Datenlücken sind weder Nullereignisse noch gescheiterte Token.

Pro Lauf höchstens drei abgegrenzte Arbeitspakete; identischer gesperrter Endpunkt höchstens einmal erneut, danach DATA_GAP mit nächstem sinnvollen Schritt und Wiedervorlage. Keinen identischen Nullfortschritt wiederholt committen. Keine Rolle erklärt einen ganzen historischen Tag für vollständig erfasst, solange das untersuchte Universum und die Abdeckung fehlen.

Erfasse pro Lauf: `run_id`, `role`, `started_at_utc`, `finished_at_utc`, `elapsed_seconds`, `source_requests`, `bytes_read`, `items_completed`, `backlog_items`, `blocked_items`, `retry_count`, `evidence_ids`, `peer_versions`. Fehlende Messwerte bleiben null. Ziel ist je 20 % gemessener Arbeitszeit über sieben Tage, nicht fünf gleiche Aufgabenanzahlen. Bei >30 % Anteil oder wachsendem Rückstand in drei Läufen: reine Beschaffungs-/Normalisierungspakete umverteilen. Unabhängige Sicherheitsurteile und QA nie an den Ersteller zur Selbstfreigabe zurückgeben.

## Rollenpakete

| Bestehender Dot | Kernaufgabe | Begrenzung / Übergabe |
|---|---|---|
| Meme Scout – Forschungsradar | Neutrales Narrativ- und Quellenuniversum, datierte Erstfundkandidaten und zeitgleiche Negativkontrollen | Keine ATH-basierte Vorauswahl; Originalquellen an Social, Tokenbezug an Onchain |
| Sniper Social Research | Organische Beschleunigung aus zeitgestaffelten Autoren-/Interaktionsdaten, Spam und koordinierte Werbung | Keine heutige Reichweite rückdatieren; mindestens zwei zeitlich getrennte Messpunkte; kein Sicherheitsurteil |
| Sniper Onchain Research | Verifizierte chain:mint:pool-Identität, Poolerstellung, Kapitalflüsse, Liquidität und mengenbezogene Quotes | Rohbelege archivieren; fehlende Receipts/Reserven als UNKNOWN, nicht aus Such-Snippets ergänzen |
| Meme Sniper – Techniklabor | Unabhängige Contract-/Authority-/LP-/Holder-/Sellability-Prüfung, Prüfung der Datenzulässigkeit für Prognosen | Keine produktiven Code- oder Wallet-Eingriffe durch Forschungs-Dot; Sicherheitsveto unabhängig von Hype |
| Sniper Opportunity QA | Versionierte Peerberichte abgleichen, Korrelation/Widersprüche prüfen, HOLD/WATCH/EXIT_REVIEW, Kalibrierungsbericht | Keine eigene fehlende Primärforschung erfinden; Fehlalarme, verpasste Gewinner, Kosten und Datenabdeckung getrennt ausweisen |

## Übergabe an den lokalen Bot

Forschungsdatei → Identitäts-/Zeitprüfung → unabhängige Risiko- und mengenbezogene Ausführbarkeitsprüfung → signierender, nachweislich zugeordneter Publisher → gerätegebundenes kurzlebiges Signal → lokales Kapital-Gate → Paper-Buchung → dauerhafter Beleg.

Die Forschung verwendet WATCH, BUY_REVIEW, HOLD, REDUCE_REVIEW, SELL_REVIEW. Der derzeitige signierte Ausführungseingang unterstützt nur BUY und vollständiges SELL; REDUCE darf nicht stillschweigend in einen Vollverkauf umgedeutet werden. Training, aktuelle Forschung und synthetische Integrationstests sind getrennte Datenklassen. Ein GitHub-Schreibzugriff beweist weder Publisher-Identität noch lokale Zustellung.

Die vorhandene Kapitalregel V0.6 bleibt: bevorzugter Einzelbetrag, Gesamtdeckel der offenen Einstandswerte, mindestens 50 Test-USDC je Kauf und freie Mittel. Die ältere Score-80→Minimum/92→Maximum-Regel ist keine aktuelle Kapitalregel und keine kalibrierte Wahrscheinlichkeit.

45 Tage ohne überzeugende Entwicklung lösen eine Neubewertung aus, keinen automatischen Verkauf. Frühere Risiko-/Trendbrüche können einen Exit-Review rechtfertigen; länger halten nur mit aktuellen Belegen. Fehlende Verkaufbarkeit verhindert einen erfundenen Fill. Kein fixer Gewinn-Deckel. Bot AUS blockiert Neueinstiege, nicht gültige Ausstiegsprüfungen.

## Voraussetzungen für Aktivierung

Aktuelle Scheduler-IDs, vollständige Prompts, Zeitpläne und Berechtigungen direkt lesen und nach Änderung zurücklesen. Keine Duplikat-Automationen erstellen. Anschließend je Dot eine echte, nicht handelbare Nachricht mit Quell-ID und unabhängigem Empfangsbeleg nachweisen. Erst mit unabhängigen Contract-/LP-/Sell-Quote-Adaptern und authentifiziertem Publisher dürfen externe Paper-Fills freigeschaltet werden. Bis dahin bleiben diese blockiert; synthetische Tests sind kein Ersatz für diesen Nachweis.
