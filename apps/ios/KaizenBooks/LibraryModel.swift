import Foundation
import Observation
import CryptoKit

enum ReadingStatus: String, Codable, CaseIterable, Identifiable {
    case want, reading, finished, paused
    var id: String { rawValue }
    var label: String {
        switch self {
        case .want: "Want to read"
        case .reading: "Reading"
        case .finished: "Finished"
        case .paused: "Paused"
        }
    }
}

struct Book: Identifiable, Codable, Equatable {
    var id = UUID().uuidString
    var title: String
    var author: String
    var pages: Int
    var currentPage = 0
    var status: ReadingStatus = .want
    var shelf = ""
    var isbn = ""
    var rating = 0
    var notes = ""
    var cover = 0
    var finishedAt: Date?
    var coverURL: String?
    var hue: Int?
    var shelfID: String?
    var progress: Double { Double(currentPage) / Double(max(1, pages)) }
}

struct ReadingSession: Identifiable, Codable {
    var id = UUID().uuidString
    var bookID: String
    var date = Date()
    var pages: Int
}

struct LibrarySnapshot: Codable {
    var version = 1
    var books: [Book] = []
    var sessions: [ReadingSession] = []
    var yearlyGoal = 12
    var goalEnabled = false
    var isDemo = false
    var cloud: CloudState?
    var shelfAppearances: [ShelfAppearance]?

    static func demo(now: Date = Date()) -> Self {
        let books = [
            Book(title: "The Creative Act", author: "Rick Rubin", pages: 432, currentPage: 146, status: .reading, shelf: "Inspiration", cover: 0),
            Book(title: "A Psalm for the Wild-Built", author: "Becky Chambers", pages: 160, currentPage: 38, status: .reading, shelf: "Fiction", cover: 1),
            Book(title: "The Art of Noticing", author: "Rob Walker", pages: 256, shelf: "Inspiration", cover: 2),
            Book(title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer", pages: 408, shelf: "Nature", cover: 3),
            Book(title: "Four Thousand Weeks", author: "Oliver Burkeman", pages: 288, currentPage: 288, status: .finished, shelf: "Inspiration", rating: 5, cover: 4, finishedAt: now),
            Book(title: "Piranesi", author: "Susanna Clarke", pages: 272, currentPage: 272, status: .finished, shelf: "Fiction", rating: 4, cover: 5, finishedAt: now)
        ]
        return Self(books: books, sessions: [ReadingSession(bookID: books[0].id, date: now, pages: 24), ReadingSession(bookID: books[1].id, date: now.addingTimeInterval(-86400), pages: 18)], goalEnabled: true, isDemo: true)
    }

    /// Upgrade name-only local books deterministically; persist IDs on the next mutation.
    mutating func migrateShelves() {
        var shelves = shelfAppearances ?? []
        for i in books.indices {
            if let id = books[i].shelfID {
                books[i].shelf = shelves.first { $0.id == id }?.name ?? ""
            } else if !books[i].shelf.isEmpty {
                let name = books[i].shelf
                let id: String
                if let existing = shelves.first(where: { $0.name == name }) { id = existing.id }
                else { id = "local-shelf-" + SHA256.hash(data: Data(name.utf8)).prefix(16).map { String(format: "%02x", $0) }.joined(); shelves.append(ShelfAppearance(id: id, name: name, order: shelves.count)) }
                books[i].shelfID = id
            }
        }
        shelfAppearances = shelves
    }

    func validated() throws -> Self {
        guard Set((shelfAppearances ?? []).map(\.id)).count == (shelfAppearances ?? []).count,
              version == 1, (1...500).contains(yearlyGoal), Set(books.map(\.id)).count == books.count,
              books.allSatisfy({ !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && (1...100_000).contains($0.pages) && (0...$0.pages).contains($0.currentPage) && (0...5).contains($0.rating) && (0...5).contains($0.cover) }),
              sessions.allSatisfy({ $0.pages > 0 }),
              Set(sessions.map(\.id)).count == sessions.count else {
            throw LibraryError.invalidData
        }
        let ids = Set(books.map(\.id))
        guard sessions.allSatisfy({ ids.contains($0.bookID) }) else { throw LibraryError.invalidData }
        return self
    }
}

enum LibraryError: LocalizedError {
    case invalidData, invalidProgress, staleEdit, staleShelf
    var errorDescription: String? {
        switch self {
        case .staleShelf: "This shelf changed or was removed while you were editing. Reopen it to use the latest version; your draft has not replaced it."
        case .invalidData: "The library contains invalid book details. Check the title and page count."
        case .invalidProgress: "Enter a page after your current page, up to the last page of the book."
        case .staleEdit: "This book changed or was deleted while you were editing. Your draft has not replaced it. Copy any notes you want to keep, then reopen the editor with the latest book."
        }
    }
}

@MainActor @Observable final class LibraryStore {
    private(set) var library: LibrarySnapshot
    var errorMessage: String?
    private(set) var readOnly = false
    private let fileURL: URL
    private var transport: (any LibraryTransport)?
    private var generation = 0
    private(set) var isSyncing = false
    private(set) var syncError: String?
    var owner: String? { library.cloud?.owner }
    var pendingCount: Int { library.cloud?.outbox.count ?? 0 }
    var conflicts: [CloudConflict] { library.cloud?.conflicts ?? [] }
    var syncLabel: String {
        if owner == nil { return "Saved on this device" }
        if readOnly { return "Account unavailable" }
        if !conflicts.isEmpty { return "Changes need review" }
        if isSyncing { return "Synchronizing…" }
        if syncError != nil { return "Saved on device · sync paused" }
        if pendingCount > 0 { return "\(pendingCount) changes waiting to sync" }
        return library.cloud?.lastSyncedAt == nil ? "Waiting for first sync" : "Saved to your account"
    }

