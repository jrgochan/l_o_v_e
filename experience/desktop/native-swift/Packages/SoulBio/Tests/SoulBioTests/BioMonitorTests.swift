import XCTest
@testable import SoulBio

actor MockBioSource: BioSource {
    var hr: Double
    var hrv: Double

    init(hr: Double, hrv: Double) {
        self.hr = hr
        self.hrv = hrv
    }

    nonisolated func getType() -> String { "Mock" }

    func getMetrics() async -> (Double, Double) {
        return (hr, hrv)
    }

    func update(hr: Double, hrv: Double) {
        self.hr = hr
        self.hrv = hrv
    }
}

@MainActor
final class BioMonitorTests: XCTestCase {

    func testInitializationUpdatesMetrics() async {
        let mock = MockBioSource(hr: 60, hrv: 80)
        let monitor = BioMonitor(source: mock)

        // Wait for first update?
        // BioMonitor starts timer but doesn't auto-fetch in init immediately synchronously.
        // But `startMonitoring` sets timer.
        // We can manually call `update()` to test logic without waiting for Timer.

        await monitor.update()

        // Wait for async task inside update?
        // No, update() is now async and awaits source.getMetrics().
        // So after await monitor.update(), state SHOULD be updated immediately.

        XCTAssertEqual(monitor.heartRate, 60.0)
        XCTAssertEqual(monitor.hrv, 80.0)
    }

    func testUpdatesPropagate() async {
        let mock = MockBioSource(hr: 100, hrv: 20)
        let monitor = BioMonitor(source: mock)

        await mock.update(hr: 120, hrv: 10)

        await monitor.update()

        XCTAssertEqual(monitor.heartRate, 120.0)
        XCTAssertEqual(monitor.hrv, 10.0)
    }
}
