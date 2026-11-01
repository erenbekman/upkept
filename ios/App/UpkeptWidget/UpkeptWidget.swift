import AppIntents
import SwiftUI
import WidgetKit

private let appGroup = "group.com.erenbekman.upkept"


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


struct Snapshot: Decodable {
    struct Habit: Decodable, Hashable {
        var id: Int? = nil
        let name: String
        let icon: String?
        let color: String
        let streak: Int
        let log: [String: String]
        var days: Int? = nil
        var goal: Double? = nil
        var amount: Double? = nil

        init(name: String, icon: String?, color: String, streak: Int, log: [String: String]) {
            self.name = name; self.icon = icon; self.color = color; self.streak = streak; self.log = log
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decodeIfPresent(Int.self, forKey: .id)
            name = try c.decode(String.self, forKey: .name)
            icon = try c.decodeIfPresent(String.self, forKey: .icon)
            color = try c.decodeIfPresent(String.self, forKey: .color) ?? "#6d6fae"
            streak = try c.decodeIfPresent(Int.self, forKey: .streak) ?? 0
            log = try c.decodeIfPresent([String: String].self, forKey: .log) ?? [:]
            days = try c.decodeIfPresent(Int.self, forKey: .days)
            goal = try c.decodeIfPresent(Double.self, forKey: .goal)
            amount = try c.decodeIfPresent(Double.self, forKey: .amount)
        }

        private enum CodingKeys: String, CodingKey { case id, name, icon, color, streak, log, days, goal, amount }
    }
    struct Labels: Decodable {
        let today: String
        let dayN: String
        let done: String
        let allDone: String
        let empty: String
        let weekdays: [String]
        var day = "GÜN"
        var left = "{n} kaldı"
        var full = "%{n} dolu"

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
            weekdays = try c.decodeIfPresent([String].self, forKey: .weekdays) ?? ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]
            day = try c.decodeIfPresent(String.self, forKey: .day) ?? day
            left = try c.decodeIfPresent(String.self, forKey: .left) ?? left
            full = try c.decodeIfPresent(String.self, forKey: .full) ?? full
        }

        private enum CodingKeys: String, CodingKey { case today, dayN, done, allDone, empty, weekdays, day, left, full }
    }
    let date: String
    let locale: String
    let palette: String
    var accent = "#ff5a36"
    var mono = false
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
        accent = try c.decodeIfPresent(String.self, forKey: .accent) ?? accent
        mono = try c.decodeIfPresent(Bool.self, forKey: .mono) ?? false
        dayNo = try c.decodeIfPresent(Int.self, forKey: .dayNo)
        habits = try c.decodeIfPresent([Habit].self, forKey: .habits) ?? []
        labels = try c.decode(Labels.self, forKey: .labels)
    }

    private enum CodingKeys: String, CodingKey { case date, locale, palette, accent, mono, dayNo, habits, labels }

    static func load() -> Snapshot? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "snapshot"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }
}

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

    func weekday(_ d: Date) -> String {
        let i = (cal.component(.weekday, from: d) + 5) % 7
        return snap.labels.weekdays[safe: i] ?? ""
    }

    var doneToday: Int { habits.filter { status($0, today) == "done" }.count }
    var activeToday: Int { habits.filter { status($0, today) != "rest" }.count }
    var allDone: Bool { activeToday > 0 && doneToday == activeToday }

    var summary: String {
        if habits.isEmpty { return snap.labels.empty }
        if allDone { return snap.labels.allDone }
        return snap.labels.done
            .replacingOccurrences(of: "{done}", with: "\(doneToday)")
            .replacingOccurrences(of: "{total}", with: "\(activeToday)")
    }

    var number: String { "\(dayNo ?? cal.component(.day, from: today))" }

    func planned(_ h: Snapshot.Habit, _ d: Date) -> Bool {
        if status(h, d) != nil && status(h, d) != "rest" { return true }
        guard let days = h.days, days > 0 else { return true }
        let bit = 1 << (Calendar(identifier: .gregorian).component(.weekday, from: d) - 1)
        return days & bit != 0
    }

    var plannedToday: [Snapshot.Habit] { habits.filter { planned($0, today) } }

    func weight(_ h: Snapshot.Habit) -> Double {
        switch status(h, today) {
        case "done", "rest": return 1
        case "partial":
            if let g = h.goal, g > 0, let a = h.amount { return min(1, a / g) }
            return 0.5
        default: return 0
        }
    }

    var fraction: Double {
        let list = plannedToday
        guard !list.isEmpty else { return 0 }
        return list.reduce(0) { $0 + weight($1) } / Double(list.count)
    }

    var percent: Int { Int((fraction * 100).rounded()) }
    var left: Int { plannedToday.filter { status($0, today) == nil || status($0, today) == "partial" }.count }

    var fullLabel: String { snap.labels.full.replacingOccurrences(of: "{n}", with: "\(percent)") }
    var leftLabel: String { snap.labels.left.replacingOccurrences(of: "{n}", with: "\(left)") }

    func layers(_ p: Palette) -> [FillLayer] {
        let list = plannedToday
        guard !list.isEmpty else { return [] }
        return list.enumerated().map { i, h in
            let base = snap.mono ? p.accent : p.habit(h, i)
            return FillLayer(color: status(h, today) == "rest" ? base.opacity(0.35) : base, value: weight(h) / Double(list.count))
        }
    }

    func ratio(_ d: Date) -> Double {
        let active = habits.filter { status($0, d) != "rest" }
        guard !active.isEmpty else { return 0 }
        let score = active.reduce(0.0) { acc, h in
            switch status(h, d) {
            case "done": return acc + 1
            case "partial": return acc + 0.5
            default: return acc
            }
        }
        return score / Double(active.count)
    }
}