    init(fileURL: URL, demo: Bool = true) {
        self.fileURL = fileURL
        library = LibrarySnapshot()
        do {
            if FileManager.default.fileExists(atPath: fileURL.path) {
                library = try JSONDecoder().decode(LibrarySnapshot.self, from: Data(contentsOf: fileURL)).validated()
                if let cloud = library.cloud { try LibraryCloudMapping.project(cloud, onto: &library) }
                else { library.migrateShelves() }
            } else {
                library = demo ? .demo() : LibrarySnapshot()
                library.migrateShelves()
                try write(library)
            }
        } catch {
            readOnly = true
            errorMessage = "Your library could not be opened. The original file has been preserved. Restart after checking device storage. \(error.localizedDescription)"
        }
    }

    static func live() -> LibraryStore {
        let base = URL.applicationSupportDirectory.appending(path: "KaizenBooks", directoryHint: .isDirectory)
        // UI tests have a separate data file and never reset the user's library.
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            let file = base.appending(path: "ui-test-library.json")
            if !ProcessInfo.processInfo.arguments.contains("--keep-test-data") { try? FileManager.default.removeItem(at: file) }
            return LibraryStore(fileURL: file)
        }
        return LibraryStore(fileURL: base.appending(path: "library.json"))
    }

    static func account(owner: String, base: URL = URL.applicationSupportDirectory.appending(path: "KaizenBooks")) -> LibraryStore {
        let key = SHA256.hash(data: Data(owner.utf8)).map { String(format: "%02x", $0) }.joined()
        let store = LibraryStore(fileURL: base.appending(path: "accounts/\(key).json"), demo: false)
        if let existing = store.owner, existing != owner {
            store.readOnly = true; store.errorMessage = "The account cache does not match this session."
        } else if store.library.cloud == nil && !store.readOnly {
            _ = store.persist { $0.cloud = CloudState(owner: owner) }
        }
        return store
    }
    func connect(_ transport: any LibraryTransport) { self.transport = transport }
    func disconnect() {
        generation += 1; transport = nil; isSyncing = false
        // A dismissed account view must not continue writing through a retained store reference.
        if owner != nil { readOnly = true }
    }

