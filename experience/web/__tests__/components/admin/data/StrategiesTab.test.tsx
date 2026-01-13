
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { StrategiesTab } from "@/components/admin/data/StrategiesTab";
import { adminApi } from "@/utils/api";
import userEvent from "@testing-library/user-event";

jest.mock("@/utils/api", () => ({
  adminApi: {
    getStrategies: jest.fn(),
    updateStrategy: jest.fn(),
    exportStrategies: jest.fn(),
    importStrategies: jest.fn(),
  },
}));

// Mock URL for export
global.URL.createObjectURL = jest.fn(() => "blob:test");
global.URL.revokeObjectURL = jest.fn();

describe("StrategiesTab", () => {
  const mockStrategies = [
    {
      id: "s1",
      strategy_name: "CBT Reframe",
      strategy_type: "Cognitive",
      description: "Reframe negative thoughts.",
      detailed_steps: ["Identify thought", "Challenge it"],
      time_required: "10 mins",
      difficulty_level: 3,
      evidence_level: "rct",
      contraindications: "Acute distress",
      created_at: "2024-01-01"
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", async () => {
    (adminApi.getStrategies as jest.Mock).mockReturnValue(new Promise(() => { }));
    const { container } = render(<StrategiesTab />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders strategies list on success", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    render(<StrategiesTab />);

    await waitFor(() => {
      expect(screen.getByText("CBT Reframe")).toBeInTheDocument();
    });

    expect(screen.getByText("Cognitive")).toBeInTheDocument();
    // List shows: Name, Type, Evidence, Description.
    expect(screen.getByText("rct")).toBeInTheDocument();
    expect(screen.getByText("Reframe negative thoughts.")).toBeInTheDocument();
  });

  it("handles fetch error", async () => {
    (adminApi.getStrategies as jest.Mock).mockRejectedValue(new Error("Fetch failed"));
    render(<StrategiesTab />);

    await waitFor(() => {
      expect(screen.getByText("Fetch failed")).toBeInTheDocument();
    });
  });

  it("handles expand/collapse", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    // Details hidden initially
    expect(screen.queryByText("Detailed Steps")).not.toBeInTheDocument();

    // Expand
    fireEvent.click(screen.getByLabelText("Expand details"));
    expect(screen.getByText("Detailed Steps")).toBeInTheDocument();
    expect(screen.getByText("Identify thought")).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByLabelText("Collapse details"));
    expect(screen.queryByText("Detailed Steps")).not.toBeInTheDocument();
  });

  it("handles inline edit flow", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.updateStrategy as jest.Mock).mockResolvedValue({});

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    // Click Edit
    fireEvent.click(screen.getByLabelText("Edit"));

    // Should auto-expand
    expect(screen.getByText("Detailed Steps")).toBeInTheDocument();

    // Description becomes textarea
    const descInput = screen.getByDisplayValue("Reframe negative thoughts.");
    fireEvent.change(descInput, { target: { value: "Updated desc" } });

    // Edit steps
    const steps = screen.getAllByDisplayValue(/Identify thought|Challenge it/);
    expect(steps).toHaveLength(2);
    fireEvent.change(steps[0], { target: { value: "Step 1 Modified" } });

    // Add step
    fireEvent.click(screen.getByText("Add Step"));
    const newStep = screen.getByPlaceholderText("Step 3");
    fireEvent.change(newStep, { target: { value: "Step 3" } });

    // Remove step
    fireEvent.click(screen.getAllByTitle("Remove step")[1]); // Remove "Challenge it"

    // Difficulty
    const diffInput = screen.getByDisplayValue("3");
    fireEvent.change(diffInput, { target: { value: "4" } });

    // Save
    fireEvent.click(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(adminApi.updateStrategy).toHaveBeenCalledWith("s1", expect.objectContaining({
        description: "Updated desc",
        detailed_steps: ["Step 1 Modified", "Step 3"],
        difficulty_level: 4
      }));
      expect(screen.getByText("Strategy updated successfully.")).toBeInTheDocument();
    });
  });

  it("handles cancel edit", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit"));
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Cancel"));
    expect(screen.queryByDisplayValue("3")).not.toBeInTheDocument();
  });

  it("handles save error", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.updateStrategy as jest.Mock).mockRejectedValue(new Error("Update error"));

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit"));
    fireEvent.click(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Update error")).toBeInTheDocument();
    });
  });

  it("handles export", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.exportStrategies as jest.Mock).mockResolvedValue(mockStrategies);

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Export JSON"));

    await waitFor(() => {
      expect(adminApi.exportStrategies).toHaveBeenCalled();
      expect(screen.getByText("Strategies export downloaded successfully.")).toBeInTheDocument();
    });
  });

  it("handles import success", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.importStrategies as jest.Mock).mockResolvedValue({ updated: 1, created: 0, errors: [] });

    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    // Simulate file upload
    const file = new File([JSON.stringify(mockStrategies)], "strategies.json", { type: "application/json" });
    Object.defineProperty(file, 'text', {
      value: jest.fn().mockResolvedValue(JSON.stringify(mockStrategies))
    });

    const input = container.querySelector('input[type="file"]');
    await userEvent.upload(input!, file);

    await waitFor(() => {
      expect(adminApi.importStrategies).toHaveBeenCalled();
      expect(screen.getByText("Import complete: 1 updated, 0 created.")).toBeInTheDocument();
    });
  });

  it("handles import error", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    // Mock file read error or API error
    (adminApi.importStrategies as jest.Mock).mockRejectedValue(new Error("Import failed API"));

    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    const file = new File(["{}"], "strategies.json", { type: "application/json" });
    Object.defineProperty(file, 'text', {
      value: jest.fn().mockResolvedValue("{}")
    });

    const input = container.querySelector('input[type="file"]');
    await userEvent.upload(input!, file);

    await waitFor(() => {
      expect(screen.getByText("Import failed API")).toBeInTheDocument();
    });
  });

  it("triggers import click", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]');
    const clickSpy = jest.spyOn(input!, 'click');

    fireEvent.click(screen.getByText("Import"));
    expect(clickSpy).toHaveBeenCalled();
  });
});
