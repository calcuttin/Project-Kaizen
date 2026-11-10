import SwiftUI

struct ShelfManager: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var adding = false
    @State private var editing: ShelfAppearance?
    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(store.shelves) { shelf in
                        Button { editing = shelf } label: {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(store.shelfLabel(shelf)).foregroundStyle(BooksTheme.ink)
                                Text("\(store.library.books.filter { $0.shelfID == shelf.id }.count) books · \(shelf.spec.label)").font(.caption).foregroundStyle(.secondary)
                            }.frame(minHeight: 44)
                        }.accessibilityIdentifier("manage-shelf-\(shelf.id)")
                    }.onMove { offsets, destination in _ = store.moveShelves(from: offsets, to: destination) }
                    Button("Create shelf", systemImage: "plus") { adding = true }.frame(minHeight: 44)
                } footer: {
                    Text("Shelves keep their identity when renamed. Same-name shelves are numbered here so you can choose the right one. Removing a shelf keeps its books in Unshelved.")
                }
            }.navigationTitle("Manage shelves").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                    ToolbarItem(placement: .primaryAction) { EditButton() }
                }
                .sheet(isPresented: $adding) { ShelfEditor() }
                .sheet(item: $editing) { ShelfEditor(existing: $0) }
        }
    }
}

struct ShelfEditor: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let existing: ShelfAppearance?
    @State private var draft: ShelfAppearance
    @State private var removing = false
    init(existing: ShelfAppearance? = nil) {
        self.existing = existing
        _draft = State(initialValue: existing ?? ShelfAppearance(id: UUID().uuidString, name: ""))
    }
    private var valid: Bool { !draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && draft.name.count <= 120 }
    private func cabinet(_ key: String, fallback: String) -> Binding<String> {
        Binding(get: { draft.cabinet?.object?[key]?.string ?? fallback }, set: { value in
            var p = draft.cabinet?.object ?? [:]; p[key] = .string(value); draft.cabinet = .object(p)
        })
    }
    private func object(_ index: Int) -> Binding<String> {
        Binding(get: { draft.displayObjects.indices.contains(index) ? draft.displayObjects[index] : "none" }, set: { value in
            var list = draft.displayObjects; while list.count < 2 { list.append("none") }; list[index] = value; draft.objects = list
        })
    }
    private var brightness: Binding<Double> {
        Binding(get: { draft.brightness * 100 }, set: { value in
            var p = draft.cabinet?.object ?? [:]; p["brightness"] = .number(value.rounded()); draft.cabinet = .object(p)
        })
    }
    var body: some View {
        NavigationStack {
            Form {
                Section("Shelf") {
                    TextField("Shelf name", text: $draft.name).accessibilityIdentifier("shelf-name")
                    if draft.name.count > 120 { Text("Use up to 120 characters.").foregroundStyle(.red) }
                    Picker("Theme", selection: Binding(get: { draft.theme ?? "" }, set: { draft.theme = $0.isEmpty ? nil : $0 })) {
                        Text("Automatic from name").tag("")
                        ForEach(ShelfThemeSpec.themes.keys.sorted(), id: \.self) { key in Text(ShelfThemeSpec.themes[key]!.label).tag(key) }
                        if let key = draft.theme, ShelfThemeSpec.themes[key] == nil { Text("Saved theme: \(key)").tag(key) }
                    }
                }
                Section("Cabinet objects") {
                    ForEach(0..<2) { index in
                        Picker(index == 0 ? "Left object" : "Right object", selection: object(index)) {
                            ForEach(ShelfAppearance.objectNames.keys.sorted(), id: \.self) { key in Text(ShelfAppearance.objectNames[key]!).tag(key) }
                            let current = object(index).wrappedValue
                            if ShelfAppearance.objectNames[current] == nil { Text("Saved object: \(current)").tag(current) }
                        }
                    }
                    Button("Use theme’s objects") { draft.objects = nil }
                }
                Section("Cabinet atmosphere") {
                    Picker("Layout", selection: cabinet("layout", fallback: "layered")) {
                        Text("Layered").tag("layered"); Text("Balanced").tag("balanced")
                    }
                    Picker("Lighting", selection: cabinet("lighting", fallback: "warm")) {
                        Text("Gallery").tag("warm"); Text("Moonlight").tag("moonlight"); Text("Candlelit").tag("candle")
                    }
                    VStack(alignment: .leading) {
                        Text("Brightness · \(Int(brightness.wrappedValue))%")
                        Slider(value: brightness, in: 35...100, step: 1).accessibilityLabel("Cabinet brightness").accessibilityValue("\(Int(brightness.wrappedValue)) percent")
                    }
                }
                Section("Preview") {
                    NativeShelf(name: draft.name.isEmpty ? "New shelf" : draft.name, books: [], markMode: false, select: { _ in }, appearance: draft)
                        .listRowInsets(EdgeInsets()).accessibilityIdentifier("shelf-preview")
                }
                if let existing {
                    Section {
                        Button("Remove shelf", role: .destructive) { removing = true }
                    } footer: { Text("Its books will be kept in Unshelved. The change synchronizes to your shared account when connected.") }
                    .confirmationDialog("Remove \(existing.name)?", isPresented: $removing, titleVisibility: .visible) {
                        Button("Remove shelf, keep books", role: .destructive) { if store.removeShelf(existing) { dismiss() } }
                    }
                }
            }.navigationTitle(existing == nil ? "New shelf" : "Edit shelf").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save shelf") { if store.saveShelf(draft, replacing: existing) { dismiss() } }.disabled(!valid).accessibilityIdentifier("save-shelf")
                    }
                }
                .alert("Shelf not saved", isPresented: Binding(get: { store.errorMessage != nil }, set: { if !$0 { store.errorMessage = nil } })) {
                    Button("OK") { store.errorMessage = nil }
                } message: { Text(store.errorMessage ?? "") }
        }
    }
}