enum HabitStore {
    private static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    private static func json<T>(_ key: String, _ fallback: T) -> T {
        guard let s = defaults?.string(forKey: key),
              let v = try? JSONSerialization.jsonObject(with: Data(s.utf8)) as? T else { return fallback }
        return v
    }

    private static func save(_ value: Any, _ key: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: value) else { return }
        defaults?.set(String(decoding: data, as: UTF8.self), forKey: key)
    }

    static func toggle(habitId: Int, date: String) {
        var snap: [String: Any] = json("snapshot", [:])
        guard var habits = snap["habits"] as? [[String: Any]],
              let i = habits.firstIndex(where: { ($0["id"] as? Int) == habitId }),
              let day = dayFormatter.date(from: date) else { return }
        var h = habits[i]
        var log = h["log"] as? [String: String] ?? [:]
        let done = log[date] != "done"
        let bit = 1 << (Calendar(identifier: .gregorian).component(.weekday, from: day) - 1)
        let off = (h["days"] as? Int).map { $0 & bit == 0 } ?? false
        log[date] = done ? "done" : off ? "rest" : nil
        h["log"] = log
        h["streak"] = max(0, (h["streak"] as? Int ?? 0) + (done ? 1 : -1))
        habits[i] = h
        snap["habits"] = habits
        save(snap, "snapshot")

        var ops: [[String: Any]] = json("pending", [])
        ops.append(["habit_id": habitId, "date": date, "status": done ? "done" : "none"])
        save(ops, "pending")
    }
}

