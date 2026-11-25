import Foundation
import JavaScriptCore

enum PaperError: LocalizedError {
    case failure(String)
    var errorDescription: String? { if case .failure(let text) = self { return text }; return "Fehler" }
}
typealias Object = [String: Any]
func json(_ value: Any) throws -> Data { try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]) }
func object(_ data: Data) throws -> Object {
    guard let value = try JSONSerialization.jsonObject(with: data) as? Object else { throw PaperError.failure("INVALID_JSON") }
    return value
}
func string(_ value: Any) throws -> String {
    guard let text = String(data: try json(value), encoding: .utf8) else { throw PaperError.failure("INVALID_UTF8") }; return text
}
func iso(_ date: Date = Date()) -> String {
    let fmt = ISO8601DateFormatter(); fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return fmt.string(from: date)
}
func date(_ value: Any?) -> Date? {
    guard let s = value as? String else { return nil }
    let fmt = ISO8601DateFormatter(); fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return fmt.date(from: s) ?? ISO8601DateFormatter().date(from: s)
}
@MainActor final class PaperEngine {
    private let context: JSContext
    init(bundle: Bundle = .main) throws {
        guard let ctx = JSContext(), let url = bundle.url(forResource: "engine", withExtension: "js") else { throw PaperError.failure("ENGINE_MISSING") }
        context = ctx
        let uuid: @convention(block) () -> String = { UUID().uuidString.lowercased() }
        let parseURL: @convention(block) (String) -> String? = { s in
            guard let c = URLComponents(string: s), c.scheme?.lowercased() == "https", let host = c.host, !host.isEmpty, c.user == nil, c.password == nil else { return nil }
            return "{\"protocol\":\"https:\",\"username\":\"\",\"password\":\"\"}"
        }
        ctx.setObject(uuid, forKeyedSubscript: "nativeUUID" as NSString)
        ctx.setObject(parseURL, forKeyedSubscript: "nativeURL" as NSString)
        ctx.evaluateScript(try String(contentsOf: url, encoding: .utf8))
        guard ctx.exception == nil, let fn = ctx.objectForKeyedSubscript("r33Call"), !fn.isUndefined else { throw PaperError.failure("ENGINE_INIT") }
    }
    func call(_ op: String, account: Object? = nil, input: Object? = nil, now: Date = Date()) throws -> Object {
        context.exception = nil
        let args = [op, try account.map { try string($0) } ?? "", try input.map { try string($0) } ?? "", iso(now)]
        guard let raw = context.objectForKeyedSubscript("r33Call").call(withArguments: args)?.toString(), context.exception == nil else { throw PaperError.failure("ENGINE_CALL") }
        let result = try object(Data(raw.utf8))
        if let e = result["error"] as? String { throw PaperError.failure(e) }
        return result
    }
}
@MainActor final class AccountStore {
    let url: URL
    init(url: URL? = nil) throws {
        if let url { self.url = url }
        else {
            var dir = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("R33Paper", isDirectory: true)
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            var flags = URLResourceValues(); flags.isExcludedFromBackup = true; try dir.setResourceValues(flags)
            self.url = dir.appendingPathComponent("account.json")
        }
    }
    func load() throws -> Object? {
        do { return try object(Data(contentsOf: url)) }
        catch let error as NSError where error.domain == NSCocoaErrorDomain && error.code == NSFileReadNoSuchFileError { return nil }
    }
    func save(_ account: Object) throws {
        try json(account).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
}
