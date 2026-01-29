import XCTest
import SwiftUI
import ViewInspector
@testable import SoulUI
@testable import SoulCore
@testable import SoulBrain

@MainActor
final class SoulViewTests: XCTestCase {

    // SoulView wraps a Metal MTKView. ViewInspector usually finds the Representable.
    // We want to test that it initializes correctly and updates its bindings.

    func testSoulViewInit() throws {
        // Setup Bindings
        let vibe = Binding.constant(Vibe(valence: 0, arousal: 0, connection: 0))
        let selected = Binding<String?>.constant("Joy")
        let hovered = Binding<String?>.constant(nil)
        let play = Binding.constant(false)
        let labels = Binding<[(String, CGPoint)]>.constant([])
        let particles = Binding.constant(true)
        let liquid = Binding.constant(true)
        let mode = Binding.constant(VisualMode.subtle)

        let joy = Emotion(
            name: "Joy", definition: "Happy", category: "Happy", valence: 0.8, arousal: 0.5, connection: 0.5
        )
        let emotions = [joy]

        // Tests rely on Metal availability. If running in CI without GPU, might fail or crash.
        // We can guard, but SoulView.makeCoordinator fatalErrors if Metal is missing.
        // In local env (Mac), Metal is available.

        let sut = SoulView(vibe: vibe,
                           emotions: emotions,
                           selectedEmotion: selected,
                           hoveredEmotion: hovered,
                           playSequence: play,
                           labels: labels,
                           showParticles: particles,
                           showLiquid: liquid,
                           visualMode: mode)

        // ViewInspector finding the Representable
        // Note: ViewInspector struggles inspecting INSIDE a NSViewRepresentable unless we provide custom hooks.
        // But we can verifying the View hierarchy contains SoulView.

        let view = sut
        XCTAssertNoThrow(try view.inspect().find(SoulView.self))

        // We can't easily inspect the internal MTKView or Coordinator via ViewInspector without extra setup
        // but verifying it constructs without crashing is a good start.
    }
}