    private func write(_ snapshot: LibrarySnapshot) throws {
        try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(snapshot.validated()).write(to: fileURL, options: [.atomic, .completeFileProtection])
    }

    @discardableResult private func persist(_ update: (inout LibrarySnapshot) throws -> Void) -> Bool {
        guard !readOnly else { return false }
        do {
            var next = library
            try update(&next)
            try write(next)
            library = next
            return true
        } catch {
            errorMessage = "Changes were not saved. \(error.localizedDescription)"
            return false
        }
    }
    @discardableResult private func commit(_ update: (inout LibrarySnapshot) throws -> Void) -> Bool {
        let saved = persist { next in
            let before = next
            try update(&next)
            if var cloud = next.cloud {
                LibraryCloudMapping.stage(before: before, after: next, cloud: &cloud)
                next.cloud = cloud
            }
        }
        if saved && owner != nil { Task { await self.syncNow() } }
        return saved
    }

    @discardableResult private func updateCloud(_ update: (inout CloudState) throws -> Void) -> Bool {
        persist { next in
            guard var cloud = next.cloud else { throw CloudError.signedOut }
            try update(&cloud)
            try LibraryCloudMapping.project(cloud, onto: &next)
            next.cloud = cloud
        }
    }
    func syncNow() async {
        guard let transport, let initial = library.cloud, !readOnly, !isSyncing else { return }
        if let retry = initial.retryAt, retry > Date() { return }
        let epoch = generation
        isSyncing = true
        defer { if epoch == generation { isSyncing = false } }
        func current() -> Bool { epoch == generation && !Task.isCancelled && !readOnly }
        func pull() async throws {
            while current() {
                let changes = try await transport.pull(after: library.cloud?.cursor ?? 0)
                guard current() else { throw CancellationError() }
                let cursor = library.cloud?.cursor ?? 0
                guard changes.isEmpty || (changes.map(\.seq).max() ?? 0) > cursor else { throw CloudError.invalidResponse }
                guard updateCloud({ try $0.apply(changes) }) else { throw LibraryError.invalidData }
                if changes.count < 1000 { return }
            }
        }
        do {
            try await pull()
            for _ in 0..<20 {
                guard current(), let cloud = library.cloud else { return }
                var seen = Set(cloud.conflicts.map(\.key))
                let batch = Array(cloud.outbox.filter { seen.insert($0.key).inserted }.prefix(100))
                if batch.isEmpty { break }
                let outcomes = try await transport.push(device: cloud.deviceId, mutations: batch)
                guard current() else { return }
                guard outcomes.count == batch.count, Set(outcomes.map(\.mutation_id)) == Set(batch.map(\.id)) else { throw CloudError.invalidResponse }
                guard updateCloud({ state in
                    for sent in batch { try state.accept(outcomes.first { $0.mutation_id == sent.id }!, sent: sent) }
                }) else { throw LibraryError.invalidData }
            }
            try await pull()
            guard current() else { return }
            if updateCloud({ $0.lastSyncedAt = Date(); $0.retryAt = nil }) { syncError = nil }
        } catch is CancellationError { return }
        catch {
            guard current() else { return }
            syncError = error.localizedDescription
            if case CloudError.throttled(let deadline) = error {
                _ = persist { $0.cloud?.retryAt = deadline }
            }
        }
    }
    func resolveConflict(_ key: String, keepLocal: Bool) {
        if updateCloud({ try $0.resolve(key: key, keepLocal: keepLocal) }) { Task { await self.syncNow() } }
    }
    var annotations: [CloudRecord] {
        (library.cloud?.visible.values.filter { $0.entityType == "reading_annotations" && $0.payload != nil } ?? []).sorted { $0.entityId < $1.entityId }
    }
    @discardableResult func importLocal(_ source: LibrarySnapshot) -> Bool {
        guard let state = library.cloud, !state.importedLocal, state.lastSyncedAt != nil, !source.isDemo else {
            errorMessage = "Sync first. Sample collections cannot be imported; start a personal local library before importing."
            return false
        }
        // Import is additive, once per account, and never edits the source file.
        return commit { next in
            let existing = Set(next.books.map { "\($0.title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())|\($0.author.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())" })
            var imported: [String: String] = [:]
            var importedShelves: [String: String] = [:]
            var seen = existing
            for var book in source.books {
                let identity = "\(book.title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())|\(book.author.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())"
                guard seen.insert(identity).inserted else { continue }
                let original = book.id; book.id = UUID().uuidString; imported[original] = book.id
                if !book.shelf.isEmpty || book.shelfID != nil {
                    let sourceKey = book.shelfID ?? book.shelf
                    if let id = importedShelves[sourceKey] { book.shelfID = id }
                    else {
                        var shelf = source.shelfAppearances?.first { $0.id == book.shelfID } ?? ShelfAppearance(id: sourceKey, name: book.shelf)
                        shelf.id = UUID().uuidString; shelf.order = (next.shelfAppearances?.map(\.order).max() ?? -1) + 1
                        next.shelfAppearances = (next.shelfAppearances ?? []) + [shelf]
                        importedShelves[sourceKey] = shelf.id; book.shelfID = shelf.id
                    }
                }
                next.books.append(book)
            }
            for var session in source.sessions {
                guard let book = imported[session.bookID] else { continue }
                session.id = UUID().uuidString; session.bookID = book; next.sessions.append(session)
            }
            next.cloud?.importedLocal = true
        }
    }

