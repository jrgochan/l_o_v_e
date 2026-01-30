import SwiftUI
import MetalKit
import SoulCore
import SoulBrain
import SwiftData

#if os(macOS)
class InteractiveMTKView: MTKView {
    var onTap: ((CGPoint) -> Void)?
    var onDoubleClick: ((CGPoint) -> Void)?
    var onDrag: ((CGPoint) -> Void)?
    var onScroll: ((Float) -> Void)?
    var onHover: ((CGPoint) -> Void)?
    var onKey: ((NSEvent) -> Void)?

    override var acceptsFirstResponder: Bool { true }
    override var isFlipped: Bool { true }

    override func keyDown(with event: NSEvent) {
        onKey?(event)
    }

    override func updateTrackingAreas() {
        for area in trackingAreas { removeTrackingArea(area) }
        let options: NSTrackingArea.Options = [.activeInKeyWindow, .mouseMoved, .mouseEnteredAndExited, .inVisibleRect, .activeAlways]
        addTrackingArea(NSTrackingArea(rect: self.bounds, options: options, owner: self, userInfo: nil))
    }

    override func mouseMoved(with event: NSEvent) {
        onHover?(convert(event.locationInWindow, from: nil))
    }

    override func mouseDown(with event: NSEvent) {
        self.window?.makeFirstResponder(self)
        let loc = convert(event.locationInWindow, from: nil)
        if event.clickCount == 2 { onDoubleClick?(loc) } else { onTap?(loc) }
    }

    override func mouseDragged(with event: NSEvent) {
        onDrag?(CGPoint(x: event.deltaX, y: event.deltaY))
    }

    override func scrollWheel(with event: NSEvent) {
        onScroll?(Float(event.deltaY))
    }
}
#elseif os(iOS)
class InteractiveMTKView: MTKView {
    var onTap: ((CGPoint) -> Void)?
    var onDoubleClick: ((CGPoint) -> Void)?
    var onDrag: ((CGPoint) -> Void)?
    var onScroll: ((Float) -> Void)?
    var onHover: ((CGPoint) -> Void)? // No-op on iOS

    override init(frame: CGRect, device: MTLDevice?) {
        super.init(frame: frame, device: device)
        setupGestures()
    }

    required init(coder: NSCoder) {
        super.init(coder: coder)
        setupGestures()
    }

    private func setupGestures() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        addGestureRecognizer(tap)

        let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        addGestureRecognizer(pan)
        
        // Pinch interpreted as scroll (zoom)
        let pinch = UIPinchGestureRecognizer(target: self, action: #selector(handlePinch(_:)))
        addGestureRecognizer(pinch)
    }

    @objc private func handleTap(_ g: UITapGestureRecognizer) {
        onTap?(g.location(in: self))
    }

    @objc private func handlePan(_ g: UIPanGestureRecognizer) {
        let translation = g.translation(in: self)
        g.setTranslation(.zero, in: self)
        // Invert Y for iOS to match drag expectation if needed, or keep consistent
        onDrag?(CGPoint(x: translation.x, y: translation.y))
    }
    
    @objc private func handlePinch(_ g: UIPinchGestureRecognizer) {
        let delta = Float(g.scale - 1.0) * 5.0
        g.scale = 1.0
        onScroll?(delta) 
    }
}
#endif

#if os(macOS)
typealias PlatformViewRepresentable = NSViewRepresentable
#else
typealias PlatformViewRepresentable = UIViewRepresentable
#endif

@available(macOS 14, iOS 17, *)
public struct SoulView: PlatformViewRepresentable {
    @Environment(\.displayScale) var displayScale
    @Binding var vibe: Vibe
    @Binding var selectedEmotion: String?
    @Binding var hoveredEmotion: String?
    var path: [String] = []
    var splinePoints: [SIMD3<Float>] = []
    @Binding var playSequence: Bool
    @Binding var labels: [(String, CGPoint)]

    @Binding var showParticles: Bool
    @Binding var showLiquid: Bool
    @Binding var visualMode: VisualMode
    var audioLevel: Float
    var emotions: [Emotion]

