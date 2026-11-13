import SwiftUI
import WebKit

@main
struct ScalataApp: App {
    var body: some Scene {
        WindowGroup {
            GiocoView()
                .ignoresSafeArea()
                .background(Color(red: 0.02, green: 0.04, blue: 0.11))
                .preferredColorScheme(nil)
                .statusBarHidden(false)
        }
    }
}

struct GiocoView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()          // i salvataggi restano sul telefono
        config.allowsInlineMediaPlayback = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 0.02, green: 0.04, blue: 0.11, alpha: 1)
        web.scrollView.backgroundColor = web.backgroundColor
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsBackForwardNavigationGestures = false
        if #available(iOS 16.4, *) { web.isInspectable = true }

        if let pagina = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            web.loadFileURL(pagina, allowingReadAccessTo: pagina.deletingLastPathComponent())
        }
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {}
}
