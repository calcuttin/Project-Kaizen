import XCTest
@testable import KaizenBooks

private final class CoverProtocol: URLProtocol, @unchecked Sendable {
    static let lock = NSLock()
    static var requests: [URLRequest] = []
    static var responses: [(Int, String, Data)] = []
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.lock.lock()
        Self.requests.append(request)
        let response = Self.responses.isEmpty ? (500, "text/plain", Data()) : Self.responses.removeFirst()
        Self.lock.unlock()
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: response.0, httpVersion: nil, headerFields: ["Content-Type": response.1])!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: response.2)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

@MainActor private final class FakeTransport: LibraryTransport {
    var changes: [CloudChange] = []
    var sent: [[CloudMutation]] = []
    var pullCount = 0
    var pullError: Error?
    var pushError: Error?
    var onPush: (() -> Void)?
    func pull(after: Int) async throws -> [CloudChange] {
        pullCount += 1
        if let pullError { throw pullError }
        return Array(changes.filter { $0.seq > after }.prefix(1000))
    }
    func push(device: String, mutations: [CloudMutation]) async throws -> [PushOutcome] {
        sent.append(mutations)
        onPush?(); onPush = nil
        if let pushError { throw pushError }
        return mutations.map { mutation in
            let revision = mutation.baseRevision + 1
            changes.append(CloudChange(seq: (changes.last?.seq ?? 0) + 1, entity_type: mutation.entityType, entity_id: mutation.entityId, operation: mutation.operation, payload: mutation.payload, revision: revision))
            return PushOutcome(mutation_id: mutation.id, status: "accepted", revision: revision)
        }
    }
}

