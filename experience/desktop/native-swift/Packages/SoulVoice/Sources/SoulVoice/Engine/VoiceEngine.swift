import AVFoundation
import SoulCore
import Combine

/// The Speech Synthesis Engine for the Soul.
/// Adjusts vocal characteristics based on emotional state.
public class VoiceEngine: NSObject, ObservableObject, AVSpeechSynthesizerDelegate, @unchecked Sendable {
    private let synthesizer = AVSpeechSynthesizer()
    private var currentVibe: Vibe = Vibe(valence: 0, arousal: 0, connection: 0)
    
    public override init() {
        super.init()
        synthesizer.delegate = self
        configureAudioSession()
    }
    
    private func configureAudioSession() {
        #if os(iOS)
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("🗣️ VoiceEngine AudioSession Error: \(error)")
        }
        #endif
    }
    
    public func update(vibe: Vibe) {
        self.currentVibe = vibe
    }
    
    // Helper: Sigmoid function for S-curve mapping
    // x: Input (-1 to 1)
    // k: Sensitivity (Slope)
    private func sigmoid(_ x: Double, k: Double = 5.0) -> Float {
        let ex = exp(-k * x)
        return Float(1.0 / (1.0 + ex))
    }

    public struct VoiceParameters {
        public let pitch: Float
        public let rate: Float
        public let volume: Float
    }
    
    public func calculateParameters(for vibe: Vibe) -> VoiceParameters {
        // Pitch: Valence Driven
        // High Valence (Happy) -> Higher Pitch (Up to 1.25)
        // Low Valence (Sad)  -> Lower Pitch (Down to 0.8)
        let pitchFactor = sigmoid(vibe.valence, k: 3.5)
        let pitch = 0.8 + (pitchFactor * 0.45)
        
        // Rate: Arousal Driven
        // High Arousal (Excited/Angry) -> Faster (Up to 0.6)
        // Low Arousal (Calm/Sad) -> Slower (Down to 0.4)
        let rateFactor = sigmoid(vibe.arousal, k: 3.0)
        let rate = 0.4 + (rateFactor * 0.2)
        
        // Volume: Connection Driven
        // Higher Connection = More "Present" (Full Volume)
        let volume = Float(0.6 + (vibe.connection * 0.4))
        
        return VoiceParameters(pitch: pitch, rate: rate, volume: volume)
    }

    public func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        
        let params = calculateParameters(for: currentVibe)
        utterance.pitchMultiplier = params.pitch
        utterance.rate = params.rate
        utterance.volume = params.volume
        
        synthesizer.speak(utterance)
        print("🗣️ Speaking: \"\(text)\" (Pitch: \(String(format: "%.2f", params.pitch)), Rate: \(String(format: "%.2f", params.rate)))")
    }
    
    public let speechFinishedSubject = PassthroughSubject<Void, Never>()
    
    // Simulated Amplitude for Visuals (0.0 - 1.0)
    @Published public var speakingAmplitude: Float = 0.0
    
    public func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        self.speakingAmplitude = 0.0
    }
    
    // MARK: - AVSpeechSynthesizerDelegate
    
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        // Signal that speaking has finished
        speechFinishedSubject.send()
        self.speakingAmplitude = 0.0
    }
    
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString characterRange: NSRange, utterance: AVSpeechUtterance) {
        // Simulate a "pulse" for each word spoken
        // This creates a "Lip Sync" visual effect without analyzing raw audio buffers.
        
        // 1. Attack
        self.speakingAmplitude = Float.random(in: 0.4...0.8)
        
        // 2. Decay (Simulated Envelope)
        // Reset to near-zero after a short duration (average word length roughly)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            // Only drop if we haven't started a new word (simple check: if we are still speaking?)
            // For simple "bounciness", dropping is fine.
            self?.speakingAmplitude = 0.1
        }
    }
}
