import Capacitor
import WidgetKit

@objc(UpkeptWidgetPlugin)
public class UpkeptWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UpkeptWidgetPlugin"
    public let jsName = "UpkeptWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takePending", returnType: CAPPluginReturnPromise),
    ]

    private let defaults = UserDefaults(suiteName: "group.com.erenbekman.upkept")

    @objc func update(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot") else {
            call.reject("snapshot missing")
            return
        }
        defaults?.set(snapshot, forKey: "snapshot")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func takePending(_ call: CAPPluginCall) {
        let ops = defaults?.string(forKey: "pending") ?? "[]"
        defaults?.removeObject(forKey: "pending")
        call.resolve(["ops": ops])
    }
}
