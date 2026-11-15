# R29 – ChatGPT ↔ GitHub ↔ Windows-Sniperbot: Start und Abnahme
Stand: 15.11.2026 · nur isolierter PAPER-TEST, kein Echtgeld.

## Aktueller, echter Nachweis (GitHub Actions)

**Die erste Runde ChatGPT → GitHub → isolierter CI-Bot → GitHub → ChatGPT ist abgeschlossen.**
ChatGPT schrieb zwei verschiedene Aufträge in `research/r29/channel/latest-intent.json`.
Der GitHub-Actions-Test-Bot las diese Dateien und führte den vorhandenen
signierten Paper-Engine-Code in seinem **eigenen** Wegwerf-Testkonto aus:

- BUY: `r29_b136f1e5b61f473ab216a55900f0abcd`
  → `PAPER_FILLED`, 50.00 TEST-USDC, 990 virtuelle Token.
- SELL: `r29_c291f587a05d45b98bc8a2294bcd641e`
  → `PAPER_FILLED`, Position geschlossen.
- CI-Testkapital von 5.000,00 → 5.028,408 TEST-USDC, reiner synthetischer Gewinn +28,408.
- Die **einprogrammierten** Kurse waren BUY 0,05 und SELL 0,08; keine historischen
  Memecoin-Kurse, keine DEX-Ausführung und keine Performanceprognose.
- CI BUY: https://github.com/127027/Sniperbot-/actions/runs/43696927084
- CI SELL: https://github.com/127027/Sniperbot-/actions/runs/43696992369
- Originales Windows-Paper-Konto und Wallet wurden in diesen CI-Läufen nicht angerührt.

**Noch nicht bewiesen:** Die unabhängige Kommunikation mit dem auf deinem eigenen
Laptop gestarteten Windows-Bot und das tatsächliche Schreiben durch eine
**stündlich geplante** ChatGPT-Aufgabe. Wir aktivieren vorerst keine stündliche Aufgabe.

## Windows installieren – keine OpenAI-API notwendig

1. Alten Sniperbot mit Q sauber beenden.
2. GitHub Branch `codex/r29-chatgpt-github-paper-cycle-20261115` auswählen:
   https://github.com/127027/Sniperbot-/tree/codex/r29-chatgpt-github-paper-cycle-20261115
3. `Code → Download ZIP`; in einen **neuen Ordner** entpacken, z. B.
   `C:\Sniperbot-R29`. Die bisherigen Kontodaten unter
   `%LOCALAPPDATA%\MemeSniperPaper\` auf keinen Fall löschen.
4. Node.js 22 LTS installieren, falls nicht vorhanden.
5. **Einmalig** auf GitHub einen kostenlosen Fine-grained Personal Access Token (PAT)
   erstellen: https://github.com/settings/personal-access-tokens/new
   - Owner: dein GitHub-Konto `127027`.
   - Repository access: **Only select repositories**, `Sniperbot-`.
   - Repository permissions → **Contents: Read and write** (keine anderen
     Schreibrechte, keine Adminrechte).
   - Kurzes Ablaufdatum wählen. GitHub-PAT benötigt **kein OpenAI-Guthaben**.
6. `Sniperbot_Starten.bat` aus dem neuen R29-Ordner doppelklicken.
   **Wichtig: Diese R29-Startdatei fragt keinen OpenAI-API-Key mehr ab.**
   Auf Aufforderung nur den GitHub-PAT **verdeckt auf dem Laptop** eingeben.
   Der Token wird Windows-DPAPI-verschlüsselt gespeichert und ausschließlich dem
   separaten lokalen R29-Kurier-Prozess übergeben, nicht dem Botserver/Wallet.
   **Niemals GitHub-PAT, Seedphrase oder private Wallet-Dateien hier im Chat hochladen!**
7. Bot-Dashboard öffnet `http://127.0.0.1:3030`. Der R29-Kurier prüft GitHub
   ungefähr alle 45 Sekunden. Jede geänderte Eingangs-Order und ein maximal
   viertelstündliches Status-Heartbeat werden per GitHub REST zurückgemeldet.
8. Abonniere/prüfe danach die Datei:
   https://github.com/127027/Sniperbot-/blob/codex/r29-chatgpt-github-paper-cycle-20261115/research/r29/channel/windows-status.json
   Sie erscheint nur, wenn dein Laptop den GitHub-Kanal **tatsächlich** erreicht
   und ein neues, berechtigtes Status-Commit schreiben kann.
9. **Lass die automatische Paper-Kaufoption für dein reguläres Konto AUS.**
   R29 nutzt ausschließlich ein getrenntes synthetisches lokales Sandbox-Konto.
   Der GitHub-Kurier handelt nicht in deinem bestehenden virtuellen Guthaben.

