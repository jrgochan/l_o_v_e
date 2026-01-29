import SwiftUI
import SoulCore

/// The root container for the Journey feature.
/// Manages the state between Goal Selection and Active Journey.
@available(macOS 14, iOS 17, *)
public struct JourneyTabRoot: View {
    @State private var activeStart: Emotion?
    @State private var activeGoal: Emotion?
    @State private var isActive: Bool = false

    public var onStrategyStart: (TransitionStrategy) -> Void
    public var onStrategyComplete: (TransitionStrategy) -> Void

    public init(
        onStrategyStart: @escaping (TransitionStrategy) -> Void = { _ in },
        onStrategyComplete: @escaping (TransitionStrategy) -> Void = { _ in }
    ) {
        self.onStrategyStart = onStrategyStart
        self.onStrategyComplete = onStrategyComplete
    }

    public var body: some View {
        NavigationStack {
            if isActive, let start = activeStart, let goal = activeGoal {
                JourneyActiveView(
                    start: start,
                    goal: goal,
                    onStrategyStart: onStrategyStart,
                    onStrategyComplete: onStrategyComplete
                )
                    .navigationBarBackButtonHidden(true)
            } else {
                GoalSelectionView { start, goal in
                    withAnimation {
                        self.activeStart = start
                        self.activeGoal = goal
                        self.isActive = true
                    }
                }
            }
        }
    }
}