struct ToggleHabitIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle habit"
    static var isDiscoverable = false

    @Parameter(title: "Habit") var habitId: Int
    @Parameter(title: "Date") var date: String

    init() {}
    init(habitId: Int, date: String) {
        self.habitId = habitId
        self.date = date
    }

    func perform() async throws -> some IntentResult {
        HabitStore.toggle(habitId: habitId, date: date)
        return .result()
    }
}

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

    static let light = Palette(bg: Color(hex: "#ffffff"), ink: Color(hex: "#111114"), muted: Color(hex: "#62656e"),
                               track: Color(hex: "#e3e5ea"), accent: Color(hex: "#ff5a36"), streak: Color(hex: "#ff5a36"))
    static let dark = Palette(bg: Color(hex: "#1b1d22"), ink: Color(hex: "#f4f5f7"), muted: Color(hex: "#a3a7b0"),
                              track: Color(hex: "#2e3138"), accent: Color(hex: "#ff5a36"), streak: Color(hex: "#ff5a36"))

    func with(accent hex: String, _ scheme: ColorScheme) -> Palette {
        guard dots.isEmpty, bg != .clear else { return self }
        var p = self
        let c = hex.lowercased() == "#111114" && scheme == .dark ? Color(hex: "#f4f5f7") : Color(hex: hex)
        p = Palette(bg: bg, ink: ink, muted: muted, track: track, accent: c, streak: c, dots: dots)
        return p
    }
    static let purple = Palette(bg: Color(hex: "#6d6fae"), ink: .white, muted: .white.opacity(0.75),
                                track: .white.opacity(0.18), accent: .white, streak: .white, dots: [.white])
    static let mono = Palette(bg: .clear, ink: .primary, muted: .primary.opacity(0.62), track: .primary.opacity(0.16),
                              accent: .primary, streak: .primary, dots: [.primary])
    static let pastel = make("#e9faf9", "#1c1b19", 0.68, "#c9ecec", ["#ca6d6e", "#3a9da0"])
    static let bordo = make("#fff9f2", "#2b1015", 0.68, "#f3e6d5", ["#800020", "#d45060"])
    static let night = make("#010736", "#fcf1d0", 0.7, "#16224a", ["#fcf1d0", "#7997d6"])
    static let garden = make("#fff9d6", "#2a3320", 0.68, "#ffe2e2", ["#789053", "#b66f71"])
    static let forest = make("#123f36", "#e8dcc4", 0.72, "#1e5246", ["#e8dcc4", "#c49a45"])

    func habit(_ h: Snapshot.Habit, _ i: Int) -> Color { dots.isEmpty ? Color(hex: h.color) : dots[i % dots.count] }
}


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


struct HabitDot: View {
    let status: String?
    let color: Color
    let future: Bool
    let isToday: Bool
    let p: Palette

    var body: some View {
        Circle()
            .fill(fill)
            .widgetAccentable(status == "done" || status == "partial")
            .overlay {
                if status == "rest" && !future { Circle().strokeBorder(color.opacity(0.7), lineWidth: 1.5) }
            }
            .overlay {
                if isToday { Circle().strokeBorder(p.ink.opacity(0.4), lineWidth: 1).padding(-2) }
            }
    }

    private var fill: Color {
        if future { return p.track.opacity(0.45) }
        switch status {
        case "rest": return p.track
        case "done": return color
        case "partial": return color.opacity(0.42)
        default: return p.track
        }
    }
}

struct TodayCheck: View {
    let status: String?
    let color: Color
    let p: Palette

    var body: some View {
        if status == "done" {
            ZStack {
                Circle().fill(color).widgetAccentable()
                BrandMark().padding(3.5).foregroundStyle(.black).blendMode(.destinationOut)
            }
            .compositingGroup()
        } else {
            Circle()
                .fill(status == "partial" ? color.opacity(0.42) : .clear)
                .overlay { Circle().strokeBorder(status == "rest" ? color.opacity(0.7) : p.muted.opacity(0.7),
                                                 style: StrokeStyle(lineWidth: 1.5, dash: status == "rest" ? [] : [2.5, 2])) }
        }
    }
}

struct HabitRow<Content: View>: View {
    let habit: Snapshot.Habit
    let date: String
    @ViewBuilder let content: Content

    var body: some View {
        if let id = habit.id {
            Button(intent: ToggleHabitIntent(habitId: id, date: date)) { content }.buttonStyle(.plain)
        } else {
            content
        }
    }
}

struct DayDot: View {
    let ratio: Double
    let future: Bool
    let isToday: Bool
    let p: Palette

