import Foundation
import SwiftData

/// Represents an evidence-based psychological strategy for emotional regulation.
/// Mirrors `transition_strategies` from Observer.
@Model
@available(macOS 14, iOS 17, *)
public final class TransitionStrategy {
    @Attribute(.unique) public var id: UUID
    public var name: String
    public var type: StrategyType
    public var definition: String
    public var detailedSteps: [String]
    public var timeRequired: TimeInterval // in seconds
    public var difficultyLevel: Int // 1-5
    public var evidenceLevel: EvidenceLevel
    public var researchCitations: [String]
    
    public init(
        id: UUID = UUID(),
        name: String,
        type: StrategyType,
        definition: String,
        detailedSteps: [String],
        timeRequired: TimeInterval,
        difficultyLevel: Int,
        evidenceLevel: EvidenceLevel,
        researchCitations: [String] = []
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.definition = definition
        self.detailedSteps = detailedSteps
        self.timeRequired = timeRequired
        self.difficultyLevel = max(1, min(5, difficultyLevel))
        self.evidenceLevel = evidenceLevel
        self.researchCitations = researchCitations
    }
}

public enum StrategyType: String, Codable, CaseIterable {
    case cognitiveReappraisal = "cognitive_reappraisal"
    case responseModulation = "response_modulation"
    case attentionalDeployment = "attentional_deployment"
    case socialConnection = "social_connection"
    case physiologicalRegulation = "physiological_regulation"
    case behavioralActivation = "behavioral_activation"
}

public enum EvidenceLevel: String, Codable, CaseIterable {
    case metaAnalysis = "meta_analysis"
    case rct = "rct"
    case clinical = "clinical"
    case expertConsensus = "expert_consensus"
}
