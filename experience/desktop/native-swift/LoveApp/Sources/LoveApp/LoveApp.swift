import SwiftUI
import SoulCore
import SoulUI
import SoulBrain
import SoulChat
import SwiftData
import LoveAppFeature

@main
@available(macOS 14, iOS 17, *)
struct LoveApp: App {
    let container: ModelContainer
    @State private var depContainer: DependencyContainer?

    init() {
        SoulLog.app.info("🚀 LoveApp initializing...")
        do {
            // 1. Initialize SwiftData Container
            let config = ModelConfiguration(isStoredInMemoryOnly: false)
            let modelContainer = try ModelContainer(
                for: EmotionCollection.self, Emotion.self, Message.self, ViewPreset.self,
                configurations: config
            )
            self.container = modelContainer
            SoulLog.data.info("✅ SwiftData Container initialized.")

            // 2. Seed Data (if needed)
            try DatabaseSeeder.seed(modelContext: modelContainer.mainContext)

            // 3. DependencyContainer is initialized in onAppear to guarantee MainActor usage

        } catch {
            SoulLog.app.critical("🔥 Critical Failure: Could not initialize Soul Brain. Error: \(error)")
            fatalError("🔥 Critical Failure: Could not initialize Soul Brain. Error: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if let deps = depContainer {
                    AppContainer()
                        .environment(deps)
                } else {
                    Color.black
                        .overlay(ProgressView())
                        .onAppear {
                            // Initialize Logic Container on MainActor
                            SoulLog.app.info("🏗️ Initializing DependencyContainer on MainActor...")
                            let context = container.mainContext
                            depContainer = DependencyContainer(context: context)
                            SoulLog.app.info("✅ DependencyContainer ready.")
                        }
                }
            }
            .modelContainer(container) // Inject into SwiftUI Environment
            .background(Color.black)
            .preferredColorScheme(.dark)
        }
        #if os(macOS)
        .windowStyle(.hiddenTitleBar)
        #endif
    }
}
