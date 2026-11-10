import Foundation
import Observation

enum ISBN {
    /// A canonical ISBN-13, after validating the original ISBN-10/13 check digit.
    static func normalized(_ input: String) -> String? {
        let value = input.uppercased().filter { !$0.isWhitespace && $0 != "-" }
        let chars = Array(value)
        guard chars.allSatisfy({ $0.isASCII && ($0.isNumber || $0 == "X") }) else { return nil }
        if chars.count == 10 {
            guard chars.prefix(9).allSatisfy({ $0.wholeNumberValue != nil }),
                  let last = chars[9] == "X" ? 10 : chars[9].wholeNumberValue else { return nil }
            let sum = chars.prefix(9).enumerated().reduce(last) { $0 + (10 - $1.offset) * $1.element.wholeNumberValue! }
            guard sum % 11 == 0 else { return nil }
            let base = "978" + String(value.prefix(9))
            return base + String(checkDigit(base))
        }
        guard chars.count == 13, value.hasPrefix("978") || value.hasPrefix("979"),
              chars.allSatisfy({ $0.wholeNumberValue != nil }),
              chars[12].wholeNumberValue == checkDigit(String(value.prefix(12))) else { return nil }
        return value
    }
    private static func checkDigit(_ base: String) -> Int {
        (10 - base.enumerated().reduce(0) { $0 + $1.element.wholeNumberValue! * ($1.offset.isMultiple(of: 2) ? 1 : 3) } % 10) % 10
    }
}

struct ISBNBook: Equatable, Sendable {
    let isbn: String
    let title: String
    let author: String
    let pages: Int?
    let coverURL: String?
}

enum ISBNLookupError: LocalizedError {
    case invalid, notFound, unavailable, rateLimited, badResponse
    var errorDescription: String? {
        switch self {
        case .invalid: "Enter a valid ISBN-10 or ISBN-13. Spaces and hyphens are OK."
        case .notFound: "No book found for this ISBN. Check the number or enter the details manually."
        case .rateLimited: "Open Library is busy. Wait a minute before trying again, or enter the details manually."
        case .badResponse: "Open Library returned incomplete book data. You can enter the details manually."
        case .unavailable: "Could not reach Open Library. Check your connection or enter the details manually."
        }
    }
}

protocol ISBNLookingUp: Sendable {
    func book(isbn: String) async throws -> ISBNBook
}

/// Public metadata only: no account token, cookies, photographs or library records.
actor ISBNLookupService: ISBNLookingUp {
    static let shared = ISBNLookupService()
    static var editorService: any ISBNLookingUp {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--ui-testing"), arguments.contains("--isbn-fixture") { return ISBNPreviewFixture() }
        #endif
        return shared
    }
    private let session: URLSession
    private var retryAfter = Date.distantPast
    init(session: URLSession? = nil) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 15
        configuration.timeoutIntervalForResource = 20
        configuration.httpCookieStorage = nil
        configuration.urlCredentialStorage = nil
        self.session = session ?? URLSession(configuration: configuration)
    }
    func book(isbn input: String) async throws -> ISBNBook {
        guard let isbn = ISBN.normalized(input) else { throw ISBNLookupError.invalid }
        try Task.checkCancellation()
        guard Date() >= retryAfter else { throw ISBNLookupError.rateLimited }
        retryAfter = Date().addingTimeInterval(1)
        var url = URLComponents(string: "https://openlibrary.org/api/books")!
        url.queryItems = [URLQueryItem(name: "bibkeys", value: "ISBN:\(isbn)"), URLQueryItem(name: "format", value: "json"), URLQueryItem(name: "jscmd", value: "data")]
        var request = URLRequest(url: url.url!)
        request.setValue("KaizenBooks/0.1 (https://github.com/calcuttin/Project-Kaizen)", forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.data(for: request)
        try Task.checkCancellation()
        guard let http = response as? HTTPURLResponse else { throw ISBNLookupError.unavailable }
        if http.statusCode == 429 {
            retryAfter = Date().addingTimeInterval(max(60, min(Double(http.value(forHTTPHeaderField: "Retry-After") ?? "") ?? 60, 3600)))
            throw ISBNLookupError.rateLimited
        }
        if http.statusCode == 404 { throw ISBNLookupError.notFound }
        guard http.statusCode == 200 else { throw ISBNLookupError.unavailable }
        guard data.count <= 500_000, response.mimeType == "application/json" else { throw ISBNLookupError.badResponse }
        return try Self.decode(data, isbn: isbn)
    }
    static func decode(_ data: Data, isbn: String) throws -> ISBNBook {
        struct Author: Decodable { let name: String? }
        struct Entry: Decodable {
            let title: String?
            let authors: [Author]?
            let number_of_pages: Int?
            let cover: [String: String]?
        }
        let entries: [String: Entry]
        do { entries = try JSONDecoder().decode([String: Entry].self, from: data) }
        catch { throw ISBNLookupError.badResponse }
        guard let entry = entries["ISBN:\(isbn)"] else { throw ISBNLookupError.notFound }
        guard let title = entry.title?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty else { throw ISBNLookupError.badResponse }
        let count = entry.number_of_pages.flatMap { (1...100_000).contains($0) ? $0 : nil }
        let artwork = entry.cover?["medium"] ?? entry.cover?["large"] ?? entry.cover?["small"]
        return ISBNBook(isbn: isbn, title: String(title.prefix(500)), author: String((entry.authors ?? []).compactMap(\.name).joined(separator: ", ").prefix(500)), pages: count, coverURL: CoverRequest.imageURL(artwork)?.absoluteString)
    }
}

@MainActor @Observable final class BookLookupModel {
    private(set) var result: ISBNBook?
    private(set) var message: String?
    private(set) var busy = false
    private var generation = UUID()
    private var task: Task<Void, Never>?
    private let service: any ISBNLookingUp
    init(service: any ISBNLookingUp = ISBNLookupService.editorService) { self.service = service }
    func cancel() {
        generation = UUID(); task?.cancel(); task = nil
        busy = false; result = nil; message = nil
    }
    func lookup(_ input: String) {
        cancel()
        guard let isbn = ISBN.normalized(input) else { message = ISBNLookupError.invalid.localizedDescription; return }
        busy = true
        let current = generation
        task = Task {
            do {
                let book = try await service.book(isbn: isbn)
                guard !Task.isCancelled, generation == current else { return }
                result = book; busy = false
            } catch {
                guard !Task.isCancelled, generation == current else { return }
                message = (error as? ISBNLookupError ?? .unavailable).localizedDescription; busy = false
            }
        }
    }
}

#if DEBUG
/// Deterministic UI-test metadata; excluded from Release and gated behind both test flags.
private struct ISBNPreviewFixture: ISBNLookingUp {
    func book(isbn: String) async throws -> ISBNBook {
        ISBNBook(isbn: isbn, title: "ISBN preview sample", author: "Test author", pages: 96, coverURL: nil)
    }
}
#endif
