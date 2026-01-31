import SwiftUI
import SoulCore
import SoulBrain
import SoulChat
import SoulBio
import SwiftData

/// The Main V2 Experience View
/// Orchestrates the 3D world, floating glass panes, and organic interactions.
@available(macOS 14, iOS 17, *)
public struct SoulExperienceView: View {
    // State Bindings
    @Binding var vibe: Vibe
    @Binding var activeCollectionName: String
    @Binding var isMicRecording: Bool
    @Binding var audioLevel: Float
    @Binding var streamingResponse: String
    @Binding var isThinking: Bool
    @Binding var liveInputText: String
    @Binding var chatMode: SoulPersona.ChatMode
    @Binding var isReflecting: Bool
    @Binding var thoughtContent: String
    
    // Services
    var breathPublisher: BreathPublisher
    var hapticEngine: HapticEngine
    var bioMonitor: BioMonitor
    
    // Callbacks
    var onChatInput: (String) -> Void
    var onMicTap: () -> Void
    var onLongPressOrb: () -> Void
    var onSearch: (String) async -> [Emotion]
    var onSettingsChange: (() -> Void)?
    
    // Dependencies
    @Environment(\.modelContext) private var context
    @Query private var emotions: [Emotion]
    
    // UI State
    @State private var activePane: SoulMenuAction? = nil
    @State private var isMenuOpen: Bool = false
    
    // 3D View State
    @State private var selectedEmotion: String?
    @State private var hoveredEmotion: String?
    @State private var path: [String] = []
    @State private var isPlayingPath: Bool = false
    @State private var labels: [(String, CGPoint)] = []
    
    // Visual Config
    @State private var showParticles = true
    @State private var showLiquid = true
    @State private var visualMode: VisualMode = .subtle
    
    public init(vibe: Binding<Vibe>,
                activeCollectionName: Binding<String>,
                isMicRecording: Binding<Bool>,
                audioLevel: Binding<Float>,
                streamingResponse: Binding<String>,
                isThinking: Binding<Bool>,
                liveInputText: Binding<String>,
                chatMode: Binding<SoulPersona.ChatMode>,
                isReflecting: Binding<Bool>,
                thoughtContent: Binding<String>,
                breathPublisher: BreathPublisher,
                hapticEngine: HapticEngine,
                bioMonitor: BioMonitor,
                onChatInput: @escaping (String) -> Void,
                onMicTap: @escaping () -> Void,
                onLongPressOrb: @escaping () -> Void,
                onSearch: @escaping (String) async -> [Emotion],
                onSettingsChange: (() -> Void)? = nil) {
        self._vibe = vibe
        self._activeCollectionName = activeCollectionName
        self._isMicRecording = isMicRecording
        self._audioLevel = audioLevel
        self._streamingResponse = streamingResponse
        self._isThinking = isThinking
        self._liveInputText = liveInputText
        self._chatMode = chatMode
        self._isReflecting = isReflecting
        self._thoughtContent = thoughtContent
        self.breathPublisher = breathPublisher
        self.hapticEngine = hapticEngine
        self.bioMonitor = bioMonitor
        self.onChatInput = onChatInput
        self.onMicTap = onMicTap
        self.onLongPressOrb = onLongPressOrb
        self.onSearch = onSearch
        self.onSettingsChange = onSettingsChange
    }
    
