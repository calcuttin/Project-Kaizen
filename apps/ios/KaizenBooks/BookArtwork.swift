import SwiftUI

struct CoverRequest: Hashable {
    let title: String
    let author: String
    let isbn: String
    let storedURL: String?
    let enabled: Bool
    let attempt: Int
    let owner: String

    static func imageURL(_ value: String?) -> URL? {
        guard let value, let url = URL(string: value), url.scheme?.lowercased() == "https",
              url.host?.lowercased() == "covers.openlibrary.org", url.user == nil, url.password == nil,
              url.port == nil || url.port == 443 else { return nil }
        return url
    }
    var isbnURL: URL? {
        let clean = isbn.uppercased().filter { $0.isASCII && ($0.isNumber || $0 == "X") }
        guard clean.count == 10 || clean.count == 13 else { return nil }
        return URL(string: "https://covers.openlibrary.org/b/isbn/\(clean)-M.jpg?default=false")
    }
}

/// Public artwork only. Never uses the authenticated Supabase/Clerk transport or writes library records.
actor CoverLoader {
    static let shared = CoverLoader()
    private let session: URLSession
    private let cache = NSCache<NSString, NSData>()
    private var nextLookup = Date.distantPast
    init(session: URLSession? = nil) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 15
        configuration.httpCookieStorage = nil
        configuration.urlCredentialStorage = nil
        configuration.httpMaximumConnectionsPerHost = 2
        self.session = session ?? URLSession(configuration: configuration)
        cache.totalCostLimit = 24 * 1024 * 1024
        cache.countLimit = 128
    }
    func image(for request: CoverRequest) async -> Data? {
        guard request.enabled, !Task.isCancelled else { return nil }
        // Account-scoped, memory-only cache; changing a title/ISBN or retrying changes the key.
        let key = [request.owner, request.title, request.author, request.isbn, request.storedURL ?? "", String(request.attempt)].joined(separator: "\u{0}") as NSString
        if let data = cache.object(forKey: key) { return data as Data }
        do {
            if let url = CoverRequest.imageURL(request.storedURL) ?? request.isbnURL,
               let data = try await download(url, image: true) {
                cache.setObject(data as NSData, forKey: key, cost: data.count)
                return data
            }
            try Task.checkCancellation()
            // Reserve a slot before suspension: at most one metadata search per second.
            let start = max(Date(), nextLookup)
            nextLookup = start.addingTimeInterval(1)
            if start > Date() { try await Task.sleep(for: .seconds(start.timeIntervalSinceNow)) }
            var query = URLComponents(string: "https://openlibrary.org/search.json")!
            query.queryItems = [URLQueryItem(name: "title", value: request.title), URLQueryItem(name: "author", value: request.author), URLQueryItem(name: "limit", value: "5"), URLQueryItem(name: "fields", value: "title,author_name,cover_i")]
            guard let data = try await download(query.url!, image: false) else { return nil }
            let result = try JSONDecoder().decode(SearchResult.self, from: data)
            let matches = result.docs.filter { $0.cover_i != nil && Self.normalized($0.title ?? "") == Self.normalized(request.title) }
            let surname = Self.normalized(request.author).split(separator: " ").last.map(String.init) ?? ""
            let match = matches.first { surname.isEmpty || ($0.author_name ?? []).contains { Self.normalized($0).contains(surname) } } ?? matches.first
            guard let id = match?.cover_i, id > 0,
                  let url = URL(string: "https://covers.openlibrary.org/b/id/\(id)-M.jpg?default=false"),
                  let artwork = try await download(url, image: true) else { return nil }
            cache.setObject(artwork as NSData, forKey: key, cost: artwork.count)
            return artwork
        } catch { return nil }
    }
    private func download(_ url: URL, image: Bool) async throws -> Data? {
        try Task.checkCancellation()
        var request = URLRequest(url: url)
        request.setValue("KaizenBooks/0.1 (https://github.com/calcuttin/Project-Kaizen)", forHTTPHeaderField: "User-Agent")
        let (data, response) = try await session.data(for: request)
        try Task.checkCancellation()
        guard let http = response as? HTTPURLResponse else { return nil }
        // A missing cover may fall back to title search; outages/rate limits must not fan out.
        if http.statusCode == 404 { return nil }
        guard http.statusCode == 200 else { throw URLError(.badServerResponse) }
        guard data.count <= (image ? 5_000_000 : 500_000), !data.isEmpty,
              !image || response.mimeType?.hasPrefix("image/") == true else { return nil }
        return data
    }
    private static func normalized(_ text: String) -> String {
        text.lowercased().components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty }.joined(separator: " ")
    }
    private struct SearchResult: Decodable { let docs: [Document] }
    private struct Document: Decodable { let title: String?; let author_name: [String]?; let cover_i: Int? }
}

struct BookArtwork: View {
    let book: Book
    var spine = false
    @AppStorage("onlineBookCovers") private var enabled = false
    @AppStorage("bookCoverAttempt") private var attempt = 0
    @Environment(LibraryStore.self) private var store
    @State private var loaded: (CoverRequest, UIImage)?
    private var request: CoverRequest { CoverRequest(title: book.title, author: book.author, isbn: book.isbn, storedURL: book.coverURL, enabled: enabled, attempt: attempt, owner: store.owner ?? "local") }
    var body: some View {
        GeometryReader { proxy in
            if enabled, let loaded, loaded.0 == request {
                Image(uiImage: loaded.1).resizable().scaledToFill()
                    .frame(width: proxy.size.width, height: proxy.size.height).clipped()
                    .opacity(spine ? 0.68 : 1)
                    .accessibilityLabel("Cover artwork for \(book.title)")
                    .accessibilityIdentifier("artwork-\(book.id)")
            }
        }
        .task(id: request) {
            let current = request
            loaded = nil
            guard let data = await CoverLoader.shared.image(for: current), !Task.isCancelled,
                  current == request, let image = UIImage(data: data) else { return }
            loaded = (current, image)
        }
    }
}

struct OnlineCoverControls: View {
    @AppStorage("onlineBookCovers") private var enabled = false
    @AppStorage("bookCoverAttempt") private var attempt = 0
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(enabled ? "Online covers are on. Missing artwork may be unavailable from Open Library." : "Online covers are off. Enabling them sends book details and your IP address to Open Library.")
                .font(.caption).foregroundStyle(BooksTheme.secondary)
            HStack {
                Button(enabled ? "Retry covers" : "Enable online covers") { if enabled { attempt += 1 } else { enabled = true } }
                    .buttonStyle(.bordered).font(.caption).accessibilityIdentifier("online-covers-action")
                if enabled { Button("Turn off") { enabled = false }.font(.caption) }
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}
