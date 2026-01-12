import { SETTINGS_PRESETS, getPresetById, getPresetNames } from "@/utils/settingsPresets";

describe("settingsPresets", () => {
  it("should define core presets", () => {
    expect(SETTINGS_PRESETS.length).toBe(4);
    expect(getPresetById("performance")).toBeDefined();
    expect(getPresetById("clinical")).toBeDefined();
  });

  it("should parse valid JSON settings", () => {
    SETTINGS_PRESETS.forEach((preset) => {
      const parsed = JSON.parse(preset.settings);
      expect(parsed.version).toBe("1.0");
      expect(parsed.settings.visual).toBeDefined();
      expect(parsed.settings.network).toBeDefined();
    });
  });

  describe("getPresetNames", () => {
    it("should return simplified list", () => {
      const names = getPresetNames();
      expect(names.length).toBe(4);
      expect(names[0]).toHaveProperty("id");
      expect(names[0]).toHaveProperty("name");
      expect(names[0]).toHaveProperty("icon");
      expect(names[0]).not.toHaveProperty("settings");
    });
  });
});
