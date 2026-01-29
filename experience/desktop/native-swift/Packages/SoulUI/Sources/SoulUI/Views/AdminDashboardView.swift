import SwiftUI
import SoulCore
import SoulBrain
import SwiftData
import SoulChat
import SoulVoice
import SoulBio
// Wrapper to handle chat state locally if not provided
// Wrapper removed - using global DependencyContainer via App entry
public struct AdminDashboardView: View {
    // EnvironmentObject removed to avoid circular dependency
    @Binding var activeCollectionName: String

    @State private var selectedTab: AdminTab? = .explore
    @State private var selectedEmotion: String?
    @State private var hoveredEmotion: String? // NEW: Hover State
    @State private var selectedSession: SessionAnalytics? // NEW: History Selection

    // Path State

    var onStrategyStart: (TransitionStrategy) -> Void
    var onStrategyComplete: (TransitionStrategy) -> Void
    @State private var computedPath: [String] = []
    @State private var isPlayingPath: Bool = false // Trigger for cinematic flight

    @Binding var vibe: Vibe

    // Labels Overlay
    @State private var labels: [(String, CGPoint)] = []

    // Configuration State
    @State private var showParticles = true
    @State private var showLiquid = true
    @State private var visualMode: VisualMode = .subtle // NEW: Lifted State

    // Bio Monitor
    @StateObject private var bioMonitor = BioMonitor()

    // FETCH DATA
    // Chat State
    @Binding var isMicRecording: Bool
    @Binding var audioLevel: Float
    // Streaming Bindings
    @Binding var streamingResponse: String
    @Binding var isThinking: Bool

    var onChatInput: (String) -> Void
    var onSearch: (String) async -> [Emotion]

    // Services
    var breathPublisher: BreathPublisher
    var hapticEngine: HapticEngine

    @Environment(\.modelContext) private var context
    @Query(sort: \Emotion.name) private var emotions: [Emotion]
    @Query(sort: \EmotionCollection.name) private var collections: [EmotionCollection]

    public init(vibe: Binding<Vibe>,
                activeCollectionName: Binding<String>,
                isMicRecording: Binding<Bool>,
                audioLevel: Binding<Float>,
                streamingResponse: Binding<String>,
                isThinking: Binding<Bool>,
                breathPublisher: BreathPublisher,
                hapticEngine: HapticEngine,
                onStrategyStart: @escaping (TransitionStrategy) -> Void = { _ in },
                onStrategyComplete: @escaping (TransitionStrategy) -> Void = { _ in },
                onChatInput: @escaping (String) -> Void,
                onSearch: @escaping (String) async -> [Emotion] = { _ in [] }) {
        self._vibe = vibe
        self._activeCollectionName = activeCollectionName
        self._isMicRecording = isMicRecording
        self._audioLevel = audioLevel
        self._streamingResponse = streamingResponse
        self._isThinking = isThinking
        self.breathPublisher = breathPublisher
        self.hapticEngine = hapticEngine
        self.onStrategyStart = onStrategyStart
        self.onStrategyComplete = onStrategyComplete
        self.onChatInput = onChatInput
        self.onSearch = onSearch
    }

    public enum AdminTab: String, CaseIterable, Identifiable {
        case views = "Views"
        case explore = "Explore"
        case paths = "Paths"
        case journeys = "Journeys" // Added
        case history = "History" // Added
        case chat = "Chat" // Added
        case settings = "Settings"
        public var id: String { rawValue }
    }

    // Helper for Icons
    func icon(for tab: AdminTab) -> String {
        switch tab {
        case .views: return "eye"
        case .explore: return "map"
        case .paths: return "arrow.triangle.swap"
        case .journeys: return "arrow.curve.up.right.circle.fill" // Added
        case .history: return "chart.xyaxis.line" // Added
        case .chat: return "bubble.left.and.bubble.right" // Added
        case .settings: return "gear"
        }
    }

