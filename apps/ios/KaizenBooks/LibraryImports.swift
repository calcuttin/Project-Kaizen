import Foundation

struct LibraryImportPreview {
    enum Kind: String, CaseIterable { case csv = "Books CSV", kindle = "Kindle clippings" }
    var kind: Kind
    var books: [Book]
    var annotations: [CloudRecord] = []
    var warnings: [String] = []
    var count: Int { kind == .csv ? books.count : annotations.count }
}

enum LibraryImportError: LocalizedError {
    case invalid(String)
    var errorDescription: String? { if case .invalid(let message) = self { return message }; return nil }
}

enum LibraryImports {
    static let maxBytes = 5 * 1024 * 1024
    static func normalized(_ text: String) -> String {
        text.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty }.joined(separator: " ")
    }
    static func matches(_ book: Book, _ incoming: Book) -> Bool {
        if let a = ISBN.normalized(book.isbn), let b = ISBN.normalized(incoming.isbn), a == b { return true }
        return !normalized(incoming.title).isEmpty && normalized(book.title) == normalized(incoming.title)
            && (book.author.isEmpty || incoming.author.isEmpty || normalized(book.author) == normalized(incoming.author))
    }
    static func parse(_ text: String, kind: LibraryImportPreview.Kind) throws -> LibraryImportPreview {
        guard text.utf8.count <= maxBytes else { throw LibraryImportError.invalid("Choose a file no larger than 5 MB.") }
        let text = text.hasPrefix("\u{FEFF}") ? String(text.dropFirst()) : text
        let result = try kind == .csv ? csv(text) : kindle(text)
        guard result.count <= 1000 else { throw LibraryImportError.invalid("Import up to 1,000 records at a time. Split this file into smaller files.") }
        guard result.count > 0 else { throw LibraryImportError.invalid("No usable records were found. Choose a title/author CSV or an English Kindle My Clippings.txt export.") }
        return result
    }
    private static func csv(_ text: String) throws -> LibraryImportPreview {
        var rows: [[String]] = [], row: [String] = [], cell = "", quoted = false
        var i = text.startIndex
        func finishCell() throws {
            guard cell.utf8.count <= 16384, row.count < 128 else { throw LibraryImportError.invalid("A CSV field or row is too large.") }
            row.append(cell); cell = ""
        }
        func finishRow() throws {
            try finishCell()
            if row.contains(where: { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) { rows.append(row) }
            row = []
            guard rows.count <= 1001 else { throw LibraryImportError.invalid("Import up to 1,000 book rows at a time.") }
        }
        while i < text.endIndex {
            let c = text[i], next = text.index(after: i)
            if c == "\"" {
                if quoted && next < text.endIndex && text[next] == "\"" { cell.append("\""); i = text.index(after: next); continue }
                quoted.toggle()
            } else if c == "," && !quoted { try finishCell() }
            else if (c == "\n" || c == "\r" || c == "\r\n") && !quoted { try finishRow() }
            else { cell.append(c) }
            guard cell.utf8.count <= 16384 else { throw LibraryImportError.invalid("A CSV field is too large.") }
            i = next
        }
        guard !quoted else { throw LibraryImportError.invalid("The CSV has an unclosed quoted field.") }
        try finishRow()
        guard let headers = rows.first else { throw LibraryImportError.invalid("The file is empty.") }
        func key(_ s: String) -> String { normalized(s).replacingOccurrences(of: " ", with: "") }
        let keys = headers.map(key)
        guard keys.contains("title") || keys.contains("booktitle") else { throw LibraryImportError.invalid("The CSV needs a Title or Book Title column.") }
        var result = LibraryImportPreview(kind: .csv, books: [])
        for (offset, cells) in rows.dropFirst().enumerated() {
            try Task.checkCancellation()
            func field(_ names: [String]) -> String {
                for name in names {
                    if let idx = keys.firstIndex(of: key(name)), cells.indices.contains(idx) {
                        let value = cells[idx].trimmingCharacters(in: .whitespacesAndNewlines)
                        if !value.isEmpty { return value }
                    }
                }
                return ""
            }
            let title = field(["title", "book title"])
            guard !title.isEmpty else { result.warnings.append("Row \(offset + 2): skipped because it has no title."); continue }
            let rawPages = field(["pages", "number of pages", "numpages"]), pages = Int(rawPages)
            let count = pages.flatMap { (1...100_000).contains($0) ? $0 : nil } ?? 300
            if pages == nil || pages != count { result.warnings.append("\(title): missing/invalid page count uses 300; edit it after import.") }
            let raw = field(["status", "exclusive shelf", "bookshelves"]).lowercased()
            let status: ReadingStatus = raw == "reading" || raw.contains("currently") ? .reading : raw.contains("paused") ? .paused : ["read", "finished"].contains(raw) ? .finished : .want
            let rawISBN = field(["isbn13", "isbn"]).filter { $0.isNumber || $0 == "X" || $0 == "x" }
            var book = Book(title: title, author: field(["author", "authors", "author l-f"]), pages: count, currentPage: status == .finished ? count : 0, status: status, shelf: field(["shelf", "bookshelves", "exclusive shelf"]), isbn: ISBN.normalized(rawISBN) ?? rawISBN)
            let rating = Int(field(["rating", "my rating"])) ?? 0; book.rating = (0...5).contains(rating) ? rating : 0
            // An imported finished status is not evidence of a finish date or a reading session.
            result.books.append(book)
        }
        return result
    }
    private static func kindle(_ text: String) throws -> LibraryImportPreview {
        let lines = text.components(separatedBy: .newlines)
        var blocks: [[String]] = [[]]
        for line in lines {
            let clean = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if clean == "==========" { blocks.append([]) } else { blocks[blocks.count - 1].append(clean) }
            guard blocks.count <= 1001 else { throw LibraryImportError.invalid("Import up to 1,000 clippings at a time.") }
        }
        var result = LibraryImportPreview(kind: .kindle, books: [])
        var groups: [String: String] = [:]
        for (offset, block) in blocks.enumerated() {
            try Task.checkCancellation()
            let trimmed = Array(block.drop(while: { $0.isEmpty }))
            guard trimmed.count >= 2 else { continue }
            let titleLine = trimmed[0], meta = trimmed[1]
            guard meta.hasPrefix("-"), Basic.match("highlight|note|bookmark", meta) != nil else {
                result.warnings.append("Clipping \(offset + 1): unsupported metadata; English Kindle exports are supported."); continue
            }
            var title = titleLine, author = ""
            if titleLine.hasSuffix(")"), let start = titleLine.lastIndex(of: "(") {
                title = String(titleLine[..<start]).trimmingCharacters(in: .whitespaces)
                author = String(titleLine[titleLine.index(after: start)..<titleLine.index(before: titleLine.endIndex)])
            }
            guard !title.isEmpty else { continue }
            let kind = meta.lowercased().contains("note") ? "note" : meta.lowercased().contains("bookmark") ? "bookmark" : "highlight"
            let location = Basic.match(#"Location\s+([\d-]+)"#, meta)?[1] ?? ""
            let content = trimmed.dropFirst(2).filter { !$0.isEmpty }.joined(separator: "\n")
            guard kind == "bookmark" || !content.isEmpty else { result.warnings.append("Clipping \(offset + 1): skipped empty text."); continue }
            guard content.utf8.count <= 16384, title.utf8.count <= 4096 else { throw LibraryImportError.invalid("A clipping is too large. Split or shorten it first.") }
            let key = title.lowercased() + "\n" + author.lowercased()
            let bookID: String
            if let existing = groups[key] { bookID = existing }
            else { let b = Book(title: title, author: author, pages: 300, shelf: "Kindle"); result.books.append(b); groups[key] = b.id; bookID = b.id }
            var hash: UInt32 = 2166136261
            for unit in "\(title)\n\(author)\n\(kind)\n\(location)\n\(content)".utf16 { hash = (hash ^ UInt32(unit)) &* 16777619 }
            let id = UUID().uuidString
            var payload: Payload = ["id": .string(id), "bookId": .string(bookID), "kind": .string(kind), "content": .string(content), "source": .string("kindle-clippings"), "sourceRef": .string("kindle-" + String(hash, radix: 16))]
            if !location.isEmpty { payload["location"] = .string(location) }
            if let raw = Basic.match(#"page\s+(\d+)"#, meta)?[1], let n = Int(raw), n > 0 { payload["page"] = .number(Double(n)) }
            if let range = meta.range(of: "added on", options: .caseInsensitive) {
                let raw = String(meta[range.upperBound...]).trimmingCharacters(in: .whitespaces)
                var date: Date?
                for format in ["EEEE, MMMM d, yyyy h:mm:ss a", "EEEE, d MMMM yyyy HH:mm:ss", "MMMM d, yyyy h:mm:ss a", "yyyy-MM-dd HH:mm:ss"] {
                    let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = format; f.isLenient = false
                    if let found = f.date(from: raw) { date = found; break }
                }
                if let date { payload["annotatedAt"] = .string(ISO8601DateFormatter().string(from: date)) }
                else if !raw.isEmpty { result.warnings.append("\(title): date could not be read; page/location and text are retained.") }
            }
            result.annotations.append(CloudRecord(entityType: "reading_annotations", entityId: id, payload: payload, revision: 0))
        }
        return result
    }
}

actor LibraryImportLoader {
    func load(_ url: URL, kind: LibraryImportPreview.Kind) throws -> LibraryImportPreview {
        try Task.checkCancellation()
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let handle = try FileHandle(forReadingFrom: url); defer { try? handle.close() }
        var data = Data()
        while let chunk = try handle.read(upToCount: 65536), !chunk.isEmpty {
            try Task.checkCancellation()
            guard data.count + chunk.count <= LibraryImports.maxBytes else { throw LibraryImportError.invalid("Choose a file no larger than 5 MB.") }
            data.append(chunk)
        }
        guard let text = String(data: data, encoding: .utf8) else { throw LibraryImportError.invalid("Save the export as UTF-8 text and try again.") }
        return try LibraryImports.parse(text, kind: kind)
    }
}
