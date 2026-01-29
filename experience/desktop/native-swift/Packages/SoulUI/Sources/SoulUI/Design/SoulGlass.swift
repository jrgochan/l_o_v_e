import SwiftUI

public struct SoulGlass: ViewModifier {
    public func body(content: Content) -> some View {
        content
            .background(.regularMaterial)
            .background(
                LinearGradient(
                    colors: [.white.opacity(0.1), .clear],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
    }
}

public extension View {
    func soulGlass() -> some View {
        modifier(SoulGlass())
    }
}
