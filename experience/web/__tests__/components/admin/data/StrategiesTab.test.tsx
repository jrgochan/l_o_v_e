
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

  it("handles expand/collapse and renders details", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    expect(screen.queryByText("Detailed Steps")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Expand details"));
    expect(screen.getByText("Detailed Steps")).toBeInTheDocument();
    expect(screen.getByText("Identify thought")).toBeInTheDocument();

    // Check nested details that only appear when expanded
    expect(screen.getByText("10 mins")).toBeInTheDocument();
    expect(screen.getByText("Difficulty (1-5)")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Collapse details"));
    expect(screen.queryByText("Detailed Steps")).not.toBeInTheDocument();
  });

  it("handles inline edit flow", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.updateStrategy as jest.Mock).mockResolvedValue({});

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit"));

    expect(screen.getByText("Detailed Steps")).toBeInTheDocument();

    const descInput = screen.getByDisplayValue("Reframe negative thoughts.");
    fireEvent.change(descInput, { target: { value: "Updated desc" } });

    const steps = screen.getAllByDisplayValue(/Identify thought|Challenge it/);
    expect(steps).toHaveLength(2);
    fireEvent.change(steps[0], { target: { value: "Step 1 Modified" } });

    fireEvent.click(screen.getByText("Add Step"));
    const newStep = screen.getByPlaceholderText("Step 3");
    fireEvent.change(newStep, { target: { value: "Step 3" } });

    fireEvent.click(screen.getAllByTitle("Remove step")[1]); // Remove the second original step

    const diffInput = screen.getByDisplayValue("3");
    fireEvent.change(diffInput, { target: { value: "4" } });

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

  it("handles save failure (non-Error) fallback", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.updateStrategy as jest.Mock).mockRejectedValue("Save String Error");

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit"));
    fireEvent.click(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Failed to update strategy")).toBeInTheDocument();
    });
  });

  it("handles export success", async () => {
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

  it("handles export failure (Error object) and non-Error fallback", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);

    // Case 1: Error object
    (adminApi.exportStrategies as jest.Mock).mockRejectedValueOnce(new Error("Export API Error"));
    const { unmount } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Export JSON"));
    await waitFor(() => expect(screen.getByText("Export API Error")).toBeInTheDocument());
    unmount();

    // Case 2: Non-Error string
    (adminApi.exportStrategies as jest.Mock).mockRejectedValueOnce("Export String Error");
    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Export JSON"));
    await waitFor(() => expect(screen.getByText("Export failed")).toBeInTheDocument());
  });

  it("handles import success", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.importStrategies as jest.Mock).mockResolvedValue({ updated: 1, created: 0, errors: [] });

    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    const file = new File([JSON.stringify(mockStrategies)], "strategies.json", { type: "application/json" });
    Object.defineProperty(file, 'text', {
      value: jest.fn().mockResolvedValue(JSON.stringify(mockStrategies))
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(adminApi.importStrategies).toHaveBeenCalled();
      expect(screen.getByText("Import complete: 1 updated, 0 created.")).toBeInTheDocument();
    });
  });

  it("handles import error (API error)", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.importStrategies as jest.Mock).mockRejectedValue(new Error("Import failed API"));

    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    const file = new File(["{}"], "strategies.json", { type: "application/json" });
    Object.defineProperty(file, 'text', { value: jest.fn().mockResolvedValue("{}") });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Import failed API")).toBeInTheDocument();
    });
  });

  it("handles import non-Error rejection", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.importStrategies as jest.Mock).mockRejectedValue(null);

    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{}"], "strategies.json", { type: "application/json" });
    Object.defineProperty(file, 'text', { value: jest.fn().mockResolvedValue("{}") });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Import failed")).toBeInTheDocument();
    });
  });

  it("triggers import click", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]');
    const clickSpy = jest.spyOn(input as HTMLElement, 'click');

    fireEvent.click(screen.getByText("Import"));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles granular field edits", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.updateStrategy as jest.Mock).mockResolvedValue(mockStrategies[0]);

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit"));

    const timeInput = screen.getByDisplayValue("10 mins");
    fireEvent.change(timeInput, { target: { value: "20 mins" } });
    expect(timeInput).toHaveValue("20 mins");

    const contraInput = screen.getByDisplayValue("Acute distress");
    fireEvent.change(contraInput, { target: { value: "None" } });
    expect(contraInput).toHaveValue("None");

    fireEvent.click(screen.getByLabelText("Save"));
    await waitFor(() => {
      expect(adminApi.updateStrategy).toHaveBeenCalledWith("s1", expect.objectContaining({
        time_required: "20 mins",
        contraindications: "None"
      }));
    });
  });

  it("handles import logic edge cases (null file, partial errors)", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: null } });
    expect(adminApi.importStrategies).not.toHaveBeenCalled();

    (adminApi.importStrategies as jest.Mock).mockResolvedValue({
      updated: 0,
      created: 1,
      errors: ["Invalid ID s99", "Bad Format"]
    });

    const file = new File(["{}"], "strategies.json", { type: "application/json" });
    Object.defineProperty(file, 'text', { value: jest.fn().mockResolvedValue("{}") });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/Imported with errors: Invalid ID s99, Bad Format/)).toBeInTheDocument();
    });
  });

  it("handles missing optional fields in view and edit (coverage)", async () => {
    const emptyStrat = {
      ...mockStrategies[0],
      id: "s-empty",
      difficulty_level: undefined as unknown as number,
      contraindications: undefined as unknown as string,
      time_required: undefined as unknown as string,
      detailed_steps: undefined as unknown as string[]
    };
    (adminApi.getStrategies as jest.Mock).mockResolvedValue([emptyStrat]);

    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    // Expand
    fireEvent.click(screen.getByLabelText("Expand details"));

    // View mode: Fallbacks
    expect(screen.getByText("None listed")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();

    // Edit mode: Fallbacks
    fireEvent.click(screen.getByLabelText("Edit"));

    const diffInput = screen.getByDisplayValue("1");
    expect(diffInput).toBeInTheDocument();

    const inputs = screen.getAllByDisplayValue("");
    const contraInput = inputs.find(el => el.tagName === "TEXTAREA");
    expect(contraInput).toBeInTheDocument();

    const textInputs = inputs.filter(el => el.tagName === "INPUT");
    expect(textInputs.length).toBeGreaterThanOrEqual(1);

    expect(screen.queryByPlaceholderText("Step 1")).not.toBeInTheDocument();
  });

  it("renders different evidence levels and difficulty fallback", async () => {
    const variedStrategies = [
      { ...mockStrategies[0], id: "s1", evidence_level: "meta_analysis", difficulty_level: 0 },
      { ...mockStrategies[0], id: "s2", evidence_level: "rct", difficulty_level: 5 },
      { ...mockStrategies[0], id: "s3", evidence_level: "case_study", difficulty_level: undefined },
    ];
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(variedStrategies);

    render(<StrategiesTab />);

    await waitFor(() => {
      expect(screen.getByText("meta_analysis")).toBeInTheDocument();
      expect(screen.getByText("case_study")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(3);
  });

  it("handles fetch failure (non-Error) fallback", async () => {
    (adminApi.getStrategies as jest.Mock).mockRejectedValue("String Error");
    render(<StrategiesTab />);
    await waitFor(() => {
      expect(screen.getByText("Failed to load strategies")).toBeInTheDocument();
    });
  });

  it("handles edit when already expanded", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    // Expand first
    fireEvent.click(screen.getByLabelText("Expand details"));
    expect(screen.getByText("Detailed Steps")).toBeInTheDocument();

    // specific check: expandedIds has id
    // Now Edit
    fireEvent.click(screen.getByLabelText("Edit"));

    // Should stay expanded (toggleExpand not called or called check handled)
    expect(screen.getByText("Detailed Steps")).toBeInTheDocument();
  });

  it("handles step manipulation with missing initial steps", async () => {
    const emptyStrat = { ...mockStrategies[0], id: "s-steps", detailed_steps: undefined as unknown as string[] };
    (adminApi.getStrategies as jest.Mock).mockResolvedValue([emptyStrat]);
    (adminApi.updateStrategy as jest.Mock).mockResolvedValue(emptyStrat);

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Expand details"));
    fireEvent.click(screen.getByLabelText("Edit"));

    // Add Step (covers handleAddStep fallback)
    fireEvent.click(screen.getByText("Add Step"));

    const inputs = screen.getAllByRole("textbox");
    const stepInput = screen.getByPlaceholderText("Step 1");
    fireEvent.change(stepInput, { target: { value: "New Step" } }); // Covers handleStepChange fallback

    // Remove Step (covers handleRemoveStep fallback)
    const removeBtns = screen.getAllByTitle("Remove step");
    fireEvent.click(removeBtns[0]);

    expect(screen.queryByDisplayValue("New Step")).not.toBeInTheDocument();
  });
});
