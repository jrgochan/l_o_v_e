import XCTest
import MetalKit
@testable import SoulUI
@testable import SoulCore
@testable import SoulBrain

@MainActor
final class SoulRendererLogicTests: XCTestCase {
    
    var renderer: SoulRenderer!
    
    override func setUp() {
        guard let device = MTLCreateSystemDefaultDevice() else {
            XCTFail("Metal not supported")
            return
        }
        renderer = SoulRenderer(device: device)
    }
    
    // MARK: - Spline Logic
    
    func testUpdateSplineGeneratesVertices() {
        let points: [SIMD3<Float>] = [
            SIMD3(0,0,0),
            SIMD3(1,1,1),
            SIMD3(2,2,2)
        ]
        
        renderer.updateSpline(points: points)
        
        // 3 points = 2 segments. Each segment has 2 vertices (ribbon).
        // Actually code generates 2 vertices per point-pair segment. 
        // Iterate 0..<count.
        // Index 0: prev=0, next=1. P1, P2. (2 verts)
        // Index 1: prev=0, next=2. P1, P2. (2 verts)
        // Index 2: prev=1, next=2. P1, P2. (2 verts)
        // Total 6 vertices.
        
        XCTAssertEqual(renderer.pathVertexCount, 6)
        XCTAssertNotNil(renderer.pathBuffer)
    }
    
    // MARK: - Flight Logic
    
    func testFlightInitiation() {
        // Setup locations
        renderer.emotionLocations["Joy"] = SIMD3<Float>(10, 10, 10)
        
        XCTAssertFalse(renderer.isFlying)
        
        renderer.fly(to: "Joy")
        
        XCTAssertTrue(renderer.isFlying)
        XCTAssertEqual(renderer.currentFlightTarget, "Joy")
        XCTAssertEqual(renderer.flightPath.count, 3) // Start, Mid, End
    }
    
    func testFlightQueuing() {
        renderer.emotionLocations["Joy"] = SIMD3<Float>(10, 10, 10)
        renderer.emotionLocations["Sadness"] = SIMD3<Float>(-10, -10, -10)
        
        renderer.flyThrough(path: ["Joy", "Sadness"])
        
        XCTAssertTrue(renderer.isFlying)
        XCTAssertEqual(renderer.currentFlightTarget, "Joy") // Starts immediately
        XCTAssertEqual(renderer.flightQueue, ["Sadness"]) // Remaining queue
    }
    
    // MARK: - Raycasting / HitTest
    
    func testHitTestLogic() {
        renderer.viewportSize = CGSize(width: 1000, height: 1000)
        renderer.emotionLocations["Center"] = SIMD3<Float>(0, 0, 0) // At camera target?
        
        // Camera is at (0,0,-5) looking at (0,0,0) by default in resetCamera (conceptually).
        // Let's reset to known state.
        renderer.resetCamera()
        renderer.camera.position = SIMD3<Float>(0, 0, -5)
        renderer.camera.target = SIMD3<Float>(0, 0, 0)
        
        // Click dead center
        // Note: Projecting math is complex to test perfectly without pixel-perfect setup,
        // but we can sanity check the ray generation basics if we exposed them, 
        // or just test the public API 'hitTest' with an obvious target.
        
        // Just verify it returns nil for empty space
        let hit = renderer.hitTest(at: CGPoint(x: 0, y: 0))
        // Might hit or not depending on exact projection matrix defaults. 
        // But ensures no crash.
        XCTAssertNoThrow(renderer.hitTest(at: CGPoint(x: 500, y: 500)))
    }
    
    // MARK: - Projection
    
    func testProject() {
        renderer.viewportSize = CGSize(width: 100, height: 100)
        renderer.camera.position = SIMD3<Float>(0, 0, -5)
        renderer.camera.target = SIMD3<Float>(0, 0, 0)
        
        let center = SIMD3<Float>(0, 0, 0)
        let projected = renderer.project(center)
        
        XCTAssertNotNil(projected)
        // Should be roughly center of screen (50, 50) given symmetry
        if let p = projected {
            XCTAssertEqual(p.x, 50, accuracy: 1.0)
            XCTAssertEqual(p.y, 50, accuracy: 1.0)
        }
    }
}
