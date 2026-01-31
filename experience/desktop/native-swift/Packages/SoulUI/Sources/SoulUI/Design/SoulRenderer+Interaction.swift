import MetalKit
import SoulCore
import SoulBrain
import OSLog

// MARK: - Interaction & Camera
extension SoulRenderer {

    // MARK: - Flight Logic

    public func fly(to emotionName: String) {
        // Prevent bouncing: If we are already flying to OR already at the target, do nothing.
        // We only start a new flight if the target changed or if we manually moved away (target is nil)
        if emotionName == currentFlightTarget { return }
        startFlight(to: emotionName)
    }

    public func flyThrough(path: [String]) {
        guard !path.isEmpty else { return }
        flightQueue = path
        if let first = flightQueue.first {
            flightQueue.removeFirst()
            startFlight(to: first)
        }
    }

    internal func startFlight(to emotionName: String) {
        guard let targetPos = emotionLocations[emotionName] else {
            SoulLog.ui.warning("❌ Flight Computer: Unknown destination '\(emotionName)'")
            if !flightQueue.isEmpty {
                let next = flightQueue.removeFirst()
                startFlight(to: next)
            }
            return
        }

        self.currentFlightTarget = emotionName
        let startPos = camera.position
        let endPos = targetPos + SIMD3<Float>(0, 0, 2.0) // Stop 2 units in front
        let mid = (startPos + endPos) * 0.5 + SIMD3<Float>(0, 1.0, 0.0)

        self.flightPath = [startPos, mid, endPos]
        self.isFlying = true
        self.flightStartTime = Date().timeIntervalSinceReferenceDate
        self.flightDuration = 3.0
        self.flightProgress = 0.0
        
        // Reset flight target interpolation
        self.flightTargetStart = camera.target
        self.flightTargetEnd = targetPos // Look at the emotion
    }

    // MARK: - Flight Internal State (Properties moved to main Class)


    internal func updateCamera(deltaTime: Double) {
        if isFlying {
            let now = Date().timeIntervalSinceReferenceDate
            let elapsed = Float(now - flightStartTime)
            let t = min(elapsed / flightDuration, 1.0)
            let easeT = 1.0 - pow(1.0 - t, 3.0)

            if t >= 1.0 {
                isFlying = false
                camera.position = flightPath.last ?? camera.position
                camera.target = flightTargetEnd // Snap to look at target
                if !flightQueue.isEmpty {
                    let next = flightQueue.removeFirst()
                    startFlight(to: next)
                }
            } else {
                camera.position = SoulBrain.SplineMath.getPointOnPath(points: flightPath, progress: easeT)
                
                // Interpolate Target for Cinematic Focus
                camera.target = mix(flightTargetStart, flightTargetEnd, t: easeT)
            }
            updateFPS(120)
        } else {
            let now = Date().timeIntervalSinceReferenceDate
            if isDragging {
                updateFPS(120)
            } else {
                let hasMomentum = abs(rotationVelocity.x) > 0.0001 || abs(rotationVelocity.y) > 0.0001
                if hasMomentum {
                    applyRotation(delta: rotationVelocity)
                    
                    // Frame-Independent Damping
                    // Damping factor 0.92 at 60fps (16ms) matches original feel
                    // Formula: new = old * pow(damping, dt * targetFPS)
                    let damping = pow(0.92, Float(deltaTime * 60.0))
                    
                    rotationVelocity.x *= CGFloat(damping)
                    rotationVelocity.y *= CGFloat(damping)
                    updateFPS(120)
                } else {
                    let idleTime = now - lastInteractionTime
                    if idleTime > 5.0 {
                        applyRotation(delta: CGPoint(x: 0.2 * deltaTime * 60.0, y: 0))
                        updateFPS(30)
                    } else if idleTime > 3.0 {
                        applyRotation(delta: CGPoint(x: 0.2 * deltaTime * 60.0, y: 0))
                        updateFPS(60)
                    } else {
                        updateFPS(120)
                    }
                }
            }
        }
    }

    internal func updateFPS(_ target: Int) {
        if currentFPS != target {
            currentFPS = target
            DispatchQueue.main.async { [weak self] in
                self?.onFrameRateChange?(target)
            }
        }
    }

    public func resetCamera() {
        self.isFlying = false
        self.flightQueue = []

        let startPos = camera.position
        let endPos = SIMD3<Float>(0, 0, 5)

        self.flightPath = [startPos, (startPos + endPos) * 0.5 + SIMD3<Float>(0, 2, 0), endPos]
        self.flightDuration = 1.5
        self.isFlying = true
        self.flightStartTime = Date().timeIntervalSinceReferenceDate
        self.flightProgress = 0.0
        
        // Reset Focus
        self.flightTargetStart = camera.target
        self.flightTargetEnd = SIMD3<Float>(0, 0, 0)

        self.rotationVelocity = .zero
        self.currentFlightTarget = nil // Clear state
        self.selectedEmotion = nil
        self.onSelectionChange?(nil)
    }

    // MARK: - Orbit Controls

    public func rotateCamera(delta: CGPoint) {
        lastInteractionTime = Date().timeIntervalSinceReferenceDate
        self.currentFlightTarget = nil // Manual override breaks lock
        self.rotationVelocity = delta
        applyRotation(delta: delta)
    }

