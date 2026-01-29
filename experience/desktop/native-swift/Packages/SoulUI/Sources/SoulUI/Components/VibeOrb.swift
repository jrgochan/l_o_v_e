import SwiftUI
import SoulCore

public struct VibeOrb: View {
    let vibe: Vibe
    @State private var breathingScale: CGFloat = 1.0

    public init(vibe: Vibe) {
        self.vibe = vibe
    }

    public var body: some View {
        ZStack {
            // Liquid Metal Shader
            SoulView(vibe: .constant(vibe), emotions: []) // No point cloud for simple orb
                .frame(width: 300, height: 300)
                .shadow(color: Color.forVibe(vibe).opacity(0.6), radius: 50, x: 0, y: 0)

            // Optional: Overlay debug info or subtle glass reflection here
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
    VibeOrb(vibe: Vibe(valence: 0.8, arousal: 0.7, connection: 0.8))
    }
}
