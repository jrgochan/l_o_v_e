import Foundation
import Observation

/// Monitors biological signals (Heart Rate, HRV) to influence the AI's state.
/// Currently simulates data, but designed to wrap HealthKit.
/// Source of biological data (Simulated or HealthKit)
public protocol BioSource: Sendable {
    nonisolated func getType() -> String
    /// Returns current metrics (HeartRate, HRV)
    func getMetrics() async -> (Double, Double)
}

/// Simulates bio-rhythms with random drift.
public actor SimulationBioSource: BioSource {
    private var heartRate: Double = 72.0

    public init() {}

    public nonisolated func getType() -> String { "Simulation" }

    public func getMetrics() async -> (Double, Double) {
        // Random drift (Actors protect state)
        let dr = Double.random(in: -2...2)
        heartRate = max(50, min(120, heartRate + dr))

        // Inverse correlation
        let targetHRV = 100.0 - (heartRate - 50.0)
        let hrv = targetHRV + Double.random(in: -5...5)

        return (heartRate, hrv)
    }
}

@MainActor
@available(macOS 14, iOS 17, *)
@Observable
public class BioMonitor {
    public var heartRate: Double = 72.0
    public var hrv: Double = 50.0

    private let source: BioSource
    private var monitoringTask: Task<Void, Never>?

    public init(source: BioSource = SimulationBioSource()) {
        self.source = source
        startMonitoring()
    }

    private func startMonitoring() {
        monitoringTask = Task { [weak self] in
            while !Task.isCancelled {
                // Update
                if let self = self {
                    await self.update()
                } else {
                    break
                }

                // Sleep 5 seconds
                try? await Task.sleep(nanoseconds: 5_000_000_000)
            }
        }
    }

    public func update() async {
        let (hr, hrv) = await source.getMetrics()
        self.heartRate = hr
        self.hrv = hrv
    }


}
