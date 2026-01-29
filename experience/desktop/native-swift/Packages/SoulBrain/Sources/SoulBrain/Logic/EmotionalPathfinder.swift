import Foundation
import SoulCore
import simd

/// A* Pathfinding Engine for the Soul Sphere.
/// Ports logic from `observer/app/services/path_planner.py`.
public struct EmotionalPathfinder {

    // Tuning Weights
    private static let valenceWeight: Float = 1.0
    private static let arousalWeight: Float = 1.2
    private static let connectionWeight: Float = 1.5

    /// Finds the optimal path between two emotions using A* Search.
    /// - Parameters:
    ///   - start: Starting Emotion
    ///   - goal: Goal Emotion
    ///   - allEmotions: Pool of available emotions to search through
    ///   - validPatterns: Valid transition patterns (edges)
    /// - Returns: Ordered list of emotions representing the path (start -> ... -> goal)
    public static func findPath(
        from start: Emotion,
        to goal: Emotion,
        using allEmotions: [Emotion],
        patterns: [TransitionPattern]
    ) -> [Emotion]? {

        // Open Set: Emotions to be evaluated (Key: Emotion.ID, Value: F-Score)
        // We use a simple dictionary + array for priority queue simulation for simplicity in Swift
        var openList: [UUID] = [start.id]

        // Came From: Map of navigated nodes (Key: Child ID, Value: Parent ID)
        var cameFrom: [UUID: UUID] = [:]

        // G-Score: Cost from start to node (Key: Emotion.ID, Value: Cost)
        var gScore: [UUID: Float] = [:]
        gScore[start.id] = 0.0

        // F-Score: G-Score + Heuristic (Key: Emotion.ID, Value: Estimated Total Cost)
        var fScore: [UUID: Float] = [:]
        fScore[start.id] = heuristic(from: start, to: goal)

        while !openList.isEmpty {
            // Get node in openList with lowest fScore
            guard let currentID = openList.min(by: { (fScore[$0] ?? Float.infinity) < (fScore[$1] ?? Float.infinity) }) else {
                break
            }

            // Reconstruct path if goal reached (or category reached)
            // Note: Simplification - checking exact ID match first
            if currentID == goal.id {
                return reconstructPath(cameFrom: cameFrom, current: currentID, allEmotions: allEmotions)
            }

            // Remove current from openList
            openList.removeAll { $0 == currentID }

            // Find current Emotion object
            guard let currentEmotion = allEmotions.first(where: { $0.id == currentID }) else { continue }

            // Get Neighbors
            let neighbors = getNeighbors(for: currentEmotion, allEmotions: allEmotions, patterns: patterns, goal: goal)

            for neighbor in neighbors {
                // Calculate tentative G-Score
                // Cost = Distance(current, neighbor) + Pattern Difficulty
                // Calculate tentative G-Score
                // Cost = Distance(current, neighbor) + Pattern Difficulty

                // Let's use SoulMath.VACVector directly
                let vac1 = SoulMath.VACVector(valence: Float(currentEmotion.valence), arousal: Float(currentEmotion.arousal), connection: Float(currentEmotion.connection)).simdValue
                let vac2 = SoulMath.VACVector(valence: Float(neighbor.valence), arousal: Float(neighbor.arousal), connection: Float(neighbor.connection)).simdValue

                let stepCost = weightedDistance(from: vac1, to: vac2) // Using weighted distance from design doc
                let tentativeGScore = (gScore[currentID] ?? Float.infinity) + stepCost

                if tentativeGScore < (gScore[neighbor.id] ?? Float.infinity) {
                    // This path to neighbor is better
                    cameFrom[neighbor.id] = currentID
                    gScore[neighbor.id] = tentativeGScore
                    fScore[neighbor.id] = tentativeGScore + heuristic(from: neighbor, to: goal)

                    if !openList.contains(neighbor.id) {
                        openList.append(neighbor.id)
                    }
                }
            }
        }

        return nil // No path found
    }

    // MARK: - internal Helpers

    private static func reconstructPath(cameFrom: [UUID: UUID], current: UUID, allEmotions: [Emotion]) -> [Emotion] {
        var path: [Emotion] = []
        var curr = current

        while let emotion = allEmotions.first(where: { $0.id == curr }) {
            path.append(emotion)
            guard let parent = cameFrom[curr] else { break }
            curr = parent
        }

        return path.reversed()
    }

    private static func heuristic(from start: Emotion, to goal: Emotion) -> Float {
        // Euclidean distance in VAC space as admissible heuristic
        let v1 = SIMD3<Float>(Float(start.valence), Float(start.arousal), Float(start.connection))
        let v2 = SIMD3<Float>(Float(goal.valence), Float(goal.arousal), Float(goal.connection))
        return simd_distance(v1, v2)
    }

    private static func weightedDistance(from v1: SIMD3<Float>, to v2: SIMD3<Float>) -> Float {
        let dv = abs(v1.x - v2.x) * valenceWeight
        let da = abs(v1.y - v2.y) * arousalWeight
        let dc = abs(v1.z - v2.z) * connectionWeight
        return dv + da + dc
    }

