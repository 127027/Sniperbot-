# Sniperbot V0.20 – Einfache Bedienung und echte Paper-Order-Pipeline

Stand: 11. November 2026. **Entwicklungsbranch:** `codex/v20-simple-ui-paper-agent-orders-20261111`, Draft-PR #29. Nicht in GitHub-`main` oder auf dem echten Nutzer-Laptop automatisch installiert.

## Produktziel
Der Nutzer legt nur das verfügbare Kapital und sein Paper-/Echtgeldhandelsrecht fest. Ein tatsächlich **signiertes Agenten-BUY oder -SELL** kommt über einen authentifizierten, lokal angesprochenen Adapter oder über den **öffentlichen GitHub-Kurier** beim Laptop an. Der Laptop prüft den Absender gegen den **lokal freigegebenen Ed25519-Public Key**, die Geräte-ID, Ablaufzeit, Token-/Pool-Adresse, sein virtuelles Budget und unabhängig abgerufene DEX-Marktdaten. Danach ändert er **nur Paper-Guthaben und Paper-Positionen**, berechnet bei einem SELL den simulierten Gewinn/Verlust und speichert die Quittung. Echtgeld bleibt absolut deaktiviert.

## Die GUI
- **Paper-Trading:** Jetzt nur **Einzahlen** und **Auszahlen** in der Hauptansicht. Der freie Betrag wird als **eine virtuelle Gesamtsumme** angezeigt. Die bisherigen manuellen Test-EUR/TEST-USDC-Konvertierungen sind lediglich unter einem aufklappbaren technischen Detail erreichbar; bei BUY/Abhebung werden die beiden internen Testkonten nach einer ausdrücklich **nicht marktgerechten 1:1-Demo-Logik** automatisch verrechnet. Keine reale EUR/USDC-FX-Abbildung.
- **Offene Positionen ganz oben.** Einstand, aktueller DEX-Indikationspreis, simuliertes Portfolio und mark-to-market sind weiterhin die bisherigen Paper-Bot-Elemente; die 30-Sekunden-Marktabfrage bleibt bei Online-Laptop aktiv.
- **Agenten-Orders:** sichtbare Empfangs-, PAPER_FILLED- und BLOCKED-Zähler und die letzten signierten BUY-/SELL-Quittungen. Signierter Absender, Quelle, Status, Quote und P&L werden im Paper-Bereich angezeigt.
- **Testkapital auf null:** ist jetzt auch bei eingeschaltetem Paper-Bot möglich, **wenn keine offenen Positionen** bestehen; der Bot wird dabei atomar AUS geschaltet. Offene Positionen dürfen nie verschwinden.
- **Echtgeld:** `Meine Wallet`, SOL/USDC-Bestände automatisch alle **30 Sekunden** bei geöffnetem Echtgeld-Tab abfragen (zusätzlich beim Tabwechsel und auf Knopfdruck); Rate-/RPC-Fehler als **unbekannt** melden, niemals ein synthetisches Guthaben oder einen erfundenen EUR-Gesamtwert anzeigen.
- Erweiterte Research-Diagnostik und technische Wallet-Checks bleiben aufklappbar.

## Wirklich vorhandene Signalpipeline

```text
GPT-Dots (bestehende fünf Forschungsrollen)
    |  bislang nur Research-Snapshots – KEINE signierten Order-Signale
    v
GitHub Forschungsdateien (READ ONLY)
    |
    X  keine automatische Order aus unbeweisbaren Research-Hinweisen

Zukünftiger signierender Agenten-Publisher / CLI-/Cloud-Adapter
    |  Ed25519-signierter PAPER-Trade-Wunsch pro Zielgerät
    +--> Lokaler Bearer-geschützter HTTP-Endpunkt
    |       POST /api/paper/agent-orders
    |
    +--> Öffentlicher GitHub-Kurier
            coordination/agent-paper-orders/latest.json
            (alle 40 Sekunden vom Laptop abgefragt)
    v
Lokale Ed25519-Public-Key-Vertrauensliste / Zielgerät / Replay
    v
Unabhängige DEX-Screener-Quote und Budgetprüfung
    v
PAPER_BUY oder PAPER_SELL (niemals echte Wallet)
    v
Persistenter Paper-Ledger + Agent-Quittungen + UI-Positionen/P&L
```

