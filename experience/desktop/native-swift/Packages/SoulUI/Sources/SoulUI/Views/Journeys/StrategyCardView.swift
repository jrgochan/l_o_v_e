import SwiftUI
import SoulCore

/// A card displaying a psychological intervention strategy.
@available(macOS 14, iOS 17, *)
public struct StrategyCardView: View {
    public let strategy: TransitionStrategy
    public var onComplete: () -> Void

    public init(strategy: TransitionStrategy, onComplete: @escaping () -> Void) {
        self.strategy = strategy
        self.onComplete = onComplete
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            headerView

            Divider()
                .background(.white.opacity(0.2))

            descriptionView

            if !strategy.detailedSteps.isEmpty {
                instructionsView
            }

            Spacer()

            actionButton
        }
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 32)
                .fill(.black.opacity(0.6))
                .background(.ultraThinMaterial) // Glassmorphism
                .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 32)
                .stroke(
                    LinearGradient(
                        colors: [.white.opacity(0.3), .white.opacity(0.05)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
    }

    // MARK: - Subviews

    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(strategy.name)
                    .font(.title3.bold())
                    .foregroundStyle(.white)

                Text("Recommended Intervention")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.6))
                    .textCase(.uppercase)
            }

            Spacer()

            // Duration Pill
            HStack(spacing: 4) {
                Image(systemName: "clock")
                Text("\(Int(strategy.timeRequired / 60)) min")
            }
            .font(.caption.bold())
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
        }
    }

    private var descriptionView: some View {
        Text(strategy.definition)
            .font(.body)
            .foregroundStyle(.white.opacity(0.9))
            .lineSpacing(4)
    }

    private var instructionsView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Steps")
                .font(.caption.bold())
                .foregroundStyle(.white.opacity(0.6))
                .textCase(.uppercase)

            ForEach(0..<strategy.detailedSteps.count, id: \.self) { index in
                let step = strategy.detailedSteps[index]
                HStack(alignment: .top, spacing: 12) {
                    Text("\(index + 1)")
                        .font(.headline)
                        .foregroundStyle(.blue)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(.blue.opacity(0.2)))

                    Text(step)
                        .font(.system(size: 15))
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 12).fill(.white.opacity(0.05)))
    }

    private var actionButton: some View {
        Button(action: onComplete) {
            HStack {
                Text("Complete Strategy")
                Image(systemName: "checkmark.circle.fill")
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(colors: [.green, .mint], startPoint: .leading, endPoint: .trailing)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .green.opacity(0.3), radius: 8, x: 0, y: 4)
        }
    }
}
