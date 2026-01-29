import XCTest
@testable import SoulCore

final class VectorIndexTests: XCTestCase {
    
    var index: VectorIndex!
    
    override func setUp() {
        super.setUp()
        index = VectorIndex()
    }
    
    func testExactMatch() {
        let id = UUID()
        // A simple vector [1, 0, 0]
        index.add(id: id, vector: [1.0, 0.0, 0.0])
        
        let results = index.search(query: [1.0, 0.0, 0.0], limit: 1)
        
        XCTAssertEqual(results.count, 1)
        XCTAssertEqual(results.first, id)
    }
    
    func testCosineSimilarityRanking() {
        let id1 = UUID() // [1, 0, 0]
        let id2 = UUID() // [0, 1, 0]
        let id3 = UUID() // [0.5, 0.5, 0]
        
        index.add(id: id1, vector: [1.0, 0.0, 0.0])
        index.add(id: id2, vector: [0.0, 1.0, 0.0])
        index.add(id: id3, vector: [0.5, 0.5, 0.0])
        
        // Query close to id1 [0.9, 0.1, 0]
        let results = index.search(query: [0.9, 0.1, 0.0], limit: 3)
        
        // Expected: id1 (closest), id3 (mixed), id2 (orthogonal/distant)
        XCTAssertEqual(results[0], id1)
        XCTAssertEqual(results[1], id3)
        XCTAssertEqual(results[2], id2)
    }
    
    func testLimit() {
        for _ in 0..<10 {
            index.add(id: UUID(), vector: [Float.random(in: 0...1), Float.random(in: 0...1)])
        }
        
        let results = index.search(query: [0.5, 0.5], limit: 3)
        XCTAssertEqual(results.count, 3)
    }
}
