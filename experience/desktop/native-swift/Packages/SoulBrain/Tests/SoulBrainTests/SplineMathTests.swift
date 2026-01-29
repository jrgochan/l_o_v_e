import XCTest
import simd
@testable import SoulBrain

final class SplineMathTests: XCTestCase {
    
    func testCatmullRomInterpolation() {
        // Linear points: 0, 1, 2, 3
        let p0 = SIMD3<Float>(0, 0, 0)
        let p1 = SIMD3<Float>(1, 0, 0)
        let p2 = SIMD3<Float>(2, 0, 0)
        let p3 = SIMD3<Float>(3, 0, 0)
        
        // At t=0.5, it should be exactly 1.5 for a perfectly linear arrangement
        let mid = SplineMath.catmullRom(p0: p0, p1: p1, p2: p2, p3: p3, t: 0.5)
        
        XCTAssertEqual(mid.x, 1.5, accuracy: 0.0001)
        XCTAssertEqual(mid.y, 0, accuracy: 0.0001)
        XCTAssertEqual(mid.z, 0, accuracy: 0.0001)
    }
    
    func testGetPointOnPath() {
        // Path: (0,0,0) -> (10,0,0) -> (10,10,0)
        let points = [
            SIMD3<Float>(0, 0, 0),
            SIMD3<Float>(10, 0, 0),
            SIMD3<Float>(10, 10, 0)
        ]
        
        // Total segments = 2
        // Progress 0.0 -> Point 0
        let start = SplineMath.getPointOnPath(points: points, progress: 0.0)
        XCTAssertEqual(start.x, 0, accuracy: 0.001)
        
        // Progress 0.5 -> Exact Middle (Point 1: 10,0,0)
        let mid = SplineMath.getPointOnPath(points: points, progress: 0.5)
        XCTAssertEqual(mid.x, 10, accuracy: 0.001)
        XCTAssertEqual(mid.y, 0, accuracy: 0.001)
        
        // Progress 1.0 -> Point 2
        let end = SplineMath.getPointOnPath(points: points, progress: 1.0)
        XCTAssertEqual(end.x, 10, accuracy: 0.001)
        XCTAssertEqual(end.y, 10, accuracy: 0.001)
        
        // Progress 0.25 -> Middle of first segment (approx 5,0,0)
        // Note: Splines curve, so it won't be EXACTLY linear, but close.
        let quarter = SplineMath.getPointOnPath(points: points, progress: 0.25)
        XCTAssertGreaterThan(quarter.x, 4.0)
        XCTAssertLessThan(quarter.x, 6.0)
    }
    
    func testClosedLoopPath() {
        // Path: (0,0,0) -> (10,0,0) -> (10,10,0) -> (0,10,0) [Square]
        // Closed means it wraps back to (0,0,0)
        let points = [
            SIMD3<Float>(0, 0, 0),
            SIMD3<Float>(10, 0, 0),
            SIMD3<Float>(10, 10, 0),
            SIMD3<Float>(0, 10, 0)
        ]
        
        // Progress 0.0 -> Point 0
        let start = SplineMath.getPointOnPath(points: points, progress: 0.0, closed: true)
        XCTAssertEqual(start.x, 0, accuracy: 0.001)
        
        // Progress 1.0 -> Wrap to Point 0
        let end = SplineMath.getPointOnPath(points: points, progress: 1.0, closed: true)
        XCTAssertEqual(end.x, 0, accuracy: 0.001)
        XCTAssertEqual(end.y, 0, accuracy: 0.001)
        
        // Progress 0.5 -> Middle (Point 2: 10,10,0)
        // With 4 points closed, indices are 0->1, 1->2, 2->3, 3->0. Total 4 segments.
        // 0.5 * 4 = Index 2.0 -> Point 2
        let mid = SplineMath.getPointOnPath(points: points, progress: 0.5, closed: true)
        XCTAssertEqual(mid.x, 10, accuracy: 0.001)
        XCTAssertEqual(mid.y, 10, accuracy: 0.001)
    }
    
    func testLoopWrapping() {
        let points = [
            SIMD3<Float>(0, 0, 0),
            SIMD3<Float>(10, 0, 0)
        ]
        _ = points // Silence unused warning
    }
}
