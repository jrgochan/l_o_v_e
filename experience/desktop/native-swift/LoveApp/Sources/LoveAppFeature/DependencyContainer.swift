import SwiftUI
import SwiftData
import SoulCore
import SoulBrain
import SoulUI
import SoulVoice
import SoulBio
import Combine
import SoulChat

/// Central Logic Hub: The connectivity tissue between Body (UI), Mind (Brain), and Soul (Core)
@MainActor
public class DependencyContainer: ObservableObject {
    // Services
    let context: ModelContext
    let emotionEngine: EmotionEngine
    let hapticEngine: HapticEngine
    let bioMonitor: BioMonitor
    let voiceEngine: VoiceEngine
    let speechEngine: SpeechEngine
    let llmEngine: LLMEngine
    let safetyEngine: SafetyEngine
    let breathPublisher: BreathPublisher

    // NEW: Audio Input Manager (Visuals + Speech Source)
    let audioInput = AudioInputManager.shared

    // Semantic Search
    let embedder: Embedder
    let searchManager: SemanticSearchManager

    // State
    @Published var currentVibe: Vibe = Vibe(valence: 0.5, arousal: 0.5, connection: 0.5)
    @Published var currentSession: SessionAnalytics?
    @Published var activeStrategy: TransitionStrategy?
    @Published var activeCollectionName: String = "Plutchik Wheel" {
        didSet {
            collectionManager.activeCollectionName = activeCollectionName
        }
    }

    // Audio / Voice State
    @Published var isMicRecording: Bool = false
    @Published var audioLevel: Float = 0.0
    @Published var isVoiceModeEnabled: Bool = false

    // Streaming State
    @Published var streamingResponse: String = ""
    @Published var isThinking: Bool = false

    // Managers
    let collectionManager: CollectionManager

    private var cancellables = Set<AnyCancellable>()

    public init(context: ModelContext) {
        // ... (Existing Inits)
        self.context = context
        self.collectionManager = CollectionManager(context: context)
        self.emotionEngine = EmotionEngine()
        self.hapticEngine = HapticEngine()
        self.bioMonitor = BioMonitor()
        self.voiceEngine = VoiceEngine()
        self.speechEngine = SpeechEngine()
        self.safetyEngine = SafetyEngine()
        self.breathPublisher = BreathPublisher()

        // Semantic Search Init
        self.embedder = MLXEmbedder()
        self.searchManager = SemanticSearchManager(context: context, embedder: self.embedder)
        self.llmEngine = LLMEngine(embedder: self.embedder, inference: MLXInferenceProvider())

        print("🧬 DependencyContainer: Core Systems Online")

        // ... (Session/History Setup)

        // START AUDIO LISTENING (Ambient)
        // Wire AudioInput -> SpeechEngine
        self.audioInput.onAudioBuffer = { [weak self] buffer in
            self?.speechEngine.consumeBuffer(buffer)
        }
        self.audioInput.start()

        // ... (Haptic/Voice Init)

        // ... (Reactive Chains)

        // ...

    }

    private func setupSubscriptions() {
        // Bio Sync
        bioMonitor.$heartRate
            .combineLatest(bioMonitor.$hrv)
            .sink { _, _ in
                // Bio-feed into Vibe? For now just monitoring.
            }
            .store(in: &cancellables)

        // Voice Mode Toggle
        $isVoiceModeEnabled
            .sink { [weak self] enabled in
                if enabled {
                    self?.startListening()
                } else {
                    self?.stopListening()
                }
            }
            .store(in: &cancellables)

         // Audio Level Sync (One-way: SpeechEngine -> DependencyContainer -> UI)
         // Actually, SpeechEngine updates its own audioLevel. We need to mirror it if we want a single source of truth?
         // Or just let AudioInputManager be the source.
         // Let's bind AudioInputManager's level to our published property for convenience
         // Unified Audio Level (Mic + Voice Engine)
         audioInput.$audioLevel
             .combineLatest(voiceEngine.$speakingAmplitude)
             .map { micLevel, ttsLevel in
                 // Combine: Take the max of either interaction
                 // This ensures the Soul pulses whether it's listening OR speaking (Lip Sync)
                 return max(micLevel, ttsLevel)
             }
             .receive(on: RunLoop.main)
             .assign(to: \.audioLevel, on: self)
             .store(in: &cancellables)
    }

    // MARK: - Helpers

    func upgradeVibe(to newVibe: Vibe) {
        self.currentVibe = newVibe
        // Log?
    }

    private func updateVibe(to newVibe: Vibe) {
        withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
            self.currentVibe = newVibe
        }

        // Haptic Feedback
        hapticEngine.playTransition(valence: newVibe.valence, arousal: newVibe.arousal)

        // Update Session Analytics
        // Update Session Analytics
        if let session = currentSession {
            session.addMetric(
                vibe: newVibe,
                heartRate: bioMonitor.heartRate,
                hrv: bioMonitor.hrv,
                messageCount: session.messageCount
            )
            session.endTime = Date() // Updates continuous duration
        }

