import SwiftUI
import SoulCore
import SoulUI
import SoulBrain
import SoulChat
import SwiftData

@main
struct LoveApp: App {
    let container: ModelContainer
    @StateObject private var depContainer: DependencyContainer
    
    init() {
        do {
            // 1. Initialize SwiftData Container
            let config = ModelConfiguration(isStoredInMemoryOnly: false)
            let modelContainer = try ModelContainer(for: EmotionCollection.self, Emotion.self, Message.self, ViewPreset.self, configurations: config)
            self.container = modelContainer
            
            // 2. Seed Data (if needed)
            try DatabaseSeeder.seed(modelContext: modelContainer.mainContext)
            
            // 3. Initialize Logic Container with Data Context
            // Use local 'modelContainer' to avoid capturing 'self'
            let context = modelContainer.mainContext
            _depContainer = StateObject(wrappedValue: DependencyContainer(context: context))
            
        } catch {
            fatalError("🔥 Critical Failure: Could not initialize Soul Brain. Error: \(error)")
        }
    }
    
    var body: some Scene {
        WindowGroup {
            AppContainer()
                .environmentObject(depContainer)
                .modelContainer(container) // Inject into SwiftUI Environment
                .background(Color.black)
                .preferredColorScheme(.dark)
        }
        .windowStyle(.hiddenTitleBar)
    }
}
