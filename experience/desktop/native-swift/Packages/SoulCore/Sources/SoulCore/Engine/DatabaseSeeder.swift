import Foundation
import SwiftData

/// Responsible for populating the database with initial emotion datasets.
@available(macOS 14, iOS 17, *)
public struct DatabaseSeeder {
    
    private struct EmotionJSON: Codable {
        let emotion_name: String
        let definition: String
        let category: String
        let vac: [Double]
        let color_hint: String?
        let haptic_pattern_id: String?
    }
    
    private struct CollectionJSON: Codable {
        let emotions: [EmotionJSON]
    }
    
    enum SeedingError: Error {
        case fileNotFound(String)
        case decodingFailed(String, Error)
    }
    
    public static func seed(modelContext: ModelContext) throws {
        // 1. Seed Atlas of the Heart
        // 1. Seed Atlas of the Heart
        try seedCollection(
            context: modelContext,
            config: SeedConfig(
                id: "atlas_of_the_heart",
                name: "Atlas of the Heart",
                desc: "Brené Brown's framework of 87 emotions and experiences.",
                filename: "Atlas",
                isActive: true
            )
        )
        
        // 2. Seed Plutchik
        try seedCollection(
            context: modelContext,
            config: SeedConfig(
                id: "plutchik_wheel",
                name: "Plutchik's Wheel",
                desc: "Robert Plutchik's psycho-evolutionary theory of basic emotions.",
                filename: "Plutchik",
                isActive: false
            )
        )
        
        // 3. Seed UAL (Unified Affective Lexicon)
        try seedCollection(
            context: modelContext,
            config: SeedConfig(
                id: "ual_core",
                name: "Unified Affective Lexicon",
                desc: "A heuristics-derived dataset mapping VAD to VAC coordinates.",
                filename: "UAL",
                isActive: false
            )
        )
        
        // 4. Seed GoEmotions (Google)
        try seedCollection(
            context: modelContext,
            config: SeedConfig(
                id: "go_emotions",
                name: "GoEmotions",
                desc: "Google's fine-grained emotion dataset derived from Reddit comments.",
                filename: "GoEmotions",
                isActive: false
            )
        )
        
        // 5. Seed Strategies
        try seedStrategies(context: modelContext)
    }
    
    private struct SeedConfig {
        let id: String
        let name: String
        let desc: String
        let filename: String
        let isActive: Bool
    }

    private static func seedCollection(context: ModelContext, config: SeedConfig) throws {
        // Check if collection already exists
        let id = config.id
        let descriptor = FetchDescriptor<EmotionCollection>(predicate: #Predicate { $0.id == id })
        let existingCount = try context.fetchCount(descriptor)
        
        if existingCount > 0 {
            print("🌱 Collection '\(config.name)' already exists. Skipping.")
            return
        }
        
        print("🌱 Seeding collection: \(config.name)...")
        
        // Load JSON from Bundle
        // Try multiple paths to be robust
        var url = Bundle.module.url(forResource: config.filename, withExtension: "json", subdirectory: "Seeds")
        
        if url == nil {
             // Fallback: try top level if flattened
             url = Bundle.module.url(forResource: config.filename, withExtension: "json")
        }
    
        if url == nil {
             // Fallback: try Resources/Seeds explicitly
             url = Bundle.module.url(forResource: config.filename, withExtension: "json", subdirectory: "Resources/Seeds")
        }
        
        guard let validUrl = url else {
            throw SeedingError.fileNotFound("\(config.filename).json in Bundle: \(Bundle.module.bundlePath)")
        }
        
        let data = try Data(contentsOf: validUrl)
        let collectionData: CollectionJSON
        do {
            collectionData = try JSONDecoder().decode(CollectionJSON.self, from: data)
        } catch {
            throw SeedingError.decodingFailed(config.filename, error)
        }
        
        // Create Collection
        let collection = EmotionCollection(id: config.id, name: config.name, desc: config.desc, isActive: config.isActive)
        context.insert(collection)
        
        // Create Emotions
        for item in collectionData.emotions {
            let emotion = Emotion(
                name: item.emotion_name,
                definition: item.definition,
                category: item.category,
                valence: item.vac[0],
                arousal: item.vac[1],
                connection: item.vac[2],
                colorHint: item.color_hint,
                hapticHint: item.haptic_pattern_id
            )
            emotion.collection = collection
            context.insert(emotion)
        }
        
        try context.save()
        print("✅ Seeded \(collectionData.emotions.count) emotions into '\(config.name)'")
    }
    private static func seedStrategies(context: ModelContext) throws {
        let descriptor = FetchDescriptor<TransitionStrategy>()
        let count = try context.fetchCount(descriptor)
        
        if count > 0 {
            print("🌱 Strategies already seeded. Skipping.")
            return
        }
        
        print("🌱 Seeding core strategies...")
        
        let strategies = [
            TransitionStrategy(
                name: "Box Breathing",
                type: .physiologicalRegulation,
                definition: "A rhythmic breathing technique to calm the autonomic nervous system.",
                detailedSteps: ["Inhale for 4 seconds", "Hold for 4 seconds", "Exhale for 4 seconds", "Hold for 4 seconds"],
                timeRequired: 120,
                difficultyLevel: 1,
                evidenceLevel: .clinical
            ),
            TransitionStrategy(
                name: "Perspective Shift",
                type: .cognitiveReappraisal,
                definition: "Identifying alternative explanations for the situation.",
                detailedSteps: ["Identify the thought causing distress", "Ask: Is there another way to see this?", "Consider what a compassionate friend would say"],
                timeRequired: 300,
                difficultyLevel: 3,
                evidenceLevel: .expertConsensus
            ),
            TransitionStrategy(
                name: "Quick Movement",
                type: .behavioralActivation,
                definition: "Short burst of physical activity to shift energy.",
                detailedSteps: ["Stand up", "Shake out your limbs", "Do 10 jumping jacks or walk briskly"],
                timeRequired: 60,
                difficultyLevel: 1,
                evidenceLevel: .metaAnalysis
            ),
            TransitionStrategy(
                name: "Gratitude Message",
                type: .socialConnection,
                definition: "Reaching out to strengthen social bonds.",
                detailedSteps: ["Think of someone you appreciate", "Draft a short text expressing thanks", "Send it without expecting a reply"],
                timeRequired: 180,
                difficultyLevel: 2,
                evidenceLevel: .rct
            )
        ]
        
        for strategy in strategies {
            context.insert(strategy)
        }
        
        try context.save()
        print("✅ Seeded \(strategies.count) strategies.")
    }
}
