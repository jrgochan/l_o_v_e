import XCTest
@testable import SoulCore

@MainActor
final class ModelManagerTests: XCTestCase {
    
    var tempDir: URL!
    var manager: ModelManager!
    
    override func setUp() async throws {
        tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        
        manager = ModelManager(directory: tempDir)
    }
    
    override func tearDown() async throws {
        try? FileManager.default.removeItem(at: tempDir)
    }
    
    func testRefreshFindsNewModels() {
        XCTAssertTrue(manager.localModels.isEmpty)
        
        // Create dummy .gguf file
        let dummyPath = tempDir.appendingPathComponent("test_model.gguf")
        let dummyData = "dummy content".data(using: .utf8)!
        try! dummyData.write(to: dummyPath)
        
        manager.refreshModels()
        
        XCTAssertEqual(manager.localModels.count, 1)
        XCTAssertEqual(manager.localModels.first?.name, "test_model.gguf")
    }
    
    func testIgnoresNonModels() {
        // Create text file
        let txtPath = tempDir.appendingPathComponent("readme.txt")
        try! "info".write(to: txtPath, atomically: true, encoding: .utf8)
        
        manager.refreshModels()
        XCTAssertTrue(manager.localModels.isEmpty)
    }
}
