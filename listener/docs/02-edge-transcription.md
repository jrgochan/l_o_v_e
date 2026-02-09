# Listener Module - Edge Transcription

## Overview

The **Edge Transcription** component runs on the user's mobile device using whisper.rn, providing immediate feedback while maintaining privacy. This enables the "Optimistic UI" pattern critical for user engagement.

## whisper.rn Integration

### What is whisper.rn?

**whisper.rn** is a React Native binding for whisper.cpp, allowing OpenAI's Whisper model to run directly on mobile devices without network connection.

**Benefits**:
- ✅ Zero latency (no network round-trip)
- ✅ Complete privacy (audio never leaves device for edge processing)
- ✅ Offline capability
- ✅ Hardware acceleration (Neural Engine/NNAPI)

### Installation

```bash
# Install whisper.rn
npm install whisper.rn

# iOS: Install pods
cd ios && pod install && cd ..
```

### Model Download

Download quantized Whisper model (~75MB):

```typescript
import { downloadModel } from 'whisper.rn';

const downloadWhisperModel = async () => {
  await downloadModel({
    model: 'tiny.en',  // or 'base.en' for better accuracy
    onProgress: (progress) => {
      console.log(`Downloading: ${progress}%`);
    }
  });
};
```

**Model Options**:
| Model | Size | Speed | Accuracy | Recommendation |
|-------|------|-------|----------|----------------|
| tiny.en | 75MB | Fastest | ~80% | Quick feedback |
| base.en | 142MB | Fast | ~85% | **Recommended** |
| small.en | 466MB | Medium | ~90% | High-end devices |

## Implementation

### WhisperService Class

```typescript
// mobile/src/services/WhisperService.ts

import { initWhisper, AudioSessionIos } from 'whisper.rn';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export class WhisperService {
  private whisper: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const modelPath = `${RNFS.DocumentDirectoryPath}/ggml-base.en.bin`;

    // Check if model exists
    const modelExists = await RNFS.exists(modelPath);
    if (!modelExists) {
      throw new Error('Whisper model not downloaded');
    }

    // Initialize whisper
    this.whisper = await initWhisper({
      filePath: modelPath,
      enableCoreML: Platform.OS === 'ios',      // iOS Neural Engine
      enableNNAPI: Platform.OS === 'android',   // Android DSP
      audioSessionOnStartIos: AudioSessionIos.playAndRecord,
    });

    this.isInitialized = true;
    console.log('Whisper initialized');
  }

  async transcribe(audioFilePath: string): Promise<TranscriptionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    const result = await this.whisper.transcribe({
      filePath: audioFilePath,
      language: 'en',
      maxLen: 1,          // Enable streaming
      tokenTimestamps: false,  // Disable for speed
      speedUp: true       // Trade slight accuracy for speed
    });

    const duration = Date.now() - startTime;

    return {
      text: result.result,
      duration_ms: duration,
      confidence: 0.85  // Estimated for edge processing
    };
  }

  async release(): Promise<void> {
    // Cleanup resources
    this.whisper = null;
    this.isInitialized = false;
  }
}
```

### Audio Recording

```typescript
// mobile/src/services/AudioRecorder.ts

import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { PermissionsAndroid, Platform } from 'react-native';

export class AudioRecorder {
  private recorder = new AudioRecorderPlayer();
  private isRecording = false;

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;  // iOS handles via Info.plist
  }

  async startRecording(): Promise<string> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Microphone permission denied');
    }

    const audioPath = await this.recorder.startRecorder(
      undefined,
      {
        SampleRate: 16000,  // Whisper expects 16kHz
        Channels: 1,        // Mono
        AudioEncoding: 'pcm_16bit',
      }
    );

    this.isRecording = true;
    return audioPath;
  }

  async stopRecording(): Promise<string> {
    const audioPath = await this.recorder.stopRecorder();
    this.isRecording = false;
    return audioPath;
  }
}
```

## Optimistic UI Pattern

### Crude Sentiment Analysis

```typescript
// mobile/src/services/CrudeSentiment.ts

const NEGATIVE_WORDS = ['angry', 'sad', 'terrible', 'awful', 'hate', 'frustrated'];
const POSITIVE_WORDS = ['happy', 'great', 'wonderful', 'love', 'amazing', 'joy'];

export class CrudeSentiment {
  analyze(text: string): number {
    """
    Quick lexicon-based sentiment for immediate feedback.

    Returns: Valence estimate [-1.0, 1.0]
    """
    const words = text.toLowerCase().split(/\s+/);

    let score = 0;

    for (const word of words) {
      if (NEGATIVE_WORDS.includes(word)) score -= 1;
      if (POSITIVE_WORDS.includes(word)) score += 1;
    }

    // Normalize to [-1, 1]
    const normalized = Math.max(-1, Math.min(1, score / 3));

    return normalized;
  }
}
```

### React Hook

```typescript
// mobile/src/hooks/useVoiceInput.ts

import { useState } from 'react';
import { WhisperService } from '../services/WhisperService';
import { CrudeSentiment } from '../services/CrudeSentiment';
import { AudioRecorder } from '../services/AudioRecorder';

export const useVoiceInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [sentiment, setSentiment] = useState(0);

  const whisper = new WhisperService();
  const recorder = new AudioRecorder();
  const sentiment analyzer = new CrudeSentiment();

  const startRecording = async () => {
    const audioPath = await recorder.startRecording();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    // Stop recording
    const audioPath = await recorder.stopRecording();
    setIsRecording(false);

    // Edge transcription (immediate)
    const result = await whisper.transcribe(audioPath);
    setPartialText(result.text);

    // Crude sentiment (immediate)
    const crudeValence = sentimentAnalyzer.analyze(result.text);
    setSentiment(crudeValence);

    // Upload to cloud for deep processing (async)
    uploadToCloud(audioPath, result.text);
  };

  return {
    isRecording,
    partialText,
    sentiment,
    startRecording,
    stopRecording
  };
};
```

## React Native New Architecture Compatibility

### Potential Issues

whisper.rn uses native modules that may conflict with React Native's New Architecture (Fabric).

**Mitigation**:

```json
// app.json
{
  "expo": {
    "ios": {
      "newArchEnabled": false  // Disable if whisper.rn has issues
    },
    "android": {
      "newArchEnabled": false
    }
  }
}
```

### Testing Compatibility

```typescript
// Test whisper.rn on New Architecture
import { NativeModules } from 'react-native';

const testWhisperCompatibility = async () => {
  try {
    const whisper = await initWhisper({...});
    console.log('✓ whisper.rn compatible with current arch');
    return true;
  } catch (error) {
    console.error('✗ whisper.rn incompatible', error);
    return false;
  }
};
```

## Next Steps

Now that you understand edge transcription:
- **03-cloud-processing.md** - faster-whisper backend implementation
- **04-semantic-analysis.md** - LLM VAC extraction
- **05-atlas-mapping.md** - Emotion classification
