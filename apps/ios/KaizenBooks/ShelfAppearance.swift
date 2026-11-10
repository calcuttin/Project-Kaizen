import SwiftUI

/// Stable shelf identity and editable styling; cloud staging preserves unknown metadata.
struct ShelfAppearance: Codable, Identifiable, Equatable {
    var id: String
    var name: String
    var theme: String?
    var objects: [String]?
    var order = 0
    var cabinet: JSONValue?
    var spec: ShelfThemeSpec { ShelfThemeSpec.themes[theme ?? ""] ?? ShelfThemeSpec.inferred(name) }
    var displayObjects: [String] { Array((objects ?? spec.objects).prefix(2)) }
    var brightness: Double { Double(min(100, max(35, cabinet?.object?["brightness"]?.int ?? 85))) / 100 }
}

struct ShelfThemeSpec {
    let label: String
    let palette: [UInt32]
    let image: String
    let objects: [String]
    // Same labels, palette and artwork as themes.ts / cabinet.ts.
    static let themes: [String: ShelfThemeSpec] = [
        "research": ShelfThemeSpec(label: "Research & methods", palette: [0x23303a, 0x2c3d49, 0x293c39, 0x35413e, 0x373445, 0x1f2c36, 0x34414a, 0x263b30], image: "shelf-research", objects: ["typewriter", "orrery"]),
        "tech": ShelfThemeSpec(label: "Tech & founders", palette: [0x282b2e, 0x1e2020, 0x474a49, 0xd9d1bf, 0x181817, 0x683d34, 0x6c6b62, 0xe4dccb], image: "shelf-tech", objects: ["computer", "wafer"]),
        "business": ShelfThemeSpec(label: "Business & leadership", palette: [0x695133, 0x80613e, 0x2d3535, 0xad9264, 0x5e3d2e, 0x534326, 0x916b41, 0x232725], image: "shelf-study", objects: ["chessClock", "fountainPen"]),
        "thriller": ShelfThemeSpec(label: "Thrillers", palette: [0x742a2a, 0x1a1a1a, 0x9b2c2c, 0x2d2d2d, 0xc53030, 0x3d0c0c, 0x4a1c1c, 0x111111], image: "shelf-noir", objects: ["detectiveFolio", "compassMap"]),
        "espionage": ShelfThemeSpec(label: "Espionage & war", palette: [0x3f4a2f, 0x5c6b3f, 0x2b2f1e, 0x8a7a4a, 0x4b5320, 0x6b7048, 0xa08c5a, 0x2f3a2f], image: "shelf-espionage", objects: ["cipherMachine", "compassMap"]),
        "history": ShelfThemeSpec(label: "History & classics", palette: [0x8b5e3c, 0xb7791f, 0x7b341e, 0xd69e2e, 0x6b4423, 0x975a16, 0xa0522d, 0x5f370e], image: "shelf-history", objects: ["romanHelmet", "bust"]),
        "fantasy": ShelfThemeSpec(label: "Fantasy & sci-fi", palette: [0x44337a, 0x553c9a, 0x2c7a7b, 0x6b46c1, 0x1e3a5f, 0x805ad5, 0x234e52, 0x9f7aea], image: "shelf-fantasy", objects: ["dragon", "crystalD20"]),
        "gaming": ShelfThemeSpec(label: "Game worlds", palette: [0x1e3a8a, 0x7c2d12, 0xb45309, 0x1e40af, 0x3f3f46, 0xa16207, 0x0f766e, 0x581c87], image: "shelf-fantasy", objects: ["arcadeJoystick", "crystalD20"]),
        "networking": ShelfThemeSpec(label: "Networking & security", palette: [0x0b4f8a, 0x1c6fb5, 0x0a3d62, 0x155e75, 0x1e293b, 0x0e7490, 0x0f3d5c, 0x164e63], image: "shelf-tech", objects: ["networkSwitch", "computer"]),
        "literary": ShelfThemeSpec(label: "Fiction", palette: [0x4a5568, 0x805ad5, 0x2c7a7b, 0xc05621, 0x2b6cb0, 0xb83280, 0x276749, 0x975a16], image: "shelf-study", objects: ["typewriter", "fountainPen"]),
        "default": ShelfThemeSpec(label: "General", palette: [0x4a4e69, 0x22223b, 0x9a8c98, 0x4a5568, 0x2c5282, 0x744210, 0x22543d, 0x702459], image: "shelf-study", objects: ["compassMap", "lantern"]),
    ]
    static func inferred(_ name: String) -> ShelfThemeSpec {
        let patterns = [("office .*top|research|method", "research"), ("office .*middle|tech|founder", "tech"),
            ("office .*bottom|business|leader", "business"), ("living room .*1|thriller|clancy", "thriller"),
            ("living room .*2|living room .*3|spy|espionage|war", "espionage"), ("living room .*4|warcraft|game", "gaming"),
            ("living room .*5|rome|history|classic", "history"), ("living room .*6|cisco|network|ccnp|cissp", "networking"),
            ("fantasy|sci-?fi", "fantasy"), ("fiction|novel", "literary")]
        let key = patterns.first { name.range(of: $0.0, options: [.regularExpression, .caseInsensitive]) != nil }?.1 ?? "default"
        return themes[key]!
    }
}

extension ShelfAppearance {
    static let objectNames = ["orrery": "Solar system", "computer": "Apple II", "wafer": "Silicon wafer", "dragon": "Bronze dragon", "bust": "Marble bust", "lantern": "Reading lantern", "chessClock": "Chess clock", "cipherMachine": "Cipher machine", "romanHelmet": "Roman helmet", "detectiveFolio": "Detective folio", "networkSwitch": "Network switch", "fountainPen": "Fountain pen", "crystalD20": "Crystal D20", "compassMap": "Compass & map", "typewriter": "Typewriter", "arcadeJoystick": "Arcade joystick", "globe": "Antique globe", "hourglass": "Brass hourglass", "bonsai": "Bonsai pine", "fossil": "Ammonite fossil", "camera": "Vintage camera", "tea": "Celadon tea cup", "none": "Leave some space"]
    var lightColor: Color {
        switch cabinet?.object?["lighting"]?.string {
        case "moonlight": Color(hex: 0x9DBFE8)
        case "candle": Color(hex: 0xEBA34A)
        default: Color(hex: 0xFFE1AD)
        }
    }
}
