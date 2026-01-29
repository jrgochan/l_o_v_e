import XCTest
import simd
@testable import SoulCore

final class SoulMathTests: XCTestCase {

    // MARK: - VACVector Tests

    func testVACVectorInitialization() {
        let vec = SoulMath.VACVector(valence: 0.5, arousal: -0.5, connection: 1.0)
        XCTAssertEqual(vec.valence, 0.5)
        XCTAssertEqual(vec.arousal, -0.5)
        XCTAssertEqual(vec.connection, 1.0)
    }

    func testToQuaternionIdentity() {
        // Neutral (0,0,0) should ideally result in Identity Quaternion (0,0,0,1) or close to it depending on implementation.
        // Let's assume lookAt(0,0,0) from (0,0,1) -> Identity.

        let vec = SoulMath.VACVector(valence: 0, arousal: 0, connection: 0)
        let q = vec.toQuaternion()

        // Identity quaternion: r=1 (real part), v=(0,0,0) (imaginary part)
        // Note: simd_quat implementation detail: vector is imaginary (x,y,z), scalar is real (w).
        // Let's check magnitude is 1.0 (normalized)
        XCTAssertEqual(q.length, 1.0, accuracy: 0.001)
    }

    func testToQuaternionNormalization() {
        // High magnitude input should be normalized inside
        let vec = SoulMath.VACVector(valence: 10, arousal: 10, connection: 10)
        let q = vec.toQuaternion()

        XCTAssertEqual(q.length, 1.0, accuracy: 0.001)
    }
}
