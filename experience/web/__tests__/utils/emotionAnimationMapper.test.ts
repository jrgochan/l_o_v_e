import { getEmotionAnimationParams } from "../../utils/emotionAnimationMapper";
import { Emotion } from "../../types/visualization";

describe("emotionAnimationMapper", () => {
  const mockVac: [number, number, number] = [0, 0, 0];
  const mockQuaternion: [number, number, number, number] = [0, 0, 0, 1];

  it("should use movement_pattern when provided", () => {
    const emotion: Emotion = {
      id: "1",
      name: "Test Emotion",
      category: "Any Category",
      definition: "Test definition",
      vac: mockVac,
      quaternion: mockQuaternion,
      movement_pattern: "recoil",
    };

    const params = getEmotionAnimationParams(emotion, "subtle");
    expect(params.secondaryMotion).toBe("recoil");
  });

  it("should fallback to category mapping when movement_pattern is missing", () => {
    const emotion: Emotion = {
      id: "2",
      name: "Test Emotion",
      category: "Places We Go When It's Beyond Us",
      definition: "Test definition",
      vac: mockVac,
      quaternion: mockQuaternion,
      movement_pattern: null,
    };

    const params = getEmotionAnimationParams(emotion, "subtle");
    expect(params.secondaryMotion).toBe("stable");
  });

  it("should fallback to reaching for unknown categories without movement_pattern", () => {
    const emotion: Emotion = {
      id: "3",
      name: "Test Emotion",
      category: "Unknown Category",
      definition: "Test definition",
      vac: mockVac,
      quaternion: mockQuaternion,
    };

    const params = getEmotionAnimationParams(emotion, "subtle");
    expect(params.secondaryMotion).toBe("reaching");
  });

  it("should ignore invalid movement_pattern values", () => {
    const emotion: Emotion = {
      id: "4",
      name: "Test Emotion",
      category: "Unknown Category",
      definition: "Test definition",
      vac: mockVac,
      quaternion: mockQuaternion,
      movement_pattern: "invalid_type",
    };

    const params = getEmotionAnimationParams(emotion, "subtle");
    expect(params.secondaryMotion).toBe("reaching");
  });
});
