import { render, screen, fireEvent, act } from "@testing-library/react";
import { CommandPalette } from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useCommandPaletteFilter } from "@/hooks/command-palette/useCommandPaletteFilter";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Robust Mock cmdk
jest.mock("cmdk", () => {
  const Command = ({ children, onKeyDown, ...props }: any) => (
    <div data-testid="cmd-root" onKeyDown={onKeyDown} {...props}>
      {children}
    </div>
  );
  // Separate components to avoid circular ref / memory issues in JSDOM
  const Input = ({ onValueChange, ...props }: any) => (
    <input data-testid="cmd-input" onChange={(e) => onValueChange(e.target.value)} {...props} />
  );
  const List = ({ children }: any) => <div data-testid="cmd-list">{children}</div>;

  Command.Input = Input;
  Command.List = List;
  return { Command };
});

jest.mock("@/hooks/useCommandPalette");
jest.mock("@/hooks/command-palette/useCommandPaletteFilter");
jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/stores/useExperienceStore");
jest.mock("@/components/command-palette/ActiveJourneyStatus", () => ({
  ActiveJourneyStatus: () => <div data-testid="active-journey-status" />,
}));
jest.mock("@/components/command-palette/PaletteResults", () => ({
  PaletteResults: ({
    quickActions,
    filteredEmotions,
    filteredPaths,
    onSelectEmotion,
    onSelectPath,
    onQuickAction,
  }: any) => (
    <div data-testid="palette-results">
      {quickActions?.map((qa: any) => (
        <div
          key={qa.command}
          data-testid={`qa-${qa.command}`}
          onClick={() => onQuickAction(qa.command)}
        >
          {qa.command}
        </div>
      ))}
      {filteredEmotions?.map((emotion: any) => (
        <div
          key={emotion.id}
          data-testid={`emotion-${emotion.id}`}
          onClick={() => onSelectEmotion(emotion)}
        >
          {emotion.name}
        </div>
      ))}

      <button
        data-testid="mock-emotion-select"
        onClick={() => onSelectEmotion({ id: "joy", name: "Joy" })}
      >
        Select Joy
      </button>
      <button data-testid="mock-path-select" onClick={() => onSelectPath("path-1")}>
        Select Path
      </button>
    </div>
  ),
}));
jest.mock("@/components/command-palette/PaletteHelp", () => ({
  PaletteHelp: () => <div data-testid="palette-help" />,
}));

// We strictly mock data to avoid external dependency logic leaks
jest.mock("@/data/journey-templates", () => ({
  JOURNEY_TEMPLATES: [
    { id: "calm", name: "Calm", icon: "😌", difficulty: "Easy", estimated_duration: "5m" },
  ],
}));

