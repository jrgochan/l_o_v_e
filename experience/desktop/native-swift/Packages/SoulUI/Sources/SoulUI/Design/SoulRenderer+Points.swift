import MetalKit
import SoulCore
import SoulBrain

// MARK: - Point Cloud Management
extension SoulRenderer {

    struct LineVertex {
        var position: SIMD3<Float>
        var color: SIMD4<Float>
    }

    struct PointInstance {
        var position: SIMD4<Float> // .w = size
        var color: SIMD4<Float>
        var props: SIMD4<Float> // .x = Selection (0 or 1), .y = Hover (0 or 1)
        var quaternion: SIMD4<Float> // NEW: Rotation
    }

    internal func buildPointCloud() {
        // Initial fallback
        updatePointCloud(with: EmotionEngine.all)
    }

    public func updatePointCloud(with nodes: [EmotionEngine.EmotionNode]) {
        var points: [PointInstance] = []

        for node in nodes {
            // Map VAC to 3D Position
            // Valence (X), Arousal (Y), Connection (Z)

            // Hover/Selection Scale
            var scale: Float = 1.0

            var isSelected: Float = 0.0
            if node.name == selectedEmotion {
                scale = 2.0
                isSelected = 1.0
            }

            var isHovered: Float = 0.0
            if node.name == hoveredEmotion {
                scale = 2.0
                isHovered = 1.0
            }

            // Color Logic (Reference Palette)
            let v = Float(node.vibe.valence)
            let a = Float(node.vibe.arousal)

            var color = SIMD4<Float>(1, 1, 1, 1.0)

            if v > 0.2 {
                // Positive: Cyan to Green
                color = SIMD4<Float>(0.0, 1.0, 0.8, 0.9) // Cyan
                if a > 0.5 {
                    color = SIMD4<Float>(0.2, 1.0, 0.2, 1.0) // Eletric Green
                }
            } else if v < -0.2 {
                // Negative: Magenta to Red
                color = SIMD4<Float>(1.0, 0.0, 0.5, 0.9) // Magenta
                if a > 0.5 {
                    color = SIMD4<Float>(1.0, 0.2, 0.0, 1.0) // Red/Orange
                }
            } else {
                // Neutral: Deep Blue/Purple
                color = SIMD4<Float>(0.4, 0.4, 1.0, 0.6)
            }

            // Randomize size slightly for organic feel
            // We need deterministic randomness for stability, or just random is fine?
            // Swift.Float.random is fine if we rebuild fully only on data change.
            let randomSize: Float = Float.random(in: 0.05...0.15)
            let finalSize = scale * randomSize

            let pos = SIMD4<Float>(
                Float(node.vibe.valence) * 1.0,
                Float(node.vibe.arousal) * 1.0,
                Float(node.vibe.connection) * 1.0,
                finalSize
            )

            let props = SIMD4<Float>(isSelected, isHovered, 0, 0)

            // Calculate Quaternion from VAC
            let vac = SoulMath.VACVector(valence: Float(node.vibe.valence), arousal: Float(node.vibe.arousal), connection: Float(node.vibe.connection))
            let quat = vac.toQuaternion().vector

            points.append(PointInstance(position: pos, color: color, props: props, quaternion: quat))

            // Store location for flight computer / labels
            self.emotionLocations[node.name] = SIMD3<Float>(pos.x, pos.y, pos.z)
        }

        self.pointCount = points.count

        if points.isEmpty { return }

        let size = points.count * MemoryLayout<PointInstance>.stride
        self.pointBuffer = device.makeBuffer(bytes: points, length: size, options: .storageModeShared)
    }

    public func updatePath(with emotionNames: [String]) {
        var vertices: [LineVertex] = []

        let tubeRadius: Float = 0.05

        for i in 0..<emotionNames.count {
            let name = emotionNames[i]
            if let pos = emotionLocations[name] {
                // Generate simple ribbon

                var prev = pos
                if i > 0, let pName = emotionLocations[emotionNames[i-1]] {
                    prev = pName
                }

                var next = pos
                if i < emotionNames.count - 1, let nName = emotionLocations[emotionNames[i+1]] {
                    next = nName
                }

                // Tangent
                let tangent = normalize(next - prev)
                // Normal (Arbitrary Up Cross)
                let up = SIMD3<Float>(0, 1, 0)
                var right = cross(tangent, up)
                if length(right) < 0.001 { right = SIMD3<Float>(1, 0, 0) }
                right = normalize(right) * tubeRadius

                let p1 = pos - right
                let p2 = pos + right

                // Bright Neon Cyan/Magenta
                let color = SIMD4<Float>(0.0, 1.0, 1.0, 0.9)

                vertices.append(LineVertex(position: p1, color: color))
                vertices.append(LineVertex(position: p2, color: color))
            }
        }

        self.pathVertexCount = vertices.count

        guard !vertices.isEmpty else { return }

        let size = vertices.count * MemoryLayout<LineVertex>.stride
        self.pathBuffer = device.makeBuffer(bytes: vertices, length: size, options: .storageModeShared)
    }

    public func updateSpline(points: [SIMD3<Float>]) {
        var vertices: [LineVertex] = []
        let tubeRadius: Float = 0.03 // Slightly thinner for replay

        guard points.count > 1 else {
            self.pathVertexCount = 0
            return
        }

        for i in 0..<points.count {
            let pos = points[i]

            // Generate simple ribbon
            var prev = pos
            if i > 0 {
                prev = points[i-1]
            }

            var next = pos
            if i < points.count - 1 {
                next = points[i+1]
            }

            // Tangent
            let tangent = normalize(next - prev)
            // Normal (Arbitrary Up Cross)
            let up = SIMD3<Float>(0, 1, 0)
            var right = cross(tangent, up)
            if length(right) < 0.001 { right = SIMD3<Float>(1, 0, 0) }
            right = normalize(right) * tubeRadius

            let p1 = pos - right
            let p2 = pos + right

            // Gold/Amber for History
            let color = SIMD4<Float>(1.0, 0.8, 0.2, 0.8)

            vertices.append(LineVertex(position: p1, color: color))
            vertices.append(LineVertex(position: p2, color: color))
        }

        self.pathVertexCount = vertices.count

        guard !vertices.isEmpty else { return }

        let size = vertices.count * MemoryLayout<LineVertex>.stride
        self.pathBuffer = device.makeBuffer(bytes: vertices, length: size, options: .storageModeShared)
    }
}
