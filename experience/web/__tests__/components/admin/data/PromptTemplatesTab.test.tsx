
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PromptTemplatesTab } from "@/components/admin/data/PromptTemplatesTab";
import { adminApi } from "@/utils/api";

jest.mock("@/utils/api", () => ({
  adminApi: {
    getPromptTemplates: jest.fn(),
    createPromptTemplate: jest.fn(),
    updatePromptTemplate: jest.fn(),
    testPromptTemplate: jest.fn(),
  },
}));

describe("PromptTemplatesTab", () => {
  const mockPrompts = [
    {
      id: "p1",
      function_name: "semantic_vac",
      version: "1.0.0",
      template_content: "Hello {input_text}",
      input_variables: ["input_text"],
      description: "Basic greeting",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockReturnValue(new Promise(() => { }));
    const { container } = render(<PromptTemplatesTab />);
    // Component sets loading=true initially? 
    // `useEffect` -> `loadPrompts` -> `setLoading(true)`.
    // But initial state is `false`.
    // So it might validly be false for a microsecond.
    // However, useEffect runs after render.
    // If I mock return value as pending promise, `setLoading(true)` happens.
    // But there is no explicit "Loading..." text in simple list view unless empty?
    // Ah, `loading` is only used for button disable state in `handleSave`? 
    // And in `prompts.length === 0 && !loading`.
    // So if loading is true, the "No templates found" message should NOT appear.
    // Let's check if "No templates found" is absent.
    // Or check if I can find a spinner? There is no spinner in main view, only in Save button!
    // Wait, `StrategiesTab` has a Loader. `PromptTemplatesTab` does NOT have a full page loader. 
    // It just sets loading for operations.
    // So "renders loading state" is tricky. I can skip it or test that empty message doesn't show.
    expect(screen.queryByText("No templates found")).not.toBeInTheDocument();
  });

  it("renders prompts list on success", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(mockPrompts);
    render(<PromptTemplatesTab />);

    await waitFor(() => {
      expect(screen.getByText("semantic_vac")).toBeInTheDocument();
    });

    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Basic greeting")).toBeInTheDocument();
  });

  it("handles fetch error", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockRejectedValue(new Error("Fetch failed"));
    render(<PromptTemplatesTab />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load prompts")).toBeInTheDocument();
    });
  });

  it("handles create prompt flow", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(mockPrompts);
    (adminApi.createPromptTemplate as jest.Mock).mockResolvedValue({});

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("semantic_vac")).toBeInTheDocument());

    // Open create
    fireEvent.click(screen.getByText("New Template"));
    expect(screen.getByText("New Prompt Template")).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText("Function"), { target: { value: "voice_only" } });
    fireEvent.change(screen.getByLabelText("Version"), { target: { value: "2.0.0" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "New desc" } });
    fireEvent.change(screen.getByLabelText(/Template Content/), { target: { value: "Content" } });

    // Check Active
    fireEvent.click(screen.getByLabelText("Set as Active Version"));

    // Save
    fireEvent.click(screen.getByLabelText("Save Template"));

    await waitFor(() => {
      expect(adminApi.createPromptTemplate).toHaveBeenCalledWith(expect.objectContaining({
        function_name: "voice_only",
        version: "2.0.0",
        is_active: true
      }));
      expect(screen.queryByText("New Prompt Template")).not.toBeInTheDocument(); // Closed
    });
  });

  it("handles edit prompt flow", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(mockPrompts);
    (adminApi.updatePromptTemplate as jest.Mock).mockResolvedValue({});

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("semantic_vac")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("edit-btn-p1"));
    expect(screen.getByText("Edit Prompt Template")).toBeInTheDocument();

    // Function and Version should be disabled
    expect(screen.getByLabelText("Function")).toBeDisabled();

    // Update content
    fireEvent.change(screen.getByLabelText(/Template Content/), { target: { value: "Updated Content" } });

    // Update variables
    fireEvent.change(screen.getByLabelText(/Input Variables/), { target: { value: "var1, var2" } });

    // Test Render Logic
    (adminApi.testPromptTemplate as jest.Mock).mockResolvedValue({ rendered_content: "Rendered: Updated Content" });
    fireEvent.click(screen.getByText("Test Render"));

    await waitFor(() => {
      expect(screen.getByText("Rendered: Updated Content")).toBeInTheDocument();
    });

    // Test Render Error
    (adminApi.testPromptTemplate as jest.Mock).mockRejectedValue(new Error("Render fail"));
    fireEvent.click(screen.getByText("Test Render"));
    await waitFor(() => {
      expect(screen.getByText("Error: Render fail")).toBeInTheDocument();
    });

    // Save
    fireEvent.click(screen.getByLabelText("Save Template"));

    await waitFor(() => {
      expect(adminApi.updatePromptTemplate).toHaveBeenCalledWith("p1", expect.objectContaining({
        template_content: "Updated Content",
        input_variables: ["var1", "var2"]
      }));
    });
  });

  it("handles save error", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(mockPrompts);
    (adminApi.updatePromptTemplate as jest.Mock).mockRejectedValue(new Error("Update failed"));

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("semantic_vac")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("edit-btn-p1"));
    fireEvent.click(screen.getByLabelText("Save Template"));

    await waitFor(() => {
      expect(screen.getByText("Failed to save prompt")).toBeInTheDocument();
    });
  });

  it("validates required fields on save", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(mockPrompts);
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("semantic_vac")).toBeInTheDocument());

    fireEvent.click(screen.getByText("New Template"));

    // Clear content (it might be empty by default?)
    // handleCreate sets default empty string.

    fireEvent.click(screen.getByLabelText("Save Template"));

    await waitFor(() => {
      expect(screen.getByText("Please fill in all required fields")).toBeInTheDocument();
    });
    expect(adminApi.createPromptTemplate).not.toHaveBeenCalled();
  });

  it("handles filtering", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(mockPrompts);
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("semantic_vac")).toBeInTheDocument());

    const filter = screen.getByLabelText("Filter by Function");
    fireEvent.change(filter, { target: { value: "voice_only" } });

    await waitFor(() => {
      expect(adminApi.getPromptTemplates).toHaveBeenCalledWith("voice_only");
    });
  });

  it("handles cancel edit", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(mockPrompts);
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("semantic_vac")).toBeInTheDocument());

    fireEvent.click(screen.getByText("New Template"));
    expect(screen.getByText("New Prompt Template")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close Editor"));
    expect(screen.queryByText("New Prompt Template")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("New Template"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("New Prompt Template")).not.toBeInTheDocument();
  });
});
