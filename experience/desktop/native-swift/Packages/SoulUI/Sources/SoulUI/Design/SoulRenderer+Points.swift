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
            let point = createPointInstance(for: node)
            points.append(point)
            self.emotionLocations[node.name] = SIMD3<Float>(point.position.x, point.position.y, point.position.z)
        }

        self.pointCount = points.count

        if points.isEmpty { return }

        let size = points.count * MemoryLayout<PointInstance>.stride
        self.pointBuffer = device.makeBuffer(bytes: points, length: size, options: .storageModeShared)
    }

    private func createPointInstance(for node: EmotionEngine.EmotionNode) -> PointInstance {
        // Map VAC to 3D Position
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

        // Advanced Spectral Color Mapping
        // Valence (-1 to 1) -> Hue (Purple/Blue -> Cyan/Green -> Gold/Orange)
        let v = Float(node.vibe.valence)
        let a = Float(node.vibe.arousal)
        let c = Float(node.vibe.connection)

        // Map Valence to Hue (0..1)
        // -1 (Negative) = 0.75 (Purple)
        // 0 (Neutral) = 0.5 (Cyan)
        // +1 (Positive) = 0.1 (Gold/Orange)
        let hue = 0.5 - (v * 0.35)

        // Saturation driven by Arousal (Higher arousal = more intense color)
        let sat = 0.6 + (a * 0.4)

        // Lightness driven by Connection (Higher connection = brighter/lighter)
        // But keep it visible regardless so clamp min.
        let light = 0.3 + (c * 0.4) + (isSelected * 0.2)

        let rgb = hslToRgb(h: hue, s: sat, l: light)
        let color = SIMD4<Float>(rgb.x, rgb.y, rgb.z, 0.9)

        let randomSize: Float = Float.random(in: 0.05...0.15)
        let finalSize = scale * randomSize

        let pos = SIMD4<Float>(
            Float(node.vibe.valence) * 1.0,
            Float(node.vibe.arousal) * 1.0,
            Float(node.vibe.connection) * 1.0,
            finalSize
        )

        // Encode VAC into props for shader animation
        // x: Selection, y: Hover, z: Normalized Valence, w: Normalized Arousal
        let props = SIMD4<Float>(isSelected, isHovered, v, a)
        
        // Pass Connection in quaternion.w if needed, or just rely on color
        // Actually, let's pack Connection into quaternion.w since it's free real estate
        var quat = SoulMath.VACVector(
            valence: Float(node.vibe.valence),
            arousal: Float(node.vibe.arousal),
            connection: Float(node.vibe.connection)
        ).toQuaternion().vector
        
        quat.w = c // Hijack W for Connection data

        return PointInstance(position: pos, color: color, props: props, quaternion: quat)
    }

    // Helper: HSL to RGB
    private func hslToRgb(h: Float, s: Float, l: Float) -> SIMD3<Float> {
        let c = (1.0 - abs(2.0 * l - 1.0)) * s
        let x = c * (1.0 - abs(fmod(h * 6.0, 2.0) - 1.0))
        let m = l - c / 2.0
        
        var r: Float = 0
        var g: Float = 0
        var b: Float = 0
        
        if h < 1.0/6.0 { r=c; g=x; b=0 }
        else if h < 2.0/6.0 { r=x; g=c; b=0 }
        else if h < 3.0/6.0 { r=0; g=c; b=x }
        else if h < 4.0/6.0 { r=0; g=x; b=c }
        else if h < 5.0/6.0 { r=x; g=0; b=c }
        else { r=c; g=0; b=x }
        
        return SIMD3<Float>(r+m, g+m, b+m)
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
