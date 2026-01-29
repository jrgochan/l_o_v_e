import XCTest
@testable import SoulCore

final class BreathPublisherTests: XCTestCase {
    
    func testBreathCycle() {
        // 6 BPM -> 10 second period
        // Start (t=0): sin(-pi/2) = -1. Normalized = 0.0.
        // Peak (t=5): sin(pi - pi/2) = sin(pi/2) = 1. Normalized = 1.0.
        
        var currentTime: TimeInterval = 0
        let producer = BreathPublisher(timeProvider: { currentTime })
        
        // Initial State (t=0)
        producer.update()
        XCTAssertEqual(producer.breath, 0.0, accuracy: 0.001)
        XCTAssertEqual(producer.scaleFactor, 0.98, accuracy: 0.001)
        
        // Quarter Cycle (t=2.5s) -> halfway up
        currentTime = 2.5
        producer.update()
        XCTAssertEqual(producer.breath, 0.5, accuracy: 0.001)
        
        // Half Cycle (t=5.0s) -> Peak Inhale
        currentTime = 5.0
        producer.update()
        XCTAssertEqual(producer.breath, 1.0, accuracy: 0.001)
        XCTAssertEqual(producer.scaleFactor, 1.02, accuracy: 0.001)
        
        // Full Cycle (t=10.0s) -> Exhale Complete
        currentTime = 10.0
        producer.update()
        XCTAssertEqual(producer.breath, 0.0, accuracy: 0.001)
    }
}
