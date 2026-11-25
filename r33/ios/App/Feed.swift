import Foundation
import CryptoKit

final class NoRedirect: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
struct ReadFile { let data: Object; let sha: String }
func gitHash(_ data: Data) -> String {
    var raw = Data("blob \(data.count)\0".utf8); raw.append(data)
    return Insecure.SHA1.hash(data: raw).map { String(format: "%02x", $0) }.joined()
}
final class PublicFeed {
    static let r31 = "codex/r31-control-center-paper/r31/broadcast/"
    static let r30 = "codex/r30-hourly-research-20261124/"
    private let session: URLSession
    init() {
        let c = URLSessionConfiguration.ephemeral
        c.httpCookieStorage = nil; c.httpShouldSetCookies = false; c.urlCredentialStorage = nil
        c.urlCache = nil; c.requestCachePolicy = .reloadIgnoringLocalCacheData; c.timeoutIntervalForRequest = 10; c.timeoutIntervalForResource = 12
        session = URLSession(configuration: c, delegate: NoRedirect(), delegateQueue: nil)
    }
    deinit { session.invalidateAndCancel() }
    func read(_ branch: String, _ path: String) async throws -> ReadFile {
        guard [Self.r31, Self.r30].contains(branch), path.range(of: #"^[A-Za-z0-9/_\-.]+\.json$"#, options: .regularExpression) != nil, !path.contains(".."), !path.hasPrefix("/") else { throw PaperError.failure("INVALID_PATH") }
        let url = URL(string: "https://raw.githubusercontent.com/127027/Sniperbot-/refs/heads/" + branch + path)!
        var req = URLRequest(url: url); req.httpMethod = "GET"; req.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        let (bytes, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw PaperError.failure("GITHUB_HTTP_\((response as? HTTPURLResponse)?.statusCode ?? 0)") }
        guard bytes.count <= 3 * 1024 * 1024 else { throw PaperError.failure("FILE_TOO_LARGE") }
        return ReadFile(data: try object(bytes), sha: gitHash(bytes))
    }
    func latest() async throws -> Object? {
        let p = try await read(Self.r31,"latest.json").data
        guard p["schema"] as? String == "r31.broadcast.pointer.v1" else { throw PaperError.failure("INVALID_POINTER") }
        if p["status"] as? String == "NOT_PUBLISHING" { return nil }
        guard p["status"] as? String == "PUBLISHED", let n = p["sequence"] as? Int, n > 0, n <= 9_007_199_254_740_991,
            let hash = p["blob_sha"] as? String, hash.range(of: "^[a-f0-9]{40}$", options: .regularExpression) != nil else { throw PaperError.failure("INVALID_POINTER") }
        let rel = "signals/" + String(format: "%010lld", Int64(n)) + ".json"
        guard p["path"] as? String == "r31/broadcast/" + rel else { throw PaperError.failure("INVALID_POINTER_PATH") }
        let f = try await read(Self.r31,rel)
        guard f.sha == hash, f.data["sequence"] as? Int == n else { throw PaperError.failure("SIGNAL_POINTER_MISMATCH") }
        return ["signal": f.data, "blob_sha": hash]
    }
    func reference() async throws -> Object {
        let p = try await read(Self.r30,"latest-final.json").data
        guard p["kind"] as? String == "R30_LATEST_FINAL_POINTER_V1", let path = p["final_path"] as? String,
            path.range(of: #"^reports/\d{4}-\d{2}-\d{2}/\d{2}/final(?:-[\w-]+)?\.json$"#, options: .regularExpression) != nil else { throw PaperError.failure("INVALID_REFERENCE") }
        let f = try await read(Self.r30,path)
        guard f.sha == p["final_blob_sha"] as? String, date(f.data["target_utc"]) == date(p["target_utc"]),
              (f.data["paper_ledger"] as? Object)?["mode"] as? String == "INDICATIVE_PUBLIC_PRICE_MODEL_ONLY" else { throw PaperError.failure("REFERENCE_HASH_OR_SCHEMA") }
        return f.data
    }
    func role(_ n: Int, target: Date) async throws -> Object {
        let s = iso(target),path = "reports/" + String(s.prefix(10)) + "/" + String(s.dropFirst(11).prefix(2)) + "/dot-\(n).json"
        let f = try await read(Self.r30,path)
        guard date(f.data["target_utc"]) == target, let done = date(f.data["completed_at_utc"]), done <= Date().addingTimeInterval(60) else { throw PaperError.failure("ROLE_REPORT_SCHEMA") }
        return f.data
    }
}
