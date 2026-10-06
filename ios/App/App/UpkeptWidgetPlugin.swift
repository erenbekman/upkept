import Capacitor
import WidgetKit

@objc(UpkeptWidgetPlugin)
public class UpkeptWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UpkeptWidgetPlugin"
    public let jsName = "UpkeptWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
    ]

    @objc func update(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot") else {
            call.reject("snapshot missing")
            return
        }
        UserDefaults(suiteName: "group.com.erenbekman.upkept")?.set(snapshot, forKey: "snapshot")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
