import { Settings } from "@/components/Settings";
import { Settings as InputSettings } from "@/components/input/Settings";

describe("Settings Export", () => {
  it("exports Settings from input/Settings", () => {
    expect(Settings).toBe(InputSettings);
  });
});
