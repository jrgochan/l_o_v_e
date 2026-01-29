import XCTest
@testable import SoulChat

// Must run on MainActor because ViewModel is @MainActor
@MainActor
final class ChatViewModelTests: XCTestCase {

    func testSendTriggersCallback() {
        let viewModel = ChatViewModel()
        viewModel.inputText = "Hello Soul"

        var receivedText: String?
        viewModel.onSendMessage = { text in
            receivedText = text
        }

        viewModel.send()

        XCTAssertEqual(receivedText, "Hello Soul")
        XCTAssertEqual(viewModel.inputText, "", "Input text should be cleared after send")
    }

    func testSendEmptyStringDoesNothing() {
        let viewModel = ChatViewModel()
        viewModel.inputText = "   "

        var callbackCalled = false
        viewModel.onSendMessage = { _ in
            callbackCalled = true
        }

        viewModel.send()

        XCTAssertFalse(callbackCalled, "Should not send empty/whitespace-only strings")
        // Input text remains? Or is cleared? Original logic: "guard !trimmed.isEmpty else { return }"
        // So validation happens early, text likely not cleared if it returns early.
        // The current implementation is `guard !trimmed.isEmpty else { return }`.

        XCTAssertEqual(viewModel.inputText, "   ", "Input should remain if send failed validation")
    }
}
