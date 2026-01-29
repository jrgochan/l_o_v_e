import Foundation
import simd

/// Utilities for calculating Catmull-Rom splines for smooth camera transitions.
public struct SplineMath {

    /// Calculates a point on a Catmull-Rom spline at time t (0...1).
    /// - Parameters:
    ///   - p0: Control point 0 (Previous)
    ///   - p1: Control point 1 (Start)
    ///   - p2: Control point 2 (End)
    ///   - p3: Control point 3 (Next)
    ///   - t: Interpolation factor (0 to 1)
    public static func catmullRom(p0: SIMD3<Float>, p1: SIMD3<Float>, p2: SIMD3<Float>, p3: SIMD3<Float>, t: Float) -> SIMD3<Float> {
        let t2 = t * t
        let t3 = t2 * t

        let v0 = (p2 - p0) * 0.5
        let v1 = (p3 - p1) * 0.5

        let term1 = (2 * p1 - 2 * p2 + v0 + v1) * t3
        let term2 = (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2
        let term3 = v0 * t

        return term1 + term2 + term3 + p1
    }

    /// Calculates a point on a multi-segment path.
    /// - Parameters:
    ///   - points: Array of 3D points defining the path.
    ///   - progress: Total path progress (0...1).
    ///   - closed: Whether the path loops.
    public static func getPointOnPath(points: [SIMD3<Float>], progress: Float, closed: Bool = false) -> SIMD3<Float> {
        if points.isEmpty { return .zero }
        if points.count == 1 { return points[0] }

        // Calculate total indices
        let count = points.count
        let maxIndex = closed ? count : count - 1

        // Map progress to segment index
        let totalProgress = progress * Float(maxIndex)
        let index = Int(floor(totalProgress))
        let t = totalProgress - Float(index)

        // Get control points
        // p1 is current index
        let idx1 = index % count
        let p1 = points[idx1]

        // p2 is next index
        let idx2 = (index + 1) % count
        let p2 = points[idx2]

        // p0 is previous (or duplicate p1 if start)
        let idx0 = (index - 1 + count) % count
        let p0 = closed || index > 0 ? points[idx0] : p1 - (p2 - p1) // Extrapolate if open start

        // p3 is next next (or duplicate p2 if end)
        let idx3 = (index + 2) % count
        let p3 = closed || index < count - 2 ? points[idx3] : p2 + (p2 - p1) // Extrapolate if open end

        return catmullRom(p0: p0, p1: p1, p2: p2, p3: p3, t: t)
    }
}
