import MetalKit
import simd
import SoulCore
import SoulBrain
/// Defines the 7 distinct visual states for the Soul Rendering Engine.
public enum VisualMode: Int, CaseIterable, Sendable {
    case subtle = 0
    case dynamic = 1
    case mystical = 2
    case crystalline = 3
    case luminous = 4
    case liquid = 5
    case glitch = 6

    public var displayName: String {
        switch self {
        case .subtle: return "Subtle"
        case .dynamic: return "Dynamic"
        case .mystical: return "Mystical"
        case .crystalline: return "Crystalline"
        case .luminous: return "Luminous"
        case .liquid: return "Liquid"
        case .glitch: return "Glitch"
        }
    }

    public var description: String {
        switch self {
        case .subtle: return "Calm and understated visualization."
        case .dynamic: return "Standard energetic visualization."
        case .mystical: return "Ethereal, soft, and dreamlike."
        case .crystalline: return "Sharp, faceted, and refractive like a gem."
        case .luminous: return "High-energy, glowing core."
        case .liquid: return "Deep, glossy, iridescent waves."
        case .glitch: return "Digital artifacts and matrix-like distortion."
        }
    }

    public func next() -> VisualMode {
        let all = Self.allCases
        let index = all.firstIndex(of: self) ?? 0
        return all[(index + 1) % all.count]
    }
}

@MainActor
public class SoulRenderer: NSObject, MTKViewDelegate {
    public let device: MTLDevice
    internal let commandQueue: MTLCommandQueue
    internal var pipelineState: MTLRenderPipelineState?
    private var startTime: Date = Date()

    // Properties to be updated from SwiftUI
    public var vibe: SIMD3<Float> = SIMD3<Float>(0, 0, 0)
    public var audioLevel: Float = 0.0 // NEW

    // Point Cloud Properties
    internal var pointPipeline: MTLRenderPipelineState?
    internal var pointBuffer: MTLBuffer?
    public internal(set) var pointCount: Int = 0

    // Path Properties
    internal var pathPipeline: MTLRenderPipelineState?
    internal var pathBuffer: MTLBuffer?
    internal var pathVertexCount: Int = 0

    // Memory Layout must match Metal struct alignment
    // Camera State
    public struct Camera {
        var position: SIMD3<Float> = SIMD3<Float>(0, 0, 6)
        var target: SIMD3<Float> = SIMD3<Float>(0, 0, 0)
        var up: SIMD3<Float> = SIMD3<Float>(0, 1, 0)
        var fov: Float = 45.0
        var near: Float = 0.1
        var far: Float = 100.0
    }

    public var camera = Camera()

    // Interaction State
    internal var lastMousePosition: CGPoint = .zero
    public var isDragging = false
    internal var lastInteractionTime: TimeInterval = 0 // Track idle time
    public var onSelectionChange: ((String?) -> Void)?
    public var onHoverChange: ((String?) -> Void)? // NEW: Hover Callback
    public var onLabelsUpdate: (([(String, CGPoint)]) -> Void)? // Callback for 2D labels

    // Internal Selection State
    internal var selectedEmotion: String?
    internal var hoveredEmotion: String? // NEW: Hover Statenment

    // Memory Layout must match Metal struct alignment
    struct Uniforms {
        var time: Float
        var mode: Int32 // Visual Mode
        var resolution: SIMD2<Float>
        var vibe: SIMD3<Float>
        var audioLevel: Float // NEW
        var _padding2: SIMD3<Float> // Adjusted padding

        var viewMatrix: matrix_float4x4
        var projectionMatrix: matrix_float4x4
        var invViewMatrix: matrix_float4x4
    }

    // Flight State
    internal var isFlying = false

    internal var flightPath: [SIMD3<Float>] = []
    internal var flightQueue: [String] = [] // For sequenced flight
    internal var flightProgress: Float = 0.0
    internal var flightDuration: Float = 5.0
    internal var flightStartTime: TimeInterval = 0

