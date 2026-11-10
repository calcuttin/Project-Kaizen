import Foundation

// Preserve unknown web fields instead of round-tripping through a smaller native model.
enum JSONValue: Codable, Equatable {
    case string(String), number(Double), bool(Bool), object([String: JSONValue]), array([JSONValue]), null
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self), v.isFinite { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([String: JSONValue].self) { self = .object(v) }
        else { self = .array(try c.decode([JSONValue].self)) }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .null: try c.encodeNil()
        }
    }
    var string: String? { if case .string(let v) = self { return v }; return nil }
    var int: Int? {
        if case .number(let v) = self, v.isFinite, v >= Double(Int.min), v < Double(Int.max), v.rounded() == v { return Int(v) }
        return nil
    }
    var bool: Bool? { if case .bool(let v) = self { return v }; return nil }
    var array: [JSONValue]? { if case .array(let v) = self { return v }; return nil }
    var object: Payload? { if case .object(let v) = self { return v }; return nil }
}
typealias Payload = [String: JSONValue]

struct CloudRecord: Codable, Equatable {
    var entityType: String
    var entityId: String
    var payload: Payload?
    var revision: Int
    var key: String { "\(entityType):\(entityId)" }
}
struct CloudMutation: Codable, Equatable, Identifiable {
    var mutationId = UUID().uuidString
    var entityType: String
    var entityId: String
    var operation: String
    var baseRevision: Int
    var payload: Payload?
    var occurredAt = ISO8601DateFormatter().string(from: Date())
    var id: String { mutationId }
    var key: String { "\(entityType):\(entityId)" }
}
struct CloudConflict: Codable, Identifiable {
    var key: String
    var remoteRevision: Int
    var id: String { key }
}
struct CloudState: Codable {
    var owner: String
    var deviceId = UUID().uuidString
    var cursor = 0
    var records: [String: CloudRecord] = [:]
    var outbox: [CloudMutation] = []
    var conflicts: [CloudConflict] = []
    var importedLocal = false
    var lastSyncedAt: Date?
    var retryAt: Date?
    static let types: Set<String> = ["books", "shelves", "reading_sessions", "reading_annotations", "reading_goals"]

    var visible: [String: CloudRecord] {
        var result = records
        for m in outbox { result[m.key] = CloudRecord(entityType: m.entityType, entityId: m.entityId, payload: m.operation == "delete" ? nil : m.payload, revision: m.baseRevision) }
        return result
    }
    mutating func enqueue(type: String, id: String, payload: Payload?) {
        let key = "\(type):\(id)"
        guard visible[key]?.payload != payload else { return }
        outbox.append(CloudMutation(entityType: type, entityId: id, operation: payload == nil ? "delete" : "put", baseRevision: records[key]?.revision ?? 0, payload: payload))
    }
    mutating func accept(_ outcome: PushOutcome, sent: CloudMutation) throws {
        guard outcome.mutation_id == sent.id, outbox.contains(where: { $0.id == sent.id }) else { throw CloudError.invalidResponse }
        if outcome.status == "accepted" {
            guard let revision = outcome.revision, revision > sent.baseRevision else { throw CloudError.invalidResponse }
            // A retry may acknowledge an old accepted write after a newer web edit was pulled.
            if revision >= (records[sent.key]?.revision ?? 0) {
                records[sent.key] = CloudRecord(entityType: sent.entityType, entityId: sent.entityId, payload: sent.payload, revision: revision)
            }
            outbox.removeAll { $0.id == sent.id }
            // Later edits are immutable snapshots and have never been sent yet.
            for i in outbox.indices where outbox[i].key == sent.key { outbox[i].baseRevision = revision }
        } else if outcome.status == "conflict" {
            guard let revision = outcome.remote_revision else { throw CloudError.invalidResponse }
            // Pull supplies the authoritative delete/put state; conflict responses alone omit tombstones.
            if !conflicts.contains(where: { $0.key == sent.key }) { conflicts.append(CloudConflict(key: sent.key, remoteRevision: revision)) }
        } else { throw CloudError.rejected }
    }
    mutating func apply(_ changes: [CloudChange]) throws {
        for c in changes {
            guard c.seq > 0, c.revision > 0, ["put", "delete"].contains(c.operation) else { throw CloudError.invalidResponse }
            if Self.types.contains(c.entity_type) {
                guard !c.entity_id.isEmpty, c.operation == "delete" || c.payload != nil else { throw CloudError.invalidResponse }
                let record = CloudRecord(entityType: c.entity_type, entityId: c.entity_id, payload: c.operation == "delete" ? nil : c.payload, revision: c.revision)
                if c.revision >= (records[record.key]?.revision ?? 0) { records[record.key] = record }
            }
            cursor = max(cursor, c.seq)
        }
    }
    mutating func resolve(key: String, keepLocal: Bool) throws {
        guard let conflict = conflicts.first(where: { $0.key == key }),
              let remote = records[key], remote.revision >= conflict.remoteRevision,
              let local = outbox.last(where: { $0.key == key }) else { throw CloudError.needsPull }
        outbox.removeAll { $0.key == key }
        conflicts.removeAll { $0.key == key }
        if keepLocal {
            outbox.append(CloudMutation(entityType: local.entityType, entityId: local.entityId, operation: local.operation, baseRevision: remote.revision, payload: local.payload))
        }
    }
}