**WICHTIG:** Ein Forschungssnapshot darf nie stillschweigend als unterschriebene Kaufentscheidung gelten. Die tatsächlichen fünf Cloud-Dots veröffentlichen derzeit nur öffentliche `actionable:false`-Forschungsberichte. Der signierte Publisher, der daraus konkrete zeitnahe BUY-/SELL-Befehle erstellt, hat noch **keine nachgewiesene End-to-End-Verbindung zu den fünf real laufenden Dots**. Der Bot ist jedoch **bereit, korrekt signierte Aufträge anzunehmen und im Paper-Modus wirklich auszuführen**, ohne dass einzelne Coins fest programmiert werden müssen.

### Signierter Agentenauftrag
Pro Nachricht `sniper_agent_trade_signal.v1`, mit genau diesen Feldern:

```json
{
  "schema": "sniper_agent_trade_signal.v1",
  "target_device_id": "device_<32 hex-Zeichen>",
  "signal_id": "sig_<32 hex-Zeichen>",
  "issuer": "mein-dot-publisher",
  "key_id": "meine-publisher-key-id",
  "chain": "solana",
  "action": "BUY",
  "token_address": "<echte Solana-Mint-Adresse>",
  "pool_address": "<echte Solana-Pooladresse oder null>",
  "size_test_usdc": "50.00",
  "created_at_utc": "<UTC-ISO-8601>",
  "expires_at_utc": "<UTC-ISO-8601, maximal 120 Sekunden>",
  "signature": "<Ed25519-Signatur als Base64>"
}
```

Ein `SELL` benötigt dieselbe eindeutige Coin-Identität, `action:"SELL"` und **`size_test_usdc:null`**; derzeit wird ausschließlich die **gesamte passende Paper-Position** geschlossen. Die Kombination Chain + Mint/Contract + optionaler Pool ist die Identität, niemals ein Coin-Symbol. Signiert wird die UTF-8-Domain `MemeSniper/agent_trade_signal.v1\n` gefolgt von dem alphabetisch nach Schlüsseln kanonisierten JSON **ohne** `signature`, siehe `unsignedAgentSignal()`.

**Neu in der UI:** Unter **Erweitert → Cloud-Dot für Paper-Orders verbinden** kann der Nutzer Absenderkennung, Schlüssel-ID und den **öffentlichen** PEM-Schlüssel eingeben und ausdrücklich freigeben. Der Bot prüft dabei, dass es wirklich ein Ed25519-Public-Key ist; private Schlüssel und Wallet-Passwörter werden nicht akzeptiert. Falls die Gerätekopplung noch fehlt, erscheint im Paper-Bereich **„Dieses Gerät als Laptop-Zentrale einrichten“**. Eine öffentliche Signatur-Kopplung allein bedeutet noch nicht, dass der Cloud-Dot bereits Aufträge veröffentlicht.

Die vom Nutzer lokal autorisierten öffentlichen Ed25519-Schlüssel werden im Windows-Benutzerprofil unter `%LOCALAPPDATA%\MemeSniperPaper\trusted-execution-publishers.json` verwaltet (bzw. unter `SNIPER_DATA_DIR`). Format z.B.:

```json
[
  {
    "issuer": "mein-dot-publisher",
    "key_id": "meine-publisher-key-id",
    "scope": "agent_execution",
    "public_key_pem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
  }
]
```

Nur der **PUBLIC KEY** kommt hier hinein. Private Key, Wallet-/Signaturschlüssel, Seeds, Passwörter und GitHub-Token **niemals** in GitHub, in Dot-Messages oder Chat hochladen. Das Signiergerät/der Publisher verwahrt seinen eigenen privaten Ed25519-Schlüssel. Der Master-Laptop muss über die bestehende Geräte-Einrichtung als MASTER festgelegt sein. Ohne gültige Publizistensignatur werden alle Aufträge blockiert.

### GitHub als Kurier (nicht als Vertrauen)
Die neu angelegte öffentliche, derzeit leere Feed-Datei ist:
`https://github.com/127027/Sniperbot-/blob/coordination/agent-paper-orders/latest.json`

