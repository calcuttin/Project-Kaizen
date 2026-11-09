import SwiftUI
import ClerkKit
import ClerkKitUI

struct AccountRootView: View {
    @Environment(Clerk.self) private var clerk
    @Environment(\.scenePhase) private var scenePhase
    @State private var store: LibraryStore?
    @State private var localMode = false
    @State private var showAuth = false
    @State private var startupError: String?
    private var scope: String { clerk.isLoaded ? (clerk.session?.id ?? "signed-out") : "loading" }

    var body: some View {
        Group {
            if let store, store.owner == clerk.user?.id, clerk.isLoaded, clerk.session != nil {
                library(store)
            } else if localMode, let store, store.owner == nil {
                library(store)
            } else {
                VStack(spacing: 22) {
                    Image("kaizen-mark").resizable().frame(width: 64, height: 64)
                    Text("Your books, everywhere.").font(BooksTheme.display(32))
                    Text("Sign in with your Project Kaizen account to share books and reading progress with both websites.").multilineTextAlignment(.center).foregroundStyle(.secondary)
                    Button("Sign in or create account") { showAuth = true }
                        .buttonStyle(.borderedProminent).foregroundStyle(BooksTheme.buttonInk)
                    Button("Use my local library") { localMode = true; replaceStore(LibraryStore.live()) }
                    if !clerk.isLoaded { Text("Connecting to sign-in… You can still open your local library.").font(.caption).foregroundStyle(.secondary) }
                    if let startupError { Text(startupError).font(.caption).foregroundStyle(.secondary) }
                    Link("Open Bookshelf website", destination: URL(string: "https://kaizen-bookshelf.vercel.app")!)
                }.padding(28).frame(maxWidth: .infinity, maxHeight: .infinity).background(BooksTheme.paper)
            }
        }
        .sheet(isPresented: $showAuth) { AuthView() }
        .task(id: scope) {
            guard clerk.isLoaded else { return }
            guard let user = clerk.user, let session = clerk.session, session.user?.id == user.id else {
                if store?.owner != nil { replaceStore(nil); localMode = false }
                return
            }
            showAuth = false; localMode = false
            let owner = user.id, sessionID = session.id
            let next = LibraryStore.account(owner: owner)
            next.connect(SupabaseLibraryTransport(endpoint: CloudConfiguration.supabaseURL, publicKey: CloudConfiguration.supabaseKey) {
                guard clerk.user?.id == owner, clerk.session?.id == sessionID else { throw CloudError.signedOut }
                guard let token = try await session.getToken(),
                      clerk.user?.id == owner, clerk.session?.id == sessionID else { throw CloudError.signedOut }
                return token
            })
            replaceStore(next)
            while !Task.isCancelled {
                if scenePhase == .active { await next.syncNow() }
                do { try await Task.sleep(for: .seconds(15)) } catch { break }
            }
        }
        .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await store?.syncNow() } } }
        .onOpenURL { url in Task { do { try await clerk.handle(url) } catch { startupError = "Sign-in could not complete. Please try again." } } }
    }
    private func replaceStore(_ next: LibraryStore?) { store?.disconnect(); store = next }
    private func library(_ store: LibraryStore) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(store.syncLabel).font(.caption)
                Spacer()
                if store.owner == nil { Button("Connect account") { showAuth = true }.font(.caption) }
            }.padding(8).background(BooksTheme.card)
            BooksRootView().environment(store).id(store.owner ?? "local")
        }
        .alert("Library storage", isPresented: Binding(get: { store.errorMessage != nil }, set: { if !$0 { store.errorMessage = nil } })) {
            Button("OK") { store.errorMessage = nil }
        } message: { Text(store.errorMessage ?? "") }
    }
}

struct AccountPreferences: View {
    @Environment(Clerk.self) private var clerk
    @Environment(LibraryStore.self) private var store
    @State private var importing = false
    @State private var signingOut = false
    @State private var error: String?
    var body: some View {
        Section("Shared Kaizen account") {
            Text(store.syncLabel)
            if let syncError = store.syncError { Text(syncError).font(.caption).foregroundStyle(.secondary) }
            Button("Sync now") { Task { await store.syncNow() } }.disabled(store.isSyncing)
            if let date = store.library.cloud?.lastSyncedAt { LabeledContent("Last synchronized", value: date.formatted()) }
            if store.library.cloud?.importedLocal != true {
                Button("Import my local iPhone books") { importing = true }
                    .disabled(store.library.cloud?.lastSyncedAt == nil)
            }
            ForEach(store.conflicts) { conflict in
                VStack(alignment: .leading, spacing: 8) {
                    Text("Conflicting \(conflict.key.components(separatedBy: ":").first ?? "record")").font(.headline)
                    let local = store.library.cloud?.visible[conflict.key]?.payload
                    let remote = store.library.cloud?.records[conflict.key]?.payload
                    Text(local?["title"]?.string ?? local?["name"]?.string ?? "Reading record")
                    if let page = local?["currentPage"]?.int { Text("This phone: page \(page)") }
                    if let page = remote?["currentPage"]?.int { Text("Cloud: page \(page)") }
                    if remote == nil { Text("This record was deleted in the cloud.") }
                    Text("Choose which complete version to keep. No version is replaced automatically.").font(.caption)
                    Button("Use cloud version") { store.resolveConflict(conflict.key, keepLocal: false) }
                    Button("Keep this phone's version") { store.resolveConflict(conflict.key, keepLocal: true) }
                }
            }
            Link("Full Kaizen", destination: URL(string: "https://project-kaizen-gamma.vercel.app")!)
            Link("Bookshelf website", destination: URL(string: "https://kaizen-bookshelf.vercel.app")!)
            Button("Sign out") { signingOut = true }
            if let error { Text(error).font(.caption).foregroundStyle(.red) }
        }
        .confirmationDialog("Import local books into this account?", isPresented: $importing, titleVisibility: .visible) {
            Button("Import local books") {
                let local = LibraryStore.live()
                if local.readOnly { error = "The local library cannot be read. Its original file is preserved." }
                else { _ = store.importLocal(local.library) }
            }
        } message: {
            Text("Books and reading history are copied once into this account. Matching title/author pairs are skipped. Your original local file is kept. Sample libraries are not uploaded, and your cloud reading goal is retained.")
        }
        .confirmationDialog("Sign out of this iPhone?", isPresented: $signingOut, titleVisibility: .visible) {
            Button("Sign out") {
                Task {
                    do {
                        try await clerk.auth.signOut(sessionId: clerk.session?.id)
                        store.disconnect()
                    } catch { self.error = "Sign-out did not complete. Please try again." }
                }
            }
        } message: {
            Text("Unsent changes remain in this account's protected cache and resume when you sign back in. Signing out does not delete cloud books.")
        }
    }
}
