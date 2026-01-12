import { getQualitySettings } from "@/utils/performance/quality";

describe("getQualitySettings", () => {
  it("should return correct settings for ultra", () => {
    const settings = getQualitySettings("ultra");
    expect(settings).toEqual({
      particleDensity: 1.0,
      enableParticles: true,
      enableMultiLayer: true,
      sphereSegments: 32,
      enableShadows: true,
      enableEmotionLights: true,
      maxVisibleParticles: 2000,
      updateRate: 1,
    });
  });

  it("should return correct settings for high", () => {
    const settings = getQualitySettings("high");
    expect(settings.sphereSegments).toBe(24);
    expect(settings.maxVisibleParticles).toBe(1000);
  });

  it("should return correct settings for medium", () => {
    const settings = getQualitySettings("medium");
    expect(settings.sphereSegments).toBe(16);
    expect(settings.enableShadows).toBe(false);
    expect(settings.updateRate).toBe(2);
  });

  it("should return correct settings for low", () => {
    const settings = getQualitySettings("low");
    expect(settings.sphereSegments).toBe(12);
    expect(settings.enableParticles).toBe(false);
    expect(settings.updateRate).toBe(3);
  });
});
