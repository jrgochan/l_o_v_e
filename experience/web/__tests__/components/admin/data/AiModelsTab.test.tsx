
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AiModelsTab from "@/components/admin/data/AiModelsTab";
import { adminApi } from "@/utils/api";
import { act } from "react";

jest.mock("@/utils/api", () => ({
  adminApi: {
    getAiModels: jest.fn(),
    updateAiModel: jest.fn(),
  },
}));

describe("AiModelsTab", () => {
  const mockModels = [
    {
      function: "chat_generation",
      ai_model_name: "llama3.1:8b-instruct-q4_0",
      avg_latency_ms: 150.5,
      total_invocations: 100,
      last_used_at: "2024-01-01T12:00:00Z",
    },
    {
      function: "audio_transcription",
      ai_model_name: "whisper:base",
      avg_latency_ms: null,
      total_invocations: 0,
      last_used_at: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", async () => {
    (adminApi.getAiModels as jest.Mock).mockReturnValue(new Promise(() => { }));
    render(<AiModelsTab />);
    expect(screen.getByText("Loading AI configuration...")).toBeInTheDocument();
  });

  it("renders models table on success (with conditional formatting)", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    render(<AiModelsTab />);

    await waitFor(() => {
      expect(screen.getByText("chat_generation")).toBeInTheDocument();
    });

    // Check with latency
    expect(screen.getByText("151ms")).toBeInTheDocument(); // Math.round(150.5) -> 151
    expect(screen.getByText("100")).toBeInTheDocument();

    // Check without latency (null)
    expect(screen.getByText("audio_transcription")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    // Find the row for audio_transcription
    const audioRow = rows.find(r => r.textContent?.includes("audio_transcription"));
    expect(audioRow).toBeDefined();
    expect(within(audioRow!).getAllByText("-").length).toBeGreaterThanOrEqual(2); // Latency and LastUsed are "-"
  });

  it("handles fetch error (Error object)", async () => {
    (adminApi.getAiModels as jest.Mock).mockRejectedValue(new Error("API Error"));
    render(<AiModelsTab />);

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });

  it("handles fetch error (non-Error string)", async () => {
    (adminApi.getAiModels as jest.Mock).mockRejectedValue("String Failure");
    render(<AiModelsTab />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load AI models")).toBeInTheDocument();
    });
  });

  it("handles editing and saving a model assignment", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    (adminApi.updateAiModel as jest.Mock).mockResolvedValue({
      ...mockModels[0],
      ai_model_name: "mixtral:8x7b-instruct-v0.1"
    });

    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_generation")).toBeInTheDocument());

    const editBtn = screen.getByLabelText("Edit chat_generation");
    fireEvent.click(editBtn);

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("llama3.1:8b-instruct-q4_0");

    fireEvent.change(select, { target: { value: "mixtral:8x7b-instruct-v0.1" } });

    fireEvent.click(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(adminApi.updateAiModel).toHaveBeenCalledWith("chat_generation", {
        ai_model_name: "mixtral:8x7b-instruct-v0.1"
      });
      // The local update logic uses map
      expect(screen.getAllByText("mixtral:8x7b-instruct-v0.1")).toHaveLength(1); // One in text
    });
  });

  it("handles editing and saving failure (Error object)", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    (adminApi.updateAiModel as jest.Mock).mockRejectedValue(new Error("Update Failed"));

    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_generation")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit chat_generation"));
    fireEvent.click(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Update Failed")).toBeInTheDocument();
    });
  });

  it("handles editing and saving failure (non-Error)", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    (adminApi.updateAiModel as jest.Mock).mockRejectedValue("String Update Error");

    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_generation")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit chat_generation"));
    fireEvent.click(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Failed to update model")).toBeInTheDocument();
    });
  });

  it("handles cancel edit", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_generation")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit chat_generation"));
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Cancel"));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("handles refresh click", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_generation")).toBeInTheDocument());

    (adminApi.getAiModels as jest.Mock).mockResolvedValue([
      { ...mockModels[0], total_invocations: 101 }
    ]);

    fireEvent.click(screen.getByLabelText("Refresh Config"));

    await waitFor(() => {
      expect(screen.getByText("101")).toBeInTheDocument();
    });
  });

  it("handles save guard when editingFunction is null (unreachable UI state)", async () => {
    (adminApi.getAiModels as jest.Mock).mockResolvedValue(mockModels);
    render(<AiModelsTab />);
    await waitFor(() => expect(screen.getByText("chat_generation")).toBeInTheDocument());

    // Enter edit mode
    fireEvent.click(screen.getByLabelText("Edit chat_generation"));
    const saveBtn = screen.getByLabelText("Save");

    // Exit edit mode (set editingFunction null)
    fireEvent.click(screen.getByLabelText("Cancel"));

    // Guard check: functional update shouldn't happen if I click the stale button
    // (though in reality button is unmounted, JSDOM allows clicking detached nodes)
    fireEvent.click(saveBtn);

    expect(adminApi.updateAiModel).not.toHaveBeenCalled();
  });
});
