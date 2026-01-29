import Foundation
import MLX
import MLXNN

// MARK: - Configuration

public struct ModelArgs: Codable {
    public var dim: Int = 4096
    public var nLayers: Int = 32
    public var nHeads: Int = 32
    public var nKvHeads: Int? // Default to nHeads if nil
    public var vocabSize: Int = 128256 // Llama 3 defaults
    public var normEps: Float = 1e-5
    public var ropeTheta: Float = 500000.0 // Llama 3 RoPE theta
    
    public init() {}
}

// MARK: - Layers

// MARK: - Layers

class RMSNorm: Module {
    let weight: MLXArray
    let eps: Float
    
    init(dims: Int, eps: Float = 1e-6) {
        self.weight = MLXArray.ones([dims])
        self.eps = eps
        super.init()
    }
    
    func callAsFunction(_ x: MLXArray) -> MLXArray {
        let pow = MLX.pow(x, 2)
        let mean = pow.mean(axis: -1, keepDims: true)
        let rsqrt = MLX.rsqrt(mean + eps)
        return x * rsqrt * weight
    }
}

class Attention: Module {
    let nHeads: Int
    let nKvHeads: Int
    let dim: Int
    let headDim: Int
    
    let wq: Linear
    let wk: Linear
    let wv: Linear
    let wo: Linear
    
    let ropeTheta: Float
    
    init(args: ModelArgs) {
        self.nHeads = args.nHeads
        self.nKvHeads = args.nKvHeads ?? args.nHeads
        self.dim = args.dim
        self.headDim = args.dim / args.nHeads
        self.ropeTheta = args.ropeTheta
        
        self.wq = Linear(args.dim, args.nHeads * headDim, bias: false)
        self.wk = Linear(args.dim, nKvHeads * headDim, bias: false)
        self.wv = Linear(args.dim, nKvHeads * headDim, bias: false)
        self.wo = Linear(args.nHeads * headDim, args.dim, bias: false)
        
        super.init()
    }
    
    func callAsFunction(_ x: MLXArray, mask: MLXArray? = nil, cache: (MLXArray, MLXArray)? = nil) -> (MLXArray, (MLXArray, MLXArray)) {
        let (B, L, _ ) = x.shape3
        
        // Projections
        var q = wq(x)
        var k = wk(x)
        var v = wv(x)
        
        // Reshape [B, L, H, D]
        q = q.reshaped([B, L, nHeads, headDim])
        k = k.reshaped([B, L, nKvHeads, headDim])
        v = v.reshaped([B, L, nKvHeads, headDim])
        
        // RoPE
        let offset = cache == nil ? 0 : cache!.0.dim(1)
        q = applyRoPE(q, offset: offset, theta: ropeTheta)
        k = applyRoPE(k, offset: offset, theta: ropeTheta)
        
        // KV Cache Update
        if let (kCache, vCache) = cache {
            k = MLX.concatenated([kCache, k], axis: 1)
            v = MLX.concatenated([vCache, v], axis: 1)
        }
        let newCache = (k, v)
        
        // Manual Scaled Dot Product Attention
        // 1. Transpose K for matmul: [B, H, L, D] -> [B, H, D, L]?
        // MLX `matmul` handles broadcasting.
        // We need: Q [B, H, L, D] * K^T [B, H, D, L_total] -> [B, H, L, L_total]
        // But Q/K currently [B, L, H, D].
        // We need to permute to [B, H, L, D]
        
        let qP = q.transposed(0, 2, 1, 3) // [B, H, L, D]
        let kP = k.transposed(0, 2, 1, 3) // [B, H_kv, L, D]
        let vP = v.transposed(0, 2, 1, 3) // [B, H_kv, L, D]
        
        // GQA Handling
        let nRep = nHeads / nKvHeads
        let kGQA: MLXArray
        let vGQA: MLXArray
        
        if nRep > 1 {
            // Repeat heads: [B, H_kv, L, D] -> [B, H_kv, nRep, L, D] -> [B, H_kv * nRep, L, D]
            // Note: Efficient repeat usually involves expanding dims then tiling
            // Optimization: Use specific repeat API if available, or manual expansion
             
            // Manual expansion for now:
            // 1. Expand dim: [B, H_kv, 1, L, D]
            // 2. Tile: [B, H_kv, nRep, L, D]
            // 3. Reshape: [B, H, L, D]
            
            func repeatHeads(_ x: MLXArray) -> MLXArray {
                let shape = x.shape
                let (B, H_kv, L, D) = (shape[0], shape[1], shape[2], shape[3])
                
                var newShape = x.shape
                newShape.insert(1, at: 2)
                let expanded = x.reshaped(newShape) // [B, H_kv, 1, L, D]
                // broadcast_to is essentially tiling if we rely on implicit broadcasting or explicit tile
                // But MLX doesn't have a simple 'repeat_interleave' yet in Swift?
                // Let's rely on broadcasting in matmul if possible? NO, matmul broadcasts 1 -> N, not 8 -> 32.
                
                // Explicit tile:
                // Create a multiplier array of ones [1, 1, nRep, 1, 1]? 
                
                // ALTERNATIVE: Use broadcast_to if we can reshape destination?
                // The safest manual way without advanced ops:
                // Concatenate self nRep times?
                
                let tiled = MLX.concatenated((0..<nRep).map { _ in expanded }, axis: 2)
                return tiled.reshaped([B, H_kv * nRep, L, D])
            }
            
            kGQA = repeatHeads(kP)
            vGQA = repeatHeads(vP)
        } else {
            kGQA = kP
            vGQA = vP
        }
        
        // Matmul: (B, H, L, D) @ (B, H, D, L_k) -> (B, H, L, L_k)
        let kPt = kGQA.transposed(0, 1, 3, 2)
        var scores = matmul(qP, kPt)
        scores *= (1.0 / sqrt(Float(headDim)))
        
        if let mask = mask {
            scores += mask
        }
        
        let probs = softmax(scores, axis: -1)
        
        // Output: (B, H, L, L_k) @ (B, H, L_k, D) -> (B, H, L, D)
        let output = matmul(probs, vGQA)
        
        // Transpose back: [B, L, H, D]
        let outputT = output.transposed(0, 2, 1, 3)
        
        // Flatten: [B, L, H*D]
        let flattened = outputT.reshaped([B, L, nHeads * headDim])
        
        return (wo(flattened), newCache)
    }
    
