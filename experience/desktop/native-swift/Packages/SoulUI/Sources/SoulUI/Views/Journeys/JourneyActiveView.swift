import SwiftUI
import SoulCore
import SoulBrain
import SwiftData

/// The active dashboard for a user's emotional journey.
@available(macOS 14, iOS 17, *)
public struct JourneyActiveView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.modelContext) var modelContext

    let startEmotion: Emotion
    let goalEmotion: Emotion
    var onStrategyStart: (TransitionStrategy) -> Void
    var onStrategyComplete: (TransitionStrategy) -> Void

    @State private var path: [Emotion] = []
    @State private var currentStepIndex: Int = 0
    @State private var isCalculating: Bool = true
    @State private var activeStrategy: TransitionStrategy?
    @Query var allEmotions: [Emotion]
    @Query var patterns: [TransitionPattern] // Needed for Pathfinder? Yes.

    public init(
        start: Emotion,
        goal: Emotion,
        onStrategyStart: @escaping (TransitionStrategy) -> Void = { _ in },
        onStrategyComplete: @escaping (TransitionStrategy) -> Void = { _ in }
    ) {
        self.startEmotion = start
        self.goalEmotion = goal
        self.onStrategyStart = onStrategyStart
        self.onStrategyComplete = onStrategyComplete
    }

    public var body: some View {
        ZStack {
            // Background (Dynamic Gradient based on current step)
            backgroundLayer

            VStack(spacing: 0) {
                // Header / Progress
                progressHeader
                    .padding(.top, 20)
                    .padding(.bottom, 20)

                if isCalculating {
                    ProgressView("Calculating Path...")
                        .tint(.white)
                        .scaleEffect(1.5)
                } else if path.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundStyle(.yellow)
                        Text("No path found between these emotions.")
                            .foregroundStyle(.white)
                        Button("Go Back") { dismiss() }
                    }
                } else {
                    // Main Content
                    mainContentView
                }

                Spacer()
            }
        }
        .onAppear {
            calculatePath()
        }
    }

    // MARK: - Subviews

    private var backgroundLayer: some View {
        GeometryReader { proxy in
            let currentEmotion = path.indices.contains(currentStepIndex) ? path[currentStepIndex] : startEmotion

            RadialGradient(
                colors: [
                    Color(hue: Double(currentEmotion.valence + 1) / 2, saturation: 0.6, brightness: 0.2).opacity(0.6),
                    Color.clear
                ],
                center: .center,
                startRadius: 100,
                endRadius: proxy.size.height
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 1.0), value: currentStepIndex)
        }
    }

    @Query var strategies: [TransitionStrategy] // Load all strategies

    private var progressHeader: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Journey to \(goalEmotion.name)")
                    .font(.headline)
                    .foregroundStyle(.white.opacity(0.8))
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
            .padding(.horizontal)

            // Progress Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(.white.opacity(0.1))
                        .frame(height: 6)

                    if !path.isEmpty {
                        let progress = CGFloat(currentStepIndex) / CGFloat(path.count - 1)
                        Capsule().fill(Color.blue)
                            .frame(width: geo.size.width * progress, height: 6)
                            .animation(.spring, value: currentStepIndex)
                    }
                }
            }
            .frame(height: 6)
            .padding(.horizontal)
        }
    }

    private var mainContentView: some View {
        TabView(selection: $currentStepIndex) {
            ForEach(Array(path.enumerated()), id: \.offset) { index, emotion in
                VStack(spacing: 32) {
                    // Emotion Indicator
                    VStack(spacing: 16) {
                        Text(index == 0 ? "START" : (index == path.count - 1 ? "GOAL" : "WAYPOINT \(index)"))
                            .font(.caption.bold())
                            .foregroundStyle(.white.opacity(0.5))
                            .tracking(2)

                        Text(emotion.name)
                            .font(.system(size: 42, weight: .bold, design: .serif))
                            .foregroundStyle(.white)
                            .shadow(color: .white.opacity(0.3), radius: 10)

                        Text(emotion.category) // Assuming Category is a string
                             .font(.title3)
                             .foregroundStyle(.white.opacity(0.7))
                             .padding(.horizontal, 16)
                             .padding(.vertical, 8)
                             .background(.white.opacity(0.1))
                             .clipShape(Capsule())
                    }
                    .padding(.top, 40)

                    // Strategy Suggestion (Real Logic)
                    if index < path.count - 1 {
                        VStack(spacing: 16) {
                            Text("Recommended Strategy")
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.6))

                            // Dynamically suggest strategy
                            if let strategy = StrategyEngine.suggestStrategy(
                                from: emotion,
                                to: path[index + 1],
                                availableStrategies: strategies
                            ) {
                                StrategyCardView(strategy: strategy) {
                                    // On Complete
                                    onStrategyComplete(strategy)
                                    advanceStep()
                                }
                                .padding(.horizontal)
                                .onAppear {
                                    // Signal start
                                    onStrategyStart(strategy)
                                }
                            } else {
                                Text("Focus on your breath to transition.")
                                    .font(.caption)
                                    .foregroundStyle(.white.opacity(0.5))
                                Button("Continue") { advanceStep() }
                                    .buttonStyle(.bordered)
                                    .tint(.white)
                            }
                        }
                    } else {
                        // Goal Reached View
                        VStack(spacing: 24) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 64))
                                .foregroundStyle(.green)

                            Text("You have arrived.")
                                .font(.title2)
                                .foregroundStyle(.white)

                            Button("Complete Session") {
                                dismiss()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.white.opacity(0.2))
                        }
                    }
                }
                .tag(index)
            }
        }
        .tabViewStyle(.automatic) // Page style unavailable on macOS
    }

    // MARK: - Logic

    private func calculatePath() {
        isCalculating = true

        // Run on background thread
        DispatchQueue.global(qos: .userInitiated).async {
            // Need to fetch TransitionPattern models from SwiftData on main thread if passing to Pathfinder?
            // Or assume Pathfinder is pure logic.
            // Pathfinder needs [Emotion] and [TransitionPattern].
            // SwiftData objects are not thread safe.
            // For MVP, lets just run on main thread if dataset is small (< 1000 items).

            DispatchQueue.main.async {
                let foundPath = EmotionalPathfinder.findPath(
                    from: startEmotion,
                    to: goalEmotion,
                    using: allEmotions,
                    patterns: patterns // Pass in the patterns
                )

                withAnimation {
                    self.path = foundPath ?? []
                    self.isCalculating = false
                }
            }
        }
    }

    private func advanceStep() {
        if currentStepIndex < path.count - 1 {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                currentStepIndex += 1
            }
        }
    }
}
