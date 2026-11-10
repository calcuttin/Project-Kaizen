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

final class BasicTests: XCTestCase {
    func testDemoArithmeticStringsAndVariables() throws {
        XCTAssertEqual(Basic.run(Basic.demo).output, (1...5).map { "ONE SMALL STEP \($0)" } + ["WELCOME TO KAIZEN"])
        XCTAssertEqual(try Basic.expression("2 + 3 * 4 ^ 2"), .number(50))
        XCTAssertEqual(try Basic.expression("2 ^ 3 ^ 2"), .number(512))
        XCTAssertEqual(try Basic.expression("\"A\"\"B\" + A$", vars: ["A$": .string("C")]), .string("A\"BC"))
        let result = Basic.run([10: "LET A$ = \"Hi\"", 20: "PRINT A$; (2 + 1), 4"])
        XCTAssertEqual(result.output, ["Hi3    4"])
    }
    func testLoopsConditionsAndLineEditing() {
        XCTAssertEqual(Basic.run([10: "FOR I = 2 TO 1 STEP -1", 20: "FOR J = 1 TO 2", 30: "PRINT I; J", 40: "NEXT J", 50: "NEXT I"]).output, ["21", "22", "11", "12"])
        XCTAssertEqual(Basic.run([10: "FOR I = 2 TO 1", 20: "FOR J = 1 TO 2", 30: "PRINT 0", 40: "NEXT J", 50: "NEXT I", 60: "PRINT 7"]).output, ["7"])
        var c = BasicConsole(); c.execute("NEW", books: []); c.execute("20 PRINT 2", books: []); c.execute("10 IF 1 < 2 THEN 30", books: []); c.execute("30 PRINT 3", books: []); c.execute("20", books: []); c.execute("RUN", books: [])
        XCTAssertEqual(c.program.count, 2); XCTAssertEqual(c.output.last, "3")
        c.execute("LIST", books: []); XCTAssertEqual(c.output.last, "30 PRINT 3")
        XCTAssertEqual(c.recall(-1), "LIST"); XCTAssertEqual(c.recall(1), "")
    }
    func testMalformedInputAndRunawayProgramsAreBounded() throws {
        for (code, error) in [("PRINT 1/0", "DIVISION BY ZERO"), ("LET N = \"x\"", "TYPE MISMATCH"), ("GOTO 50", "UNDEFINED LINE"), ("NEXT I", "NEXT WITHOUT FOR"), ("PRINT 2^^3", "SYNTAX ERROR"), ("PRINT 10^999", "OVERFLOW")] {
            XCTAssertEqual(Basic.run([10: code]).output.last, "?\(error) IN 10")
        }
        XCTAssertTrue(Basic.run([10: "GOTO 10"]).output.last!.contains("EXECUTION LIMIT"))
        let growth = Basic.run([10: "A$ = \"x\"", 20: "A$ = A$ + A$", 30: "GOTO 20"])
        XCTAssertTrue(growth.output.last!.contains("EXECUTION LIMIT"))
        XCTAssertThrowsError(try Basic.expression(String(repeating: "(", count: 130) + "1" + String(repeating: ")", count: 130)))
        XCTAssertTrue(Basic.run([10: "PRINT 1", 20: "GOTO 10"]).output.count <= 301)
        XCTAssertTrue(Basic.run([10: "FOR I = 1 TO 2"]).output.last!.contains("FOR WITHOUT NEXT"))
    }
    func testCatalogAndConsoleLimitsDoNotModifyBooks() {
        let books = LibrarySnapshot.demo().books
        var c = BasicConsole(); c.execute("BOOKS", books: books)
        XCTAssertTrue(c.output.contains("6 BOOKS")); XCTAssertTrue(c.output.contains("The Creative Act — Rick Rubin"))
        c.execute("DELETE BOOKS", books: books); XCTAssertTrue(c.output.last!.contains("SYNTAX ERROR"))
        XCTAssertEqual(books.count, 6)
        for _ in 0..<410 { c.execute("PRINT 1", books: books) }
        XCTAssertEqual(c.output.count, 400); XCTAssertEqual(c.history.count, 50)
        c.execute("HOME", books: books); XCTAssertTrue(c.output.isEmpty)
        c.execute(String(repeating: "A", count: 501), books: books); XCTAssertTrue(c.output.last!.contains("INPUT LIMIT"))
    }
}