describe("CommandPalette", () => {
  // Use a factory to get a fresh mock object each time
  const createMockPalette = (overrides = {}) => ({
    isOpen: true,
    search: "",
    setSearch: jest.fn(),
    toggle: jest.fn(),
    close: jest.fn(),
    open: jest.fn(),
    goHome: jest.fn(),
    executeAction: jest.fn(),
    executeQuickAction: jest.fn(),
    currentPage: "home", // Default to home
    selectedCategory: null,
    viewCategory: jest.fn(),
    isFavorite: jest.fn(),
    ...overrides,
  });

  const mockFilter = {
    filteredEmotions: [],
    filteredPaths: [],
    recentEmotionsList: [],
    favoriteEmotionsList: [],
    emotionsByCategory: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    (useCommandPalette as jest.Mock).mockReturnValue(createMockPalette());
    (useCommandPaletteFilter as jest.Mock).mockReturnValue(mockFilter);
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        selectedEmotionIds: new Set(),
        setSelectedPath: jest.fn(),
        setFocusedEmotion: jest.fn(),
      })
    );
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        activeJourney: null,
        transitionPath: null,
        activeSession: null,
      })
    );
  });

  const triggerKey = (
    key: string,
    modifiers: any = {},
    eventType: "keydown" | "keyup" = "keydown"
  ) => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent(eventType, { key, ...modifiers }));
    });
  };

  it("should handle global shortcut (Meta+K)", () => {
    const palette = createMockPalette({ isOpen: false });
    (useCommandPalette as jest.Mock).mockReturnValue(palette);

    render(<CommandPalette />);
    triggerKey("k", { metaKey: true });
    expect(palette.toggle).toHaveBeenCalled();
  });

  it("should handle global shortcut (Ctrl+K)", () => {
    const palette = createMockPalette({ isOpen: false });
    (useCommandPalette as jest.Mock).mockReturnValue(palette);

    render(<CommandPalette />);
    triggerKey("k", { ctrlKey: true });
    expect(palette.toggle).toHaveBeenCalled();
  });

  it("should attach global window handlers", () => {
    render(<CommandPalette />);
    act(() => {
      window.openCommandPalette?.();
    });
    expect(window.__commandPaletteOpen).toBe(true);
  });

  it("should auto-focus input on open", () => {
    jest.useFakeTimers();
    render(<CommandPalette />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const input = screen.getByTestId("cmd-input");
    expect(input).toHaveFocus();

    jest.useRealTimers();
  });

  it("should handle Escape key (close on home)", () => {
    const palette = createMockPalette();
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />);

    fireEvent.keyDown(screen.getByTestId("cmd-root"), { key: "Escape" });
    expect(palette.close).toHaveBeenCalled();
  });

  it("should handle Escape key (goHome on category)", () => {
    const palette = createMockPalette({ currentPage: "category" });
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />);

    fireEvent.keyDown(screen.getByTestId("cmd-root"), { key: "Escape" });
    expect(palette.goHome).toHaveBeenCalled();
  });

  it("should handle Backspace key logic (goHome if search empty and not home)", () => {
    const palette = createMockPalette({ currentPage: "help", search: "" });
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />);

    fireEvent.keyDown(screen.getByTestId("cmd-root"), { key: "Backspace" });
    expect(palette.goHome).toHaveBeenCalled();
  });

  it("should NOT goHome on Backspace if search is present", () => {
    const palette = createMockPalette({ currentPage: "category", search: "Valid" });
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />);

    fireEvent.keyDown(screen.getByTestId("cmd-root"), { key: "Backspace" });
    expect(palette.goHome).not.toHaveBeenCalled();
  });

  it("should NOT goHome on Backspace if search is empty but already on home", () => {
    const palette = createMockPalette({ currentPage: "home", search: "" });
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />);

    fireEvent.keyDown(screen.getByTestId("cmd-root"), { key: "Backspace" });
    expect(palette.goHome).not.toHaveBeenCalled();
  });

  it("renders PaletteHelp when currentPage is help", () => {
    const palette = createMockPalette({ currentPage: "help" });
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />);

    expect(screen.getByTestId("palette-help")).toBeInTheDocument();
    expect(screen.queryByTestId("palette-results")).not.toBeInTheDocument();
  });

  it("renders Back button when not on home page", () => {
    const palette = createMockPalette({ currentPage: "category" });
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />);

    const backBtn = screen.getByText("← Back");
    fireEvent.click(backBtn);
    expect(palette.goHome).toHaveBeenCalled();
  });

  it("updates footer status for Paused Session", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        activeJourney: null,
        transitionPath: null,
        activeSession: { status: "paused" },
      })
    );
    render(<CommandPalette />);
    expect(screen.getByText("⏸️ Session Paused")).toBeInTheDocument();
  });

  it("handles unknown session status gracefully", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        activeJourney: null,
        transitionPath: null,
        activeSession: { status: "completed" },
      })
    );
    render(<CommandPalette />);
    expect(screen.queryByText("🟢 Session Active")).not.toBeInTheDocument();
    expect(screen.queryByText("⏸️ Session Paused")).not.toBeInTheDocument();
  });

  it("handles emotion selection actions", () => {
    const palette = createMockPalette();
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />);

    const selectBtn = screen.getByTestId("mock-emotion-select");

    // Default action (Select)
    fireEvent.click(selectBtn);
    expect(palette.executeAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "joy" }),
      "select",
      expect.objectContaining({ command: false })
    );

    // Command (Add)
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Meta", metaKey: true }));
    });
    fireEvent.click(selectBtn);
    expect(palette.executeAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "joy" }),
      "add",
      expect.objectContaining({ command: true })
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta", metaKey: false }));
    });

    // Option (Focus)
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true }));
    });
    fireEvent.click(selectBtn);
    expect(palette.executeAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "joy" }),
      "focus",
      expect.objectContaining({ option: true })
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt", altKey: false }));
    });

    // Shift (Navigate)
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", shiftKey: true }));
    });
    fireEvent.click(selectBtn);
    expect(palette.executeAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "joy" }),
      "navigate",
      expect.objectContaining({ shift: true })
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", shiftKey: false }));
    });

    // Option + Shift (Isolate)
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true }));
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Shift", shiftKey: true, altKey: true })
      );
    });
    fireEvent.click(selectBtn);
    expect(palette.executeAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "joy" }),
      "isolate",
      expect.objectContaining({ option: true, shift: true })
    );
    // Cleanup keys
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt", altKey: false }));
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", shiftKey: false }));
    });

    // Command + Shift (Toggle)
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Meta", metaKey: true }));
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Shift", shiftKey: true, metaKey: true })
      );
    });
    fireEvent.click(selectBtn);
    expect(palette.executeAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "joy" }),
      "toggle",
      expect.objectContaining({ command: true, shift: true })
    );
  });

  it("should handle Backspace key logic (goHome on category)", () => {
    const palette = createMockPalette({ currentPage: "category", search: "" });
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />);

    fireEvent.keyDown(screen.getByTestId("cmd-root"), { key: "Backspace" });
    expect(palette.goHome).toHaveBeenCalled();
  });

  it("handles path selection", () => {
    const palette = createMockPalette();
    (useCommandPalette as jest.Mock).mockReturnValue(palette);
    render(<CommandPalette />); // Re-render with potentially fresh store mock if needed

    fireEvent.click(screen.getByTestId("mock-path-select"));

    expect(palette.close).toHaveBeenCalled();
    // Indirectly verifies flow. Detailed store verification done in store tests.
  });

  it("should update modifiers and footer label on key interaction", () => {
    render(<CommandPalette />);

    // Default
    expect(screen.getByText("Select")).toBeInTheDocument();

    // Command (Add)
    triggerKey("Meta", { metaKey: true });
    expect(screen.getByText("⌘ Add")).toBeInTheDocument();
    expect(screen.getByText("Multi-select mode")).toBeInTheDocument();

    // Command + Shift (Toggle)
    triggerKey("Shift", { metaKey: true, shiftKey: true });
    expect(screen.getByText("⌘⇧ Toggle")).toBeInTheDocument();

    // Reset keys
    triggerKey("Meta", { metaKey: false }, "keyup");
    triggerKey("Shift", { shiftKey: false }, "keyup");

    // Option
    triggerKey("Alt", { altKey: true });
    expect(screen.getByText("⌥ Focus")).toBeInTheDocument();
    expect(screen.getByText("Focus mode")).toBeInTheDocument();

    // Option + Shift (Isolate)
    triggerKey("Shift", { altKey: true, shiftKey: true });
    expect(screen.getByText("⌥⇧ Isolate")).toBeInTheDocument();

    // Shift (Navigate)
    triggerKey("Alt", { altKey: false }, "keyup");
    triggerKey("Shift", { shiftKey: true });
    expect(screen.getByText("⇧ Navigate")).toBeInTheDocument();
    expect(screen.getByText("Navigate mode")).toBeInTheDocument();
  });

  it("should render dynamic journey quick actions", () => {
    // 1. Initial State (No path)
    const { rerender } = render(<CommandPalette />);
    expect(screen.getByTestId("qa-/journey start")).toBeInTheDocument();

    // 2. Path available, no journey
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        activeJourney: null,
        transitionPath: { id: "p1" },
        activeSession: null,
      })
    );
    rerender(<CommandPalette />);
    expect(screen.getByTestId("qa-/journey start")).toBeInTheDocument();

    // 3. Journey In Progress
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        activeJourney: { status: "in_progress" },
        transitionPath: { id: "p1" },
        activeSession: null,
      })
    );
    rerender(<CommandPalette />);
    expect(screen.getByTestId("qa-/journey pause")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/journey complete")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/journey abandon")).toBeInTheDocument();

    // Check Waypoint commands (activeJourney && transitionPath)
    expect(screen.getByTestId("qa-/next")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/previous")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/waypoint list")).toBeInTheDocument();

    // 4. Journey Paused
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        activeJourney: { status: "paused" },
        transitionPath: { id: "p1" },
        activeSession: null,
      })
    );
    rerender(<CommandPalette />);
    expect(screen.getByTestId("qa-/journey resume")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/journey abandon")).toBeInTheDocument();
  });

  it("should render dynamic session quick actions", () => {
    // 1. No Session
    const { rerender } = render(<CommandPalette />);
    expect(screen.getByTestId("qa-/session start")).toBeInTheDocument();

    // 2. Active Session
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        activeJourney: null,
        transitionPath: null,
        activeSession: { status: "active" },
      })
    );
    rerender(<CommandPalette />);
    expect(screen.getByTestId("qa-/session pause")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/session end")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/session notes")).toBeInTheDocument();
    expect(screen.getByText("🟢 Session Active")).toBeInTheDocument();

    // 3. Paused Session
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        activeJourney: null,
        transitionPath: null,
        activeSession: { status: "paused" },
      })
    );
    rerender(<CommandPalette />);
    expect(screen.getByTestId("qa-/session resume")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/session end")).toBeInTheDocument();
    expect(screen.getByText("⏸️ Session Paused")).toBeInTheDocument();
  });

  it("should show correct filter label based on search prefix", () => {
    (useCommandPalette as jest.Mock).mockReturnValue(
      createMockPalette({
        search: "~Joy",
      })
    );
    const { unmount: unmount1 } = render(<CommandPalette />);
    expect(screen.getByText("Similarity")).toBeInTheDocument();
    unmount1();

    (useCommandPalette as jest.Mock).mockReturnValue(
      createMockPalette({
        search: "!Joy",
      })
    );
    const { unmount: unmount2 } = render(<CommandPalette />);
    expect(screen.getByText("Opposite")).toBeInTheDocument();
    unmount2();

    // Category >
    (useCommandPalette as jest.Mock).mockReturnValue(
      createMockPalette({
        search: ">Data",
      })
    );
    const { unmount: unmount3 } = render(<CommandPalette />);
    expect(screen.getByText("Category")).toBeInTheDocument();
    unmount3();

    // Favorites @
    (useCommandPalette as jest.Mock).mockReturnValue(
      createMockPalette({
        search: "@MyFav",
      })
    );
    const { unmount: unmount4 } = render(<CommandPalette />);
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    unmount4();

    // VAC Filter
    (useCommandPalette as jest.Mock).mockReturnValue(
      createMockPalette({
        search: "valence > 0.5",
      })
    );
    const { unmount: unmount5 } = render(<CommandPalette />);
    expect(screen.getByText("VAC Filter")).toBeInTheDocument();
    unmount5();

    // Default Search
    (useCommandPalette as jest.Mock).mockReturnValue(
      createMockPalette({
        search: "Joy",
      })
    );
    const { unmount: unmount6 } = render(<CommandPalette />);
    expect(screen.getByText("Search")).toBeInTheDocument();
    unmount6();
  });

  it("should render template actions", () => {
    render(<CommandPalette />);
    expect(screen.getByTestId("qa-/template list")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/template calm")).toBeInTheDocument();
  });
});
