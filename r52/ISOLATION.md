# R52 — single-worker controlled isolation
User approved 26 November 2026. Roles 2–5 paused, no deletion; role 1 remains as scheduled-task control, not a verified dedicated Dot. No new prompt patch or production state change. Actual connected cloud environment not established by task metadata. No exposed dedicated Dot provisioning or environment attachment action. User-side desktop Dot availability and computer verification required before continuous execution test. Preserve R51 and all prior history. No real trades, no new API/key, no capital reset.
## Acceptance of a dedicated agent
Verify own Dot profile and cloud computer in supported desktop UI; link existing GitHub with least privilege. Run one isolated 60-minute market/news research test, recording source-specific real events and actual observation/commit times across entire hour. Evidence at 0–10, 10–20, 20–30, 30–40, 40–50, 50–60 minutes; no artificial waiting, retrospective fabrication, or heartbeats counted as research. First/last timestamps alone insufficient. End with reasoned BUY/HOLD/SELL/WATCH/NO_TRADE/DATA_GAP, no orders. If runtime unavailable, stop prompt churn and report platform blocker. Next 24h validation only after verified first-hour acceptance. Resume other roles only after user-approved criteria met.
## Observed automation configuration
```json
[
  {
    "role": 1,
    "id": "Automation_909a055e43dc81918eb580e01e433e54",
    "enabled": true,
    "environment_selection": "inherited",
    "environments": null,
    "next": "2026-11-26T09:00:00+01:00",
    "run": {
      "id": "8739b6ff-7060-8333-aa19-4922265a1a87",
      "recorded_status": "completed",
      "scheduled_for": "2026-11-26T07:00:00Z",
      "started_at": "2026-11-26T06:59:56.061209Z",
      "completed_at": "2026-11-26T07:00:11.687480Z",
      "chat_ref": {
        "type": "chatgpt",
        "id": "6b0767a1-99a4-83eb-8e5a-8bf96a5741ed"
      }
    },
    "prompt": "R51 PAPER_ONLY. Verbindlich r51/RUNBOOK.md in 127027/Sniperbot-, Branch codex/r30-hourly-research-20261124; dies ersetzt alte isolierte R50-Testziele. Dot 1 Markt: Beginne sofort mit breiter aktueller Recherche zu Memecoins, Marktbewegungen, News und Social-Media-Katalysatoren, besonders neue Ereignisse seit letztem Scan und Originalquellen mit Zeit. Verfolge Momentum und vorherige Positionen/Strategieabsichten, nicht nur historische Gewinner. Nutze tatsächliche Webrecherche und bestehende GitHub-Verbindung, keine neuen APIs/Keys. Lies vorhandene eigene Queue und bisherige Marktkenntnisse, dann aktualisiere und ergänze sie. Priorisiere alle früheren R31 LONG/EXIT-Identitäten aus codex/r31-control-center-paper r31/broadcast/strategy-universe.json und neue Chancen. Arbeite solange tatsächliche Ausführung erlaubt, keine künstliche Wartezeit oder behauptete volle Stunde. Schreibe nur in eigenen r50/dot1/runs/<unique-run-id>/batch-NN.json (N durch eigene Rollennummer ersetzen): create_file + fetch_file, CAS fallback, immutable. Speichere konkrete Quellen, Zeit/UNKNOWN, exakte Chain/Contract/Pool soweit belegt, neue/alte Identitäten, Erkenntnisse, Strategie/Risiken, offene Queue und nächste Zielstunde UTC wenn bekannt. Keine erneute Ausführung alter Aufträge, keine künstliche Coin-Obergrenze, keine erfundenen Kurse, keine Orders oder fremde Schreibvorgänge. Zwei Pakete sind nur Diagnostik, nicht das Arbeitsziel; Ergebnisse müssen die nächste stündliche Handelsentscheidung verbessern. HOURLY_BATCH_LIMITED bis Dauerbetrieb nachgewiesen.",
    "schedule": "BEGIN:VEVENT\nDTSTART;TZID=Europe/Berlin:20261126T000000\nRRULE:FREQ=HOURLY\nEND:VEVENT"
  },
  {
    "role": 2,
    "id": "Automation_8d6843ef02d0819188bcdff74890d3e5",
    "enabled": false,
    "environment_selection": "inherited",
    "environments": null,
    "next": "2026-11-26T09:00:00+01:00",
    "run": {
      "id": "59f4e0da-05a0-832d-9539-b220b92cc2a3",
      "recorded_status": "completed",
      "scheduled_for": "2026-11-26T07:00:00Z",
      "started_at": "2026-11-26T06:56:23.834368Z",
      "completed_at": "2026-11-26T06:56:49.349587Z",
      "chat_ref": {
        "type": "chatgpt",
        "id": "6b0769aa-5dec-83ed-abe3-ea9f5448eea0"
      }
    },
    "prompt": "R51 PAPER_ONLY. Verbindlich r51/RUNBOOK.md in 127027/Sniperbot-, Branch codex/r30-hourly-research-20261124; dies ersetzt alte isolierte R50-Testziele. Dot 2 Discovery: Beginne mit aktueller Recherche neuer Pools/Tokens über mehrere Chains; baue das fortlaufende Marktgedächtnis aus. Erkenne Dubletten anhand Chain+vollständigem Contract, erhalte ungelöste Leads, finde exakte Pool-Adressen und frühe Momentum-Signale. Keine stillen Löschungen. Nutze tatsächliche Webrecherche und bestehende GitHub-Verbindung, keine neuen APIs/Keys. Lies vorhandene eigene Queue und bisherige Marktkenntnisse, dann aktualisiere und ergänze sie. Priorisiere alle früheren R31 LONG/EXIT-Identitäten aus codex/r31-control-center-paper r31/broadcast/strategy-universe.json und neue Chancen. Arbeite solange tatsächliche Ausführung erlaubt, keine künstliche Wartezeit oder behauptete volle Stunde. Schreibe nur in eigenen r50/dot2/runs/<unique-run-id>/batch-NN.json (N durch eigene Rollennummer ersetzen): create_file + fetch_file, CAS fallback, immutable. Speichere konkrete Quellen, Zeit/UNKNOWN, exakte Chain/Contract/Pool soweit belegt, neue/alte Identitäten, Erkenntnisse, Strategie/Risiken, offene Queue und nächste Zielstunde UTC wenn bekannt. Keine erneute Ausführung alter Aufträge, keine künstliche Coin-Obergrenze, keine erfundenen Kurse, keine Orders oder fremde Schreibvorgänge. Zwei Pakete sind nur Diagnostik, nicht das Arbeitsziel; Ergebnisse müssen die nächste stündliche Handelsentscheidung verbessern. HOURLY_BATCH_LIMITED bis Dauerbetrieb nachgewiesen.",
    "schedule": "BEGIN:VEVENT\nDTSTART;TZID=Europe/Berlin:20261126T000000\nRRULE:FREQ=HOURLY\nEND:VEVENT"
  },
  {
    "role": 3,
    "id": "Automation_914ef17ef0648191b7684441e5420e65",
    "enabled": false,
    "environment_selection": "inherited",
    "environments": null,
    "next": "2026-11-26T09:00:00+01:00",
    "run": {
      "id": "dd1e7608-625c-8326-9b2c-037f3c3cc147",
      "recorded_status": "completed",
      "scheduled_for": "2026-11-26T07:00:00Z",
      "started_at": "2026-11-26T07:01:57.122428Z",
      "completed_at": "2026-11-26T07:02:13.385849Z",
      "chat_ref": {
        "type": "chatgpt",
        "id": "6b07699f-15b0-83ed-95d9-06ba35be5977"
      }
    },
    "prompt": "R51 PAPER_ONLY. Verbindlich r51/RUNBOOK.md in 127027/Sniperbot-, Branch codex/r30-hourly-research-20261124; dies ersetzt alte isolierte R50-Testziele. Dot 3 Risiko: Beginne mit tatsächlicher Recherche konkreter neuer und früherer Kandidaten. Beurteile Chancen, Liquidität, Verkaufbarkeit, Gebühren, Holder, Wallets und Manipulationssignale. Bestätigte harte Risiken von bloß unbekannten Faktoren trennen; Volatilität allein nicht als Ablehnung, keine erfundene Freigabe. Priorisiere Exit-Risiken. Nutze tatsächliche Webrecherche und bestehende GitHub-Verbindung, keine neuen APIs/Keys. Lies vorhandene eigene Queue und bisherige Marktkenntnisse, dann aktualisiere und ergänze sie. Priorisiere alle früheren R31 LONG/EXIT-Identitäten aus codex/r31-control-center-paper r31/broadcast/strategy-universe.json und neue Chancen. Arbeite solange tatsächliche Ausführung erlaubt, keine künstliche Wartezeit oder behauptete volle Stunde. Schreibe nur in eigenen r50/dot3/runs/<unique-run-id>/batch-NN.json (N durch eigene Rollennummer ersetzen): create_file + fetch_file, CAS fallback, immutable. Speichere konkrete Quellen, Zeit/UNKNOWN, exakte Chain/Contract/Pool soweit belegt, neue/alte Identitäten, Erkenntnisse, Strategie/Risiken, offene Queue und nächste Zielstunde UTC wenn bekannt. Keine erneute Ausführung alter Aufträge, keine künstliche Coin-Obergrenze, keine erfundenen Kurse, keine Orders oder fremde Schreibvorgänge. Zwei Pakete sind nur Diagnostik, nicht das Arbeitsziel; Ergebnisse müssen die nächste stündliche Handelsentscheidung verbessern. HOURLY_BATCH_LIMITED bis Dauerbetrieb nachgewiesen.",
    "schedule": "BEGIN:VEVENT\nDTSTART;TZID=Europe/Berlin:20261126T000000\nRRULE:FREQ=HOURLY\nEND:VEVENT"
  },
  {
    "role": 4,
    "id": "Automation_1268410cb2bc81919602ef1a08fee4f6",
    "enabled": false,
    "environment_selection": "inherited",
    "environments": null,
    "next": "2026-11-26T09:00:00+01:00",
    "run": {
      "id": "666997e3-6540-8332-b176-b6784c413261",
      "recorded_status": "completed",
      "scheduled_for": "2026-11-26T07:00:00Z",
      "started_at": "2026-11-26T07:00:43.405846Z",
      "completed_at": "2026-11-26T07:00:52.582741Z",
      "chat_ref": {
        "type": "chatgpt",
        "id": "6b0767d3-ce3c-83ed-80a0-c555116d1f7a"
      }
    },
    "prompt": "R51 PAPER_ONLY. Verbindlich r51/RUNBOOK.md in 127027/Sniperbot-, Branch codex/r30-hourly-research-20261124; dies ersetzt alte isolierte R50-Testziele. Dot 4 Strategie: Beginne mit konkreter aktueller Markt- und Kandidatenrecherche. Gib für bisherige LONG/EXIT und neue Chancen ausdrücklich ENTRY_ALLOWED/BUY (auch wenn schon gehalten), HOLD_ONLY/HOLD, EXIT/SELL, WATCH/NO_TRADE oder DATA_GAP mit Begründung, Katalysator, Einstieg, Ausstieg, Risiko und aktuellen Ausführungsdaten. Rangiere positive Einstiege, separate Strategieidee und Ausführungsblocker. Keine zwanghaften Käufe, kein automatisches HOLD, fehlender Kurs ist nicht automatisch negative Strategie. Keine Orderausführung. Nutze tatsächliche Webrecherche und bestehende GitHub-Verbindung, keine neuen APIs/Keys. Lies vorhandene eigene Queue und bisherige Marktkenntnisse, dann aktualisiere und ergänze sie. Priorisiere alle früheren R31 LONG/EXIT-Identitäten aus codex/r31-control-center-paper r31/broadcast/strategy-universe.json und neue Chancen. Arbeite solange tatsächliche Ausführung erlaubt, keine künstliche Wartezeit oder behauptete volle Stunde. Schreibe nur in eigenen r50/dot4/runs/<unique-run-id>/batch-NN.json (N durch eigene Rollennummer ersetzen): create_file + fetch_file, CAS fallback, immutable. Speichere konkrete Quellen, Zeit/UNKNOWN, exakte Chain/Contract/Pool soweit belegt, neue/alte Identitäten, Erkenntnisse, Strategie/Risiken, offene Queue und nächste Zielstunde UTC wenn bekannt. Keine erneute Ausführung alter Aufträge, keine künstliche Coin-Obergrenze, keine erfundenen Kurse, keine Orders oder fremde Schreibvorgänge. Zwei Pakete sind nur Diagnostik, nicht das Arbeitsziel; Ergebnisse müssen die nächste stündliche Handelsentscheidung verbessern. HOURLY_BATCH_LIMITED bis Dauerbetrieb nachgewiesen.",
    "schedule": "BEGIN:VEVENT\nDTSTART;TZID=Europe/Berlin:20261126T000000\nRRULE:FREQ=HOURLY\nEND:VEVENT"
  },
  {
    "role": 5,
    "id": "Automation_15a0dc6dfa008191a0ddfb7ecb2fb6ae",
    "enabled": false,
    "environment_selection": "inherited",
    "environments": null,
    "next": "2026-11-26T09:05:00+01:00",
    "run": {
      "id": "dbcccab1-b7e4-8328-9663-ce70f72b55f0",
      "recorded_status": "completed",
      "scheduled_for": "2026-11-26T07:05:00Z",
      "started_at": "2026-11-26T07:00:49.433687Z",
      "completed_at": "2026-11-26T07:01:07.736855Z",
      "chat_ref": {
        "type": "chatgpt",
        "id": "6b076775-2370-83ed-823b-08b19109dd68"
      }
    },
    "prompt": "R51 PAPER_ONLY. Verbindlich r51/RUNBOOK.md in 127027/Sniperbot-, Branch codex/r30-hourly-research-20261124; dies ersetzt alte isolierte R50-Testziele. Dot 5 ist stündlicher Handelskoordinator und einziger R31 PAPER-Signalpublisher. Für den gerade vergangenen Stundenzeitraum (z.B. 00–01, Ziel 01:00 MEZ) lies verfügbare neue Peer-Ergebnisse, vorhandenes Wissen, vorherige R31 LONG/EXIT und frische Webbelege, auch selbstständig bei fehlenden Peers. Gib für relevante exakte Identitäten BUY/HOLD/SELL/WATCH/NO_TRADE/DATA_GAP mit Strategie, Gründen, Ausführungsblockern; priorisiere Exits und stärkste neue Einstiege. Schreibe einen tatsächlichen Stundenreport r51/hourly/<UTC date>/<UTC hour>/decision.json, inkl. fehlender Marktabdeckung, Quellenzeiten und Publikationsstatus. Keine alten Kurse/erfundenen Quotes/FX/Zeitpunkte. HOURLY_BATCH_LIMITED; keine Behauptung kontinuierlicher Laufzeit. Im gültigen tatsächlichen Ziel+0..10min-Fenster veröffentliche genau EIN bestehendes R31 v1 PAPER_ONLY Signal auf codex/r31-control-center-paper: lies r31/R31_DOT_BROADCAST_RUNBOOK.md, r31/broadcast.mjs, r31/publisher.mjs; bestehende Sequence/previous_blob_sha/Universe/atomarer Signal+Pointer+Universe-Commit mit nonforce CAS und Readback. Erhalte alle bisherigen LONG/EXIT, frische EUR-Quote <=15min mit tatsächlicher Beobachtungszeit und HTTPS bei BUY/HOLD/SELL, DATA_GAP bei fehlender Quote, full SELL, rangierte BUY, kein erzwungener Kauf, keine Wiederholung alter Slots. Bei zu frühem/spätem Start oder Fehler ehrlicher Stundenreport ohne Signal. Publikation priorisieren, dann Report mit tatsächlichen SHA. Nur R31 PAPER-Broadcast-Schreibrechte und eigener r51/r50/dot5-Bereich, keine Änderung an Controls, Gerätebeständen, R30/R47, Echtgeld oder APIs/Keys. Wiederholter BUY wird lokal HOLD; kein Betrag im Feed. Keine Geräteausführung behaupten ohne Quittung. Um 00:00 Ziel nach Stundenabschluss tägliche >100%-Gewinneranalyse nach Runbook einschließlich verpasster Chancen, riskanter/illiquider Fälle, Verluste, Kosten und Lernhypothesen, bei Abbruch später fortsetzen. Kein unabhängiger automatischer GPT-Vergleich behaupten. Zwei-Paket-Test nicht mehr Arbeitsziel.",
    "schedule": "BEGIN:VEVENT\nDTSTART;TZID=Europe/Berlin:20261126T080500\nRRULE:FREQ=HOURLY\nEND:VEVENT"
  }
]
```
