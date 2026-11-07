# Empfangsnachweis – historischer Scout-Test über GitHub

Stand 07.11.2026, 18:13 UTC. Keine Echtgeldaktionen.

## Herkunft

Der geplante Meme-Scout-Lauf veröffentlichte die Probe am 07.11.2026 um 17:28:43 UTC. Commit: `3eb166e936ebbb5c9078894ffd256fc0af79478e`. Forschungs-Chat und GPTs nachfolgende Automations-Metadatenprüfung dokumentieren denselben Commit; letzterer nennt einen geplanten Lauf von 17:28:37 bis 17:28:55 UTC.

## Tatsächlicher Windows-Empfang

Der aktualisierte Desktop-Bot lud die unveränderte Datei selbst aus dem fest hinterlegten Commit über HTTPS. Kein durch Codex erzeugtes Ersatzereignis und kein direkter Dot-POST.

Abfrage `GET http://127.0.0.1:3030/api/research/inbox`: HTTP 200, `ok=true`, `enabled=true`.

- Event-ID: `meme-scout-scheduled-probe-20261107`
- Empfangszeit: `2026-11-07T18:11:47.575Z`
- source_commit: `3eb166e936ebbb5c9078894ffd256fc0af79478e`
- Inhalts-Hash (JSON-Normalisierung): `2cf00399b041be91e1cb1c918dd67daffbd57a56c47cfb733dfcef0fc7c6909e`
- delivery: `GITHUB_PULL`
- historical_probe: `true`
- actionable: `false`

Empfang auch im Browser-Dashboard sichtbar. Portfolio und Bot-Einstellungen unverändert. Keine privaten Kontostände/Registry-Daten in diesem Bericht.

## Mehrere Empfänger

Drei weitere kurzlebige Windows-Node-Testprozesse mit separaten Ports und temporären Datenverzeichnissen luden dieselbe echte historische Scout-Probe. Alle lieferten HTTP 200 und dieselbe Event-ID, jeweils lokal persistent; Empfangszeiten 18:12:34.598, 18:12:35.177 und 18:12:35.726 UTC. Keine Position erzeugt. Testprozesse danach beendet und temporäre Daten entfernt. Das sind drei lokale Instanzen, KEIN Test auf drei physischen Geräten oder Smartphones.

## Präzise Grenze

Belegt ist historische geplante Scout-Publikation → GitHub → späterer lokaler Bot-Abruf. Ein frischer wiederkehrender Feed ist noch nicht abgenommen. Sein erster Abruf meldete HTTP 404, weil die Datei noch nicht existierte. Der bestehende direkte Rollen-Gateway ist weiterhin nicht vom Dot angesteuert worden. Keine fünf echten Rollen, keine automatische Coin-Freigabe, keine signierte Mehrgeräte-Broker-Infrastruktur.

Der regelmäßige Nur-Informations-Feed ist laut `GPT_FEED_SETUP_REPLY.md` eingerichtet. Der erste echte geplante Feed-Lauf und sein lokaler Empfang bleiben gesondert nachzuweisen.
