
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrategiesTab } from "@/components/admin/data/StrategiesTab";
import { adminApi } from "@/utils/api";

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

  // Setup fake timers
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("clears success message after timeout", async () => {
    jest.useFakeTimers();
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.updateStrategy as jest.Mock).mockResolvedValue({});

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit"));
    fireEvent.click(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Strategy updated successfully.")).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText("Strategy updated successfully.")).not.toBeInTheDocument();
    });
    jest.useRealTimers();
  });

  // Replaces the skipped test with a working one or just relies on the existing import success logic
  // logic above covers import success. We just need to ensure we covered `handleFileChange` completely.
  // The existing test "handles import success" uses `userEvent.upload`.
  // The skipped test used manual `FileReader` mocking which might be brittle.
  // We can just delete the skipped test or fix it.
  // I will delete the skipped test in a separate edit or just ignore it.
  // Actually, I'll rewrite the skipped test to be a proper file interaction test if needed,
  // but "handles import success" already covers it.
  // So I will just remove the skipping and make it work or remove it.
  // The skipped test was "handles file import correctly".
  // It tried to mock FileReader globally which conflicts with JSDOM sometimes.
  // Since "handles import success" uses `userEvent.upload`, that is the better way.
  // I will just remove the skipped test.

  /* Removed skipped manual FileReader test in favor of userEvent.upload test */

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

    expect(screen.getByText(/Import complete: 1 updated, 0 created/)).toBeInTheDocument();

    // Verify input cleared
    expect(input.value).toBe("");
  });

  it("handles import success with errors (partial)", async () => {
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(mockStrategies);
    (adminApi.importStrategies as jest.Mock).mockResolvedValue({
      updated: 1,
      created: 0,
      errors: ["Row 5 invalid"]
    });

    const { container } = render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    const file = new File([JSON.stringify(mockStrategies)], "strategies.json", { type: "application/json" });
    Object.defineProperty(file, 'text', { value: jest.fn().mockResolvedValue(JSON.stringify(mockStrategies)) });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(adminApi.getStrategies).toHaveBeenCalledTimes(2); // Reload after import
      expect(screen.getByText(/Imported with errors: Row 5 invalid/)).toBeInTheDocument();
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
  it("handles updates in multi-item list correctly", async () => {
    const multiProps = [
      { ...mockStrategies[0], id: "s1", strategy_name: "S1" },
      { ...mockStrategies[0], id: "s2", strategy_name: "S2" }
    ];
    (adminApi.getStrategies as jest.Mock).mockResolvedValue(multiProps);
    (adminApi.updateStrategy as jest.Mock).mockResolvedValue({ ...multiProps[0], strategy_name: "S1 Updated" });

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("S1")).toBeInTheDocument());
    expect(screen.getByText("S2")).toBeInTheDocument();

    // Edit S1
    const editButtons = screen.getAllByLabelText("Edit");
    fireEvent.click(editButtons[0]);

    fireEvent.click(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(screen.getByText("S1 Updated")).toBeInTheDocument();
      // S2 should still be there unchanged
      expect(screen.getByText("S2")).toBeInTheDocument();
    });
  });

  it("handles editing strategy with null description (coverage)", async () => {
    const nullDescStrat = { ...mockStrategies[0], description: null as unknown as string };
    (adminApi.getStrategies as jest.Mock).mockResolvedValue([nullDescStrat]);
    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText("CBT Reframe")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit"));

    // Should render empty string in textarea
    const textareas = screen.getAllByRole("textbox");
    // We expect one of them to be empty (description)
    // Note: getByDisplayValue("") matches generic inputs too.
    expect(screen.getAllByDisplayValue("").length).toBeGreaterThan(0);
  });



  it("manages detailed steps in edit mode", async () => {
    const user = userEvent.setup();
    const strategy = { ...mockStrategies[0], detailed_steps: ["Step 1"] };
    (adminApi.getStrategies as jest.Mock).mockResolvedValue([strategy]);

    render(<StrategiesTab />);
    await waitFor(() => expect(screen.getByText(strategy.strategy_name)).toBeInTheDocument());

    // Expand row
    await user.click(screen.getByText(strategy.strategy_name));

    // Enter edit mode
    await user.click(screen.getByTitle("Edit"));

    // Check "Detailed Steps" header
    expect(screen.getByText("Detailed Steps")).toBeInTheDocument();

    // Find first step input
    // The previous code shows inputs with placeholder `Step ${idx + 1}`
    const step1Input = screen.getByPlaceholderText("Step 1");
    await user.clear(step1Input);
    await user.type(step1Input, "Updated Step 1");

    // Add a step
    await user.click(screen.getByText("Add Step"));

    // Find new input
    const step2Input = screen.getByPlaceholderText("Step 2"); // index 1 + 1 = 2?
    // Based on `(prev.detailed_steps || []).map((step, idx) => ... placeholder={\`Step ${idx + 1}\`}`
    // Initial was ["Step 1"], we added one, so now there should be Step 2.
    await user.type(step2Input, "New Step 2");

    // Remove first step
    // Buttons have `title="Remove step"`
    const removeButtons = screen.getAllByTitle("Remove step");
    await user.click(removeButtons[0]);

    // Now "New Step 2" should be first (Step 1)
    expect(screen.getAllByPlaceholderText("Step 1")[0]).toHaveValue("New Step 2");

    // Save
    (adminApi.updateStrategy as jest.Mock).mockResolvedValue({});
    await user.click(screen.getByTitle("Save"));

    await waitFor(() => {
      expect(adminApi.updateStrategy).toHaveBeenCalledWith(strategy.id, expect.objectContaining({
        detailed_steps: ["New Step 2"]
      }));
    });
  });
});
