# R29 V5.8 – GPT-Entscheidungszentrale, GitHub-Kurier, Windows-Executor

Datum: 2026-11-19. Status: ARCHITEKTUR- UND BLOCKERNOTIZ; KEIN LIVE-/PAPER-FILL-NACHWEIS.

## Eindeutiges Nutzer-Mandat

- GPT recherchiert selbstständig Memecoins, priorisiert und prüft 4–24 reale Kandidaten/Tag, trifft BUY/WATCH/REJECT und später SELL.
- GPT schreibt strukturierte, zeitgestempelte Entscheidungen und überprüfbare Lernnotizen in das Repository. Jede Entscheidung muss Quelle, Chain, Token-/Pool-Adresse, Zeitpunkt und Begründung enthalten.
- GitHub übermittelt authentifizierte Entscheidung/Order und Empfangsstatus.
- Der Windows-Sniperbot ist **reiner Executor**: prüft Signatur, Kontostand, Quote, Sellability und technische Sicherheit, führt Paper-BUY/SELL mit dem **vom Nutzer lokal eingestellten Einsatz pro Coin** aus und journalisiert den tatsächlichen Fill.
- Der Bot sucht oder bewertet selbst keine Coins und bestimmt keine Handelsstrategie. Echtgeld bleibt gesperrt.
- UI soll echte Aktivität zeigen: zuletzt beobachtete Kandidaten, Zeitpunkt der GPT-Analyse, BUY/WATCH/REJECT, Übertragungsstatus, Ablehnungsgrund, `PAPER_FILLED`, offene Positionen, `PAPER_SELL_FILLED`. Sichtbare WATCH/NO_TRADE-Analysen sind erlaubt und dürfen niemals als Fills bezeichnet werden.

## Belegter Ausgangspunkt

Am Branch `codex/r29-chatgpt-github-paper-cycle-20261115` zeigte `research/r29/channel/gpt-paper-decision.json` einen Pointer auf `gpt_6845089381acc2094d155f5596b7bbec`, publiziert `2026-11-19T21:02:23.750Z`.
Der dazugehörige `gpt-paper-receipt.json` hatte `action=NO_TRADE`, `status=NO_TRADE`, `reason=GPT_RESEARCH_NO_ORDER`, `origin_model_signature_verified=false`, empfangen `2026-11-19T21:02:52.017Z`.
Dies beweist eine GitHub-Receipt-Meldung, **keinen** signierten BUY und **keinen** Windows-Paper-Fill.
Die bestehende V5.7-Dokumentation verlangt neue v3-BUYs mit `sizing_mode=LOCAL_USER_COIN_STAKE`; die lokale Installation und der erste persönliche GPT-v3-`PAPER_FILLED` sind dort ausdrücklich nicht belegt.

## Nächste überprüfbare Schritte

1. Tatsächliche zeitnahe GPT-Review-Ausgaben gegen aktuelle Quellen prüfen; nicht bloß Scan-/Forschungsreports als GPT-Modellentscheidungen zählen.
2. Bei einem legitimen GPT-BUY die bestehende v3-Archiv-/Signatur-/Kurierstrecke bis zum Windows-Receipt verifizieren. Kein künstlicher BUY, keine Sicherheitsumgehung.
3. Lokalen Windows-Executor-Status kontrollieren: aktuelle Version installiert, GitHub-Pull aktiv, `paper_bot_enabled`, GPT-Follow, v3-Signatur, Sicherheitsprüfungen und Konto.
4. UI aus dem realen lokalen Event-Journal/Receipt aktualisieren; einen getrennten Aktivitätsfeed für `SOURCE_OBSERVED`, `GPT_REVIEWED`, `WATCH`, `BUY_REQUESTED`, `ORDER_RECEIVED`, `PAPER_BLOCKED`, `PAPER_FILLED`, `SELL` anzeigen. Alte Ereignisse mit echtem UTC-Zeitstempel kennzeichnen.
5. Tests: Contract für v3-Paper-BUY/SELL, Budget- und Sicherheitsblockade, Duplikatschutz, UI-Event-Rendering, anschließender prospektiver Test mit echter GPT-Entscheidung. Testsender niemals als echten GPT-Handel ausgeben.

## Lernregeln

Jeder spätere echte Versuch bekommt eine separate datierte Datei mit Snapshot-IDs und Quellen. Auswirkungen auf die Strategie dürfen erst nach belegten Ergebnissen bewertet werden. Historische Februar-Gewinner nicht zur rückwirkenden Auswahl nutzen; Verlustfälle und nicht ausgewählte Token als Vergleichsgruppe betrachten.
