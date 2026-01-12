export type QualityLevel = "ultra" | "high" | "medium" | "low";

/**
 * Get quality-specific settings for emotion rendering
 */
export function getQualitySettings(quality: QualityLevel) {
  const settings = {
    ultra: {
      particleDensity: 1.0,
      enableParticles: true,
      enableMultiLayer: true, // For Mystical mode
      sphereSegments: 32,
      enableShadows: true,
      enableEmotionLights: true,
      maxVisibleParticles: 2000,
      updateRate: 1, // Update every frame
    },
    high: {
      particleDensity: 0.7,
      enableParticles: true,
      enableMultiLayer: true,
      sphereSegments: 24,
      enableShadows: true,
      enableEmotionLights: true,
      maxVisibleParticles: 1000,
      updateRate: 1,
    },
    medium: {
      particleDensity: 0.5,
      enableParticles: true,
      enableMultiLayer: false, // Single layer only for Mystical
      sphereSegments: 16,
      enableShadows: false,
      enableEmotionLights: false,
      maxVisibleParticles: 500,
      updateRate: 2, // Update every other frame
    },
    low: {
      particleDensity: 0.3,
      enableParticles: false,
      enableMultiLayer: false,
      sphereSegments: 12,
      enableShadows: false,
      enableEmotionLights: false,
      maxVisibleParticles: 0,
      updateRate: 3, // Update every 3rd frame
    },
  };

  return settings[quality];
}