@MainActor final class CloudSyncTests: XCTestCase {
    private func coverLoader(_ responses: [(Int, String, Data)]) -> CoverLoader {
        CoverProtocol.requests = []; CoverProtocol.responses = responses
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [CoverProtocol.self]
        return CoverLoader(session: URLSession(configuration: config))
    }
    func testCoverOptInAndStoredArtworkWithoutAuthenticationHeaders() async {
        let bytes = Data([1, 2, 3])
        let loader = coverLoader([(200, "image/jpeg", bytes)])
        let off = CoverRequest(title: "Test", author: "Reader", isbn: "", storedURL: "https://covers.openlibrary.org/b/id/123-M.jpg", enabled: false, attempt: 0, owner: "test")
        let disabled = await loader.image(for: off)
        XCTAssertNil(disabled); XCTAssertTrue(CoverProtocol.requests.isEmpty)
        let on = CoverRequest(title: off.title, author: off.author, isbn: off.isbn, storedURL: off.storedURL, enabled: true, attempt: 0, owner: off.owner)
        let image = await loader.image(for: on)
        XCTAssertEqual(image, bytes)
        XCTAssertEqual(CoverProtocol.requests.count, 1)
        XCTAssertEqual(CoverProtocol.requests[0].url?.absoluteString, on.storedURL)
        XCTAssertNil(CoverProtocol.requests[0].value(forHTTPHeaderField: "Authorization"))
        XCTAssertNil(CoverProtocol.requests[0].value(forHTTPHeaderField: "Cookie"))
    }
    func testMissingIsbnCoverSearchesExactTitleAndReusesArtwork() async {
        let result = Data(#"{"docs":[{"title":"Wrong title","cover_i":1},{"title":"The Test Book","author_name":["A Reader"],"cover_i":42}]}"#.utf8)
        let bytes = Data([4, 5, 6])
        let loader = coverLoader([(404, "text/plain", Data()), (200, "application/json", result), (200, "image/jpeg", bytes)])
        let request = CoverRequest(title: "The Test Book", author: "A Reader", isbn: "978-0-123456-78-9", storedURL: nil, enabled: true, attempt: 0, owner: "test")
        let first = await loader.image(for: request), cached = await loader.image(for: request)
        XCTAssertEqual(first, bytes); XCTAssertEqual(cached, bytes)
        XCTAssertEqual(CoverProtocol.requests.count, 3)
        XCTAssertTrue(CoverProtocol.requests[0].url!.path.contains("/isbn/9780123456789"))
        XCTAssertEqual(CoverProtocol.requests[1].url?.host, "openlibrary.org")
        XCTAssertEqual(CoverProtocol.requests[2].url?.path, "/b/id/42-M.jpg")
    }
    func testCoverRateLimitDoesNotFanOutAndUnsafeURLsAreRejected() async {
        let loader = coverLoader([(429, "text/plain", Data())])
        let request = CoverRequest(title: "Test", author: "Reader", isbn: "", storedURL: "https://covers.openlibrary.org/b/id/1-M.jpg", enabled: true, attempt: 0, owner: "test")
        let result = await loader.image(for: request)
        XCTAssertNil(result); XCTAssertEqual(CoverProtocol.requests.count, 1)
        for value in ["http://covers.openlibrary.org/b/id/1.jpg", "file:///tmp/cover.jpg", "https://covers.openlibrary.org.attacker.example/image", "https://secret@covers.openlibrary.org/image", "https://localhost/image"] {
            XCTAssertNil(CoverRequest.imageURL(value))
        }
    }
    private func base() -> URL {
        let url = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        addTeardownBlock { try? FileManager.default.removeItem(at: url) }
        return url
    }
    private func book(_ id: String = "web_nanoid-123", page: Int = 10) -> Payload {
        ["id": .string(id), "title": .string("Shared book"), "author": .string("Reader"),
         "pages": .number(200), "currentPage": .number(Double(page)), "status": .string("reading"),
         "hue": .number(240), "shelfId": .string("web-shelf"), "tags": .array([.string("keep")]),
         "coverUrl": .string("https://example.com/cover.jpg"), "futureField": .object(["keep": .bool(true)])]
    }
    private func change(_ type: String, _ id: String, _ payload: Payload?, seq: Int = 1, revision: Int = 1) -> CloudChange {
        CloudChange(seq: seq, entity_type: type, entity_id: id, operation: payload == nil ? "delete" : "put", payload: payload, revision: revision)
    }
    func testWebPayloadAndShelfMetadataSurviveNativeEdit() throws {
        var cloud = CloudState(owner: "user_test")
        let shelf: Payload = ["name": .string("Study"), "cabinet": .object(["style": .string("walnut")])]
        try cloud.apply([change("shelves", "web-shelf", shelf), change("books", "web_nanoid-123", book(), seq: 2)])
        var before = LibrarySnapshot(); try LibraryCloudMapping.project(cloud, onto: &before)
        XCTAssertEqual(before.books[0].id, "web_nanoid-123")
        XCTAssertEqual(before.books[0].cover, 4)
        XCTAssertEqual(before.books[0].coverURL, "https://example.com/cover.jpg")
        XCTAssertEqual(before.books[0].hue, 240)
        XCTAssertEqual(before.books[0].shelf, "Study")
        var after = before; after.books[0].notes = "A phone note"
        LibraryCloudMapping.stage(before: before, after: after, cloud: &cloud)
        let payload = try XCTUnwrap(cloud.outbox.first?.payload)
        XCTAssertEqual(payload["futureField"], book()["futureField"])
        XCTAssertEqual(payload["coverUrl"], book()["coverUrl"])
        XCTAssertEqual(payload["tags"], book()["tags"])
        XCTAssertEqual(payload["shelfId"], .string("web-shelf"))
        XCTAssertEqual(cloud.visible["shelves:web-shelf"]?.payload, shelf)
        XCTAssertEqual(cloud.outbox.count, 1)
    }
    func testShelfAppearanceUsesWebThemeObjectsAndCabinetWithoutOverwritingThem() throws {
        var cloud = CloudState(owner: "user_styles")
        let shelf: Payload = ["name": .string("Living room · 2"), "theme": .string("history"),
            "objects": .array([.string("romanHelmet"), .string("bust")]), "order": .number(3),
            "cabinet": .object(["brightness": .number(65), "layout": .string("balanced")])]
        try cloud.apply([change("shelves", "web-shelf", shelf), change("books", "web_nanoid-123", book(), seq: 2)])
        var before = LibrarySnapshot(); try LibraryCloudMapping.project(cloud, onto: &before)
        let style = try XCTUnwrap(before.shelfAppearances?.first)
        XCTAssertEqual(style.spec.label, "History & classics")
        XCTAssertEqual(style.displayObjects, ["romanHelmet", "bust"])
        XCTAssertEqual(style.brightness, 0.65)
        var after = before; after.books[0].currentPage = 40
        LibraryCloudMapping.stage(before: before, after: after, cloud: &cloud)
        XCTAssertEqual(cloud.visible["shelves:web-shelf"]?.payload, shelf)
        XCTAssertEqual(cloud.outbox.count, 1)
        XCTAssertEqual(ShelfThemeSpec.inferred("Living room · 2").label, "Espionage & war")
        XCTAssertEqual(ShelfThemeSpec.inferred("Living room · 6").label, "Networking & security")
    }
    func testOutboxAndAccountIsolationSurviveRelaunch() throws {
        let directory = base()
        let account = LibraryStore.account(owner: "user_one", base: directory)
        XCTAssertTrue(account.save(Book(title: "Offline", author: "", pages: 50)))
        let mutation = try XCTUnwrap(account.library.cloud?.outbox.first)
        let restored = LibraryStore.account(owner: "user_one", base: directory)
        XCTAssertEqual(restored.library.books.first?.title, "Offline")
        XCTAssertEqual(restored.library.cloud?.outbox.first, mutation)
        let other = LibraryStore.account(owner: "user_two", base: directory)
        XCTAssertTrue(other.library.books.isEmpty)
        XCTAssertEqual(other.pendingCount, 0)
        account.disconnect()
        XCTAssertFalse(account.save(Book(title: "Stale view", author: "", pages: 1)))
    }
    func testFailedRequestRetriesSameMutationID() async throws {
        let store = LibraryStore.account(owner: "user_retry", base: base())
        store.save(Book(title: "Retry", author: "", pages: 100))
        let transport = FakeTransport(); transport.pushError = CloudError.http(503)
        store.connect(transport); await store.syncNow()
        XCTAssertEqual(store.pendingCount, 1)
        XCTAssertNotNil(store.syncError)
        let first = try XCTUnwrap(transport.sent.first?.first)
        transport.pushError = nil; await store.syncNow()
        XCTAssertEqual(transport.sent.last?.first?.id, first.id)
        XCTAssertEqual(store.pendingCount, 0)
        XCTAssertEqual(store.library.books.first?.title, "Retry")
    }
    func testEditDuringRequestIsNotLostOrAcknowledgedEarly() async throws {
        let store = LibraryStore.account(owner: "user_edit", base: base())
        let original = Book(title: "Before", author: "", pages: 100)
        store.save(original)
        let transport = FakeTransport()
        transport.onPush = {
            var edited = original; edited.notes = "Edited while awaiting server"
            XCTAssertTrue(store.save(edited))
        }
        store.connect(transport); await store.syncNow()
        XCTAssertEqual(transport.sent.count, 2)
        XCTAssertEqual(transport.sent[0][0].payload?["notes"], .string(""))
        XCTAssertEqual(transport.sent[1][0].payload?["notes"], .string("Edited while awaiting server"))
        XCTAssertEqual(transport.sent[1][0].baseRevision, 1)
        XCTAssertNotEqual(transport.sent[0][0].id, transport.sent[1][0].id)
        XCTAssertEqual(store.book(original.id)?.notes, "Edited while awaiting server")
        XCTAssertEqual(store.pendingCount, 0)
    }
    func testOldRetryAcknowledgementDoesNotReplaceNewerWebRevision() throws {
        var cloud = CloudState(owner: "user_retry")
        cloud.enqueue(type: "books", id: "web_nanoid-123", payload: book(page: 20))
        let sent = cloud.outbox[0]
        try cloud.apply([change("books", sent.entityId, book(page: 50), revision: 3)])
        try cloud.accept(PushOutcome(mutation_id: sent.id, status: "accepted", revision: 1), sent: sent)
        XCTAssertEqual(cloud.records[sent.key]?.revision, 3)
        XCTAssertEqual(cloud.visible[sent.key]?.payload?["currentPage"], .number(50))
        XCTAssertTrue(cloud.outbox.isEmpty)
    }
    func testConflictRequiresExplicitChoiceAndHonorsRemoteDeletion() throws {
        var cloud = CloudState(owner: "user_conflict")
        try cloud.apply([change("books", "web_nanoid-123", book())])
        cloud.enqueue(type: "books", id: "web_nanoid-123", payload: book(page: 40))
        let sent = cloud.outbox[0]
        try cloud.accept(PushOutcome(mutation_id: sent.id, status: "conflict", remote_revision: 2), sent: sent)
        XCTAssertThrowsError(try cloud.resolve(key: sent.key, keepLocal: false))
        try cloud.apply([change("books", sent.entityId, nil, seq: 2, revision: 2)])
        XCTAssertEqual(cloud.visible[sent.key]?.payload?["currentPage"], .number(40))
        var localChoice = cloud
        try localChoice.resolve(key: sent.key, keepLocal: true)
        XCTAssertEqual(localChoice.outbox[0].baseRevision, 2)
        XCTAssertNotEqual(localChoice.outbox[0].id, sent.id)
        try cloud.resolve(key: sent.key, keepLocal: false)
        XCTAssertNil(cloud.visible[sent.key]?.payload)
        XCTAssertTrue(cloud.outbox.isEmpty)
    }
    func testLateResponseCannotPopulateDisconnectedAccount() async {
        let store = LibraryStore.account(owner: "user_old", base: base())
        store.save(Book(title: "Private", author: "", pages: 100))
        let transport = FakeTransport(); transport.onPush = { store.disconnect() }
        store.connect(transport); await store.syncNow()
        XCTAssertEqual(store.pendingCount, 1)
        XCTAssertNil(store.library.cloud?.lastSyncedAt)
        XCTAssertTrue(store.readOnly)
    }
    func testRateLimitPersistsCooldownAndQueue() async throws {
        let directory = base()
        let store = LibraryStore.account(owner: "user_limit", base: directory)
        store.save(Book(title: "Wait", author: "", pages: 100))
        let transport = FakeTransport(); transport.pullError = CloudError.throttled(Date().addingTimeInterval(300))
        store.connect(transport); await store.syncNow()
        let restored = LibraryStore.account(owner: "user_limit", base: directory)
        restored.connect(transport); await restored.syncNow()
        XCTAssertEqual(transport.pullCount, 1)
        XCTAssertEqual(restored.pendingCount, 1)
        XCTAssertNotNil(restored.library.cloud?.retryAt)
    }
    func testMalformedRemoteRecordDoesNotAdvanceCursorOrReplaceCache() async {
        let store = LibraryStore.account(owner: "user_bad", base: base())
        store.save(Book(title: "Preserved", author: "", pages: 100))
        let transport = FakeTransport()
        transport.changes = [change("books", "broken", ["title": .string("Missing required fields")])]
        store.connect(transport); await store.syncNow()
        XCTAssertEqual(store.library.cloud?.cursor, 0)
        XCTAssertEqual(store.library.books.first?.title, "Preserved")
        XCTAssertEqual(store.pendingCount, 1)
        XCTAssertNotNil(store.syncError)
    }
    func testImportIsAdditiveDeduplicatedAndRemapsSessionIdentity() async throws {
        let directory = base()
        let localURL = directory.appending(path: "local.json")
        let local = LibraryStore(fileURL: localURL, demo: false)
        let original = Book(title: "Personal", author: "Reader", pages: 100)
        local.save(original); local.log(original.id, page: 20)
        local.save(Book(title: " shared BOOK ", author: "READER", pages: 200))
        let bytes = try Data(contentsOf: localURL)
        let store = LibraryStore.account(owner: "user_import", base: directory)
        let transport = FakeTransport(); transport.changes = [change("books", "web_nanoid-123", book())]
        store.connect(transport); await store.syncNow()
        XCTAssertFalse(store.importLocal(.demo()))
        XCTAssertTrue(store.importLocal(local.library))
        XCTAssertEqual(store.library.books.count, 2)
        let imported = try XCTUnwrap(store.library.books.first { $0.title == "Personal" })
        XCTAssertNotEqual(imported.id, original.id)
        XCTAssertEqual(store.library.sessions.first?.bookID, imported.id)
        XCTAssertNotEqual(store.library.sessions.first?.id, local.library.sessions.first?.id)
        XCTAssertFalse(store.importLocal(local.library))
        XCTAssertEqual(try Data(contentsOf: localURL), bytes)
    }
    func testDeletingBookQueuesRelatedAnnotationsAndSessions() throws {
        var cloud = CloudState(owner: "user_delete")
        try cloud.apply([change("books", "web_nanoid-123", book()),
                         change("reading_sessions", "session", ["bookId": .string("web_nanoid-123"), "date": .string("2026-11-08"), "pages": .number(10)], seq: 2),
                         change("reading_annotations", "note", ["bookId": .string("web_nanoid-123"), "content": .string("Saved note")], seq: 3)])
        var before = LibrarySnapshot(); try LibraryCloudMapping.project(cloud, onto: &before)
        var after = before; after.books = []; after.sessions = []
        LibraryCloudMapping.stage(before: before, after: after, cloud: &cloud)
        XCTAssertEqual(Set(cloud.outbox.map(\.entityType)), Set(["books", "reading_sessions", "reading_annotations"]))
        XCTAssertTrue(cloud.outbox.allSatisfy { $0.operation == "delete" })
    }
    func testCurrentGoalPreservesDailyTargetAndPastGoals() throws {
        let year = Calendar.current.component(.year, from: Date())
        var cloud = CloudState(owner: "user_goal")
        let current: Payload = ["year": .number(Double(year)), "books": .number(24), "enabled": .bool(true), "pagesPerDay": .number(20)]
        let past: Payload = ["year": .number(Double(year - 1)), "books": .number(30)]
        try cloud.apply([change("reading_goals", String(year), current), change("reading_goals", String(year - 1), past, seq: 2)])
        var before = LibrarySnapshot(); try LibraryCloudMapping.project(cloud, onto: &before)
        XCTAssertEqual(before.yearlyGoal, 24)
        var after = before; after.yearlyGoal = 40
        LibraryCloudMapping.stage(before: before, after: after, cloud: &cloud)
        XCTAssertEqual(cloud.outbox.count, 1)
        XCTAssertEqual(cloud.outbox[0].payload?["pagesPerDay"], .number(20))
        XCTAssertEqual(cloud.visible["reading_goals:\(year - 1)"]?.payload, past)
    }
    func testLegacyUUIDJSONLoadsWithoutCloudOrDataLoss() throws {
        let file = base().appending(path: "library.json")
        let original = LibrarySnapshot.demo()
        let data = try JSONEncoder().encode(original)
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        json.removeValue(forKey: "cloud")
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        let legacy = try JSONSerialization.data(withJSONObject: json)
        try legacy.write(to: file)
        let loaded = LibraryStore(fileURL: file)
        XCTAssertFalse(loaded.readOnly)
        XCTAssertEqual(loaded.library.books, original.books)
        XCTAssertNil(loaded.owner)
        XCTAssertEqual(try Data(contentsOf: file), legacy)
    }
    func testStaleEditorCannotOverwriteNewProgressOrResurrectDeletedBook() {
        let store = LibraryStore.account(owner: "user_editor", base: base())
        let original = Book(title: "Original", author: "", pages: 100)
        store.save(original)
        var draft = original; draft.notes = "Unsaved draft"
        store.log(original.id, page: 30)
        let pending = store.pendingCount
        XCTAssertFalse(store.save(draft, replacing: original))
        XCTAssertEqual(store.book(original.id)?.currentPage, 30)
        XCTAssertEqual(store.book(original.id)?.notes, "")
        XCTAssertEqual(store.pendingCount, pending)
        store.delete(original.id)
        XCTAssertFalse(store.save(draft, replacing: original))
        XCTAssertNil(store.book(original.id))
    }
}

private actor DelayedISBNLookup: ISBNLookingUp {
    let started: XCTestExpectation
    private var continuation: CheckedContinuation<ISBNBook, Error>?
    init(started: XCTestExpectation) { self.started = started }
    func book(isbn: String) async throws -> ISBNBook {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            started.fulfill()
        }
    }
    func finish() {
        continuation?.resume(returning: ISBNBook(isbn: "9780140328721", title: "Late result", author: "", pages: 100, coverURL: nil))
        continuation = nil
    }
}

