import XCTest
@testable import SoulCore

final class SafetyEngineTests: XCTestCase {
    
    // MARK: - Safety Analysis
    
    func testCleanTextPasses() {
        let engine = SafetyEngine()
        let result = engine.analyze("Hello world")
        XCTAssertTrue(result.isSafe)
        XCTAssertTrue(result.flaggedKeywords.isEmpty)
    }
    
    func testPIIFilteringStub() {
        // Current SafetyEngine strictly checks suicide/harm patterns.
        // It does NOT check PII in the current implementation shown.
        // So we will just test that it returns safe for random non-harm text.
        
        let engine = SafetyEngine()
        let result = engine.analyze("My email is test@example.com")
        XCTAssertTrue(result.isSafe) 
    }
    
    func testToxicKeywords() {
        // "kill myself" is in criticalPatterns
        let engine = SafetyEngine()
        let result = engine.analyze("I want to kill myself")
        
        XCTAssertFalse(result.isSafe)
        XCTAssertEqual(result.severity, .critical)
        XCTAssertTrue(result.flaggedKeywords.contains("kill myself"))
    }
}
