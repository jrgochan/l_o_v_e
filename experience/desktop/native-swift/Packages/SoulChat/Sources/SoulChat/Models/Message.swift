import Foundation
import SwiftData
import SoulCore

@Model
final public class Message {
    public var id: UUID
    public var text: String
    public var timestamp: Date
    public var isUser: Bool

    // Optional: Snapshot of the vibe at this moment
    public var valence: Double
    public var arousal: Double
    public var connection: Double

    public init(text: String, isUser: Bool, vibe: Vibe? = nil) {
        self.id = UUID()
        self.text = text
        self.timestamp = Date()
        self.isUser = isUser

        if let v = vibe {
            self.valence = v.valence
            self.arousal = v.arousal
            self.connection = v.connection
        } else {
            self.valence = 0
            self.arousal = 0
            self.connection = 0
        }
    }
}
