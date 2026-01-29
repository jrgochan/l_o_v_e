import Foundation

public actor MockInferenceProvider: InferenceProvider {

    private var ready: Bool = false

    public init() {}

    public var isReady: Bool {
        return ready
    }

    public func load() async throws {
        // Simulate loading delay
        try? await Task.sleep(nanoseconds: 100_000_000)
        ready = true
    }

    public func generate(prompt: String) async -> AsyncStream<String> {
        AsyncStream { continuation in
            Task {
                let thoughts = [
                    "I understand.",
                    " This is a test.",
                    " Simulation active."
                ]

                for word in thoughts {
                    try? await Task.sleep(nanoseconds: 50_000_000)
                    continuation.yield(word)
                }

                continuation.finish()
            }
        }
    }
}
