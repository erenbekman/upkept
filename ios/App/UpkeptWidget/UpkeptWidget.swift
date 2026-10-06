import AppIntents
import SwiftUI
import WidgetKit

private let appGroup = "group.com.erenbekman.upkept"

// MARK: - Calendar helpers (weeks start on Monday, like the app's grid)

private let cal: Calendar = {
    var c = Calendar(identifier: .gregorian)
    c.firstWeekday = 2
    return c
}()

private let dayFormatter: DateFormatter = {
    let f = DateFormatter()
    f.calendar = cal
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

private func key(_ d: Date) -> String { dayFormatter.string(from: d) }
private func add(_ n: Int, to d: Date) -> Date { cal.date(byAdding: .day, value: n, to: d)! }
private func startOfWeek(_ d: Date) -> Date {
    cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: d))!
}

// MARK: - Data written by the app (composables/useWidget.ts)

struct Snapshot: Decodable {
    // Missing fields fall back to defaults so a snapshot written by an older
    // app build still renders until the app is next opened.
    struct Habit: Decodable, Hashable {
        let name: String
        let icon: String?
        let color: String
        let streak: Int
        let log: [String: String]

        init(name: String, icon: String?, color: String, streak: Int, log: [String: String]) {
            self.name = name; self.icon = icon; self.color = color; self.streak = streak; self.log = log
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            name = try c.decode(String.self, forKey: .name)
            icon = try c.decodeIfPresent(String.self, forKey: .icon)
            color = try c.decodeIfPresent(String.self, forKey: .color) ?? "#6d6fae"
            streak = try c.decodeIfPresent(Int.self, forKey: .streak) ?? 0
            log = try c.decodeIfPresent([String: String].self, forKey: .log) ?? [:]
        }

        private enum CodingKeys: String, CodingKey { case name, icon, color, streak, log }
    }
    struct Labels: Decodable {
        let today: String
        let dayN: String
        let done: String
        let allDone: String
        let empty: String
        let weekdays: [String]

        init(today: String, dayN: String, done: String, allDone: String, empty: String, weekdays: [String]) {
            self.today = today; self.dayN = dayN; self.done = done; self.allDone = allDone; self.empty = empty; self.weekdays = weekdays
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            today = try c.decodeIfPresent(String.self, forKey: .today) ?? "Bugün"
            dayN = try c.decodeIfPresent(String.self, forKey: .dayN) ?? "Gün {n}"
            done = try c.decodeIfPresent(String.self, forKey: .done) ?? "{done}/{total}"
            allDone = try c.decodeIfPresent(String.self, forKey: .allDone) ?? "✓"
            empty = try c.decodeIfPresent(String.self, forKey: .empty) ?? ""
            weekdays = try c.decodeIfPresent([String].self, forKey: .weekdays) ?? ["P", "S", "Ç", "P", "C", "C", "P"]
        }

        private enum CodingKeys: String, CodingKey { case today, dayN, done, allDone, empty, weekdays }
    }
    let date: String
    let locale: String
    let palette: String
    let dayNo: Int?
    let habits: [Habit]
    let labels: Labels

    init(date: String, locale: String, palette: String = "upkept", dayNo: Int?, habits: [Habit], labels: Labels) {
        self.date = date; self.locale = locale; self.palette = palette; self.dayNo = dayNo; self.habits = habits; self.labels = labels
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        date = try c.decode(String.self, forKey: .date)
        locale = try c.decodeIfPresent(String.self, forKey: .locale) ?? "tr-TR"
        palette = try c.decodeIfPresent(String.self, forKey: .palette) ?? "upkept"
        dayNo = try c.decodeIfPresent(Int.self, forKey: .dayNo)
        habits = try c.decodeIfPresent([Habit].self, forKey: .habits) ?? []
        labels = try c.decode(Labels.self, forKey: .labels)
    }

    private enum CodingKeys: String, CodingKey { case date, locale, palette, dayNo, habits, labels }

    static func load() -> Snapshot? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "snapshot"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }
}

/// The snapshot as seen on a given day — after midnight nothing is logged for
/// the new day yet, and the challenge counter moves on by itself.
struct Day {
    let snap: Snapshot
    let today: Date

    var todayKey: String { key(today) }
    var habits: [Snapshot.Habit] { snap.habits }

