import SwiftUI
import SoulCore
import SoulBrain
import SwiftData
import SoulChat // NEW import for Message model

@available(macOS 14, iOS 17, *)
public struct SessionReplayView: View {
    let session: SessionAnalytics
    @StateObject private var engine: PlaybackEngine

    // Dummy bindings for SoulView (visual settings only)
    @State private var selectedEmotion: String?
    @State private var hoveredEmotion: String?
    @State private var showParticles: Bool = true
    @State private var showLiquid: Bool = true
    @State private var visualMode: VisualMode = .mystical

    // Query for SoulView context
    @Query private var emotions: [Emotion]
    @Environment(\.modelContext) private var context

    @State private var sessionMessages: [Message] = []

    public init(session: SessionAnalytics) {
        self.session = session
        _engine = StateObject(wrappedValue: PlaybackEngine(session: session))
    }

    public var body: some View {
        ZStack {
            // Background
            Color.black.ignoresSafeArea()

            // The Nebula - Driven by Engine
            SoulView(
                vibe: $engine.currentVibe,
                emotions: emotions,
                selectedEmotion: $selectedEmotion,
                hoveredEmotion: $hoveredEmotion,
                splinePoints: [],
                playSequence: .constant(false),
                showParticles: $showParticles,
                showLiquid: $showLiquid,
                visualMode: $visualMode
            )
            .ignoresSafeArea()
            .animation(.linear(duration: 0.1), value: engine.currentVibe.valence) // Smooth the ticks

            // Overlay Controls
            VStack {
                // Header
                HStack {
                    VStack(alignment: .leading) {
                        Text("Replay")
                            .font(.headline)
                            .foregroundStyle(.white.opacity(0.8))
                        Text(session.startTime.formatted(date: .abbreviated, time: .shortened))
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    Spacer()
                }
                .padding()

                Spacer()

                // Playback Bar
                VStack(spacing: 12) {
                    // Time Labels
                    HStack {
                        Text(engine.currentTime.formatted(date: .omitted, time: .standard))
                            .monospacedDigit()
                        Spacer()
                        Text((session.endTime ?? Date()).formatted(date: .omitted, time: .standard))
                            .monospacedDigit()
                    }
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.6))

                    // Timeline with Markers
                    ZStack(alignment: .leading) {
                        // Markers
                        GeometryReader { geo in
                            ForEach(sessionMessages) { msg in
                                if session.timeSeriesData != nil, // Ensure series exists
                                   let totalDuration = session.endTime?.timeIntervalSince(session.startTime),
                                   totalDuration > 0 {

                                    let offset = msg.timestamp.timeIntervalSince(session.startTime)
                                    let progress = offset / totalDuration

                                    if progress >= 0 && progress <= 1 {
                                        Circle()
                                            .fill(msg.isUser ? Color.blue : Color.purple)
                                            .frame(width: 6, height: 6)
                                            .position(x: geo.size.width * CGFloat(progress), y: geo.size.height / 2)
                                            .onTapGesture {
                                                engine.seek(to: progress)
                                            }
                                    }
                                }
                            }
                        }
                        .frame(height: 20)

                        // Scrubber
                        Slider(value: $engine.progress, in: 0...1) { editing in
                            if editing { engine.pause() }
                        }
                        .onChange(of: engine.progress) { _, newValue in
                             if !engine.isPlaying {
                                 engine.seek(to: newValue)
                             }
                        }
                        .tint(.white)
                    }

                    // Controls
                    HStack(spacing: 40) {
                        Button {
                            engine.seek(to: 0)
                        } label: {
                            Image(systemName: "backward.end.fill")
                                .font(.title2)
                        }

                        Button {
                            engine.togglePlay()
                        } label: {
                            Image(systemName: engine.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                                .font(.system(size: 44))
                        }

                        Button {
                           // No-op forward
                        } label: {
                            Image(systemName: "forward.end.fill")
                                .font(.title2)
                                .opacity(0.5)
                        }
                    }
                    .foregroundStyle(.white)
                }
                .padding(20)
                .background(.ultraThinMaterial)
                .cornerRadius(24)
                .padding(.horizontal)
                .padding(.bottom, 20)
            }
        }
        .onAppear {
            fetchMessages()
        }
    }

    private func fetchMessages() {
        let start = session.startTime
        let end = session.endTime ?? Date()

        let descriptor = FetchDescriptor<Message>(
            predicate: #Predicate { $0.timestamp >= start && $0.timestamp <= end },
            sortBy: [SortDescriptor(\.timestamp)]
        )

        do {
            self.sessionMessages = try context.fetch(descriptor)
        } catch {
            SoulLog.data.error("Failed to fetch session messages: \(error.localizedDescription)")
        }
    }
}
