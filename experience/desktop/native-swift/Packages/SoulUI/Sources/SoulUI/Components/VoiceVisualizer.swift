import SwiftUI

public struct VoiceVisualizer: View {
    var audioLevel: Float // 0.0 to 1.0
    
    public init(audioLevel: Float) {
        self.audioLevel = audioLevel
    }
    
    public var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<5) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.white.opacity(0.8))
                    .frame(width: 4, height: height(for: index))
                    .animation(.spring(response: 0.2, dampingFraction: 0.5), value: audioLevel)
            }
        }
        .frame(height: 32)
    }
    
    private func height(for index: Int) -> CGFloat {
        // Base height
        let base: CGFloat = 8
        
        // Simple visualizer logic: CENTER bars grow more
        // Index 2 is center
        let multiplier: CGFloat = (index == 2) ? 1.0 : (index == 1 || index == 3) ? 0.7 : 0.4
        
        // Dynamic growth
        let dynamic = CGFloat(audioLevel) * 24.0 * multiplier
        
        return base + dynamic
    }
}
