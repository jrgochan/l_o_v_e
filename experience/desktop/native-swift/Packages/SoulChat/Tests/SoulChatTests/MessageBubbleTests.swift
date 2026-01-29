import XCTest
import SwiftUI
import ViewInspector
@testable import SoulChat

final class MessageBubbleTests: XCTestCase {
    
    func testUserMessageBubble() throws {
        let text = "Hello"
        let msg = Message(text: text, isUser: true)
        
        let sut = MessageBubble(message: msg)
        
        // Find text content
        // ViewInspector finds Text regardless of modifiers
        XCTAssertNoThrow(try sut.inspect().find(text: text))
        
        // Verify internal logic (Alignment via Spacer)
        // HStack -> (Spacer isUser?) -> Text -> (Spacer !isUser?)
        
        // If user, Spacer should be first (index 0)
        let hstack = try sut.inspect().hStack()
        _ = try hstack.spacer(0)
    }
    
    func testSystemMessageBubble() throws {
        let text = "I am Soul"
        let msg = Message(text: text, isUser: false)
        let sut = MessageBubble(message: msg)
        
        // Content
        XCTAssertNoThrow(try sut.inspect().find(text: text))
        
        // Structure Check (Relaxed)
        // Verify we have a Spacer for alignment
        XCTAssertNoThrow(try sut.inspect().find(ViewType.Spacer.self))
    }
}
