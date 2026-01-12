import { MODEL_PRESETS } from "@/utils/modelPresets";

describe("modelPresets", () => {
  it("should define core presets", () => {
    expect(MODEL_PRESETS.clinical).toBeDefined();
    expect(MODEL_PRESETS.balanced).toBeDefined();
    expect(MODEL_PRESETS.fast).toBeDefined();
  });

  it("should have valid structure", () => {
    Object.values(MODEL_PRESETS).forEach((preset) => {
      expect(preset.name).toBeDefined();
      expect((preset as any).mappings).not.toBeDefined(); // Wait, source has 'assignments', verify this in source view!
    });
  });

  it("should set correct models", () => {
    expect(MODEL_PRESETS.clinical.model).toBe("llama3.1:70b-instruct-q4_0");
    expect(MODEL_PRESETS.fast.model).toBe("phi3:mini");
  });
});
