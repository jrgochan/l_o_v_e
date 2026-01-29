import XCTest
import simd
@testable import SoulUI
@testable import SoulCore

final class SoulRendererTests: XCTestCase {

    // MARK: - Visual Mode

    func testVisualModeCycling() {
        let mode = VisualMode.subtle
        let next = mode.next()
        XCTAssertEqual(next, .dynamic)
    }

    func testVisualModeWrapping() {
        let mode = VisualMode.glitch
        let next = mode.next()
        XCTAssertEqual(next, .subtle)
    }

    // MARK: - Matrix Math

    func testPerspectiveMatrixDeterminism() {
        // Perspective Matrix Logic check
        // fovy = 45 deg, aspect = 1.0, near = 0.1, far = 100.0
        let mat = makePerspectiveMatrix(fovyDegrees: 45, aspectRatio: 1.0, nearZ: 0.1, farZ: 100.0)

        // Expected values calculation:
        // y = 1 / tan(22.5 deg) = 1 / 0.4142 = 2.4142
        // x = y / 1.0 = 2.4142
        // z = 100 / (0.1 - 100) = 100 / -99.9 = -1.001
        // w = (100 * 0.1) / (0.1 - 100) = 10 / -99.9 = -0.1001

        // Col 0: (x, 0, 0, 0)
        XCTAssertEqual(mat.columns.0.x, 2.41, accuracy: 0.01)

        // Col 1: (0, y, 0, 0)
        XCTAssertEqual(mat.columns.1.y, 2.41, accuracy: 0.01)

        // Col 2: (0, 0, z, -1)
        XCTAssertEqual(mat.columns.2.z, -1.00, accuracy: 0.01)
        XCTAssertEqual(mat.columns.2.w, -1.0, accuracy: 0.01)
    }

    func testLookAtMatrixIdentity() {
        // Eye at origin looking down -Z, Up is +Y
        // Actually LookAt usually places eye away from origin.
        // Let's test standard case: Eye (0,0,5), Center (0,0,0), Up (0,1,0)

        let eye = SIMD3<Float>(0, 0, 5)
        let center = SIMD3<Float>(0, 0, 0)
        let up = SIMD3<Float>(0, 1, 0)

        let mat = makeLookAtMatrix(eye: eye, center: center, up: up)

        // Forward (Z) = normalize(eye - center) = (0,0,1)
        // Right (X) = cross(up, z) = cross((0,1,0), (0,0,1)) = (1,0,0)
        // Up (Y) = cross(z, x) = cross((0,0,1), (1,0,0)) = (0,1,0)

        // Matrix cols:
        // X axis
        XCTAssertEqual(mat.columns.0.x, 1.0, accuracy: 0.001)
        // Y axis
        XCTAssertEqual(mat.columns.1.y, 1.0, accuracy: 0.001)
        // Z axis
        XCTAssertEqual(mat.columns.2.z, 1.0, accuracy: 0.001)

        // Translation?
        // dot(x, -eye) ...
    }
}
