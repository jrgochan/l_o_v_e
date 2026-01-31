#if os(macOS)
import Foundation
import MLX
import MLXNN
import OSLog
import SoulCore

public actor MLXEmbedder: Embedder {

    private var model: Bert?
    private var tokenizer: Tokenizer?
    private var isLoaded: Bool = false

    private let modelId = "nomic-ai/nomic-embed-text-v1.5" // Or "bert-base-uncased"

    public init() {}

    public func load() async throws {
        SoulLog.brain.info("🧠 MLXEmbedder: Loading BERT model...")
        
        // Initialize Config
        let config = BertConfig()
        self.model = Bert(config)

        // Initialize Tokenizer (Fallback)
        self.tokenizer = Tokenizer(url: URL(fileURLWithPath: "/tmp/dummy"))

        self.isLoaded = true
        SoulLog.brain.info("🧠 MLXEmbedder: BERT initialized (Weights pending)")
    }

    public func embed(_ text: String) async throws -> [Float] {
        guard let model = model else {
            try await load()
            guard self.model != nil else {
                throw NSError(
                    domain: "Embedder",
                    code: 500,
                    userInfo: [NSLocalizedDescriptionKey: "Model failed to load"]
                )
            }
            return try await embed(text)
        }

        let tokenIds = tokenizeSimulated(text)
        let inputArr = MLXArray(tokenIds).reshaped([1, tokenIds.count])

        let (_, pooled) = model(inputArr)

        // Flatten [1, H] -> [H]
        let floats = pooled.asArray(Float.self)

        return floats
    }

    private func tokenizeSimulated(_ text: String) -> [Int32] {
        let content = text.split(separator: " ").map { _ in Int32.random(in: 100...30000) }
        return [101] + content + [102]
    }
}
#endif