    // Configuration
    public var showParticles: Bool = true
    public var showLiquid: Bool = true
    public var showPath: Bool = true

    public var visualMode: VisualMode = .subtle {
        didSet {
            print("🎨 Renderer VisualMode Changed: \(visualMode.displayName) (Raw: \(visualMode.rawValue))")
            onVisualModeChange?(visualMode) // NEW: Notify UI
        }
    }

    // Interaction
    internal var viewportSize: CGSize = .zero

    // Map of Emotion Name -> 3D Position
    internal var emotionLocations: [String: SIMD3<Float>] = [:]
    internal var currentFlightTarget: String?

    // Momentum State
    internal var rotationVelocity: CGPoint = .zero

    public var onVisualModeChange: ((VisualMode) -> Void)? // NEW: UI Sync
    public var onFrameRateChange: ((Int) -> Void)? // NEW: Adaptive FPS
    internal var currentFPS: Int = 120
    internal var depthState: MTLDepthStencilState?

    public init?(device: MTLDevice) {
        self.device = device
        guard let queue = device.makeCommandQueue() else { return nil }
        self.commandQueue = queue
        super.init()

        buildPipeline()
        buildPointCloud()

        // Initial Camera Position
        camera.position = SIMD3<Float>(0, 0, 5)
        camera.target = SIMD3<Float>(0, 0, 0)

        self.lastInteractionTime = Date().timeIntervalSinceReferenceDate
    }

    @MainActor
    public func draw(in view: MTKView) {
        // Ensure viewport size is synced for hit testing
        if viewportSize == .zero { viewportSize = view.drawableSize }
        updateCamera()

        view.depthStencilPixelFormat = .depth32Float

        guard let drawable = view.currentDrawable,
              let descriptor = view.currentRenderPassDescriptor,
              let commandBuffer = commandQueue.makeCommandBuffer() else { return }

        // Clear Color: Black
        descriptor.colorAttachments[0].clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
        descriptor.colorAttachments[0].loadAction = .clear

        // Clear Depth
        descriptor.depthAttachment.clearDepth = 1.0
        descriptor.depthAttachment.loadAction = .clear
        descriptor.depthAttachment.storeAction = .dontCare

        guard let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: descriptor) else { return }

        // Prepare Uniforms
        var uniforms = makeUniforms(view: view)

        // Render Passes
        drawPointCloud(encoder: encoder, uniforms: &uniforms)
        drawPaths(encoder: encoder, uniforms: &uniforms)
        drawLiquidSphere(encoder: encoder, uniforms: &uniforms)

        encoder.endEncoding()
        commandBuffer.present(drawable)
        commandBuffer.commit()

