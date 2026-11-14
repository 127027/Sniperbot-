# Anschluss des geplanten Scout an den informativen GitHub-Eingang

Vom Eigentümer beauftragt: Kommunikation bis zum lokalen Empfang herstellen. PAPER-only, keine Orders. Codex implementiert einen ausgehenden, optionalen GitHub-Leser. Dieser Weg ist langsam, ohne unabhängige Agentensignatur und NICHT der geplante sichere Echtzeit-Broker.

## GPT-Einrichtung

Den abgeschlossenen einmaligen Testzusatz aus der vorhandenen Meme-Scout-Automation entfernen. Originalforschung, Zeitplan, Aktivierung und andere Einstellungen erhalten. Als neuen Zusatz für ihre regulären geplanten Läufe einen nicht handelbaren Statusfeed einrichten. Keine neue Automation erstellen, Techniklabor und Hixton nicht verändern. Nur der echte geplante Lauf veröffentlicht den Feed, nicht der Einrichtungs-Chat.

Zieldatei: `research/feed/meme-scout-latest.json`, Repository `127027/Sniperbot-`, Branch `codex/research-gateway-v04`. Je Lauf die neueste Nachricht schreiben, auch wenn kein geeigneter Kandidat gefunden wurde; keine erfundenen Kandidaten. Exakt diese neun Felder:

```json
{
  "schema": "research_notice.v1",
  "event_id": "UNIQUE-ID-FOR-EACH-RUN",
  "producer": "Meme Scout – Forschungsradar",
  "published_at_utc": "CURRENT-UTC-ISO-TIME",
  "expires_at_utc": "CURRENT-UTC-PLUS-TWO-HOURS",
  "paper_only": true,
  "actionable": false,
  "kind": "STATUS",
  "summary": "Kurzer tatsächlicher Forschungsstatus, maximal 2000 Zeichen."
}
```

Zeiten wirklich zur Laufzeit erzeugen; Gültigkeit höchstens zwei Stunden. Event-ID 8–100 Zeichen, nur Buchstaben/Ziffern/Bindestriche. Kind STATUS, CANDIDATE_NOTE oder EXIT_NOTE. Letztere sind ausschließlich nicht handelbare Forschungsnotizen, keine Orders, keine Freigaben. Kein Geld, keine Kontodaten, keine Secrets. Gleiche Event-ID nie für geänderten Inhalt wiederverwenden. Datei nach Veröffentlichung zurücklesen und Commit/Event-ID im Forschungsbericht protokollieren. Bei fehlendem Schreibzugriff BLOCKED, keine Zustellung behaupten.

Einrichtungsbericht in `docs/GPT_FEED_SETUP_REPLY.md` im selben Branch veröffentlichen, inklusive Nachkontrolle, unverändertem Zeitplan und Entfernung des alten Testzusatzes. Kein main-Merge. Der nächste tatsächlich geplante Lauf ist der Nachweis für den kontinuierlichen Feed. Ein manueller Ersatzlauf zählt nicht.

## Grenzen

Nur neueste Nachricht: Offline-Empfänger können Zwischenstände verpassen; keine dauerhafte Queue. GitHub-Ausfälle/Cache und stündlicher Produzent verhindern Echtzeit-Sniping. Der lokale Eingang akzeptiert keine Orders und ändert keine Positionen/Guthaben. Andere Geräte brauchen ihre eigene ausdrücklich abonnierte laufende Bot-Instanz; Smartphone-Hosting und sichere Fernsteuerung sind weiterhin offen. Keine Aussage, fünf echte Dots seien verbunden.
