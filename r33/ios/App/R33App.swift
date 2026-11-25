import SwiftUI
import UIKit

@main struct R33App: App {
    @UIApplicationDelegateAdaptor(PaperDelegate.self) var delegate
    @StateObject private var model = PaperModel.shared
    @Environment(\.scenePhase) var phase
    var body: some Scene {
        WindowGroup {
            Dashboard(model:model)
                .preferredColorScheme(.dark)
                .task(id:phase) {
                    guard phase == .active else { if phase == .background { model.scheduleBackground() }; return }
                    await model.poll()
                    while !Task.isCancelled {
                        try? await Task.sleep(nanoseconds:180_000_000_000)
                        if Task.isCancelled { break }
                        await model.poll()
                    }
                }
        }
    }
}
private let accent = Color(red:0.18,green:0.78,blue:0.62)
private func euro(_ value:Any?) -> String {
    guard let n=value as? NSNumber else { return "Unbekannt" }
    return n.doubleValue.formatted(.currency(code:"EUR").locale(Locale(identifier:"de_DE")))
}
private func fmt(_ x:Any?) -> String { x as? String ?? (x as? NSNumber)?.stringValue ?? "—" }
private func list(_ x:Any?) -> [Object] { x as? [Object] ?? [] }
private func dict(_ x:Any?) -> Object { x as? Object ?? [:] }
private func localTime(_ x:Any?) -> String {
    guard let d=date(x) else { return "—" }; let f=DateFormatter();f.locale=Locale(identifier:"de_DE");f.timeZone=TimeZone(identifier:"Europe/Berlin");f.dateFormat="dd.MM. HH:mm";return f.string(from:d)
}
struct Dashboard: View {
    @ObservedObject var model: PaperModel
    @State private var tab = 0
    @State private var real = false
    private var ledger:Object { dict(model.view["ledger"]) }
    private var summary:Object { dict(model.view["summary"]) }
    var body: some View {
        VStack(spacing:0) {
            VStack(alignment:.leading,spacing:8) {
                Text("R33 / MEMECOIN SNIPERBOT").font(.caption.bold()).foregroundStyle(accent)
                HStack { Text("Trading-Leitstelle").font(.title2.bold()); Spacer(); Text("PAPER · iOS").font(.caption2).foregroundStyle(accent) }
                Text("Lokales Konto " + String(fmt(model.view["account_id"]).prefix(8))).font(.caption).foregroundStyle(.secondary)
                Picker("Handelsmodus",selection:$real) { Text("Paper-Trading").tag(false); Text("Echtgeld").tag(true) }.pickerStyle(.segmented)
                Text(model.status + (model.lastChecked.map{" · "+localTime(iso($0))} ?? "")).font(.caption).foregroundStyle(.secondary).accessibilityIdentifier("feedStatus")
                if !model.error.isEmpty { Text(model.error).font(.caption).foregroundStyle(.orange).accessibilityIdentifier("accountError") }
            }.padding()
            TabView(selection:$tab) {
                ScrollView { if real { locked } else { overview } }.tabItem{ Label("Übersicht",systemImage:"chart.line.uptrend.xyaxis") }.tag(0)
                ScrollView { if real { locked } else { trades } }.tabItem{ Label("Trades",systemImage:"list.bullet.rectangle") }.tag(1)
                ScrollView { dots }.task(id:tab){ if tab==2 { await model.research() } }.tabItem{Label("KI-Dots",systemImage:"brain.head.profile")}.tag(2)
                ScrollView { if real { locked } else { MoneyView(model:model) } }.tabItem{Label("Finanzen",systemImage:"eurosign.circle")}.tag(3)
                ScrollView { if real { locked } else { ControlsView(model:model) } }.tabItem{Label("Einstellungen",systemImage:"gearshape")}.tag(4)
            }.tint(accent)
        }.background(Color(red:0.045,green:0.08,blue:0.10))
    }
    var locked: some View { panel("Echtgeld deaktiviert") { Text("Kein echtes Konto, keine Wallet, kein PayPal und keine echten Transaktionen. Paper-Trading bleibt unabhängig aktiv.").foregroundStyle(.secondary) }.padding() }
    var overview: some View {
        VStack(spacing:12) {
            panel("Mein Paper-Portfolio") {
                Text(euro(summary["net_liquidation_value_eur"])).font(.largeTitle.bold()).accessibilityIdentifier("portfolioValue")
                Text("Handels-PnL "+euro(summary["total_pnl_eur"])).foregroundStyle(accent)
                HStack { metric("Verfügbar",euro(ledger["cash_eur"]));metric("Investiert",euro(summary["open_cost_eur"])) }
            }
            panel("Signalabruf") {
                Button("Jetzt aktualisieren"){ Task { await model.poll() } }.buttonStyle(.borderedProminent).tint(accent)
                Toggle("iOS-Hintergrundaktualisierung",isOn:Binding(get:{model.backgroundEnabled},set:{model.setBackground($0)}))
                Text(model.backgroundStatus).font(.caption).foregroundStyle(.secondary)
                Text("iOS entscheidet, wann die App im Hintergrund laufen darf. Kein garantierter Stundenhandel bei gesperrtem Bildschirm. Beim Öffnen werden aktuelle Signale geprüft.").font(.caption).foregroundStyle(.orange)
            }
            panel("Meine Handelsleistung") {
                HStack { metric("Verkäufe",fmt(model.perf["exits"]));metric("Gewinn / Verlust",fmt(model.perf["wins"])+" / "+fmt(model.perf["losses"])) }
                if let n=model.perf["return_on_deposits"] as? NSNumber { Text("Rendite auf Bruttoeinzahlungen: "+String(format:"%.2f %%",n.doubleValue)) }
                let history=list(model.perf["history"]).suffix(168).compactMap{($0["pnl_eur"] as? NSNumber)?.doubleValue}
                if history.count>1 {
                    GeometryReader { geo in
                        let low=min(0,history.min() ?? 0), high=max(0,history.max() ?? 0),span=max(0.01,high-low)
                        Path { p in for (i,v) in history.enumerated(){let pt=CGPoint(x:geo.size.width*CGFloat(i)/CGFloat(history.count-1),y:geo.size.height*CGFloat((high-v)/span));if i==0{p.move(to:pt)}else{p.addLine(to:pt)}} }.stroke(accent,lineWidth:2)
                    }.frame(height:80).accessibilityLabel("Historie des Handelsgewinns")
                } else { Text("Noch keine ausreichende Stundenhistorie.").font(.caption).foregroundStyle(.secondary) }
            }
            panel("KI-Referenzportfolio · R30") { Text("Gemeinsame Simulation der Dots, unabhängig von deinem Konto.").font(.caption);Text(euro(dict(model.reference["summary"])["net_liquidation_value_eur"]));Button("KI-Ergebnisse ansehen"){tab=2} }
        }.padding()
    }
    var trades: some View {
        VStack(spacing:12) {
            panel("Meine offenen Positionen") { records(list(ledger["positions"]),kind:0) }
            panel("Mein Handelsjournal") { records(Array(list(ledger["trades"]).reversed()),kind:1) }
            panel("Letzter lokaler Signalabschluss") { let c=dict(model.view["last_cycle"]);Text(localTime(c["target_utc"])+" · "+fmt(c["status"]));records(list(c["events"]),kind:2) }
        }.padding()
    }
    var dots: some View {
        VStack(spacing:12) {
            panel("Nächster geplanter Stundenabschluss") {
                TimelineView(.periodic(from:.now,by:1)){ctx in
                    let t=Date(timeIntervalSince1970:(floor(ctx.date.timeIntervalSince1970/3600)+1)*3600)
                    Text(localTime(iso(t))+" Uhr (MEZ/MESZ)").font(.title2.bold())
                    Text("Geplant, nicht garantiert").font(.caption)
                }
                Button("Berichte aktualisieren"){Task{await model.poll();await model.research()}}
                Text(model.researchStatus).font(.caption).foregroundStyle(.secondary)
            }
            panel("Die fünf Dots") {
                ForEach(0..<4,id:\.self){ i in
                    VStack(alignment:.leading,spacing:4){
                        Text("Dot \(i+1) · "+["Markt","Discovery","Risiko","Strategie"][i]).font(.headline)
                        Text(model.roleStates[i]).font(.caption).foregroundStyle(.secondary)
                        let r=model.roleReports[i]
                        let ds=list(r["research_decisions"] ?? r["decisions"])
                        if !ds.isEmpty { DisclosureGroup("Letzte gespeicherte Entscheidungen (\(ds.count))"){ records(ds,kind:3) } }
                    }.padding(.vertical,5)
                }
                Text("Dot 5 · Stundenabschluss").font(.headline)
                Text("Letzter verifizierter Bericht: "+localTime(model.reference["target_utc"])).font(.caption)
                Text("Fehlende Rollen: "+((model.reference["missing_roles"] as? [Int])?.map{String($0)}.joined(separator:", ") ?? "Unbekannt")).font(.caption)
            }
            panel("Gemeinsame R31/R32-Signale") {
                Text("Sequenz "+fmt(model.signal["sequence"])+" · "+localTime(model.signal["target_utc"]))
                Text((date(model.signal["expires_at_utc"]).map{$0>Date()} ?? false) ? "Signal aktuell gültig":"Kein gültiges Signal bestätigt").font(.caption)
                records(list(model.signal["decisions"]),kind:3)
            }
            panel("R30 · Referenzbericht") { records(list(model.reference["research_decisions"]),kind:3) }
        }.padding()
    }
}
private func panel<Content:View>(_ title:String,@ViewBuilder _ body:()->Content)->some View{
    VStack(alignment:.leading,spacing:12){Text(title).font(.headline);body()}.frame(maxWidth:.infinity,alignment:.leading).padding(16).background(Color(red:0.09,green:0.14,blue:0.17),in:RoundedRectangle(cornerRadius:16))
}
private func metric(_ title:String,_ value:String)->some View{
    VStack(alignment:.leading,spacing:4){Text(title).font(.caption).foregroundStyle(.secondary);Text(value).font(.headline)}.frame(maxWidth:.infinity,alignment:.leading)
}
private func records(_ items:[Object],kind:Int)->some View{
    VStack(alignment:.leading,spacing:10){
        if items.isEmpty { Text("Noch keine Einträge").foregroundStyle(.secondary).font(.caption) }
        ForEach(Array(items.enumerated()),id:\.offset){_,item in
            VStack(alignment:.leading,spacing:4){
                Text(fmt(item["coin"] ?? item["symbol"])+" · "+fmt(item["action"] ?? item["decision"])).font(.subheadline.bold())
                if kind==0 { Text("Kosten "+euro(item["cost_basis_eur"])+" · Netto "+euro(item["net_liquidation_eur"])+" · PnL "+euro(item["unrealized_pnl_eur"])) }
                if kind==1 { Text(euro(item["amount_eur"] ?? item["net_proceeds_eur"])+" · "+localTime(item["booked_at_utc"])) }
                if kind==2 { Text(fmt(item["status"])) }
                if let s=(item["reason"] ?? item["rationale"] ?? item["thesis"]) as? String { Text(s) }
                if let s=item["source_url"] as? String { Text(s).font(.caption2) }
            }.font(.caption).frame(maxWidth:.infinity,alignment:.leading)
            Divider()
        }
    }
}
struct MoneyView:View {
    @ObservedObject var model:PaperModel
    @State private var amount=""
    @State private var withdraw=false
    var body:some View{
        panel("Testgeld verwalten"){
            Text("Nur virtuelle Ein- und Auszahlungen. Kein echtes Geld.").foregroundStyle(.secondary)
            TextField("Betrag (€)",text:$amount).keyboardType(.decimalPad).textFieldStyle(.roundedBorder).accessibilityIdentifier("fundAmount")
            Picker("Aktion",selection:$withdraw){Text("Einzahlen").tag(false);Text("Auszahlen").tag(true)}.pickerStyle(.segmented)
            Button("Virtuell buchen"){model.fund(amount,withdraw:withdraw);if model.error.isEmpty{amount=""}}.buttonStyle(.borderedProminent).tint(accent).disabled(!model.ready).accessibilityIdentifier("fundButton")
            Text("Kapitalbewegungen").font(.headline)
            ForEach(Array(list(model.view["funding_events"]).reversed().enumerated()),id:\.offset){_,f in Text((fmt(f["kind"])=="PAPER_DEPOSIT" ? "Einzahlung ":"Auszahlung ")+euro((f["amount_cents"] as? NSNumber).map{$0.doubleValue/100})+" · "+localTime(f["at_utc"])).font(.caption)}
        }.padding()
    }
}
struct ControlsView:View{
    @ObservedObject var model:PaperModel
    @State private var max="",stake=""
    @State private var allow=false
    @State private var revision=0
    var body:some View{
        panel("Meine Handelseinstellungen"){
            Text("Nur auf diesem Gerät. Das Limit ist keine Einzahlung.").font(.caption)
            Text("Maximal investiert (€)").font(.caption);TextField("500",text:$max).keyboardType(.decimalPad).textFieldStyle(.roundedBorder).accessibilityIdentifier("maxInvest")
            Text("Einsatz pro Coin (€)").font(.caption);TextField("50",text:$stake).keyboardType(.decimalPad).textFieldStyle(.roundedBorder).accessibilityIdentifier("stake")
            Toggle("Neue Paper-Käufe zulassen",isOn:$allow)
            Button("Lokal speichern"){model.controls(max:max,stake:stake,allow:allow,revision:revision);if model.error.isEmpty{load()}}.buttonStyle(.borderedProminent).tint(accent).disabled(!model.ready)
            Text("Kein Datenaustausch mit anderen Konten. Bei einer Neuinstallation kann das lokale Konto verloren gehen.").font(.caption).foregroundStyle(.secondary)
        }.padding().onAppear{load()}
    }
    private func load(){let c=dict(model.view["controls"]);max=String(format:"%.2f",Double(c["max_invest_cents"] as? Int ?? 0)/100);stake=String(format:"%.2f",Double(c["stake_cents"] as? Int ?? 5000)/100);allow=c["allow_new_buys"] as? Bool ?? false;revision=c["revision"] as? Int ?? 0}
}
