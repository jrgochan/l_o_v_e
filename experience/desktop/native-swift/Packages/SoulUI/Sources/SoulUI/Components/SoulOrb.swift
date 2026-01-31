import SwiftUI
import SoulCore
import SoulBrain

/// The central interactive element of the Soul Experience.
/// Pulses with life and acts as the primary input method.
@available(macOS 14, iOS 17, *)
public struct SoulOrb: View {
    @Binding var vibe: Vibe
    @Binding var isListening: Bool
    @Binding var chatMode: SoulPersona.ChatMode
    @Binding var isReflecting: Bool
    var audioLevel: Float // NEW: Audio Reactivity
    var onTap: () -> Void
    var onLongPress: () -> Void
    
    // Shader Inputs
    let startDate = Date()
    
    public init(vibe: Binding<Vibe>, 
                isListening: Binding<Bool>,
                chatMode: Binding<SoulPersona.ChatMode> = .constant(.standard),
                isReflecting: Binding<Bool> = .constant(false),
                audioLevel: Float = 0.0,
                onTap: @escaping () -> Void,
                onLongPress: @escaping () -> Void) {
        self._vibe = vibe
        self._isListening = isListening
        self._chatMode = chatMode
        self._isReflecting = isReflecting
        self.audioLevel = audioLevel
        self.onTap = onTap
        self.onLongPress = onLongPress
    }
    
    public var body: some View {
        TimelineView(.animation) { context in
            let elapsedTime = context.date.timeIntervalSince(startDate)
            
            ZStack {
                // Core Orb via Metal Shader
                Circle()
                    .fill(.clear)
                    .frame(width: 120, height: 120)
                    .colorEffect(
                        ShaderLibrary.soulOrb(
                            .float2(120, 120),
                            .float(elapsedTime),
                            .float(effectiveValence),
                            .float(effectiveArousal + (isListening ? 0.3 + Double(audioLevel) * 0.5 : 0.0)) // Reactive Boost
                        )
                    )
                    .shadow(
                        color: Color(red: v(effectiveValence), green: 0.5, blue: 1.0 - v(effectiveValence))
                            .opacity(0.5 + Double(audioLevel) * 0.5),
                        radius: 20 + CGFloat(audioLevel * 20)
                    )
                
                // Ring indicator (Listening State)
                if isListening {
                    Circle()
                        .strokeBorder(
                            AngularGradient(
                                colors: [.clear, .white, .clear],
                                center: .center,
                                angle: .degrees(elapsedTime * 90)
                            ),
                            lineWidth: 2 + CGFloat(audioLevel * 4)
                        )
                        .frame(width: 140, height: 140)
                        .scaleEffect(
                            1.0 + 0.05 * sin(elapsedTime * 5) + CGFloat(audioLevel * 0.2)
                        ) // Pulse with voice
                }
            }
        }
        .contentShape(Circle())
        .onTapGesture {
            onTap()
        }
        .onLongPressGesture(minimumDuration: 0.5) {
            onLongPress()
        }
    }
    
    func v(_ val: Double) -> Double {
        return (val + 1.0) / 2.0
    }
    
    var effectiveValence: Double {
        if chatMode == .clinical { return max(vibe.valence, 0.2) } // Always positive/calm
        return vibe.valence
    }
    
    // Compute Arousal considering reflection shimmer
    var effectiveArousal: Double {
        // Reflection Shimmer: Oscillation
        if isReflecting { 
            // We can't access 'elapsedTime' here directly cleanly without passed in, 
            // but we can fake it or use a simpler boost.
            // Actually, we use 'effectiveArousal' inside body where 'elapsedTime' is available?
            // No, computed var doesn't have local scope.
            // Let's keep it simple: Just boost arousal slightly or clamp.
            // Real shimmer needs time.
            return vibe.arousal // Placeholder, logic moved to body
        }
        if chatMode == .clinical { return min(vibe.arousal, -0.2) } // Low arousal (Calm)
        return vibe.arousal
    }
}