        updateLabels()
    }

    private func makeUniforms(view: MTKView) -> Uniforms {
        let time = Float(Date().timeIntervalSince(startTime))
        let aspect = Float(view.drawableSize.width / view.drawableSize.height)
        let projectionMatrix = makePerspectiveMatrix(fovyDegrees: camera.fov, aspectRatio: aspect, nearZ: camera.near, farZ: camera.far)
        let viewMatrix = makeLookAtMatrix(eye: camera.position, center: camera.target, up: camera.up)

        return Uniforms(
            time: time,
            mode: Int32(visualMode.rawValue),
            resolution: SIMD2<Float>(Float(view.drawableSize.width), Float(view.drawableSize.height)),
            vibe: vibe,
            audioLevel: audioLevel,
            _padding2: SIMD3<Float>(0, 0, 0),
            viewMatrix: viewMatrix,
            projectionMatrix: projectionMatrix,
            invViewMatrix: viewMatrix.inverse
        )
    }

    private func drawPointCloud(encoder: MTLRenderCommandEncoder, uniforms: inout Uniforms) {
        if showParticles, let pointBuffer = pointBuffer, let pointPipeline = pointPipeline {
            encoder.setRenderPipelineState(pointPipeline)
            if let depthState = depthState {
                encoder.setDepthStencilState(depthState)
            }
            encoder.setVertexBytes(&uniforms, length: MemoryLayout<Uniforms>.stride, index: 1)
            encoder.setVertexBuffer(pointBuffer, offset: 0, index: 0)
            encoder.drawPrimitives(type: .point, vertexStart: 0, vertexCount: 1, instanceCount: pointCount)
        }
    }

    private func drawPaths(encoder: MTLRenderCommandEncoder, uniforms: inout Uniforms) {
        if showPath, let pathBuffer = pathBuffer, let pathPipeline = pathPipeline {
            encoder.setRenderPipelineState(pathPipeline)
            if let depthState = depthState {
                encoder.setDepthStencilState(depthState)
            }
            encoder.setVertexBytes(&uniforms, length: MemoryLayout<Uniforms>.stride, index: 1)
            encoder.setVertexBuffer(pathBuffer, offset: 0, index: 0)
            encoder.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: pathVertexCount)
        }
    }

    private func drawLiquidSphere(encoder: MTLRenderCommandEncoder, uniforms: inout Uniforms) {
        guard showLiquid, let pipeline = pipelineState else { return }

        encoder.setRenderPipelineState(pipeline)

        // Translucent Pass: Don't write depth, but TEST against existing depth
        let depthDesc = MTLDepthStencilDescriptor()
        depthDesc.depthCompareFunction = .less
        depthDesc.isDepthWriteEnabled = false
        let depthStateRead = device.makeDepthStencilState(descriptor: depthDesc)

        if let depthStateRead = depthStateRead {
             encoder.setDepthStencilState(depthStateRead)
        }

        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<Uniforms>.stride, index: 0)
        encoder.setVertexBytes(&uniforms, length: MemoryLayout<Uniforms>.stride, index: 1)
        encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 6)
    }
    private func updateLabels() {
        // Post-Frame: Calculate Labels if needed
        if let updateBlock = onLabelsUpdate, !emotionLocations.isEmpty {
            var labels: [(String, CGPoint)] = []

            // Optimization: Only project active elements (Selected or Hovered)
            let activeNames = Set([selectedEmotion, hoveredEmotion].compactMap { $0 })

            for name in activeNames {
                if let pos = emotionLocations[name], let screenPos = project(pos) {
                    labels.append((name, screenPos))
                }
            }
            updateBlock(labels)
        }
    }

// MARK: - Matrix Helpers
internal func makePerspectiveMatrix(fovyDegrees: Float, aspectRatio: Float, nearZ: Float, farZ: Float) -> matrix_float4x4 {
    let fov = fovyDegrees * .pi / 180.0
    let y = 1.0 / tan(fov * 0.5)
    let x = y / aspectRatio
    let z = farZ / (nearZ - farZ)
    let w = (farZ * nearZ) / (nearZ - farZ)

    return matrix_float4x4(columns: (
        SIMD4<Float>(x, 0, 0, 0),
        SIMD4<Float>(0, y, 0, 0),
        SIMD4<Float>(0, 0, z, -1),
        SIMD4<Float>(0, 0, w, 0)
    ))
}

internal func makeLookAtMatrix(eye: SIMD3<Float>, center: SIMD3<Float>, up: SIMD3<Float>) -> matrix_float4x4 {
    let z = normalize(eye - center)
    let x = normalize(cross(up, z))
    let y = cross(z, x)

    return matrix_float4x4(columns: (
        SIMD4<Float>(x.x, y.x, z.x, 0),
        SIMD4<Float>(x.y, y.y, z.y, 0),
        SIMD4<Float>(x.z, y.z, z.z, 0),
        SIMD4<Float>(-dot(x, eye), -dot(y, eye), -dot(z, eye), 1)
    ))
}