        // Trigger Breath - Temporarily Removed until BreathPublisher update
        // breathPublisher.updateBreath(for: newVibe)
    }

    private func vibe(for text: String) -> Vibe? {
        // Simple exact match lookup
        // In real app, semantic search handles this.
        let emotions = try? context.fetch(FetchDescriptor<Emotion>())
        if let match = emotions?.first(where: { $0.name.lowercased() == text.lowercased() }) {
            return Vibe(valence: match.valence, arousal: match.arousal, connection: match.connection)
        }
        return nil
    }

    private func speak(_ text: String) {
        voiceEngine.speak(text)
    }

    func startListening() {
        do {
            // Use External Source (AudioInputManager)
            try speechEngine.startRecording(usingExternalSource: true)
        } catch {
            print("🎤 Error starting recording: \(error)")
        }
    }

    func stopListening() {
        speechEngine.stopRecording()
    }

    /// Processes user input (Text or Speech) through the VAC pipeline
    /// Processes user input (Text or Speech) through the VAC pipeline
    func processInput(_ text: String) {
        print("👤 User Input: \(text)")

        // 0. Update Conversation History & Analytics
        logUserMessage(text)

        // 1. Safety Check
        guard performSafetyCheck(text) else { return }

        // 2. Analyze Sentiment
        analyzeAndUpdateVibe(text)

        // 3. Generate Response
        Task { await generateResponse(for: text) }
    }

    // MARK: - Helper Methods

    private func logUserMessage(_ text: String) {
        let userMsg = Message(text: text, isUser: true, vibe: currentVibe)
        context.insert(userMsg)
        currentSession?.messageCount += 1
    }

    private func performSafetyCheck(_ text: String) -> Bool {
        let safetyResult = safetyEngine.analyze(text)

        guard !safetyResult.isSafe else { return true }

        print("🚨 Safety Alert Triggered: \(safetyResult.severity) - \(safetyResult.flaggedKeywords)")

        let alert = ClinicalAlert(
            severity: safetyResult.severity,
            triggerKeyword: safetyResult.flaggedKeywords.first ?? "unknown",
            context: text
        )
        context.insert(alert)

        if safetyResult.severity == .critical {
            handleCriticalSafety(alert)
            return false
        }

        return true
    }

    private func handleCriticalSafety(_ alert: ClinicalAlert) {
        let safetyResponse = "I hear that you are in pain. Since I'm an AI, I can't provide clinical help. " +
                             "If you are in danger, please contact emergency services or a crisis line immediately."
        let responseMsg = Message(text: safetyResponse, isUser: false, vibe: self.currentVibe)
        self.context.insert(responseMsg)
        self.speak(safetyResponse)
    }

    private func analyzeAndUpdateVibe(_ text: String) {
        if let matchedVibe = vibe(for: text) {
            print("🧠 Brain: Detected Emotion '\(text)'")
            updateVibe(to: matchedVibe)
        } else {
            let analyzedVibe = SoulBrain.SentimentEngine.analyze(text, baseVibe: currentVibe)
            updateVibe(to: analyzedVibe)
        }
    }

    private func generateResponse(for text: String) async {
        self.streamingResponse = ""
        self.isThinking = true

        var accumulatedResponse = ""
        let recentHistory = fetchRecentHistory()

        for await token in await llmEngine.generate(
            prompt: text,
            vibe: self.currentVibe,
            strategy: self.activeStrategy,
            history: recentHistory
        ) {
            accumulatedResponse += token
            self.streamingResponse = accumulatedResponse
            if self.isThinking { self.isThinking = false }
        }

        self.isThinking = false
        self.streamingResponse = ""

        let finalResponse = accumulatedResponse.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !finalResponse.isEmpty else { return }

        print("🧠 Brain Response: \(finalResponse)")

        // 3. Save Response
        let responseMsg = Message(text: finalResponse, isUser: false, vibe: self.currentVibe)
        self.context.insert(responseMsg) // Context is MainActor constrained? Yes, @MainActor class.

        if let session = self.currentSession {
            session.messageCount += 1
        }

        // 4. Speak
        self.speak(finalResponse)

        // 5. Update Vibe based on own response? Optional.

        // Reset Stream *after* commit so UI transition is smooth
        // (Assuming UI logic: if streamingResponse != empty, show streaming bubble. Else show history.)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.streamingResponse = ""
        }
    }

    private func fetchRecentHistory() -> [(role: String, content: String)] {
        var recentHistory: [(role: String, content: String)] = []
        do {
            var descriptor = FetchDescriptor<Message>(sortBy: [SortDescriptor(\.timestamp, order: .reverse)])
            descriptor.fetchLimit = 10
            let rawMessages = try self.context.fetch(descriptor)

            let sortedHistory = rawMessages.sorted { $0.timestamp < $1.timestamp }

            // Exclude the most recent message (which is the current prompt) to avoid duplication
            let historyMessages = sortedHistory.dropLast()

            recentHistory = historyMessages.map { msg in
                (role: msg.isUser ? "user" : "assistant", content: msg.text)
            }
        } catch {
            print("⚠️ Failed to fetch history: \(error)")
        }
        return recentHistory
    }

    // MARK: - Semantic Search

    /// Delegate search to manager
    func searchEmotions(query: String) async -> [Emotion] {
        return await searchManager.search(query: query)
    }

    // MARK: - Strategy Execution

    /// meaningful state update when a user completes a strategy
    func completeStrategy(_ strategy: TransitionStrategy) {
        print("✅ DependencyContainer: Strategy Completed - \(strategy.name)")

        // 1. Clear Active Context
        self.activeStrategy = nil

        // 2. Vibe Boost (Positive Reinforcement)
        let boostedVibe = StrategyEngine.applyEffect(strategy: strategy, currentVibe: currentVibe)
        self.updateVibe(to: boostedVibe)

        // 3. Log to History
        let completionMsg = Message(
            text: "✅ Completed Strategy: \(strategy.name)\n" +
                  "(\(strategy.type.rawValue.replacingOccurrences(of: "_", with: " ").capitalized))",
            isUser: false, // System message essentially
            vibe: boostedVibe
        )
        context.insert(completionMsg)

        if let session = currentSession {
            session.messageCount += 1
        }

        // 4. Speak Encouragement
        let praise = ["Well done.", "Good work.", "Feeling better?", "Nice focus."].randomElement() ?? "Well done."
        self.speak(praise)
    }
}
