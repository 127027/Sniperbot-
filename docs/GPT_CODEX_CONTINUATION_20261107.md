# Fortsetzung durch GPT: Scout-Feed / Windows-Empfang / Codex-Übergabe

**Stand der GitHub- und Automationsprüfung:** 2026-11-07T18:24:33.611Z  
**Projekt:** `127027/Sniperbot-`  
**Arbeitsbranch:** `codex/research-gateway-v04`  
**Status:** **HISTORISCHER END-TO-END-EMPFANG BESTÄTIGT, ERSTER NEUER REGULÄRER FEED WEITER AUSSTEHEND**  
**Grenze:** Diese Untersuchung wurde über GitHub und die Automationsverwaltung durchgeführt; **kein eigener Zugriff von GPT auf den tatsächlichen Windows-Laptop**. Keine echten Trades, keine Zahlungen, keine Konfigurationsänderungen an Dots.

## 1. Was Codex NICHT mehr neu untersuchen muss

| Vorgang | Nachweis und Beurteilung |
|---|---|
| Echte Research-Automation findet statt | Aktive bestehende Automation `Meme Scout – Forschungsradar`; letzte gespeicherte Ausführung `2026-11-07T17:28:37.185685Z`–`17:28:55.119215Z`. |
| Scheduled Scout → GitHub | Bestätigte historische Probe `meme-scout-scheduled-probe-20261107`, veröffentlicht `2026-11-07T17:28:43Z`, Commit `3eb166e936ebbb5c9078894ffd256fc0af79478e`, zurückgelesen vom echten geplanten Forschungs-Lauf. |
| GitHub → Windows-Bot | Codex-Protokoll [SCOUT_INBOX_PROOF.md](SCOUT_INBOX_PROOF.md): HTTP 200 bei `GET 127.0.0.1:3030/api/research/inbox`; identische Event-ID, Empfangszeit `2026-11-07T18:11:47.575Z`; nach Neustart persistent. **Nicht von GPT erneut lokal ausgeführt.** |
| Mehrfache lokale Empfänger | Laut Codex: drei weitere isolierte Windows-Node-Testinstanzen auf **demselben Rechner**, unabhängige Datenverzeichnisse, gleiche Event-ID, keinerlei Portfolioeingriff. **Kein Nachweis für drei physische PCs / Handys.** |
| Implementierter rein informativer Inbox-Client | `runner/research-inbox.mjs` und `runner/server.mjs` auf Arbeitsbranch geprüft. Opt-in `SNIPER_RESEARCH_FEED=1` bzw. `Windows_Starten_mit_Forschung.bat`; ausgehender HTTPS-Abruf etwa alle 60 Sekunden, lokale persistente Belege; nur `research_notice.v1`, `actionable:false`. Kein Aufruf von `BUY/SELL/DEPOSIT` aus diesem Inbox-Reader. |
| Automations-Feed-Einrichtung | Bestehender Scout-Prompt mit `LAUFENDER MEME-SCOUT-GITHUB-STATUSFEED` aktiv; alter einmaliger Probe-Auftrag entfernt; ursprüngliche Recherche und stündlicher Zeitplan unverändert. [GPT_FEED_SETUP_REPLY.md](GPT_FEED_SETUP_REPLY.md). |
| Paper-Trade-Sicherheit | Forschungseingang ist **nicht** der auto-buy-Gateway; selbst `CANDIDATE_NOTE`/`EXIT_NOTE` sind nicht handelbar. Externe Coins haben weiterhin keinen nachgewiesenen unabhängigen Contract-/Sellability-Validator. |

## 2. Aktueller verbleibender Blocker

- Der Scout-Auftrag zum Schreiben von `research/feed/meme-scout-latest.json` ist in der bestehenden Automation gespeichert. Die Datei wurde **bei dieser GitHub-Prüfung nicht gefunden (HTTP 404)**.
- Die letzte in der Automationsverwaltung registrierte Ausführung **liegt vor** dem Speichern des Feed-Auftrags (Prompt-Update am `2026-11-07T18:10:53.395769Z`; spätere Automation-Metadatenänderung ca. `18:11:14Z`).
- In der aktuell lesbaren **letzten Ausführung** liegt deshalb **kein Schreibversuch** zum neuen Feed vor. Es gibt **keinen nachgewiesenen Feed-Fehler**; aus der 404-Dateiabfrage allein folgt kein Fehler des Windows-Clients.
- Zeitplan: `BEGIN:VEVENT\nDTSTART:20261105T232914Z\nRRULE:FREQ=HOURLY\nEND:VEVENT`; Modus `condition_watch`; `next_run_time=null`. Ob dieser bedingte Modus den Start bis zu einem geeigneten Rechercheanlass verzögert, ist **plausibel, aber aus den Metadaten nicht bewiesen**.
- Die Automationsverwaltung unterstützt `run_now`, womit sich die **bestehende** Automation einmalig ohne Zeitplanänderung anstoßen ließe. Das ist **kein** Beleg für den normalen stündlichen Scheduler und wurde bei der lesenden Diagnose **nicht ausgelöst**. Der bisherige Auftrag fordert ausdrücklich **einen echten regulär geplanten** Feed-Commit, keinen manuellen Ersatz.

## 3. Diagnoseschema – was als Nächstes wirklich geprüft werden muss

