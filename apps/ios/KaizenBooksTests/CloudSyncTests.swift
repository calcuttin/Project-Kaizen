import XCTest
@testable import KaizenBooks

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
