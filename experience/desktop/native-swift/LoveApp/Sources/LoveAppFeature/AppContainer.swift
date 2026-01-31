import SwiftUI
import SoulUI
import SoulCore
import SoulChat
import SwiftData
import Observation

@available(macOS 14, iOS 17, *)
public struct AppContainer: View {
    @Environment(DependencyContainer.self) var deps

    public var body: some View {
        // V2 Experience Entry Point
        SoulExperienceView(
            vibe: Bindable(deps).currentVibe,
            activeCollectionName: Bindable(deps).activeCollectionName,
            isMicRecording: Bindable(deps).isVoiceModeEnabled,
            audioLevel: Bindable(deps).audioLevel,
            streamingResponse: Bindable(deps).streamingResponse,
            isThinking: Bindable(deps).isThinking,
            liveInputText: Bindable(deps).liveInputText,
            chatMode: Bindable(deps).activeChatMode,
            isReflecting: Bindable(deps).isReflecting,
            thoughtContent: Bindable(deps).thoughtContent,
            breathPublisher: deps.breathPublisher,
            hapticEngine: deps.hapticEngine,
            bioMonitor: deps.bioMonitor,
            onChatInput: { text in deps.processInput(text) },
            onMicTap: { deps.isVoiceModeEnabled.toggle() },
            onLongPressOrb: { deps.isMicRecording ? deps.stopListening() : deps.startListening() },
            onSearch: { q in await deps.searchEmotions(query: q) },
            onSettingsChange: { deps.refreshInference() }
        )
        .onAppear {
            deps.refreshInference()
        }
    }

    func toggleMic() {
        if deps.isMicRecording {
            deps.stopListening()
        } else {
            deps.startListening()
        }
    }

    public init() {}
}

#Preview {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    do {
        let container = try ModelContainer(for: Emotion.self, configurations: config)
        return AppContainer()
            .environment(DependencyContainer(context: container.mainContext))
    } catch {
        return Text("Preview Error: \(error.localizedDescription)")
    }
}
