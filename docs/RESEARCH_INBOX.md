# GitHub-Forschungseingang (experimentell, nur Information)

Aktivierung: `Windows_Starten_mit_Forschung.bat` oder `SNIPER_RESEARCH_FEED=1` beim Serverstart. Standardstart abonniert nicht automatisch. Nur eine Instanz pro Datenordner starten.

Der Bot ruft ausgehend alle 60 Sekunden den öffentlichen Scout-Feed ab. Er öffnet keinen extern erreichbaren Port und sendet weder Kontostände noch Zugangsdaten nach GitHub. Jede Installation speichert ihren eigenen Eingang. `GET /api/research/inbox` liefert die lokale Empfangsbestätigung einschließlich Event-ID, Empfangszeit, Inhalts-Hash und Herkunft. Das Dashboard zeigt denselben Eingang.

## Implementierte Grenzen

- Nur `research_notice.v1`, paper_only=true und actionable=false. STATUS, CANDIDATE_NOTE und EXIT_NOTE sind reine Texte, keine strukturierten Handelsfreigaben. Kein Weg zu ingest/evaluate/action aus dem Empfänger.
- Maximale Nachricht 16 KiB, Text 2000 Zeichen, Ablauf maximal zwei Stunden, Zeitprüfung, Reihenfolge und Event-ID-Konfliktprüfung. Letzte 200 Empfangsbelege werden lokal gespeichert. Identische Nachricht wird nicht erneut eingetragen.
- Abruf nur fest hinterlegter HTTPS-GitHub-URLs, keine Umleitungen, Timeout zehn Sekunden. Fehler bleiben sichtbar; bestehende Positionen/Guthaben bleiben unverändert.
- Repository-Schreibberechtigung ist keine unabhängige Agentensignatur. Dieser Feed ist ausdrücklich NICHT der signierte Broker aus dem Architekturentwurf, nicht für automatische Käufe freigegeben und kein Echtzeit-Sniping.
- Nur neueste Datei: Offline-Geräte verpassen Zwischenstände. Abgelaufene Nachrichten werden abgewiesen. Keine Empfangsbestätigung an den Publisher; ACK ist nur lokal abrufbar.
- Historische einmalige Scout-Probe wird separat von einem festen Commit geladen und als historical_probe markiert. Sie ist KEIN frischer Forschungsbericht. Ein lokaler historischer Import beweist keinen direkten Dot-POST.
- Zwei-Faktor-/Geräteanmeldung, Broker-Signaturen, Queue, Widerruf, fünf echte Produzenten und Handy-Hosting sind nicht implementiert. Andere Nutzer müssen den Feed ausdrücklich selbst aktivieren. Keine Installation auf fremden Geräten durch diesen Test.

## Tests

`node runner/test.mjs` und `node --test runner/*.test.mjs`.
Neue Tests: getrennte Empfänger mit unterschiedlichen Guthaben, unveränderte Positionen, Persistenz-Serialisierung/Idempotenz, Replay-Konflikt, Reihenfolge, Ablauf/Zukunft/Schema/Größenlimit, Fehler und Wiederanlauf. Windows-HTTP-Tests benötigen lokale Netzwerkberechtigung; ein zeitabhängiger bestehender Gateway-Test schlug einmal fehl und bestand isoliert erneut.

Einrichtung des Produzenten: `GPT_FEED_SETUP_REQUEST.md`. Die bloße Implementierung dieses Empfängers beweist nicht, dass der geplante Lauf schon regelmäßig Feed-Nachrichten publiziert.
