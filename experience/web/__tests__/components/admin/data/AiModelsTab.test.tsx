
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AiModelsTab from "@/components/admin/data/AiModelsTab";
import { adminApi } from "@/utils/api";

jest.mock("@/utils/api", () => ({
  adminApi: {
    getAiModels: jest.fn(),
    updateAiModel: jest.fn(),
  },
}));

describe("AiModelsTab", () => {
  const mockModels = [
    {
      function: "chat_completion",
      ai_model_name: "llama3",
      avg_latency_ms: 150,
      total_invocations: 100,
      last_used_at: "2024-01-01T12:00:00Z"
    },
    {
      function: "embedding",
      ai_model_name: "nomic-embed",
      avg_latency_ms: 50,
      total_invocations: 500,
      last_used_at: null
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", async () => {
    (adminApi.getAiModels as jest.Mock).mockReturnValue(new Promise(() => { }));
    render(<AiModelsTab />);
    expect(screen.getByText("Loading AI configuration...")).toBeInTheDocument();
  });

  it("renders models table on success", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    render(<AiModelsTab />);

    await waitFor(() => {
      expect(screen.getByText("chat_completion")).toBeInTheDocument();
    });

    expect(screen.getByText("llama3")).toBeInTheDocument();
    expect(screen.getByText("150ms")).toBeInTheDocument();
    expect(screen.getByText("nomic-embed")).toBeInTheDocument();
    // Verify last used formatting
    expect(screen.getByText(new Date("2024-01-01T12:00:00Z").toLocaleTimeString())).toBeInTheDocument();
  });

  it("handles fetch error", async () => {
    (adminApi.getAiModels as jest.Mock).mockRejectedValue(new Error("Fetch failed"));
    render(<AiModelsTab />);
    await waitFor(() => {
      expect(screen.getByText("Fetch failed")).toBeInTheDocument();
    });
  });

  it("handles editing a model assignment", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    (adminApi.updateAiModel as jest.Mock).mockResolvedValue({
      ...mockModels[0],
      ai_model_name: "llama3.1:8b-instruct-q4_0"
    });

    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_completion")).toBeInTheDocument());

    const row = screen.getByText("chat_completion").closest("tr")!;
    fireEvent.click(within(row).getByLabelText("Edit chat_completion"));

    const select = within(row).getByRole("combobox");
    fireEvent.change(select, { target: { value: "llama3.1:8b-instruct-q4_0" } });

    fireEvent.click(within(row).getByLabelText("Save"));

    await waitFor(() => {
      expect(adminApi.updateAiModel).toHaveBeenCalledWith("chat_completion", {
        ai_model_name: "llama3.1:8b-instruct-q4_0"
      });
    });

    // Check update reflected in UI (via state update from mock response)
    expect(within(row).getByText("llama3.1:8b-instruct-q4_0")).toBeInTheDocument();
  });

  it("handles cancel edit", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_completion")).toBeInTheDocument());

    const row = screen.getByText("chat_completion").closest("tr")!;
    fireEvent.click(within(row).getByLabelText("Edit chat_completion"));

    expect(within(row).getByRole("combobox")).toBeInTheDocument();

    fireEvent.click(within(row).getByLabelText("Cancel"));

    expect(within(row).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(row).getByText("llama3")).toBeInTheDocument();
  });

  it("handles save error", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    (adminApi.updateAiModel as jest.Mock).mockRejectedValue(new Error("Update failed"));

    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_completion")).toBeInTheDocument());

    const row = screen.getByText("chat_completion").closest("tr")!;
    fireEvent.click(within(row).getByLabelText("Edit chat_completion"));
    fireEvent.click(within(row).getByLabelText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  it("handles refresh click", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_completion")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Refresh Config"));

    expect(adminApi.getAiModels).toHaveBeenCalledTimes(2); // initial + refresh
  });
});
