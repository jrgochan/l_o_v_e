import Foundation
import Accelerate

/// A high-performance in-memory vector store for semantic search.
/// Uses Apple's Accelerate framework for vectorized cosine similarity.
public class VectorIndex: @unchecked Sendable {

    // Storage structure: ID -> Vector
    // In a real DB, this would be a specialized index (HNSW).
    // For local "Soul", iterating a few thousand memories is near-instant on M-series chips.
    private var items: [(id: UUID, vector: [Float])] = []

    // Lock for thread safety
    private let queue = DispatchQueue(label: "com.soulcore.vectorindex", attributes: .concurrent)

    public init() {}

    /// Adds or updates a vector in the index.
    public func add(id: UUID, vector: [Float]) {
        queue.async(flags: .barrier) {
            // Remove existing if present (naive up-sert)
            self.items.removeAll { $0.id == id }
            self.items.append((id: id, vector: vector))
        }
    }

    /// Removes a vector by ID.
    public func remove(id: UUID) {
        queue.async(flags: .barrier) {
            self.items.removeAll { $0.id == id }
        }
    }

    /// Clears the index.
    public func clear() {
        queue.async(flags: .barrier) {
            self.items.removeAll()
        }
    }

    /// Performs a cosine similarity search.
    /// - Parameters:
    ///   - query: The query embedding vector.
    ///   - limit: Maximum number of results to return.
    /// - Returns: List of UUIDs sorted by similarity (descending).
    public func search(query: [Float], limit: Int = 5) -> [UUID] {
        return queue.sync {
            // Normalize query once
            let queryNorm = normalize(query)

            // Calculate scores
            // Score = Dot(A, B) / (|A| * |B|)
            // If vectors are pre-normalized, Score = Dot(A, B)
            // For safety, we compute full cosine similarity here.

            let scored: [(UUID, Float)] = items.map { item in
                let score = cosineSimilarity(queryNorm, item.vector)
                return (item.id, score)
            }

            // Sort Descending
            let sorted = scored.sorted { $0.1 > $1.1 }

            return Array(sorted.prefix(limit)).map { $0.0 }
        }
    }

    // MARK: - Math Helpers

    /// Computes cosine similarity between two vectors.
    /// Uses vDSP for hardware acceleration.
    private func cosineSimilarity(_ a: [Float], _ b: [Float]) -> Float {
        guard a.count == b.count, !a.isEmpty else { return 0.0 }

        // Dot product
        var dot: Float = 0.0
        vDSP_dotpr(a, 1, b, 1, &dot, vDSP_Length(a.count))

        // Magnitudes
        // Note: Ideally, we store normalized vectors to skip this step for 'b'.
        // But for robustness in this MVP, we calculate it.
        var magA: Float = 0.0
        vDSP_svesq(a, 1, &magA, vDSP_Length(a.count))
        magA = sqrt(magA)

        var magB: Float = 0.0
        vDSP_svesq(b, 1, &magB, vDSP_Length(b.count))
        magB = sqrt(magB)

        if magA == 0 || magB == 0 { return 0.0 }

        return dot / (magA * magB)
    }

    private func normalize(_ vector: [Float]) -> [Float] {
        var mag: Float = 0.0
        vDSP_svesq(vector, 1, &mag, vDSP_Length(vector.count))
        mag = sqrt(mag)

        if mag == 0 { return vector }

        var normalized = vector
        var scale = 1.0 / mag
        vDSP_vsmul(vector, 1, &scale, &normalized, 1, vDSP_Length(vector.count))
        return normalized
    }
}
