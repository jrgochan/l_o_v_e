import XCTest
import simd
import SoulCore
@testable import SoulBrain

final class VACMathTests: XCTestCase {
    
    func testIdentity() {
        // Neutral Vibe should produce Identity Quaternion
        let neutral = Vibe(valence: 0, arousal: 0, connection: 0)
        let q = VACMath.quaternion(from: neutral)
        
        XCTAssertEqual(q.real, 1.0, accuracy: 1e-6)
        XCTAssertEqual(q.imag.x, 0.0, accuracy: 1e-6)
        XCTAssertEqual(q.imag.y, 0.0, accuracy: 1e-6)
        XCTAssertEqual(q.imag.z, 0.0, accuracy: 1e-6)
    }
    
    func testJoyVector() {
        // Joy: High Valence, High Arousal, High Connection
        // Python Ref: Joy(0.8, 0.5, 0.6) -> Magnitude ~1.118
        let joy = Vibe(valence: 0.8, arousal: 0.5, connection: 0.6)
        let q = VACMath.quaternion(from: joy)
        
        // 1. Calculate Expected Magnitude
        let vec = simd_double3(0.8, 0.5, 0.6)
        let mag = simd_length(vec) // ~1.118
        
        // 2. Expected Angle
        // angle = pi * (1.118 / 1.732) ~= 2.02 rad
        let maxMag = sqrt(3.0)
        let expectedAngle = Double.pi * (mag / maxMag)
        
        // 3. Verify Angle of Resulting Quat
        // q.angle returns the rotation angle
        XCTAssertEqual(q.angle, expectedAngle, accuracy: 1e-4)
        
        // 4. Verify Axis
        let axis = q.axis
        let expectedAxis = simd_normalize(vec)
        XCTAssertEqual(axis.x, expectedAxis.x, accuracy: 1e-4)
        XCTAssertEqual(axis.y, expectedAxis.y, accuracy: 1e-4)
        XCTAssertEqual(axis.z, expectedAxis.z, accuracy: 1e-4)
    }
    
    func testMaxIntensity() {
        // Maximum possible vector
        let extreme = Vibe(valence: 1.0, arousal: 1.0, connection: 1.0)
        let q = VACMath.quaternion(from: extreme)
        
        // Should be PI rotation (180 degrees)
        XCTAssertEqual(q.angle, Double.pi, accuracy: 1e-4)
    }
}
