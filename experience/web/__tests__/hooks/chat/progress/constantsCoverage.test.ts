import {
  initializeProgressStages,
  getAdaptiveMessage,
} from "../../../../hooks/chat/progress/constants";

describe("Progress Constants Coverage", () => {
  describe("initializeProgressStages", () => {
    it("should return basic stages when deepFeeling is false", () => {
      const stages = initializeProgressStages(false);
      expect(stages).toHaveLength(4);
      expect(stages.map((s) => s.id)).toEqual(["transcription", "prosody", "emotions", "insights"]);
    });

    it("should return extended stages when deepFeeling is true", () => {
      const stages = initializeProgressStages(true);
      expect(stages).toHaveLength(6);
      expect(stages.map((s) => s.id)).toEqual([
        "transcription",
        "prosody",
        "emotions",
        "relationships",
        "aggregate",
        "insights",
      ]);
    });
  });

  describe("getAdaptiveMessage", () => {
    it("should return correct messages for deepFeeling modes", () => {
      expect(getAdaptiveMessage("emotions", "pending", "warm", true)).toContain(
        "Exploring the layers"
      );
      expect(getAdaptiveMessage("emotions", "pending", "warm", false)).toContain(
        "Identifying your emotional state"
      );
      expect(getAdaptiveMessage("emotions", "pending", "clinical", true)).toContain(
        "Executing multi-emotion"
      );
      expect(getAdaptiveMessage("emotions", "pending", "clinical", false)).toContain(
        "Running semantic"
      );
    });

    it("should return default message for unknown stage", () => {
      expect(getAdaptiveMessage("unknown_stage", "pending", "warm", true)).toBe("Processing...");
    });

    it("should return default message for unknown tone branch (if applicable, though TS prevents it)", () => {
      // Force unknown tone
      expect(getAdaptiveMessage("emotions", "pending", "rudetone" as any, false)).toBe(
        "Processing..."
      );
    });
  });
});
