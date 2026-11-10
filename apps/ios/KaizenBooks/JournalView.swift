import SwiftUI

struct JournalView: View {
    @Environment(LibraryStore.self) private var store
    @State private var preferences = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Your reading year").font(BooksTheme.display(32)).foregroundStyle(BooksTheme.ink)
                if store.library.isDemo { Text("Sample reading activity · stored on this device").font(.caption).foregroundStyle(.secondary) }
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Eyebrow(text: "\(String(Calendar.current.component(.year, from: Date()))) READING GOAL")
                        Spacer()
                        Button("Edit") { preferences = true }.frame(minHeight: 44)
                    }
                    if store.library.goalEnabled {
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            Text("\(store.finishedThisYear)").font(.system(.largeTitle, design: .serif))
                            Text("of \(store.library.yearlyGoal) books").foregroundStyle(.secondary)
                        }
                        ProgressView(value: min(Double(store.finishedThisYear) / Double(store.library.yearlyGoal), 1))
                        if let daily = store.library.pagesPerDay, daily > 0 { Text("\(daily) pages a day to aim for").font(.subheadline).foregroundStyle(.secondary).accessibilityIdentifier("daily-goal-summary") }
                        Text(store.finishedThisYear >= store.library.yearlyGoal ? "A year of new perspectives. Goal reached." : "At your own pace. Every book counts.").font(.subheadline).foregroundStyle(.secondary)
                    } else {
                        Text("Read at your own pace.").font(.system(.title2, design: .serif))
                        Text("A goal is optional. You can set one whenever you like.").font(.subheadline).foregroundStyle(.secondary)
                    }
                }.paperCard()
                HStack {
                    Label("Last 7 days", systemImage: "leaf")
                    Spacer()
                    Text("\(store.weeklyPages) pages").bold().monospacedDigit()
                }.font(.subheadline).paperCard()
                HStack { Label("All time", systemImage: "books.vertical"); Spacer(); Text("\(store.allTimePages) pages").bold().monospacedDigit() }.font(.subheadline).paperCard()
                Text("Your reading journal").font(.system(.title2, design: .serif).weight(.semibold))
                if store.library.sessions.isEmpty {
                    ContentUnavailableView("A fresh page", systemImage: "text.book.closed", description: Text("Log your reading to see your sessions here."))
                } else {
                    ForEach(store.library.sessions.sorted { $0.date > $1.date }) { session in
                        NavigationLink { BookDetailView(id: session.bookID) } label: {
                        HStack(alignment: .top, spacing: 14) {
                            Image(systemName: "bookmark.fill").foregroundStyle(BooksTheme.accent).padding(12).background(BooksTheme.accent.opacity(0.08), in: Circle())
                            VStack(alignment: .leading, spacing: 6) {
                                Text(store.book(session.bookID)?.title ?? "Book").font(.headline)
                                Text(session.date, format: .dateTime.month(.abbreviated).day().hour().minute()).font(.caption).foregroundStyle(.secondary)
                                Text("\(session.pages) pages read").font(.subheadline).foregroundStyle(BooksTheme.accent)
                            }
                            Spacer(minLength: 0)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                        }.buttonStyle(.plain).accessibilityIdentifier("journal-\(session.bookID)")
                        Divider()
                    }
                }
            }.padding(22).padding(.bottom, 20)
        }.background(BooksTheme.paper).navigationTitle("Journal").navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $preferences) { PreferencesView() }
    }
}

struct PreferencesView: View {
    @AppStorage("booksAppearance") private var appearance = "dark"
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var enabled = false
    @State private var goal = 12
    @State private var daily = "0"
    @State private var baseline: ReadingGoalSettings?
    private var validDaily: Bool { Int(daily).map { (0...100_000).contains($0) } ?? false }
    @State private var clearing = false
    var body: some View {
        NavigationStack {
            Form {
                if store.owner != nil { AccountPreferences() }
                Section("Appearance") {
                    Picker("Theme", selection: $appearance) { Text("Dark · web default").tag("dark"); Text("Light").tag("light"); Text("System").tag("system") }
                }
                Section("Book covers") {
                    OnlineCoverControls()
                    Link("Cover artwork from Open Library", destination: URL(string: "https://openlibrary.org")!)
                }
                Section("Your reading year") {
                    Toggle("Set a reading goal", isOn: $enabled)
                    if enabled {
                        Stepper("\(goal) books this year", value: $goal, in: 1...500)
                        HStack { Text("Pages per day"); Spacer(); TextField("Pages per day", text: $daily).keyboardType(.numberPad).multilineTextAlignment(.trailing).frame(width: 100).accessibilityLabel("Pages per day").accessibilityIdentifier("daily-goal") }
                        Text("Daily page goal · 0 means no daily target. Up to 100,000 pages.").font(.caption).foregroundStyle(.secondary)
                    }
                }
                WebAccountTools()
                Section("About this prototype") {
                    LabeledContent("Project Kaizen", value: "Books for iPhone")
                    Text(store.owner == nil ? "You are using a local library. Connect your Kaizen account to synchronize, then explicitly import your personal local books." : "Books, shelves, notes, reading history and goals share your Kaizen account. Changes save on this phone first, then synchronize.").font(.footnote).foregroundStyle(.secondary)
                    Text("Add books by scanning an ISBN barcode on a supported iPhone or typing an ISBN. Lookup sends only the ISBN and your IP address to Open Library; camera images stay on the device.").font(.footnote).foregroundStyle(.secondary)
                    Text("Sample book titles are real; reading activity is fictional. Shelf themes and cabinet artwork match the Kaizen web app. Optional online covers come from Open Library; unavailable images keep a readable title cover. Use Manage shelves to create and style shelves, or open the Apple II to try BASIC.").font(.footnote).foregroundStyle(.secondary)
                }
                if store.library.isDemo {
                    Section {
                        Button("Start with an empty library", role: .destructive) { clearing = true }
                    } footer: { Text("Removes ALL books, notes, and sessions in this prototype, including anything you added while exploring the sample library.") }
                }
            }.navigationTitle("Make it your own").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button("Save") { if let count = Int(daily), store.setGoal(enabled: enabled, books: goal, pagesPerDay: count, replacing: baseline) { dismiss() } }.disabled(!validDaily) }
                }
                .onAppear { guard baseline == nil else { return }; baseline = store.goalSettings; enabled = store.library.goalEnabled; goal = store.library.yearlyGoal; daily = String(store.library.pagesPerDay ?? 0) }
                .confirmationDialog("Remove every book and start fresh?", isPresented: $clearing, titleVisibility: .visible) {
                    Button("Remove all prototype data", role: .destructive) { if store.clearDemo() { dismiss() } }
                } message: { Text("All prototype books, notes, sessions, and goals will be removed. Your web library is unaffected.") }
        }
    }
}
