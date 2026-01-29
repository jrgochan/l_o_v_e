import XCTest
@testable import SoulCore

final class EmotionEngineTests: XCTestCase {
    
    func testJoyLookup() {
        guard let vibe = EmotionEngine.coordinates(for: "Joy") else {
            XCTFail("Joy should exist in the atlas")
            return
        }
        
        // (0.9, 0.7, 0.8) from source
        XCTAssertEqual(vibe.valence, 0.9, accuracy: 0.01)
        XCTAssertEqual(vibe.arousal, 0.7, accuracy: 0.01)
        XCTAssertEqual(vibe.connection, 0.8, accuracy: 0.01)
    }
    
    func testCaseInsensitivity() {
        let v1 = EmotionEngine.coordinates(for: "JOY")
        let v2 = EmotionEngine.coordinates(for: "joy")
        
        XCTAssertNotNil(v1)
        XCTAssertNotNil(v2)
        XCTAssertEqual(v1?.valence, v2?.valence)
    }
    
    func testUnknownEmotionReturnsNil() {
        let result = EmotionEngine.coordinates(for: "NotAnEmotion_XYZ_123")
        XCTAssertNil(result)
    }
}
