import Foundation
import SwiftUI
import BackgroundTasks
import UIKit

@MainActor final class PaperModel: ObservableObject {
    static let shared = PaperModel()
    nonisolated static let refreshID = "com.r33.paperbot.refresh"
    @Published private(set) var view: Object = [:]
    @Published private(set) var perf: Object = [:]
    @Published private(set) var status = "Noch nicht geprüft"
    @Published private(set) var error = ""
    @Published private(set) var signal: Object = [:]
    @Published private(set) var reference: Object = [:]
    @Published private(set) var roleStates = Array(repeating: "Noch nicht geprüft", count: 4)
    @Published private(set) var roleReports: [Object] = Array(repeating: [:], count: 4)
    @Published private(set) var researchStatus = ""
    @Published private(set) var backgroundStatus = ""
    @Published private(set) var lastChecked: Date?
    private var engine: PaperEngine?
    private var store: AccountStore?
    private var account: Object?
    private let feed = PublicFeed()
    private var polling = false
    private var researching = false
    private init() {
        do {
            let e = try PaperEngine(), s = try AccountStore()
            engine = e; store = s
            if let a = try s.load() { account = a; try transact("view") }
            else { try transact("create") }
        } catch { self.error = "Lokaler Speicher gesperrt: " + error.localizedDescription; engine = nil }
    }
    var ready: Bool { engine != nil && account != nil }
    private func transact(_ op: String, _ input: Object? = nil) throws {
        guard let e = engine, let s = store else { throw PaperError.failure("LOCAL_ACCOUNT_LOCKED") }
        let r = try e.call(op, account: account, input: input)
        guard let a = r["account"] as? Object, let v = r["view"] as? Object else { throw PaperError.failure("ENGINE_RESPONSE") }
        // Single main-actor writer; publish only after atomic disk write succeeds.
        if op != "view" && (r["status"] as? String != "ALREADY_PROCESSED") { try s.save(a) }
        account = a; view = v; perf = r["performance"] as? Object ?? [:]
        if let st = r["status"] as? String { status = st }
    }
    func fund(_ euros: String, withdraw: Bool) {
        do { let c = try cents(euros, zero: false); try transact("fund",["id": UUID().uuidString,"kind":withdraw ? "PAPER_WITHDRAW":"PAPER_DEPOSIT","amount_cents":c]); error = "" }
        catch { self.error = error.localizedDescription }
    }
    func controls(max: String, stake: String, allow: Bool, revision: Int) {
        do { try transact("controls",["expected_revision":revision,"max_invest_cents":try cents(max,zero:true),"stake_cents":try cents(stake,zero:false),"allow_new_buys":allow]); error = "" }
        catch { self.error = error.localizedDescription }
    }
    private func cents(_ value: String, zero: Bool) throws -> Int {
        let normalized = value.replacingOccurrences(of:",",with:".")
        guard normalized.range(of: #"^\d+(\.\d{1,2})?$"#, options:.regularExpression) != nil,
            let d = Decimal(string:normalized,locale:Locale(identifier:"en_US_POSIX")), d >= (zero ? 0 : Decimal(string:"0.01")!), d <= 1_000_000 else { throw PaperError.failure("Ungültiger Betrag") }
        return NSDecimalNumber(decimal:d*100).intValue
    }
    @discardableResult func poll() async -> Bool {
        guard ready, !polling else { return false }; polling = true; defer { polling = false; lastChecked = Date() }
        do {
            let latest = try await feed.latest()
            try Task.checkCancellation()
            guard let latest else { status = "NOT_PUBLISHING"; return true }
            try transact("signal", latest); signal = latest["signal"] as? Object ?? [:]; return true
        } catch { status = "FEED_ERROR · " + error.localizedDescription; return false }
    }
    func research() async {
        guard !researching else { return }; researching = true; defer { researching = false }
        do { reference = try await feed.reference(); researchStatus = "R30-Bericht verifiziert" }
        catch { researchStatus = "R30-Abruf fehlgeschlagen: " + error.localizedDescription + " · ggf. ältere Daten" }
        let hour = Date(timeIntervalSince1970:floor(Date().timeIntervalSince1970/3600)*3600)
        let target = hour.addingTimeInterval(3600)
        for n in 1...4 {
            do { let r = try await feed.role(n,target:target); roleReports[n-1] = r; roleStates[n-1] = "Gespeichert · " + (r["completed_at_utc"] as? String ?? "") }
            catch { roleStates[n-1] = "Aktueller Bericht nicht bestätigt · " + error.localizedDescription }
        }
    }
    var backgroundEnabled: Bool { UserDefaults.standard.bool(forKey:"r33.background") }
    func setBackground(_ enabled: Bool) {
        UserDefaults.standard.set(enabled,forKey:"r33.background")
        if enabled { scheduleBackground() }
        else { BGTaskScheduler.shared.cancel(taskRequestWithIdentifier:Self.refreshID); backgroundStatus = "Aus" }
    }
    func scheduleBackground() {
        guard backgroundEnabled else { backgroundStatus = "Aus"; return }
        let req = BGAppRefreshTaskRequest(identifier:Self.refreshID)
        req.earliestBeginDate = Date().addingTimeInterval(15*60)
        do { BGTaskScheduler.shared.cancel(taskRequestWithIdentifier:Self.refreshID); try BGTaskScheduler.shared.submit(req); backgroundStatus = "Angefragt · iOS bestimmt den Zeitpunkt" }
        catch { backgroundStatus = "Nicht eingeplant: " + error.localizedDescription }
    }
}
class PaperDelegate: NSObject, UIApplicationDelegate {
    func application(_ application:UIApplication,didFinishLaunchingWithOptions launchOptions:[UIApplication.LaunchOptionsKey:Any]? = nil) -> Bool {
        BGTaskScheduler.shared.register(forTaskWithIdentifier:PaperModel.refreshID,using:nil) { task in
            guard let refresh = task as? BGAppRefreshTask else { task.setTaskCompleted(success:false); return }
            let work = Task { @MainActor in
                let model = PaperModel.shared
                model.scheduleBackground()
                let ok = model.backgroundEnabled ? await model.poll() : false
                refresh.setTaskCompleted(success:ok && !Task.isCancelled)
            }
            refresh.expirationHandler = { work.cancel() }
        }
        return true
    }
}