    private var level: Double { ratio >= 1 ? 1 : ratio >= 0.75 ? 0.72 : ratio >= 0.5 ? 0.48 : 0.26 }

    var body: some View {
        Circle()
            .fill(future ? p.track.opacity(0.45) : ratio == 0 ? p.track : p.accent.opacity(level))
            .widgetAccentable(!future && ratio > 0)
            .overlay {
                if isToday { Circle().strokeBorder(p.ink.opacity(0.4), lineWidth: 1).padding(-2) }
            }
    }
}


struct FillLayer {
    let color: Color
    let value: Double
}

struct FillDigits: View {
    let text: String
    let layers: [FillLayer]
    let empty: Color
    let size: CGFloat

    private var glyph: Text {
        Text(text).font(.system(size: size, weight: .black)).kerning(-size * 0.06)
    }

    var body: some View {
        glyph
            .foregroundStyle(empty)
            .lineLimit(1)
            .minimumScaleFactor(0.4)
            .overlay {
                GeometryReader { geo in
                    let h = geo.size.height
                    let glyphH = h * 0.6
                    VStack(spacing: 0) {
                        Spacer(minLength: 0)
                        ForEach(Array(layers.enumerated().reversed()), id: \.offset) { _, l in
                            Rectangle().fill(l.color).frame(height: max(0, glyphH * l.value))
                        }
                        Rectangle().fill(layers.first { $0.value > 0 }?.color ?? .clear).frame(height: h * 0.2)
                    }
                    .widgetAccentable()
                }
                .mask(glyph.lineLimit(1).minimumScaleFactor(0.4))
            }
    }
}

struct SmallView: View {
    let day: Day
    let p: Palette

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(day.dayNo == nil ? day.snap.labels.today.uppercased() : day.snap.labels.day)
                    .font(.system(size: 12, weight: .bold)).foregroundStyle(p.muted)
                Spacer(minLength: 4)
                Text(day.fullLabel).font(.system(size: 12, weight: .bold)).monospacedDigit()
                    .foregroundStyle(p.accent).widgetAccentable()
            }
            Spacer(minLength: 0)
            FillDigits(text: day.number, layers: day.layers(p), empty: p.track, size: day.number.count > 2 ? 64 : 92)
                .frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 0)
            Text(day.habits.isEmpty ? day.snap.labels.empty : "\(day.doneToday)/\(day.plannedToday.count) · \(day.leftLabel)")
                .font(.system(size: 12, weight: .semibold)).foregroundStyle(p.muted).lineLimit(1)
        }
    }
}

struct MediumView: View {
    let day: Day
    let p: Palette

    var body: some View {
        let rows = Array(day.plannedToday.prefix(4))
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                Text(day.title.uppercased()).font(.system(size: 12, weight: .bold)).foregroundStyle(p.muted).lineLimit(1)
                Spacer(minLength: 0)
                FillDigits(text: day.number, layers: day.layers(p), empty: p.track, size: day.number.count > 2 ? 62 : 90)
                Spacer(minLength: 0)
                Text(day.fullLabel).font(.system(size: 12, weight: .bold)).monospacedDigit()
                    .foregroundStyle(p.accent).widgetAccentable()
            }
            .frame(width: 128, alignment: .leading)
            if rows.isEmpty {
                Text(day.snap.labels.empty).font(.footnote.weight(.semibold)).foregroundStyle(p.muted)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(spacing: 6) {
                    ForEach(Array(rows.enumerated()), id: \.element) { i, h in
                        let st = day.status(h, day.today)
                        let color = day.snap.mono ? p.accent : p.habit(h, i)
                        HabitRow(habit: h, date: day.todayKey) {
                            HStack(spacing: 8) {
                                Text(h.name).font(.system(size: 13, weight: .semibold)).foregroundStyle(p.ink).lineLimit(1)
                                Spacer(minLength: 4)
                                ZStack {
                                    Circle().fill(st == "done" ? color : p.track)
                                    Text(st == "done" ? "✓" : st == "rest" ? "‖" : st == "partial" ? "~" : "+")
                                        .font(.system(size: 12, weight: .heavy))
                                        .foregroundStyle(st == "done" ? Color.white : p.ink)
                                }
                                .frame(width: 22, height: 22)
                                .widgetAccentable(st == "done")
                            }
                            .padding(.leading, 10).padding(.trailing, 5)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(p.track.opacity(0.55)))
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
}

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
                    HabitRow(habit: h, date: day.todayKey) {
                        VStack(alignment: .leading, spacing: 5) {
                            HStack {
                                Circle().fill(p.habit(h, i)).frame(width: 7, height: 7)
                                Text(h.name).font(.system(size: 12, weight: .semibold)).foregroundStyle(p.ink).lineLimit(1)
                                Spacer(minLength: 4)
                                Streak(n: h.streak, p: p)
                                TodayCheck(status: day.status(h, day.today), color: p.habit(h, i), p: p)
                                    .frame(width: 18, height: 18)
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
                        .contentShape(Rectangle())
                    }
                }
            }
            Spacer(minLength: 0)
        }
    }
}

