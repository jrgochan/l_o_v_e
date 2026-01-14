
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { PullModelDialog } from "@/components/admin/settings/PullModelDialog";
import { searchOllamaModels } from "@/utils/ollamaModels";

// Mock the search util
jest.mock("@/utils/ollamaModels", () => ({
  searchOllamaModels: jest.fn(),
}));

describe("PullModelDialog", () => {
  const mockOnClose = jest.fn();
  const mockOnPull = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    jest.clearAllMocks();
    (searchOllamaModels as jest.Mock).mockReturnValue([
      { name: "llama3", description: "Meta's Llama 3" },
    ]);
  });

  // Basic renders
  it("renders when open", () => {
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    expect(screen.getByText("Pull New Model")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<PullModelDialog isOpen={false} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    expect(screen.queryByText("Pull New Model")).not.toBeInTheDocument();
  });

  it("handles input and suggestions", async () => {
    jest.useFakeTimers();
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);

    // Type
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "lla" } });
    act(() => { jest.advanceTimersByTime(500); }); // Increased wait time
    await waitFor(() => expect(searchOllamaModels).toHaveBeenCalled());
    expect(screen.getByText("Meta's Llama 3")).toBeInTheDocument();

    // Select
    fireEvent.mouseDown(screen.getByText("llama3"));
    expect(screen.getByPlaceholderText(/Type to search/i)).toHaveValue("llama3");
    jest.useRealTimers();
  });

  it("shows recommendations in suggestions", async () => {
    jest.useFakeTimers();
    (searchOllamaModels as jest.Mock).mockReturnValue([
      { name: "code-model", recommended_for: ["coding"] },
    ]);
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    fireEvent.focus(screen.getByPlaceholderText(/Type to search/i));
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "code" } });
    act(() => { jest.advanceTimersByTime(500); });
    await waitFor(() => expect(screen.getByText("coding")).toBeInTheDocument());
    jest.useRealTimers();
  });

  it("handles onBlur suggestion hiding", async () => {
    jest.useFakeTimers();
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    const input = screen.getByPlaceholderText(/Type to search/i);
    fireEvent.focus(input); // Ensure suggestions open
    fireEvent.change(input, { target: { value: "lla" } });
    act(() => { jest.advanceTimersByTime(500); });
    await waitFor(() => expect(screen.getByText("llama3")).toBeInTheDocument());

    fireEvent.blur(input);
    // Should persist briefly
    expect(screen.getByText("llama3")).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(250); });
    await waitFor(() => expect(screen.queryByText("llama3")).not.toBeInTheDocument());
    jest.useRealTimers();
  });

  it("submits pull request", async () => {
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "my-model" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Download" }));
    await waitFor(() => expect(mockOnPull).toHaveBeenCalledWith("my-model"));
  });

  it("formats bytes correctly", () => {
    const progress = {
      "a": { status: "downloading", completed: 500, total: 1000, percent: 50 },
      "b": { status: "downloading", completed: 1024 * 500, total: 1024 * 1000, percent: 50 },
    };
    const { rerender } = render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={progress as any} localModels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "a" } });
    expect(screen.getByText(/500 B/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "b" } });
    expect(screen.getByText(/500.0 KB/)).toBeInTheDocument();
  });

  it("handles status types", () => {
    const progress = { "m": { status: "error" } };
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={progress as any} localModels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "m" } });
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("handles completely unknown status string", () => {
    // "weird-status" not in map -> fallbacks to "unknown" -> "Connecting to Ollama..."
    const progress = { "m": { status: "weird-status" } };
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={progress as any} localModels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "m" } });
    expect(screen.getByText("Connecting to Ollama...")).toBeInTheDocument();
  });

  it("shows unknown status correctly", async () => {
    const progress = { "unknown-model": { status: "unknown", total: 100, completed: 10, percent: 10 } };
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={progress as any} localModels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "unknown-model" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Download" }));

    // "unknown" status with data maps to "downloading" (line 65 of component)
    expect(screen.getByText(/Downloading/i)).toBeInTheDocument();
  });

  it("auto-closes on success", async () => {
    jest.useFakeTimers();
    const { rerender } = render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "fast" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Download" }));

    rerender(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{ "fast": { status: "success" } } as any} localModels={[]} />);

    await waitFor(() => expect(screen.getByText("Model ready!")).toBeInTheDocument());

    act(() => { jest.advanceTimersByTime(2000); });
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
    jest.useRealTimers();
  });

  it("handles already installed model flow", async () => {
    jest.useFakeTimers();
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[{ name: "llama3", size: 0, family: "" } as any]} />);

    const input = screen.getByPlaceholderText(/Type to search/i);
    fireEvent.change(input, { target: { value: "llama3" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & Install" }));

    // Should call auto close after timeout
    act(() => { jest.advanceTimersByTime(2000); });
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
    expect(mockOnPull).not.toHaveBeenCalled(); // Should assume success locally
    jest.useRealTimers();
  });

  it("formats large bytes correctly", () => {
    const progress = {
      "mb": { status: "downloading", completed: 1024 ** 2 * 5.5, total: 1024 ** 2 * 10, percent: 55 },
      "gb": { status: "downloading", completed: 1024 ** 3 * 1.5, total: 1024 ** 3 * 2, percent: 75 },
    };
    const { rerender } = render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={progress as any} localModels={[]} />);

    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "mb" } });
    expect(screen.getByText(/5.5 MB/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "gb" } });
    expect(screen.getByText(/1.50 GB/)).toBeInTheDocument();
  });
  it("shows timeout warning", async () => {
    jest.useFakeTimers();
    const progress = { "slow-model": { status: "unknown" } };
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={progress as any} localModels={[]} />);

    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "slow-model" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Download" }));

    // Verify mapped status
    await waitFor(() => expect(screen.getByText(/Checking model/i)).toBeInTheDocument());

    // Advance 6s
    act(() => { jest.advanceTimersByTime(6000); });

    await waitFor(() => expect(screen.getByText(/Taking longer than expected/)).toBeInTheDocument(), { timeout: 3000 });
    jest.useRealTimers();
  });

  it("prevents submission with empty input", async () => {
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    const submitBtn = screen.getByRole("button", { name: "Start Download" });
    expect(submitBtn).toBeDisabled();

    // Even if forced click
    fireEvent.click(submitBtn);
    expect(mockOnPull).not.toHaveBeenCalled();
  });

  it("shows warning for 70b models", async () => {
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "llama-70b" } });
    await waitFor(() => expect(screen.getByText(/70B models are very large/)).toBeInTheDocument());
  });

  it("auto-closes on server-side already_installed status", async () => {
    jest.useFakeTimers();
    const { rerender } = render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);

    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "installed-model" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Download" }));

    // Simulate server response updating status to already_installed
    rerender(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{ "installed-model": { status: "already_installed" } } as any} localModels={[]} />);

    await waitFor(() => expect(screen.getAllByText("Already Installed!").length).toBeGreaterThan(0));

    act(() => { jest.advanceTimersByTime(2000); });
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
    jest.useRealTimers();
  });

  it("does not auto-close quickly if download took a long time", async () => {
    jest.useFakeTimers();
    const { rerender } = render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "slow-success" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Download" }));

    // Advance time by 4s (simulating long download)
    act(() => { jest.advanceTimersByTime(4000); });

    // Update to success
    rerender(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{ "slow-success": { status: "success" } } as any} localModels={[]} />);

    // Should show success message
    expect(screen.getByText("Model ready!")).toBeInTheDocument();

    // Advance 2s (which would normally trigger close if it was quick success)
    act(() => { jest.advanceTimersByTime(2000); });

    // Should NOT have called close yet (logic only closes if elapsed < 3000)
    expect(mockOnClose).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("handles whitespace-only input", () => {
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={{}} localModels={[]} />);
    const input = screen.getByPlaceholderText(/Type to search/i);
    fireEvent.change(input, { target: { value: "   " } });
    const submitBtn = screen.getByRole("button", { name: "Start Download" });
    fireEvent.click(submitBtn);
    expect(mockOnPull).not.toHaveBeenCalled();
  });

  it("handles undefined status in progress", () => {
    // missing status
    const progress = { "mystery": { completed: 100 } };
    render(<PullModelDialog isOpen={true} onClose={mockOnClose} onPull={mockOnPull} pullProgress={progress as any} localModels={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: "mystery" } });
    // Should fallback to unknown -> Connecting...
    expect(screen.getByText("Connecting to Ollama...")).toBeInTheDocument();
  });
});
