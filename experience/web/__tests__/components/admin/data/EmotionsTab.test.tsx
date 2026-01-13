
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { EmotionsTab } from "@/components/admin/data/EmotionsTab";
import { adminApi } from "@/utils/api";
import userEvent from "@testing-library/user-event";

jest.mock("@/utils/api", () => ({
  adminApi: {
    getAtlasEmotions: jest.fn(),
    updateAtlasEmotion: jest.fn(),
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
      color_hint: "#FF0000",
    },
    {
      id: "e2",
      emotion_name: "Sadness",
      category: "Negative",
      definition: "Feeling sorrow.",
      vac_vector: [-0.5, -0.2, -0.1],
      // missing optional fields
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockReturnValue(new Promise(() => { }));
    const { container } = render(<EmotionsTab />);
    // Check for loader by class or role
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders emotions table on success", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);

    render(<EmotionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Joy")).toBeInTheDocument();
    });

    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("A feeling of great pleasure.")).toBeInTheDocument();
    expect(screen.getByText("[0.8, 0.5, 0.2]")).toBeInTheDocument();
  });

  it("handles fetch error", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    render(<EmotionsTab />);

    await waitFor(() => {
      expect(screen.getByText("Fetch failed")).toBeInTheDocument();
    });
  });

  it("handles editing an emotion", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.updateAtlasEmotion as jest.Mock).mockResolvedValue({
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
      expect(adminApi.updateAtlasEmotion).toHaveBeenCalledWith("e1", expect.objectContaining({
        category: "Very Positive",
        definition: "Updated definition",
        vac_vector: [0.9, 0.5, 0.2],
      }));
    });

    // Verify UI updated (local state update)
    expect(screen.getByText("Very Positive")).toBeInTheDocument();
    expect(screen.getByText("Updated definition")).toBeInTheDocument();

    // Verify success message
    expect(screen.getByText(/Emotion updated successfully/i)).toBeInTheDocument();
  });

  it("handles cancel edit", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
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
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.updateAtlasEmotion as jest.Mock).mockRejectedValue(new Error("Update failed"));

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
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.exportAtlasData as jest.Mock).mockResolvedValue({ emotions: mockEmotions });

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Export JSON"));

    await waitFor(() => {
      expect(adminApi.exportAtlasData).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it("handles export error", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.exportAtlasData as jest.Mock).mockRejectedValue(new Error("Export failed"));

    render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Export JSON"));

    await waitFor(() => {
      expect(screen.getByText("Export failed")).toBeInTheDocument();
    });
  });

  it("triggers file input on import click", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const clickSpy = jest.spyOn(input, 'click');
    fireEvent.click(screen.getByText("Import"));

    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles import success", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.importAtlasData as jest.Mock).mockResolvedValue({ updated: 5, errors: [] });

    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const file = new File([JSON.stringify({ some: "data" })], "test.json", { type: "application/json" });
    // Mock .text() method
    Object.defineProperty(file, 'text', {
      value: jest.fn().mockResolvedValue(JSON.stringify({ some: "data" }))
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(adminApi.importAtlasData).toHaveBeenCalled();
      expect(screen.getByText(/Import complete: 5 emotions updated/)).toBeInTheDocument();
    });
  });

  it("handles import partial errors", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    (adminApi.importAtlasData as jest.Mock).mockResolvedValue({ updated: 2, errors: ["Err1", "Err2"] });

    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const file = new File(["{}"], "test.json", { type: "application/json" });
    Object.defineProperty(file, 'text', {
      value: jest.fn().mockResolvedValue("{}")
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/Imported with errors: Err1, Err2/)).toBeInTheDocument();
    });
  });

  it("handles import exception", async () => {
    (adminApi.getAtlasEmotions as jest.Mock).mockResolvedValue(mockEmotions);
    const error = new Error("Import crashed");

    // We want importAtlasData to be called and fail? 
    // OR file reading to fail?
    // The previous test logic was:
    // (adminApi.importAtlasData as jest.Mock).mockRejectedValue(error);
    // So we need file reading to succeed.

    (adminApi.importAtlasData as jest.Mock).mockRejectedValue(error);

    const { container } = render(<EmotionsTab />);
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const file = new File(["{}"], "test.json", { type: "application/json" });
    Object.defineProperty(file, 'text', {
      value: jest.fn().mockResolvedValue("{}")
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Import crashed")).toBeInTheDocument();
    });
  });
});
