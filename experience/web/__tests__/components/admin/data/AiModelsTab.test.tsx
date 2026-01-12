import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AiModelsTab from "@/components/admin/data/AiModelsTab";
import { adminApi } from "@/utils/api";
import { ModelAssignment } from "@/types/admin";

// Mock the API
jest.mock("@/utils/api", () => ({
  adminApi: {
    getAiModels: jest.fn(),
    updateAiModel: jest.fn(),
  },
}));

const mockModels: ModelAssignment[] = [
  {
    function: "chat_response",
    ai_model_name: "llama3.1:8b-instruct-q4_0",
    assigned_at: "2024-01-01T00:00:00Z",
    avg_latency_ms: 150,
    total_invocations: 1200,
    last_used_at: "2024-01-01T12:00:00Z",
  },
  {
    function: "emotion_analysis",
    ai_model_name: "mistral:7b",
    assigned_at: "2024-01-01T00:00:00Z",
    avg_latency_ms: 85,
    total_invocations: 3500,
    last_used_at: "2024-01-01T12:05:00Z",
  },
];

describe("AiModelsTab", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
  });

  it("renders loading state initially", () => {
    // Return a promise that never resolves to keep it loading
    (adminApi.getAiModels as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<AiModelsTab />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading AI configuration...")).toBeInTheDocument();
  });

  it("renders models table after loading", async () => {
    render(<AiModelsTab />);

    await waitFor(() => {
      expect(screen.getByText("chat_response")).toBeInTheDocument();
      // Use getAllByText because model names might appear in options too or multiple times
      expect(screen.getAllByText("llama3.1:8b-instruct-q4_0")[0]).toBeInTheDocument();
      expect(screen.getByText("emotion_analysis")).toBeInTheDocument();
    });

    expect(screen.getByText("150ms")).toBeInTheDocument();
    expect(screen.getByText("1200")).toBeInTheDocument();
  });

  it("handles fetch error", async () => {
    (adminApi.getAiModels as jest.Mock).mockRejectedValue(new Error("Failed to load models"));
    render(<AiModelsTab />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load models")).toBeInTheDocument();
    });
  });

  it("allows editing a model assignment", async () => {
    (adminApi.updateAiModel as jest.Mock).mockResolvedValue({
      ...mockModels[0],
      ai_model_name: "phi-3:mini",
    });

    render(<AiModelsTab />);

    await waitFor(() => {
      expect(screen.getByText("chat_response")).toBeInTheDocument();
    });

    // Find the row for chat_response
    const chatRow = screen.getByText("chat_response").closest("tr");
    expect(chatRow).toBeInTheDocument();

    // Click Edit button in that row
    const editButton = within(chatRow!).getByLabelText("Edit chat_response");
    await user.click(editButton);

    // Change the selection
    // The select should have the current value "llama3.1:8b-instruct-q4_0"
    const select = within(chatRow!).getByRole("combobox");
    await user.selectOptions(select, "phi-3:mini");

    // Click Save
    const saveButton = within(chatRow!).getByLabelText("Save");
    await user.click(saveButton);

    await waitFor(() => {
      expect(adminApi.updateAiModel).toHaveBeenCalledWith("chat_response", {
        ai_model_name: "phi-3:mini",
      });
      // The local model name should update (assuming mock logic in component holds,
      // but in test we mock the response which is used to update state)
      // We mocked the update response to return phi-3:mini
      expect(within(chatRow!).getByText("phi-3:mini")).toBeInTheDocument();
    });
  });

  it("cancels editing", async () => {
    render(<AiModelsTab />);

    await waitFor(() => {
      expect(screen.getByText("chat_response")).toBeInTheDocument();
    });

    const chatRow = screen.getByText("chat_response").closest("tr");
    const editButton = within(chatRow!).getByLabelText("Edit chat_response");
    await user.click(editButton);

    // Verify select is present
    expect(within(chatRow!).getByRole("combobox")).toBeInTheDocument();

    // Click Cancel
    const cancelButton = within(chatRow!).getByLabelText("Cancel");
    await user.click(cancelButton);

    // Select should be gone, reverting to text display
    expect(within(chatRow!).queryByRole("combobox")).not.toBeInTheDocument();
  });
});
