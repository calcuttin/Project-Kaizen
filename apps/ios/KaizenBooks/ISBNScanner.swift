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
    func makeUIViewController(context: Context) -> CameraController {
        let scanner = DataScannerViewController(recognizedDataTypes: [.barcode(symbologies: [.ean13])], qualityLevel: .balanced, recognizesMultipleItems: true, isHighFrameRateTrackingEnabled: false, isPinchToZoomEnabled: true, isGuidanceEnabled: true, isHighlightingEnabled: true)
        scanner.delegate = context.coordinator
        return CameraController(scanner: scanner, coordinator: context.coordinator)
    }
    func updateUIViewController(_ controller: CameraController, context: Context) {}
    static func dismantleUIViewController(_ controller: CameraController, coordinator: Coordinator) {
        coordinator.finished = true; controller.scanner.stopScanning(); controller.scanner.delegate = nil
    }
    /// Start only after UIKit has presented the camera, rather than racing sheet creation.
    @MainActor final class CameraController: UIViewController {
        let scanner: DataScannerViewController
        let coordinator: Coordinator
        init(scanner: DataScannerViewController, coordinator: Coordinator) {
            self.scanner = scanner; self.coordinator = coordinator
            super.init(nibName: nil, bundle: nil)
        }
        required init?(coder: NSCoder) { fatalError("Storyboard initialization is unsupported") }
        override func viewDidLoad() {
            super.viewDidLoad()
            addChild(scanner)
            scanner.view.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(scanner.view)
            NSLayoutConstraint.activate([
                scanner.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                scanner.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                scanner.view.topAnchor.constraint(equalTo: view.topAnchor),
                scanner.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
            ])
            scanner.didMove(toParent: self)
        }
        override func viewDidAppear(_ animated: Bool) {
            super.viewDidAppear(animated)
            guard !coordinator.finished else { return }
            do { try scanner.startScanning() } catch { coordinator.fail(scanner) }
        }
        override func viewWillDisappear(_ animated: Bool) {
            scanner.stopScanning()
            super.viewWillDisappear(animated)
        }
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
