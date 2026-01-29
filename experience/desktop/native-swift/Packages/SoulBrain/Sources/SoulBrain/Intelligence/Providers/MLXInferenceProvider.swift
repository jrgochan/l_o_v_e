import Foundation
import MLX
import MLXRandom
import MLXNN
import SoulCore
import OSLog

public actor MLXInferenceProvider: InferenceProvider {

    private var model: Llama?
    private var tokenizer: Tokenizer?
    private var ready: Bool = false
    private let logger = Logger(subsystem: "com.soul.brain", category: "MLXInference")

    public init() {}

    public var isReady: Bool {
        return ready
    }

    public func load() async throws {
        logger.info("loading active model...")

        let activeId = await ModelManager.shared.activeModelId

        guard let modelId = activeId,
              let weightsUrl = await ModelManager.shared.getModelUrl(id: modelId) else {
            logger.warning("No active model selected.")
            throw NSError(domain: "SoulBrain", code: 404, userInfo: [NSLocalizedDescriptionKey: "No active model"])
        }

        let modelDir = weightsUrl.deletingLastPathComponent()

        logger.info("Loading weights from \(weightsUrl.path)")
        let loadedWeights = try MLX.loadArrays(url: weightsUrl)

        let args = ModelArgs()
        let loadedModel = Llama(args: args)

        let params = ModuleParameters.unflattened(loadedWeights)
        loadedModel.update(parameters: params)
        MLX.eval(loadedModel.parameters())

        logger.info("Loading Tokenizer...")
        let loadedTokenizer = Tokenizer(url: modelDir.appendingPathComponent("tokenizer.json"))

        self.model = loadedModel
        self.tokenizer = loadedTokenizer
        self.ready = true

        logger.info("Model Loaded successfully.")
    }

    public func generate(prompt: String) async -> AsyncStream<String> {
        guard let model = model, let tokenizer = tokenizer else {
            return AsyncStream { $0.finish() }
        }

        return AsyncStream { continuation in
            Task {
                await runInference(model: model, tokenizer: tokenizer, prompt: prompt, continuation: continuation)
            }
        }
    }

    private func runInference(
        model: Llama,
        tokenizer: Tokenizer,
        prompt: String,
        continuation: AsyncStream<String>.Continuation
    ) async {
        let tokens = tokenizer.encode(text: prompt)
        let tokenArr = MLXArray(tokens).reshaped([1, tokens.count])

        var (_, cache) = model(tokenArr)
        var nextToken = tokenArr[-1].reshaped([1, 1])

        var count = 0
        let maxTokens = 100

        while count < maxTokens {
            let (logits, newCache) = model(nextToken, cache: cache)
            cache = newCache

            let nextTokenId = logits[0, -1].argMax().item(Int.self)

            let word = tokenizer.decode(tokens: [nextTokenId])
            continuation.yield(word)

            nextToken = MLXArray([nextTokenId]).reshaped([1, 1])
            MLX.eval(nextToken)

            count += 1

            if nextTokenId == 128001 || nextTokenId == 128009 {
                break
            }
        }

        continuation.finish()
    }
}
