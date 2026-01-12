import { render, screen, fireEvent } from "@testing-library/react";
import { DataVisualizationOverlay } from "@/components/admin/visualizations/DataVisualizationOverlay";

// Mock Store
const mockStore = {
    allEmotions: [
        { id: "1", name: "Joy", category: "Happiness", vac: [0.8, 0.5, 0.5], definition: "Feeling good" },
        { id: "2", name: "Sadness", category: "Sadness", vac: [-0.8, -0.2, 0.1], definition: "Feeling bad" }
    ],
    settings: {
        colorScheme: "default"
    },
    selectEmotion: jest.fn(),
    setFocusedEmotion: jest.fn()
};

jest.mock("@/stores/useAtlasAdminStore", () => ({
    useAtlasAdminStore: (selector: any) => selector(mockStore)
}));

// Mock Child Component (Critical for not rendering actual 3D spheres)
jest.mock("@/components/admin/spheres/MiniSoulSphere", () => ({
    MiniSoulSphere: ({ onClick, emotion }: any) => (
        <div data-testid="mini-sphere" onClick={onClick}>
            {emotion.name}
        </div>
    )
}));

describe("DataVisualizationOverlay", () => {
    const mockClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should render overlay with emotions", () => {
        render(<DataVisualizationOverlay onClose={mockClose} />);

        expect(screen.getByText("Data Visualization Mode")).toBeInTheDocument();

        const spheres = screen.getAllByTestId("mini-sphere");
        expect(spheres).toHaveLength(2);
        expect(spheres[0]).toHaveTextContent("Joy");
        expect(spheres[1]).toHaveTextContent("Sadness");
    });

    it("should filter by category", () => {
        render(<DataVisualizationOverlay onClose={mockClose} />);

        // Click the category button in the sidebar
        const catBtn = screen.getByRole("button", { name: /Happiness/i });
        fireEvent.click(catBtn);

        const spheres = screen.getAllByTestId("mini-sphere");
        expect(spheres).toHaveLength(1);
        expect(spheres[0]).toHaveTextContent("Joy");

        // Ensure Sadness sphere is not present (though the text might exist in the sidebar)
        expect(screen.queryByText("Sadness", { selector: '[data-testid="mini-sphere"]' })).not.toBeInTheDocument();
    });

    it("should handle emotion selection", () => {
        render(<DataVisualizationOverlay onClose={mockClose} />);

        fireEvent.click(screen.getByText("Joy"));

        expect(mockStore.selectEmotion).toHaveBeenCalledWith("1");
        expect(mockStore.setFocusedEmotion).toHaveBeenCalledWith("1");
        expect(mockClose).toHaveBeenCalled();
    });

    it("should close on button click", () => {
        render(<DataVisualizationOverlay onClose={mockClose} />);

        const closeBtn = screen.getByText(/Close/);
        fireEvent.click(closeBtn);

        expect(mockClose).toHaveBeenCalled();
    });
});
