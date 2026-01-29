import XCTest
@testable import SoulVoice

final class PIIFilterTests: XCTestCase {
    
    var filter: PIIFilter!
    
    override func setUp() {
        super.setUp()
        filter = PIIFilter()
    }
    
    // MARK: - Redaction Tests
    
    func testNameRedaction() {
        // "John Smith lives in New York" -> "[NAME] [NAME] lives in [LOCATION]"
        // Note: NLTagger is probabilistic. Usually detects common names.
        
        let original = "Apple is looking at buying U.K. startup for $1 billion." 
        // Example from Apple dev docs usually works best for standard taggers.
        // Let's try simpler.
        
        let text = "Contact John Smith at Apple."
        let cleaned = filter.scrub(text)
        
        // Assert some redaction happened. Exact tag depends on OS version/model.
        // Usually: "Contact [NAME] at [ORG]."
        
        XCTAssertTrue(cleaned.contains("[NAME]"))
        XCTAssertFalse(cleaned.contains("John Smith"))
    }
    
    func testNoRedactionForSafeText() {
        let text = "Hello world, this is a safe sentence."
        let cleaned = filter.scrub(text)
        XCTAssertEqual(text, cleaned)
    }
}