@MainActor final class ISBNLookupTests: XCTestCase {
    private func service(_ status: Int, _ json: String, mime: String = "application/json") -> ISBNLookupService {
        CoverProtocol.requests = []; CoverProtocol.responses = [(status, mime, Data(json.utf8))]
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [CoverProtocol.self]
        return ISBNLookupService(session: URLSession(configuration: config))
    }
    func testISBNChecksumsAndCanonicalDuplicateIdentity() {
        XCTAssertEqual(ISBN.normalized("0-14-032872-6"), "9780140328721")
        XCTAssertEqual(ISBN.normalized(" 978 0 14 032872 1 "), "9780140328721")
        XCTAssertEqual(ISBN.normalized("080442957x"), "9780804429573")
        XCTAssertEqual(ISBN.normalized("9791090636071"), "9791090636071")
        for invalid in ["", "9780140328722", "0140328727", "12345", "4006381333931", "978014032872X", "X804429575", "ISBN:9780140328721", "９７８０１４０３２８７２１", "9780140328721?token=x"] {
            XCTAssertNil(ISBN.normalized(invalid), invalid)
        }
    }
    func testLookupUsesOnlyCanonicalISBNAndPublicTransport() async throws {
        let loader = service(200, #"{"ISBN:9780140328721":{"title":"Matilda","authors":[{"name":"Roald Dahl"}],"number_of_pages":240,"cover":{"medium":"https://covers.openlibrary.org/b/id/123-M.jpg"}}}"#)
        let book = try await loader.book(isbn: "0140328726")
        XCTAssertEqual(book.title, "Matilda"); XCTAssertEqual(book.author, "Roald Dahl"); XCTAssertEqual(book.pages, 240)
        XCTAssertEqual(book.coverURL, "https://covers.openlibrary.org/b/id/123-M.jpg")
        XCTAssertEqual(CoverProtocol.requests.count, 1)
        let request = try XCTUnwrap(CoverProtocol.requests.first)
        let url = try XCTUnwrap(URLComponents(url: request.url!, resolvingAgainstBaseURL: false))
        XCTAssertEqual(url.host, "openlibrary.org"); XCTAssertEqual(url.scheme, "https")
        XCTAssertEqual(Set(url.queryItems!.map(\.name)), ["bibkeys", "format", "jscmd"])
        XCTAssertEqual(url.queryItems?.first { $0.name == "bibkeys" }?.value, "ISBN:9780140328721")
        XCTAssertNil(request.value(forHTTPHeaderField: "Authorization")); XCTAssertNil(request.value(forHTTPHeaderField: "Cookie")); XCTAssertNil(request.httpBody)
    }
    func testIncompleteMetadataAndUntrustedArtworkStayEditable() throws {
        let book = try ISBNLookupService.decode(Data(#"{"ISBN:9780140328721":{"title":"Matilda","number_of_pages":0,"cover":{"medium":"https://example.com/track"}}}"#.utf8), isbn: "9780140328721")
        XCTAssertNil(book.pages); XCTAssertEqual(book.author, ""); XCTAssertNil(book.coverURL)
        XCTAssertThrowsError(try ISBNLookupService.decode(Data("{}".utf8), isbn: "9780140328721"))
        XCTAssertThrowsError(try ISBNLookupService.decode(Data(#"{"ISBN:9780140328721":{"title":"  "}}"#.utf8), isbn: "9780140328721"))
        XCTAssertThrowsError(try ISBNLookupService.decode(Data("not json".utf8), isbn: "9780140328721"))
    }
    func testInvalidISBNDoesNotRequestNetwork() async {
        let loader = service(200, "{}")
        do { _ = try await loader.book(isbn: "9780140328722"); XCTFail("Invalid check digit accepted") } catch {}
        XCTAssertTrue(CoverProtocol.requests.isEmpty)
    }
    func testRateLimitStopsImmediateRetries() async {
        let loader = service(429, "{}")
        for _ in 0..<2 {
            do { _ = try await loader.book(isbn: "9780140328721"); XCTFail("Rate limit ignored") }
            catch { XCTAssertEqual(error.localizedDescription, ISBNLookupError.rateLimited.localizedDescription) }
        }
        XCTAssertEqual(CoverProtocol.requests.count, 1)
    }
    func testFailureResponsesKeepManualFallback() async {
        for (status, mime, json) in [(404, "application/json", "{}"), (503, "text/plain", "Unavailable"), (200, "text/html", "<html>error</html>"), (200, "application/json", String(repeating: " ", count: 500_001))] {
            let loader = service(status, json, mime: mime)
            do { _ = try await loader.book(isbn: "9780140328721"); XCTFail("Bad response accepted") } catch {}
        }
    }
    func testCancelOrISBNChangeDiscardsLateLookupResponse() async {
        let started = expectation(description: "Lookup started")
        let delayed = DelayedISBNLookup(started: started)
        let model = BookLookupModel(service: delayed)
        model.lookup("9780140328721")
        await fulfillment(of: [started], timeout: 2)
        model.cancel()
        // The server completes even though the editor changed ISBN or was dismissed.
        await delayed.finish()
        for _ in 0..<20 { await Task.yield() }
        XCTAssertNil(model.result); XCTAssertNil(model.message); XCTAssertFalse(model.busy)
        model.lookup("invalid")
        XCTAssertEqual(model.message, ISBNLookupError.invalid.localizedDescription)
    }
}