struct CloudChange: Codable {
    var seq: Int
    var entity_type: String
    var entity_id: String
    var operation: String
    var payload: Payload?
    var revision: Int
}
struct PushOutcome: Codable {
    var mutation_id: String
    var status: String
    var revision: Int?
    var remote_revision: Int?
}
enum CloudError: LocalizedError {
    case invalidResponse, rejected, signedOut, needsPull, throttled(Date), http(Int)
    var errorDescription: String? {
        switch self {
        case .invalidResponse: "The server returned an unsupported record. Your saved data and queued changes are preserved."
        case .rejected: "The server rejected an edit. Your changes remain on this device."
        case .signedOut: "Sign in again to synchronize. Your unsent changes are preserved for this account."
        case .needsPull: "Refresh from the server before resolving this change."
        case .throttled: "Saving is paused briefly by the server. Your changes will retry."
        case .http(let code): "Sync could not finish (HTTP \(code)). Your changes remain on this device."
        }
    }
}

@MainActor protocol LibraryTransport {
    func pull(after: Int) async throws -> [CloudChange]
    func push(device: String, mutations: [CloudMutation]) async throws -> [PushOutcome]
}

@MainActor final class SupabaseLibraryTransport: LibraryTransport {
    let endpoint: URL
    let publicKey: String
    let token: () async throws -> String
    init(endpoint: URL, publicKey: String, token: @escaping () async throws -> String) {
        self.endpoint = endpoint; self.publicKey = publicKey; self.token = token
    }
    private func rpc<T: Decodable, B: Encodable>(_ name: String, body: B) async throws -> T {
        guard endpoint.scheme == "https" else { throw CloudError.invalidResponse }
        var request = URLRequest(url: endpoint.appending(path: "rest/v1/rpc/\(name)"))
        request.httpMethod = "POST"; request.timeoutInterval = 30
        request.setValue("Bearer \(try await token())", forHTTPHeaderField: "Authorization")
        request.setValue(publicKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw CloudError.invalidResponse }
        if http.statusCode == 401 || http.statusCode == 403 { throw CloudError.signedOut }
        if http.statusCode == 429 {
            let raw = http.value(forHTTPHeaderField: "Retry-After") ?? ""
            let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = TimeZone(secondsFromGMT: 0); formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss z"
            let deadline = Double(raw).map { Date().addingTimeInterval(max(1, $0)) } ?? formatter.date(from: raw) ?? Date().addingTimeInterval(60)
            throw CloudError.throttled(max(deadline, Date().addingTimeInterval(1)))
        }
        guard (200...299).contains(http.statusCode) else { throw CloudError.http(http.statusCode) }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func pull(after: Int) async throws -> [CloudChange] {
        try await rpc("pull_changes", body: ["p_after_seq": after])
    }
    func push(device: String, mutations: [CloudMutation]) async throws -> [PushOutcome] {
        struct Body: Encodable { let p_device_id: String; let p_mutations: [CloudMutation] }
        return try await rpc("push_changes", body: Body(p_device_id: device, p_mutations: mutations))
    }
}

enum LibraryCloudMapping {
    static func day(_ date: Date) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
    static func date(_ value: String) -> Date? {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"; f.isLenient = false
        if let d = f.date(from: value), f.string(from: d) == value { return d }
        return ISO8601DateFormatter().date(from: value)
    }
    static func project(_ cloud: CloudState, onto snapshot: inout LibrarySnapshot) throws {
        let records = cloud.visible.values.filter { $0.payload != nil }
        let shelves = Dictionary(uniqueKeysWithValues: records.filter { $0.entityType == "shelves" }.map { ($0.entityId, $0.payload?["name"]?.string ?? "") })
        snapshot.shelfAppearances = records.filter { $0.entityType == "shelves" }.map { r in
            let p = r.payload!
            return ShelfAppearance(id: r.entityId, name: p["name"]?.string ?? "", theme: p["theme"]?.string,
                objects: p["objects"]?.array?.compactMap(\.string), order: p["order"]?.int ?? 0,
                cabinet: p["cabinet"])
        }.sorted { $0.order == $1.order ? $0.id < $1.id : $0.order < $1.order }
        snapshot.books = try records.filter { $0.entityType == "books" }.map { r in
            let p = r.payload!
            guard let title = p["title"]?.string, let author = p["author"]?.string,
                  let pages = p["pages"]?.int, let current = p["currentPage"]?.int,
                  let rawStatus = p["status"]?.string, let status = ReadingStatus(rawValue: rawStatus) else { throw CloudError.invalidResponse }
            return Book(id: r.entityId, title: title, author: author, pages: pages, currentPage: current, status: status,
                        shelf: shelves[p["shelfId"]?.string ?? ""] ?? "", isbn: p["isbn"]?.string ?? "",
                        rating: p["rating"]?.int ?? 0, notes: p["notes"]?.string ?? "",
                        cover: abs(((p["hue"]?.int ?? 0) / 60) % 6), finishedAt: p["finishedAt"]?.string.flatMap(date),
                        coverURL: p["coverUrl"]?.string, hue: p["hue"]?.int)
        }.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        let bookIDs = Set(snapshot.books.map(\.id))
        snapshot.sessions = try records.filter { $0.entityType == "reading_sessions" }.compactMap { r in
            let p = r.payload!
            guard let book = p["bookId"]?.string, let raw = p["date"]?.string, let when = date(raw), let pages = p["pages"]?.int, pages > 0 else { throw CloudError.invalidResponse }
            return bookIDs.contains(book) ? ReadingSession(id: r.entityId, bookID: book, date: when, pages: pages) : nil
        }
        let year = Calendar.current.component(.year, from: Date())
        let goal = records.first { $0.entityType == "reading_goals" && $0.payload?["year"]?.int == year }?.payload
        snapshot.yearlyGoal = goal?["books"]?.int ?? 12
        snapshot.goalEnabled = goal?["enabled"]?.bool ?? (goal != nil)
        snapshot.isDemo = false
        _ = try snapshot.validated()
    }
    static func stage(before: LibrarySnapshot, after: LibrarySnapshot, cloud: inout CloudState) {
        let stamp = ISO8601DateFormatter().string(from: Date())
        let old = Dictionary(uniqueKeysWithValues: before.books.map { ($0.id, $0) })
        for book in after.books where old[book.id] != book {
            let previous = old[book.id]
            var p = cloud.visible["books:\(book.id)"]?.payload ?? ["id": .string(book.id), "createdAt": .string(stamp), "tags": .array([]), "hue": .number(Double(book.cover * 60))]
            p["updatedAt"] = .string(stamp)
            if previous?.title != book.title { p["title"] = .string(book.title) }
            if previous?.author != book.author { p["author"] = .string(book.author) }
            if previous?.pages != book.pages { p["pages"] = .number(Double(book.pages)) }
            if previous?.currentPage != book.currentPage { p["currentPage"] = .number(Double(book.currentPage)) }
            if previous?.status != book.status {
                p["status"] = .string(book.status.rawValue)
                if book.status == .reading && (p["startedAt"] == nil || previous?.status == .finished) { p["startedAt"] = .string(day(Date())) }
                if book.status == .want { p.removeValue(forKey: "startedAt") }
            }
            if previous?.isbn != book.isbn { p["isbn"] = book.isbn.isEmpty ? nil : .string(book.isbn) }
            if previous?.notes != book.notes { p["notes"] = .string(book.notes) }
            if previous?.rating != book.rating { p["rating"] = book.rating == 0 ? nil : .number(Double(book.rating)) }
            if previous?.cover != book.cover && previous != nil { p["hue"] = .number(Double(book.cover * 60)) }
            if previous?.finishedAt != book.finishedAt { p["finishedAt"] = book.finishedAt.map { .string(day($0)) } }
            if previous?.title != book.title || previous?.author != book.author || previous?.isbn != book.isbn {
                p.removeValue(forKey: "coverUrl"); p["coverUnavailable"] = .bool(false)
            }
            if previous?.shelf != book.shelf {
                if book.shelf.isEmpty { p.removeValue(forKey: "shelfId") }
                else {
                    let matching = cloud.visible.values.filter { $0.entityType == "shelves" && $0.payload?["name"]?.string == book.shelf }.sorted { $0.entityId < $1.entityId }.first
                    let id = matching?.entityId ?? UUID().uuidString
                    if matching == nil {
                        cloud.enqueue(type: "shelves", id: id, payload: ["id": .string(id), "name": .string(book.shelf), "order": .number(Double(cloud.visible.values.filter { $0.entityType == "shelves" }.count)), "createdAt": .string(stamp), "updatedAt": .string(stamp)])
                    }
                    p["shelfId"] = .string(id)
                }
            }
            cloud.enqueue(type: "books", id: book.id, payload: p)
        }
        let remaining = Set(after.books.map(\.id))
        for book in before.books where !remaining.contains(book.id) {
            cloud.enqueue(type: "books", id: book.id, payload: nil)
            for r in cloud.visible.values where ["reading_sessions", "reading_annotations"].contains(r.entityType) && r.payload?["bookId"]?.string == book.id { cloud.enqueue(type: r.entityType, id: r.entityId, payload: nil) }
        }
        let oldSessions = Set(before.sessions.map(\.id))
        for s in after.sessions where !oldSessions.contains(s.id) {
            cloud.enqueue(type: "reading_sessions", id: s.id, payload: ["id": .string(s.id), "bookId": .string(s.bookID), "date": .string(day(s.date)), "pages": .number(Double(s.pages))])
        }
        if before.yearlyGoal != after.yearlyGoal || before.goalEnabled != after.goalEnabled {
            let year = Calendar.current.component(.year, from: Date())
            let id = String(year)
            var p = cloud.visible["reading_goals:\(id)"]?.payload ?? ["id": .string(id), "year": .number(Double(year)), "pagesPerDay": .number(0)]
            p["books"] = .number(Double(after.yearlyGoal)); p["enabled"] = .bool(after.goalEnabled)
            cloud.enqueue(type: "reading_goals", id: id, payload: p)
        }
    }
}
