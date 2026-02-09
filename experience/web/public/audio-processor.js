/**
 * PersonaPlex Audio Processor
 *
 * distinct from the main thread, this runs in the audio rendering thread.
 * Handles buffering of incoming PCM data and outputting it to the audio context.
 */

class PersonaPlexAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.debugCounter = 0;

    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === "enqueue") {
        // data is Float32Array
        // We need to push individual samples or chunks.
        // Pushing the whole chunk is more efficient if we handle it right in process.
        this.buffer.push(data);
      } else if (type === "clear") {
        this.buffer = [];
      }
    };
  }

  process(inputs, outputs) {
    // --- Input Handling (Mic -> AudioContext -> Worklet -> Main Thread -> WS) ---
    const input = inputs[0];
    if (input && input[0]) {
      const inputChannel = input[0];
      // Post raw float32 data back to main thread
      // We buffer slightly or send every block (128 samples is extremely fast, maybe too fast?)
      // 128 samples @ 24kHz is ~5ms.
      // Sending every 5ms is fine for real-time.
      // Optimization: we could bundle, but low latency is key.
      this.port.postMessage({ type: "input", data: inputChannel });
    }

    // --- Output Handling (WS -> Main Thread -> Worklet -> AudioContext -> Speakers) ---
    const output = outputs[0];
    const channel = output[0]; // Mono output

    if (!channel) return true;

    const bufferSize = channel.length; // usually 128

    // Check if we have enough data
    if (this.buffer.length === 0) {
      // Underrun - output silence
      // channel is already zero-initialized by spec, but needed?
      // Actually usually it is zeroed, but let's be safe or just return true.
      return true;
    }

    let sampleIndex = 0;

    while (sampleIndex < bufferSize && this.buffer.length > 0) {
      const currentChunk = this.buffer[0];

      // How many samples can we take from this chunk?
      const remainingInChunk = currentChunk.length;
      const neededForBuffer = bufferSize - sampleIndex;

      const take = Math.min(remainingInChunk, neededForBuffer);

      // Copy data
      // channel is Float32Array, currentChunk is Float32Array
      // We can use set() for efficiency if we track offsets, but loop is fine for small chunks
      for (let i = 0; i < take; i++) {
        channel[sampleIndex + i] = currentChunk[i];
      }

      sampleIndex += take;

      // Update or shift buffer
      if (take < remainingInChunk) {
        // We only used part of the chunk
        // Create a view or slice for the rest? Slice is expensive.
        // Better to keep a pointer?
        // For simplicity v1: Slice.
        this.buffer[0] = currentChunk.subarray(take);
      } else {
        // Used the whole chunk
        this.buffer.shift();
      }
    }

    // Fill remaining with silence if we ran out
    /*
    // Not strictly needed as buffers are valid
    while (sampleIndex < bufferSize) {
        channel[sampleIndex++] = 0;
    }
    */

    return true; // Keep processor alive
  }
}

registerProcessor("personaplex-audio-processor", PersonaPlexAudioProcessor);
