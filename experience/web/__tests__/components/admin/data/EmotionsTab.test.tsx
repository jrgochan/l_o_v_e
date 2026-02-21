import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { EmotionsTab } from "@/components/admin/data/EmotionsTab";
import { adminApi } from "@/utils/api";
import userEvent from "@testing-library/user-event";

jest.mock("@/utils/api", () => ({
  adminApi: {
    getEmotions: jest.fn(),
    updateEmotion: jest.fn(),
    exportAtlasData: jest.fn(),
    importAtlasData: jest.fn(),
  },
}));

// Mock URL for blob download
global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

describe("EmotionsTab", () => {
  const mockEmotions = [
    {
      id: "e1",
      emotion_name: "Joy",
      category: "Positive",
      definition: "A feeling of great pleasure.",
      vac_vector: [0.8, 0.5, 0.2],
      haptic_pattern_id: "h1",
      color_hint: "#E11D48",
    },
    {
      id: "e2",
      emotion_name: "Sadness",
      category: "Negative",
      definition: "Feeling sorrow.",
      vac_vector: [-0.5, -0.2, -0.1],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress expected errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const msg = args[0]?.toString() || "";
      if (msg.includes("Failed to load emotions") || msg.includes("Not implemented: navigation")) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders loading state", async () => {
    (adminApi.getEmotions as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { container } = render(<EmotionsTab />);
    // Check for loader by class or role
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders emotions table on success", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);

    render(<EmotionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Joy")).toBeInTheDocument();
    });

    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("A feeling of great pleasure.")).toBeInTheDocument();
    expect(screen.getByText("[0.8, 0.5, 0.2]")).toBeInTheDocument();
  });

  it("handles fetch error", async () => {
    (adminApi.getEmotions as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    render(<EmotionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Fetch failed")).toBeInTheDocument();
    });
  });

  it("handles editing an emotion", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.updateEmotion as jest.Mock).mockResolvedValue({
      ...mockEmotions[0],
      category: "Very Positive",
      definition: "Updated definition",
      vac_vector: [0.9, 0.5, 0.2],
    });

    render(<EmotionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Joy")).toBeInTheDocument();
    });

    // Enter edit mode
    const row = screen.getByText("Joy").closest("tr")!;
    const editBtn = within(row).getByTitle("Edit");
    fireEvent.click(editBtn);

    // Inputs should appear
    const categoryInput = within(row).getByDisplayValue("Positive");
    const definitionInput = within(row).getByDisplayValue("A feeling of great pleasure.");
    const vInput = within(row).getByDisplayValue("0.8");

    // Make changes
    fireEvent.change(categoryInput, { target: { value: "Very Positive" } });
    fireEvent.change(definitionInput, { target: { value: "Updated definition" } });
    fireEvent.change(vInput, { target: { value: "0.9" } });

    // Invalid number check (should not change state)
    fireEvent.change(vInput, { target: { value: "abc" } });
    // Should still be last valid input or unchanged in DOM?
    // Logic: if (isNaN) return. So value in input might change if uncontrolled,
    // but here value={editForm.vac_vector?.[i] ?? 0}.
    // If state doesn't update, input should revert or stay.
    // React controlled inputs w/ uncontrolled change event logic is tricky.
    // Let's explicitly check the mocked update call arguments later.

    // Save
    const saveBtn = within(row).getByTitle("Save");
    fireEvent.click(saveBtn);

    // Verify loading state during save?
    // expect(within(row).getByRole("img", { hidden: true })).toHaveClass("animate-spin");
    // (using lucide loader which is usually svg with animate-spin class)

    await waitFor(() => {
      expect(adminApi.updateEmotion).toHaveBeenCalledWith(
        "e1",
        expect.objectContaining({
          category: "Very Positive",
          definition: "Updated definition",
          vac_vector: [0.9, 0.5, 0.2],
        })
      );
    });

    // Verify UI updated (local state update)
    expect(screen.getByText("Very Positive")).toBeInTheDocument();
    expect(screen.getByText("Updated definition")).toBeInTheDocument();

    // Verify success message
    expect(screen.getByText(/Emotion updated successfully/i)).toBeInTheDocument();
  });

  it("handles cancel edit", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const row = screen.getByText("Joy").closest("tr")!;
    fireEvent.click(within(row).getByTitle("Edit"));

    // Change something
    fireEvent.change(within(row).getByDisplayValue("Positive"), { target: { value: "Changed" } });

    // Cancel
    fireEvent.click(within(row).getByTitle("Cancel"));

    // Reverted to view mode
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Changed")).not.toBeInTheDocument();
  });

  it("handles save error", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.updateEmotion as jest.Mock).mockRejectedValue(new Error("Update failed"));

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const row = screen.getByText("Joy").closest("tr")!;
    fireEvent.click(within(row).getByTitle("Edit"));
    fireEvent.click(within(row).getByTitle("Save"));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  it("handles export", async () => {
    jest.useFakeTimers();
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.exportAtlasData as jest.Mock).mockResolvedValue({ emotions: mockEmotions });

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Export JSON"));

    await waitFor(() => {
      expect(adminApi.exportAtlasData).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    // Check success message appears
    expect(screen.getByText("Export downloaded successfully.")).toBeInTheDocument();

    // Advance timers to clear message
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Verify message gone
    expect(screen.queryByText("Export downloaded successfully.")).not.toBeInTheDocument();
  });

  it("handles export error", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.exportAtlasData as jest.Mock).mockRejectedValue(new Error("Export failed"));

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Export JSON"));

    await waitFor(() => {
      expect(screen.getByText("Export failed")).toBeInTheDocument();
    });
  });

  it("triggers file input on import click", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const clickSpy = jest.spyOn(input, "click");
    fireEvent.click(screen.getByText("Import"));

    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles import success", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.importAtlasData as jest.Mock).mockResolvedValue({ updated: 5, errors: [] });

    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const file = new File([JSON.stringify({ some: "data" })], "test.json", {
      type: "application/json",
    });
    // Mock .text() method
    Object.defineProperty(file, "text", {
      value: jest.fn().mockResolvedValue(JSON.stringify({ some: "data" })),
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(adminApi.importAtlasData).toHaveBeenCalled();
      expect(screen.getByText(/Import complete: 5 emotions updated/)).toBeInTheDocument();
    });

    // Verify input value is cleared (finally block coverage)
    expect(input.value).toBe("");
  });

  it("handles editing an emotion with incomplete string vector", async () => {
    // Mock emotion with vac_vector having fewer than 3 elements to trigger ?? 0 fallback
    const incompleteEmotion = {
      ...mockEmotions[0],
      id: "e_inc",
      vac_vector: [0.5, 0.5] as any, // Force 2 elements
    };
    (adminApi.getEmotions as jest.Mock).mockResolvedValue([incompleteEmotion]);

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const row = screen.getByText("Joy").closest("tr")!;
    fireEvent.click(within(row).getByTitle("Edit"));

    const vacInputs = within(row).getAllByRole("spinbutton") as HTMLInputElement[];
    expect(vacInputs).toHaveLength(3);

    // The 1st and 2nd should have values
    expect(vacInputs[0]).toHaveValue(0.5);
    expect(vacInputs[1]).toHaveValue(0.5);
    // The 3rd input should fallback to 0 (because index 2 is undefined)
    expect(vacInputs[2]).toHaveValue(0);
  });

  it("handles import partial errors", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.importAtlasData as jest.Mock).mockResolvedValue({
      updated: 2,
      errors: ["Err1", "Err2"],
    });

    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const file = new File(["{}"], "test.json", { type: "application/json" });
    Object.defineProperty(file, "text", {
      value: jest.fn().mockResolvedValue("{}"),
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/Imported with errors: Err1, Err2/)).toBeInTheDocument();
    });
  });

  it("handles import exception", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    const error = new Error("Import crashed");

    (adminApi.importAtlasData as jest.Mock).mockRejectedValue(error);

    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const file = new File(["{}"], "test.json", { type: "application/json" });
    Object.defineProperty(file, "text", {
      value: jest.fn().mockResolvedValue("{}"),
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Import crashed")).toBeInTheDocument();
    });

    // Verify input cleared even on error
    const inputClean = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(inputClean.value).toBe("");
  });

  it("handles empty file selection", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate cancelling file dialog / empty selection
    fireEvent.change(input, { target: { files: [] } });

    // Should not trigger import
    expect(adminApi.importAtlasData).not.toHaveBeenCalled();
  });

  it("handles non-Error objects in fetch", async () => {
    (adminApi.getEmotions as jest.Mock).mockRejectedValue("String Error");
    render(<EmotionsTab />);
    await waitFor(() => {
      expect(screen.getByText("Failed to load atlas data")).toBeInTheDocument();
    });
  });

  it("handles non-Error objects in save", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    // Mock save to reject with non-Error
    (adminApi.updateEmotion as jest.Mock).mockRejectedValue({ some: "obj" });

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const row = screen.getByText("Joy").closest("tr")!;
    fireEvent.click(within(row).getByTitle("Edit"));
    fireEvent.click(within(row).getByTitle("Save"));

    await waitFor(() => {
      expect(screen.getByText("Failed to update emotion")).toBeInTheDocument();
    });
  });

  it("handles non-Error objects in export", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.exportAtlasData as jest.Mock).mockRejectedValue(123);

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Export JSON"));
    await waitFor(() => {
      expect(screen.getByText("Export failed")).toBeInTheDocument();
    });
  });

  it("handles non-Error objects in import", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.importAtlasData as jest.Mock).mockRejectedValue(null);

    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const file = new File(["{}"], "test.json", { type: "application/json" });
    Object.defineProperty(file, "text", {
      value: jest.fn().mockResolvedValue("{}"),
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Import failed")).toBeInTheDocument();
    });
  });

  it("handles VAC changes with valid and invalid inputs", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const row = screen.getByText("Joy").closest("tr")!;
    fireEvent.click(within(row).getByTitle("Edit"));

    const vacInputs = within(row).getAllByRole("spinbutton") as HTMLInputElement[];
    expect(vacInputs).toHaveLength(3);

    // Test valid change
    fireEvent.change(vacInputs[0], { target: { value: "0" } });
    expect(vacInputs[0].value).toBe("0");

    // Test invalid change (NaN) - should not update state
    // We need to verify state didn't change.
    // Since input value is controlled by state, if state doesn't update, value shouldn't change
    // BUT simulate change event with "abc" on number input usually results in empty string value in standard DOM
    // In React testing library, fireEvent.change essentially sets the value prop if controlled?
    // Let's spy on setEditForm or just check if value reverts or stays

    // Reset to known
    fireEvent.change(vacInputs[0], { target: { value: "0.5" } });
    expect(vacInputs[0].value).toBe("0.5");

    // Try NaN
    fireEvent.change(vacInputs[0], { target: { value: "nan" } });
    // If logic works: const val = parseFloat("nan"); if(isNaN(val)) return;
    // So setState is NOT called.
    // The input value in DOM *might* drift if we don't force re-render, but usually React handles this.
    // Let's just assume if we save, it uses 0.5

    // Save and check call
    (adminApi.updateEmotion as jest.Mock).mockResolvedValue(mockEmotions[0]);
    fireEvent.click(within(row).getByTitle("Save"));

    await waitFor(() => {
      expect(adminApi.updateEmotion).toHaveBeenCalledWith(
        "e1",
        expect.objectContaining({
          vac_vector: [0.5, 0.5, 0.2], // First value should stay 0.5, not become NaN
        })
      );
    });
  });

  it("handles definition change", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const row = screen.getByText("Joy").closest("tr")!;
    fireEvent.click(within(row).getByTitle("Edit"));

    const defInput = within(row).getByDisplayValue("A feeling of great pleasure.");
    fireEvent.change(defInput, { target: { value: "New Def" } });

    expect(defInput).toHaveValue("New Def");
  });

  it("handles missing vac vector fallback", async () => {
    // Mock emotion with missing VAC (if possible by type, though type usually requires it)
    const brokenEmotion = {
      ...mockEmotions[0],
      id: "e3",
      vac_vector: undefined as unknown as number[],
    };
    (adminApi.getEmotions as jest.Mock).mockResolvedValue([brokenEmotion]);

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const row = screen.getByText("Joy").closest("tr")!;
    fireEvent.click(within(row).getByTitle("Edit"));

    // Should default to 0s and render inputs
    const vacInputs = within(row).getAllByRole("spinbutton");
    expect(vacInputs[0]).toHaveValue(0); // 0 fallback
  });
  it("handles empty fields in edit form (coverage)", async () => {
    // Emotion with undefined optional fields to hit || "" branches
    const emptyEmotion = {
      ...mockEmotions[0],
      id: "e_empty",
      category: "",
      definition: "",
      color_hint: undefined,
      haptic_pattern_id: undefined,
      // vac_vector checked separately
    };
    (adminApi.getEmotions as jest.Mock).mockResolvedValue([emptyEmotion]);

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const row = screen.getByText("Joy").closest("tr")!;
    fireEvent.click(within(row).getByTitle("Edit"));

    // Check inputs have empty values (defaults)
    // Both category and definition are empty, so getByDisplayValue("") finds multiple
    const inputs = within(row).getAllByDisplayValue("");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    // Optionally check if one is the category input (first one generally)
    expect(inputs[0]).toBeInTheDocument();
  });

  it("handles null files in import", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate event with null files
    fireEvent.change(input, { target: { files: null } });

    expect(adminApi.importAtlasData).not.toHaveBeenCalled();
  });

  it("handles fetch success with invalid data format (non-array)", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue({ not: "an array" });
    const { container } = render(<EmotionsTab />);

    await waitFor(() => {
      // Should not crash, renders empty list or loading done
      const rows = container.querySelectorAll("tbody tr");
      expect(rows.length).toBe(0);
    });
  });
  it("handles unmount during import to cover finally block ref check", async () => {
    (adminApi.getEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    // Mock import to pending forever (or long enough) but we won't wait for it
    let resolveImport: (val: any) => void = () => {};
    (adminApi.importAtlasData as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveImport = resolve;
      });
    });

    const { container, unmount } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const file = new File(["{}"], "test.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: jest.fn().mockResolvedValue("{}") });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // Trigger upload
    await userEvent.upload(input, file);

    // Unmount before import completes
    unmount();

    // Now resolve import
    resolveImport({ updated: 0, errors: [] });

    // We can't really assert on state change since unmounted (React warns usually)
    // But we want to ensure no crash in finally block when accessing ref.current
    // The finally block runs when promise settles.
    expect(adminApi.importAtlasData).toHaveBeenCalled();
  });
});
