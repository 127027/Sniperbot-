# R28 – Sniperbot-Verbindung prüfen: Windows Laptop ↔ lokale OpenAI API ↔ signierter Paper-Bot

**Status:** Lokal getestete Diagnose und fortlaufender, schreibgeschützter Forschungsbeleg.
**Nur PAPER ONLY.** Kein Bot-Account resetten, keine Wallet übertragen, keine neuen Dots.

## Was in diesem Projekt verbunden ist

1. Der Windows-Bot läuft auf `http://127.0.0.1:3030`. Dieser Port ist **nur auf deinem Laptop** erreichbar.
2. Bei optional eingerichtetem eigenem OpenAI-API-Key startet ein stündlicher Forschungsprozess. Er sendet ausgewählte öffentliche Marktbeobachtungen und den begrenzten lokalen Paper-Zustand **an die OpenAI Responses API** und erhält strukturierte Empfehlungen zurück.
3. Geeignete Empfehlungen durchlaufen die vorhandene signierte **PAPER**-Order-Pipeline. Das kann zu einem **virtuellen** Kauf/Verkauf führen, wenn die aktuellen Sicherheitsbedingungen und die Paper-Freigabe erfüllt sind.
4. Der Bot erhält die Paper-Order-Quittung zurück und speichert zusätzlich ein **lokales** Forschungsprotokoll. Dieses Dokument kann später für die Häufigkeitsstudie 1/4/12/24 genutzt werden.
5. **Diese ChatGPT-Unterhaltung ist nicht live mit deinem Windows-Rechner verbunden.** Der lokale OpenAI-API-Prozess ist eine getrennte API-Integration. Die sichere Diagnose schickst du selbst hier in den Chat.

## Schnellstart

1. Alten Sniperbot vollständig schließen (in der bisherigen Windows-Konsole `Q` drücken).
2. Auf GitHub den Branch `codex/r27-early-discovery-asof-ai-20261115` wählen und **Code → Download ZIP** herunterladen.
3. In einen neuen Ordner entpacken. Die alten `%LOCALAPPDATA%\MemeSniperPaper`-Kontodaten bleiben beim Update erhalten. Nicht löschen oder überschreiben.
4. Node.js 22 LTS muss installiert sein.
5. `Sniperbot_Starten.bat` öffnen. Auf Wunsch deinen **eigenen** OpenAI-API-Key ausschließlich verdeckt am Laptop eingeben; **nie hier im Chat oder im GitHub-Repository**. API-Anfragen verursachen vom ChatGPT-Abonnement unabhängige Kosten.
6. Der Bot wird im Browser unter `http://127.0.0.1:3030` angezeigt. `Zentrale KI` und `R27-Quellenarchiv` zeigen aktuelle Betriebsdaten.
7. Während der Bot läuft, **`Sniperbot_Verbindung_pruefen.bat`** doppelklicken. Die Datei startet **keinen zweiten Bot**, macht **keine** Zahlung und ändert weder den bestehenden Paper-Kontostand noch die Wallet.
8. Anschließend `R28_Verbindungsbericht.txt` aus dem entpackten Bot-Ordner **in diesen Chat hochladen**. Alternativ den angezeigten Bericht kopieren.

## Was der Bericht prüft

| Kontrolle | Bedeutung |
|---|---|
| `bot.online` | Der echte lokale HTTP-Bot antwortet. |
| `central_ai.enabled` | Der lokale KI-Scheduler ist konfiguriert und aktiv. |
| `central_ai.real_openai_exchange_observed` | Eine kürzlich abgeschlossene API-Antwort mit Modellname und Response-ID wurde im Bot-Status nachgewiesen; **kein Nachweis dieser Chat-Unterhaltung**. |
| `research_archive.active` | Der lokale 2-Minuten-Quellen-Collector meldet aktuelle Aktivitäten. |
| `isolated_signed_paper_roundtrip.passed` | Die signierte BUY/SELL-Pipeline funktioniert **nur in einem isolierten In-Memory-Test**. Das bestätigt KEINE echte Handelsausführung. |
| `central_ai.new_paper_fills_from_last_ai_cycle` | Echte Quittungen aus der zuletzt ausgeführten lokalen KI-Schleife (falls welche vorhanden sind). |
| `central_ai.local_run_audit_status` | Das lokale, unveränderliche Forschungs-/Quittungsprotokoll wurde gespeichert oder meldet ein Problem. |

Das Berichtsformat enthält absichtlich **keine API-Keys, Wallet-Adressen, Seedphrases, private Konten, Auth-Tokens, paper-Guthaben oder Signaturen**.

Ein erfolgreiches `isolated_signed_paper_roundtrip` ist **kein** Nachweis, dass eine echte KI gerade einen Coin gekauft hat. Für einen tatsächlich erfolgten virtuellen KI-Trade müssen die entsprechenden **echten** lokal protokollierten Quittungen vorhanden sein.

Wenn der Bericht `BOT_NOT_REACHABLE` meldet, läuft der Bot wahrscheinlich nicht oder Port 3030 ist belegt. Wenn `CENTRAL_AI_NOT_ACTIVE` erscheint, fehlt unter anderem der API-Key oder die KI wurde nicht aktiviert. `NO_VERIFIED_COMPLETED_API_MODEL_EXCHANGE_YET` bedeutet nicht automatisch ein Fehler: Der erste Modellaufruf kann erst erfolgen, wenn Kandidaten/offene Positionen vorhanden sind.

## Getrennte Paper-Freigabe

Um **keine** bestehenden Kontodaten zu verändern, für den reinen Verbindungstest die Option `Automatische KI-Paper-Orders erlauben` zunächst **AUS** lassen. Das zeigt, ob KI und Status miteinander kommunizieren; bei Bedarf kann später eine getrennte Freigabe von ausschließlich virtuellen Käufen folgen.

Der lokale `POST /api/paper/pipeline-selftest` verwendet einen Wegwerf-Schlüssel und das reine In-Memory-Konto. Er greift weder auf deine gespeicherte Wallet noch auf dein Paper-Guthaben zu.

**Beide Datenquellen sind unterschiedlich:**
- Tatsächliche stündliche KI-Durchläufe: `%LOCALAPPDATA%\MemeSniperPaper\central-ai\cycle-audit\YYYY-MM-DD\*.json`. Diese Dateien bleiben **lokal**. Sie speichern öffentliche Kandidaten, gekürzte Empfehlungen und virtuelle Order-Belege, keine privaten Kontostände/Wallet-Daten. Lokaler Hash allein ist keine unabhängige externe Zeitbeglaubigung.
- Öffentliche fortlaufende Markt- und Nachrichtenbeobachtungen: `%LOCALAPPDATA%\MemeSniperPaper\r27-evidence\captures\YYYYMMDD\*.json`. Nicht nachträglich zu historischen Originalbelegen erklären.

**Wichtige Einschränkung:** Ein durchgeführter lokaler API-Modellaufruf beweist die Kommunikation Laptop → OpenAI API → Laptop, aber nicht, dass dieses Chatfenster den Laptop erreichen oder stündlich persönlich Empfehlungen senden kann. Er beweist auch keine profitable Handelsstrategie oder die Ausführbarkeit von DEX-Swaps.
