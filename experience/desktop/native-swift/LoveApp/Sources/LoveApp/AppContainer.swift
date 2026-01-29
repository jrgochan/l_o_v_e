import SwiftUI
import SoulUI
import SoulCore
import SoulChat
import SwiftData

struct AppContainer: View {
    @EnvironmentObject var deps: DependencyContainer

    var body: some View {
        ZStack {
            // LAYER 1: The Void (Background)
            Color.black.ignoresSafeArea()

            // LAYER 2: Admin Dashboard & Visualization
            // This replaces the simple VibeOrb background with the full 3D Admin Interface
            // LAYER 2: Admin Dashboard & Visualization
            // This replaces the simple VibeOrb background with the full 3D Admin Interface
            AdminDashboardView(
                vibe: $deps.currentVibe,
                activeCollectionName: $deps.activeCollectionName,
                isMicRecording: $deps.isMicRecording,
                audioLevel: $deps.audioLevel, // Synced Audio Level
                streamingResponse: $deps.streamingResponse, // Streaming
                isThinking: $deps.isThinking, // Thinking State
                breathPublisher: deps.breathPublisher, // NEW
                hapticEngine: deps.hapticEngine, // NEW
                onStrategyStart: { strategy in
                    print("🧠 App: Starting Strategy: \(strategy.name)")
                    deps.activeStrategy = strategy
                },
                onStrategyComplete: { strategy in
                    print("🧠 App: Strategy Complete: \(strategy.name)")
                    deps.activeStrategy = nil
                    deps.completeStrategy(strategy)
                },
                onChatInput: { text in
                    deps.processInput(text)
                },
                onSearch: { query in
                    await deps.searchEmotions(query: query)
                }
            )
            .ignoresSafeArea()

            // LAYER 3: Main Content (Grounded)
            // Overlay ChatView removed - now integrated into AdminDashboardView's "Chat" tab.
            VStack {
                Spacer()
            }
        }
    }

    func toggleMic() {
        if deps.isMicRecording {
            deps.stopListening()
        } else {
            deps.startListening()
        }
    }
}

#Preview {
    // Mock Context
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    let container = try? ModelContainer(for: EmotionCollection.self, Emotion.self, configurations: config)
    if container == nil { fatalError("Preview setup failed") }
    let validContainer = container!

    return AppContainer()
        .environmentObject(DependencyContainer(context: container.mainContext))
}