    var dayNo: Int? {
        guard let n = snap.dayNo, let written = dayFormatter.date(from: snap.date) else { return nil }
        return n + (cal.dateComponents([.day], from: written, to: cal.startOfDay(for: today)).day ?? 0)
    }

    var title: String {
        if let n = dayNo { return snap.labels.dayN.replacingOccurrences(of: "{n}", with: "\(n)") }
        return snap.labels.today
    }

    var monthTitle: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: snap.locale)
        f.setLocalizedDateFormatFromTemplate("LLLL yyyy")
        return f.string(from: today)
    }

    func status(_ h: Snapshot.Habit, _ d: Date) -> String? { h.log[key(d)] }

    /// Letter from the app's Monday-first list for any date.
    func weekday(_ d: Date) -> String {
        let i = (cal.component(.weekday, from: d) + 5) % 7
        return snap.labels.weekdays[safe: i] ?? ""
    }

    var doneToday: Int { habits.filter { status($0, today) == "done" }.count }
    var allDone: Bool { !habits.isEmpty && doneToday == habits.count }

    var summary: String {
        if habits.isEmpty { return snap.labels.empty }
        if allDone { return snap.labels.allDone }
        return snap.labels.done
            .replacingOccurrences(of: "{done}", with: "\(doneToday)")
            .replacingOccurrences(of: "{total}", with: "\(habits.count)")
    }

    /// 0…1 for one day across all habits; partial counts half.
    func ratio(_ d: Date) -> Double {
        guard !habits.isEmpty else { return 0 }
        let score = habits.reduce(0.0) { acc, h in
            switch status(h, d) {
            case "done": return acc + 1
            case "partial": return acc + 0.5
            default: return acc
            }
        }
        return score / Double(habits.count)
    }
}

// MARK: - Theme

enum WidgetTheme: String, AppEnum {
    case auto, light, dark, accent, pastel, bordo, night, garden, forest

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Theme"
    static var caseDisplayRepresentations: [WidgetTheme: DisplayRepresentation] = [
        .auto: "Automatic (app theme)",
        .light: "Light",
        .dark: "Dark",
        .accent: "upkept purple",
        .pastel: "Pastel",
        .bordo: "Burgundy",
        .night: "Night",
        .garden: "Garden",
        .forest: "Forest",
    ]
}

struct ThemeIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Appearance"
    @Parameter(title: "Theme", default: .auto) var theme: WidgetTheme
}

extension Color {
    init(hex: String) {
        var v: UInt64 = 0
        Scanner(string: hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))).scanHexInt64(&v)
        self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}

/// Mirrors the tokens in assets/main.css. The Color Hunt themes draw every
/// habit from their own colours in turn instead of the habit's colour.
struct Palette {
    let bg: Color
    let ink: Color
    let muted: Color
    let track: Color
    let accent: Color
    let streak: Color
    var dots: [Color] = []

    static func resolve(_ theme: WidgetTheme, _ scheme: ColorScheme, app: String) -> Palette {
        switch theme {
        case .accent: return .purple
        case .dark: return .dark
        case .light: return .light
        case .pastel: return .pastel
        case .bordo: return .bordo
        case .night: return .night
        case .garden: return .garden
        case .forest: return .forest
        case .auto:
            if let t = WidgetTheme(rawValue: app), t != .auto { return resolve(t, scheme, app: "") }
            return scheme == .dark ? .dark : .light
        }
    }

    private static func make(_ bg: String, _ ink: String, _ muted: Double, _ track: String, _ dots: [String], streak: String? = nil) -> Palette {
        let inkC = Color(hex: ink)
        return Palette(bg: Color(hex: bg), ink: inkC, muted: inkC.opacity(muted), track: Color(hex: track),
                       accent: Color(hex: dots[0]), streak: Color(hex: streak ?? dots[0]), dots: dots.map { Color(hex: $0) })
    }

