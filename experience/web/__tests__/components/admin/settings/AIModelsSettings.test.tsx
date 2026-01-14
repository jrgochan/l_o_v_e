
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AIModelsSettings } from "@/components/admin/settings/AIModelsSettings";
import { MODEL_PRESETS } from "@/utils/modelPresets";
import { useOllamaModels } from "@/hooks/useOllamaModels";
import { useModelAssignments } from "@/hooks/useModelAssignments";

// Mock hooks
jest.mock("@/hooks/useOllamaModels");
jest.mock("@/hooks/useModelAssignments");
jest.mock("@/components/admin/settings/PullModelDialog", () => ({
  PullModelDialog: ({ isOpen, onClose }: any) => isOpen ? (
    <div data-testid="pull-dialog">
      <button onClick={onClose} data-testid="close-pull-dialog">Close</button>
    </div>
  ) : null
}));
jest.mock("@/components/admin/settings/ModelCard", () => ({
  ModelCard: ({ model, onAssign, onDelete }: any) => (
    <div data-testid={`model-card-${model.name}`}>
      {model.name}
      <button onClick={() => onAssign(model.name)}>Assign</button>
      <button onClick={() => onDelete(model.name)}>Delete</button>
    </div>
  )
}));
jest.mock("@/components/admin/settings/PerformancePanel", () => ({
  PerformancePanel: () => <div data-testid="performance-panel">Performance</div>
}));
jest.mock("@/components/admin/settings/RecommendationsPanel", () => ({
  RecommendationsPanel: () => <div data-testid="recommendations-panel">Recommendations</div>
}));
jest.mock("@/components/admin/settings/ConfirmDialog", () => ({
  ConfirmDialog: ({ isOpen, title, message, onConfirm, onCancel }: any) => isOpen ? (
    <div data-testid="confirm-dialog">
      <h1>{title}</h1>
      <p>{message}</p>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ) : null
}));

