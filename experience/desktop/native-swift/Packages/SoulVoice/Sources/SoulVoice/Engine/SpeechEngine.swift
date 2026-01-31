import Foundation
import Speech
import Combine
import AVFoundation
import OSLog
import SoulCore

/// Handles real-time speech-to-text recognition.
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

    @MainActor
    public func requestPermission() {
        SFSpeechRecognizer.requestAuthorization { status in
            Task { @MainActor in
                self.permissionStatus = status
            }
        }
    }

    @MainActor
    public func startRecording(usingExternalSource: Bool = false) throws {
        // Ensure perm requested
        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            requestPermission()
            SoulLog.voice.warning("⚠️ SpeechEngine: Authorization check failed (Status: \(SFSpeechRecognizer.authorizationStatus().rawValue))")
            return
        }

        if recognitionTask != nil {
            recognitionTask?.cancel()
            recognitionTask = nil
        }
        
        // ... (Audio Session setup if iOS) ...
        #if os(iOS)
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        #endif

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { fatalError("Unable to create request") }

        recognitionRequest.shouldReportPartialResults = true
        SoulLog.voice.info("🗣️ SpeechEngine: Starting recognition task...")

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { result, error in
            Task { @MainActor in
                var isFinal = false

                if let result = result {
                    // Apply PII Filter
                    let rawText = result.bestTranscription.formattedString
                    let safeText = self.piiFilter.scrub(rawText)

                    self.transcript = safeText
                    SoulLog.voice.debug("🗣️ SpeechEngine partial: \(safeText)")
                    isFinal = result.isFinal
                    self.resetSilenceTimer() // Now safe to schedule timer on main run loop
                }

                if error != nil || isFinal {
                    if let error = error { SoulLog.voice.error("❌ SpeechEngine Error: \(error.localizedDescription)") }
                    self.stopRecording()
                }
            }
        }

        if !usingExternalSource {
            let inputNode = audioEngine.inputNode
            let recordingFormat = inputNode.outputFormat(forBus: 0)
            
            // Note: installTap callback runs on a background audio thread.
            // We capture 'recognitionRequest' locally to avoid racing on 'self.recognitionRequest' property access if possible,
            // OR we just assume 'self.recognitionRequest' read is atomic enough (pointer).
            // Using 'self.consumeBuffer' is safe because SpeechEngine is now non-actor class,
            // but consumeBuffer internal logic must safeguard UI updates.
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
    
    // ...

    /// External Audio Ingestion
    public func consumeBuffer(_ buffer: AVAudioPCMBuffer) {
        // Essential: Copy the buffer because passing it to an async Task is unsafe.
        // The Audio Engine may reuse the backing memory of 'buffer' by the time the Main thread runs.
        guard let copy = buffer.deepCopy() else { return }
        
        // Wrap in Sendable container to verify we know what we are doing (transferring ownership of a fresh copy)
        let safeBuffer = SafeAudioBuffer(buffer: copy)

        // Dispatch to Main to avoid libdispatch assertion in SFSpeechAudioBufferRecognitionRequest
        Task { @MainActor in
             // Critical Guard: Prevent appending after stopRecording() has called endAudio()
             // Since this block runs on MainActor, and stopRecording runs on MainActor, checking isRecording is safe and serial.
             guard self.isRecording else { return }
             self.recognitionRequest?.append(safeBuffer.buffer)
        }

        // 1. Audio Analysis (Prosody) - Keep on background thread for performance
        // (Analysis needs to be fast, so we use the original buffer synchronously if possible)
        let features = self.audioAnalyzer.process(buffer: buffer)

        // 2. Publish on main thread
        Task { @MainActor in
            self.prosody = features
            self.audioLevel = features.energy * 5.0 
        }
    }

    @MainActor
    public func stopRecording() {
        SoulLog.voice.info("🛑 SpeechEngine: Stopping...")
        audioEngine.stop()
        
        // End the audio stream
        recognitionRequest?.endAudio()
        recognitionRequest = nil // Release and prevent further appends
        
        // Cancel task if running? No, let it finish naturally via result handler (isFinal)
        // But we should null it if we are forcing stop?
        // SFSpeechRecognizer docs say: "To stop recording... call endAudio(). The recognition task will essentially finish."
        // We nil out task in startRecording or on completion.
        
        // Remove tap (safely)
        // Note: inputNode accessor might throw if engine is deallocated, but engine is local val.
        audioEngine.inputNode.removeTap(onBus: 0)

        isRecording = false
        silenceTimer?.invalidate()
        silenceTimer = nil
    }

    private func resetSilenceTimer() {
        // This helper is called safely from MainActor contexts now
        // But for safety, we can ensure the timer is scheduled on Main Loop
        DispatchQueue.main.async { [weak self] in
             self?.silenceTimer?.invalidate()
             self?.silenceTimer = Timer.scheduledTimer(withTimeInterval: self?.silenceThreshold ?? 1.5, repeats: false) { [weak self] _ in
                 Task { @MainActor [weak self] in
                     guard let self = self, self.isRecording, !self.transcript.isEmpty else { return }
                     SoulLog.voice.info("🗣️ SpeechEngine: Silence detected. Committing.")
                     self.transcriptSubject.send(self.transcript)
                     self.stopRecording()
                 }
             }
        }
    }

    // Accessor for input node safely?
    private var inputNode: AVAudioInputNode? {
        return audioEngine.inputNode
    }
}

// MARK: - Safe Buffer Copying
extension AVAudioPCMBuffer {
    func deepCopy() -> AVAudioPCMBuffer? {
        guard let copy = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameLength) else { return nil }
        copy.frameLength = frameLength
        
        // Copy Int16 or Float32 data
        if let src = self.floatChannelData, let dst = copy.floatChannelData {
            let bytesPerChannel = Int(frameLength) * MemoryLayout<Float>.size
            for channel in 0..<Int(format.channelCount) {
                 memcpy(dst[channel], src[channel], bytesPerChannel)
            }
        } else if let src = self.int16ChannelData, let dst = copy.int16ChannelData {
            let bytesPerChannel = Int(frameLength) * MemoryLayout<Int16>.size
            for channel in 0..<Int(format.channelCount) {
                 memcpy(dst[channel], src[channel], bytesPerChannel)
            }
        }
        
        return copy
    }
}

// Wrapper to transfer ownership of a buffer across actor boundaries
struct SafeAudioBuffer: @unchecked Sendable {
    let buffer: AVAudioPCMBuffer
}