    static let light = Palette(bg: Color(hex: "#f6f5f2"), ink: Color(hex: "#1c1b19"), muted: Color(hex: "#5f5c55"),
                               track: Color(hex: "#e4e1d9"), accent: Color(hex: "#6d6fae"), streak: Color(hex: "#c16e2d"))
    static let dark = Palette(bg: Color(hex: "#16161a"), ink: Color(hex: "#f2f2f4"), muted: Color(hex: "#9a9aa4"),
                              track: Color(hex: "#2c2d35"), accent: Color(hex: "#898abd"), streak: Color(hex: "#c16e2d"))
    // On the purple card every habit draws in white, like a single-ink print.
    static let purple = Palette(bg: Color(hex: "#6d6fae"), ink: .white, muted: .white.opacity(0.75),
                                track: .white.opacity(0.18), accent: .white, streak: .white, dots: [.white])
    static let pastel = make("#e9faf9", "#1c1b19", 0.68, "#c9ecec", ["#ca6d6e", "#3a9da0"])
    static let bordo = make("#fff9f2", "#2b1015", 0.68, "#f3e6d5", ["#800020", "#d45060"])
    static let night = make("#010736", "#fcf1d0", 0.7, "#16224a", ["#fcf1d0", "#7997d6"])
    static let garden = make("#fff9d6", "#2a3320", 0.68, "#ffe2e2", ["#789053", "#b66f71"])
    static let forest = make("#123f36", "#e8dcc4", 0.72, "#1e5246", ["#e8dcc4", "#c49a45"])

    func habit(_ h: Snapshot.Habit, _ i: Int) -> Color { dots.isEmpty ? Color(hex: h.color) : dots[i % dots.count] }
}

// MARK: - Timeline

struct DayEntry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot?
    let theme: WidgetTheme
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> DayEntry {
        DayEntry(date: .now, snapshot: .preview, theme: .auto)
    }

    func snapshot(for configuration: ThemeIntent, in context: Context) async -> DayEntry {
        DayEntry(date: .now, snapshot: Snapshot.load() ?? (context.isPreview ? .preview : nil), theme: configuration.theme)
    }

    // The app reloads the timeline on every change; the midnight entry only
    // moves the day on if the app is not opened.
    func timeline(for configuration: ThemeIntent, in context: Context) async -> Timeline<DayEntry> {
        let snap = Snapshot.load()
        let midnight = cal.startOfDay(for: add(1, to: .now))
        return Timeline(
            entries: [
                DayEntry(date: .now, snapshot: snap, theme: configuration.theme),
                DayEntry(date: midnight, snapshot: snap, theme: configuration.theme),
            ],
            policy: .after(add(1, to: midnight))
        )
    }
}

// MARK: - Dots

/// One day for one habit: filled when done, half-tone when partial, an empty
/// well otherwise. Future days are fainter wells.
struct HabitDot: View {
    let status: String?
    let color: Color
    let future: Bool
    let isToday: Bool
    let p: Palette

    var body: some View {
        Circle()
            .fill(fill)
            .overlay {
                if isToday { Circle().strokeBorder(p.ink.opacity(0.4), lineWidth: 1).padding(-2) }
            }
    }

    private var fill: Color {
        if future { return p.track.opacity(0.45) }
        switch status {
        case "done": return color
        case "partial": return color.opacity(0.42)
        default: return p.track
        }
    }
}

/// One day across all habits, in four clear steps rather than a smooth ramp —
/// at dot size a continuous shade reads as one colour.
struct DayDot: View {
    let ratio: Double
    let future: Bool
    let isToday: Bool
    let p: Palette

    private var level: Double { ratio >= 1 ? 1 : ratio >= 0.75 ? 0.72 : ratio >= 0.5 ? 0.48 : 0.26 }

    var body: some View {
        Circle()
            .fill(future ? p.track.opacity(0.45) : ratio == 0 ? p.track : p.accent.opacity(level))
            .overlay {
                if isToday { Circle().strokeBorder(p.ink.opacity(0.4), lineWidth: 1).padding(-2) }
            }
    }
}

// MARK: - Families

/// Five weeks, Monday-first; each dot is one day's overall completion.
struct SmallView: View {
    let day: Day
    let p: Palette

