import SwiftUI
import SwiftData
import SoulCore
import SoulBrain

public struct PathsTab: View {
    // Data
    var emotions: [Emotion] // Full list for checking source/target
    @Query private var patterns: [TransitionPattern]

    // Bindings to parent state for visualization
    @Binding var computedPath: [String]
    @Binding var isPlayingPath: Bool

    // Internal Form State
    @State private var pathSource: String?
    @State private var pathTarget: String?

    public init(emotions: [Emotion], computedPath: Binding<[String]>, isPlayingPath: Binding<Bool>) {
        self.emotions = emotions
        self._computedPath = computedPath
        self._isPlayingPath = isPlayingPath
    }

    public var body: some View {
        VStack {
            // Path Controls
            Form {
                Section("Create Journey") {
                    Picker("Start", selection: $pathSource) {
                        Text("Select Start").tag(String?.none)
                        ForEach(emotions) { e in
                            Text(e.name).tag(String?.some(e.name))
                        }
                    }

                    Picker("End", selection: $pathTarget) {
                        Text("Select End").tag(String?.none)
                        ForEach(emotions) { e in
                            Text(e.name).tag(String?.some(e.name))
                        }
                    }

                    Button("Generate Path") {
                        generatePath()
                    }
                    .disabled(pathSource == nil || pathTarget == nil)
                }

                if !computedPath.isEmpty {
                    Section("Journey Steps") {
                        HStack {
                            Text("\(computedPath.count) Steps")
                            Spacer()
                            Button(action: {
                                isPlayingPath = true
                            }, label: {
                                Label("Play Journey", systemImage: "play.fill")
                            })
                            .buttonStyle(.borderedProminent)
                        }

                        ForEach(computedPath, id: \.self) { step in
                            Text(step)
                                .font(.caption.monospaced())
                        }
                    }
                }
            }
        }
        .navigationTitle("Pathfinder")
    }

    // MARK: - Logic
    func generatePath() {
        guard let startName = pathSource, let targetName = pathTarget else { return }

        guard let startEmotion = emotions.first(where: { $0.name == startName }),
              let targetEmotion = emotions.first(where: { $0.name == targetName }) else {
            return
        }

        // Pass patterns to pathfinder
        let pathEmotions = EmotionalPathfinder.findPath(
            from: startEmotion,
            to: targetEmotion,
            using: emotions,
            patterns: patterns
        )

        if let path = pathEmotions {
            self.computedPath = path.map { $0.name }
        } else {
            SoulLog.brain.warning("No path found")
            self.computedPath = []
        }
    }
}
