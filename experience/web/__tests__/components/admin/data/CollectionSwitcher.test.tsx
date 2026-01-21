
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { CollectionSwitcher } from "@/components/admin/data/CollectionSwitcher";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { atlasService } from "@/services/atlasService";
import { reloadPage } from "@/utils/browser";

// Mocks
jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/services/atlasService");
jest.mock("@/utils/browser");

describe("CollectionSwitcher", () => {
    const mockSetCollections = jest.fn();
    const mockSetActiveCollection = jest.fn();

    // Mock data
    const mockCollections = [
        { id: "c1", name: "Default Atlas", is_default: true, description: "System Default" },
        { id: "c2", name: "Custom Set", is_default: false, description: "User Created" }
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Default store state
        (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue({
            collections: mockCollections,
            setCollections: mockSetCollections,
            activeCollectionId: "c1",
            setActiveCollection: mockSetActiveCollection,
        });

        // Default service behavior
        (atlasService.getCollections as jest.Mock).mockResolvedValue({ collections: mockCollections });
        (atlasService.activateCollection as jest.Mock).mockResolvedValue({});
    });

    it("renders loading state if collections are empty and loading", async () => {
        (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue({
            collections: [],
            setCollections: mockSetCollections,
            activeCollectionId: null,
            setActiveCollection: mockSetActiveCollection,
        });

        // Delay service response to keep valid loading state
        let resolveCollections: any;
        const collectionsPromise = new Promise(resolve => { resolveCollections = resolve; });
        (atlasService.getCollections as jest.Mock).mockReturnValue(collectionsPromise);

        render(<CollectionSwitcher />);

        expect(screen.getByText("Loading datasets...")).toBeInTheDocument();

        await act(async () => {
            resolveCollections({ collections: [] });
        });
    });

    it("loads collections on mount", async () => {
        render(<CollectionSwitcher />);

        await waitFor(() => {
            expect(atlasService.getCollections).toHaveBeenCalled();
            expect(mockSetCollections).toHaveBeenCalledWith(mockCollections);
        });
    });

    it("sets default collection active if found", async () => {
        render(<CollectionSwitcher />);

        await waitFor(() => {
            expect(mockSetActiveCollection).toHaveBeenCalledWith("c1");
        });
    });

    it("renders collection list correctly", async () => {
        render(<CollectionSwitcher />);

        await waitFor(() => {
            expect(screen.getByText("Default Atlas")).toBeInTheDocument();
            expect(screen.getByText("Custom Set")).toBeInTheDocument();
            expect(screen.getByText("System Default")).toBeInTheDocument();
        });

        // Verify "Active" badge on default
        const activeBadge = screen.getByText("Active");
        expect(activeBadge).toBeInTheDocument();
    });

    it("handles activation click", async () => {
        render(<CollectionSwitcher />);

        // Wait for list
        await waitFor(() => screen.getByText("Custom Set"));

        // Find the select button for the non-default collection
        // The default one has "Selected" disabled button.
        // The custom one has "Select" button.
        const selectButtons = screen.getAllByText("Select");
        expect(selectButtons.length).toBe(1);

        fireEvent.click(selectButtons[0]);

        // Should show Activating state
        expect(screen.getByText("Activating...")).toBeInTheDocument();

        await waitFor(() => {
            expect(atlasService.activateCollection).toHaveBeenCalledWith("c2");
            expect(atlasService.getCollections).toHaveBeenCalledTimes(2); // Initial + Refresh
            expect(reloadPage).toHaveBeenCalled();
        });
    });

    it("handles activation error", async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (atlasService.activateCollection as jest.Mock).mockRejectedValue(new Error("Failed"));

        render(<CollectionSwitcher />);
        await waitFor(() => screen.getByText("Custom Set"));

        fireEvent.click(screen.getByText("Select"));

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith("Failed to activate collection", expect.any(Error));
        });

        // Should revert logic (loading state gone)
        expect(screen.queryByText("Activating...")).not.toBeInTheDocument();

        consoleSpy.mockRestore();
    });
    it("handles error during initial collection load", async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (atlasService.getCollections as jest.Mock).mockRejectedValue(new Error("Load Failed"));

        render(<CollectionSwitcher />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith("Failed to load collections", expect.any(Error));
        });

        consoleSpy.mockRestore();
    });
    it("renders fallback description if missing", async () => {
        const collectionsNoDesc = [
            { id: "c3", name: "No Desc", is_default: false, description: "" }
        ];
        (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue({
            collections: collectionsNoDesc,
            setCollections: mockSetCollections,
            activeCollectionId: null,
            setActiveCollection: mockSetActiveCollection,
        });
        (atlasService.getCollections as jest.Mock).mockResolvedValue({ collections: collectionsNoDesc });

        render(<CollectionSwitcher />);

        await waitFor(() => {
            expect(screen.getByText("No description provided.")).toBeInTheDocument();
        });
    });
});
