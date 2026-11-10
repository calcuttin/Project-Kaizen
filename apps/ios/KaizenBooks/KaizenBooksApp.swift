import SwiftUI
import ClerkKit

@main
struct KaizenBooksApp: App {
    @State private var store = LibraryStore.live()
    private static var testing: Bool { ProcessInfo.processInfo.arguments.contains("--ui-testing") || ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil }
    init() {
        BooksTheme.registerFonts()
        if !Self.testing { Clerk.configure(publishableKey: CloudConfiguration.clerkKey) }
    }
    var body: some Scene {
        WindowGroup {
            Group {
                if Self.testing { BooksRootView().environment(store) }
                else { AccountRootView().environment(Clerk.shared) }
            }.tint(BooksTheme.accent).font(.custom("Inter-Regular", size: 16, relativeTo: .body))
                .alert("Library storage", isPresented: Binding(get: { store.errorMessage != nil }, set: { if !$0 { store.errorMessage = nil } })) {
                    Button("OK") { store.errorMessage = nil }
                } message: { Text(store.errorMessage ?? "") }
        }
    }
}

struct BooksRootView: View {
    @AppStorage("booksAppearance") private var appearance = "dark"
    @Environment(LibraryStore.self) private var store
    var body: some View {
        TabView {
            NavigationStack { BookshelfView() }.tabItem { Label("Bookshelf", systemImage: "books.vertical") }
            NavigationStack { ReadingHome() }.tabItem { Label("Reading", systemImage: "book.pages") }
            NavigationStack { JournalView() }.tabItem { Label("Journal", systemImage: "chart.bar.xaxis") }
        }
        .preferredColorScheme(appearance == "system" ? nil : appearance == "light" ? .light : .dark)
        .disabled(store.readOnly)
        .safeAreaInset(edge: .top, spacing: 0) {
            if store.readOnly {
                Text("Library unavailable · original data preserved").font(.caption).frame(maxWidth: .infinity).padding(8).background(.red.opacity(0.12))
            }
        }
    }
}

