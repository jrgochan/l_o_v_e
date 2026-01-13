
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatSettings } from "@/components/admin/settings/ChatSettings";
import { useSettingsStore } from "@/stores/useSettingsStore";

jest.mock("@/stores/useSettingsStore");

describe("ChatSettings", () => {
  const mockUpdateChatSetting = jest.fn();
  const defaultSettings = {
    defaultToneMode: "warm",
    defaultDeepFeeling: false,
    autoFocusEmotions: true,
    updateChatSetting: mockUpdateChatSetting,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(defaultSettings);
  });

  it("renders all sections", () => {
    render(<ChatSettings />);
    expect(screen.getByText("Default Response Style")).toBeInTheDocument();
    expect(screen.getByText("Deep Feeling Analysis")).toBeInTheDocument();
    expect(screen.getByText("Chat Behavior")).toBeInTheDocument();
  });

  it("handles tone selection", () => {
    render(<ChatSettings />);

    // Toggle: "💗 Warm" / "🔬 Clinical"
    const toggle = screen.getByLabelText("Toggle between 💗 Warm and 🔬 Clinical");
    fireEvent.click(toggle);

    // Initial is warm (false checked). Click sets to Clinical.
    expect(mockUpdateChatSetting).toHaveBeenCalledWith("defaultToneMode", "clinical");
  });

  it("handles deep feeling toggle", () => {
    render(<ChatSettings />);
    // Left: "Single Emotion", Right: "Deep Feeling (Multi)"
    const toggle = screen.getByLabelText("Toggle between Single Emotion and Deep Feeling (Multi)");
    fireEvent.click(toggle);
    expect(mockUpdateChatSetting).toHaveBeenCalledWith("defaultDeepFeeling", true);
  });

  it("handles auto focus toggle", () => {
    render(<ChatSettings />);
    // Left: "Manual Add", Right: "Auto-Focus Emotions"
    const toggle = screen.getByLabelText("Toggle between Manual Add and Auto-Focus Emotions");
    fireEvent.click(toggle);
    expect(mockUpdateChatSetting).toHaveBeenCalledWith("autoFocusEmotions", false);
  });
});
