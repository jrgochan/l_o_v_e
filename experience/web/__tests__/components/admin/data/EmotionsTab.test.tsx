import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmotionsTab } from "@/components/admin/data/EmotionsTab";
import { adminApi } from "@/utils/api";

// Mock the API
jest.mock("@/utils/api", () => ({
  adminApi: {
    getAtlasEmotions: jest.fn(),
    updateAtlasEmotion: jest.fn(),
    exportAtlasData: jest.fn(),
    importAtlasData: jest.fn(),
  },
}));

// Mock data based on AtlasRotation (mock rotation isn't relevant here, just the emotion structure)
const mockEmotions = [
  {
    id: "1",
    name: "Joy", // Note: The interface might use emotion_name or name from backend. The component maps `emotion.emotion_name`.
    emotion_name: "Joy",
    category: "Positive",
    vac_vector: [0.8, 0.6, 0.7],
    definition: "A feeling of great pleasure and happiness.",
    description: "Joy description",
    haptic_pattern_id: "pulse_rapid",
    color_hint: "#FFFF00",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    vac: [0.8, 0.6, 0.7], // some types use vac vs vac_vector, mocking both for safety if types overlap
  },
  {
    id: "2",
    name: "Sadness",
    emotion_name: "Sadness",
    category: "Negative",
    vac_vector: [-0.6, -0.4, -0.2],
    definition: "Emotional pain associated with loss.",
    description: "Sadness description",
    haptic_pattern_id: "heavy_slow",
    color_hint: "#0000FF",
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    vac: [-0.6, -0.4, -0.2],
  },
];

describe("EmotionsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default success response
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
  });

  it("renders loading state initially", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<EmotionsTab />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders emotions table after loading", async () => {
    render(<EmotionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Joy")).toBeInTheDocument();
      expect(screen.getByText("Sadness")).toBeInTheDocument();
    });

    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
    // Check VAC vector display
    expect(screen.getByText("[0.8, 0.6, 0.7]")).toBeInTheDocument();
  });

  it("handles fetch error", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockRejectedValue(new Error("Failed fetching"));
    render(<EmotionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Failed fetching")).toBeInTheDocument();
    });
  });

  it("enters edit mode and updates emotion", async () => {
    const user = userEvent.setup();
    (adminApi.updateAtlasEmotion as jest.Mock).mockResolvedValue({
      ...mockEmotions[0],
      definition: "Updated Definition",
    });

    render(<EmotionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Joy")).toBeInTheDocument();
    });

    // Click Edit button (first row)
    const editButton = screen.getAllByRole("button", { name: "Edit" })[0];
    await user.click(editButton);

    // Edit Definition
    const definitionInput = screen.getByDisplayValue("A feeling of great pleasure and happiness.");
    await user.clear(definitionInput);
    await user.type(definitionInput, "Updated Definition");

    // Click Save
    const saveButton = screen.getByRole("button", { name: "Save" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(adminApi.updateAtlasEmotion).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          definition: "Updated Definition",
        })
      );
      expect(screen.getByText("Updated Definition")).toBeInTheDocument();
    });
  });

  it("handles export json", async () => {
    const user = userEvent.setup();
    (adminApi.exportAtlasData as jest.Mock).mockResolvedValue(mockEmotions);

    // Mock URL object
    global.URL.createObjectURL = jest.fn(() => "blob:http://localhost/mock");
    global.URL.revokeObjectURL = jest.fn();

    render(<EmotionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Joy")).toBeInTheDocument();
    });

    const exportButton = screen.getByText("Export JSON");
    await user.click(exportButton);

    expect(adminApi.exportAtlasData).toHaveBeenCalled();
  });
});