struct ReadingHome: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dynamicTypeSize) private var textSize
    @State private var adding = false
    @State private var settings = false
    @State private var logging: Book?
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "ON YOUR NIGHTSTAND")
                    Text("Currently reading").font(BooksTheme.display(32)).foregroundStyle(BooksTheme.ink)
                    Text("Your next chapter is waiting.").font(.subheadline).foregroundStyle(.secondary)
                }.padding(.top, 8)
                if store.library.isDemo {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "sparkles")
                        Text("A sample bookshelf to explore. Your changes stay on this device.").font(.caption)
                    }.foregroundStyle(BooksTheme.accent).padding(14).frame(maxWidth: .infinity, alignment: .leading)
                        .background(BooksTheme.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                }
                HStack { Text("Reading progress").font(BooksTheme.display(22)); Spacer() }
                if store.reading.isEmpty {
                    ContentUnavailableView {
                        Label("Your next chapter awaits", systemImage: "book")
                    } description: { Text("Add a book or choose Reading from a book’s status menu.") }
                    actions: { Button("Add a book") { adding = true }.buttonStyle(.borderedProminent).foregroundStyle(BooksTheme.buttonInk) }
                }
                ForEach(store.reading) { book in
                    VStack(alignment: .leading, spacing: 20) {
                        NavigationLink {
                            BookDetailView(id: book.id)
                        } label: {
                            if textSize.isAccessibilitySize {
                                VStack(alignment: .leading, spacing: 20) { BookCover(book: book, width: 100); readingInfo(book) }
                            } else {
                                HStack(alignment: .center, spacing: 22) { BookCover(book: book, width: 110); readingInfo(book) }
                            }
                        }.buttonStyle(.plain).accessibilityIdentifier("reading-\(book.title)")
                        Button { logging = book } label: {
                            Label(book.status == .paused ? "Resume & log reading" : "Log reading", systemImage: "plus").font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 7)
                        }.buttonStyle(.borderedProminent).foregroundStyle(BooksTheme.buttonInk).buttonBorderShape(.roundedRectangle(radius: 9)).accessibilityIdentifier("log-\(book.title)")
                    }.paperCard()
                }
                HStack(alignment: .top, spacing: 24) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("\(store.weeklyPages)").font(.system(.largeTitle, design: .serif))
                        Text("pages in 7 days").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .leading, spacing: 5) {
                        Text("\(store.finishedThisYear)").font(.system(.largeTitle, design: .serif))
                        Text("books this year").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                }.foregroundStyle(BooksTheme.ink).paperCard()
                Text("One page is a good place to begin.").font(.system(.body, design: .serif)).italic().foregroundStyle(.secondary).frame(maxWidth: .infinity).padding(.bottom, 24)
            }.padding(.horizontal, 22)
        }.background(BooksTheme.paper)
        .navigationTitle("Reading").navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { Button("Preferences", systemImage: "slider.horizontal.3") { settings = true } }
            ToolbarItem(placement: .topBarTrailing) { Button("Add book", systemImage: "plus") { adding = true }.accessibilityIdentifier("add-book") }
        }
        .sheet(isPresented: $adding) { BookEditor() }
        .sheet(isPresented: $settings) { PreferencesView() }
        .sheet(item: $logging) { LogReadingView(book: $0) }
    }
    private func readingInfo(_ book: Book) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(text: book.shelf.isEmpty ? "CURRENTLY READING" : book.shelf)
            Text(book.title).font(BooksTheme.display(22)).foregroundStyle(BooksTheme.ink).fixedSize(horizontal: false, vertical: true)
            Text(book.author).font(.subheadline).foregroundStyle(.secondary)
            if book.status == .paused { Label("Paused", systemImage: "pause.circle").font(.caption).foregroundStyle(BooksTheme.accent) }
            ProgressView(value: book.progress).padding(.top, 6)
            Text("\(Int(book.progress * 100))% · \(book.pages - book.currentPage) pages left").font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct BookshelfView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dynamicTypeSize) private var textSize
    @State private var query = ""
    @State private var status: ReadingStatus?
    @State private var shelf = ""
    @State private var adding = false
    @State private var terminal = false
    @State private var managingShelves = false
    @State private var settings = false
    @State private var grid = false
    @State private var markMode = false
    @State private var selected: String?
    private var books: [Book] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return store.library.books.filter { book in
            (status == nil || book.status == status) && (shelf.isEmpty || book.shelfID == shelf) &&
            (term.isEmpty || "\(book.title) \(book.author) \(book.isbn)".localizedCaseInsensitiveContains(term))
        }
    }
    private var visibleShelves: [ShelfAppearance] {
        let regular = store.shelves.filter { item in (shelf.isEmpty || item.id == shelf) && (status == nil || books.contains(where: { $0.shelfID == item.id })) }
        let ids = Set(store.shelves.map(\.id))
        let unshelved = books.filter { $0.shelfID == nil || !ids.contains($0.shelfID!) }
        return regular + (shelf.isEmpty && !unshelved.isEmpty ? [ShelfAppearance(id: "", name: "Unshelved")] : [])
    }
    private func booksOnShelf(_ id: String) -> [Book] {
        let ids = Set(store.shelves.map(\.id))
        return books.filter { id.isEmpty ? $0.shelfID == nil || !ids.contains($0.shelfID!) : $0.shelfID == id }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 6) {
                        Eyebrow(text: "A WORLD BETWEEN THE PAGES")
                        Text("Bookshelf").font(BooksTheme.display(34, relativeTo: .largeTitle)).foregroundStyle(BooksTheme.ink).accessibilityAddTraits(.isHeader)
                    }
                    Spacer(minLength: 4)
                    Button { adding = true } label: { Image(systemName: "plus").font(.title3).frame(width: 44, height: 44) }
                        .buttonStyle(.borderedProminent).foregroundStyle(BooksTheme.buttonInk).buttonBorderShape(.roundedRectangle(radius: 9))
                        .accessibilityLabel("Add book").accessibilityIdentifier("add-book")
                }
                HStack(spacing: 10) {
                    Picker("Library view", selection: $grid) {
                        Label("Shelves", systemImage: "books.vertical").tag(false)
                        Label("Grid", systemImage: "square.grid.2x2").tag(true)
                    }.pickerStyle(.segmented).accessibilityIdentifier("library-view")
                    Button { markMode.toggle() } label: {
                        Label(markMode ? "Done" : "Mark read", systemImage: "checkmark.circle").font(.caption).frame(minHeight: 36)
                    }.buttonStyle(.bordered).tint(markMode ? BooksTheme.accent : BooksTheme.secondary)
                        .accessibilityLabel(markMode ? "Done marking" : "Mark read")
                        .accessibilityAddTraits(markMode ? .isSelected : [])
                }
                Button { settings = true } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle().stroke(BooksTheme.border, lineWidth: 4)
                            Circle().trim(from: 0, to: store.library.goalEnabled ? min(Double(store.finishedThisYear) / Double(store.library.yearlyGoal), 1) : 0)
                                .stroke(BooksTheme.library, style: StrokeStyle(lineWidth: 4, lineCap: .round)).rotationEffect(.degrees(-90))
                            Text("\(store.finishedThisYear)").font(.title3).foregroundStyle(BooksTheme.ink)
                        }.frame(width: 46, height: 46).accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 5) {
                            Text(store.library.goalEnabled ? "\(String(Calendar.current.component(.year, from: Date()))) reading goal" : "Choose a reading goal").font(.caption).foregroundStyle(BooksTheme.secondary)
                            Text(store.library.goalEnabled ? "\(store.finishedThisYear) read / \(max(0, store.library.yearlyGoal - store.finishedThisYear)) to go" : "Optional · set your own pace").font(.caption.weight(.medium)).foregroundStyle(BooksTheme.ink)
                        }
                        Spacer(minLength: 0)
                        Text("\(store.weeklyPages) pages\nthis week").font(.caption2).multilineTextAlignment(.trailing).foregroundStyle(BooksTheme.secondary)
                    }
                }.buttonStyle(.plain).accessibilityLabel("Edit reading goal")
                ScrollView(.horizontal) {
                    HStack(spacing: 3) {
                        filter("All", value: nil)
                        ForEach([ReadingStatus.reading, .want, .finished, .paused]) { filter($0.label, value: $0) }
                    }.padding(4)
                }.scrollIndicators(.hidden)
                    .background(BooksTheme.card, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(BooksTheme.border, lineWidth: 1))
                HStack {
                    Menu {
                        Button("All shelves") { shelf = "" }
                        ForEach(store.shelves) { item in Button(store.shelfLabel(item)) { shelf = item.id } }
                    } label: {
                        HStack { Text(shelf.isEmpty ? "All shelves · \(store.shelves.count)" : store.shelves.first { $0.id == shelf }.map(store.shelfLabel) ?? "Shelf removed"); Spacer(); Image(systemName: "chevron.down") }.font(.subheadline).frame(minHeight: 44)
                    }.foregroundStyle(BooksTheme.ink)
                    Text("\(books.count) of \(store.library.books.count) books").font(.caption).foregroundStyle(BooksTheme.secondary)
                }
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass").foregroundStyle(BooksTheme.secondary)
                    TextField("Title, author, or ISBN", text: $query).font(.subheadline).textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.search)
                        .accessibilityLabel("Search books").accessibilityIdentifier("book-search")
                    if !query.isEmpty { Button { query = "" } label: { Image(systemName: "xmark.circle.fill").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel("Clear search") }
                }.padding(.horizontal, 12).frame(minHeight: 44).background(BooksTheme.raised, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(BooksTheme.border, lineWidth: 1))
                if store.library.isDemo { Text("Sample library · saved on this device").font(.caption2).foregroundStyle(BooksTheme.secondary) }
                if !store.library.books.isEmpty { OnlineCoverControls() }
                if markMode { Text("Tap books to toggle Finished / Want to read.").font(.caption).foregroundStyle(BooksTheme.accent) }
                Button("Manage shelves", systemImage: "slider.horizontal.3") { managingShelves = true }.frame(minHeight: 44)
                if books.isEmpty && (grid || !query.isEmpty || visibleShelves.isEmpty) {
                    ContentUnavailableView("No books here yet", systemImage: "books.vertical", description: Text("Add a book or try a different search or filter."))
                    if !query.isEmpty || status != nil || !shelf.isEmpty {
                        Button("Clear filters") { query = ""; status = nil; shelf = "" }.frame(maxWidth: .infinity)
                    }
                } else if grid || !query.isEmpty {
                    LazyVGrid(columns: textSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.adaptive(minimum: 150), spacing: 16)], alignment: .center, spacing: 24) {
                        ForEach(books) { book in
                            Button { selectBook(book) } label: {
                                VStack(alignment: .leading, spacing: 10) {
                                    BookCover(book: book, width: 140).frame(maxWidth: .infinity)
                                    Text(book.title).font(.subheadline.weight(.medium)).foregroundStyle(BooksTheme.ink).lineLimit(3)
                                    Text(book.status.label).font(.caption).foregroundStyle(BooksTheme.library)
                                }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                            }.buttonStyle(.plain).accessibilityIdentifier("grid-\(book.title)")
                        }
                    }.padding(.vertical, 8)
                } else {
                    LazyVStack(spacing: 8) {
                        ForEach(visibleShelves) { item in
                            NativeShelf(name: item.id.isEmpty ? item.name : store.shelfLabel(item), books: booksOnShelf(item.id), markMode: markMode, select: selectBook, appearance: item)
                        }
                    }
                }
                Text("\(store.library.books.count) books · \(store.shelves.count) shelves · Countless places to go.")
                    .font(BooksTheme.display(13, relativeTo: .caption)).italic().foregroundStyle(BooksTheme.secondary).frame(maxWidth: .infinity).padding(.vertical, 12)
            }.padding(.horizontal, 16).padding(.top, 14).padding(.bottom, 24)
        }.scrollDismissesKeyboard(.interactively).background(BooksTheme.paper)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) { Image("kaizen-mark").resizable().frame(width: 24, height: 24); Text("Kaizen").font(BooksTheme.display(20)) }
                }
                ToolbarItem(placement: .topBarLeading) { Button("Open Apple II", systemImage: "desktopcomputer") { terminal = true } }
                ToolbarItem(placement: .topBarTrailing) { Button("Preferences", systemImage: "gearshape") { settings = true } }
            }
            .onChange(of: store.shelves.map(\.id)) { _, ids in if !shelf.isEmpty && !ids.contains(shelf) { shelf = "" } }
            .sheet(isPresented: $managingShelves) { ShelfManager() }
            .sheet(isPresented: $terminal) { RetroTerminal() }
            .sheet(isPresented: $adding) { BookEditor() }
            .sheet(isPresented: $settings) { PreferencesView() }
            .navigationDestination(item: $selected) { id in BookDetailView(id: id) }
    }
    private func selectBook(_ book: Book) {
        if markMode { store.setStatus(book.id, to: book.status == .finished ? .want : .finished) }
        else { selected = book.id }
    }
    private func filter(_ label: String, value: ReadingStatus?) -> some View {
        let count = store.library.books.filter { value == nil || $0.status == value }.count
        return Button { status = value } label: {
            HStack(spacing: 5) { Text(label); Text("\(count)").opacity(0.75) }.font(.caption)
                .padding(.horizontal, 10).frame(minHeight: 36)
                .background(status == value ? BooksTheme.library.opacity(0.14) : .clear, in: RoundedRectangle(cornerRadius: 6))
                .foregroundStyle(status == value ? BooksTheme.library : BooksTheme.secondary)
        }.buttonStyle(.plain).accessibilityAddTraits(status == value ? .isSelected : [])
    }
}