    private static func getNeighbors(
        for current: Emotion,
        allEmotions: [Emotion],
        patterns: [TransitionPattern],
        goal: Emotion
    ) -> [Emotion] {
        return allEmotions.filter { candidate in
            // Use composed checks for readability and lower complexity
            isValidNeighbor(current: current, candidate: candidate, patterns: patterns)
        }
    }

    // MARK: - Validation Helpers

    private static func isValidNeighbor(current: Emotion, candidate: Emotion, patterns: [TransitionPattern]) -> Bool {
        // 0. Identity Check
        if candidate.id == current.id { return false }

        // 1. Proximity Check (Most cheap check first)
        // Don't jump too far in the VAC space (Max Euclidean distance of 1.5)
        if !isWithinRange(from: current, to: candidate, maxDistance: 1.5) { return false }

        // 2. Category Transition Check
        // If strictly same category, allow.
        // If different category, must have a valid TransitionPattern.
        if current.category == candidate.category { return true }

        return hasValidPattern(from: current, to: candidate, patterns: patterns)
    }

    private static func isWithinRange(from: Emotion, to: Emotion, maxDistance: Float) -> Bool {
        let v1 = SIMD3<Float>(Float(from.valence), Float(from.arousal), Float(from.connection))
        let v2 = SIMD3<Float>(Float(to.valence), Float(to.arousal), Float(to.connection))
        return simd_distance(v1, v2) <= maxDistance
    }

    private static func hasValidPattern(from: Emotion, to: Emotion, patterns: [TransitionPattern]) -> Bool {
        return patterns.contains { pattern in
            pattern.fromCategory == from.category && pattern.toCategory == to.category
        }
    }
}

/// The therapeutic engine responsible for selecting and applying interventions.
public struct StrategyEngine {

    // MARK: - Strategy Selection

    /// Suggests the best evidence-based strategy for a specific emotional transition.
    public static func suggestStrategy(
        from: Emotion,
        to: Emotion,
        availableStrategies: [TransitionStrategy]
    ) -> TransitionStrategy? {
        let dValence = to.valence - from.valence
        let dArousal = to.arousal - from.arousal

        let context = ScoringContext(
            dValence: dValence,
            dArousal: dArousal,
            needsUplift: dValence > 0.3,
            needsCalming: dArousal < -0.3,
            needsActivation: dArousal > 0.3,
            from: from,
            to: to
        )

        // Filter and Score Strategies
        var scored: [(strategy: TransitionStrategy, score: Double)] = []

        for strategy in availableStrategies {
            let score = context.calculateScore(for: strategy)
            if score > 0 {
                scored.append((strategy, score))
            }
        }

        return scored.sorted { $0.score > $1.score }.first?.strategy
    }

    // MARK: - Effect Application

    /// Calculates the resulting Vibe after completing a strategy.
    /// Encapsulates the therapeutic effect logic.
    public static func applyEffect(
        strategy: TransitionStrategy,
        currentVibe: Vibe
    ) -> Vibe {
        // Boost Valence (Feel Better) - Default +0.2
        let newValence = min(1.0, currentVibe.valence + 0.2)

        // Regulate Arousal (Target 0.5 - Balanced Energy)
        // Strategies typically move you towards balance, unless specific activation needed.
        // For simplicity, we assume regulation towards mean (0.5).
        let arousalDiff = 0.5 - currentVibe.arousal
        // Move 30% towards balance
        let newArousal = currentVibe.arousal + (arousalDiff * 0.3)

        // Boost Connection (Feeling supported) - Default +0.15
        let newConnection = min(1.0, currentVibe.connection + 0.15)

        return Vibe(valence: newValence, arousal: newArousal, connection: newConnection)
    }

    // MARK: - Internal Helpers

    private struct ScoringContext {
        let dValence: Double
        let dArousal: Double
        let needsUplift: Bool
        let needsCalming: Bool
        let needsActivation: Bool
        let from: Emotion
        let to: Emotion

        func calculateScore(for strategy: TransitionStrategy) -> Double {
            var score = scoreForType(strategy)

            // Simplicity Bias
            if (abs(dValence) + abs(dArousal) < 0.5) && strategy.difficultyLevel == 1 {
                score += 1.0
            }

            // Randomness (Deterministic during tests if seeded? No, using Double.random)
            // Ideally we inject a generator, but for now we accept slight variance.
            score += Double.random(in: 0...0.5)

            return score
        }

        private func scoreForType(_ strategy: TransitionStrategy) -> Double {
            var score = 0.0
            switch strategy.type {
            case .cognitiveReappraisal:
                score += needsUplift ? 2.0 : 0.0
            case .physiologicalRegulation, .responseModulation:
                score += needsCalming ? 3.0 : 0.0
            case .behavioralActivation:
                if needsActivation { score += 3.0 }
                if needsUplift { score += 1.0 }
            case .socialConnection:
                score += (to.connection > from.connection) ? 2.0 : 0.0
            case .attentionalDeployment:
                let highArousal = from.arousal > 0.7
                let negativeValence = from.valence < 0.4
                if highArousal && negativeValence { score += 2.5 }
            }
            return score
        }
    }
}
