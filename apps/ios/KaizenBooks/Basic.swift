import Foundation

/// A bounded, parsed BASIC playground. Never evaluates host code or writes library data.
enum Basic {
    enum Fault: String, Error { case syntax = "SYNTAX ERROR", type = "TYPE MISMATCH", zero = "DIVISION BY ZERO", overflow = "OVERFLOW", limit = "EXECUTION LIMIT — PROGRAM STOPPED", line = "UNDEFINED LINE", next = "NEXT WITHOUT FOR", loop = "FOR WITHOUT NEXT", quantity = "ILLEGAL QUANTITY" }
    enum Value: Equatable {
        case number(Double), string(String)
        var text: String { switch self { case .number(let n): n.rounded() == n && abs(n) < 1e15 ? String(format: "%.0f", n) : String(n); case .string(let s): s } }
        func number() throws -> Double { guard case .number(let n) = self else { throw Fault.type }; return n }
    }
    static let demo = [10: "FOR I = 1 TO 5", 20: "PRINT \"ONE SMALL STEP \"; I", 30: "NEXT I", 40: "PRINT \"WELCOME TO KAIZEN\""]
    static func match(_ pattern: String, _ text: String) -> [String]? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let m = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) else { return nil }
        return (0..<m.numberOfRanges).map { Range(m.range(at: $0), in: text).map { String(text[$0]) } ?? "" }
    }
    private struct Parser {
        let tokens: [String]
        let vars: [String: Value]
        var cursor = 0
        var peek: String { cursor < tokens.count ? tokens[cursor] : "" }
        mutating func expression(_ minimum: Int = 0) throws -> Value {
            guard cursor < tokens.count else { throw Fault.syntax }
            let token = tokens[cursor]; cursor += 1
            var value: Value
            if token == "(" {
                value = try expression(); guard peek == ")" else { throw Fault.syntax }; cursor += 1
            } else if token == "-" || token == "+" {
                value = .number(try expression(4).number() * (token == "-" ? -1 : 1))
            } else if token.hasPrefix("\"") { value = .string(String(token.dropFirst().dropLast()).replacingOccurrences(of: "\"\"", with: "\"")) }
            else if let n = Double(token) { value = .number(n) }
            else if Basic.match("^[A-Z][A-Z0-9]*\\$?$", token) != nil { value = vars[token.uppercased()] ?? (token.hasSuffix("$") ? .string("") : .number(0)) }
            else { throw Fault.syntax }
            while let precedence = ["+": 1, "-": 1, "*": 2, "/": 2, "^": 3][peek], precedence >= minimum {
                let op = peek; cursor += 1
                let rhs = try expression(precedence + (op == "^" ? 0 : 1))
                if op == "+", case .string(let a) = value, case .string(let b) = rhs {
                    guard a.utf8.count + b.utf8.count <= 4096 else { throw Fault.limit }
                    value = .string(a + b)
                } else {
                    let a = try value.number(), b = try rhs.number()
                    if op == "/" && b == 0 { throw Fault.zero }
                    let n = op == "+" ? a + b : op == "-" ? a - b : op == "*" ? a * b : op == "/" ? a / b : pow(a, b)
                    guard n.isFinite else { throw Fault.overflow }; value = .number(n)
                }
            }
            if case .number(let n) = value, !n.isFinite { throw Fault.overflow }
            return value
        }
    }
    static func expression(_ source: String, vars: [String: Value] = [:]) throws -> Value {
        guard source.utf8.count <= 4096 else { throw Fault.limit }
        var rest = source.trimmingCharacters(in: .whitespacesAndNewlines), tokens: [String] = []
        while !rest.isEmpty {
            guard tokens.count < 128 else { throw Fault.limit }
            guard let m = match(#"^("(?:[^"]|"")*"|\d+(?:\.\d*)?|\.\d+|[A-Z][A-Z0-9]*\$?|[()+\-*/^])"#, rest) else { throw Fault.syntax }
            tokens.append(m[0]); rest = String(rest.dropFirst(m[0].count)).trimmingCharacters(in: .whitespacesAndNewlines)
        }
        var parser = Parser(tokens: tokens, vars: vars)
        let value = try parser.expression()
        guard parser.cursor == tokens.count else { throw Fault.syntax }
        return value
    }
    private static func printText(_ source: String, vars: [String: Value]) throws -> String {
        var chunk = "", output = "", quoted = false, depth = 0
        for c in source {
            if c == "\"" { quoted.toggle() }
            if !quoted && c == "(" { depth += 1 }
            if !quoted && c == ")" { depth -= 1 }
            if !quoted && depth == 0 && (c == ";" || c == ",") {
                if !chunk.trimmingCharacters(in: .whitespaces).isEmpty { output += try expression(chunk, vars: vars).text }
                if c == "," { output += "    " }; chunk = ""
            } else { chunk.append(c) }
            guard output.utf8.count <= 4096 else { throw Fault.limit }
        }
        if !chunk.trimmingCharacters(in: .whitespaces).isEmpty { output += try expression(chunk, vars: vars).text }
        guard output.utf8.count <= 4096 else { throw Fault.limit }
        return output
    }
    static func run(_ program: [Int: String], initial: [String: Value] = [:]) -> (output: [String], vars: [String: Value]) {
        let lines = program.sorted { $0.key < $1.key }
        var output: [String] = [], vars = initial, pc = 0, steps = 0
        var loops: [(variable: String, end: Double, step: Double, start: Int)] = []
        func jump(_ raw: String) throws -> Int {
            guard let n = Int(raw), let i = lines.firstIndex(where: { $0.key == n }) else { throw Fault.line }; return i
        }
        do {
            guard lines.count <= 500 else { throw Fault.limit }
            while pc < lines.count {
                steps += 1
                guard steps <= 1000, output.count < 300, lines[pc].value.utf8.count <= 4096 else { throw Fault.limit }
                let code = lines[pc].value.trimmingCharacters(in: .whitespacesAndNewlines)
                if code.isEmpty || match(#"^REM(?:\s|$)"#, code) != nil { pc += 1; continue }
                if match("^(END|STOP)$", code) != nil { break }
                if let m = match(#"^(?:PRINT\b|\?)(.*)$"#, code) { output.append(try printText(m[1], vars: vars)) }
                else if let m = match(#"^(?:LET\s+)?([A-Z][A-Z0-9]*\$?)\s*=\s*(.+)$"#, code) {
                    let key = m[1].uppercased(), value = try expression(m[2], vars: vars)
                    if case .string = value { guard key.hasSuffix("$") else { throw Fault.type } }
                    else { guard !key.hasSuffix("$") else { throw Fault.type } }
                    guard vars[key] != nil || vars.count < 128 else { throw Fault.limit }; vars[key] = value
                } else if let m = match(#"^GOTO\s+(\d+)$"#, code) { pc = try jump(m[1]); continue }
                else if let m = match(#"^IF\s+(.+?)\s*(<>|<=|>=|=|<|>)\s*(.+?)\s+THEN\s+(?:GOTO\s+)?(\d+)$"#, code) {
                    let a = try expression(m[1], vars: vars), b = try expression(m[3], vars: vars)
                    let compare: Int
                    switch (a, b) {
                    case (.number(let x), .number(let y)): compare = x == y ? 0 : x < y ? -1 : 1
                    case (.string(let x), .string(let y)): compare = x == y ? 0 : x < y ? -1 : 1
                    default: throw Fault.type
                    }
                    let yes = m[2] == "=" ? compare == 0 : m[2] == "<>" ? compare != 0 : m[2] == "<" ? compare < 0 : m[2] == ">" ? compare > 0 : m[2] == "<=" ? compare <= 0 : compare >= 0
                    if yes { pc = try jump(m[4]); continue }
                } else if let m = match(#"^FOR\s+([A-Z][A-Z0-9]*)\s*=\s*(.+?)\s+TO\s+(.+?)(?:\s+STEP\s+(.+))?$"#, code) {
                    let key = m[1].uppercased(), start = try expression(m[2], vars: vars).number(), end = try expression(m[3], vars: vars).number()
                    let step = try expression(m[4].isEmpty ? "1" : m[4], vars: vars).number()
                    guard step != 0 else { throw Fault.quantity }
                    guard loops.count < 32, vars[key] != nil || vars.count < 128 else { throw Fault.limit }
                    vars[key] = .number(start)
                    if step > 0 ? start > end : start < end {
                        var nested = 1; pc += 1
                        while pc < lines.count && nested > 0 {
                            let inner = lines[pc].value.trimmingCharacters(in: .whitespacesAndNewlines)
                            if match(#"^FOR\s"#, inner) != nil { nested += 1 }
                            if match(#"^NEXT(?:\s|$)"#, inner) != nil { nested -= 1 }
                            if nested > 0 { pc += 1 }
                        }
                        guard nested == 0 else { throw Fault.loop }
                    } else { loops.append((key, end, step, pc)) }
                } else if let m = match(#"^NEXT(?:\s+([A-Z][A-Z0-9]*))?$"#, code) {
                    guard let loop = loops.last, m[1].isEmpty || m[1].uppercased() == loop.variable else { throw Fault.next }
                    let n = try (vars[loop.variable] ?? .number(0)).number() + loop.step
                    guard n.isFinite else { throw Fault.overflow }; vars[loop.variable] = .number(n)
                    if loop.step > 0 ? n <= loop.end : n >= loop.end { pc = loop.start + 1; continue }
                    loops.removeLast()
                } else { throw Fault.syntax }
                pc += 1
            }
            if !loops.isEmpty && pc >= lines.count { throw Fault.loop }
        } catch { output.append("?\((error as? Fault)?.rawValue ?? "ERROR")\(pc < lines.count ? " IN \(lines[pc].key)" : "")") }
        return (output, vars)
    }
}

struct BasicConsole {
    static let boot = ["APPLE II · KAIZEN EDITION", "A SMALL BASIC PLAYGROUND", "TYPE HELP FOR COMMANDS, OR RUN FOR A DEMO."]
    static let help = ["PRINT \"HELLO\"; 2 + 2", "LET N = 10 · LET A$ = \"KAIZEN\"", "10 PRINT \"HELLO\" — add a line; 10 alone deletes it", "LIST · RUN · NEW", "FOR I = 1 TO 5 · NEXT I", "GOTO 10 · IF N > 0 THEN 10 · END", "HOME / CLEAR — clear screen", "BOOKS / CATALOG — read-only library list", "HELP — commands", "Programs stay in this window only. Up/down buttons recall commands."]
    var program = Basic.demo
    var vars: [String: Basic.Value] = [:]
    var output = boot
    var history: [String] = []
    private(set) var historyIndex = 0
    mutating func recall(_ delta: Int) -> String {
        historyIndex = min(history.count, max(0, historyIndex + delta))
        return historyIndex == history.count ? "" : history[historyIndex]
    }
    mutating func execute(_ source: String, books: [Book]) {
        let text = source.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        guard text.count <= 500 else { output.append("?INPUT LIMIT — 500 CHARACTERS"); return }
        history = Array((history + [text]).suffix(50)); historyIndex = history.count
        output.append("] \(text)")
        defer { output = Array(output.suffix(400)) }
        if let m = Basic.match(#"^(\d+)(?:\s+(.*))?$"#, text) {
            guard let n = Int(m[1]), (1...63999).contains(n) else { output.append("?INVALID LINE NUMBER"); return }
            guard m[2].isEmpty || program[n] != nil || program.count < 500 else { output.append("?PROGRAM LIMIT — 500 LINES"); return }
            program[n] = m[2].isEmpty ? nil : m[2]; return
        }
        switch text.uppercased() {
        case "HELP": output += Self.help
        case "HOME", "CLEAR": output = []
        case "NEW": program = [:]; vars = [:]; output.append("NEW PROGRAM")
        case "LIST": output += program.sorted { $0.key < $1.key }.map { "\($0.key) \($0.value)" }
        case "BOOKS", "CATALOG": output += ["\(books.count) BOOKS"] + books.prefix(30).map { String("\($0.title) — \($0.author)".prefix(500)) }
        case "RUN":
            if program.isEmpty { output.append("NO PROGRAM. ADD A NUMBERED LINE FIRST.") }
            else { let result = Basic.run(program); output += result.output; vars = result.vars }
        default: let result = Basic.run([1: text], initial: vars); output += result.output; vars = result.vars
        }
    }
}
