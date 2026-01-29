import Foundation
import Combine
import QuartzCore

/// A global heartbeat for the UI, emitting a rhythmic "breath" signal.
/// Designed to emulate a meditative breath cycle (approx 6 cycles/minute).
public class BreathPublisher: ObservableObject, @unchecked Sendable {
    /// Normalized breath value from 0.0 (Exhale complete) to 1.0 (Inhale complete)
    @Published public var breath: Double = 0.0
    
    /// A subtle scale factor derived from breath (e.g., 0.98 to 1.02) for consistent UI motion
    @Published public var scaleFactor: Double = 1.0
    
    private var timer: Timer?
    private let startTime: CFTimeInterval
    private let bpm: Double = 6.0
    private let timeProvider: () -> CFTimeInterval
    
    public init(timeProvider: @escaping () -> CFTimeInterval = { CACurrentMediaTime() }) {
        self.timeProvider = timeProvider
        self.startTime = timeProvider()
        startBreathing()
    }
    
    private func startBreathing() {
        // Use Timer for cross-platform simplicity (Targeting ~60 FPS)
        timer = Timer.scheduledTimer(withTimeInterval: 0.016, repeats: true) { [weak self] _ in
             self?.update()
        }
    }
    
    // Exposed for testing
    public func update() {
        let currentTime = timeProvider()
        let elapsed = currentTime - startTime
        
        // 6 BPM = 0.1 Hz -> T = 10s
        // Angular frequency w = 2 * pi * f
        // f = 6 / 60 = 0.1
        let frequency = bpm / 60.0
        let w = 2.0 * .pi * frequency
        
        // Sine wave offset by -pi/2 so we start at 0 (or close to it/bottom of breath) 
        // Range [-1, 1] -> [0, 1] via (sin(...) + 1) / 2
        let rawSine = sin(elapsed * w - .pi / 2.0)
        let normalized = (rawSine + 1.0) / 2.0
        
        self.breath = normalized
        
        // Scale Factor: 0.98 (Exhale) to 1.02 (Inhale)
        // Lerp: 0.98 + (0.04 * normalized)
        self.scaleFactor = 0.98 + (0.04 * normalized)
    }
    
    deinit {
        timer?.invalidate()
    }
}
