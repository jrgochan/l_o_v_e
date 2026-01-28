# 04. Intelligence Layer

**Hardware Target**: Apple Neural Engine (ANE)  
**Frameworks**: CoreML, NaturalLanguage, Vision

## 1. On-Device Models strategy

To fit on a phone/laptop without draining battery, we prefer specialized small models over one giant LLM.

### 1.1. The "Soul Embedder" (Vectorization)
*   **Model**: Google's `BERT-Tiny` or Apple's `QuickThought` converted to CoreML.
*   **Input**: Text string.
*   **Output**: 512 or 768 float vector.
*   **Performance**: < 10ms on ANE.
*   **Usage**: Runs on *every* keystroke or sentence completion to find real-time related memories.

### 1.2. The "Soul Chat" (LLM)
*   **Model**: `Llama-3-8B-Instruct` (Quantized to 4-bit).
*   **Optimization**: 
    - Use `MLX` (Swift bindings) if we want dynamic LoRA loading.
    - Use `CoreML` if we want maximum battery efficiency.
    - **Decision**: Start with **MLX Swift** for flexibility, move to CoreML if energy usage is too high.
*   **Context Window**: 8k tokens. We inject the top 5 "Memories" from the Vector Search into the system prompt.

## 2. Bio-Feedback Loop (Apple Watch)

### 2.1. HealthKit Integration
We need read access to `HKQuantityType.heartRateVariabilitySDNN`.
*   **Logic**:
    - Low HRV (< 40ms) = Stress -> Trigger "Calm" UI Mode.
    - High HRV (> 60ms) = Recovered -> Trigger "Vibrant" UI Mode.

### 2.2. The "Vibe Check" Algorithm
We combine multiple inputs to determine current user state:
```swift
func calculateVibe(textSentiment: Double, hrv: Double, timeOfDay: Date) -> Vibe {
    // 1. Start with biologic baseline (HRV)
    // 2. Adjust based on recent text sentiment (NaturalLanguage)
    // 3. Adjust for Circadian rhythm (lower energy at night)
    return Vibe(...) 
}
```

## 3. Privacy-First "Learning"
We do not train on the user's data in the cloud. We use **Main Device Training** (if needed) or simple In-Context Learning (RAG).
*   **LoRA Tuning**: In the future, we can fine-tune a LoRA adapter on the Mac (plugged in) using MLX to make the LLM "speak" like the user.
