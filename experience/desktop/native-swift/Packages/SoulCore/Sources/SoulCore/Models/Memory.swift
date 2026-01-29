import Foundation
import SwiftData

/// Represents a journal entry or captured moment.
@Model
@available(macOS 14, iOS 17, *)
public final class Memory {
    @Attribute(.unique) public var id: UUID
    public var timestamp: Date
    public var content: String
    
    /// High-dimensional vector embedding for semantic search.
    /// stored externally to keep the main SQL query light.
    @Attribute(.externalStorage) public var embedding: Data?
    
    public init(id: UUID = UUID(), timestamp: Date = Date(), content: String, embedding: Data? = nil) {
        self.id = id
        self.timestamp = timestamp
        self.content = content
        self.embedding = embedding
    }
}
