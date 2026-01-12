# Voice Recording + Prosody Analysis - Implementation Plan

**Date:** 2025-12-05  
**Feature:** Add microphone support with full prosody analysis to emotional chat

---

## 🎯 Overview

Add voice recording capability to the emotional chat interface with advanced prosody analysis to detect voice characteristics (pitch, energy, rate, quality) and correlate them with semantic emotional content.

---

## 📋 Implementation Phases

### **Phase 1: Frontend Voice Recording** (2-3 hours)

#### Components to Create

1. **`useVoiceRecording.ts`** - Custom hook for audio recording
   - MediaRecorder API integration
   - Audio stream management
   - WAV encoding to base64
   - Recording state management
   - Browser permission handling

2. **`AudioVisualizer.tsx`** - Real-time waveform display
   - Canvas-based waveform rendering
   - Audio level meter (VU meter style)
   - Real-time animation during recording
   - Cyan color theme with glow effects

3. **`VoiceRecorder.tsx`** - Recording modal component
   - Modal overlay with backdrop
   - Recording controls (record, stop, cancel)
   - Duration counter (MM:SS format)
   - AudioVisualizer integration
   - Audio preview/playback before sending

4. **`ProsodyDisplay.tsx`** - Voice analysis visualization
   - Pitch curve chart
   - Energy meter
   - Speech rate display
   - Voice quality indicators
   - Voice-content correlation visualization

#### Updates Required

- **`ChatPanel.tsx`**: Wire 🎤 button to open VoiceRecorder
- **`types/chat.ts`**: Add recording state types (if needed)

---

### **Phase 2: Backend Prosody Analysis** (3-4 hours)

#### Service to Create

1. **`listener/app/services/prosody_analyzer.py`**

**Dependencies:**

```python
librosa==0.10.1          # Audio analysis library
parselmouth-praat==0.4.3 # Praat phonetics toolkit  
soundfile==0.12.1        # Audio I/O
```

**Features to Extract:**

**Basic Prosody:**

- Pitch (F0) - Mean, std, min, max, range
- Energy/Intensity - RMS levels
- Pitch (F0) - Mean, std, min, max, range
- Energy/Intensity - RMS levels
- Speech rate - Syllables/words per second
- Duration - Total speech time

**Advanced Prosody:**

- Jitter - Pitch variability (vocal tension)
- Shimmer - Amplitude variability

```python
# HNR Calculation
hnr = 10 * log10(harmonic_power / noise_power)
# > 20dB: Clear, healthy voice
# < 10dB: Breathiness, hoarseness
```

- HNR - Harmonics-to-noise ratio (voice quality)
- Spectral tilt - Voice breathiness/strain

**Emotional Cues:**

- Tremor detection - Emotional arousal
- Pitch variability - Excitement vs monotone
- Energy patterns - Stress indicators

#### Integration Points

- Update `listener/app/api/routes/ingest.py` to call prosody analyzer
- Return prosody data alongside transcription
- Observer stores prosody in `chat_messages.prosody_features`

---

### **Phase 3: Frontend Prosody Visualization** (1-2 hours)

#### Display Components

**In Analysis Bubble:**

```text
🎵 Voice Analysis
├─ Pitch: 180 Hz (±35 Hz) - Moderate variability
├─ Energy: ████████░░ 80% (High)
├─ Rate: 4.2 syll/sec (Normal)
└─ Quality: Good (HNR: 15 dB)
```

**Voice-Content Correlation:**

```text
⚠️ Discrepancy Detected

Voice Energy:     ████████░░ 80%
Content Arousal:  ████░░░░░░ 40%

Your voice shows more intensity than your words
suggest - there might be stronger feelings beneath
the surface.
```

---

## 🔧 Technical Specifications

### Frontend - Web Audio API

**Recording Flow:**

```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  → MediaRecorder
  → Collect audio chunks
  → Combine into Blob
  → Convert to WAV
  → Encode to base64
  → Send via WebSocket
```

**Waveform Visualization:**

```javascript
AudioContext
  → AnalyserNode
  → getByteTimeDomainData()
  → Draw on Canvas (60fps)
```

