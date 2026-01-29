import XCTest
import SwiftData
@testable import SoulChat
@testable import SoulCore

final class MessageTests: XCTestCase {

    func testMessageInitDefaults() {
        let text = "Hello"
        let msg = Message(text: text, isUser: true)

        XCTAssertEqual(msg.text, text)
        XCTAssertTrue(msg.isUser)
        // Verify default vibe is 0
        XCTAssertEqual(msg.valence, 0)
        XCTAssertEqual(msg.arousal, 0)
        XCTAssertEqual(msg.connection, 0)
    }

    func testMessageInitWithVibe() {
        let vibe = Vibe(valence: 0.8, arousal: 0.5, connection: 0.9)
        let msg = Message(text: "Joyful", isUser: false, vibe: vibe)

        XCTAssertEqual(msg.valence, 0.8)
        XCTAssertEqual(msg.arousal, 0.5)
        XCTAssertEqual(msg.connection, 0.9)
    }
}
