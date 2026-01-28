# 05. Engineering Standards

## 1. Project Structure (The "Modular Monoloth")

We use a Workspace containing the App and local Swift Packages.

```text
LoveSoul.xcworkspace
├── LoveApp (macOS Target)
├── LoveTouch (iOS Target - Future)
├── Packages/
│   ├── SoulCore (Business Logic, Models, Sync)
│   ├── SoulUI (Design System, Views)
│   ├── SoulBrain (AI, CoreML, Vector Math)
│   └── SoulBio (HealthKit, Sensors)
```

### Why Packages?
1.  **Preview Speed**: Compiling a small package is 10x faster than the whole app.
2.  **Separation of Concerns**: `SoulCore` cannot import `SwiftUI`. Logic remains pure.
3.  **Testability**: Each package has its own lightweight test suite.

## 2. Dependency Management
**Swift Package Manager (SPM)** is the only allowed package manager. No CocoaPods. No Carthage.

### Approved 3rd Party Libs
*   `PointFree/swift-composed-architecture` (TBD - maybe too heavy, sticking to MVVM+ for simplicity first).
*   `sindresorhus/KeyboardShortcuts` (Global hotkeys).
*   `apple/swift-algorithms` (Extensions).
*   `ml-explore/mlx-swift` (AI).

Keep dependencies minimal.

## 3. Testing Strategy
1.  **Unit Tests**: `XCTest` for all `SoulCore` logic.
2.  **Snapshot Tests**: `swift-snapshot-testing` for `SoulUI` components. Ensure no visual regressions.
3.  **UI Tests**: Minimal. They are flaky. Rely on Manual QA + Snapshots.

## 4. CI/CD (Xcode Cloud)
We use Apple's native **Xcode Cloud**.
*   **Workflow**:
    1.  PR -> Run Tests (SoulCore, SoulUI).
    2.  Merge Main -> Build Archive -> Upload to TestFlight.
    3.  Release Tag -> Upload to App Store Connect.

## 5. Code Style
*   **Linter**: `SwiftLint` (strict mode).
*   **Formatter**: `SwiftFormat` (run on save).
*   **Architecture**: MVVM (Model-View-ViewModel) with Coordinators for Navigation.
    - View: SwiftUI struct.
    - ViewModel: `Given-When-Then` logic. `ObservableObject`.
    - Model: SwiftData class.
