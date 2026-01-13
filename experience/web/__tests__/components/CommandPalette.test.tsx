import { render, screen, fireEvent, act } from "@testing-library/react";
import { CommandPalette } from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useCommandPaletteFilter } from "@/hooks/command-palette/useCommandPaletteFilter";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Mock cmdk
jest.mock("cmdk", () => {
  const Input = ({ onValueChange, ...props }: any) => (
    <input data-testid="cmd-input" onChange={(e) => onValueChange(e.target.value)} {...props} />
  );
  const List = ({ children }: any) => <div data-testid="cmd-list">{children}</div>;
  const Command = ({ children, onKeyDown, ...props }: any) => (
    <div data-testid="cmd-root" onKeyDown={onKeyDown} {...props}>
      {children}
    </div>
  );
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
  PaletteResults: ({ quickActions }: any) => (
    <div data-testid="palette-results">
      {quickActions.map((qa: any) => (
        <div key={qa.command} data-testid={`qa-${qa.command}`}>
          {qa.command}
        </div>
      ))}
    </div>
  ),
}));
jest.mock("@/components/command-palette/PaletteHelp", () => ({
  PaletteHelp: () => <div data-testid="palette-help" />,
}));
jest.mock("@/data/journey-templates", () => ({
  JOURNEY_TEMPLATES: [{ id: "calm", name: "Calm", icon: "😌", difficulty: "Easy", estimated_duration: "5m" }],
}));

describe("CommandPalette", () => {
  const mockPalette = {
    isOpen: true,
    search: "",
    setSearch: jest.fn(),
    toggle: jest.fn(),
    close: jest.fn(),
    open: jest.fn(),
    goHome: jest.fn(),
    executeAction: jest.fn(),
    executeQuickAction: jest.fn(),
    currentPage: "home",
    selectedCategory: null,
    viewCategory: jest.fn(),
    isFavorite: jest.fn(),
  };

  const mockFilter = {
    filteredEmotions: [],
    filteredPaths: [],
    recentEmotionsList: [],
    favoriteEmotionsList: [],
    emotionsByCategory: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCommandPalette as jest.Mock).mockReturnValue(mockPalette);
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

  const triggerKey = (key: string, modifiers: any = {}, eventType: "keydown" | "keyup" = "keydown") => {
    fireEvent(window, new KeyboardEvent(eventType, { key, ...modifiers }));
  };

  it("should handle global shortcut (Meta+K)", () => {
    (useCommandPalette as jest.Mock).mockReturnValue({ ...mockPalette, isOpen: false });
    render(<CommandPalette />);
    triggerKey("k", { metaKey: true });
    expect(mockPalette.toggle).toHaveBeenCalled();
  });

  it("should attach global window handlers", () => {
    render(<CommandPalette />);
    act(() => {
      window.openCommandPalette?.();
    });
    expect(mockPalette.open).toHaveBeenCalled();
    expect(window.__commandPaletteOpen).toBe(true);
  });

  it("should handle Escape key (close vs goHome)", () => {
    // 1. Close when on home
    const { unmount: unmount1 } = render(<CommandPalette />);
    const root = screen.getByTestId("cmd-root");
    fireEvent.keyDown(root, { key: "Escape" });
    expect(mockPalette.close).toHaveBeenCalled();
    unmount1();

    // 2. GoHome when on category
    jest.clearAllMocks();
    (useCommandPalette as jest.Mock).mockReturnValue({ ...mockPalette, currentPage: "category" });
    render(<CommandPalette />);
    fireEvent.keyDown(screen.getByTestId("cmd-root"), { key: "Escape" });
    expect(mockPalette.goHome).toHaveBeenCalled();
  });

  it("should handle Backspace key (goHome if search empty)", () => {
    // 1. GoHome when search empty and not on home
    (useCommandPalette as jest.Mock).mockReturnValue({
      ...mockPalette,
      search: "",
      currentPage: "category",
    });
    const { unmount: unmount1 } = render(<CommandPalette />);
    const root = screen.getByTestId("cmd-root");
    fireEvent.keyDown(root, { key: "Backspace" });
    expect(mockPalette.goHome).toHaveBeenCalled();
    unmount1();

    // 2. No action if search present
    jest.clearAllMocks();
    (useCommandPalette as jest.Mock).mockReturnValue({
      ...mockPalette,
      search: "a",
      currentPage: "category",
    });
    const { unmount } = render(<CommandPalette />);
    fireEvent.keyDown(screen.getByTestId("cmd-root"), { key: "Backspace" });
    expect(mockPalette.goHome).not.toHaveBeenCalled();
    unmount();
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

    // Option (Focus)
    triggerKey("Alt", { altKey: true }); // Reset modifiers passed? No, need to simulate strict sequence or just pass new state
    // fireEvent creates new event each time.
    // We need to verify state update.

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
    // Verify description logic via text content if needed, but existence suggests logic ran

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
    const cases = [
      { search: "~Joy", expected: "Similarity" },
      { search: "!Joy", expected: "Opposite" },
      { search: ">Cat", expected: "Category" },
      { search: "@Fav", expected: "Favorites" },
      { search: "valence > 0.5", expected: "VAC Filter" },
      { search: "Normal", expected: "Search" },
    ];

    cases.forEach(({ search, expected }) => {
      (useCommandPalette as jest.Mock).mockReturnValue({
        ...mockPalette,
        search,
      });
      const { unmount } = render(<CommandPalette />);
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });

  it("should render template actions", () => {
    render(<CommandPalette />);
    expect(screen.getByTestId("qa-/template list")).toBeInTheDocument();
    expect(screen.getByTestId("qa-/template calm")).toBeInTheDocument();
  });
});
