import CoreHaptics
import Foundation
import SoulCore

/// The rhythmic heart of the AI.
/// Translates VAC vectors into physical sensations.
@available(macOS 14, iOS 17, *)
public class HapticEngine: ObservableObject, @unchecked Sendable {
    private var engine: CHHapticEngine?
    private var isEngineRunning = false

    // Heartbeat State
    private var heartbeatTimer: Timer?
    private var currentVibe: Vibe = Vibe(valence: 0, arousal: 0.5, connection: 0.5)

    public init() {
        prepareHaptics()
    }

    private func prepareHaptics() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else {
            SoulLog.bio.warning("🫀 Haptics not supported on this device.")
            return
        }

        do {
            engine = try CHHapticEngine()

            // Handle Resume (e.g. returning from background)
            engine?.resetHandler = { [weak self] in
                SoulLog.bio.info("🫀 Haptic Engine Reset. Restarting...")
                try? self?.engine?.start()
            }

            engine?.stoppedHandler = { reason in
                SoulLog.bio.warning("🫀 Haptic Engine Stopped: \(reason.rawValue)")
            }

            try engine?.start()
            isEngineRunning = true
            SoulLog.bio.info("🫀 Haptic Engine Started.")
        } catch {
            SoulLog.bio.error("❌ Failed to start HapticEngine: \(error.localizedDescription)")
        }
    }

    /// Updates the internal state to match the current Vibe, adjusting heartbeat.
    public func update(vibe: Vibe) {
        self.currentVibe = vibe
        scheduleHeartbeat()
    }

    // MARK: - Patterns

    public struct HeartbeatParameters {
        public let bpm: Double
        public let interval: Double
    }

    public func calculateHeartbeatParameters(arousal: Double) -> HeartbeatParameters {
        // Map Arousal (0.0 - 1.0) to BPM (60 - 140)
        let bpm = 60.0 + (max(0.0, arousal) * 80.0)
        let interval = 60.0 / bpm
        return HeartbeatParameters(bpm: bpm, interval: interval)
    }

    private func scheduleHeartbeat() {
        heartbeatTimer?.invalidate()

        let params = calculateHeartbeatParameters(arousal: currentVibe.arousal)

        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: params.interval, repeats: true) { [weak self] _ in
            self?.playHeartbeat()
        }
    }

    public func playHeartbeat() {
        guard isEngineRunning else { return }

        // Intensity driven by Arousal (Energy)
        let intensity = Float(0.4 + (currentVibe.arousal * 0.6))

        // Sharpness driven by Connection (Depth)
        // High Connection = Low Sharpness (Deep, Warm thud)
        // Low Connection = High Sharpness (Thin, mechanical click)
        let sharpness = Float(1.0 - currentVibe.connection)

        let visualAudioEvent = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
            ],
            relativeTime: 0
        )

        // Complex Pattern: Lub-Dub
        // Second beat: Slightly softer, but sharpness logic remains
        let secondBeat = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity * 0.8),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness) // Keep tonal consistency
            ],
            relativeTime: 0.15 // 150ms delay
        )

        do {
            let pattern = try CHHapticPattern(events: [visualAudioEvent, secondBeat], parameters: [])
            let player = try engine?.makePlayer(with: pattern)
            try player?.start(atTime: 0)
        } catch {
            SoulLog.bio.error("❌ Failed to play heartbeat: \(error.localizedDescription)")
        }
    }

    /// Plays a texture representing a mood shift
    public func playTransition(valence: Double, arousal: Double) {
        guard isEngineRunning else { return }

        // Valence: Positive = Smooth, Negative = Sharp/Gravelly
        let sharpness = Float(valence < 0 ? 0.8 : 0.2)

        // Arousal: Intensity / Duration
        let intensity = Float(0.5 + (arousal * 0.5))
        let duration = Double(0.5 + (arousal * 0.5))

        let event = CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
                CHHapticEventParameter(parameterID: .attackTime, value: 0.1),
                CHHapticEventParameter(parameterID: .decayTime, value: 0.2)
            ],
            relativeTime: 0,
            duration: duration
        )

        do {
            let pattern = try CHHapticPattern(events: [event], parameters: [])
            let player = try engine?.makePlayer(with: pattern)
            try player?.start(atTime: 0)
        } catch {
            SoulLog.bio.error("❌ Failed to play transition: \(error.localizedDescription)")
        }
    }

    /// Crisp, confident click for selection.
    public func playSelection() {
        guard isEngineRunning else { return }

        // Rigid = Physical click feel
        let event = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.8),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 1.0)
            ],
            relativeTime: 0
        )

        do {
            let pattern = try CHHapticPattern(events: [event], parameters: [])
            let player = try engine?.makePlayer(with: pattern)
            try player?.start(atTime: 0)
        } catch {
            SoulLog.bio.error("❌ Failed to play selection: \(error.localizedDescription)")
        }
    }

    /// Subtle, airy tick for hover.
    public func playHover() {
        guard isEngineRunning else { return }

        let event = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.3),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.7)
            ],
            relativeTime: 0
        )

        do {
            let pattern = try CHHapticPattern(events: [event], parameters: [])
            let player = try engine?.makePlayer(with: pattern)
            try player?.start(atTime: 0)
        } catch {
            SoulLog.bio.error("❌ Failed to play hover: \(error.localizedDescription)")
        }
    }
}
