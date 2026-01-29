import SwiftUI

public struct SoulLabelsOverlay: View {
    let labels: [(String, CGPoint)]
    let selectedEmotion: String?
    let hoveredEmotion: String? // NEW

    public init(labels: [(String, CGPoint)], selectedEmotion: String? = nil, hoveredEmotion: String? = nil) {
        self.labels = labels
        self.selectedEmotion = selectedEmotion
        self.hoveredEmotion = hoveredEmotion
    }

    public var body: some View {
        Canvas { context, size in
            for (text, point) in labels {

                let isSelected = text == selectedEmotion
                let isHovered = text == hoveredEmotion

                if isSelected || isHovered {
                    // Draw Label with futuristic style
                    let fontSize: CGFloat = isSelected ? 18 : 14
                    let weight: Font.Weight = isSelected ? .bold : .medium
                    let opacity: Double = isSelected ? 1.0 : 0.9

                    let labelText = Text(text.uppercased())
                        .font(.system(size: fontSize, weight: weight))
                        .foregroundStyle(.white.opacity(opacity))

                    let resolved = context.resolve(labelText)

                    // Centered above the point
                    // Offset y more if selected to avoid overlapping huge cursor
                    let yOffset: CGFloat = isSelected ? 30 : 25
                    let drawPoint = CGPoint(x: point.x - resolved.measure(in: size).width/2, y: point.y - yOffset)

                    context.draw(resolved, at: drawPoint)
                }
            }
        }
        .allowsHitTesting(false) // Pass touches through to Metal View
    }
}