    var body: some View {
        let monday = startOfWeek(day.today)
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(day.title).font(.system(size: 17, weight: .semibold, design: .serif)).foregroundStyle(p.ink)
                Spacer(minLength: 4)
                Text("\(day.doneToday)/\(day.habits.count)")
                    .font(.system(size: 13, weight: .bold, design: .rounded)).monospacedDigit()
                    .foregroundStyle(day.allDone ? p.accent : p.muted)
            }
            Spacer(minLength: 10)
            Grid(horizontalSpacing: 5, verticalSpacing: 5) {
                ForEach(0..<5, id: \.self) { row in
                    GridRow {
                        ForEach(0..<7, id: \.self) { col in
                            let d = add((row - 4) * 7 + col, to: monday)
                            DayDot(ratio: day.ratio(d), future: d > day.today && !cal.isDate(d, inSameDayAs: day.today),
                                   isToday: cal.isDate(d, inSameDayAs: day.today), p: p)
                                .aspectRatio(1, contentMode: .fit)
                        }
                    }
                }
            }
        }
    }
}

/// The last seven days per habit (a rolling week never shows five empty
/// columns on a Tuesday), each habit in its own colour, with its streak.
struct MediumView: View {
    let day: Day
    let p: Palette

    var body: some View {
        let rows = Array(day.habits.prefix(4))
        let days = (0..<7).map { add($0 - 6, to: day.today) }
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(day.title).font(.system(size: 17, weight: .semibold, design: .serif)).foregroundStyle(p.ink)
                Text(day.summary).font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(day.allDone ? p.accent : p.muted).lineLimit(1)
                Spacer(minLength: 0)
            }
            Spacer(minLength: 6)
            if rows.isEmpty {
                Text(day.snap.labels.empty).font(.footnote.weight(.semibold)).foregroundStyle(p.muted)
                Spacer(minLength: 0)
            } else {
                GeometryReader { geo in
                    let nameW = geo.size.width * 0.34
                    let streakW: CGFloat = 30
                    let gap: CGFloat = 6
                    let rowGap: CGFloat = rows.count > 3 ? 5 : 8
                    let byWidth = (geo.size.width - nameW - streakW - gap * 8) / 7
                    let byHeight = (geo.size.height - 12 - rowGap * CGFloat(rows.count)) / CGFloat(rows.count)
                    let dot = max(8, min(20, byWidth, byHeight))
                    VStack(alignment: .leading, spacing: rowGap) {
                        HStack(spacing: gap) {
                            Spacer().frame(width: nameW)
                            ForEach(days, id: \.self) { d in
                                let today = cal.isDate(d, inSameDayAs: day.today)
                                Text(day.weekday(d)).font(.system(size: 9, weight: today ? .heavy : .bold))
                                    .foregroundStyle(today ? p.ink : p.muted).frame(width: dot)
                            }
                        }
                        ForEach(Array(rows.enumerated()), id: \.element) { i, h in
                            HStack(spacing: gap) {
                                Text(h.name).font(.system(size: 12, weight: .semibold)).foregroundStyle(p.ink)
                                    .lineLimit(1).frame(width: nameW, alignment: .leading)
                                ForEach(days, id: \.self) { d in
                                    HabitDot(status: day.status(h, d), color: p.habit(h, i), future: false,
                                             isToday: false, p: p)
                                        .frame(width: dot, height: dot)
                                }
                                Streak(n: h.streak, p: p).frame(width: streakW, alignment: .trailing)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                }
            }
        }
    }
}

/// The whole month per habit — the app's grid in miniature.
struct LargeView: View {
    let day: Day
    let p: Palette

    var body: some View {
        let first = cal.date(from: cal.dateComponents([.year, .month], from: day.today))!
        let count = cal.range(of: .day, in: .month, for: day.today)!.count
        let rows = Array(day.habits.prefix(6))
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(day.monthTitle).font(.system(size: 20, weight: .semibold, design: .serif)).foregroundStyle(p.ink)
                Spacer(minLength: 4)
                Text(day.title).font(.system(size: 13, weight: .bold)).foregroundStyle(p.muted)
            }
            Text(day.summary).font(.system(size: 12, weight: .semibold)).foregroundStyle(day.allDone ? p.accent : p.muted)
                .padding(.top, 2)
                .padding(.bottom, 18)
            if rows.isEmpty {
                Text(day.snap.labels.empty).font(.footnote.weight(.semibold)).foregroundStyle(p.muted)
            }
            VStack(alignment: .leading, spacing: rows.count > 4 ? 12 : 18) {
                ForEach(Array(rows.enumerated()), id: \.element) { i, h in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack {
                            Circle().fill(p.habit(h, i)).frame(width: 7, height: 7)
                            Text(h.name).font(.system(size: 12, weight: .semibold)).foregroundStyle(p.ink).lineLimit(1)
                            Spacer(minLength: 4)
                            Streak(n: h.streak, p: p)
                        }
                        HStack(spacing: 2.5) {
                            ForEach(0..<count, id: \.self) { n in
                                let d = add(n, to: first)
                                HabitDot(status: day.status(h, d), color: p.habit(h, i),
                                         future: d > day.today && !cal.isDate(d, inSameDayAs: day.today),
                                         isToday: cal.isDate(d, inSameDayAs: day.today), p: p)
                                    .aspectRatio(1, contentMode: .fit)
                            }
                        }
                    }
                }
            }
            Spacer(minLength: 0)
        }
    }
}

