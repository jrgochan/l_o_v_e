import Foundation
import AVFoundation
import Combine

/// Manages audio input for visual reactivity.
/// Captures microphone input, calculates RMS amplitude, and publishes normalized levels.
public final class AudioInputManager: ObservableObject, @unchecked Sendable {
    public static let shared = AudioInputManager()

    @MainActor @Published public var audioLevel: Float = 0.0
    @MainActor @Published public var isListening: Bool = false
    @MainActor @Published public var permissionDenied: Bool = false

    private let engine = AVAudioEngine()
    private let analysisQueue = DispatchQueue(label: "com.soul.audio.analysis", qos: .userInteractive)

    // Buffer Consumers
    public var onAudioBuffer: ((AVAudioPCMBuffer) -> Void)?

    private init() {
        setupSession()
    }

    public func start() {
        Task { @MainActor in
            guard !isListening else { return }
        }

        requestPermission { [weak self] granted in
            guard let self = self else { return }
            if !granted {
                Task { @MainActor in self.permissionDenied = true }
                return
            }
            self.startEngine()
        }
    }

    public func stop() {
        Task { @MainActor in
            guard isListening else { return }
            isListening = false
            audioLevel = 0.0
        }
        engine.stop()
        engine.inputNode.removeTap(onBus: 0)
    }

    private func setupSession() {
        // We don't need to do much here for macOS, but for iOS we'd set category
        #if os(iOS)
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playAndRecord,
                mode: .default,
                options: [.mixWithOthers, .defaultToSpeaker]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("❌ AudioInputManager: Failed to set audio session: \(error)")
        }
        #endif
    }

    private func requestPermission(completion: @escaping @Sendable (Bool) -> Void) {
        if #available(macOS 14.0, *) {
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                completion(granted)
            }
        } else {
            // Fallback
            switch AVCaptureDevice.authorizationStatus(for: .audio) {
            case .authorized:
                completion(true)
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .audio) { granted in
                    completion(granted)
                }
            default:
                completion(false)
            }
        }
    }

    private func startEngine() {
        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        // Install Tap
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.processAudio(buffer: buffer)
        }

        do {
            try engine.start()
            Task { @MainActor in
                self.isListening = true
            }
            print("🎙️ AudioInputManager: Listening...")
        } catch {
            print("❌ AudioInputManager: Failed to start engine: \(error)")
        }
    }

    // Non-isolated because this runs on a background Audio Thread (from installTap)
    private func processAudio(buffer: AVAudioPCMBuffer) {
        // Broadcast
        onAudioBuffer?(buffer)
        
        let shouldLog = Int.random(in: 0...50) == 0
        if shouldLog { print("🎤 AudioInputManager: Emitting buffer") }

        guard let channelData = buffer.floatChannelData?[0] else { return }
        let frames = Int(buffer.frameLength)

        // Calculate RMS
        var sum: Float = 0
        for i in 0..<frames {
            let sample = channelData[i]
            sum += sample * sample
        }
        let rms = sqrt(sum / Float(frames))

        // Normalize (Empirical adjustment)
        var level = rms * 5.0
        level = max(0.0, min(1.0, level))
        
        if shouldLog {
            print("🎤 AudioInputManager: RMS: \(rms) (Level: \(level))")
        }

        // Smooth
        analysisQueue.async { [weak self] in
            guard let self = self else { return }

            Task { @MainActor in
                // Simple lerp for smoothness
                self.audioLevel = self.audioLevel * 0.7 + level * 0.3
            }
        }
    }
}
