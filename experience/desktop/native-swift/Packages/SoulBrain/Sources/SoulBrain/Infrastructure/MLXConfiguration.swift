import Foundation
import OSLog
import SoulCore

public struct MLXConfiguration {
    public static func configure() {
        #if os(macOS)
        // Attempt to find default.metallib in the SoulBrain bundle
        var path: String?
        
        // 1. Check Bundle.module
        if let p = Bundle.module.path(forResource: "default", ofType: "metallib") {
            path = p
        } 
        // 2. Check main bundle (sometimes needed in tests)
        else if let p = Bundle.main.path(forResource: "default", ofType: "metallib") {
            path = p
        }
        // 3. Recursive search in resources (fallback)
        else if let resourcePath = Bundle.module.resourcePath {
            let enumerator = FileManager.default.enumerator(atPath: resourcePath)
            while let file = enumerator?.nextObject() as? String {
                if file.hasSuffix("default.metallib") {
                     path = resourcePath + "/" + file
                     break
                }
            }
        }

        if let validPath = path {
            SoulLog.metal.info("✅ [SoulBrain] Found default.metallib at: \(validPath)")
            
            // Try /tmp/default.metallib (file path)
            SoulLog.metal.debug("Set MLX_METAL_PATH to /tmp/default.metallib")
            setenv("MLX_METAL_PATH", "/tmp/default.metallib", 1)
            
            // Verify
            if let val = getenv("MLX_METAL_PATH") {
                let s = String(cString: val)
                SoulLog.metal.debug("🔍 [SoulBrain] Verified MLX_METAL_PATH is set to: \(s)")
            } else {
                 SoulLog.metal.warning("⚠️ [SoulBrain] getenv returned nil after setenv!")
            }
        } else {
            SoulLog.metal.error("❌ [SoulBrain] Could not find default.metallib")
        }
        #endif
    }
}
