import Foundation
import Observation

/// Configuration for the Intelligence Engine
public enum InferenceMode: String, CaseIterable, Codable, Sendable {
    case onDevice // Uses MLX (Local Metal)
    case remote   // Uses External API (Python/Go/etc)
}

@available(macOS 14, iOS 17, *)
@Observable
public class InferenceSettings {
    @MainActor public static let shared = InferenceSettings()

    // Default to .remote for stability, but user can switch
    public var mode: InferenceMode = .remote {
        didSet {
            UserDefaults.standard.set(mode.rawValue, forKey: "inference_mode")
        }
    }

    public var remoteUrl: String = "http://localhost:8081/v1/completions" {
        didSet {
            UserDefaults.standard.set(remoteUrl, forKey: "inference_remote_url")
        }
    }

    private init() {
        if let savedMode = UserDefaults.standard.string(forKey: "inference_mode"),
           let loadedMode = InferenceMode(rawValue: savedMode) {
            self.mode = loadedMode
        }

        if let savedUrl = UserDefaults.standard.string(forKey: "inference_remote_url") {
            self.remoteUrl = savedUrl
        }
    }
}
