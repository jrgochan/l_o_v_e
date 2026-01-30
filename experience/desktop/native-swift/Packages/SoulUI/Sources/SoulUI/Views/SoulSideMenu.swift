import SwiftUI

public enum SoulMenuAction: CaseIterable, Identifiable {
    case chat, history, journeys, explore, paths, bookmarks, visualMode, settings
    public var id: Self { self }
    
    var icon: String {
        switch self {
        case .chat: return "bubble.left.and.bubble.right.fill"
        case .history: return "clock.fill"
        case .journeys: return "arrow.triangle.pull"
        case .explore: return "map.fill"
        case .paths: return "point.topleft.down.curvedto.point.bottomright.up.fill"
        case .bookmarks: return "camera.on.rectangle.fill"
        case .visualMode: return "sparkles"
        case .settings: return "gearshape.fill"
        }
    }
}

public struct SoulSideMenu: View {
    let onSelect: (SoulMenuAction) -> Void
    @Binding var isPresented: Bool
    
    public init(isPresented: Binding<Bool>, onSelect: @escaping (SoulMenuAction) -> Void) {
        self._isPresented = isPresented
        self.onSelect = onSelect
    }
    
    public var body: some View {
        VStack(spacing: 12) {
            ForEach(SoulMenuAction.allCases.filter { $0 != .chat }) { action in
                Button {
                    hapticFeedback()
                    onSelect(action)
                    if action != .visualMode {
                        withAnimation { isPresented = false }
                    }
                } label: {
                    ZStack {
                        // Glass Orb Background
                        Circle()
                            .fill(.ultraThinMaterial)
                            .frame(width: 44, height: 44)
                            .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
                            .overlay(
                                Circle()
                                    .strokeBorder(
                                        LinearGradient(
                                            colors: [.white.opacity(0.6), .white.opacity(0.1)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        ),
                                        lineWidth: 1
                                    )
                            )
                        
                        // Icon
                        Image(systemName: action.icon)
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(
                                LinearGradient(colors: [.white, .white.opacity(0.8)], startPoint: .top, endPoint: .bottom)
                            )
                            .shadow(color: .white.opacity(0.5), radius: 5)
                    }
                }
                .buttonStyle(SoulbouncyButtonStyle())
                .transition(.scale.combined(with: .opacity).animation(.spring(response: 0.3, dampingFraction: 0.6).delay(Double(action.hashValue % 5) * 0.05)))
            }
        }
        .padding(20)
        .background(
            Capsule()
                .fill(.ultraThinMaterial.opacity(0.3))
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
    
    func hapticFeedback() {
        // Simple fallback if engine isn't passed, though ideally it should be tapped into the engine
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }
}

// Bouncy interaction style
struct SoulbouncyButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.85 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// Compatibility helper (since UIImpactFeedbackGenerator is UIKit)
#if os(macOS)
import AppKit
typealias UIImpactFeedbackGenerator = NSBeepDummy
struct NSBeepDummy {
    enum Style { case light }
    init(style: Style) {}
    func impactOccurred() {}
}
#endif
