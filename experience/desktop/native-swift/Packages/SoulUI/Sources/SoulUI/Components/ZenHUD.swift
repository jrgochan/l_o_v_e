import SwiftUI
import SoulCore

// Minimal ZenHUD Component for Navigation/Visuals
public struct ZenHUD: View {
    var selectedEmotion: String?
    var hoveredEmotion: String?
    var activePath: [String] = []
    @Binding var visualMode: VisualMode // NEW: Binding for mutation
    
    public init(selectedEmotion: String? = nil, hoveredEmotion: String? = nil, activePath: [String] = [], visualMode: Binding<VisualMode>) {
        self.selectedEmotion = selectedEmotion
        self.hoveredEmotion = hoveredEmotion
        self.activePath = activePath
        self._visualMode = visualMode
    }
    
    public var body: some View {
        HStack(spacing: 16) {
            if !activePath.isEmpty {
                // Path Mode
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.triangle.swap")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text("JOURNEY ACTIVE")
                            .font(.caption2.bold())
                            .foregroundStyle(.secondary)
                    }
                    
                    HStack(spacing: 0) {
                        Text(activePath.first ?? "?")
                        Text(" → ")
                            .foregroundStyle(.secondary)
                        Text(activePath.last ?? "?")
                    }
                    .font(.headline)
                }
                
                Divider()
                    .frame(height: 32)
                
                HStack {
                    Text("\(activePath.count)")
                        .font(.title2.bold().monospaced())
                    Text("STEPS")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                
            } else if let emotion = hoveredEmotion ?? selectedEmotion {
                 // Hover or Selection Mode
                 VStack(alignment: .leading, spacing: 4) {
                     Text(emotion.uppercased())
                         .font(.system(size: 16, weight: .bold))
                         .kerning(2)
                     
                     Text("EMOTIONAL STATE")
                         .font(.caption2)
                         .foregroundStyle(.secondary)
                 }
                 .padding(.horizontal, 16)
                 .padding(.vertical, 12)
                 .background(.ultraThinMaterial, in: Capsule())
                 .overlay(
                     Capsule().stroke(.white.opacity(0.2), lineWidth: 1)
                 )
             } else {
                // Simple Idle
                Button(action: {
                    let all = VisualMode.allCases
                    if let index = all.firstIndex(of: visualMode) {
                        visualMode = all[(index + 1) % all.count]
                    }
                }, label: {
                    HStack(spacing: 8) {
                        Circle().fill(.green).frame(width: 6, height: 6)
                            .shadow(color: .green, radius: 4)
                        Text(visualMode.displayName.uppercased())
                            .font(.caption.bold())
                            .foregroundStyle(.white.opacity(0.8))
                        Text("MODE")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                })
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .overlay(Capsule().stroke(.white.opacity(0.2), lineWidth: 1))
        .animation(.spring, value: hoveredEmotion)
        .animation(.spring, value: selectedEmotion)
        .animation(.spring, value: activePath)
        .animation(.spring, value: visualMode) // NEW
    }
}
