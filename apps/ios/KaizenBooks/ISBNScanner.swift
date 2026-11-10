import SwiftUI
import VisionKit
import AVFoundation

struct ISBNScannerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL
    let onISBN: (String) -> Void
    @State private var ready = false
    @State private var message = "Checking camera availability…"
    @State private var settings = false
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("Point at the book’s ISBN barcode (978 or 979). Scanning stays on your device.")
                    .font(.subheadline).padding(.horizontal)
                if ready {
                    ISBNScanner { value in
                        ready = false; onISBN(value); dismiss()
                    } onError: { text in
                        ready = false; message = text
                    }
                    .accessibilityLabel("ISBN barcode camera")
                } else {
                    ContentUnavailableView("Scanner unavailable", systemImage: "barcode.viewfinder", description: Text(message))
                        .accessibilityIdentifier("scanner-unavailable")
                    if settings {
                        Button("Open camera settings") { openURL(URL(string: UIApplication.openSettingsURLString)!) }
                    }
                }
                Button("Enter ISBN manually") { dismiss() }.buttonStyle(.bordered).padding(.bottom)
            }.navigationTitle("Scan a book").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel scan") { dismiss() } } }
                .task { await prepare() }
                .onChange(of: scenePhase) { _, phase in
                    if phase != .active {
                        ready = false; message = "Camera paused. Close this sheet and scan again, or enter the ISBN manually."
                    }
                }
        }.onDisappear { ready = false }
    }
    @MainActor private func prepare() async {
        guard DataScannerViewController.isSupported else {
            message = "Live barcode scanning is unavailable on this device or simulator. Enter the ISBN manually instead."; return
        }
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        var allowed = status == .authorized
        if status == .notDetermined { allowed = await requestAccess() }
        guard !Task.isCancelled else { return }
        guard allowed else {
            settings = AVCaptureDevice.authorizationStatus(for: .video) == .denied
            message = "Camera access is off or restricted. You can still type an ISBN and look up the book."; return
        }
        guard DataScannerViewController.isAvailable else {
            message = "The camera is currently unavailable. Close this sheet and try again, or enter the ISBN manually."; return
        }
        ready = true
    }
    private func requestAccess() async -> Bool { await AVCaptureDevice.requestAccess(for: .video) }
}

private struct ISBNScanner: UIViewControllerRepresentable {
    let onISBN: (String) -> Void
    let onError: (String) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(onISBN: onISBN, onError: onError) }
    func makeUIViewController(context: Context) -> DataScannerViewController {
        let scanner = DataScannerViewController(recognizedDataTypes: [.barcode(symbologies: [.ean13])], qualityLevel: .balanced, recognizesMultipleItems: true, isHighFrameRateTrackingEnabled: false, isPinchToZoomEnabled: true, isGuidanceEnabled: true, isHighlightingEnabled: true)
        scanner.delegate = context.coordinator
        // Start after SwiftUI has attached the camera controller; teardown invalidates this callback.
        let coordinator = context.coordinator
        Task { @MainActor [weak scanner, weak coordinator] in
            await Task.yield()
            guard let scanner, let coordinator, !coordinator.finished else { return }
            do { try scanner.startScanning() }
            catch { coordinator.fail(scanner) }
        }
        return scanner
    }
    func updateUIViewController(_ controller: DataScannerViewController, context: Context) {}
    static func dismantleUIViewController(_ controller: DataScannerViewController, coordinator: Coordinator) {
        coordinator.finished = true; controller.stopScanning(); controller.delegate = nil
    }
    @MainActor final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        var finished = false
        let onISBN: (String) -> Void
        let onError: (String) -> Void
        init(onISBN: @escaping (String) -> Void, onError: @escaping (String) -> Void) { self.onISBN = onISBN; self.onError = onError }
        func dataScanner(_ scanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) { accept(allItems, scanner: scanner) }
        func dataScanner(_ scanner: DataScannerViewController, didUpdate updatedItems: [RecognizedItem], allItems: [RecognizedItem]) { accept(allItems, scanner: scanner) }
        func dataScanner(_ scanner: DataScannerViewController, didTapOn item: RecognizedItem) { accept([item], scanner: scanner) }
        func dataScanner(_ scanner: DataScannerViewController, becameUnavailableWithError error: DataScannerViewController.ScanningUnavailable) { fail(scanner) }
        private func accept(_ items: [RecognizedItem], scanner: DataScannerViewController) {
            guard !finished else { return }
            for item in items {
                if case .barcode(let barcode) = item, let raw = barcode.payloadStringValue, let isbn = ISBN.normalized(raw) {
                    finished = true; scanner.stopScanning(); onISBN(isbn); return
                }
            }
        }
        func fail(_ scanner: DataScannerViewController) {
            guard !finished else { return }
            finished = true; scanner.stopScanning()
            onError("Scanning was interrupted. Close this sheet and try again, or enter the ISBN manually.")
        }
    }
}
