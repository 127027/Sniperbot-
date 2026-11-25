import XCTest
@testable import R33Paper

final class EngineTests:XCTestCase {
    @MainActor func testLocalAccountsFreshEntryHoldAndExit() async throws {
        let e=try PaperEngine()
        let d=ISO8601DateFormatter()
        func t(_ h:Int)->Date { d.date(from:String(format:"2026-11-25T%02d:00:00Z",h))! }
        func account(_ start:Int,_ amount:Int)throws->Object{
            let a=try XCTUnwrap(e.call("create",now:t(start))["account"] as? Object)
            let b=try XCTUnwrap(e.call("fund",account:a,input:["id":"deposit","kind":"PAPER_DEPOSIT","amount_cents":amount],now:t(start))["account"] as? Object)
            return try XCTUnwrap(e.call("controls",account:b,input:["expected_revision":1,"max_invest_cents":amount,"stake_cents":5000,"allow_new_buys":true],now:t(start))["account"] as? Object)
        }
        func signal(_ seq:Int,_ hour:Int,_ action:String,_ previous:Any)->Object{
            let s:Object=["schema":"r31.broadcast.v1","mode":"PAPER_ONLY","sequence":seq,"target_utc":iso(t(hour)),"published_at_utc":iso(t(hour)),"expires_at_utc":iso(t(hour).addingTimeInterval(900)),"previous_blob_sha":previous,"decisions":[["coin":"FIXTURE","chain":"Solana","contract":"fixture","action":action,"price_eur":1,"observed_at_utc":iso(t(hour)),"source_url":"https://example.com/fixture","reason":"synthetic test"]]]
            return ["signal":s,"blob_sha":String(repeating:String(seq),count:40)]
        }
        func apply(_ a:Object,_ s:Object,_ h:Int)throws->Object{try XCTUnwrap(e.call("signal",account:a,input:s,now:t(h).addingTimeInterval(60))["account"] as? Object)}
        func cash(_ a:Object)->Double{(a["ledger"] as? Object)?["cash_eur"] as? Double ?? -1}
        func positions(_ a:Object)->Int{((a["ledger"] as? Object)?["positions"] as? [Object])?.count ?? -1}
        let a=try account(7,50000),b=try account(8,10000)
        let s=signal(1,8,"BUY",NSNull()),a1=try apply(a,s,8),b1=try apply(b,s,8)
        XCTAssertEqual(positions(a1),1);XCTAssertEqual(cash(a1),450);XCTAssertEqual(positions(b1),0)
        let s2=signal(2,9,"BUY",String(repeating:"1",count:40)),a2=try apply(a1,s2,9),b2=try apply(b1,s2,9)
        XCTAssertEqual(cash(a2),450);XCTAssertEqual(cash(b2),50)
        XCTAssertEqual(try e.call("signal",account:b2,input:s2,now:t(9).addingTimeInterval(120))["status"] as? String,"ALREADY_PROCESSED")
        let s3=signal(3,10,"SELL",String(repeating:"2",count:40))
        XCTAssertEqual(positions(try apply(a2,s3,10)),0);XCTAssertEqual(positions(try apply(b2,s3,10)),0)
        XCTAssertNotEqual(a["account_id"] as? String,b["account_id"] as? String)
        let url=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString+".json")
        defer{try? FileManager.default.removeItem(at:url)}
        let store=try AccountStore(url:url);try store.save(b2)
        XCTAssertEqual(try store.load()?["account_id"] as? String,b2["account_id"] as? String)
        XCTAssertEqual(positions(try XCTUnwrap(store.load())),1)
        try Data("broken".utf8).write(to:url)
        XCTAssertThrowsError(try store.load())
    }
    func testGitHash(){XCTAssertEqual(gitHash(Data("hello\n".utf8)),"ce013625030ba8dba906f756967f9e9ca394464a")}
}