    public init(vibe: Binding<Vibe>,
                emotions: [Emotion],
                selectedEmotion: Binding<String?>? = nil,
                hoveredEmotion: Binding<String?> = .constant(nil),
                path: [String] = [],
                splinePoints: [SIMD3<Float>] = [],
                playSequence: Binding<Bool> = .constant(false),
                labels: Binding<[(String, CGPoint)]> = .constant([]),
                showParticles: Binding<Bool> = .constant(true),
                showLiquid: Binding<Bool> = .constant(true),
                visualMode: Binding<VisualMode> = .constant(.subtle),
                audioLevel: Float = 0.0) {
        self._vibe = vibe
        self.emotions = emotions
        self._selectedEmotion = selectedEmotion ?? .constant(nil)
        self._hoveredEmotion = hoveredEmotion
        self.path = path
        self.splinePoints = splinePoints
        self._playSequence = playSequence
        self._labels = labels
        self._showParticles = showParticles
        self._showLiquid = showLiquid
        self._visualMode = visualMode
        self.audioLevel = audioLevel
    }

    public func makeCoordinator() -> SoulRenderer {
        guard let device = MTLCreateSystemDefaultDevice(),
              let renderer = SoulRenderer(device: device) else {
            fatalError("🔥 Logic Board Failure: Metal is not supported on this device.")
        }
        return renderer
    }

    #if os(macOS)
    public func makeNSView(context: Context) -> MTKView {
        setupView(context: context)
    }

    public func updateNSView(_ nsView: MTKView, context: Context) {
        updateView(nsView, context: context)
    }
    #elseif os(iOS)
    public func makeUIView(context: Context) -> MTKView {
        setupView(context: context)
    }
    
    public func updateUIView(_ uiView: MTKView, context: Context) {
        updateView(uiView, context: context)
    }
    #endif

    // Shared Setup Logic
    private func setupView(context: Context) -> MTKView {
        let view = InteractiveMTKView()
        view.device = MTLCreateSystemDefaultDevice()
        view.delegate = context.coordinator
        view.preferredFramesPerSecond = 120
        view.enableSetNeedsDisplay = false
        view.isPaused = false
        view.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
        #if os(macOS)
        view.layer?.isOpaque = false
        #else
        view.isOpaque = false
        view.backgroundColor = .clear
        #endif

        let renderer = context.coordinator

        view.onTap = { point in
            if let name = renderer.hitTest(at: point) {
                print("🖱️ Clicked: \(name)")
                renderer.fly(to: name)
                renderer.selectEmotion(name)
            }
        }

        view.onHover = { point in
            let name = renderer.hitTest(at: point)
            renderer.hoverEmotion(name)
        }

        view.onDrag = { delta in
            renderer.rotateCamera(delta: delta)
        }

        view.onScroll = { delta in
            renderer.zoomCamera(delta: delta)
        }

        return view
    }

    // Shared Update Logic
    private func updateView(_ view: MTKView, context: Context) {
        let renderer = context.coordinator
        syncSettings(renderer)
        pushData(renderer)
        handleNavigation(renderer)
        setupCallbacks(renderer)
    }

    private func syncSettings(_ renderer: SoulRenderer) {
        renderer.vibe = SIMD3<Float>(Float(vibe.valence), Float(vibe.arousal), Float(vibe.connection))
        renderer.audioLevel = audioLevel
        renderer.showParticles = showParticles
        renderer.showLiquid = showLiquid
        renderer.visualMode = visualMode
        renderer.contentScaleFactor = displayScale
    }

    private func pushData(_ renderer: SoulRenderer) {
        if !emotions.isEmpty && renderer.pointCount != emotions.count {
            let nodes = emotions.map {
                EmotionEngine.EmotionNode(
                    name: $0.name,
                    valence: $0.valence,
                    arousal: $0.arousal,
                    connection: $0.connection
                )
            }
            renderer.updatePointCloud(with: nodes)
        }
    }

    private func handleNavigation(_ renderer: SoulRenderer) {
        if let target = selectedEmotion { renderer.fly(to: target) }

        if !path.isEmpty { renderer.updatePath(with: path) }
        else if !splinePoints.isEmpty { renderer.updateSpline(points: splinePoints) }
        else { renderer.updatePath(with: []) }

        if playSequence {
            renderer.flyThrough(path: path)
            DispatchQueue.main.async { self.playSequence = false }
        }
    }

    private func setupCallbacks(_ renderer: SoulRenderer) {
        renderer.onSelectionChange = { name in DispatchQueue.main.async { self.selectedEmotion = name } }
        renderer.onHoverChange = { name in DispatchQueue.main.async { self.hoveredEmotion = name } }
        renderer.onVisualModeChange = { mode in DispatchQueue.main.async { self.visualMode = mode } }
        renderer.onLabelsUpdate = { newLabels in DispatchQueue.main.async { self.labels = newLabels } }
    }
}
