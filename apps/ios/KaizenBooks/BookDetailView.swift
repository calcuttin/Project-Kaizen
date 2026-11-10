import SwiftUI

struct BookDetailView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let id: String
    @State private var editing = false
    @State private var logging = false
    @State private var notes = false
    @State private var deleting = false
    var body: some View {
        Group {
            if let book = store.book(id) {
                ScrollView {
                    VStack(spacing: 24) {
                        BookCover(book: book, width: 174).padding(.top, 20)
                        VStack(spacing: 8) {
                            Text(book.title).font(BooksTheme.display(28)).multilineTextAlignment(.center)
                            Text(book.author).foregroundStyle(.secondary)
                            Text("\(book.pages) pages\(book.shelf.isEmpty ? "" : " · \(book.shelf)")").font(.caption).foregroundStyle(.secondary)
                        }
                        Menu {
                            ForEach(ReadingStatus.allCases) { status in
                                Button(status.label) { store.setStatus(id, to: status) }
                            }
                        } label: { Label(book.status.label, systemImage: "chevron.down").font(.subheadline.weight(.semibold)).padding(.horizontal, 18).padding(.vertical, 12).background(BooksTheme.accent.opacity(0.1), in: Capsule()) }
                        VStack(alignment: .leading, spacing: 14) {
                            HStack { Text("Your progress").font(.headline); Spacer(); Text("\(Int(book.progress * 100))%").monospacedDigit() }
                            ProgressView(value: book.progress)
                            Text("Page \(book.currentPage) of \(book.pages)").font(.subheadline).foregroundStyle(.secondary).accessibilityIdentifier("progress-value")
                            if book.currentPage < book.pages {
                                Button { logging = true } label: { Label("Log reading", systemImage: "plus").frame(maxWidth: .infinity).padding(.vertical, 8) }.buttonStyle(.borderedProminent).foregroundStyle(BooksTheme.buttonInk).buttonBorderShape(.roundedRectangle(radius: 9))
                            } else { Label("Another world explored", systemImage: "checkmark.seal").foregroundStyle(BooksTheme.accent) }
                        }.paperCard()
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Your rating").font(.headline)
                            ViewThatFits(in: .horizontal) {
                                HStack(spacing: 6) { ratingButtons(book); Spacer(); clearRating(book) }
                                VStack(alignment: .leading) { HStack(spacing: 2) { ratingButtons(book) }; clearRating(book) }
                            }
                        }.paperCard()
                        VStack(alignment: .leading, spacing: 14) {
                            HStack { Text("Notes & highlights").font(.headline); Spacer(); Button("Edit") { notes = true }.frame(minHeight: 44) }
                            Text(book.notes.isEmpty ? "A thought, a sentence, a new way of seeing. Keep what stays with you." : book.notes).font(.system(.body, design: .serif)).foregroundStyle(book.notes.isEmpty ? .secondary : .primary).frame(maxWidth: .infinity, alignment: .leading)
                        }.paperCard()
                        ForEach(store.annotations.filter { $0.payload?["bookId"]?.string == book.id }, id: \.entityId) { annotation in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(annotation.payload?["kind"]?.string?.capitalized ?? "Annotation").font(.headline)
                                Text(annotation.payload?["content"]?.string ?? "")
                                if !annotation.annotationContext.isEmpty { Text(annotation.annotationContext).font(.caption).foregroundStyle(.secondary) }
                            }.paperCard()
                        }
                        Text(store.syncLabel).font(.caption).foregroundStyle(.secondary)
                        Button("Delete book", role: .destructive) { deleting = true }.padding(.bottom, 24)
                    }.padding(.horizontal, 22)
                }.background(BooksTheme.paper)
                .sheet(isPresented: $editing) { BookEditor(existing: book) }
                .sheet(isPresented: $logging) { LogReadingView(book: book) }
                .sheet(isPresented: $notes) { NotesEditor(book: book) }
            } else { ContentUnavailableView("Book removed", systemImage: "book.closed") }
        }
        .navigationTitle("Book details").navigationBarTitleDisplayMode(.inline)
        .toolbar { Button("Edit book") { editing = true } }
        .confirmationDialog("Delete this book and its reading history?", isPresented: $deleting, titleVisibility: .visible) {
            Button("Delete book", role: .destructive) { if store.delete(id) { dismiss() } }
        } message: { Text(store.owner == nil ? "This removes its notes and reading sessions from this device." : "This removes the book, notes and reading sessions from your shared account on all devices after synchronization.") }
    }
    private func ratingButtons(_ book: Book) -> some View {
        ForEach(1...5, id: \.self) { rating in
            Button {
                var updated = book; updated.rating = rating; store.save(updated, replacing: book)
            } label: { Image(systemName: rating <= book.rating ? "star.fill" : "star").font(.title3).frame(minWidth: 44, minHeight: 44) }
                .accessibilityLabel("Rate \(rating) stars").accessibilityAddTraits(rating == book.rating ? .isSelected : [])
        }
    }
    private func clearRating(_ book: Book) -> some View {
        Button("Clear") { var updated = book; updated.rating = 0; store.save(updated, replacing: book) }.font(.caption).frame(minHeight: 44).disabled(book.rating == 0)
    }
}

