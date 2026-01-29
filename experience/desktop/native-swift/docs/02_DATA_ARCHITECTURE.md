# 02. Data Architecture

**Framework**: SwiftData (Core Data)  
**Sync**: CloudKit (NSPersistentCloudKitContainer)  
**Storage**: SQLite (Encrypted by default on iOS/macOS)

## 1. Core Models (`SoulModel`)

We use `SwiftData` macros to define our schemas. 

### 1.1. `Soul` (The User)
Represents the user's profile and biological baseline.
```swift
@Model
final class Soul {
    @Attribute(.unique) var id: UUID
    var name: String
    var createdAt: Date
    
    // Biological Baseline (Private)
    var restingHeartRate: Int?
    var variabilityBaseline: Double? // HRV
    
    // Relationships
    @Relationship(deleteRule: .cascade) var memories: [Memory]
    @Relationship(deleteRule: .cascade) var vibes: [Vibe]
}
```

### 1.2. `Memory` (Journal Entry)
A specific moment in time captured by text, voice, or image.
```swift
@Model
final class Memory {
    @Attribute(.unique) var id: UUID
    var content: String // The raw text
    var timestamp: Date
    var sentimentScore: Double // -1.0 to 1.0
    
    // Vector Embedding (1024-dim Float array)
    // Stored as Data blob for speed, not queried via SQL
    @Attribute(.externalStorage) var embedding: Data? 
    
    // Metadata
    var location: Location?
    var tags: [String]
}
```

### 1.3. `Vibe` (Emotional State)
A discrete point on the Valence/Arousal graph. Implemented as a `Codable` struct for portability.

```swift
public struct Vibe: Codable, Sendable {
    public let id: UUID
    public let timestamp: Date
    public let valence: Double // -1.0 to 1.0
    public let arousal: Double // -1.0 to 1.0
    public let connection: Double // -1.0 to 1.0
}
```

## 2. Synchronization Strategy (CloudKit)

### 2.1. The "Private Database"
We use the **Private Database** scope.
*   **Benefits**: 
    1.  Data counts against User's iCloud quota, not Developer's.
    2.  Developer has **NO ACCESS** to seeing the data.
    3.  Push notifications for changes are free.

### 2.2. Conflict Resolution
*   **Policy**: `Last Writer Wins`. 
*   **Reasoning**: Emotional data is usually linear. If I edit a journal on my iPhone, I want that edit to override the old version on my Mac.

## 3. Vector Storage & Search Strategy

### 3.1. The Problem
CloudKit does not support vector search. SQLite supports it, but not natively in `SwiftData` easily without raw SQL.

### 3.2. The Solution: "Memory Palace"
We maintain a parallel accessible in-memory index or a specialized local binary file for vectors.
1.  **On Launch**: Load all `Memory.id` + `Memory.embedding` into RAM (Projecting ~100MB for 100k entries—negligible on M-series chips).
2.  **Search**: Use `Accelerate` framework to dot-product query vector against all loaded vectors.
3.  **Result**: Get top 10 IDs -> Fetch `Memory` objects from SwiftData by ID.

## 4. Privacy & Encryption
*   All fields are encrypted at rest by the OS.
*   CloudKit encrypts data in transit and at rest on Apple servers.
*   For "Private Soul" (Local Only), we set the specific `ModelConfiguration` to stored in a local-only container not synced to iCloud.