@MainActor final class NativeImportTests: XCTestCase {
    private func file() -> URL {
        let dir = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        addTeardownBlock { try? FileManager.default.removeItem(at: dir) }
        return dir.appending(path: "library.json")
    }
    private let clipping = "A Book (A Reader)\n- Your Highlight on page 12 | Location 140-150 | Added on Sunday, November 1, 2026 12:00:00 PM\n\nA thought.\n==========\n"
    func testCSVGoodreadsQuotesStatusAndBounds() throws {
        let csv = "\u{FEFF}Title,Author,ISBN13,Number of Pages,Exclusive Shelf,My Rating\r\n\"A, \"\"quoted\"\" book\",A Reader,=\"9780140328721\",96,currently-reading,4\r\nPaused,Reader,,bad,paused,0\r\nDone,Reader,,20,read,5\r\n"
        let result = try LibraryImports.parse(csv, kind: .csv)
        XCTAssertEqual(result.books[0].title, "A, \"quoted\" book")
        XCTAssertEqual(result.books[0].isbn, "9780140328721"); XCTAssertEqual(result.books[0].status, .reading)
        XCTAssertEqual(result.books[1].status, .paused); XCTAssertEqual(result.books[1].pages, 300)
        XCTAssertEqual(result.books[2].status, .finished); XCTAssertEqual(result.books[2].currentPage, 20); XCTAssertNil(result.books[2].finishedAt)
        XCTAssertEqual(result.warnings.count, 1)
        for bad in ["Title\n\"Unclosed", "Unknown\nBook", "Title\n" + String(repeating: "x", count: 16385), "Title\n" + String(repeating: "Book\n", count: 1001), String(repeating: "x", count: LibraryImports.maxBytes + 1)] {
            XCTAssertThrowsError(try LibraryImports.parse(bad, kind: .csv))
        }
    }
    func testCSVPreviewCommitDuplicatesAndUndoKeepsExistingBooks() throws {
        let store = LibraryStore(fileURL: file(), demo: false)
        XCTAssertTrue(store.save(Book(title: "Existing", author: "Reader", pages: 100)))
        let preview = try LibraryImports.parse("Title,Author,Pages,Shelf\nExisting,Reader,150,Study\nNew,Reader,60,Study\nNew,Reader,60,Study", kind: .csv)
        XCTAssertEqual(store.library.books.count, 1, "Parsing must not write")
        XCTAssertTrue(store.importPreview(preview, choices: [:]))
        XCTAssertEqual(store.library.books.count, 2); XCTAssertEqual(store.lastImport?.skipped, 2)
        XCTAssertEqual(store.library.books.first { $0.title == "Existing" }?.pages, 100)
        XCTAssertEqual(store.shelves.count, 1)
        XCTAssertTrue(store.undoImport()); XCTAssertEqual(store.library.books.count, 1); XCTAssertTrue(store.shelves.isEmpty)
        XCTAssertEqual(store.library.books[0].title, "Existing")
    }
    func testKindleContextMatchingDuplicatesAndUndo() throws {
        let store = LibraryStore(fileURL: file(), demo: false)
        let book = Book(title: "Different edition", author: "Reader", pages: 500)
        XCTAssertTrue(store.save(book))
        let preview = try LibraryImports.parse(clipping + clipping, kind: .kindle)
        XCTAssertEqual(preview.books.count, 1); XCTAssertEqual(preview.annotations.count, 2)
        let annotation = try XCTUnwrap(preview.annotations.first)
        // Independent JavaScript evaluation of the website's UTF-16 FNV fingerprint.
        XCTAssertEqual(annotation.payload?["sourceRef"], .string("kindle-f6b15c47"))
        XCTAssertEqual(annotation.payload?["page"], .number(12)); XCTAssertEqual(annotation.payload?["location"], .string("140-150")); XCTAssertNotNil(annotation.payload?["annotatedAt"])
        XCTAssertTrue(store.importPreview(preview, choices: [preview.books[0].id: "link:" + book.id]))
        XCTAssertEqual(store.annotations.count, 1); XCTAssertEqual(store.annotations[0].payload?["bookId"], .string(book.id))
        XCTAssertEqual(store.lastImport?.skipped, 1)
        XCTAssertTrue(store.undoImport()); XCTAssertTrue(store.annotations.isEmpty); XCTAssertEqual(store.library.books, [book])
    }
    func testImportUndoRefusesLaterEditsOrReadingActivity() throws {
        let store = LibraryStore(fileURL: file(), demo: false)
        let preview = try LibraryImports.parse("Title,Author,Pages\nNew,Reader,100", kind: .csv)
        XCTAssertTrue(store.importPreview(preview, choices: [:]))
        let book = try XCTUnwrap(store.library.books.first)
        XCTAssertTrue(store.log(book.id, page: 10)); XCTAssertFalse(store.undoImport())
        XCTAssertEqual(store.book(book.id)?.currentPage, 10); XCTAssertEqual(store.library.sessions.count, 1)
    }
    func testLocalDeleteUndoRestoresNotesHistoryAndAnnotations() throws {
        let url = file(), store = LibraryStore(fileURL: file(), demo: false)
        let preview = try LibraryImports.parse(clipping, kind: .kindle)
        XCTAssertTrue(store.importPreview(preview, choices: [:]))
        var book = try XCTUnwrap(store.library.books.first); book.notes = "Keep me"; XCTAssertTrue(store.save(book))
        XCTAssertTrue(store.log(book.id, page: 4)); XCTAssertTrue(store.delete(book.id))
        XCTAssertTrue(store.annotations.isEmpty); XCTAssertTrue(store.undoDelete())
        XCTAssertEqual(store.book(book.id)?.notes, "Keep me"); XCTAssertEqual(store.book(book.id)?.currentPage, 4)
        XCTAssertEqual(store.annotations.count, 1); XCTAssertEqual(store.library.sessions.count, 1)
        XCTAssertFalse(store.undoDelete())
        let isolated = LibraryStore(fileURL: url, demo: false); XCTAssertNil(isolated.deletedBook)
    }
    func testFileLoaderRejectsOversizeAndInvalidEncoding() async throws {
        let url = file(); try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(repeating: 65, count: LibraryImports.maxBytes + 1).write(to: url)
        do { _ = try await LibraryImportLoader().load(url, kind: .csv); XCTFail("Oversize accepted") } catch { }
        try Data([0xff, 0xfe, 0xff]).write(to: url)
        do { _ = try await LibraryImportLoader().load(url, kind: .csv); XCTFail("Invalid encoding accepted") } catch { }
    }
}
