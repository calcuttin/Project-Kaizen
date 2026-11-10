import XCTest
@testable import KaizenBooks

@MainActor final class LibraryStoreTests: XCTestCase {
    private func temporaryFile() -> URL {
        FileManager.default.temporaryDirectory.appending(path: UUID().uuidString).appending(path: "library.json")
    }
    func testOldCacheWithoutArtworkFieldsStillLoadsAndIdentityEditsInvalidateArtwork() throws {
        let original = Book(title: "Original title", author: "Reader", pages: 100, coverURL: "https://covers.openlibrary.org/b/id/123-M.jpg")
        let file = temporaryFile()
        defer { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        let store = LibraryStore(fileURL: file, demo: false)
        XCTAssertTrue(store.save(original))
        var edited = original; edited.notes = "Keep cover"
        XCTAssertTrue(store.save(edited))
        XCTAssertEqual(store.book(original.id)?.coverURL, original.coverURL)
        edited.title = "Different book"
        XCTAssertTrue(store.save(edited))
        XCTAssertNil(store.book(original.id)?.coverURL)
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(original)) as? [String: Any])
        json.removeValue(forKey: "coverURL"); json.removeValue(forKey: "hue")
        let legacy = try JSONDecoder().decode(Book.self, from: JSONSerialization.data(withJSONObject: json))
        XCTAssertNil(legacy.coverURL)
        XCTAssertEqual(legacy.title, original.title)
    }
    func testProgressPersistsWithoutDoubleCountingAndFinishes() throws {
        let file = temporaryFile()
        defer { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        let store = LibraryStore(fileURL: file, demo: false)
        let book = Book(title: "A test book", author: "A reader", pages: 100)
        XCTAssertTrue(store.save(book))
        XCTAssertTrue(store.log(book.id, page: 40))
        XCTAssertFalse(store.log(book.id, page: 40))
        XCTAssertFalse(store.log(book.id, page: 39))
        XCTAssertFalse(store.log(book.id, page: 101))
        XCTAssertTrue(store.log(book.id, page: 100))
        let loaded = LibraryStore(fileURL: file)
        XCTAssertEqual(loaded.book(book.id)?.currentPage, 100)
        XCTAssertEqual(loaded.book(book.id)?.status, .finished)
        XCTAssertEqual(loaded.library.sessions.reduce(0) { $0 + $1.pages }, 100)
        XCTAssertEqual(loaded.finishedThisYear, 1)
        XCTAssertEqual(loaded.library.sessions.count, 2)
    }
    func testInvalidBookIsNotSavedAndDeletionRemovesSessions() {
        let file = temporaryFile()
        defer { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        let store = LibraryStore(fileURL: file, demo: false)
        XCTAssertFalse(store.save(Book(title: " ", author: "", pages: 12)))
        XCTAssertFalse(store.save(Book(title: "Invalid", author: "", pages: 0)))
        XCTAssertTrue(store.library.books.isEmpty)
        let book = Book(title: "Valid", author: "", pages: 20)
        XCTAssertTrue(store.save(book))
        XCTAssertTrue(store.log(book.id, page: 10))
        XCTAssertTrue(store.delete(book.id))
        XCTAssertTrue(store.library.sessions.isEmpty)
        XCTAssertTrue(LibraryStore(fileURL: file).library.books.isEmpty)
    }
    func testUnreadableFileIsPreserved() throws {
        let file = temporaryFile()
        defer { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        let original = Data("not a library".utf8)
        try original.write(to: file)
        let store = LibraryStore(fileURL: file)
        XCTAssertTrue(store.readOnly)
        XCTAssertNotNil(store.errorMessage)
        XCTAssertFalse(store.save(Book(title: "Must not overwrite", author: "", pages: 1)))
        XCTAssertEqual(try Data(contentsOf: file), original)
    }
    func testFailedWriteDoesNotChangeInMemoryState() throws {
        let file = temporaryFile()
        defer { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        let store = LibraryStore(fileURL: file, demo: false)
        try FileManager.default.removeItem(at: file)
        try FileManager.default.createDirectory(at: file, withIntermediateDirectories: false)
        XCTAssertFalse(store.save(Book(title: "Unsaved", author: "", pages: 10)))
        XCTAssertTrue(store.library.books.isEmpty)
        XCTAssertNotNil(store.errorMessage)
    }
    func testNotesRatingGoalAndFreshStartPersist() {
        let file = temporaryFile()
        defer { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        let store = LibraryStore(fileURL: file)
        var book = store.library.books[0]
        book.notes = "An idea worth keeping."
        book.rating = 4
        XCTAssertTrue(store.save(book))
        XCTAssertTrue(store.setGoal(enabled: true, books: 30))
        let loaded = LibraryStore(fileURL: file)
        XCTAssertEqual(loaded.book(book.id)?.notes, book.notes)
        XCTAssertEqual(loaded.book(book.id)?.rating, 4)
        XCTAssertEqual(loaded.library.yearlyGoal, 30)
        XCTAssertTrue(loaded.clearDemo())
        let fresh = LibraryStore(fileURL: file)
        XCTAssertFalse(fresh.library.isDemo)
        XCTAssertTrue(fresh.library.books.isEmpty)
        XCTAssertFalse(fresh.library.goalEnabled)
    }
    func testFinishedStatusDoesNotFabricateReadingSessions() {
        let file = temporaryFile()
        defer { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
        let store = LibraryStore(fileURL: file, demo: false)
        let book = Book(title: "Completed elsewhere", author: "", pages: 90)
        store.save(book)
        store.setStatus(book.id, to: .finished)
        XCTAssertEqual(store.finishedThisYear, 1)
        XCTAssertEqual(store.book(book.id)?.currentPage, 90)
        XCTAssertTrue(store.library.sessions.isEmpty)
        store.setStatus(book.id, to: .reading)
        XCTAssertNil(store.book(book.id)?.finishedAt)
        XCTAssertEqual(store.book(book.id)?.currentPage, 0)
        XCTAssertEqual(store.finishedThisYear, 0)
    }
}
