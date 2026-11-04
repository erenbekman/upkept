import Capacitor
import CoreMotion
import UIKit

@objc(UpkeptMotionPlugin)
public class UpkeptMotionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UpkeptMotionPlugin"
    public let jsName = "UpkeptMotion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private let motion = CMMotionManager()

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            if self.motion.isDeviceMotionAvailable && !self.motion.isDeviceMotionActive {
                self.motion.deviceMotionUpdateInterval = 1.0 / 30
                self.motion.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
                    guard let self, let gravity = data?.gravity else { return }
                    let sideways = self.screenX(gravity)
                    let degrees = atan2(sideways, sqrt(max(0, 1 - sideways * sideways))) * 180 / .pi
                    self.notifyListeners("tilt", data: ["gamma": degrees])
                }
            }
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.motion.stopDeviceMotionUpdates()
            call.resolve()
        }
    }

    private func screenX(_ gravity: CMAcceleration) -> Double {
        switch bridge?.viewController?.view.window?.windowScene?.interfaceOrientation {
        case .landscapeRight: return gravity.y
        case .landscapeLeft: return -gravity.y
        case .portraitUpsideDown: return -gravity.x
        default: return gravity.x
        }
    }
}