    public var body: some View {
        NavigationSplitView {
            // COLUMN 1: SIDEBAR
            List(AdminTab.allCases, selection: $selectedTab) { tab in
                Label(tab.rawValue, systemImage: icon(for: tab))
                    .tag(tab)
            }
            .navigationTitle("Soul Sphere")

        } content: {
            // COLUMN 2: CONTEXTUAL LIST
            if let tab = selectedTab {
                contextualPanel(for: tab)
            } else {
                Text("Select a module")
            }

        } detail: {
            // COLUMN 3: 3D EXPERIENCE
            if selectedTab == .history {
                if let session = selectedSession {
                    HistorySessionDetail(session: session)
                } else {
                    ContentUnavailableView(
                        "Select a Session",
                        systemImage: "chart.xyaxis.line",
                        description: Text("View detailed analytics for past sessions.")
                    )
                }
            } else {
                ZStack {
                Color.black.ignoresSafeArea()

                // Binding selectedEmotion here triggers the "flyTo" logic in SoulView if we wire it up
                SoulView(vibe: $vibe,
                         emotions: emotions.filter { $0.collection?.name == activeCollectionName },
                         selectedEmotion: $selectedEmotion,
                         hoveredEmotion: $hoveredEmotion,
                         path: computedPath,
                         playSequence: $isPlayingPath,
                         labels: $labels,
                         showParticles: $showParticles,
                         showLiquid: $showLiquid,
                         visualMode: $visualMode,
                         audioLevel: audioLevel) // NEW: Pass Audio Level
                    .ignoresSafeArea()
                    .scaleEffect(breathPublisher.scaleFactor) // NEW: Breathe

                // Labels Overlay
                SoulLabelsOverlay(labels: labels, selectedEmotion: selectedEmotion, hoveredEmotion: hoveredEmotion)
                    .ignoresSafeArea()
                    .onChange(of: selectedEmotion) { _, _ in
                        hapticEngine.playSelection()
                    }
                    .onChange(of: hoveredEmotion) { _, _ in
                        hapticEngine.playHover()
                    }

                // HUD
                VStack {
                    HStack {
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text("V: \(vibe.valence, specifier: "%.2f")")
                            Text("A: \(vibe.arousal, specifier: "%.2f")")
                            Text("C: \(vibe.connection, specifier: "%.2f")")
                            Divider().overlay(.white)
                            Text("HR: \(Int(bioMonitor.heartRate))")
                                .foregroundStyle(.red.opacity(0.8))
                            Text("HRV: \(Int(bioMonitor.hrv))")
                                .foregroundStyle(.blue.opacity(0.8))
                        }
                        .font(.caption.monospaced())
                        .foregroundStyle(.white.opacity(0.5))
                        .padding()
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                    }
                    Spacer()
                    if isMicRecording {
                        VoiceVisualizer(audioLevel: audioLevel)
                            .padding(.bottom, 20)
                            .transition(.scale.combined(with: .opacity))
                    }
                }

                // NEW: ZenHUD for Navigation/Visuals (Custom Component)
                VStack {
                    Spacer()
                    ZenHUD(selectedEmotion: selectedEmotion,
                          hoveredEmotion: hoveredEmotion,
                          activePath: computedPath,
                          visualMode: $visualMode)
                }
                .padding(.bottom, 40)
            }
        }
        }
    }

    // MARK: - Subviews

    @ViewBuilder
    func contextualPanel(for tab: AdminTab) -> some View {
        switch tab {
        case .views:
             BookmarksTab(onSave: { savePreset() }, onRestore: { restorePreset($0) })
        case .explore:
            ExploreTab(
                selectedEmotion: $selectedEmotion,
                activeCollectionName: activeCollectionName,
                onSearch: onSearch
            )
        case .paths:
            PathsTab(emotions: emotions, computedPath: $computedPath, isPlayingPath: $isPlayingPath)
        case .chat:
            chatPanelView
        case .journeys:
            JourneyTabRoot(onStrategyStart: onStrategyStart, onStrategyComplete: onStrategyComplete)
                .navigationTitle("Journey")
        case .history:
            HistorySessionList(selectedSession: $selectedSession)
                .navigationTitle("History")
        case .settings:
            settingsPanelView
        }
    }

    private var chatPanelView: some View {
        ChatView(isRecording: $isMicRecording,
                 streamingText: $streamingResponse,
                 isThinking: $isThinking,
                 onSend: { text in onChatInput(text) },
                 onMicTap: { isMicRecording.toggle() })
        .navigationTitle("Soul Chat")
    }

    private var settingsPanelView: some View {
        Form {
            Section("Graphics") {
                Toggle("Show Particles", isOn: $showParticles)
                Toggle("Show Liquid", isOn: $showLiquid)
                Picker("Visual Mode", selection: $visualMode) {
                    ForEach(VisualMode.allCases, id: \.self) { mode in
                        Text(mode.displayName).tag(mode)
                    }
                }
            }

            Section("Collection") {
                Picker("Active Dataset", selection: $activeCollectionName) {
                    ForEach(collections) { collection in
                        Text(collection.name).tag(collection.name)
                    }
                }
            }

            Section("Intelligence") {
                NavigationLink(destination: ModelSettingsView()) {
                    Label("Brain Models", systemImage: "brain")
                }
            }
        }
        .navigationTitle("Settings")
    }
    // MARK: - Logic

    // MARK: - Preset Logic

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
        hapticEngine.playSelection() // Feedback
    }

    func restorePreset(_ preset: ViewPreset) {
        // Restore Vibe
        self.vibe = Vibe(valence: preset.valence, arousal: preset.arousal, connection: preset.connection)

        // Restore Mode
        // Restore Mode
        if let rawInt = Int(preset.visualModeRaw), let mode = VisualMode(rawValue: rawInt) {
            self.visualMode = mode
        }

        // Restore Selection (Find by ID first, fallback to name matches if needed but ID is cleaner)
        if let targetId = preset.targetEmotionId,
           let emotion = emotions.first(where: { $0.id == targetId }) {
            self.selectedEmotion = emotion.name
        } else {
            self.selectedEmotion = nil
        }

        hapticEngine.playTransition(valence: preset.valence, arousal: preset.arousal)
    }
}