struct BrandMark: View {
    var body: some View {
        Canvas { ctx, size in
            let k = min(size.width, size.height) / 60
            var arc = Path()
            arc.addArc(center: CGPoint(x: 30 * k, y: 30 * k), radius: 19 * k,
                       startAngle: .degrees(-25.2), endAngle: .degrees(11.9), clockwise: true)
            ctx.stroke(arc, with: .foreground, style: StrokeStyle(lineWidth: 6.5 * k, lineCap: .round))
            let r = 4.6 * k
            ctx.fill(Path(ellipseIn: CGRect(x: 47 * k - r, y: 14 * k - r, width: r * 2, height: r * 2)), with: .foreground)
        }
        .aspectRatio(1, contentMode: .fit)
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
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: -2) {
                FillDigits(text: day.number, layers: [FillLayer(color: .primary, value: day.fraction)],
                           empty: .primary.opacity(0.28), size: day.number.count > 2 ? 22 : 30)
                Text("\(day.doneToday)/\(day.plannedToday.count)").font(.system(size: 10, weight: .bold)).monospacedDigit()
            }
        }
    }
}

struct RectangularView: View {
    let day: Day

    var body: some View {
        HStack(spacing: 10) {
            FillDigits(text: day.number, layers: [FillLayer(color: .primary, value: day.fraction)],
                       empty: .primary.opacity(0.28), size: day.number.count > 2 ? 34 : 46)
            VStack(alignment: .leading, spacing: 1) {
                Text(day.title).font(.system(size: 14, weight: .bold)).lineLimit(1)
                Text("\(day.fullLabel) · \(day.leftLabel)").font(.system(size: 12, weight: .semibold)).lineLimit(1).opacity(0.8)
            }
            Spacer(minLength: 0)
        }
    }
}

struct UpkeptWidgetView: View {
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var scheme
    @Environment(\.widgetRenderingMode) var mode
    let entry: DayEntry

    var body: some View {
        let day = Day(snap: entry.snapshot ?? .empty, today: entry.date)
        let p = mode == .fullColor ? Palette.resolve(entry.theme, scheme, app: day.snap.palette).with(accent: day.snap.accent, scheme) : .mono
        Group {
            switch family {
            case .systemMedium: MediumView(day: day, p: p)
            case .systemLarge: LargeView(day: day, p: p)
            case .accessoryCircular: CircularView(day: day)
            case .accessoryRectangular: RectangularView(day: day)
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
        .description("Your day as one number that fills up.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular])
    }
}

extension Array {
    subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}


extension Snapshot {
    static let empty = Snapshot(
        date: key(.now), locale: "tr-TR", dayNo: nil, habits: [],
        labels: Labels(today: "Bugün", dayN: "Gün {n}", done: "{done}/{total} tamam", allDone: "Hepsi tamam",
                       empty: "Alışkanlık ekle", weekdays: ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"])
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
