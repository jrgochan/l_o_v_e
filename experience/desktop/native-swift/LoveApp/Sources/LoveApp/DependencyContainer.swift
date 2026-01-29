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
class DependencyContainer: ObservableObject {
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

    init(context: ModelContext) {
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
         // Actually, SpeechEngine updates its own audioLevel. We need to mirror it if we want a single source of truth for UI?
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
    func processInput(_ text: String) {
        print("👤 User Input: \(text)")
        
        // 0. Update Conversation History & Analytics
        let userMsg = Message(text: text, isUser: true, vibe: currentVibe)
        context.insert(userMsg)
        
        if let session = currentSession {
            session.messageCount += 1
        }
        
        // ---------------------------------------------------------
        // SAFETY CHECK
        // ---------------------------------------------------------
        let safetyResult = safetyEngine.analyze(text)
        if !safetyResult.isSafe {
            print("🚨 Safety Alert Triggered: \(safetyResult.severity) - \(safetyResult.flaggedKeywords)")
            
            // Log Alert
            let alert = ClinicalAlert(
                severity: safetyResult.severity,
                triggerKeyword: safetyResult.flaggedKeywords.first ?? "unknown",
                context: text
            )
            context.insert(alert)
            
            // Handle Critical
            if safetyResult.severity == .critical {
                let safetyResponse = "I hear that you are in pain. Since I'm an AI, I can't provide clinical help. If you are in danger, please contact emergency services or a crisis line immediately."
                
                let responseMsg = Message(text: safetyResponse, isUser: false, vibe: self.currentVibe)
                self.context.insert(responseMsg)
                self.speak(safetyResponse)
                return // HALT PROCESSING
            }
        }
        // ---------------------------------------------------------
        
        // 1. Analyze Sentiment (Simulated using Vibe Match)
        if let matchedVibe = vibe(for: text) {
            print("🧠 Brain: Detected Emotion '\(text)'")
            updateVibe(to: matchedVibe)
        } else {
            // Analyze using Sentiment Engine if not a direct database match
            let analyzedVibe = SoulBrain.SentimentEngine.analyze(text, baseVibe: currentVibe)
            updateVibe(to: analyzedVibe)
        }
        
        // 2. Generate-Simulate Brain Response (Async)
        // 2. Generate-Simulate Brain Response (Async)
        Task {
            // Signal Start
            self.streamingResponse = ""
            self.isThinking = true
            
            var accumulatedResponse = ""
            
            // LLMEngine now handles Prompt Construction & RAG injection internally.
            
            // 2.a Fetch Recent History (Short-Term Memory)
            var recentHistory: [(role: String, content: String)] = []
            do {
                var descriptor = FetchDescriptor<Message>(sortBy: [SortDescriptor(\.timestamp, order: .reverse)])
                descriptor.fetchLimit = 10
                let rawMessages = try self.context.fetch(descriptor)
                // Filter out the current user message effectively to avoid duplication if it was just inserted?
                // Actually, Llama 3 prompt usually expects: [History] -> [Current User Prompt].
                // So we should exclude the *just inserted* message from "History", or LLMEngine handles it?
                // LLM Engine takes `prompt` separately.
                // The `rawMessages` includes the user message we just inserted at line 188.
                // We should filter it out or just rely on the fact that LLMEngine appends the prompt at the end?
                // Let's filter out the very last message if it matches `text`
                
                let sortedHistory = rawMessages.sorted { $0.timestamp < $1.timestamp }
                
                // Exclude the most recent message (which is the current prompt) to avoid duplication
                // Because constructPrompt appends the `userPrompt` at the end explicitly.
                let historyMessages = sortedHistory.dropLast() 
                
                recentHistory = historyMessages.map { msg in
                    (role: msg.isUser ? "user" : "assistant", content: msg.text)
                }
            } catch {
                print("⚠️ Failed to fetch history: \(error)")
            }

            // PASS ACTIVE STRATEGY & HISTORY HERE
            for await token in await llmEngine.generate(
                prompt: text, 
                vibe: self.currentVibe, 
                strategy: self.activeStrategy, 
                history: recentHistory
            ) {
                accumulatedResponse += token
                self.streamingResponse = accumulatedResponse
                
                // If it's the first token, we stop "thinking" and start "streaming"
                if self.isThinking { self.isThinking = false }
            }
            
            // Cleanup
            self.isThinking = false
            self.streamingResponse = "" // Clear stream after commit? Or keep until next input? 
            // Better to keep it until next input or clear it shortly after? 
            // For now, let's keep it visible until we insert the final message, then maybe delay clear?
            // Actually, simply clearing it might make it disappear before the chat bubble appears.
            // The ChatView should likely switch from "Stream" to "History" automatically.
            
            let finalResponse = accumulatedResponse.trimmingCharacters(in: .whitespacesAndNewlines)
            if finalResponse.isEmpty { return }
            
            print("🧠 Brain Response: \(finalResponse)")
            
            // 3. Save Response
            let responseMsg = Message(text: finalResponse, isUser: false, vibe: self.currentVibe)
            self.context.insert(responseMsg)
            
            if let session = currentSession {
                session.messageCount += 1
            }
            
            // 4. Speak
            self.speak(finalResponse)
            
            // Reset Stream *after* commit so UI transition is smooth
            // (Assuming UI logic: if streamingResponse != empty, show streaming bubble. Else show history.)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.streamingResponse = ""
            }
        }
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
            text: "✅ Completed Strategy: \(strategy.name)\n(\(strategy.type.rawValue.replacingOccurrences(of: "_", with: " ").capitalized))",
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
