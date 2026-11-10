import SwiftUI

struct RetroTerminal: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var console = BasicConsole()
    @State private var command = ""
    @FocusState private var focused: Bool
    private let phosphor = Color(red: 0.55, green: 1, blue: 0.65)
    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 8) {
                            ForEach(Array(console.output.enumerated()), id: \.offset) { _, line in
                                Text(line.isEmpty ? " " : line).frame(maxWidth: .infinity, alignment: .leading).textSelection(.enabled)
                            }
                            Color.clear.frame(height: 1).id("end")
                        }.padding()
                    }.onChange(of: console.output) { _, _ in proxy.scrollTo("end", anchor: .bottom) }
                }.background(.black, in: RoundedRectangle(cornerRadius: 12))
                HStack(alignment: .top) {
                    Text("]").padding(.top, 12).accessibilityHidden(true)
                    TextField("BASIC command", text: $command, axis: .vertical)
                        .lineLimit(1...3).textInputAutocapitalization(.never).autocorrectionDisabled()
                        .keyboardType(.asciiCapable).submitLabel(.send).focused($focused)
                        .padding(10).background(.black, in: RoundedRectangle(cornerRadius: 8))
                        .accessibilityIdentifier("basic-command").onSubmit(submit)
                        .onChange(of: command) { _, value in if value.count > 500 { command = String(value.prefix(500)) } }
                    Button("Send", action: submit).frame(minHeight: 44).disabled(command.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .accessibilityIdentifier("basic-send")
                }
                ViewThatFits(in: .horizontal) {
                    HStack { controls }
                    VStack(alignment: .leading) { controls }
                }
                Text("A bounded BASIC playground. Programs stay in this window. BOOKS only reads your library.")
                    .font(.caption).foregroundStyle(.white.opacity(0.8))
            }.font(.system(.body, design: .monospaced)).foregroundStyle(phosphor).padding()
                .background(Color(red: 0.04, green: 0.07, blue: 0.05))
                .navigationTitle("Apple II").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
                .toolbarBackground(.black, for: .navigationBar).toolbarColorScheme(.dark, for: .navigationBar)
                .tint(phosphor).preferredColorScheme(.dark)
        }
    }
    @ViewBuilder private var controls: some View {
        Button("Run") { console.execute("RUN", books: store.library.books) }.frame(minHeight: 44)
        Button("Load demo") { console = BasicConsole(); command = "" }.frame(minHeight: 44)
        Button("Commands") { console.execute("HELP", books: store.library.books) }.frame(minHeight: 44)
        HStack {
            Button("Previous command", systemImage: "arrow.up") { command = console.recall(-1); focused = true }
                .labelStyle(.iconOnly).frame(minWidth: 44, minHeight: 44).disabled(console.historyIndex == 0)
            Button("Next command", systemImage: "arrow.down") { command = console.recall(1); focused = true }
                .labelStyle(.iconOnly).frame(minWidth: 44, minHeight: 44).disabled(console.historyIndex == console.history.count)
        }
    }
    private func submit() { console.execute(command, books: store.library.books); command = "" }
}
