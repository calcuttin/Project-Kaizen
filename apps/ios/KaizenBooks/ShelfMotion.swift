import SwiftUI

struct ShelfMotionPolicy {
    static func reduced(_ systemValue: Bool) -> Bool {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if args.contains("--ui-testing") && args.contains("--reduce-motion-fixture") { return true }
        #endif
        return systemValue
    }
    static func allowsMotion(enabled: Bool, reduced: Bool, active: Bool, visible: Bool) -> Bool { enabled && !reduced && active && visible }
}

/// Accumulated time stops when paused/backgrounded, so resuming does not jump ahead.
struct ShelfMotionClock {
    private var elapsed: TimeInterval = 0
    private var started: Date?
    mutating func setRunning(_ running: Bool, at date: Date) {
        if running && started == nil { started = date }
        else if !running, let start = started { elapsed += max(0, date.timeIntervalSince(start)); started = nil }
    }
    func angle(at date: Date) -> Double {
        let seconds = elapsed + (started.map { max(0, date.timeIntervalSince($0)) } ?? 0)
        return (seconds / 40 * 360).truncatingRemainder(dividingBy: 360)
    }
}

struct NativeOrrery: View {
    let moving: Bool
    @State private var clock = ShelfMotionClock()
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20, paused: !moving)) { context in
            GeometryReader { proxy in
                Image("cabinet-orrery-base").resizable().scaledToFit().frame(width: proxy.size.width, height: proxy.size.width)
                    .position(x: proxy.size.width / 2, y: proxy.size.height - proxy.size.width / 2)
                Image("cabinet-object-orrery").resizable().scaledToFit().frame(width: proxy.size.width, height: proxy.size.width)
                    .rotationEffect(.degrees(clock.angle(at: context.date)))
                    .rotation3DEffect(.degrees(56), axis: (x: 1, y: 0, z: 0), perspective: 0)
                    .position(x: proxy.size.width / 2, y: proxy.size.height * 0.25)
            }
        }.aspectRatio(0.9, contentMode: .fit).blendMode(.screen).accessibilityHidden(true)
            .onChange(of: moving, initial: true) { _, value in clock.setRunning(value, at: Date()) }
            .onDisappear { clock.setRunning(false, at: Date()) }
    }
}

struct CabinetLight: View {
    let appearance: ShelfAppearance
    let moving: Bool
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20, paused: !moving)) { context in
            let wave = moving ? sin(context.date.timeIntervalSinceReferenceDate * .pi / 6) * 0.025 : 0
            LinearGradient(colors: [appearance.lightColor.opacity((0.16 + wave) * appearance.brightness), .clear, .black.opacity(0.12)], startPoint: .top, endPoint: .bottom)
        }.allowsHitTesting(false).accessibilityHidden(true)
    }
}
