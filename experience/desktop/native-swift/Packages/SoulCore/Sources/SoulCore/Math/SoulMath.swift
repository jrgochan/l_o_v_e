import Foundation
import simd

/// Mathematical utilities for the Soul Engine.
public struct SoulMath {

    /// A VAC (Valence, Arousal, Connection) vector representing an emotional state.
    public struct VACVector {
        public var valence: Float
        public var arousal: Float
        public var connection: Float

        public init(valence: Float, arousal: Float, connection: Float) {
            self.valence = valence
            self.arousal = arousal
            self.connection = connection
        }

        /// Clamps components to [-1, 1] range.
        public func clamped() -> VACVector {
            VACVector(
                valence: max(-1, min(1, valence)),
                arousal: max(-1, min(1, arousal)),
                connection: max(-1, min(1, connection))
            )
        }

        public var magnitude: Float {
            sqrt(valence * valence + arousal * arousal + connection * connection)
        }

        public var simdValue: SIMD3<Float> {
            SIMD3<Float>(valence, arousal, connection)
        }

        /// Converts the VAC emotional state to a rotation quaternion.
        ///
        /// 1. Direction (Axis): Normalized VAC vector defines rotation axis.
        /// 2. Intensity (Angle): VAC magnitude maps to rotation angle.
        ///    Mapping: ||VAC|| in [0, sqrt(3)] -> theta in [0, pi]
        ///
        /// Formula: q = cos(theta/2) + sin(theta/2) * (normalized_VAC)
        public func toQuaternion() -> simd_quatf {
            let v = self.clamped()
            let mag = v.magnitude

            // Handle neutral state (near zero)
            if mag < 1e-6 {
                return simd_quatf(ix: 0, iy: 0, iz: 0, r: 1) // Identity
            }

            // Normalize axis
            let axis = v.simdValue / mag

            // Calculate angle: Map [0, sqrt(3)] to [0, pi]
            let maxMagnitude = sqrt(Float(3.0))
            let angle = Float.pi * (mag / maxMagnitude)

            // Construct quaternion from axis-angle
            return simd_quatf(angle: angle, axis: axis)
        }
    }

    // MARK: - Helpers

    /// Calculates the angular distance between two VAC vectors.
    public static func distance(from v1: SIMD3<Float>, to v2: SIMD3<Float>) -> Float {
        let q1 = VACVector(valence: v1.x, arousal: v1.y, connection: v1.z).toQuaternion()
        let q2 = VACVector(valence: v2.x, arousal: v2.y, connection: v2.z).toQuaternion()

        let dot = abs(simd_dot(q1, q2))
        let clampedDot = min(max(dot, -1.0), 1.0)

        return 2.0 * acos(clampedDot)
    }
}
