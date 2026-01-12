import { render } from "@testing-library/react";
import { VACAxisLabels3D } from "../../components/VACAxisLabels3D";

// Mock store
const mockUseSettingsStore = jest.fn();
jest.mock("@/stores/useSettingsStore", () => ({
    useSettingsStore: (selector: any) => selector(mockUseSettingsStore())
}));

// Mock Drei Html
jest.mock("@react-three/drei", () => ({
    Html: ({ children }: any) => <div>{children}</div>
}));

describe("VACAxisLabels3D", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should render nothing when disabled", () => {
        mockUseSettingsStore.mockReturnValue({ showAxisLabels: false });
        const { container } = render(<VACAxisLabels3D />);
        expect(container).toBeEmptyDOMElement();
    });

    it("should render all 3D labels when enabled", () => {
        mockUseSettingsStore.mockReturnValue({ showAxisLabels: true });
        const { getByText } = render(<VACAxisLabels3D />);

        // Check for presence of key axes
        expect(getByText("V+")).toBeInTheDocument();
        expect(getByText("V−")).toBeInTheDocument();
        expect(getByText("A+")).toBeInTheDocument();
        expect(getByText("A−")).toBeInTheDocument();
        expect(getByText("C+")).toBeInTheDocument();
        expect(getByText("C−")).toBeInTheDocument();
    });
});
