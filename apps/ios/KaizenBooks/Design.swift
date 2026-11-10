import SwiftUI
import CoreText

// Exact light/dark tokens from src/design/tokens.css.
enum BooksTheme {
    static let accent = Color(light: 0xC48A12, dark: 0xE8B04B)
    static let library = Color(light: 0x7C4FD6, dark: 0xBB9AF7)
    static let paper = Color(light: 0xF6F4EF, dark: 0x0F1115)
    static let card = Color(light: 0xFFFFFF, dark: 0x151820)
    static let raised = Color(light: 0xFBFAF7, dark: 0x1B1F29)
    static let ink = Color(light: 0x1A1A1F, dark: 0xEEF0F4)
    static let secondary = Color(light: 0x5B5F6B, dark: 0xA3A9B8)
    static let buttonInk = Color(light: 0xFFFFFF, dark: 0x1A1305)
    static let border = Color(light: 0xDDDCD8, dark: 0x2B2E35)
    static func display(_ size: CGFloat, relativeTo style: Font.TextStyle = .title) -> Font {
        .custom("Fraunces-Regular", size: size, relativeTo: style)
    }
    static func registerFonts() {
        for name in ["Fraunces", "Inter"] {
            if let url = Bundle.main.url(forResource: name, withExtension: "ttf", subdirectory: "Fonts") {
                CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
            }
        }
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255, opacity: 1)
    }
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { trait in UIColor(Color(hex: trait.userInterfaceStyle == .dark ? dark : light)) })
    }
}

struct PaperCard: ViewModifier {
    func body(content: Content) -> some View {
        content.padding(16).background(BooksTheme.card, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(BooksTheme.border, lineWidth: 1))
    }
}
extension View { func paperCard() -> some View { modifier(PaperCard()) } }

struct Eyebrow: View {
    var text: String
    var body: some View {
        Text(text.uppercased()).font(.custom("Inter-Regular", size: 10, relativeTo: .caption2)).tracking(2).foregroundStyle(BooksTheme.accent)
    }
}

struct BookCover: View {
    var book: Book
    var width: CGFloat = 120
    // Readable fallback while artwork loads or online covers are disabled/unavailable.
    private let colors: [UInt32] = [0x4A4E69, 0x22543D, 0x744210, 0x2C5282, 0x702459, 0x4A5568]
    var body: some View {
        ZStack(alignment: .leading) {
            Color(hex: colors[book.cover % colors.count])
            Rectangle().fill(.black.opacity(0.24)).frame(width: 7)
            VStack(alignment: .leading, spacing: 12) {
                Rectangle().fill(Color(hex: 0xD9C79A).opacity(0.5)).frame(height: 1)
                Text(book.title).font(BooksTheme.display(width * 0.16)).minimumScaleFactor(0.55).lineLimit(5)
                Spacer(minLength: 4)
                Text(book.author).font(.custom("Inter-Regular", size: width * 0.075, relativeTo: .caption)).lineLimit(2)
                Rectangle().fill(Color(hex: 0xD9C79A).opacity(0.5)).frame(height: 1)
            }.padding(width * 0.13).foregroundStyle(Color(hex: 0xF7FAFC))
        }
        .overlay { BookArtwork(book: book) }
        .frame(width: width, height: width * 1.48)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).stroke(.black.opacity(0.4), lineWidth: 1))
        .shadow(color: .black.opacity(0.35), radius: 5, x: 3, y: 5)
        .accessibilityHidden(true)
    }
}