    public func applyRotation(delta: CGPoint) {
        let speed: Float = 0.005
        let thetaDelta = Float(delta.x) * speed
        let phiDelta = Float(delta.y) * speed

        let offset = camera.position - camera.target
        let r = length(offset)
        var theta = atan2(offset.x, offset.z)
        var phi = acos(offset.y / r)

        theta -= thetaDelta
        phi -= phiDelta

        let epsilon: Float = 0.001
        phi = max(epsilon, min(Float.pi - epsilon, phi))

        let x = r * sin(phi) * sin(theta)
        let y = r * cos(phi)
        let z = r * sin(phi) * cos(theta)

        camera.position = camera.target + SIMD3<Float>(x, y, z)
    }

    public func zoomCamera(delta: Float) {
        lastInteractionTime = Date().timeIntervalSinceReferenceDate
        self.currentFlightTarget = nil // Manual override breaks lock
        let speed: Float = 0.1
        let zoomChange = delta * speed

        let offset = camera.position - camera.target
        let currentDist = length(offset)

        let minDist: Float = 1.5
        let maxDist: Float = 20.0
        let newDist = max(minDist, min(maxDist, currentDist - zoomChange))

        let direction = normalize(offset)
        camera.position = camera.target + (direction * newDist)
    }

    // MARK: - Hit Testing

    public func hitTest(at point: CGPoint) -> String? {
        lastInteractionTime = Date().timeIntervalSinceReferenceDate
        // Use dynamic scale factor (default 2.0 for Retina, but variable)
        let p = CGPoint(x: point.x * contentScaleFactor, y: point.y * contentScaleFactor)
        let ray = screenPointToRay(point: p, viewport: viewportSize)

        for (name, position) in emotionLocations {
            let dist = distanceToRay(rayOrigin: ray.origin, rayDirection: ray.direction, point: position)
            let threshold: Float = (name == hoveredEmotion) ? 0.4 : 0.25
            if dist < threshold {
                return name
            }
        }
        return nil
    }

    public func selectEmotion(_ name: String?) {
        self.selectedEmotion = name
        buildPointCloud()
    }

    public func hoverEmotion(_ name: String?) {
        if self.hoveredEmotion != name {
            self.hoveredEmotion = name
            buildPointCloud()
        }
    }

    public func project(_ position: SIMD3<Float>) -> CGPoint? {
        guard viewportSize.width > 0 && viewportSize.height > 0 else { return nil }

        let aspect = Float(viewportSize.width / viewportSize.height)
        let proj = makePerspectiveMatrix(
            fovyDegrees: camera.fov,
            aspectRatio: aspect,
            nearZ: camera.near,
            farZ: camera.far
        )
        let view = makeLookAtMatrix(eye: camera.position, center: camera.target, up: camera.up)

        let pos4 = SIMD4<Float>(position.x, position.y, position.z, 1.0)
        let clipPos = proj * (view * pos4)

        if clipPos.w <= 0 { return nil }

        let ndc = SIMD3<Float>(clipPos.x / clipPos.w, clipPos.y / clipPos.w, clipPos.z / clipPos.w)
        let x = (ndc.x * 0.5 + 0.5) * Float(viewportSize.width)
        let ndcY_norm = ndc.y * 0.5 + 0.5
        let y_flipped = 1.0 - ndcY_norm
        let y = y_flipped * Float(viewportSize.height)

        return CGPoint(x: Double(x), y: Double(y))
    }

    // MARK: - Delegates

    public func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
        self.viewportSize = size
    }
}

// MARK: - Raycasting Helpers (Internal)
extension SoulRenderer {

    internal struct Ray {
        var origin: SIMD3<Float>
        var direction: SIMD3<Float>
    }

    internal func screenPointToRay(point: CGPoint, viewport: CGSize) -> Ray {
        // Convert to NDC (-1 to 1)
        // SwiftUI/AppKit: (0,0) is Top-Left usually? Or Bottom-Left?
        // MTKView treats (0,0) as Top-Left in points?
        // Let's assume standard normalized device coordinates where (0,0) is center.

        let x = Float(point.x / viewport.width) * 2.0 - 1.0
        let y = 1.0 - Float(point.y / viewport.height) * 2.0 // Flip Y

        let clip = SIMD4<Float>(x, y, -1.0, 1.0)

        // Inverse Projection Space
        let aspect = Float(viewport.width / viewport.height)
        let projIdx = makePerspectiveMatrix(
            fovyDegrees: camera.fov,
            aspectRatio: aspect,
            nearZ: camera.near,
            farZ: camera.far
        )
        let viewIdx = makeLookAtMatrix(eye: camera.position, center: camera.target, up: camera.up)

        let invProj = projIdx.inverse
        let invView = viewIdx.inverse

        var eyeCoords = invProj * clip
        eyeCoords.z = -1.0
        eyeCoords.w = 0.0

        let v = invView * eyeCoords
        var worldDir = SIMD3<Float>(v.x, v.y, v.z)
        worldDir = normalize(worldDir)

        return Ray(origin: camera.position, direction: worldDir)
    }

    internal func distanceToRay(rayOrigin: SIMD3<Float>, rayDirection: SIMD3<Float>, point: SIMD3<Float>) -> Float {
        let diff = point - rayOrigin
        let crossVal = cross(diff, rayDirection)
        return length(crossVal) / length(rayDirection)
    }
}