describe("AIModelsSettings", () => {
  const mockCheckHealth = jest.fn().mockResolvedValue(true);
  const mockOllama = {
    localModels: [
      { name: "llama3", size: 4000000000, family: "llama" },
      { name: "mistral", size: 3000000000, family: "mistral" },
    ],
    loading: false,
    error: null,
    pulling: false,
    fetchLocalModels: jest.fn(),
    pullModel: jest.fn(),
    deleteModel: jest.fn(),
    checkOllamaHealth: mockCheckHealth,
  };

  const mockAssignments = {
    assignments: {},
    functions: [
      { name: "chat", description: "Chat function" },
      { name: "analysis", description: "Deep analysis" },
    ],
    recommendations: [],
    performance: {},
    loading: false,
    error: null,
    fetchAssignments: jest.fn(),
    assignModel: jest.fn().mockResolvedValue(true),
    fetchFunctions: jest.fn(),
    fetchRecommendations: jest.fn(),
    fetchPerformance: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckHealth.mockResolvedValue(true);
    (useOllamaModels as jest.Mock).mockReturnValue(mockOllama);
    (useModelAssignments as jest.Mock).mockReturnValue(mockAssignments);
  });

  it("renders loading state", async () => {
    (useOllamaModels as jest.Mock).mockReturnValue({
      ...mockOllama,
      loading: true,
      // We ensure health check resolves true so it enters loading block
      checkOllamaHealth: jest.fn().mockResolvedValue(true)
    });
    render(<AIModelsSettings />);
    // Initial render might show "Not Running" (false state) -> then updates to true -> then shows "Loading"
    // So we wait for Loading.
    // Use regex to be robust
    expect(await screen.findByText(/Loading/i)).toBeInTheDocument();
  });

  it("renders offline state if health check fails", async () => {
    // Override just for this test
    const failCheck = jest.fn().mockResolvedValue(false);
    (useOllamaModels as jest.Mock).mockReturnValue({
      ...mockOllama,
      checkOllamaHealth: failCheck,
    });

    render(<AIModelsSettings />);

    await waitFor(() => {
      expect(screen.getByText(/Ollama Not Running/i)).toBeInTheDocument();
    });
  });

  it("renders model list when healthy", async () => {
    render(<AIModelsSettings />);
    await waitFor(() => expect(screen.getByText(/Local Models/i)).toBeInTheDocument());
  });

  it("switches tabs", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    fireEvent.click(screen.getByText("Performance"));
    expect(screen.getByTestId("performance-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Recommendations"));
    expect(screen.getByTestId("recommendations-panel")).toBeInTheDocument();
  });

  it("handles pull dialog close via prop", async () => {
    render(<AIModelsSettings />);

    // Wait for health check to pass and main view to render
    await screen.findByText(/Local Models/i);

    // "Pull New Model" button
    fireEvent.click(screen.getByText("Pull New Model"));
    expect(screen.getByTestId("pull-dialog")).toBeInTheDocument();

    // Close it
    fireEvent.click(screen.getByTestId("close-pull-dialog"));

    await waitFor(() => {
      expect(screen.queryByTestId("pull-dialog")).not.toBeInTheDocument();
    });
  });

  it("handles model deletion flow", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const deleteBtn = screen.getByTestId("model-card-llama3").querySelector("button:last-child");
    fireEvent.click(deleteBtn!);
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm"));
    expect(mockOllama.deleteModel).toHaveBeenCalledWith("llama3");
  });

  it("handles assignment flow", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const assignBtn = screen.getAllByText("Assign")[0];
    fireEvent.click(assignBtn);
    fireEvent.click(screen.getByText("CHAT"));
    await waitFor(() => expect(mockAssignments.assignModel).toHaveBeenCalledWith("chat", "llama3"));
  });

  it("handles assign dialog cancellation", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);

    const assignBtn = screen.getAllByText("Assign")[0];
    fireEvent.click(assignBtn);

    expect(screen.getByTestId("assign-dialog")).toBeInTheDocument();

    const cancelBtn = screen.getByText("Cancel", { selector: "button" });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("assign-dialog")).not.toBeInTheDocument();
    });
  });

  it("filters models by search query", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const searchInput = screen.getByPlaceholderText(/Search models/i);
    fireEvent.change(searchInput, { target: { value: "llama" } });
    expect(screen.getByTestId("model-card-llama3")).toBeInTheDocument();
    expect(screen.queryByTestId("model-card-mistral")).not.toBeInTheDocument();
  });

  it("filters models by family", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const mistralBtn = screen.getByText("mistral", { selector: 'button' });
    fireEvent.click(mistralBtn);
    expect(screen.getByTestId("model-card-mistral")).toBeInTheDocument();
    expect(screen.queryByTestId("model-card-llama3")).not.toBeInTheDocument();
  });

  it("applies presets correctly", async () => {
    mockAssignments.assignModel.mockResolvedValue(true);
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const balancedBtn = screen.getByText("Balanced");
    fireEvent.click(balancedBtn);
    await waitFor(() => {
      const notification = screen.queryByText(/Applied|not installed/);
      expect(notification).toBeInTheDocument();
    });
  });

  it("retries health check when clicking retry button", async () => {
    // Explicit sequence: False (initially), True (after retry)
    const checkMock = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    (useOllamaModels as jest.Mock).mockReturnValue({
      ...mockOllama,
      checkOllamaHealth: checkMock,
    });

    render(<AIModelsSettings />);

    await waitFor(() => {
      expect(screen.getByText(/Ollama Not Running/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByText("Retry Connection");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockOllama.fetchLocalModels).toHaveBeenCalled();
      expect(mockAssignments.fetchAssignments).toHaveBeenCalled();
    });
  });

  it("handles bulk assignment success", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const assignButtons = screen.getAllByText("Assign");
    fireEvent.click(assignButtons[0]);
    const bulkBtn = screen.getByText(/ASSIGN TO ALL FUNCTIONS/);
    fireEvent.click(bulkBtn);
    await waitFor(() => expect(mockAssignments.assignModel).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/Assigned to 2 functions/)).toBeInTheDocument();
  });

  it("handles preset partial failure", async () => {
    mockAssignments.assignModel
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const assignButtons = screen.getAllByText("Assign");
    fireEvent.click(assignButtons[0]);
    const bulkBtn = screen.getByText(/ASSIGN TO ALL FUNCTIONS/);
    fireEvent.click(bulkBtn);
    await waitFor(() => expect(screen.getByText(/Assigned to 1 function/)).toBeInTheDocument());
  });

  it("shows warning variant for delete confirmation when model is in use", async () => {
    (useModelAssignments as jest.Mock).mockReturnValue({
      ...mockAssignments,
      assignments: { "chat": "llama3" }
    });
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const card = screen.getByTestId("model-card-llama3");
    fireEvent.click(card.querySelector("button:last-child")!);
    await waitFor(() => expect(screen.getByText(/currently assigned to 1 function/)).toBeInTheDocument());
  });

  it("shows danger variant for delete confirmation when unused", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const card = screen.getByTestId("model-card-llama3");
    fireEvent.click(card.querySelector("button:last-child")!);
    await waitFor(() => expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument());
  });

  it("shows empty state when no models installed", async () => {
    (useOllamaModels as jest.Mock).mockReturnValue({
      ...mockOllama,
      localModels: [] // Override for this test
    });
    render(<AIModelsSettings />);
    await waitFor(() => expect(screen.getByText(/No models installed yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText("Pull Your First Model"));
    expect(screen.getByTestId("pull-dialog")).toBeInTheDocument();
  });

  it("shows no results state when search matches nothing", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const searchInput = screen.getByPlaceholderText(/Search models/i);
    fireEvent.change(searchInput, { target: { value: "xyz-non-existent" } });
    expect(screen.getByText(/No models match your search/i)).toBeInTheDocument();

    // Clear filters
    fireEvent.click(screen.getByText("Clear filters"));
    expect(searchInput).toHaveValue("");
    expect(screen.getByTestId("model-card-llama3")).toBeInTheDocument();
  });

  it("handles cancel delete dialog", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const deleteBtn = screen.getByTestId("model-card-llama3").querySelector("button:last-child");
    fireEvent.click(deleteBtn!);
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument());
    expect(mockOllama.deleteModel).not.toHaveBeenCalled();
  });

  it("handles tab navigation", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);

    fireEvent.click(screen.getByText("Performance"));
    expect(screen.getByText("Function Performance Metrics")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Recommendations"));
    expect(screen.getByText(/Smart Recommendations/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Models \(/));
    expect(screen.getByText(/Local Models/)).toBeInTheDocument();
  });

  it("handles assignment failure", async () => {
    mockAssignments.assignModel.mockResolvedValue(false);
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);

    const assignButtons = screen.getAllByText("Assign");
    fireEvent.click(assignButtons[0]);
    fireEvent.click(screen.getByText(/ASSIGN TO ALL FUNCTIONS/));

    await waitFor(() => {
      expect(screen.getByText(/Assigned to 0/)).toBeInTheDocument();
    });
  });

  it("handles filter clearing explicitly", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    const searchInput = screen.getByPlaceholderText(/Search models/i);
    fireEvent.change(searchInput, { target: { value: "xyz" } });
    fireEvent.click(screen.getByText("Clear filters"));
    expect(searchInput).toHaveValue("");
  });

  it("applies preset assignments", async () => {
    // Temporarily modify preset to use an existing model (llama3)
    const originalModel = MODEL_PRESETS.balanced.model;
    MODEL_PRESETS.balanced.model = "llama3";

    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);
    mockAssignments.assignModel.mockResolvedValue(true);

    fireEvent.click(screen.getByText("Balanced"));
    await waitFor(() => expect(screen.getByText(/Applied Balanced preset/)).toBeInTheDocument());
    expect(mockAssignments.assignModel).toHaveBeenCalled();

    // Restore
    MODEL_PRESETS.balanced.model = originalModel;
  });

  it("handles family filtering", async () => {
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);

    // Click 'mistral' filter
    const mistralBtn = screen.getByRole("button", { name: "mistral" });
    fireEvent.click(mistralBtn);

    // Check filtered state (implementation detail: maybe 'llama3' is hidden?)
    // But we just want to cover the 'All' button click (setFamilyFilter(null))

    // Click 'All' filter
    const allBtn = screen.getByRole("button", { name: "All" });
    fireEvent.click(allBtn);

    expect(screen.getByTestId("model-card-llama3")).toBeInTheDocument();
  });

  it("handles single assignment failure", async () => {
    mockAssignments.assignModel.mockResolvedValue(false);
    render(<AIModelsSettings />);
    await screen.findByText(/Local Models/i);

    const assignButtons = screen.getAllByText("Assign");
    fireEvent.click(assignButtons[0]);

    // Click specific function (assuming dialog lists them as buttons/clickable)
    // Based on previous tests, functions list items.
    fireEvent.click(screen.getByRole("button", { name: /chat/i }));

    await waitFor(() => expect(screen.getByText(/Failed to assign model/)).toBeInTheDocument());
  });
});
