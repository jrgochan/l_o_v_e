import Foundation
import SoulCore
import SwiftUI
import Combine

/// Engine responsible for driving the time-series playback of a session.
/// Handles linear interpolation between data points and scrubbing logic.
@available(macOS 14, iOS 17, *)
public class PlaybackEngine: ObservableObject {
    
    // Data Source
    private var metrics: [SessionAnalytics.SessionMetric] = []
    
    // State
    @Published public var currentTime: Date
    @Published public var currentVibe: Vibe = Vibe(valence: 0, arousal: 0, connection: 0.5)
    @Published public var isPlaying: Bool = false
    @Published public var progress: Double = 0.0 // 0.0 to 1.0 normalization
    
    private var timer: AnyCancellable?
    private let timeScale: Double = 5.0 // Playback speed multiplier (1 sec real time = 5 sec session time)
    
    // Cache for quick lookups
    private var startTime: Date
    private var endTime: Date
    private var totalDuration: TimeInterval
    
    public init(session: SessionAnalytics) {
        let rawMetrics = session.getMetrics().sorted { $0.timestamp < $1.timestamp }
        self.metrics = rawMetrics
        
        self.startTime = session.startTime
        self.endTime = rawMetrics.last?.timestamp ?? session.endTime ?? Date()
        self.totalDuration = self.endTime.timeIntervalSince(self.startTime)
        
        // Initialize at start
        self.currentTime = self.startTime
        
        // Set initial vibe
        if let first = rawMetrics.first {
            self.currentVibe = Vibe(valence: first.valence, arousal: first.arousal, connection: 0.5)
        }
    }
    
    // MARK: - API
    
    public func togglePlay() {
        if isPlaying {
            pause()
        } else {
            play()
        }
    }
    
    public func play() {
        guard !isPlaying else { return }
        
        // If at end, restart
        if progress >= 1.0 {
            seek(to: 0.0)
        }
        
        isPlaying = true
        startTimer()
    }
    
    public func pause() {
        isPlaying = false
        timer?.cancel()
    }
    
    public func seek(to normalizedTime: Double) {
        progress = max(0.0, min(1.0, normalizedTime))
        let timeOffset = totalDuration * progress
        currentTime = startTime.addingTimeInterval(timeOffset)
        updateVibe()
    }
    
    // MARK: - Internal Loop
    
    private func startTimer() {
        timer = Timer.publish(every: 0.033, on: .main, in: .common) // ~30 FPS
            .autoconnect()
            .sink { [weak self] _ in
                self?.tick()
            }
    }
    
    private func tick() {
        guard isPlaying else { return }
        
        let dt = 0.033 * timeScale
        let newTime = currentTime.addingTimeInterval(dt)
        
        if newTime >= endTime {
            // End of playback
            currentTime = endTime
            progress = 1.0
            updateVibe()
            pause()
        } else {
            currentTime = newTime
            // Update progress
            progress = currentTime.timeIntervalSince(startTime) / totalDuration
            updateVibe()
        }
    }
    
    private func updateVibe() {
        // Find adjacent metrics for interpolation
        // Strategy: Filter for points before current time, take last. Filter for points after, take first.
        // Optimization: Since sorted, we could use binary search or track index, but array is small enough for now.
        
        guard !metrics.isEmpty else { return }
        
        // 1. Find exact matches or bounds
        // Just iterating linear for MVP stability.
        
        var prev: SessionAnalytics.SessionMetric?
        var next: SessionAnalytics.SessionMetric?
        
        for metric in metrics {
            if metric.timestamp <= currentTime {
                prev = metric
            } else {
                next = metric
                break // Found the immediate next point
            }
        }
        
        // 2. Interpolate
        if let prev = prev, let next = next {
            let relativeTime = currentTime.timeIntervalSince(prev.timestamp)
            let interval = next.timestamp.timeIntervalSince(prev.timestamp)
            
            let alpha = interval > 0 ? (relativeTime / interval) : 0.0
            
            // Linear Lerp
            let valence = lerp(start: prev.valence, end: next.valence, t: alpha)
            let arousal = lerp(start: prev.arousal, end: next.arousal, t: alpha)
            
            self.currentVibe = Vibe(valence: valence, arousal: arousal, connection: 0.5)
            
        } else if let p = prev {
            // After last point
            self.currentVibe = Vibe(valence: p.valence, arousal: p.arousal, connection: 0.5)
        } else if let n = next {
            // Before first point
            self.currentVibe = Vibe(valence: n.valence, arousal: n.arousal, connection: 0.5)
        }
    }
    
    private func lerp(start: Double, end: Double, t: Double) -> Double {
        return start + (end - start) * t
    }
}
