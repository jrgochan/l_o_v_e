import SwiftUI

/// A container that provides a high-quality "Frosted Glass" aesthetic
/// and inherent dragging capabilities.
public struct GlassPane<Content: View>: View {
    let title: String
    let content: Content
    var onClose: (() -> Void)?
    var onMinimize: (() -> Void)?
    
    // Drag State
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    
    public init(title: String, 
                onClose: (() -> Void)? = nil, 
                onMinimize: (() -> Void)? = nil,
                @ViewBuilder content: () -> Content) {
        self.title = title
        self.onClose = onClose
        self.onMinimize = onMinimize
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(title.uppercased())
                    .font(.caption.bold())
                    .kerning(1.5)
                    .foregroundStyle(.white.opacity(0.8))
                
                Spacer()
                
                HStack(spacing: 12) {
                    if let onMinimize {
                        Button(action: onMinimize) {
                            Image(systemName: "minus")
                                .font(.caption.bold())
                                .foregroundStyle(.white.opacity(0.6))
                        }
                        .buttonStyle(.plain)
                    }
                    
                    if let onClose {
                        Button(action: onClose) {
                            Image(systemName: "xmark")
                                .font(.caption.bold())
                                .foregroundStyle(.white.opacity(0.6))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding()
            .background(.white.opacity(0.05))
            .gesture(
                DragGesture()
                    .onChanged { value in
                        offset = CGSize(
                            width: lastOffset.width + value.translation.width,
                            height: lastOffset.height + value.translation.height
                        )
                    }
                    .onEnded { _ in
                        lastOffset = offset
                    }
            )
            
            // Content
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.ultraThinMaterial) // Fallback / Base
        }
        .background(
            ZStack {
                // High-fidelity background stack
                Color.black.opacity(0.4) // Darken underlying
                Rectangle()
                    .fill(.regularMaterial) // Blur
                Rectangle()
                    .fill(.soulGlassBackground) // Tint
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [.soulGlassBorder, .clear, .soulGlassBorder.opacity(0.5)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .shadow(color: .soulGlassShadow, radius: 20, x: 0, y: 10)
        .offset(offset)
        .scaleEffect(1.0) // Placeholder for entry anim
    }
}

#Preview {
    ZStack {
        Color.blue
        GlassPane(title: "Chat") {
            Text("Hello World")
                .frame(width: 300, height: 400)
                .foregroundStyle(.white)
        }
    }
}
