import Capacitor
import UIKit

private final class HostedTabBar: UITabBar {
    var onLayout: (() -> Void)?

    override func layoutSubviews() {
        super.layoutSubviews()
        onLayout?()
    }

    override func safeAreaInsetsDidChange() {
        super.safeAreaInsetsDidChange()
        invalidateIntrinsicContentSize()
    }
}

@objc(UpkeptTabBarPlugin)
public class UpkeptTabBarPlugin: CAPPlugin, CAPBridgedPlugin, UITabBarDelegate {
    public let identifier = "UpkeptTabBarPlugin"
    public let jsName = "UpkeptTabBar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setTabs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "select", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTint", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setStyle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise),
    ]

    private let bar = HostedTabBar()
    private var ids: [String] = []
    private var frameObservation: NSKeyValueObservation?

    override public func load() {
        bar.delegate = self
        bar.translatesAutoresizingMaskIntoConstraints = false
        bar.onLayout = { [weak self] in self?.updateInset() }
        frameObservation = bridge?.webView?.observe(\.frame) { [weak self] _, _ in
            self?.bar.setNeedsLayout()
        }
        if #available(iOS 26.0, *), let scrollView = bridge?.webView?.scrollView {
            let interaction = UIScrollEdgeElementContainerInteraction()
            interaction.scrollView = scrollView
            interaction.edge = .bottom
            bar.addInteraction(interaction)
        }
    }

    @objc func setTabs(_ call: CAPPluginCall) {
        guard let tabs = call.getArray("tabs", JSObject.self) else {
            call.reject("tabs missing")
            return
        }
        let selected = call.getString("selected")
        DispatchQueue.main.async {
            self.ids = tabs.compactMap { $0["id"] as? String }
            self.bar.items = tabs.enumerated().map { index, tab in
                let image = (tab["systemImage"] as? String).flatMap { UIImage(systemName: $0) }
                return UITabBarItem(title: tab["title"] as? String, image: image, tag: index)
            }
            self.selectItem(selected)
            call.resolve()
        }
    }

    @objc func select(_ call: CAPPluginCall) {
        let id = call.getString("id")
        DispatchQueue.main.async {
            self.selectItem(id)
            call.resolve()
        }
    }

    @objc func setTint(_ call: CAPPluginCall) {
        let hex = call.getString("color") ?? ""
        DispatchQueue.main.async {
            self.bar.tintColor = UIColor(hexString: hex)
            call.resolve()
        }
    }

    @objc func setStyle(_ call: CAPPluginCall) {
        let style = call.getString("style") ?? "auto"
        DispatchQueue.main.async {
            let value: UIUserInterfaceStyle = style == "dark" ? .dark : style == "light" ? .light : .unspecified
            self.bar.overrideUserInterfaceStyle = value
            self.bridge?.viewController?.overrideUserInterfaceStyle = value
            call.resolve()
        }
    }

    @objc func show(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.attach()
            self.bar.isHidden = false
            self.bar.setNeedsLayout()
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.bar.isHidden = true
            self.bridge?.viewController?.additionalSafeAreaInsets.bottom = 0
            call.resolve()
        }
    }

    public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard ids.indices.contains(item.tag) else { return }
        notifyListeners("tabSelected", data: ["id": ids[item.tag]])
    }

    private func selectItem(_ id: String?) {
        guard let id = id, let index = ids.firstIndex(of: id), let items = bar.items, items.indices.contains(index) else { return }
        bar.selectedItem = items[index]
    }

    private func attach() {
        guard bar.superview == nil, let host = bridge?.webView?.superview else { return }
        host.addSubview(bar)
        NSLayoutConstraint.activate([
            bar.leadingAnchor.constraint(equalTo: host.leadingAnchor),
            bar.trailingAnchor.constraint(equalTo: host.trailingAnchor),
            bar.bottomAnchor.constraint(equalTo: host.bottomAnchor),
        ])
    }

    private func updateInset() {
        guard !bar.isHidden, bar.window != nil, let webView = bridge?.webView, let vc = bridge?.viewController else { return }
        let frame = bar.convert(bar.bounds, to: webView)
        let fromBottom = webView.bounds.height - frame.minY
        let natural = webView.safeAreaInsets.bottom - vc.additionalSafeAreaInsets.bottom
        let extra = max(0, fromBottom - natural)
        if abs(extra - vc.additionalSafeAreaInsets.bottom) > 0.5 {
            vc.additionalSafeAreaInsets.bottom = extra
        }
    }
}

private extension UIColor {
    convenience init?(hexString: String) {
        var value: UInt64 = 0
        let clean = hexString.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard clean.count == 6, Scanner(string: clean).scanHexInt64(&value) else { return nil }
        self.init(red: CGFloat((value >> 16) & 0xFF) / 255, green: CGFloat((value >> 8) & 0xFF) / 255, blue: CGFloat(value & 0xFF) / 255, alpha: 1)
    }
}
