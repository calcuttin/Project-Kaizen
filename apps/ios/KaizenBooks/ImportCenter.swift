import SwiftUI
import UniformTypeIdentifiers

struct ImportCenter: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var kind = LibraryImportPreview.Kind.csv
    @State private var choosing = false
    @State private var preview: LibraryImportPreview?
    @State private var choices: [String: String] = [:]
    @State private var matching: Book?
    @State private var fileName = ""
    @State private var busy = false
    @State private var message: String?
    @State private var loadTask: Task<Void, Never>?
    @State private var generation = UUID()
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Import format", selection: $kind) { ForEach(LibraryImportPreview.Kind.allCases, id: \.self) { Text($0.rawValue).tag($0) } }.pickerStyle(.segmented)
                    Button("Choose a file", systemImage: "doc") { choosing = true }.disabled(busy)
                    if busy { HStack { ProgressView(); Text("Reading file…"); Spacer(); Button("Cancel") { reset() } } }
                    if !fileName.isEmpty { Text(fileName).font(.caption) }
                    if let message { Text(message).font(.footnote).foregroundStyle(.secondary) }
                } footer: {
                    Text("Files are parsed on this iPhone. Up to 5 MB, 1,000 records, UTF-8 CSV or English Kindle My Clippings.txt. Review before importing. Missing page counts use 300; you can edit them afterward. Finished imports do not invent a finish date or reading session.")
                }
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("--ui-testing") && ProcessInfo.processInfo.arguments.contains("--import-fixture") {
                    Button("Load import test file") {
                        do {
                            let url = FileManager.default.temporaryDirectory.appending(path: "synthetic-books.csv")
                            try "Title,Author,Number of Pages,Exclusive Shelf\nImport preview sample,Test reader,96,to-read\nThe Creative Act,Rick Rubin,432,currently-reading\n".write(to: url, atomically: true, encoding: .utf8)
                            load(url)
                        } catch { message = error.localizedDescription }
                    }
                }
                #endif
                if store.library.isDemo {
                    Section {
                        Text("This is a sample library. Imported records stay in this sample collection and cannot be copied into your account. For personal exports, cancel and start with an empty library in Preferences first.").font(.footnote).foregroundStyle(.secondary)
                    }
                }
                if let preview {
                    Section("Review · \(preview.count) records") {
                        ForEach(preview.books) { book in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(book.title).font(.headline); Text(book.author).font(.subheadline).foregroundStyle(.secondary)
                                if preview.kind == .csv { Text("\(book.pages) pages · \(book.status.label)\(book.shelf.isEmpty ? "" : " · \(book.shelf)")").font(.caption) }
                                Text(matchLabel(book)).font(.caption).foregroundStyle(BooksTheme.accent)
                                if preview.kind == .kindle {
                                    Text("\(preview.annotations.filter { $0.payload?["bookId"]?.string == book.id }.count) annotations").font(.caption)
                                    Button("Choose matching book") { matching = book }
                                    Picker("Import choice", selection: choice(book)) {
                                        Text("Match automatically").tag("auto"); Text("Create a new book").tag("create"); Text("Skip").tag("skip")
                                        if let current = choices[book.id], current.hasPrefix("link:") { Text("Use selected book").tag(current) }
                                    }
                                }
                            }.padding(.vertical, 4)
                        }
                    }
                    if preview.kind == .kindle {
                        Section("Annotation preview") {
                            ForEach(preview.annotations, id: \.entityId) { item in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(item.payload?["kind"]?.string?.capitalized ?? "Annotation").font(.headline)
                                    Text(item.payload?["content"]?.string ?? "").font(.subheadline)
                                    Text(item.annotationContext).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                    if !preview.warnings.isEmpty {
                        Section("Review warnings") { ForEach(Array(preview.warnings.enumerated()), id: \.offset) { _, warning in Text(warning).font(.footnote) } }
                    }
                    Section {
                        Button("Import reviewed records") {
                            if store.importPreview(preview, choices: choices) { self.preview = nil; message = nil }
                            else { message = store.errorMessage }
                        }.accessibilityIdentifier("commit-import")
                    } footer: { Text("Existing books are kept. CSV duplicates are skipped. Ambiguous matches are skipped until you explicitly choose a book. When connected, imported records sync to your shared account.") }
                }
                if let run = store.lastImport {
                    Section("Last import · this session") {
                        Text("\(run.createdCount) records added · \(run.skipped) skipped").accessibilityIdentifier("import-result")
                        if run.createdCount > 0 {
                            Button("Undo last import", role: .destructive) {
                                if store.undoImport() { message = "Import undone." } else { message = store.errorMessage }
                            }
                        }
                        Text("Undo only removes this import’s new records. It stops if those records have later changes or activity. This option lasts until the app closes or another import completes.").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }.navigationTitle("Import books & notes").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
                .onChange(of: kind) { _, _ in reset() }
                .onDisappear { loadTask?.cancel(); generation = UUID() }
                .fileImporter(isPresented: $choosing, allowedContentTypes: kind == .csv ? [.commaSeparatedText, .plainText] : [.plainText]) { result in
                    switch result { case .success(let url): load(url); case .failure(let error): message = error.localizedDescription }
                }
                .sheet(item: $matching) { incoming in
                    ImportBookMatcher(incoming: incoming) { id in choices[incoming.id] = "link:" + id; matching = nil }
                }
        }
    }
    private func choice(_ book: Book) -> Binding<String> {
        Binding(get: { choices[book.id] ?? (store.library.books.filter { LibraryImports.matches($0, book) }.count > 1 ? "skip" : "auto") }, set: { choices[book.id] = $0 })
    }
    private func matchLabel(_ book: Book) -> String {
        if let choice = choices[book.id] {
            if choice == "skip" { return "Will skip" }; if choice == "create" { return "Will create a new book" }
            if choice.hasPrefix("link:") { return "Link to: " + (store.book(String(choice.dropFirst(5)))?.title ?? "Book removed — choose again") }
        }
        let matches = store.library.books.filter { LibraryImports.matches($0, book) }
        if matches.count > 1 { return "Multiple matches — will skip unless you choose explicitly" }
        if let match = matches.first { return kind == .csv ? "Already exists — will skip" : "Match: \(match.title)" }
        return "Will create a new book"
    }
    private func reset() { loadTask?.cancel(); generation = UUID(); preview = nil; choices = [:]; message = nil; fileName = ""; busy = false }
    private func load(_ url: URL) {
        reset(); busy = true; fileName = url.lastPathComponent
        let token = generation, owner = store.owner, format = kind
        loadTask = Task {
            do {
                let result = try await LibraryImportLoader().load(url, kind: format)
                guard generation == token, !Task.isCancelled, !store.readOnly, store.owner == owner else { return }
                preview = result; busy = false
            } catch {
                guard generation == token, !Task.isCancelled else { return }
                message = error.localizedDescription; busy = false
            }
        }
    }
}

private struct ImportBookMatcher: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let incoming: Book
    let select: (String) -> Void
    @State private var query = ""
    var body: some View {
        NavigationStack {
            List {
                Text("Link annotations for \(incoming.title) to an existing book.").font(.footnote)
                ForEach(store.library.books.filter { query.isEmpty || "\($0.title) \($0.author) \($0.isbn)".localizedCaseInsensitiveContains(query) }) { book in
                    Button { select(book.id) } label: {
                        VStack(alignment: .leading) { Text(book.title); Text("\(book.author) · \(book.shelf.isEmpty ? "Unshelved" : book.shelf)").font(.caption).foregroundStyle(.secondary) }
                    }
                }
            }.searchable(text: $query).navigationTitle("Choose book")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}
