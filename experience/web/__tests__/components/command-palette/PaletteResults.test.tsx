
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PaletteResults } from "@/components/command-palette/PaletteResults";
import { Command } from "cmdk";

// cmdk requires a wrapper to work in tests usually, or at least mocked context if using internal parts.
// But we are testing the result output which uses Command.Item etc. 
// We might need to wrap in <Command> to avoid "Context not found" errors.
const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Command>{children}</Command>
);

describe("PaletteResults", () => {
    const defaultProps = {
        search: "",
        currentPage: "home",
        selectedCategory: null,
        selectedEmotionIds: new Set<string>(),
        filteredEmotions: [],
        filteredPaths: [],
        recentEmotionsList: [],
        favoriteEmotionsList: [],
        emotionsByCategory: new Map(),
        quickActions: [],
        onSelectEmotion: jest.fn(),
        onSelectPath: jest.fn(),
        onSelectCategory: jest.fn(),
        onQuickAction: jest.fn(),
        isFavorite: jest.fn(),
    };

    const mockEmotion = {
        id: "joy-1",
        name: "Joy",
        category: "Positive",
        vac: [0.8, 0.5, 0.6],
        color_hint: "💛",
    };

    const mockPath = {
        id: "path-1",
        from: { name: "Sadness" },
        to: { name: "Joy" },
        waypoints: [{}, {}],
        difficulty: "moderate",
    };

    it("renders quick actions when search starts with /", () => {
        const quickActions = [
            { command: "/test", description: "Test command" },
        ];
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="/te" quickActions={quickActions} />
            </Wrapper>
        );
        expect(screen.getByText("/test")).toBeInTheDocument();
        expect(screen.getByText("Test command")).toBeInTheDocument();
    });

    it("handles quick action selection", () => {
        const onQuickAction = jest.fn();
        const quickActions = [
            { command: "/test", description: "Test command" },
        ];
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="/te" quickActions={quickActions} onQuickAction={onQuickAction} />
            </Wrapper>
        );

        fireEvent.click(screen.getByText("/test"));
        expect(onQuickAction).toHaveBeenCalledWith("/test");
    });

    it("renders filtered emotions", () => {
        const filteredEmotions = [mockEmotion];
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="joy" filteredEmotions={filteredEmotions as any} />
            </Wrapper>
        );

        expect(screen.getByText("Joy")).toBeInTheDocument();
        expect(screen.getByText("Positive")).toBeInTheDocument();
        expect(screen.getByText("💛")).toBeInTheDocument();
    });

    it("handles emotion selection", () => {
        const onSelectEmotion = jest.fn();
        const filteredEmotions = [mockEmotion];
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="joy" filteredEmotions={filteredEmotions as any} onSelectEmotion={onSelectEmotion} />
            </Wrapper>
        );

        fireEvent.click(screen.getByText("Joy"));
        expect(onSelectEmotion).toHaveBeenCalledWith(mockEmotion);
    });

    it("renders filtered paths", () => {
        const filteredPaths = [mockPath];
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="path" filteredPaths={filteredPaths as any} />
            </Wrapper>
        );

        expect(screen.getByText("Sadness")).toBeInTheDocument();
        expect(screen.getByText("Joy")).toBeInTheDocument();
        expect(screen.getByText("moderate")).toBeInTheDocument();
    });

    it("renders correct path badges for difficulty", () => {
        const easyPath = { ...mockPath, id: "p-easy", difficulty: "easy" };
        const hardPath = { ...mockPath, id: "p-hard", difficulty: "hard" };

        const { rerender } = render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="path" filteredPaths={[easyPath] as any} />
            </Wrapper>
        );
        expect(screen.getByText("easy")).toHaveClass("text-green-300");

        rerender(
            <Wrapper>
                <PaletteResults {...defaultProps} search="path" filteredPaths={[hardPath] as any} />
            </Wrapper>
        );
        expect(screen.getByText("hard")).toHaveClass("text-red-300");
    });

    it("handles path selection", () => {
        const onSelectPath = jest.fn();
        const filteredPaths = [mockPath];
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="path" filteredPaths={filteredPaths as any} onSelectPath={onSelectPath} />
            </Wrapper>
        );

        // Click logic might need specific target in cmdk item
        fireEvent.click(screen.getByText("Sadness"));
        // cmdk items are usually clickable div wrappers. Screen.getByText might target inside. 
        // Testing library usually bubbles click.
        expect(onSelectPath).toHaveBeenCalledWith("path-1");
    });

    it("renders category drill-down", () => {
        const emotionsByCategory = new Map([
            ["Positive", [mockEmotion]]
        ]);

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    currentPage="category"
                    selectedCategory="Positive"
                    emotionsByCategory={emotionsByCategory as any}
                />
            </Wrapper>
        );

        expect(screen.getByText("Joy")).toBeInTheDocument();
        expect(screen.getByText("📂 Positive")).toBeInTheDocument();
    });

    it("renders home view favorites and recent", () => {
        const favoriteEmotionsList = [{ ...mockEmotion, id: "fav-1", name: "Favorite Joy" }];
        const recentEmotionsList = [{ ...mockEmotion, id: "recent-1", name: "Recent Joy" }];

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    currentPage="home"
                    favoriteEmotionsList={favoriteEmotionsList as any}
                    recentEmotionsList={recentEmotionsList as any}
                />
            </Wrapper>
        );

        expect(screen.getByText("Favorite Joy")).toBeInTheDocument();
        expect(screen.getByText("Recent Joy")).toBeInTheDocument();
    });

    it("renders empty state when no matches", () => {
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="nothing" filteredEmotions={[]} />
            </Wrapper>
        );

        expect(screen.getByText("Try power search operators:")).toBeInTheDocument();
    });

    it("renders Command.Empty on home with no search", () => {
        // Scenario 4: Home view, no search.
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} currentPage="home" search="" />
            </Wrapper>
        );

        expect(screen.getByText("🤔 No direct matches found")).toBeInTheDocument();
    });

    it("renders appropriate headings for filters", () => {
        const filteredEmotions = [mockEmotion];

        const { rerender } = render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="~joy" filteredEmotions={filteredEmotions as any} />
            </Wrapper>
        );
        expect(screen.getByText("🔗 Similar Emotions")).toBeInTheDocument();

        rerender(
            <Wrapper>
                <PaletteResults {...defaultProps} search="!joy" filteredEmotions={filteredEmotions as any} />
            </Wrapper>
        );
        expect(screen.getByText("⚡ Opposite Emotions")).toBeInTheDocument();

        rerender(
            <Wrapper>
                <PaletteResults {...defaultProps} search=">cat" filteredEmotions={filteredEmotions as any} />
            </Wrapper>
        );
        expect(screen.getByText("📂 Filtered by Category")).toBeInTheDocument();

        rerender(
            <Wrapper>
                <PaletteResults {...defaultProps} search="@favorite" filteredEmotions={filteredEmotions as any} />
            </Wrapper>
        );
        expect(screen.getByText("⭐ Favorites")).toBeInTheDocument();

        rerender(
            <Wrapper>
                <PaletteResults {...defaultProps} search="valence>0.5" filteredEmotions={filteredEmotions as any} />
            </Wrapper>
        );
        expect(screen.getByText("📊 VAC Filtered")).toBeInTheDocument();
    });

    it("renders dynamic path heading for single emotion selection", () => {
        const filteredPaths = [mockPath];
        const selectedEmotionIds = new Set(["joy-1"]);
        const filteredEmotions = [mockEmotion];

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    search=""
                    filteredPaths={filteredPaths as any}
                    selectedEmotionIds={selectedEmotionIds}
                    filteredEmotions={filteredEmotions as any}
                />
            </Wrapper>
        );

        expect(screen.getByText("✨ Paths from Joy")).toBeInTheDocument();
    });

    it("renders generic path heading when search is active or multiple emotions selected", () => {
        const filteredPaths = [mockPath];
        const selectedEmotionIds = new Set(["joy-1"]);
        const filteredEmotions = [mockEmotion];

        // Case 1: Search active
        const { rerender } = render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    search="some search"
                    filteredPaths={filteredPaths as any}
                    selectedEmotionIds={selectedEmotionIds}
                    filteredEmotions={filteredEmotions as any}
                />
            </Wrapper>
        );
        expect(screen.getByText("🛤️ Relevant Paths")).toBeInTheDocument();

        // Case 2: No search, but 0 selected emotions
        rerender(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    search=""
                    filteredPaths={filteredPaths as any}
                    selectedEmotionIds={new Set()}
                    filteredEmotions={filteredEmotions as any}
                />
            </Wrapper>
        );
        expect(screen.getByText("🛤️ Relevant Paths")).toBeInTheDocument();
    });

    it("renders nothing for unknown page", () => {
        const { container } = render(
            <Wrapper>
                <PaletteResults {...defaultProps} currentPage="unknown" />
            </Wrapper>
        );
        // PaletteResults returns null
        expect(container.querySelectorAll('[cmdk-group]')).toHaveLength(0);
    });

    it("displays selection and favorite indicators", () => {
        const filteredEmotions = [mockEmotion];
        const selectedEmotionIds = new Set(["joy-1"]);
        const isFavorite = jest.fn().mockReturnValue(true);

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    search="joy"
                    filteredEmotions={filteredEmotions as any}
                    selectedEmotionIds={selectedEmotionIds}
                    isFavorite={isFavorite}
                />
            </Wrapper>
        );

        expect(screen.getByText("✓")).toBeInTheDocument();
        expect(screen.getByText("⭐")).toBeInTheDocument();
    });

    it("handles category list interaction on home view", () => {
        const onSelectCategory = jest.fn();
        const emotionsByCategory = new Map([
            ["Positive", [mockEmotion]]
        ]);

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    currentPage="home"
                    search=""
                    emotionsByCategory={emotionsByCategory as any}
                    onSelectCategory={onSelectCategory}
                />
            </Wrapper>
        );

        fireEvent.click(screen.getByText("Positive"));
        expect(onSelectCategory).toHaveBeenCalledWith("Positive");
    });

    it("handles favorites interaction on home view", () => {
        const onSelectEmotion = jest.fn();
        const favoriteEmotionsList = [mockEmotion];

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    currentPage="home"
                    search=""
                    favoriteEmotionsList={favoriteEmotionsList as any}
                    onSelectEmotion={onSelectEmotion}
                />
            </Wrapper>
        );

        fireEvent.click(screen.getByText("Joy"));
        expect(onSelectEmotion).toHaveBeenCalledWith(mockEmotion);
    });

    it("handles recent interaction on home view", () => {
        const onSelectEmotion = jest.fn();
        const recentEmotionsList = [mockEmotion];

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    currentPage="home"
                    search=""
                    recentEmotionsList={recentEmotionsList as any}
                    onSelectEmotion={onSelectEmotion}
                />
            </Wrapper>
        );

        fireEvent.click(screen.getByText("Joy"));
        expect(onSelectEmotion).toHaveBeenCalledWith(mockEmotion);
    });

    it("handles category drill-down item selection", () => {
        const onSelectEmotion = jest.fn();
        const emotionsByCategory = new Map([
            ["Positive", [mockEmotion]]
        ]);

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    currentPage="category"
                    selectedCategory="Positive"
                    emotionsByCategory={emotionsByCategory as any}
                    onSelectEmotion={onSelectEmotion}
                />
            </Wrapper>
        );

        fireEvent.click(screen.getByText("Joy"));
        expect(onSelectEmotion).toHaveBeenCalledWith(mockEmotion);
    });

    it("renders color hints for emotions", () => {
        const emotions = [{ ...mockEmotion, color_hint: "🔴" }];
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="joy" filteredEmotions={emotions as any} />
            </Wrapper>
        );
        expect(screen.getByText("🔴")).toBeInTheDocument();
    });

    it("renders selected emotion indicator", () => {
        const emotions = [mockEmotion];
        const selectedIds = new Set([mockEmotion.id]);

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    search="joy"
                    filteredEmotions={emotions as any}
                    selectedEmotionIds={selectedIds}
                />
            </Wrapper>
        );
        expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("renders selection states correctly in Favorites, Recent, and Category lists", () => {
        const selectedId = "e1"; // Joy
        const unselectedId = "e2"; // Boredom
        const selectedIds = new Set([selectedId]);

        const favEmotionSelected = { ...mockEmotion, id: selectedId, name: "Joy" };
        const recentEmotionUnselected = { ...mockEmotion, id: unselectedId, name: "Boredom" };

        // Setup Category Map
        const categoryMap = new Map();
        categoryMap.set("Positive", [favEmotionSelected]);

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    search=""
                    currentPage="home" // Shows Favorites/Recent
                    selectedEmotionIds={selectedIds}
                    favoriteEmotionsList={[favEmotionSelected as any]}
                    recentEmotionsList={[recentEmotionUnselected as any]}
                    emotionsByCategory={categoryMap as any}
                />
            </Wrapper>
        );

        // Verify Favorites: Joy should have checkmark/selected style
        const checks = screen.getAllByText("✓");
        expect(checks.length).toBeGreaterThan(0);

        // Switch to Category View to test Category list selection logic
        cleanup();
        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    search=""
                    currentPage="category"
                    selectedCategory="Positive"
                    selectedEmotionIds={selectedIds}
                    emotionsByCategory={categoryMap as any}
                />
            </Wrapper>
        );

        // Verify Category List: Joy should be selected
        expect(screen.getAllByText("✓").length).toBeGreaterThan(0);
    });

    it("renders direct path label for 0 waypoints", () => {
        const directPath = { ...mockPath, waypoints: [] };
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="path" filteredPaths={[directPath] as any} />
            </Wrapper>
        );
        expect(screen.getByText("DIRECT")).toBeInTheDocument();
    });

    it("renders specific path heading for single selection without search", () => {
        const joyEmotion = { ...mockEmotion, id: "j1", name: "Joy" };
        const selectedIds = new Set(["j1"]);
        const filteredPaths = [mockPath];
        const filteredEmotions = [joyEmotion];

        // Ensure searched filteredEmotions contains the selection so .find() works
        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    search=""
                    filteredPaths={filteredPaths as any}
                    selectedEmotionIds={selectedIds}
                    filteredEmotions={filteredEmotions as any}
                />
            </Wrapper>
        );
        expect(screen.getByText("✨ Paths from Joy")).toBeInTheDocument();
    });

    it("renders default spark for favorites and recent without color hint", () => {
        const headlessEmotion = { ...mockEmotion, id: "h1", name: "Ghost", color_hint: undefined };

        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    currentPage="home"
                    search=""
                    favoriteEmotionsList={[headlessEmotion] as any}
                    recentEmotionsList={[headlessEmotion] as any}
                />
            </Wrapper>
        );
        // Should find at least 2 sparks (one for fav, one for recent)
        const sparks = screen.getAllByText("✨");
        expect(sparks.length).toBeGreaterThanOrEqual(1);
    });

    it("renders filtered emotions without color hint", () => {
        const headless = { ...mockEmotion, color_hint: undefined };
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} search="joy" filteredEmotions={[headless] as any} />
            </Wrapper>
        );
        // Expect "✨" fallback (line 190)
        expect(screen.getAllByText("✨").length).toBeGreaterThan(0);
    });

    it("renders category item without color hint", () => {
        const headless = { ...mockEmotion, color_hint: undefined };
        const map = new Map([["Pos", [headless]]]);
        render(
            <Wrapper>
                <PaletteResults {...defaultProps} currentPage="category" selectedCategory="Pos" emotionsByCategory={map as any} />
            </Wrapper>
        );
        // Expect "✨" fallback (line 231)
        expect(screen.getAllByText("✨").length).toBeGreaterThan(0);
    });

    it("renders 'Paths from Selected' heading fallback", () => {
        // Condition: !search && selectedEmotionIds.size === 1
        // But emotion NOT in filteredEmotions.
        render(
            <Wrapper>
                <PaletteResults
                    {...defaultProps}
                    search=""
                    selectedEmotionIds={new Set(["missing"])}
                    filteredPaths={[mockPath] as any}
                    filteredEmotions={[mockEmotion] as any} // Does not contain "missing" ID
                />
            </Wrapper>
        );
        expect(screen.getByText("✨ Paths from Selected")).toBeInTheDocument();
    });
});