Der Sender aktualisiert die Datei mit `schema:"sniper_signed_paper_signal_feed.v1"`, `published_at_utc` und höchstens **acht** signierten `signals`. Beim Laptop müssen `SNIPER_OFFLINE` nicht aktiv und `SNIPER_AGENT_PAPER_FEED` nicht auf `0` gesetzt sein. Der Bot liest ausschließlich diese fest verankerte URL, prüft maximal 64 KiB und höchstens drei Minuten Feedalter und führt **nie** aus, bevor die innere Nachricht ein lokales Ed25519-Vertrauen, eine frische Unterschrift und gültige unabhängige Marktdaten vorweist.

`GET /api/paper/agent-orders` liefert Gesamtzähler, echte `PAPER_FILLED`-Quittungen, `BLOCKED`-Quittungen, Transport-Status und die explizite Kennzeichnung, ob die **realen** Dot-Publisher bereits verifiziert sind. Remote-Dots oder GitHub erhalten keinerlei lokale Wallet-Schlüssel; der lokale Node-Server lauscht weiterhin nur auf `127.0.0.1`.

### Technische Testnachweise
- Signierte BUY-Order von einem **temporären CI-Agenten** mit 50 **virtuellen** EUR → automatische interne TEST-USDC-Verrechnung → Paper-Position für neue Solana-Mint → Testkurs steigt von 0,05 auf 0,10 → signiertes SELL → **+48,01 Test-USDC** nach je 1 % simulierten Ein- und Ausstiegskosten. Im **wirklich gestarteten lokalen Node-HTTP-Server** inklusive Status- und Wiederholschutz geprüft.
- Zusätzlicher Test mit fallendem Kurs (negatives Paper-PnL), falscher Signatur, anderem Gerät, Replay, falschem Pool, zu wenig Kapital, Bot AUS und ungültiger Quote.
- Der Windows-Microsoft-Edge-Browsertest klickt Paper und Echtgeld durch, führt mit dem isolierten Test-Publisher BUY/SELL aus und prüft sichtbare Positionen, 0 Positionen nach SELL, Paper-Gewinn und Agenten-Empfangszähler. Keine echten Zahlungen, keine private Wallet betroffen.
- **Separater öffentlicher GitHub-Feed-Mock** transportiert echte Ed25519-Testsignaturen in dieselbe Paper-Engine und prüft richtige Herkunftsmarkierung (`GITHUB_SIGNED_COURIER`) samt Gewinn.
- Die Datei `latest.json` wurde initial nur mit leerer Signalliste angelegt. Das **beweist noch nicht**, dass die fünf realen Dots bereits signierte Orders publizieren.

## Live-Handel und Risiken
Der Echtgeld-Schalter bleibt auf **AUS**. Keine SOL-/SPL-/EVM-Live-Trades, keine On-/Offramp-Abwicklung, kein realer Coinverkauf, keine echten 50 EUR und kein Echtgeld-PnL. Paper-Marktdaten/Quotes sind nicht garantiert ausführbar, und 1 % Gebühren sind ein Testmodell. Ein unzureichendes DEX-Angebot oder eine ungültige Signatur erzeugt BLOCKED-Receipt, keinen heimlichen Kauf. Realer Live-Swap benötigt später eigene geprüfte Smart-Contract-/Pool-/Sellability-/Gas-/Slippage-/MEV-/Settlement-Gates.

**Projektstand:** Keine Änderungen an persönlichen Laptop-Dateien, Dots/Automationen, Android oder `main`. Erst nach unabhängigen Prüfungen könnte `main` aktualisiert werden.


## Ergänzung: tatsächlicher Cloud-Dot-Datenfluss und lokale End-to-End-Diagnose (11.11.2026)