struct LogReadingView: View {
    @Environment(\.dynamicTypeSize) private var textSize
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var book: Book
    @State private var page = ""
    private var current: Book { store.book(book.id) ?? book }
    private var value: Int? { Int(page) }
    private var valid: Bool { value.map { $0 > current.currentPage && $0 <= current.pages } ?? false }
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(current.title).font(BooksTheme.display(22))
                    Text("Currently on page \(current.currentPage) of \(current.pages)").font(.subheadline).foregroundStyle(.secondary)
                }
                Section("What page did you reach?") {
                    TextField("Page number", text: $page).keyboardType(.numberPad).accessibilityIdentifier("page-number")
                    if let value, valid { Text("\(value - current.currentPage) new pages. A little further along.").foregroundStyle(BooksTheme.accent) }
                    else if !page.isEmpty { Text("Enter a whole page number from \(current.currentPage + 1) to \(current.pages).").foregroundStyle(.red) }
                }
                Section { Text("Reaching the last page marks this book as finished. Only new pages are added to your journal.").font(.footnote).foregroundStyle(.secondary) }
            }
            .navigationTitle("A few pages forward").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save progress") { if let value, store.log(book.id, page: value) { dismiss() } }.disabled(!valid).accessibilityIdentifier("save-progress") }
            }
        }.presentationDetents(textSize.isAccessibilitySize ? [.large] : [.medium, .large]).presentationDragIndicator(.visible)
    }
}

