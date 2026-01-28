# 13. Quality Assurance & Metrics

**Principles**: Zero-Knowledge Observability.  
**Tools**: MetricKit, TelemetryDeck (or similar privacy-first tool), XCTest.

## 1. MetricKit (The Health Monitor)

We use Apple's **MetricKit** to receive daily aggregate reports about the app's performance in the wild.

### 1.1. Key Metrics
*   **Launch Time**: Must stay < 400ms.
*   **Hang Rate**: The number of seconds the main thread is blocked per hour. Target: < 100ms/hr.
*   **Energy**: Battery drain foreground vs background.

### 1.2. Implementation
```swift
class AppMetricSubscriber: NSObject, MXMetricManagerSubscriber {
    func didReceive(_ payloads: [MXMetricPayload]) {
        // Send anonymized aggregate to our server/logs
    }
}
```

## 2. Privacy-First Telemetry

We need to know *how* features are used without knowing *what* the user is feeling.

### 2.1. Allowed Events (The "Dark Forest" Protocol)
*   ✅ `app_launched`
*   ✅ `vibe_logged` (Count only, NO values)
*   ✅ `journal_entry_created` (Count only, NO text)
*   ✅ `crash_occurred` (Stack trace only)

### 2.2. Forbidden Data
*   ❌ `valence_value` (Too identifying)
*   ❌ `location_data`
*   ❌ `journal_length` (Can fingerprint specific notes)

## 3. Feedback Loops

### 3.1. TestFlight Feedback
*   Encourage Beta users to take screenshots.
*   Use the native "Share Beta Feedback" sheet.

### 3.2. In-App Compass
*   A "Send Feedback" button that opens an email pre-filled with:
    - App Version
    - Build Number
    - iOS/macOS Version
    - Device Model
    - **NO** user data or logs attached by default.
