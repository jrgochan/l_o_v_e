import XCTest
import SwiftUI
import ViewInspector
import SwiftData
@testable import LoveAppFeature
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class AppContainerTests: XCTestCase {
    
    var container: ModelContainer!
    
    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: SessionAnalytics.self, Emotion.self, EmotionCollection.self, ViewPreset.self, configurations: config)
    }
    
    func testAppContainerStructure() throws {
        // AppContainer relies on DependencyContainer
        let depContainer = DependencyContainer(context: container.mainContext)
        
        let sut = AppContainer()
            .environmentObject(depContainer)
        
        // Structure: ZStack -> (AdminDashboardView, VStack)
        XCTAssertNoThrow(try sut.inspect().find(ViewType.ZStack.self))
        
        let zstack = try sut.inspect().find(ViewType.ZStack.self)
        
        // Verify AdminDashboardView is present (it's a massive view, so finding by type is best)
        // Since AdminDashboardView is in another module, finding by type should work if publicly visible
        XCTAssertNoThrow(try zstack.find(AdminDashboardView.self))
    }
}
