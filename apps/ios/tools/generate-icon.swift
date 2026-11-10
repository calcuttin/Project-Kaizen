// Run from apps/ios: swift tools/generate-icon.swift [output.png] [size]
// Approved direction: an open book inside Project Kaizen's broken amber ring.
// Draw vector paths directly: NSImage's SVG loading previously produced a blank icon.
import AppKit

let arguments = CommandLine.arguments
let output = arguments.count > 1 ? arguments[1] : "KaizenBooks/Assets.xcassets/AppIcon.appiconset/AppIcon.png"
let pixels = arguments.count > 2 ? Int(arguments[2])! : 1024
precondition(pixels > 0)
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let context = CGContext(
    data: nil, width: pixels, height: pixels, bitsPerComponent: 8,
    bytesPerRow: pixels * 4, space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
)!
context.scaleBy(x: CGFloat(pixels) / 1024, y: CGFloat(pixels) / 1024)
// Use top-left coordinates for the artwork. iOS supplies the outer corner mask.
context.translateBy(x: 0, y: 1024)
context.scaleBy(x: 1, y: -1)
context.setFillColor(CGColor(colorSpace: colorSpace, components: [15.0/255, 17.0/255, 21.0/255, 1])!)
context.fill(CGRect(x: 0, y: 0, width: 1024, height: 1024))
context.setStrokeColor(CGColor(colorSpace: colorSpace, components: [232.0/255, 176.0/255, 75.0/255, 1])!)
context.setLineCap(.round)
context.setLineJoin(.round)

// Match the parent mark's upper-left opening, with ample home-screen safe area.
context.setLineWidth(52)
context.addArc(center: CGPoint(x: 512, y: 512), radius: 320,
               startAngle: -.pi / 2, endAngle: .pi, clockwise: false)
context.strokePath()

// Two open pages, one center fold; no fine details that disappear at small sizes.
context.setLineWidth(32)
context.move(to: CGPoint(x: 370, y: 420))
context.addCurve(to: CGPoint(x: 512, y: 438), control1: CGPoint(x: 412, y: 397), control2: CGPoint(x: 466, y: 408))
context.addCurve(to: CGPoint(x: 654, y: 420), control1: CGPoint(x: 558, y: 408), control2: CGPoint(x: 612, y: 397))
context.addLine(to: CGPoint(x: 654, y: 598))
context.addCurve(to: CGPoint(x: 512, y: 616), control1: CGPoint(x: 612, y: 575), control2: CGPoint(x: 558, y: 586))
context.addCurve(to: CGPoint(x: 370, y: 598), control1: CGPoint(x: 466, y: 586), control2: CGPoint(x: 412, y: 575))
context.closePath()
context.strokePath()
context.move(to: CGPoint(x: 512, y: 438))
context.addLine(to: CGPoint(x: 512, y: 616))
context.strokePath()

let bitmap = NSBitmapImageRep(cgImage: context.makeImage()!)
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: output))
print("Generated \(pixels)×\(pixels) opaque Bookshelf icon: \(output)")
