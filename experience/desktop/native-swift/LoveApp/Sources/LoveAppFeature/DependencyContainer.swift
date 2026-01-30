import SwiftUI
@preconcurrency import SwiftData
import Observation
import SoulCore
import SoulBrain
import SoulUI
import SoulVoice
import SoulBio
import Combine
import SoulChat

/// Central Logic Hub: The connectivity tissue between Body (UI), Mind (Brain), and Soul (Core)
@MainActor
@available(macOS 14, iOS 17, *)
@Observable
public class DependencyContainer {
    // Services
    let context: ModelContext
    let emotionEngine: EmotionEngine
    let hapticEngine: HapticEngine
    let bioMonitor: BioMonitor
    let voiceEngine: VoiceEngine
    let speechEngine: SpeechEngine
    let llmEngine: LLMEngine
    let inference: any InferenceProvider // Added to support direct access if needed, or just to satisfy init
    let safetyEngine: SafetyEngine
    let breathPublisher: BreathPublisher

    // NEW: Audio Input Manager (Visuals + Speech Source)
    let audioInput = AudioInputManager.shared

    // Semantic Search
    let embedder: Embedder
    let searchManager: SemanticSearchManager

    // State
    public var currentVibe: Vibe = Vibe(valence: 0.5, arousal: 0.5, connection: 0.5)
    public var currentSession: SessionAnalytics?
    public var activeStrategy: TransitionStrategy?
    public var activeCollectionName: String = "GoEmotions" {
        didSet {
            collectionManager.activeCollectionName = activeCollectionName
        }
    }

    // Audio / Voice State
    public var isMicRecording: Bool = false
    public var audioLevel: Float = 0.0
    public var liveInputText: String = "" // Live Transcription
    public var isVoiceModeEnabled: Bool = false {
        didSet {
            if isVoiceModeEnabled {
                startListening()
            } else {
                stopListening()
            }
        }
    }

    // Streaming State
    public var streamingResponse: String = ""
    public var isThinking: Bool = false

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

        // TEMPORARY: Force MockEmbedder on macOS to fix build crash until resources are bundled
        #if os(macOS)
            let embedder = MockEmbedder()
            self.embedder = embedder
            // Use MockInferenceProvider if available, otherwise just nil safely or mock
            // Assuming MLXInferenceProvider is also problematic if it depends on same libs
            // But let's try just swapping embedder first, or both.
            // Safest: Use Mock for everything to verify Voice Flow.
            self.inference = MockInferenceProvider()
            self.llmEngine = LLMEngine(embedder: self.embedder, inference: self.inference)
        #else
            let embedder = MockEmbedder()
            self.embedder = embedder
            self.inference = MockInferenceProvider()
            self.llmEngine = LLMEngine(embedder: self.embedder, inference: self.inference)
        #endif
        
        self.searchManager = SemanticSearchManager(container: context.container, embedder: self.embedder)

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
        
        setupSubscriptions()

    }

    private func setupSubscriptions() {
        // Audio Level Sync
        // Bind AudioInputManager's level to our published property for convenience
        audioInput.$audioLevel
            .combineLatest(voiceEngine.$speakingAmplitude)
            .map { micLevel, ttsLevel in
                return max(micLevel, ttsLevel)
            }
            .receive(on: RunLoop.main)
            .sink { [weak self] level in
                self?.audioLevel = level
            }
            .store(in: &cancellables)
        
        // Live Transcription Sync
        speechEngine.$transcript
            .receive(on: RunLoop.main)
            .sink { text in
                print("🔄 DepContainer received transcript: \(text)")
                self.liveInputText = text
            }
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
        let descriptor = FetchDescriptor<Emotion>()
        let emotions = try? context.fetch(descriptor)
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
        
        // Convert to Sendable Snapshot (must be done on MainActor before awaiting)
        let strategySnapshot = self.activeStrategy.map { strategy in
            SoulPersona.StrategySnapshot(
                name: strategy.name,
                definition: strategy.definition,
                detailedSteps: strategy.detailedSteps
            )
        }

        for await token in await llmEngine.generate(
            prompt: text,
            vibe: self.currentVibe,
            strategy: strategySnapshot,
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
        let ids = await searchManager.search(query: query)
        guard !ids.isEmpty else { return [] }
        
        do {
            // Fetch unordered objects
            let descriptor = FetchDescriptor<Emotion>(
                predicate: #Predicate { ids.contains($0.id) }
            )
            let unsorted = try context.fetch(descriptor)
            
            // Restore search ranking order
            let map: [UUID: Emotion] = Dictionary(uniqueKeysWithValues: unsorted.map { ($0.id, $0) })
            return ids.compactMap { map[$0] }
        } catch {
            print("❌ DependencyContainer: Search fetch failed: \(error)")
            return []
        }
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


