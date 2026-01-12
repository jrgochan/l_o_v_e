import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrategiesTab } from "@/components/admin/data/StrategiesTab";
import { adminApi } from "@/utils/api";

// Mock the API
jest.mock("@/utils/api", () => ({
  adminApi: {
    getStrategies: jest.fn(),
    updateStrategy: jest.fn(),
    exportStrategies: jest.fn(),
    importStrategies: jest.fn(),
  },
}));

// Mock data
const mockStrategies = [
  {
    id: "1",
    strategy_name: "Deep Breathing",
    strategy_type: "Somatic",
    description: "Slow breathing technique",
    time_required: "5 mins",
    difficulty_level: 1,
    energy_cost: 1,
    evidence_level: "meta_analysis",
    clinical_validity: 0.9,
    contraindications: "None",
    usage_count: 10,
    success_rate: 0.8,
    detailed_steps: ["Inhale", "Hold", "Exhale"],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    strategy_name: "Cognitive Reframing",
    strategy_type: "Cognitive",
    description: "Challenge negative thoughts",
    time_required: "15 mins",
    difficulty_level: 4,
    energy_cost: 3,
    evidence_level: "rct",
    clinical_validity: 0.85,
    contraindications: "Acute distress",
    usage_count: 5,
    success_rate: 0.7,
    detailed_steps: ["Identify thought", "Analyze evidence", "Reframe"],
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  },
];

describe("StrategiesTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
  });

  it("renders loading state initially", async () => {
    // Return a promise that doesn't resolve immediately to check loading state
    (adminApi.getStrategies as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<StrategiesTab />);
    expect(screen.getByRole("status")).toBeInTheDocument(); // Loader2 likely has a role or we can find by class if needed, but usually spinners use role="status" or visible text fallback
  });

  it("renders strategies table after loading", async () => {
    render(<StrategiesTab />);

    await waitFor(() => {
      expect(screen.getByText("Deep Breathing")).toBeInTheDocument();
      expect(screen.getByText("Cognitive Reframing")).toBeInTheDocument();
    });

    expect(screen.getByText("Somatic")).toBeInTheDocument();
    expect(screen.getByText("Cognitive")).toBeInTheDocument();
  });

  it("handles fetch error", async () => {
    (adminApi.getStrategies as jest.Mock).mockRejectedValue(new Error("Failed fetching"));
    render(<StrategiesTab />);

    await waitFor(() => {
      expect(screen.getByText("Failed fetching")).toBeInTheDocument();
    });
  });

  it("expands strategy details on click", async () => {
    const user = userEvent.setup();
    render(<StrategiesTab />);

    await waitFor(() => {
      expect(screen.getByText("Deep Breathing")).toBeInTheDocument();
    });

    // Find expand button using aria-label
    const expandButtons = screen.getAllByRole("button", { name: "Expand details" });
    await user.click(expandButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Detailed Steps")).toBeInTheDocument();
      expect(screen.getByText("Inhale")).toBeInTheDocument();
    });
  });

  it("enters edit mode and updates strategy", async () => {
    const user = userEvent.setup();
    (adminApi.updateStrategy as jest.Mock).mockResolvedValue({
      ...mockStrategies[0],
      description: "Updated Description",
    });

    render(<StrategiesTab />);

    await waitFor(() => {
      expect(screen.getByText("Deep Breathing")).toBeInTheDocument();
    });

    // Click Edit button
    const editButton = screen.getAllByRole("button", { name: "Edit" })[0];
    await user.click(editButton);

    // Check if inputs appear
    const descriptionInput = screen.getByDisplayValue("Slow breathing technique");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated Description");

    // Click Save
    const saveButton = screen.getByRole("button", { name: "Save" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(adminApi.updateStrategy).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          description: "Updated Description",
        })
      );
      // Should exit edit mode and show updated text (mock returns updated)
      expect(screen.getByText("Updated Description")).toBeInTheDocument();
    });
  });

  it("handles export json", async () => {
    const user = userEvent.setup();
    (adminApi.exportStrategies as jest.Mock).mockResolvedValue(mockStrategies);

    // Mock URL.createObjectURL since JSDOM doesn't implement it
    global.URL.createObjectURL = jest.fn(() => "blob:http://localhost/mock");
    global.URL.revokeObjectURL = jest.fn();

    render(<StrategiesTab />);

    await waitFor(() => {
      expect(screen.getByText("Deep Breathing")).toBeInTheDocument();
    });

    const exportButton = screen.getByText("Export JSON");
    await user.click(exportButton);

    expect(adminApi.exportStrategies).toHaveBeenCalled();
  });
});
