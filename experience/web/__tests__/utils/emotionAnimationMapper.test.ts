import {
  getEmotionAnimationParams,
  getEmotionAnimationCharacter
} from "@/utils/emotionAnimationMapper";
import { AtlasEmotion } from "@/types/atlas-admin";

describe("Emotion Animation Mapper", () => {
  const mockEmotion: AtlasEmotion = {
    id: "test-id",
    name: "Test Emotion",
    category: "Places We Go With Others",
    definition: "A test definition",
    vac: [0.5, 0.5, 0.5], // V, A, C
    quaternion: [0, 0, 0, 1]
  };

  describe("getEmotionAnimationParams", () => {
    it("calculates parameters for 'subtle' mode", () => {
      const params = getEmotionAnimationParams(mockEmotion, "subtle");
      expect(params).toBeDefined();
      expect(params.breathingRate).toBeGreaterThan(0);
      expect(params.rotationSpeed).toBeGreaterThan(0);
    });

    it("calculates parameters for 'dynamic' mode", () => {
      const params = getEmotionAnimationParams(mockEmotion, "dynamic");
      expect(params.secondaryMotion).toBe("orbital"); // Based on category
    });

    it("adjusts breathing rate based on arousal", () => {
      const lowArousal = { ...mockEmotion, vac: [0.5, -0.8, 0.5] as [number, number, number] };
      const highArousal = { ...mockEmotion, vac: [0.5, 0.8, 0.5] as [number, number, number] };

      const lowParams = getEmotionAnimationParams(lowArousal, "subtle");
      const highParams = getEmotionAnimationParams(highArousal, "subtle");

      // Higher arousal -> faster breathing (lower cycle time?)
      // Implementation: const baseBreathingRate = mapRange(arousal, -1, 1, 4.0, 1.2);
      // So high arousal (1) -> 1.2s (fast), low arousal (-1) -> 4.0s (slow)
      expect(highParams.breathingRate).toBeLessThan(lowParams.breathingRate);
    });

    it("assigns correct motion type for categories", () => {
      const stableEmotion = { ...mockEmotion, category: "When It's Beyond Us" };
      expect(getEmotionAnimationParams(stableEmotion, "subtle").secondaryMotion).toBe("stable");

      const recoilEmotion = { ...mockEmotion, category: "When We Compare" };
      expect(getEmotionAnimationParams(recoilEmotion, "subtle").secondaryMotion).toBe("recoil");

      const reachingEmotion = { ...mockEmotion, category: "Unknown Category" };
      expect(getEmotionAnimationParams(reachingEmotion, "subtle").secondaryMotion).toBe("reaching");
    });

    it("boosts glow for bridge emotions", () => {
      const bridgeEmotion = { ...mockEmotion, name: "Awe" }; // Awe is bridge
      const normalEmotion = { ...mockEmotion, name: "Test" };

      const bridgeParams = getEmotionAnimationParams(bridgeEmotion, "subtle");
      const normalParams = getEmotionAnimationParams(normalEmotion, "subtle");

      // Expected glowIntensity: isBridge ? baseGlow * 1.5 : baseGlow
      // Assuming same VAC/Connection
      expect(bridgeParams.glowIntensity).toBeGreaterThan(normalParams.glowIntensity);
    });
  });

  describe("getEmotionAnimationCharacter", () => {
    it("identifies 'Explosive & Agitated'", () => {
      const e = { ...mockEmotion, vac: [-0.5, 0.8, 0] as [number, number, number] };
      expect(getEmotionAnimationCharacter(e)).toBe("Explosive & Agitated");
    });

    it("identifies 'Expansive & Joyful'", () => {
      const e = { ...mockEmotion, vac: [0.5, 0.8, 0] as [number, number, number] };
      expect(getEmotionAnimationCharacter(e)).toBe("Expansive & Joyful");
    });

    it("identifies 'Peaceful & Content'", () => {
      const e = { ...mockEmotion, vac: [0.5, -0.5, 0] as [number, number, number] };
      expect(getEmotionAnimationCharacter(e)).toBe("Peaceful & Content");
    });

    it("identifies 'Heavy & Quiet'", () => {
      const e = { ...mockEmotion, vac: [-0.5, -0.5, 0] as [number, number, number] };
      expect(getEmotionAnimationCharacter(e)).toBe("Heavy & Quiet");
    });

    it("identifies 'Reaching & Connected'", () => {
      const e = { ...mockEmotion, vac: [0, 0, 0.8] as [number, number, number] };
      expect(getEmotionAnimationCharacter(e)).toBe("Reaching & Connected");
    });

    it("identifies 'Isolated & Alone'", () => {
      const e = { ...mockEmotion, vac: [0, 0, -0.8] as [number, number, number] };
      expect(getEmotionAnimationCharacter(e)).toBe("Isolated & Alone");
    });

    it("defaults to 'Balanced'", () => {
      const e = { ...mockEmotion, vac: [0, 0, 0] as [number, number, number] };
      expect(getEmotionAnimationCharacter(e)).toBe("Balanced");
    });
  });
});