struct Streak: View {
    let n: Int
    let p: Palette

    var body: some View {
        if n > 0 {
            HStack(spacing: 2) {
                Image(systemName: "flame.fill").font(.system(size: 9, weight: .bold))
                Text("\(n)").font(.system(size: 11, weight: .bold, design: .rounded)).monospacedDigit()
            }
            .foregroundStyle(p.streak)
        } else {
            Text("–").font(.system(size: 11, weight: .bold)).foregroundStyle(p.muted.opacity(0.6))
        }
    }
}

struct CircularView: View {
    let day: Day

    var body: some View {
        Gauge(value: day.habits.isEmpty ? 0 : Double(day.doneToday) / Double(day.habits.count)) {
            Image(systemName: "checkmark")
        } currentValueLabel: {
            Text("\(day.doneToday)/\(day.habits.count)").font(.system(.body, design: .rounded).weight(.semibold))
        }
        .gaugeStyle(.accessoryCircularCapacity)
    }
}

struct UpkeptWidgetView: View {
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var scheme
    let entry: DayEntry

    var body: some View {
        let day = Day(snap: entry.snapshot ?? .empty, today: entry.date)
        let p = Palette.resolve(entry.theme, scheme, app: day.snap.palette)
        Group {
            switch family {
            case .systemMedium: MediumView(day: day, p: p)
            case .systemLarge: LargeView(day: day, p: p)
            case .accessoryCircular: CircularView(day: day)
            default: SmallView(day: day, p: p)
            }
        }
        .containerBackground(for: .widget) { p.bg }
    }
}

@main
struct UpkeptWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "UpkeptToday", intent: ThemeIntent.self, provider: Provider()) { entry in
            UpkeptWidgetView(entry: entry)
        }
        .configurationDisplayName("upkept")
        .description("Your days, one dot at a time.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular])
    }
}

extension Array {
    subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}

// MARK: - Sample data

extension Snapshot {
    static let empty = Snapshot(
        date: key(.now), locale: "tr-TR", dayNo: nil, habits: [],
        labels: Labels(today: "Bugün", dayN: "Gün {n}", done: "{done}/{total} tamam", allDone: "Hepsi tamam",
                       empty: "Alışkanlık ekle", weekdays: ["P", "S", "Ç", "P", "C", "C", "P"])
    )

    static var preview: Snapshot {
        func log(_ pattern: String) -> [String: String] {
            var out: [String: String] = [:]
            for (i, ch) in pattern.reversed().enumerated() {
                let s = ch == "d" ? "done" : ch == "p" ? "partial" : ch == "m" ? "missed" : nil
                if let s { out[key(add(-i, to: .now))] = s }
            }
            return out
        }
        return Snapshot(
            date: key(.now), locale: "tr-TR", dayNo: 70,
            habits: [
                Habit(name: "Su içmek", icon: "💧", color: "#06999a", streak: 9, log: log("dddpdddddddmdddddddpddddddddddddd")),
                Habit(name: "Yürüyüş", icon: "🚶", color: "#349d62", streak: 3, log: log("ddpdmddddpdddnddmdddpdmdddndd")),
                Habit(name: "Kitap okumak", icon: "📖", color: "#8c74cc", streak: 0, log: log("dpdmddpdnddpdmddpddnpddmdddn")),
            ],
            labels: empty.labels
        )
    }
}
