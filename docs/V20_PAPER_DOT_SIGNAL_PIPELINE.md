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