## Wie der Windows-Kommunikationstest abläuft

ChatGPT kann anschließend (manuell, in diesem Chat) einen neuen, ausschließlich
auf `WINDOWS_SANDBOX` gerichteten `R29`-Auftrag in GitHub speichern.
Der Windows-Prozess muss ihn erkennen und als `PAPER_FILLED` bestätigen.
Nach Rücklesung durch ChatGPT folgt ein `SELL`. Die Position muss verschwinden
und die Quittung muss im selben GitHub-Branch auftauchen.

**Nur ein tatsächlich auf deinem PC gestarteter Kurier kann dieses Protokoll
erzeugen.** Die GitHub-Actions-CI-Bot-Quittung darf niemals als Windows-Beweis gelten.

Die in `windows-status.json` enthaltenen Informationen sind rein synthetische
Testdaten: Quittungsstatus, Testguthaben, Zeitstempel und ein Hinweis, ob die lokale
Bot-Gesundheitsroute erreichbar war. **Keine** API-Keys, PATs,
Wallet-Adressen, echten Kontostände oder privaten persönlichen Daten.

GitHub ist der **Transport**; die Test-Inhalte sind nur nach Quellenprüfung,
Zeitablauf, festen Tokenadressen und Replay-ID-Schutz zulässig.
Die Windows-Quittung zeigt einen isolierten, lokal ausgeführten Test – **noch
keinen Kauf im eigentlichen Paper-Account**. Erst nach dem echten
Windows-Rundlauf wird dieser nächste Schritt geplant.

## Grenzen der geplanten stündlichen ChatGPT-Aufgabe

Das vom Nutzer gewünschte einfache Prinzip ist grundsätzlich möglich:
geplante ChatGPT-Aufgabe → vorhandene Analyse-Regeln aus GitHub lesen →
aktuellen Bot-Status prüfen → auf GitHub schreiben → Bot empfängt → Rückmeldung.

Die konkreten Kontoberechtigungen entscheiden jedoch, ob **schreibende**
GitHub-Aktionen in unbeaufsichtigten ChatGPT-Tasks zugelassen sind oder erst
manuelle Genehmigung verlangen. Solche Genehmigungen können den stündlichen
Kreislauf unterbrechen. Das muss vor Aktivierung mit einem echten
Task-Ausführungstest verifiziert werden; ein manuelles GPT-GitHub-Commit
beweist keine unbeaufsichtigten künftigen Schreibrechte.

Keine neue ChatGPT-Automation automatisch aktivieren, bevor:
1. Der echte Windows-Kurier ein Status-Heartbeat über GitHub veröffentlicht.
2. ChatGPT einen Windows-BUY und -SELL aus GitHub auslösen und zurücklesen kann.
3. Eine unbeaufsichtigte ChatGPT-Aufgabe tatsächlich GitHub schreiben darf.

**Privatheit:** Dieses GitHub-Repository kann öffentlich sein. R29 veröffentlicht
nur Testdaten. Echte Wallet-Bestände oder Portfolioinformationen sind bisher
ausdrücklich nicht Teil der GitHub-Statusdatei; dafür wäre ein geschützter
Datenkanal mit getrenntem Berechtigungskonzept nötig.

## Fehlersuche

- Kein Fenster/API-Key nötig: `Sniperbot_Starten.bat` enthält nun `-WithR29`.
- `OHNE GITHUB TOKEN AUS`: der PAT wurde übersprungen/fehlt.
- GitHub HTTP 401/403: PAT abgelaufen, falscher Owner, fehlende
  Repository-Contents-Berechtigung oder GitHub-Zugriff blockiert.
- GitHub HTTP 409: gleichzeitige Inhalts-Updates. R29 schreibt maximal jede
  15 Minuten Heartbeat und sofort bei neuen Testaufträgen; danach erneut prüfen.
- `WINDOWS_SANDBOX`-Order veraltet/abgelaufen: wird sicher blockiert.
- Kein Bot HTTP: R29 kann "bot offline" melden, ohne das Portfolio zu verändern.
- Bestehende R27-Paper-Daten werden unverändert beibehalten.
- GitHub-Kurier bewusst entfernen: Bot Q, und den Token lokal über
  `Sniperbot_Starten.bat -ResetR29Token` neu konfigurieren.

**Sicherheitskonsequenz:** GitHub-PAT hat Schreibrechte auf genau das Repository,
nicht auf irgendeine Wallet. Trotzdem behandeln wie ein Passwort, bei Verlust
in GitHub widerrufen. 