1. **Nach einem tatsächlich neuen geplanten Scout-Lauf**: Automations-Metadaten `last_run_time` / `run_details.last_run` / `latest_result` gegen die gespeicherte Feed-Einrichtung vergleichen.
2. **Wenn seit Einrichtung weiterhin kein Lauf registriert ist**: Zustand `WAITING_FOR_SCHEDULER`, keine falschen GitHub- oder Windows-Fehler. Das `condition_watch`-Verhalten kann ohne echten Lauf nicht als bewiesen markiert werden. Keine eigenmächtige Änderung am Zeitplan.
3. **Wenn neuer Lauf registriert und die Feed-Datei weiter 404 ist**: `latest_result` auf `BLOCKED: SCHEDULED_GITHUB_FEED_WRITE_UNAVAILABLE`, konkreten API-/Repo-Fehler, unterbliebene Promptausführung oder falschen Branch prüfen. Keine Feed-Datei durch Chat/Codex als Ersatz erstellen.
4. **Wenn neue Feed-Datei existiert**: Genau **neun** Felder, `schema=research_notice.v1`, `paper_only=true`, `actionable=false`, `published_at_utc`, `expires_at_utc` maximal 2h, neue `event_id` pro Lauf, `kind=STATUS|CANDIDATE_NOTE|EXIT_NOTE` verifizieren. Commit und tatsächlichen Scheduled-Run zeitlich korrelieren.
5. **Erst danach lokaler Abnahmetest**: Windows-Bot mit `SNIPER_RESEARCH_FEED=1` soll neuen Eintrag in `/api/research/inbox` zeigen, `historical_probe=false`, gleiche `event_id`, eigene Empfangszeit; `lastError` sollte bei gültigem Abruf verschwinden. Guthaben, Positionen, Settings müssen unverändert bleiben; Neustart testet Persistenz. Diese Windows-Schritte kann nur die berechtigte lokale Laufzeit ausführen.

## 4. Kurze Hinweise zum existierenden Code

- `runner/research-inbox.mjs`: `PROBE_URL` ist auf den früheren festen Commit gepinnt; `FEED_URL` zeigt auf `raw.githubusercontent.com/127027/Sniperbot-/codex/research-gateway-v04/research/feed/meme-scout-latest.json`.
- `createReceiver()` ruft beide Quellen ab und überspringt die Probe nach ihrem erstmaligen Empfang. Wenn die **Feed-Datei fehlt**, setzt der Reader `researchInbox.lastError` auf `Forschungsquelle HTTP 404`. Dies bedeutet derzeit **Quelle noch nicht veröffentlicht**, nicht zwingend Programmfehler. Ein besseres, getrenntes UI-Label `FEED_NOT_PUBLISHED` kann später erfolgen; die Handelslogik darf davon nicht abhängen.
- `latest.json` ist nur ein **einzelner überschreibbarer Status-Snapshot**, keine Queue. Offline-Empfänger können ältere Forschungshinweise verlieren. Es fehlen weiterhin signierte Publisher-Identität, unabhängige fünf echte Dots, gegenseitige Abstimmung und produktionsreifer Mehrgeräte-Broker.
- Falls der Research-Client nach Fertigstellung nach `main` soll, Branch-/URL-Migration und Versionierung separat planen; **kein vorgezogener Merge**.

## 5. Für Codex: Arbeitsersparnis / nächster kleinster Auftrag

**Nicht wiederholen:** Historische Probe künstlich erneut senden, drei Testinstanzen erneut aufsetzen, ursprünglichen Computerzugriffsblocker diskutieren oder die Scout-Automation erneut einrichten. Diese Bestandteile haben bereits Belege. **Nicht** fünf echte Dots oder Remote-Trading als fertig melden.

**Nur noch zu tun:** die nächste **echte planmäßige** Scout-Ausführung erfassen, den ersten neuen GitHub-Feed-Commit verifizieren und diesen neuen Event-ID/HTTP-200-Eingang einmal auf Windows gegen den lokalen gespeicherten Inbox-Stand abnehmen. Danach kann ein optionaler, ausdrücklich autorisierter Release nach `main` geplant werden. Die skalierbare zentrale signierte Verteilung mit eigenen Guthaben pro Gerät bleibt ein eigenständiges Folgeprojekt.

**Nicht durchgeführt bei dieser Fortsetzung:** Scheduler gestartet/geändert, neue Automation erstellt, Feed-Datei geschrieben, Windows-Bot gestartet, lokale Nutzerdateien gelesen, Hixton geändert, Echtgeld-/Wallet-/Orderfunktionen aufgerufen.

## 6. Originalbelege

- [SCOUT_INBOX_PROOF.md](SCOUT_INBOX_PROOF.md)
- [GPT_FEED_SETUP_REPLY.md](GPT_FEED_SETUP_REPLY.md)
- [RESEARCH_INBOX.md](RESEARCH_INBOX.md)
- [GPT_FEED_SETUP_REQUEST.md](GPT_FEED_SETUP_REQUEST.md)
- [Meme-Scout-Probe](../research/connectivity/meme-scout-scheduled-probe-20261107.json)
- [Commit 3eb166e – geplanter Scout-Lauf](https://github.com/127027/Sniperbot-/commit/3eb166e936ebbb5c9078894ffd256fc0af79478e)