---

### Backend - Prosody Analysis

**Using librosa:**

```python
import librosa
import numpy as np

# Load audio
y, sr = librosa.load(audio_path)

# Pitch tracking
f0, voiced_flag, _ = librosa.pyin(y, fmin=50, fmax=400)
pitch_mean = np.nanmean(f0)
pitch_std = np.nanstd(f0)

# Energy
rms = librosa.feature.rms(y=y)
energy = np.mean(rms)

# Speech rate (approximate)
onset_env = librosa.onset.onset_strength(y=y, sr=sr)
tempo = librosa.beat.tempo(onset_envelope=onset_env, sr=sr)
```

**Using Parselmouth (better for voice quality):**

```python
import parselmouth

# Load audio  
snd = parselmouth.Sound(audio_path)

# Pitch
pitch = snd.to_pitch()
pitch_mean = parselmouth.praat.call(pitch, "Get mean", 0, 0, "Hertz")

# Jitter, Shimmer, HNR
point_process = parselmouth.praat.call(snd, "To PointProcess (periodic, cc)", 75, 600)
jitter = parselmouth.praat.call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)

harmonicity = snd.to_harmonicity()
hnr = parselmouth.praat.call(harmonicity, "Get mean", 0, 0)
```

---

## 🎨 User Experience Flow

### **Recording:**

1. User clicks 🎤 button
2. Browser requests microphone permission
3. Recording modal appears with waveform
4. User speaks (waveform animates)
5. User clicks "Stop & Send"
6. Audio sent for analysis

### **Analysis:**

1. "Analyzing..." spinner appears
2. Transcription arrives → shows in bubble
3. Prosody analysis arrives → shows voice metrics
4. Emotion analysis arrives → shows VAC
5. Insights arrive → shows AI interpretation + correlation

---

## 📊 Data Structures

### ProsodyData Type (TypeScript)

```typescript
interface ProsodyData {
  pitch_mean: number;      // Hz
  pitch_std: number;       // Hz
  pitch_range: [number, number]; // [min, max]
  energy: number;          // 0-1
  rate: number;            // syllables/sec
  duration: number;        // seconds
  jitter: number;          // %
  shimmer: number;         // %
  hnr: number;             // dB
  voice_quality: 'good' | 'moderate' | 'poor';
  emotional_cues: {
    tremor: boolean;
    tension: 'low' | 'medium' | 'high';
    breathiness: number;   // 0-1
  };
}
```

---

## 🚀 Deployment Checklist

### Frontend

- [ ] Install no new dependencies (Web Audio API is built-in!)
- [ ] Test microphone permissions in different browsers
- [ ] Test audio encoding (WAV format)

### Backend (Listener)

- [ ] Add librosa, parselmouth to requirements.txt
- [ ] Install dependencies in venv
- [ ] Test prosody extraction on sample audio
- [ ] Verify performance (should be <1s for 10s audio)

---

## 🎁 Future Enhancements

**Phase 4 (Optional):**

- Real-time streaming transcription (word-by-word)
- Voice emotion detection (separate from content)
- Accent/language detection
- Background noise filtering
- Voice biometrics (speaker verification)
- Emotional trajectory over recording
- Comparison with past voice samples

---

## 📖 References

**Libraries:**

- librosa: <https://librosa.org/>
- Parselmouth: <https://parselmouth.readthedocs.io/>
- Web Audio API: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API>

**Research:**

- Prosody and Emotion: Scherer (2003)
- Voice Quality Measures: Kreiman et al. (1993)
- Parselmouth/Praat: Jadoul et al. (2018)

---

## ✅ Success Criteria

After implementation:

- [ ] Users can click 🎤 and record voice
- [ ] Waveform visualizes during recording
- [ ] Audio transcribed accurately
- [ ] Prosody features extracted
- [ ] Voice characteristics displayed
- [ ] Voice-content correlation detected
- [ ] Discrepancies highlighted
- [ ] All data persisted to database

---

**Ready to implement!** Starting with Phase 1: Frontend Voice Recording.
