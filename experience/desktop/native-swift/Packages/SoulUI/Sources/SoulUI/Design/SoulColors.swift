import SwiftUI
import SoulCore

public extension ShapeStyle where Self == Color {

    // Core emotional palette
    static var soulJoy: Color { Color(red: 0.9, green: 0.5, blue: 0.2) } // Warm Orange
    static var soulSadness: Color { Color(red: 0.1, green: 0.2, blue: 0.5) } // Deep Blue
    static var soulAnger: Color { Color(red: 0.7, green: 0.1, blue: 0.1) } // Maroon
    static var soulPeace: Color { Color(red: 0.6, green: 0.8, blue: 0.9) } // Sky Blue

    /// Dynamic color mapping based on Vibe
    /// - Valence determines Hue (Warm/Cool)
    /// - Connection determines Opacity/Radiance (Connected = Radiant/Clear, Disconnected = Dull/Opaque)
    static func forVibe(_ vibe: Vibe) -> Color {
        let baseColor: Color

        // Hue Logic (Valence)
        if vibe.valence > 0.5 {
            baseColor = .soulJoy
        } else if vibe.valence < -0.5 {
            baseColor = .soulSadness
        } else if vibe.arousal > 0.5 {
            baseColor = .soulAnger
        } else {
            baseColor = .soulPeace
        }

        // Connection Logic (Opacity/Vibrancy)
        // Connection range: -1.0 (Disconnected) to 1.0 (Connected)
        // Map -1.0 -> 0.4 opacity, 1.0 -> 1.0 opacity
        let normalizedConnection = (vibe.connection + 1.0) / 2.0 // 0.0 to 1.0
        let opacity = 0.4 + (normalizedConnection * 0.6)

        return baseColor.opacity(opacity)
    }

    // Glass Theme Tokens
    static var soulGlassBackground: Color { Color.white.opacity(0.1) }
    static var soulGlassBorder: Color { Color.white.opacity(0.2) }
    static var soulGlassShadow: Color { Color.black.opacity(0.2) }
}