    var reading: [Book] { library.books.filter { $0.status == .reading } }
    var shelves: [ShelfAppearance] { (library.shelfAppearances ?? []).sorted { $0.order == $1.order ? $0.id < $1.id : $0.order < $1.order } }
    func shelfLabel(_ shelf: ShelfAppearance) -> String {
        let matches = shelves.filter { $0.name == shelf.name }
        return matches.count > 1 ? "\(shelf.name) · \((matches.firstIndex { $0.id == shelf.id } ?? 0) + 1)" : shelf.name
    }
    @discardableResult func saveShelf(_ shelf: ShelfAppearance, replacing expected: ShelfAppearance? = nil) -> Bool {
        commit { snapshot in
            var clean = shelf; clean.name = shelf.name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !clean.name.isEmpty, clean.name.count <= 120 else { throw LibraryError.invalidData }
            if let expected, snapshot.shelfAppearances?.first(where: { $0.id == expected.id }) != expected { throw LibraryError.staleShelf }
            if let i = snapshot.shelfAppearances?.firstIndex(where: { $0.id == clean.id }) { snapshot.shelfAppearances?[i] = clean }
            else {
                guard expected == nil else { throw LibraryError.staleShelf }
                clean.order = (snapshot.shelfAppearances?.map(\.order).max() ?? -1) + 1
                snapshot.shelfAppearances = (snapshot.shelfAppearances ?? []) + [clean]
            }
            for i in snapshot.books.indices where snapshot.books[i].shelfID == clean.id { snapshot.books[i].shelf = clean.name }
        }
    }
    @discardableResult func removeShelf(_ expected: ShelfAppearance) -> Bool {
        commit { snapshot in
            guard snapshot.shelfAppearances?.first(where: { $0.id == expected.id }) == expected else { throw LibraryError.staleShelf }
            for i in snapshot.books.indices where snapshot.books[i].shelfID == expected.id {
                snapshot.books[i].shelfID = nil; snapshot.books[i].shelf = ""
            }
            snapshot.shelfAppearances?.removeAll { $0.id == expected.id }
        }
    }
    @discardableResult func moveShelves(from offsets: IndexSet, to destination: Int) -> Bool {
        let current = shelves
        guard destination >= 0, destination <= current.count, offsets.allSatisfy({ current.indices.contains($0) }) else { return false }
        let moving = offsets.sorted().map { current[$0] }
        var reordered = current.enumerated().filter { !offsets.contains($0.offset) }.map(\.element)
        reordered.insert(contentsOf: moving, at: destination - offsets.filter { $0 < destination }.count)
        return commit { snapshot in
            guard (snapshot.shelfAppearances ?? []).sorted(by: { $0.order == $1.order ? $0.id < $1.id : $0.order < $1.order }) == current else { throw LibraryError.staleShelf }
            for i in reordered.indices { reordered[i].order = i }
            snapshot.shelfAppearances = reordered
        }
    }
    var finishedThisYear: Int {
        library.books.filter { $0.status == .finished && $0.finishedAt.map { Calendar.current.isDate($0, equalTo: Date(), toGranularity: .year) } == true }.count
    }
    var weeklyPages: Int {
        let start = Calendar.current.date(byAdding: .day, value: -6, to: Calendar.current.startOfDay(for: Date()))!
        return library.sessions.filter { $0.date >= start && $0.date <= Date() }.reduce(0) { $0 + $1.pages }
    }
    func book(_ id: String) -> Book? { library.books.first { $0.id == id } }
    @discardableResult func save(_ book: Book, replacing expected: Book? = nil) -> Bool {
        commit { snapshot in
            if let expected, snapshot.books.first(where: { $0.id == expected.id }) != expected { throw LibraryError.staleEdit }
            var clean = book
            clean.title = book.title.trimmingCharacters(in: .whitespacesAndNewlines)
            clean.author = book.author.trimmingCharacters(in: .whitespacesAndNewlines)
            clean.shelf = book.shelf.trimmingCharacters(in: .whitespacesAndNewlines)
            if let id = clean.shelfID {
                guard let shelf = snapshot.shelfAppearances?.first(where: { $0.id == id }) else { throw LibraryError.staleShelf }
                clean.shelf = shelf.name
            } else if !clean.shelf.isEmpty {
                if let shelf = snapshot.shelfAppearances?.first(where: { $0.name == clean.shelf }) { clean.shelfID = shelf.id }
                else {
                    let shelf = ShelfAppearance(id: UUID().uuidString, name: clean.shelf, order: (snapshot.shelfAppearances?.map(\.order).max() ?? -1) + 1)
                    clean.shelfID = shelf.id; snapshot.shelfAppearances = (snapshot.shelfAppearances ?? []) + [shelf]
                }
            }
            if let old = snapshot.books.first(where: { $0.id == book.id }),
               old.title != clean.title || old.author != clean.author || old.isbn != clean.isbn {
                clean.coverURL = nil
            }
            if let index = snapshot.books.firstIndex(where: { $0.id == book.id }) { snapshot.books[index] = clean }
            else { snapshot.books.append(clean) }
        }
    }
    @discardableResult func log(_ id: String, page: Int) -> Bool {
        commit { snapshot in
            guard let i = snapshot.books.firstIndex(where: { $0.id == id }) else { throw LibraryError.invalidData }
            let old = snapshot.books[i]
            guard page > old.currentPage && page <= old.pages else { throw LibraryError.invalidProgress }
            snapshot.sessions.append(ReadingSession(bookID: id, pages: page - old.currentPage))
            snapshot.books[i].currentPage = page
            snapshot.books[i].status = page == old.pages ? .finished : .reading
            snapshot.books[i].finishedAt = page == old.pages ? Date() : nil
        }
    }
    func setStatus(_ id: String, to status: ReadingStatus) {
        guard var book = book(id) else { return }
        if status == .finished { book.currentPage = book.pages; book.finishedAt = book.finishedAt ?? Date() }
        else {
            if book.status == .finished { book.currentPage = 0 }
            book.finishedAt = nil
        }
        if status == .want { book.currentPage = 0 }
        book.status = status
        save(book)
    }
    @discardableResult func delete(_ id: String) -> Bool {
        commit { $0.books.removeAll { $0.id == id }; $0.sessions.removeAll { $0.bookID == id } }
    }
    @discardableResult func setGoal(enabled: Bool, books: Int) -> Bool {
        commit { $0.goalEnabled = enabled; $0.yearlyGoal = books }
    }
    @discardableResult func clearDemo() -> Bool {
        guard library.isDemo else { return false }
        return commit { $0 = LibrarySnapshot() }
    }
}
