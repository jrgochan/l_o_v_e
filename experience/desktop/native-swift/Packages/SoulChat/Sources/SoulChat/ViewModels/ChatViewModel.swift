import SwiftUI
import SwiftData
import SoulCore
import Combine

@MainActor
public class ChatViewModel: ObservableObject {
    @Published public var inputText: String = ""
    public var messages: [Message] = [] // Managed by SwiftData query in View

    // Actions closure to communicate back to App/Brain
    public var onSendMessage: ((String) -> Void)?

    public init() {}

    public func send() {
        let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        onSendMessage?(trimmed)
        inputText = ""
    }
}
