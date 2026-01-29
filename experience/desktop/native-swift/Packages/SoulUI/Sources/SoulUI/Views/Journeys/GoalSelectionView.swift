import SwiftUI
import SoulCore
import SoulBrain
import SwiftData

/// A premium wizard for selecting the start and goal of an emotional journey.
@available(macOS 14, iOS 17, *)
public struct GoalSelectionView: View {
    @Environment(\.dismiss) var dismiss
    @Query(sort: \Emotion.name) var emotions: [Emotion]
    
    @State private var selectedStart: Emotion?
    @State private var selectedGoal: Emotion?
    @State private var searchText = ""
    @State private var isAnimating = false
    
    // Callback when a journey is confirmed
    public var onStartJourney: (Emotion, Emotion) -> Void
    
    // Grid columns adapt to device width
    private let columns = [
        GridItem(.adaptive(minimum: 140, maximum: 180), spacing: 16)
    ]
    
    public init(onStartJourney: @escaping (Emotion, Emotion) -> Void) {
        self.onStartJourney = onStartJourney
    }
    
    public var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color.black.ignoresSafeArea()
                
                VStack(spacing: 24) {
                    // Header
                    headerView
                    
                    // Selection Area
                    ScrollView {
                        VStack(alignment: .leading, spacing: 32) {
                            if selectedStart == nil {
                                selectionSection(title: "Where are you now?", emotions: filteredEmotions, selection: $selectedStart, color: .blue)
                            } else if selectedGoal == nil {
                                selectionSection(title: "Where do you want to go?", emotions: filteredEmotions, selection: $selectedGoal, color: .purple)
                            } else {
                                // Summary / Confirmation View
                                confirmationView
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 100)
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
            .searchable(text: $searchText, prompt: "Search emotions...")
        }
    }
    
    // MARK: - Subviews
    
    private var headerView: some View {
        VStack(spacing: 8) {
            Text("New Journey")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            
            Text("Chart a path through the emotional landscape.")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.6))
        }
        .padding(.top, 20)
    }
    
    private func selectionSection(title: String, emotions: [Emotion], selection: Binding<Emotion?>, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.title2.bold())
                .foregroundStyle(color)
                .transition(.opacity.combined(with: .move(edge: .leading)))
            
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(emotions) { emotion in
                    EmotionCard(emotion: emotion, isSelected: selection.wrappedValue?.id == emotion.id)
                        .onTapGesture {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                                selection.wrappedValue = emotion
                                #if os(iOS)
                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                #endif
                            }
                        }
                }
            }
        }
    }
    
    private var confirmationView: some View {
        VStack(spacing: 40) {
            Spacer()
            
            HStack(spacing: 0) {
                // Start
                if let start = selectedStart {
                    EmotionCard(emotion: start, isSelected: true)
                        .frame(width: 140)
                }
                
                // Connector
                Image(systemName: "arrow.right")
                    .font(.largeTitle)
                    .foregroundStyle(.white.opacity(0.5))
                    .frame(width: 80)
                
                // Goal
                if let goal = selectedGoal {
                    EmotionCard(emotion: goal, isSelected: true)
                        .frame(width: 140)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(.white.opacity(0.05))
                    .stroke(.white.opacity(0.1), lineWidth: 1)
            )
            
            Button {
                if let start = selectedStart, let goal = selectedGoal {
                    onStartJourney(start, goal)
                    dismiss()
                }
            } label: {
                Text("Begin Journey")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(colors: [.blue, .purple], startPoint: .leading, endPoint: .trailing)
                    )
                    .clipShape(Capsule())
                    .shadow(color: .purple.opacity(0.4), radius: 10, x: 0, y: 5)
            }
            .padding(.horizontal, 40)
            
            Button("Reset") {
                withAnimation {
                    selectedStart = nil
                    selectedGoal = nil
                }
            }
            .foregroundStyle(.white.opacity(0.5))
            
            Spacer()
        }
        .transition(.scale.combined(with: .opacity))
    }
    
    // MARK: - Helpers
    
    private var filteredEmotions: [Emotion] {
        if searchText.isEmpty {
            return emotions
        } else {
            return emotions.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }
}

/// A reusable card for displaying an emotion.
struct EmotionCard: View {
    let emotion: Emotion
    let isSelected: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // VAC Visualization (Simplified placeholder)
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(hue: Double(emotion.valence + 1) / 2, saturation: 0.7, brightness: 0.9),
                            Color(hue: Double(emotion.arousal + 1) / 2, saturation: 0.8, brightness: 0.7)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 40, height: 40)
                .overlay(
                    Circle().stroke(.white.opacity(0.5), lineWidth: 1)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(emotion.name)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(1)
                
                Text(emotion.category)
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.6))
                    .lineLimit(2)
            }
        }
        .padding()
        .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(isSelected ? Color.blue.opacity(0.3) : Color.white.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(isSelected ? Color.blue : Color.white.opacity(0.1), lineWidth: isSelected ? 2 : 1)
        )
        .shadow(color: isSelected ? .blue.opacity(0.3) : .clear, radius: 8)
        .scaleEffect(isSelected ? 1.05 : 1.0)
    }
}
