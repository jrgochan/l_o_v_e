import XCTest
import SwiftData
@testable import SoulCore

@MainActor
final class SessionAnalyticsTests: XCTestCase {

    var container: ModelContainer!
    var context: ModelContext!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: SessionAnalytics.self, configurations: config)
        context = container.mainContext
    }

    func testAddAndRetrieveMetrics() {
        let startTime = Date()
        let session = SessionAnalytics(startTime: startTime, startValence: 0, startArousal: 0)
        context.insert(session)

        XCTAssertEqual(session.getMetrics().count, 0)

        let vibe = Vibe(valence: 0.5, arousal: 0.2, connection: 0.8)
        session.addMetric(vibe: vibe, heartRate: 70, hrv: 50, messageCount: 1)

        let metrics = session.getMetrics()
        XCTAssertEqual(metrics.count, 1)
        XCTAssertEqual(metrics.first?.valence, 0.5)
        XCTAssertEqual(metrics.first?.heartRate, 70)
        XCTAssertEqual(metrics.first?.messageCount, 1)

        // Add another
        session.addMetric(vibe: Vibe.neutral, heartRate: 72, hrv: 55, messageCount: 2)
        XCTAssertEqual(session.getMetrics().count, 2)
    }

    func testDuration() {
        let now = Date()
        let session = SessionAnalytics(startTime: now, startValence: 0, startArousal: 0)

        // Open ended (uses Date())
        let d = session.duration
        XCTAssertLessThan(d, 1.0) // Should be very close to 0

        // Closed
        session.endTime = now.addingTimeInterval(60)
        XCTAssertEqual(session.duration, 60.0, accuracy: 0.001)
    }
}
