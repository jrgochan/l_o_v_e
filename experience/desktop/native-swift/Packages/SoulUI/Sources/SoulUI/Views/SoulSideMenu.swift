import SwiftUI
import SoulBrain
import SoulCore

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
    var onSettingsChange: (() -> Void)?
    @Binding var isPresented: Bool
    @Binding var chatMode: SoulPersona.ChatMode

    public init(isPresented: Binding<Bool>, chatMode: Binding<SoulPersona.ChatMode>, onSelect: @escaping (SoulMenuAction) -> Void, onSettingsChange: (() -> Void)? = nil) {
        self._isPresented = isPresented
        self._chatMode = chatMode
        self.onSelect = onSelect
        self.onSettingsChange = onSettingsChange
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

            // Brain Settings
            Section("Brain Settings") {
                @Bindable var settings = InferenceSettings.shared

                Picker("Inference", selection: $settings.mode) {
                    ForEach(InferenceMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue.capitalized).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .onChange(of: settings.mode) { _, _ in
                    hapticFeedback()
                    onSettingsChange?()
                }

                if settings.mode == .remote {
                    TextField("Server URL", text: $settings.remoteUrl)
                        .textFieldStyle(.roundedBorder)
                        .font(.caption.monospaced())
                        .onChange(of: settings.remoteUrl) { _, _ in onSettingsChange?() }
                }
            }
            .padding(.vertical, 4)

            // Mode Toggle (Separate from general actions)
            Divider().background(Color.white.opacity(0.2))

            Button {
                hapticFeedback()
                cycleChatMode()
            } label: {
                HStack {
                    ZStack {
                        Circle()
                            .fill(.ultraThinMaterial)
                            .frame(width: 44, height: 44)
                            .overlay(Circle().stroke(.white.opacity(0.2), lineWidth: 1))

                        Image(systemName: modeIcon)
                            .font(.system(size: 18))
                            .foregroundStyle(modeColor)
                    }

                    Text(chatMode.rawValue)
                        .font(.caption.bold())
                        .foregroundStyle(.white.opacity(0.9))

                    Spacer()
                }
                .padding(.horizontal, 4)
            }
            .buttonStyle(SoulbouncyButtonStyle())
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

    var modeIcon: String {
        switch chatMode {
        case .standard: return "bubble.left.and.bubble.right.fill"
        case .clinical: return "cross.case.fill"
        case .deepFeeling: return "brain.head.profile"
        }
    }

    var modeColor: Color {
        switch chatMode {
        case .standard: return .white
        case .clinical: return .teal
        case .deepFeeling: return .purple
        }
    }

    func cycleChatMode() {
        let all = SoulPersona.ChatMode.allCases
        if let idx = all.firstIndex(of: chatMode) {
            let next = (idx + 1) % all.count
            chatMode = all[next]
        }
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