    public var body: some View {
        ZStack {
            // LAYER 1: Deep Space / 3D World
            SoulView(
                vibe: $vibe,
                emotions: emotions.filter { $0.collection?.name == activeCollectionName },
                selectedEmotion: $selectedEmotion,
                hoveredEmotion: $hoveredEmotion,
                path: path,
                playSequence: $isPlayingPath,
                labels: $labels,
                showParticles: $showParticles,
                showLiquid: $showLiquid,
                visualMode: $visualMode,
                audioLevel: audioLevel
            )
            .ignoresSafeArea()
            .scaleEffect(breathPublisher.scaleFactor) // Breathe
            .onTapGesture {
                // Clear selection on background tap
                if isMenuOpen { isMenuOpen = false }
            }
            
            // LAYER 1.5: Labels Overlay
            SoulLabelsOverlay(labels: labels, selectedEmotion: selectedEmotion, hoveredEmotion: hoveredEmotion)
                .ignoresSafeArea()
                .onChange(of: selectedEmotion) { _, _ in
                    hapticEngine.playSelection()
                }
                .onChange(of: hoveredEmotion) { _, _ in
                    hapticEngine.playHover()
                }
            
            // LAYER 2: Floating Panes
            if let pane = activePane {
                GlassPane(
                    title: "\(pane)".capitalized,
                    onClose: { withAnimation { activePane = nil } }
                ) {
                    content(for: pane)
                }
                .frame(width: 400, height: 600)
                .transition(.scale(scale: 0.9).combined(with: .opacity).combined(with: .move(edge: .bottom)))
                .zIndex(10)
            }
            
            // LAYER 3: HUD & Controls (Clean Replica Layout)
            hudLayer
        }
    }
    
