import Foundation

/// Protocol defining an embedding service.
/// Transforms text into high-dimensional vectors.
public protocol Embedder: Sendable {
    func load() async throws
    func embed(_ text: String) async throws -> [Float]
}

/// A Mock Embedder for testing pipelines without a heavy model.
/// Generates deterministic random vectors based on input string hash.
public actor MockEmbedder: Embedder {
    public init() {}
    
    public func load() async throws {
        // No-op for mock
    }
    
    public func embed(_ text: String) async throws -> [Float] {
        // Basic deterministic generation for testing match stability.
        // real dims = 768 usually (BERT base)
        
        let seed = UInt64(abs(text.hashValue))
        var generator = SplitMix64(state: seed)
        
        return (0..<768).map { _ in
            // Normalize to small range [-1, 1]
            Float(Double(generator.next()) / Double(UInt64.max) * 2 - 1)
        }
    }
}

// Simple seeded RNG for the mock
struct SplitMix64: RandomNumberGenerator {
    var state: UInt64

    mutating func next() -> UInt64 {
        state &+= 0x9e3779b97f4a7c15
        var z = state
        z = (z ^ (z >> 30)) &* 0xbf58476d1ce4e5b9
        z = (z ^ (z >> 27)) &* 0x94d049bb133111eb
        return z ^ (z >> 31)
    }
}
