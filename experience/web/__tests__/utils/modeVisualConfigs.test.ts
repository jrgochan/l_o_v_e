import * as THREE from "three";
import {
  SUBTLE_MODE_CONFIG,
  DYNAMIC_MODE_CONFIG,
  MYSTICAL_MODE_CONFIG,
  getModeConfig,
  applyColorConfig,
  calculateEmissiveIntensity,
  type ColorConfig,
} from "@/utils/modeVisualConfigs";

describe("modeVisualConfigs", () => {
  describe("getModeConfig", () => {
    it("should return correct config for each mode", () => {
      expect(getModeConfig("subtle")).toEqual(SUBTLE_MODE_CONFIG);
      expect(getModeConfig("dynamic")).toEqual(DYNAMIC_MODE_CONFIG);
      expect(getModeConfig("mystical")).toEqual(MYSTICAL_MODE_CONFIG);
    });
  });

  describe("applyColorConfig", () => {
    const baseColor = new THREE.Color("#E11D48"); // Rose
    const config: ColorConfig = {
      saturationMultiplier: 1.0,
      luminosityMultiplier: 1.0,
      useGradients: false,
      valenceTempShift: 0,
      arousalBrightnessRange: [1, 1],
    };

    it("should return a new color instance", () => {
      const result = applyColorConfig(baseColor, config, 0, 0);
      expect(result).not.toBe(baseColor);
      // Floating point HSL conversions might make it not perfectly equal
      expect(result.r).toBeCloseTo(baseColor.r);
      expect(result.g).toBeCloseTo(baseColor.g);
      expect(result.b).toBeCloseTo(baseColor.b);
    });

    it("should apply saturation multiplier", () => {
      const lowSatConfig = { ...config, saturationMultiplier: 0.5 };
      const result = applyColorConfig(baseColor, lowSatConfig, 0, 0);

      const baseHsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(baseHsl);
      const resultHsl = { h: 0, s: 0, l: 0 };
      result.getHSL(resultHsl);
      expect(resultHsl.s).toBeCloseTo(baseHsl.s * 0.5);
    });

    it("should apply valence shift", () => {
      const shiftConfig = { ...config, valenceTempShift: 1.0 };
      const result = applyColorConfig(baseColor, shiftConfig, 1.0, 0); // High positive valence

      // Valence temperature shift was removed to preserve dataset color identity
      // So the color should remain close to the base color
      expect(result.r).toBeCloseTo(baseColor.r);
      expect(result.g).toBeCloseTo(baseColor.g);
      expect(result.b).toBeCloseTo(baseColor.b);
    });
  });

  describe("calculateEmissiveIntensity", () => {
    const config = {
      metalness: 0,
      roughness: 0,
      emissiveIntensityBase: 0,
      emissiveIntensityRange: [1.0, 2.0] as [number, number],
      transparent: false,
      opacityBase: 1,
      fresnelStrength: 0,
    };

    it("should interpolate based on connection", () => {
      // connection -1 -> Factor 0 -> min (1.0)
      expect(calculateEmissiveIntensity(config, -1)).toBe(1.0);
      // connection 1 -> Factor 1 -> max (2.0)
      expect(calculateEmissiveIntensity(config, 1)).toBe(2.0);
      // connection 0 -> Factor 0.5 -> mid (1.5)
      expect(calculateEmissiveIntensity(config, 0)).toBe(1.5);
    });

    it("should apply glow pulse", () => {
      expect(calculateEmissiveIntensity(config, 0, 2.0)).toBe(3.0); // 1.5 * 2.0
    });
  });
});
