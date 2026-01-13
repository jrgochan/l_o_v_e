
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PullModelDialog } from "@/components/admin/settings/PullModelDialog";
import * as ollamaUtils from "@/utils/ollamaModels";

// Mock the search util
jest.mock("@/utils/ollamaModels", () => ({
  searchOllamaModels: jest.fn(),
}));

const mockPullProgress = {
  "llama3": {
    status: "downloading",
    digest: "sha256:abc",
    total: 1000,
    completed: 500,
    percent: 50,
  }
};

const mockLocalModels = [
  { name: "existing-model", size: 100, digest: "sha256:123", modified_at: "", details: {}, parameter_size: "7b", quantization: "Q4", family: "llama" }
];

describe("PullModelDialog", () => {
  const mockOnClose = jest.fn();
  const mockOnPull = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (ollamaUtils.searchOllamaModels as jest.Mock).mockReturnValue([]);
  });

  it("does not render when isOpen is false", () => {
    render(
      <PullModelDialog
        isOpen={false}
        onClose={mockOnClose}
        onPull={mockOnPull}
        pullProgress={{}}
        localModels={[]}
      />
    );
    expect(screen.queryByText("Pull New Model")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true", () => {
    render(
      <PullModelDialog
        isOpen={true}
        onClose={mockOnClose}
        onPull={mockOnPull}
        pullProgress={{}}
        localModels={[]}
      />
    );
    expect(screen.getByText("Pull New Model")).toBeInTheDocument();
  });

  it("updates input value and shows suggestions", async () => {
    (ollamaUtils.searchOllamaModels as jest.Mock).mockReturnValue([
      { name: "llama3", description: "Meta Llama 3", size: "4.7GB" }
    ]);

    render(
      <PullModelDialog
        isOpen={true}
        onClose={mockOnClose}
        onPull={mockOnPull}
        pullProgress={{}}
        localModels={[]}
      />
    );

    const input = screen.getByPlaceholderText(/Type to search models/i);
    fireEvent.change(input, { target: { value: "lla" } });

    expect(input).toHaveValue("lla");
    // Suggestions should appear
    expect(screen.getByText("llama3")).toBeInTheDocument();
    expect(screen.getByText("Meta Llama 3")).toBeInTheDocument();
  });

  it("selects suggestion when clicked", () => {
    (ollamaUtils.searchOllamaModels as jest.Mock).mockReturnValue([
      { name: "llama3", description: "Meta Llama 3", size: "4.7GB" }
    ]);

    render(
      <PullModelDialog
        isOpen={true}
        onClose={mockOnClose}
        onPull={mockOnPull}
        pullProgress={{}}
        localModels={[]}
      />
    );

    const input = screen.getByPlaceholderText(/Type to search models/i);
    fireEvent.focus(input); // Trigger suggestions show

    const suggestion = screen.getByText("llama3");
    // Use mouseDown to bypass blur behavior in component
    fireEvent.mouseDown(suggestion);

    expect(input).toHaveValue("llama3");
  });

  it("calls onPull when form submitted", async () => {
    render(
      <PullModelDialog
        isOpen={true}
        onClose={mockOnClose}
        onPull={mockOnPull}
        pullProgress={{}}
        localModels={[]}
      />
    );

    const input = screen.getByPlaceholderText(/Type to search models/i);
    fireEvent.change(input, { target: { value: "new-model" } });

    fireEvent.click(screen.getByRole("button", { name: "Start Download" }));

    expect(mockOnPull).toHaveBeenCalledWith("new-model");
  });

  it("shows download progress", () => {
    render(
      <PullModelDialog
        isOpen={true}
        onClose={mockOnClose}
        onPull={mockOnPull}
        pullProgress={mockPullProgress}
        localModels={[]}
      />
    );

    // Simulate typing the name that matches the progress
    const input = screen.getByPlaceholderText(/Type to search models/i);
    fireEvent.change(input, { target: { value: "llama3" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Download" }));

    expect(screen.getByText("50.0%")).toBeInTheDocument();
    expect(screen.getByText("Downloading")).toBeInTheDocument();
  });

  it("handles already installed models", async () => {
    jest.useFakeTimers();
    render(
      <PullModelDialog
        isOpen={true}
        onClose={mockOnClose}
        onPull={mockOnPull}
        pullProgress={{}}
        localModels={mockLocalModels}
      />
    );

    const input = screen.getByPlaceholderText(/Type to search models/i);
    fireEvent.change(input, { target: { value: "existing-model" } });

    // Warning should appear
    expect(screen.getByText("This model is already installed")).toBeInTheDocument();

    // Verify button text changes
    const button = screen.getByRole("button", { name: "Verify & Install" });
    fireEvent.click(button);

    // Should show already installed success state
    expect(screen.getByText("Already Installed!")).toBeInTheDocument();

    // Should auto-close
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockOnClose).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
