import Foundation
import Speech
import Combine
import AVFoundation

/// Handles real-time speech-to-text recognition.
@MainActor
public class SpeechEngine: NSObject, ObservableObject, @unchecked Sendable {
    @Published public var transcript: String = ""
    @Published public var isRecording = false
    @Published public var audioLevel: Float = 0.0 // 0.0 to 1.0
    @Published public var prosody: AudioAnalyzer.ProsodyFeatures? // NEW: Prosody Features
    @Published public var permissionStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined

    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var silenceTimer: Timer?
    private let silenceThreshold: TimeInterval = 1.5

    // Publishes the final text when silence is detected
    public let transcriptSubject = PassthroughSubject<String, Never>()

    // Intelligence Components (Lazy initialized or created here)
    private let audioAnalyzer = AudioAnalyzer()
    private let piiFilter = PIIFilter()

    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    public override init() {
        super.init()
        // defer permission request until needed to avoid TCC crash on startup in swift run
    }

    public func requestPermission() {
        SFSpeechRecognizer.requestAuthorization { status in
            Task { @MainActor in
                self.permissionStatus = status
            }
        }
    }

    public func startRecording(usingExternalSource: Bool = false) throws {
        // Ensure perm requested
        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            requestPermission()
            // If not determined, we requested it. But we can't start yet.
            // If denied, we can't start.
            print("⚠️ SpeechEngine: Authorization check failed (Status: \(SFSpeechRecognizer.authorizationStatus().rawValue))")
            return
        }

        if recognitionTask != nil {
            recognitionTask?.cancel()
            recognitionTask = nil
        }

        // AVAudioSession is iOS only. macOS handles this via System Settings > Sound.
        #if os(iOS)
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        #endif

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { fatalError("Unable to create request") }

        recognitionRequest.shouldReportPartialResults = true
        print("🗣️ SpeechEngine: Starting recognition task...")

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { result, error in
            var isFinal = false

            if let result = result {
                // Apply PII Filter
                let rawText = result.bestTranscription.formattedString
                let safeText = self.piiFilter.scrub(rawText)

                self.transcript = safeText
                print("🗣️ SpeechEngine partial: \(safeText)")
                isFinal = result.isFinal
                self.resetSilenceTimer()
            }

            if error != nil || isFinal {
                if let error = error { print("❌ SpeechEngine Error: \(error)") }
                self.stopRecording()
            }
        }

        if !usingExternalSource {
            let inputNode = audioEngine.inputNode
            let recordingFormat = inputNode.outputFormat(forBus: 0)
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
                self?.consumeBuffer(buffer)
            }

            audioEngine.prepare()
            try audioEngine.start()
        }

        self.transcript = ""
        self.isRecording = true
        self.resetSilenceTimer() // Start timer immediately
    }

    /// External Audio Ingestion
    public func consumeBuffer(_ buffer: AVAudioPCMBuffer) {
        self.recognitionRequest?.append(buffer)

        // 1. Audio Analysis (Prosody)
        let features = self.audioAnalyzer.process(buffer: buffer)

        // 2. Publish on main thread
        Task { @MainActor in
            self.prosody = features
            self.audioLevel = features.energy * 5.0 
        }
        
        // Debug: Log buffer receipt (sample rate check)
        if Int.random(in: 0...50) == 0 { // Throttle
            print("🔊 SpeechEngine: Consuming buffer (len: \(buffer.frameLength))")
        }
    }

    public func stopRecording() {
        audioEngine.stop()
        recognitionRequest?.endAudio()
        inputNode?.removeTap(onBus: 0)

        isRecording = false
        silenceTimer?.invalidate()
        silenceTimer = nil
    }

    private func resetSilenceTimer() {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: silenceThreshold, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self = self, self.isRecording, !self.transcript.isEmpty else { return }
                print("🗣️ SpeechEngine: Silence detected. Committing.")
                self.transcriptSubject.send(self.transcript)
                self.stopRecording()
            }
        }
    }

    // Accessor for input node safely?
    private var inputNode: AVAudioInputNode? {
        return audioEngine.inputNode
    }
}
