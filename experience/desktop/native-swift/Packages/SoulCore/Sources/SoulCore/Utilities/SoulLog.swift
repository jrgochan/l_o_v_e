import Foundation
import OSLog

/// Centralized logging utility for the Soul ecosystem.
/// Provides structured, categorized logging via OSLog.
public struct SoulLog {
    
    private static let subsystem = "com.soul.love"
    
    /// Logger for App Lifecycle events (Launch, Background, Termination)
    public static let app = Logger(subsystem: subsystem, category: "App")
    
    /// Logger for UI events (View lifecycle, Animations, Transitions)
    public static let ui = Logger(subsystem: subsystem, category: "UI")
    
    /// Logger for Intelligence & Logic (LLM, Inference, Pathfinding)
    public static let brain = Logger(subsystem: subsystem, category: "Brain")
    
    /// Logger for Data Persistence & Models (SwiftData, UserDefaults)
    public static let data = Logger(subsystem: subsystem, category: "Data")
    
    /// Logger for Voice Processing (STT, TTS, Audio Engine)
    public static let voice = Logger(subsystem: subsystem, category: "Voice")

    /// Logger for Biometric & Haptic Feedback
    public static let bio = Logger(subsystem: subsystem, category: "Bio")
    
    /// Logger for Metal & Performance (GPU, Render Loop)
    public static let metal = Logger(subsystem: subsystem, category: "Metal")

    /// Logger for Networking & External Services
    public static let network = Logger(subsystem: subsystem, category: "Network")
}
