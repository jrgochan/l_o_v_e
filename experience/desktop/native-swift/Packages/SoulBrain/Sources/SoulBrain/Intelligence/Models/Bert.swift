#if os(macOS)
import Foundation
import MLX
import MLXNN

// MARK: - Configuration

public struct BertConfig: Codable {
    public var vocabSize: Int = 30522
    public var hiddenSize: Int = 768
    public var numHiddenLayers: Int = 12
    public var numAttentionHeads: Int = 12
    public var intermediateSize: Int = 3072
    public var hiddenAct: String = "gelu"
    public var hiddenDropoutProb: Float = 0.1
    public var attentionProbsDropoutProb: Float = 0.1
    public var maxPositionEmbeddings: Int = 512
    public var typeVocabSize: Int = 2
    public var layerNormEps: Float = 1e-12

    public init() {}
}

// MARK: - Embeddings

class BertEmbeddings: Module {
    let wordEmbeddings: Embedding
    let positionEmbeddings: Embedding
    let tokenTypeEmbeddings: Embedding
    let layerNorm: LayerNorm
    let dropout: Dropout

    init(_ config: BertConfig) {
        self.wordEmbeddings = Embedding(embeddingCount: config.vocabSize, dimensions: config.hiddenSize)
        self.positionEmbeddings = Embedding(embeddingCount: config.maxPositionEmbeddings, dimensions: config.hiddenSize)
        self.tokenTypeEmbeddings = Embedding(embeddingCount: config.typeVocabSize, dimensions: config.hiddenSize)
        self.layerNorm = LayerNorm(dimensions: config.hiddenSize, eps: config.layerNormEps)
        self.dropout = Dropout(p: config.hiddenDropoutProb)
        super.init()
    }

    func callAsFunction(inputIds: MLXArray, tokenTypeIds: MLXArray? = nil) -> MLXArray {
        let seqLength = inputIds.shape[1]
        let positionIds = MLX.arange(0, Double(seqLength), step: 1, dtype: .int32).reshaped([1, seqLength])
        // Broadcast positionIds to batch size if needed, but embedding lookup handles automatic broadcasting usually.

        var embeddings = wordEmbeddings(inputIds) + positionEmbeddings(positionIds)

        if let tokenTypeIds = tokenTypeIds {
            embeddings += tokenTypeEmbeddings(tokenTypeIds)
        } else {
            // Default to type 0 if not provided
            let zeros = MLX.zeros(inputIds.shape, dtype: .int32)
            embeddings += tokenTypeEmbeddings(zeros)
        }

        embeddings = layerNorm(embeddings)
        embeddings = dropout(embeddings)
        return embeddings
    }
}

// MARK: - Attention

class BertSelfAttention: Module {
    let numAttentionHeads: Int
    let attentionHeadSize: Int
    let allHeadSize: Int

    let query: Linear
    let key: Linear
    let value: Linear

    let dropout: Dropout

    init(_ config: BertConfig) {
        self.numAttentionHeads = config.numAttentionHeads
        self.attentionHeadSize = config.hiddenSize / config.numAttentionHeads
        self.allHeadSize = self.numAttentionHeads * self.attentionHeadSize

        self.query = Linear(config.hiddenSize, allHeadSize)
        self.key = Linear(config.hiddenSize, allHeadSize)
        self.value = Linear(config.hiddenSize, allHeadSize)

        self.dropout = Dropout(p: config.attentionProbsDropoutProb)

        super.init()
    }

    func transposeForScores(_ x: MLXArray) -> MLXArray {
        let (B, L, _) = x.shape3
        let newShape = [B, L, numAttentionHeads, attentionHeadSize]
        return x.reshaped(newShape).transposed(0, 2, 1, 3) // [B, N, L, H]
    }

    func callAsFunction(_ hiddenStates: MLXArray, attentionMask: MLXArray? = nil) -> MLXArray {
        let q = transposeForScores(query(hiddenStates))
        let k = transposeForScores(key(hiddenStates))
        let v = transposeForScores(value(hiddenStates))

        // Attention Scores: Q * K^T
        let scores = matmul(q, k.transposed(0, 1, 3, 2))
        var scaledScores = scores / sqrt(Float(attentionHeadSize))

        if let mask = attentionMask {
            // BERT typically uses additive mask (0 for keep, -10000 for mask) or multiplicative
            // We assume mask is prepared for addition: (B, 1, 1, L)
            scaledScores += mask
        }

        let probs = softmax(scaledScores, axis: -1)
        let droppedProbs = dropout(probs)

        let context = matmul(droppedProbs, v)

        let (B, _, L, _) = context.shape4
        // Transpose back: [B, L, N, H]
        let contextT = context.transposed(0, 2, 1, 3)
        let output = contextT.reshaped([B, L, allHeadSize])

        return output
    }
}

class BertSelfOutput: Module {
    let dense: Linear
    let layerNorm: LayerNorm
    let dropout: Dropout

    init(_ config: BertConfig) {
        self.dense = Linear(config.hiddenSize, config.hiddenSize)
        self.layerNorm = LayerNorm(dimensions: config.hiddenSize, eps: config.layerNormEps)
        self.dropout = Dropout(p: config.hiddenDropoutProb)
        super.init()
    }