struct BookRow: View {
    var book: Book
    var body: some View {
        HStack(spacing: 18) {
            BookCover(book: book, width: 58)
            VStack(alignment: .leading, spacing: 6) {
                Text(book.title).font(.headline).foregroundStyle(BooksTheme.ink)
                Text(book.author).font(.subheadline).foregroundStyle(BooksTheme.secondary)
                if book.status == .reading {
                    ProgressView(value: book.progress).tint(BooksTheme.library)
                    Text("Page \(book.currentPage) of \(book.pages)").font(.caption).foregroundStyle(BooksTheme.secondary)
                } else { Text(book.status.label).font(.caption).foregroundStyle(BooksTheme.library) }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
        }.padding(.vertical, 8).contentShape(Rectangle()).accessibilityElement(children: .combine)
    }
}

struct ShelfSpine: View {
    let book: Book
    let index: Int
    let theme: ShelfThemeSpec
    var body: some View {
        let hue = (book.hue ?? book.cover * 60) % 360
        let height: CGFloat = 180 + CGFloat(abs((hue * 7 + book.pages) % 36))
        let width = min(40, max(23, 18 + CGFloat(book.pages) / 28))
        ZStack {
            Color(hex: theme.palette[abs((hue + index * 3) % theme.palette.count)])
            BookArtwork(book: book, spine: true)
            Color.black.opacity(0.16)
            HStack(spacing: 0) {
                Color.white.opacity(0.16).frame(width: 3)
                Spacer()
                Color.black.opacity(0.35).frame(width: 5)
            }
            VStack(spacing: 0) {
                Rectangle().fill(Color(hex: 0xD9C79A).opacity(0.6)).frame(height: 1).padding(.top, 11)
                Spacer()
                Rectangle().fill(Color(hex: 0xD9C79A).opacity(0.6)).frame(height: 1).padding(.bottom, 11)
            }.padding(.horizontal, 4)
            Text(book.title).font(BooksTheme.display(12, relativeTo: .caption)).lineLimit(1).minimumScaleFactor(0.7)
                .frame(width: height - 42).rotationEffect(.degrees(90)).foregroundStyle(Color(hex: 0xF0E5CC))
                .shadow(color: .black, radius: 2)
            if book.status == .reading {
                RoundedRectangle(cornerRadius: 1).fill(BooksTheme.accent).frame(width: 4, height: 24).offset(y: height / 2 - 22)
            }
            if book.status == .finished {
                Image(systemName: "checkmark.circle.fill").font(.system(size: 13)).foregroundStyle(Color(hex: 0xE8B04B)).offset(y: height / 2 - 20)
            }
        }.frame(width: width, height: height).clipShape(RoundedRectangle(cornerRadius: 2))
            .overlay(RoundedRectangle(cornerRadius: 2).stroke(.black.opacity(0.55), lineWidth: 1))
            .rotationEffect(.degrees(book.status == .reading ? -3 : 0), anchor: .bottom)
            .padding(.horizontal, book.status == .reading ? 4 : 0)
            .accessibilityHidden(true)
    }
}

struct NativeShelf: View {
    let name: String
    let books: [Book]
    let markMode: Bool
    let select: (Book) -> Void
    var appearance: ShelfAppearance?
    @Environment(\.dynamicTypeSize) private var textSize
    @State private var terminal = false
    private var styling: ShelfAppearance { appearance ?? ShelfAppearance(id: name, name: name) }
    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline) {
                    Text(styling.spec.label).font(BooksTheme.display(17)).foregroundStyle(Color(hex: 0xDFBB73))
                    Text("\(books.count) books · \(books.filter { $0.status == .finished }.count) read").font(.caption2).foregroundStyle(Color(hex: 0xC2B8A5))
                    Spacer(minLength: 0)
                }.padding(.horizontal, 12).padding(.top, 12)
                Text(markMode ? "Tap a spine to mark read." : "Pick a spine. Step inside.")
                    .font(.caption2).foregroundStyle(Color(hex: 0xE2CFA7)).padding(.horizontal, 12)
                ScrollView(.horizontal) {
                    LazyHStack(alignment: .bottom, spacing: 3) {
                        ForEach(Array(books.enumerated()), id: \.element.id) { index, book in
                            Button { select(book) } label: { ShelfSpine(book: book, index: index, theme: styling.spec) }
                                .buttonStyle(.plain).accessibilityLabel("\(book.title), \(book.author), \(book.status.label)")
                                .accessibilityHint(markMode ? "Toggle finished status" : "Open book details")
                                .accessibilityIdentifier("shelf-\(book.title)")
                        }
                    }.frame(height: 232, alignment: .bottom).padding(.horizontal, 17).padding(.bottom, 14)
                }.scrollIndicators(.hidden)
            }
            .background {
                GeometryReader { proxy in
                    Image(styling.spec.image).resizable().scaledToFill().frame(width: proxy.size.width, height: proxy.size.height).clipped().overlay(.black.opacity(0.15))
                }
            }
            Text(name.uppercased()).font(.custom("Inter-Regular", size: 10, relativeTo: .caption2)).tracking(2)
                .foregroundStyle(Color(hex: 0x1C140E)).padding(.horizontal, 14).padding(.vertical, 4)
                .background(Color(hex: 0xB4965E), in: RoundedRectangle(cornerRadius: 2))
                .frame(maxWidth: .infinity).padding(.vertical, 5).background(Color(hex: 0x302113))
            ZStack(alignment: .bottom) {
                GeometryReader { proxy in
                    Image("cabinet-walnut").resizable().scaledToFill().frame(width: proxy.size.width, height: proxy.size.height).clipped()
                }
                HStack(alignment: .bottom, spacing: styling.cabinet?.object?["layout"]?.string == "balanced" ? 8 : -12) {
                    ForEach(Array(styling.displayObjects.enumerated()), id: \.offset) { index, object in
                        if object != "none" {
                            if object == "computer" {
                                Button { terminal = true } label: {
                                    Image("cabinet-object-computer").resizable().scaledToFit()
                                        .frame(maxWidth: index == 0 ? 170 : 135, maxHeight: index == 0 ? 190 : 155)
                                }.buttonStyle(.plain).accessibilityLabel("Open Apple II")
                                    .accessibilityHint("Open the BASIC playground").accessibilityIdentifier("apple-ii")
                            } else {
                                Image("cabinet-object-\(object)").resizable().scaledToFit()
                                    .frame(maxWidth: index == 0 ? 170 : 135, maxHeight: index == 0 ? 190 : 155)
                                    .blendMode(.screen).accessibilityHidden(true)
                            }
                        }
                    }
                }.opacity(0.35 + styling.brightness * 0.65).padding(.horizontal, 22).padding(.bottom, 26)
            }.frame(height: 260).clipped()
        }
        .overlay(Rectangle().stroke(Color(hex: 0x57412D), lineWidth: 2))
        .padding(4).background(Color(hex: 0x201710))
        .accessibilityElement(children: .contain).accessibilityLabel("\(name) bookshelf")
        .sheet(isPresented: $terminal) { RetroTerminal() }
    }
}
