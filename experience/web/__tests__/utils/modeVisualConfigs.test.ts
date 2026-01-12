import * as THREE from "three";
import {
    SUBTLE_MODE_CONFIG,
    DYNAMIC_MODE_CONFIG,
    MYSTICAL_MODE_CONFIG,
    getModeConfig,
    applyColorConfig,
    calculateEmissiveIntensity,
    type ColorConfig
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
        const baseColor = new THREE.Color("#ff0000"); // Red
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
            expect(result.equals(baseColor)).toBe(true);
        });

        it("should apply saturation multiplier", () => {
            const lowSatConfig = { ...config, saturationMultiplier: 0.5 };
            const result = applyColorConfig(baseColor, lowSatConfig, 0, 0);

            const hsl = { h: 0, s: 0, l: 0 };
            result.getHSL(hsl);
            expect(hsl.s).toBeCloseTo(0.5); // Original S=1 * 0.5
        });

        it("should apply valence shift", () => {
            const shiftConfig = { ...config, valenceTempShift: 1.0 };
            const result = applyColorConfig(baseColor, shiftConfig, 1.0, 0); // High positive valence

            // Should shift towards Orange (#FFA500)
            const orange = new THREE.Color("#FFA500");
            // Since shift is 1.0, it should be equal to orange?
            // lerp(target, valence * shift) -> lerp(orange, 1 * 1) -> orange
            expect(result.getHex()).toBe(orange.getHex());
        });
    });

    describe("calculateEmissiveIntensity", () => {
        const config = {
            metalness: 0, roughness: 0, emissiveIntensityBase: 0,
            emissiveIntensityRange: [1.0, 2.0] as [number, number],
            transparent: false, opacityBase: 1, fresnelStrength: 0
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