    // MARK: - Content Builder
    @ViewBuilder
    func content(for pane: SoulMenuAction) -> some View {
        switch pane {
        case .chat:
            ChatView(
                isRecording: $isMicRecording,
                streamingText: $streamingResponse,
                isThinking: $isThinking,
                isReflecting: $isReflecting,
                thoughtContent: $thoughtContent,
                transcribedText: $liveInputText,
                onSend: { text in onChatInput(text) },
                onMicTap: { onMicTap() }
            )
        case .explore:
            ExploreTab(
                selectedEmotion: $selectedEmotion,
                activeCollectionName: activeCollectionName,
                onSearch: onSearch
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
        case .paths:
            PathsTab(
                emotions: emotions,
                computedPath: $path,
                isPlayingPath: $isPlayingPath
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
        case .bookmarks:
            BookmarksTab(
                onSave: { savePreset() },
                onRestore: { restorePreset($0) }
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
        case .settings:
            List {
                Toggle("Particles", isOn: $showParticles)
                Toggle("Liquid", isOn: $showLiquid)
                
                Picker("Visual Mode", selection: $visualMode) {
                    ForEach(VisualMode.allCases, id: \.self) { mode in
                        Text(mode.displayName).tag(mode)
                    }
                }
                
                Section {
                    NavigationLink("Brain Models") {
                        ModelSettingsView()
                    }
                }
            }
            .listStyle(.plain)
            
        case .journeys:
             JourneyTabRoot(
                 onStrategyStart: { _ in SoulLog.brain.info("🚀 Strategy Started") },
                 onStrategyComplete: { _ in SoulLog.brain.info("✅ Strategy Complete") }
             )
             .frame(maxWidth: .infinity, maxHeight: .infinity)
             
        case .history:
             AnalyticsView()
                 .frame(maxWidth: .infinity, maxHeight: .infinity)
            
        case .visualMode:
            EmptyView() // Handled inline, no pane needed
        }
    }
    
    
    // MARK: - Subviews
    private var hudLayer: some View {
        VStack {
            // Top Status Pill
            HStack {
                Spacer()
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color.white.opacity(0.3))
                        .frame(width: 6, height: 6)
                    
                    Text(selectedEmotion?.uppercased() ?? "NO ACTIVE JOURNEY")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .kerning(1.5)
                        .foregroundStyle(.white.opacity(0.8))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial, in: Capsule())
                .overlay(Capsule().stroke(.white.opacity(0.1), lineWidth: 1))
                .padding(.top, 20)
                Spacer()
            }
            
            Spacer()
            
            // Bottom Controls Area
            HStack(alignment: .bottom) {
                // Left: Menu / Settings
                ZStack(alignment: .bottomLeading) {
                    if isMenuOpen {
                        SoulSideMenu(isPresented: $isMenuOpen, chatMode: $chatMode, onSelect: { action in
                            hapticEngine.playSelection()
                            
                            if action == .visualMode {
                                // Cycle Visual Mode
                                if let idx = VisualMode.allCases.firstIndex(of: visualMode) {
                                    let next = (idx + 1) % VisualMode.allCases.count
                                    visualMode = VisualMode.allCases[next]
                                }
                            } else {
                                withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                                    activePane = action
                                }
                            }
                        }, onSettingsChange: onSettingsChange)
                        .offset(y: -70) // Float above button
                    }
                    
                    Button {
                        hapticEngine.playSelection()
                        withAnimation(.bouncy) { isMenuOpen.toggle() }
                    } label: {
                        Image(systemName: isMenuOpen ? "xmark" : "line.3.horizontal")
                            .font(.system(size: 20))
                            .foregroundStyle(.white.opacity(0.8))
                            .frame(width: 50, height: 50)
                            .background(.ultraThinMaterial)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(.white.opacity(0.1), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
                .frame(width: 60, height: 60)
                
                Spacer()
                
                // Center: The Soul Orb
                SoulOrb(
                    vibe: $vibe,
                    isListening: $isMicRecording,
                    chatMode: $chatMode,
                    isReflecting: $isReflecting,
                    audioLevel: audioLevel,
                    onTap: {
                        // Orb Tap Action (e.g. Pulse or Reset)
                        hapticEngine.playSelection()
                    },
                    onLongPress: {
                        hapticEngine.playSelection()
                        onLongPressOrb()
                    }
                )
                .frame(width: 140, height: 140)
                .offset(y: 20) // Slight bleed off bottom
                
                Spacer()
                
                // Right: Chat Toggle
                Button {
                    hapticEngine.playSelection()
                    // Toggle Chat Pane directly
                    withAnimation {
                        if activePane == .chat {
                            activePane = nil
                        } else {
                            activePane = .chat
                        }
                    }
                } label: {
                    Image(systemName: "bubble.left.and.bubble.right.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(activePane == .chat ? .white : .white.opacity(0.8))
                        .frame(width: 50, height: 50)
                        .background(activePane == .chat ? AnyShapeStyle(Color.indigo.opacity(0.5)) : AnyShapeStyle(.ultraThinMaterial))
                        .clipShape(Circle())
                        .overlay(Circle().stroke(.white.opacity(0.1), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .frame(width: 60, height: 60)
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 30)
        }
    }
    
    // MARK: - Logic
    func savePreset() {
        let emotionId = emotions.first(where: { $0.name == selectedEmotion })?.id
        let name = selectedEmotion ?? "Overview"
        
        let preset = ViewPreset(
            name: "\(name) - \(Date().formatted(.dateTime.hour().minute()))",
            valence: vibe.valence,
            arousal: vibe.arousal,
            connection: vibe.connection,
            visualModeRaw: String(visualMode.rawValue),
            targetEmotionId: emotionId
        )
        
        context.insert(preset)
    }

    func restorePreset(_ preset: ViewPreset) {
        // Restore Vibe
        self.vibe = Vibe(valence: preset.valence, arousal: preset.arousal, connection: preset.connection)
        
        // Restore Mode
        if let rawInt = Int(preset.visualModeRaw), let mode = VisualMode(rawValue: rawInt) {
            self.visualMode = mode
        }
        
        // Restore Selection
        if let targetId = preset.targetEmotionId,
           let emotion = emotions.first(where: { $0.id == targetId }) {
            self.selectedEmotion = emotion.name
        } else {
            self.selectedEmotion = nil
        }
    }
}

// Mini Helper
struct StatPill: View {
    let icon: String
    let value: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(value)
                .monospacedDigit()
        }
        .font(.caption.bold())
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.ultraThinMaterial, in: Capsule())
    }
}
