import Foundation
import SwiftData
import Combine

/// Manages Emotion Collections and their active state.
@MainActor
public class CollectionManager: ObservableObject {
    private let context: ModelContext

    @Published public var activeCollectionName: String = "GoEmotions"
    private var cancellables = Set<AnyCancellable>()

    public init(context: ModelContext) {
        self.context = context
        self.syncInitialState()
        self.setupSubscriptions()
    }

    private func syncInitialState() {
        do {
            let descriptor = FetchDescriptor<EmotionCollection>(predicate: #Predicate { $0.isActive == true })
            if let active = try context.fetch(descriptor).first {
                self.activeCollectionName = active.name
            }
        } catch {
            print("⚠️ CollectionManager: Failed to sync initial state: \(error)")
        }
    }

    private func setupSubscriptions() {
        // Auto-Persist Collection Changes when UI updates the property
        $activeCollectionName
            .receive(on: RunLoop.main)
            .dropFirst() // Skip initial value
            .sink { [weak self] newName in
                guard let self = self else { return }
                print("🔄 UI triggered collection switch to: \(newName)")
                self.switchCollection(toName: newName)
            }
            .store(in: &cancellables)
    }

    /// Switches the active emotion dataset by ID
    public func switchCollection(to collectionId: String) {
        performSwitch(predicate: { $0.id == collectionId }, identifier: collectionId)
    }

    /// Switches the active emotion dataset by Name
    public func switchCollection(toName collectionName: String) {
        performSwitch(predicate: { $0.name == collectionName }, identifier: collectionName)
    }

    private func performSwitch(predicate: (EmotionCollection) -> Bool, identifier: String) {
        do {
            let descriptor = FetchDescriptor<EmotionCollection>()
            let collections = try context.fetch(descriptor)

            var found = false
            for col in collections {
                if predicate(col) {
                    col.isActive = true
                    // Sync our local state if it differs (e.g. called programmatically)
                    if self.activeCollectionName != col.name {
                        self.activeCollectionName = col.name
                    }
                    found = true
                } else {
                    col.isActive = false
                }
            }

            if found {
                try context.save()
                print("📚 Switched active collection to: \(identifier)")
            } else {
                print("⚠️ Collection '\(identifier)' not found.")
            }
        } catch {
            print("❌ Failed to switch collection: \(error)")
        }
    }
}