    private func applyRoPE(_ x: MLXArray, offset: Int, theta: Float) -> MLXArray {
        let shape = x.shape
        let B = shape[0]
        let L = shape[1]
        let N = shape[2] // Heads
        let D = shape[3] // HeadDim
        let halfD = D / 2
        
        // Correct arange usage
        // Use Double for ranges, then dtype
        let freqsIdx = MLX.arange(0, Double(D), step: 2.0, dtype: .float32) // [D/2]
        
        let scalar = log(theta) / Float(D)
        let freqs = MLX.exp(-freqsIdx * MLXArray(scalar))
        
        // Time indices
        let t = MLX.arange(Double(offset), Double(offset + L), step: 1.0, dtype: .float32) // [L]
        
        // Outer product
        let angles = t.reshaped([L, 1]) * freqs.reshaped([1, halfD])
        
        let cos = MLX.cos(angles).reshaped([1, L, 1, halfD])
        let sin = MLX.sin(angles).reshaped([1, L, 1, halfD])
        
        let xReshaped = x.reshaped([B, L, N, halfD, 2])
        let x1 = xReshaped[0..., 0..., 0..., 0..., 0]
        let x2 = xReshaped[0..., 0..., 0..., 0..., 1]
        
        let out1 = x1 * cos - x2 * sin
        let out2 = x1 * sin + x2 * cos
        
        let out = MLX.concatenated([out1.reshaped(out1.shape + [1]), out2.reshaped(out2.shape + [1])], axis: -1)
        return out.reshaped(shape)
    }
}

class FeedForward: Module {
    let w1: Linear // Gate
    let w2: Linear // Down
    let w3: Linear // Up
    
    init(args: ModelArgs) {
        let dim = args.dim
        let hiddenDim = 4 * dim
        let reducedHiddenDim = Int(2 * hiddenDim / 3)
        let ffDim = ((reducedHiddenDim + 255) / 256) * 256
        
        self.w1 = Linear(dim, ffDim, bias: false)
        self.w2 = Linear(ffDim, dim, bias: false)
        self.w3 = Linear(dim, ffDim, bias: false)
        
        super.init()
    }
    
    // SwiGLU: w2(silu(w1(x)) * w3(x))
    func callAsFunction(_ x: MLXArray) -> MLXArray {
        return w2(silu(w1(x)) * w3(x))
    }
}

// MARK: - Transformer

public class Llama: Module {
    let args: ModelArgs
    let vocabEmbedding: Embedding
    let layers: [TransformerBlock]
    let norm: RMSNorm
    let output: Linear
    
    public init(args: ModelArgs) {
        self.args = args
        self.vocabEmbedding = Embedding(embeddingCount: args.vocabSize, dimensions: args.dim)
        
        self.layers = (0..<args.nLayers).map { _ in TransformerBlock(args: args) }
        
        self.norm = RMSNorm(dims: args.dim, eps: args.normEps)
        self.output = Linear(args.dim, args.vocabSize, bias: false)
        
        super.init()
    }
    
    // Main forward pass
    public func callAsFunction(_ inputs: MLXArray, mask: MLXArray? = nil, cache: [(MLXArray, MLXArray)]? = nil) -> (MLXArray, [(MLXArray, MLXArray)]) {
        var h = vocabEmbedding(inputs)
        
        var newCache: [(MLXArray, MLXArray)] = []
        
        for (i, layer) in layers.enumerated() {
            let layerCache = cache?[i]
            let (newH, newLayerCache) = layer(h, mask: mask, cache: layerCache)
            h = newH
            newCache.append(newLayerCache)
        }
        
        h = norm(h)
        let logits = output(h)
        
        return (logits, newCache)
    }
}

class TransformerBlock: Module {
    let attention: Attention
    let feedForward: FeedForward
    let attentionNorm: RMSNorm
    let ffNorm: RMSNorm
    
    init(args: ModelArgs) {
        self.attention = Attention(args: args)
        self.feedForward = FeedForward(args: args)
        self.attentionNorm = RMSNorm(dims: args.dim, eps: args.normEps)
        self.ffNorm = RMSNorm(dims: args.dim, eps: args.normEps)
        super.init()
    }
    
    func callAsFunction(_ x: MLXArray, mask: MLXArray? = nil, cache: (MLXArray, MLXArray)? = nil) -> (MLXArray, (MLXArray, MLXArray)) {
        let normX = attentionNorm(x)
        let (attnOut, newCache) = attention(normX, mask: mask, cache: cache)
        let h = x + attnOut
        let out = h + feedForward(ffNorm(h))
        return (out, newCache)
    }
}