**Tatsächlicher GitHub-Quellennachweis:** Die öffentliche `codex/research-gateway-v04/research/roles`-Quelle enthält fünf getrennte aktuelle Rollenberichte: `news_discovery`, `social_acceleration`, `onchain_liquidity`, `contract_security`, `opportunity_qa`. Der verifizierte Beobachtungslauf vom 11.11.2026 um 15:44 UTC meldete **5/5 frische Forschungsberichte**, aber **0 bewiesene Kaufkandidaten in den aktuellen Rollenberichten**. Der getrennte öffentliche GitHub-Kurier `coordination/agent-paper-orders/latest.json` war erreichbar, enthielt jedoch **0 signierte Orders**. Das ist eine nachprüfbare Trennung zwischen *echten Dot-Forschungsberichten* und *noch nicht verbundenen Dot-Handelsentscheidungen*. Der Test beweist ausdrücklich NICHT, dass ein echter Dot signiert oder eine Paper-Position erzeugt hat.

Der Bot liest die öffentliche Forschung **ab dieser Version standardmäßig**, außer `SNIPER_OFFLINE=1` oder `SNIPER_RESEARCH_READ=0`. In der Paper-Oberfläche zeigt er unter **Orders der Forschungs-Bots**:
- Fünf Rollen einzeln mit Veröffentlichungszeit, Verfügbarkeits-/Frische-Status und Anzahl der beobachteten Kandidaten.
- Die öffentliche **Watchlist-Beobachtungszahl**, getrennt von bestätigten Handelssignalen. Das Leselimit der Watchlist ist von 128 KiB auf kontrollierte 512 KiB erhöht (137 Einträge / ca. 172 KiB am 11.11.2026); einzelne Rollen bleiben weiter streng auf 128 KiB begrenzt.
- Ob überhaupt ein **lokal freigegebener öffentlicher Signaturschlüssel** vorhanden ist, wie viele per GitHub gesendete Nachrichten gefunden, angenommen oder zurückgewiesen wurden, warum die letzte Nachricht zurückgewiesen wurde, wie viele `PAPER_FILLED`-Quittungen existieren und wie viele Positionen tatsächlich offen sind.
- **Kein tatsächlicher Dot-Publisher** wird allein aufgrund eines signierten Testauftrags oder einer öffentlichen GitHub-Research-Datei als verbunden behauptet.

**Neu: Ein-Klick-Funktion „BUY/SELL-Pipeline testen (nur lokaler Testsender)“.** Der Button erzeugt einen nur im Speicher existierenden Ed25519-Testsender sowie einen isolierten 50-EUR-Paper-Zustand, führt ein signiertes BUY und SELL bei steigender sowie fallender Testquote aus und zeigt das Ergebnis. Dieser Test verändert **weder vorhandenes Paper-Guthaben noch echte Wallet-Dateien** und liest/schreibt nicht im öffentlichen GitHub. Er ist ausdrücklich **kein Test einer tatsächlichen Dot-Order-Zustellung**. Der Endpoint `POST /api/paper/pipeline-selftest` akzeptiert nur lokale Browseraktionen und ein **leeres JSON-Objekt**; eingereichte Coin-Adressen, Beträge oder andere Auftragsdaten werden abgewiesen.

**Offener entscheidender Schritt:** Ein realer Cloud-Dot muss tatsächlich eine Paper-BUY-/SELL-Entscheidung mit frischer eindeutiger Chain-/Mint-/Pool-Identität erzeugen, diese als `sniper_agent_trade_signal.v1` **mit seinem eigenen vertrauenswürdigen Ed25519-Signaturschlüssel** signieren und über den GitHub-Kurier veröffentlichen. Der Laptop muss dessen **öffentlichen** Schlüssel zuvor ausdrücklich akzeptiert haben. Die vorhandenen fünf Automationsprompts sind weiterhin Forschung-only und verbieten signierte Handelsaufträge; sie wurden nicht stillschweigend in Trading-Agents umgeschrieben. Solange diese Publisher-Fähigkeit fehlt, bleibt **Dot-Forschung → automatischer echter Dot-Paper-Fill NICHT ABGESCHLOSSEN**. Kein Live-Trading.

Die Public-Feed-Beobachtung kann ohne Änderungen an Wallet oder Paper-Konto reproduziert werden: `node runner/dot-public-feed-live-probe.mjs` (rein lesend, mit explizitem Ergebnis `real_cloud_dot_signed_orders_confirmed:false`).
