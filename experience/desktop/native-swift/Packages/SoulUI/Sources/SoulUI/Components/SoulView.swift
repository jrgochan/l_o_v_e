import SwiftUI
import MetalKit
import SoulCore
import SoulBrain
import SwiftData

#if os(macOS)
class InteractiveMTKView: MTKView {
    var onTap: ((CGPoint) -> Void)?
    var onDoubleClick: ((CGPoint) -> Void)? // NEW
    var onDrag: ((CGPoint) -> Void)?
    var onScroll: ((Float) -> Void)?
    var onHover: ((CGPoint) -> Void)?
    
    var onKey: ((NSEvent) -> Void)? // NEW
    
    override var acceptsFirstResponder: Bool { true }
    
    override func keyDown(with event: NSEvent) {
        onKey?(event)
    }
    
    override func updateTrackingAreas() {
        // Remove existing tracking areas
        for area in trackingAreas {
            removeTrackingArea(area)
        }
        
        // Add .activeWhenFirstResponder maybe? Or just keep it simpler.
        let options: NSTrackingArea.Options = [.activeInKeyWindow, .mouseMoved, .mouseEnteredAndExited, .inVisibleRect, .activeAlways] 
        let trackingArea = NSTrackingArea(rect: self.bounds, options: options, owner: self, userInfo: nil)
        addTrackingArea(trackingArea)
    }
    
    override func mouseMoved(with event: NSEvent) {
        let loc = convert(event.locationInWindow, from: nil)
        onHover?(loc)
        // Ensure we handle keys if we are hovered? 
        // Or just let user click to focus.
    }
    
    override func mouseDown(with event: NSEvent) {
        // Take focus on click
        self.window?.makeFirstResponder(self)
        
        let loc = convert(event.locationInWindow, from: nil)
        if event.clickCount == 2 {
            onDoubleClick?(loc)
        } else {
            onTap?(loc)
        }
    }
    
    override func mouseDragged(with event: NSEvent) {
        // We want the delta
        let delta = CGPoint(x: event.deltaX, y: event.deltaY)
        onDrag?(delta)
    }
        override func scrollWheel(with event: NSEvent) {
        let delta = Float(event.deltaY)
        onScroll?(delta)
    }
}

public struct SoulView: NSViewRepresentable {
    @Binding var vibe: Vibe
    @Binding var selectedEmotion: String?
    @Binding var hoveredEmotion: String?
    var path: [String] = []
    var splinePoints: [SIMD3<Float>] = [] // NEW: Raw Coordinate Path (Replay)
    @Binding var playSequence: Bool
    @Binding var labels: [(String, CGPoint)]
    
    // Settings
    @Binding var showParticles: Bool
    @Binding var showLiquid: Bool
    @Binding var visualMode: VisualMode
    var audioLevel: Float
    
    // Data
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

    public func makeNSView(context: Context) -> MTKView {
        let view = InteractiveMTKView()
        view.device = MTLCreateSystemDefaultDevice()
        view.delegate = context.coordinator
        
        view.preferredFramesPerSecond = 120
        view.enableSetNeedsDisplay = false
        view.isPaused = false
        
        // Transparent background
        view.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
        view.layer?.isOpaque = false
        
        return view
    }

    public func updateNSView(_ nsView: MTKView, context: Context) {
        let renderer = context.coordinator
        renderer.vibe = SIMD3<Float>(Float(vibe.valence), Float(vibe.arousal), Float(vibe.connection))
        renderer.audioLevel = audioLevel
        
        // Settings Sync
        renderer.showParticles = showParticles
        renderer.showLiquid = showLiquid
        renderer.visualMode = visualMode
        
        // Push Data to GPU if needed
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
        
        // Flight Control
        if let target = selectedEmotion {
             renderer.fly(to: target)
        }
        
        // Update Path
        // Update Path (Either named emotions or raw spline)
        if !path.isEmpty {
            renderer.updatePath(with: path)
        } else if !splinePoints.isEmpty {
            renderer.updateSpline(points: splinePoints)
        } else {
            renderer.updatePath(with: [])
        }
        
        // Trigger Flight Sequence
        if playSequence {
            renderer.flyThrough(path: path)
            DispatchQueue.main.async {
                self.playSequence = false
            }
        }
        
        // Update Callbacks
        renderer.onSelectionChange = { name in
            DispatchQueue.main.async {
                self.selectedEmotion = name
            }
        }
        
        renderer.onHoverChange = { name in
            DispatchQueue.main.async {
                self.hoveredEmotion = name
            }
        }

        renderer.onVisualModeChange = { mode in
            DispatchQueue.main.async {
                self.visualMode = mode
            }
        }
        
        renderer.onLabelsUpdate = { newLabels in
            DispatchQueue.main.async {
                self.labels = newLabels
            }
        }
    }

    public func makeCoordinator() -> SoulRenderer {
        guard let device = MTLCreateSystemDefaultDevice(),
              let renderer = SoulRenderer(device: device) else {
            fatalError("🔥 Logic Board Failure: Metal is not supported on this device.")
        }
        return renderer
    }
}
#endif