    func callAsFunction(_ hiddenStates: MLXArray, inputTensor: MLXArray) -> MLXArray {
        var h = dense(hiddenStates)
        h = dropout(h)
        return layerNorm(h + inputTensor)
    }
}

class BertAttention: Module {
    let selfAttention: BertSelfAttention
    let output: BertSelfOutput

    init(_ config: BertConfig) {
        self.selfAttention = BertSelfAttention(config)
        self.output = BertSelfOutput(config)
        super.init()
    }

    func callAsFunction(_ hiddenStates: MLXArray, attentionMask: MLXArray? = nil) -> MLXArray {
        let selfOutput = selfAttention(hiddenStates, attentionMask: attentionMask)
        let attentionOutput = output(selfOutput, inputTensor: hiddenStates)
        return attentionOutput
    }
}

// MARK: - Intermediate & Output

class BertIntermediate: Module {
    let dense: Linear
    let intermediateActFn: (MLXArray) -> MLXArray

    init(_ config: BertConfig) {
        self.dense = Linear(config.hiddenSize, config.intermediateSize)
        self.intermediateActFn = gelu // MLXNN.gelu
        super.init()
    }

    func callAsFunction(_ hiddenStates: MLXArray) -> MLXArray {
        return intermediateActFn(dense(hiddenStates))
    }
}

class BertOutput: Module {
    let dense: Linear
    let layerNorm: LayerNorm
    let dropout: Dropout

    init(_ config: BertConfig) {
        self.dense = Linear(config.intermediateSize, config.hiddenSize)
        self.layerNorm = LayerNorm(dimensions: config.hiddenSize, eps: config.layerNormEps)
        self.dropout = Dropout(p: config.hiddenDropoutProb)
        super.init()
    }

    func callAsFunction(_ hiddenStates: MLXArray, inputTensor: MLXArray) -> MLXArray {
        var h = dense(hiddenStates)
        h = dropout(h)
        return layerNorm(h + inputTensor)
    }
}

class BertLayer: Module {
    let attention: BertAttention
    let intermediate: BertIntermediate
    let output: BertOutput

    init(_ config: BertConfig) {
        self.attention = BertAttention(config)
        self.intermediate = BertIntermediate(config)
        self.output = BertOutput(config)
        super.init()
    }

    func callAsFunction(_ hiddenStates: MLXArray, attentionMask: MLXArray? = nil) -> MLXArray {
        let attentionOutput = attention(hiddenStates, attentionMask: attentionMask)
        let intermediateOutput = intermediate(attentionOutput)
        let layerOutput = output(intermediateOutput, inputTensor: attentionOutput)
        return layerOutput
    }
}

class BertEncoder: Module {
    let layer: [BertLayer]

    init(_ config: BertConfig) {
        self.layer = (0..<config.numHiddenLayers).map { _ in BertLayer(config) }
        super.init()
    }

    func callAsFunction(_ hiddenStates: MLXArray, attentionMask: MLXArray? = nil) -> MLXArray {
        var allEncoderLayers: [MLXArray] = []
        var h = hiddenStates

        for layerModule in layer {
            h = layerModule(h, attentionMask: attentionMask)
            allEncoderLayers.append(h)
        }

        return h
    }
}

class BertPooler: Module {
    let dense: Linear
    let activation: (MLXArray) -> MLXArray

    init(_ config: BertConfig) {
        self.dense = Linear(config.hiddenSize, config.hiddenSize)
        self.activation = { x in MLX.tanh(x) }
        super.init()
    }

    func callAsFunction(_ hiddenStates: MLXArray) -> MLXArray {
        // Take first token (CLS) of last layer: [B, 0, :]
        // Shape [B, L, H] -> [B, H]
        let firstTokenTensor = hiddenStates[0..., 0]
        let pooledOutput = dense(firstTokenTensor)
        return activation(pooledOutput)
    }
}

// MARK: - Main Model

public class Bert: Module {
    let embeddings: BertEmbeddings
    let encoder: BertEncoder
    let pooler: BertPooler

    public init(_ config: BertConfig) {
        self.embeddings = BertEmbeddings(config)
        self.encoder = BertEncoder(config)
        self.pooler = BertPooler(config)
        super.init()
    }

    public func callAsFunction(
        _ inputIds: MLXArray,
        tokenTypeIds: MLXArray? = nil,
        attentionMask: MLXArray? = nil
    ) -> (MLXArray, MLXArray) {
        // Embeddings
        let embeddingOutput = embeddings(inputIds: inputIds, tokenTypeIds: tokenTypeIds)

        // Prepare Mask
        // Input mask is usually [B, L] with 1 for tokens, 0 for padding.
        // We need [B, 1, 1, L] and additive values (0.0 for keep, -10000.0 for mask)

        var extendedMask: MLXArray?
        if let mask = attentionMask {
            // (B, L) -> (B, 1, 1, L)
            let (B, L) = mask.shape2
            var expanded = mask.reshaped([B, 1, 1, L])

            // Convert to additive: (1.0 - mask) * -10000.0
            expanded = (1.0 - expanded) * -10000.0
            extendedMask = expanded
        }

        // Encoder
        let sequenceOutput = encoder(embeddingOutput, attentionMask: extendedMask)

        // Pooler
        let pooledOutput = pooler(sequenceOutput)

        return (sequenceOutput, pooledOutput)
    }
}
#endif