struct BookEditor: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var existing: Book?
    @State private var title = ""
    @State private var author = ""
    @State private var pages = ""
    @State private var isbn = ""
    @State private var shelf = ""
    @State private var cover = 0
    @State private var baseline: Book?
    @State private var initialized = false
    @State private var scanning = false
    @State private var lookup = BookLookupModel()
    @State private var appliedLookup: ISBNBook?
    @FocusState private var isbnFocused: Bool
    private var duplicate: Book? {
        guard let normalized = ISBN.normalized(isbn) else { return nil }
        return store.library.books.first { $0.id != existing?.id && ISBN.normalized($0.isbn) == normalized }
    }
    private var valid: Bool {
        guard let count = Int(pages), (1...100_000).contains(count), count >= (existing?.currentPage ?? 0) else { return false }
        return !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("ISBN-10 or ISBN-13", text: $isbn)
                        .keyboardType(.numbersAndPunctuation).textInputAutocapitalization(.characters).autocorrectionDisabled()
                        .focused($isbnFocused)
                        .accessibilityIdentifier("book-isbn")
                    Button { isbnFocused = false; lookup.cancel(); scanning = true } label: { Label("Scan barcode", systemImage: "barcode.viewfinder") }
                        .accessibilityIdentifier("scan-isbn")
                    Button(lookup.busy ? "Looking up…" : "Look up ISBN") { isbnFocused = false; lookup.lookup(isbn) }
                        .disabled(lookup.busy || isbn.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .accessibilityIdentifier("lookup-isbn")
                    if lookup.busy { Button("Cancel lookup") { lookup.cancel() } }
                    if let message = lookup.message {
                        Text(message).font(.footnote).foregroundStyle(.secondary).accessibilityIdentifier("isbn-message")
                    }
                    if let duplicate {
                        Text("Already in your library: \(duplicate.title). \(existing == nil ? "Saving will add another copy." : "Check that this is the edition you intend to edit.")")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                } header: { Text("Find by ISBN") } footer: {
                    Text("Look up ISBN sends the ISBN and your IP address to Open Library. Camera images stay on your device. Review the details before saving, or enter them manually.")
                }
                if let found = lookup.result {
                    Section("Review book details") {
                        Text(found.title).font(.headline)
                        Text(found.author.isEmpty ? "Author unavailable" : found.author)
                        Text(found.pages.map { "\($0) pages" } ?? "Page count unavailable — enter it below.")
                        Button("Use these details") {
                            title = found.title
                            if !found.author.isEmpty { author = found.author }
                            if let count = found.pages, count >= (existing?.currentPage ?? 0) { pages = String(count) }
                            appliedLookup = found
                            lookup.cancel()
                        }.accessibilityIdentifier("apply-isbn-details")
                        Text("This replaces the title and any available author/page count in the form. Check the edition and page count before saving.").font(.footnote).foregroundStyle(.secondary)
                    }
                }
                Section("The book") {
                    TextField("Title", text: $title).accessibilityIdentifier("book-title")
                    TextField("Author", text: $author).accessibilityIdentifier("book-author")
                    TextField("Total pages", text: $pages).keyboardType(.numberPad).accessibilityIdentifier("book-pages")
                }
                Section {
                    Picker("Shelf", selection: $shelf) {
                        Text("Unshelved").tag("")
                        ForEach(store.shelves) { item in Text(store.shelfLabel(item)).tag(item.id) }
                        if !shelf.isEmpty && !store.shelves.contains(where: { $0.id == shelf }) { Text("Shelf removed — choose another").tag(shelf) }
                    }.accessibilityIdentifier("book-shelf")
                    Text("Create or edit shelves from Manage shelves on Bookshelf.").font(.caption).foregroundStyle(.secondary)
                    Picker("Cover color", selection: $cover) {
                        ForEach(Array(["Sand", "Forest", "Terracotta", "Ocean", "Ochre", "Twilight"].enumerated()), id: \.offset) { i, name in Text(name).tag(i) }
                    }
                } header: { Text("Make it yours") } footer: { Text("Cover color is used when artwork is unavailable. Online covers are optional in Preferences. When connected, book details synchronize with your Kaizen account.") }
                if !pages.isEmpty && !valid {
                    Text("A title and a whole page count (1–100,000) are required. Pages cannot be fewer than your recorded progress.").font(.footnote).foregroundStyle(.secondary)
                }
            }.navigationTitle(existing == nil ? "Add a book" : "Edit book").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button("Save book") { save() }.disabled(!valid || lookup.busy).accessibilityIdentifier("save-book") }
                }
                .onAppear {
                    guard !initialized else { return }; initialized = true; baseline = existing
                    if let existing { title = existing.title; author = existing.author; pages = String(existing.pages); isbn = existing.isbn; shelf = existing.shelfID ?? ""; cover = existing.cover }
                }
                .onChange(of: isbn) { _, _ in lookup.cancel(); appliedLookup = nil }
                .onDisappear { lookup.cancel() }
                .sheet(isPresented: $scanning) { ISBNScannerSheet { scanned in isbn = scanned } }
        }
    }
    private func save() {
        guard valid, let count = Int(pages) else { return }
        var book = baseline ?? Book(title: title, author: author, pages: count)
        book.title = title; book.author = author; book.pages = count; book.isbn = ISBN.normalized(isbn) ?? isbn.trimmingCharacters(in: .whitespacesAndNewlines); book.shelfID = shelf.isEmpty ? nil : shelf; book.shelf = store.shelves.first { $0.id == shelf }?.name ?? ""; book.cover = cover
        if baseline == nil, let found = appliedLookup, found.isbn == book.isbn, found.title == title, found.author == author {
            book.coverURL = found.coverURL
        }
        if book.status == .finished { book.currentPage = count }
        if store.save(book, replacing: baseline) { dismiss() }
    }
}

struct NotesEditor: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let book: Book
    @State private var text = ""
    @State private var baseline: Book?
    var body: some View {
        NavigationStack {
            TextEditor(text: $text).padding(18).accessibilityLabel("Notes and highlights").scrollContentBackground(.hidden).background(BooksTheme.paper)
                .navigationTitle("Notes & highlights").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save notes") {
                            guard var edited = baseline else { return }
                            edited.notes = text
                            if store.save(edited, replacing: baseline) { dismiss() }
                        }
                    }
                }.onAppear { if baseline == nil { baseline = book; text = book.notes } }
        }
    }
}
