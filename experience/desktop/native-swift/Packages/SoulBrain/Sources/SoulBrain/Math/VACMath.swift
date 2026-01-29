import Foundation
import simd
import SoulCore

/// Mathematical engine for Emotional Vector calculations.
/// Ports logic from `versor/app/core/vac_model.py` to Native Swift/SIMD.
public struct VACMath {
    
    /// Theoretical maximum magnitude of a VAC vector (sqrt(1^2 + 1^2 + 1^2))

    /// Converts a Vibe (VAC Vector) to a Unit Quaternion for the Soul Sphere.
    ///
    /// Delegates to `SoulCore.SoulMath` for the authoritative calculation.
    public static func quaternion(from vibe: Vibe) -> simd_quatd {
        // Convert to Float for SoulMath, then back to Double if needed.
        // Or implement Double logic in SoulMath. 
        // For now, casting for consistency.
        let fQuat = vibe.quaternion
        
        // Handle Identity / Zero Angle
        if fQuat.angle < 1e-6 {
            return simd_quatd(ix: 0, iy: 0, iz: 0, r: 1)
        }
        
        // Convert Float Quaternion to Double Quaternion
        let axis = simd_double3(Double(fQuat.axis.x), Double(fQuat.axis.y), Double(fQuat.axis.z))
        let angle = Double(fQuat.angle)
        
        return simd_quatd(angle: angle, axis: axis)
    }
    
    /// Calculates the angular distance between two vibes (in radians).
    /// Used to determine "emotional effort" required to transition.
    public static func distance(from: Vibe, to: Vibe) -> Double {
        let v1 = SIMD3<Float>(Float(from.valence), Float(from.arousal), Float(from.connection))
        let v2 = SIMD3<Float>(Float(to.valence), Float(to.arousal), Float(to.connection))
        
        return Double(SoulMath.distance(from: v1, to: v2))
    }
}
