
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// Mock props
const mockTemplates = [
  {
    id: "uuid-1",
    function_name: "semantic_vac",
    version: "1.0.0",
    template_content: "Template 1 {input_text}",
    input_variables: ["input_text"],
    description: "Description 1",
    is_active: true,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "uuid-2",
    function_name: "multi_emotion",
    version: "1.1.0",
    template_content: "Template 2 {input_text}",
    input_variables: ["input_text"],
    description: "Description 2",
    is_active: false,
    created_at: "2023-01-02T00:00:00Z",
    updated_at: "2023-01-02T00:00:00Z",
  },
];

describe("PromptTemplatesTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(mockTemplates);
  });

  it("renders prompt templates correctly", async () => {
    const { container } = render(<PromptTemplatesTab />);

    await waitFor(() => {
      expect(screen.getByText("Prompt Library")).toBeInTheDocument();
    });

    // Check headings specifically to avoid select option conflict
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("semantic_vac");
    expect(headings[1]).toHaveTextContent("multi_emotion");

    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Description 1")).toBeInTheDocument();
    expect(screen.getByText("v1.1.0")).toBeInTheDocument();
  });

  it("handles loading state", () => {
    // Mock a promise that doesn't resolve immediately
    (adminApi.getPromptTemplates as jest.Mock).mockReturnValue(new Promise(() => { }));
    render(<PromptTemplatesTab />);
    // Initial render doesn't show loading spinner but might show empty state or just the header
    expect(screen.getByText("Prompt Library")).toBeInTheDocument();
  });

  it("handles error loading prompts", async () => {
    (adminApi.getPromptTemplates as jest.Mock).mockRejectedValue(new Error("Failed load"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });

    render(<PromptTemplatesTab />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load prompts")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it("filters prompts by function", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("semantic_vac"));

    const filterSelect = screen.getByLabelText("Filter by Function");
    fireEvent.change(filterSelect, { target: { value: "semantic_vac" } });

    expect(adminApi.getPromptTemplates).toHaveBeenCalledWith("semantic_vac");
  });

  it("enters create mode correctly", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());

    fireEvent.click(screen.getByText("New Template"));

    expect(screen.getByText("New Prompt Template")).toBeInTheDocument();
    // The label "Function" is unique to editor (filter is "Filter by Function").
    expect(screen.getByLabelText("Function")).toHaveValue("semantic_vac");
  });

  it("enters edit mode correctly", async () => {
    const user = userEvent.setup();
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("semantic_vac"));

    const editBtn = screen.getByTestId("edit-btn-uuid-1");
    await user.click(editBtn);

    expect(screen.getByText("Edit Prompt Template")).toBeInTheDocument();
    expect(screen.getByLabelText("Function")).toHaveValue("semantic_vac");
    expect(screen.getByLabelText("Version")).toHaveValue("1.0.0");
  });

  it("cancels edit mode", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());

    fireEvent.click(screen.getByText("New Template"));
    expect(screen.getByText("New Prompt Template")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("New Prompt Template")).not.toBeInTheDocument();
  });

  it("validates form fields on save", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());

    fireEvent.click(screen.getByText("New Template"));

    // Clear required fields (though they have defaults, let's clear them)
    // Actually Function has default, Version is empty? No, initial state has defaults.
    // Let's clear template content which is empty by default but version is "1.0.0".

    // Click save immediately. Template content is empty.
    fireEvent.click(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(screen.getByText("Please fill in all required fields")).toBeInTheDocument();
    });
  });

  it("saves a new template", async () => {
    const user = userEvent.setup();
    (adminApi.createPromptTemplate as jest.Mock).mockResolvedValue({});

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());

    await user.click(screen.getByText("New Template"));

    // Fill form
    const versionInput = screen.getByLabelText("Version");
    await user.clear(versionInput);
    await user.type(versionInput, "2.0.0");

    const descInput = screen.getByLabelText("Description");
    await user.type(descInput, "New Desc");

    const contentInput = screen.getByLabelText(/Template Content/);
    // Escape open brace, close brace is literal
    await user.type(contentInput, "Hello {{input}");

    const varsInput = screen.getByLabelText(/Input Variables/);
    await user.clear(varsInput);
    await user.type(varsInput, "input");

    // Toggle active
    const activeCheckbox = screen.getByLabelText("Set as Active Version");
    await user.click(activeCheckbox);

    await user.click(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(adminApi.createPromptTemplate).toHaveBeenCalledWith(expect.objectContaining({
        function_name: "semantic_vac",
        version: "2.0.0",
        template_content: "Hello {input}",
        input_variables: ["input"],
        description: "New Desc",
        is_active: true, // Now true
      }));
    });
  });

  it("handles empty description rendering", async () => {
    const templatesWithNoDesc = [{ ...mockTemplates[0], id: "uuid-3", description: "" }];
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(templatesWithNoDesc);

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("No description")).toBeInTheDocument());
  });

  it("assigns selected function when creating new template with filter active", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());

    const filterSelect = screen.getByLabelText("Filter by Function");
    fireEvent.change(filterSelect, { target: { value: "multi_emotion" } });

    fireEvent.click(screen.getByText("New Template"));

    expect(screen.getByLabelText("Function")).toHaveValue("multi_emotion");
  });

  it("handles undefined input_variables on save", async () => {
    const user = userEvent.setup();
    (adminApi.createPromptTemplate as jest.Mock).mockResolvedValue({});

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());
    await user.click(screen.getByText("New Template"));

    // Fill required fields
    await user.type(screen.getByLabelText("Version"), "1.0.0");
    await user.type(screen.getByLabelText("Description"), "Desc");
    await user.type(screen.getByLabelText(/Template Content/), "Content");

    const varsInput = screen.getByLabelText(/Input Variables/);
    await user.clear(varsInput);
    // Leave it empty => []

    await user.click(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(adminApi.createPromptTemplate).toHaveBeenCalledWith(expect.objectContaining({
        input_variables: [],
      }));
    });
  });

  it("tests prompt template execution", async () => {
    const user = userEvent.setup();
    (adminApi.testPromptTemplate as jest.Mock).mockResolvedValue({ rendered_content: "Rendered Hello World" });

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());
    await user.click(screen.getByText("New Template"));

    // Fill content - simplify to avoid userEvent brace issues
    const contentInput = screen.getByLabelText(/Template Content/);
    await user.type(contentInput, "Hello input");

    // Add variables for coverage of forEach loop in handleTest
    const varsInput = screen.getByLabelText(/Input Variables/);
    await user.clear(varsInput);
    await user.type(varsInput, "input_text"); // "input_text" triggers specific logic in handleTest

    await user.click(screen.getByLabelText("Test Render"));

    await waitFor(() => {
      expect(adminApi.testPromptTemplate).toHaveBeenCalledWith({
        template_content: "Hello input",
        input_variables: {
          "input_text": "I feel really happy today but a bit tired."
        }
      });
      expect(screen.getByText("Rendered Hello World")).toBeInTheDocument();
    });
  });

  it("handles test execution error", async () => {
    const user = userEvent.setup();
    (adminApi.testPromptTemplate as jest.Mock).mockRejectedValue(new Error("Test failed"));

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());
    await user.click(screen.getByText("New Template"));

    const contentInput = screen.getByLabelText(/Template Content/);
    await user.type(contentInput, "Content");

    await user.click(screen.getByLabelText("Test Render"));

    await waitFor(() => {
      expect(screen.getByText("Error: Test failed")).toBeInTheDocument();
    });
  });

  it("handles save error", async () => {
    const user = userEvent.setup();
    (adminApi.createPromptTemplate as jest.Mock).mockRejectedValue(new Error("Save failed"));

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());

    await user.click(screen.getByText("New Template"));

    // Fill minimum required
    const contentInput = screen.getByLabelText(/Template Content/);
    await user.type(contentInput, "Content");

    await user.click(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(screen.getByText("Failed to save prompt")).toBeInTheDocument();
    });
  });

  it("closes editor via close button", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());
    fireEvent.click(screen.getByText("New Template"));
    expect(screen.getByText("New Prompt Template")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close Editor"));
    expect(screen.queryByText("New Prompt Template")).not.toBeInTheDocument();
  });

  it("changes function in create mode", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());
    fireEvent.click(screen.getByText("New Template"));

    const funcSelect = screen.getByLabelText("Function");
    fireEvent.change(funcSelect, { target: { value: "multi_emotion" } });
    expect(funcSelect).toHaveValue("multi_emotion");
  });

  it("updates an existing template", async () => {
    const user = userEvent.setup();
    (adminApi.updatePromptTemplate as jest.Mock).mockResolvedValue({});

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByTestId("edit-btn-uuid-1")).toBeInTheDocument());

    await user.click(screen.getByTestId("edit-btn-uuid-1"));

    const contentInput = screen.getByLabelText(/Template Content/);
    await user.clear(contentInput);
    await user.type(contentInput, "Updated Content");

    await user.click(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(adminApi.updatePromptTemplate).toHaveBeenCalledWith("uuid-1", expect.objectContaining({
        template_content: "Updated Content",
      }));
    });
  });

  it("handles test render", async () => {
    const user = userEvent.setup();
    (adminApi.testPromptTemplate as jest.Mock).mockResolvedValue({ rendered_content: "Rendered: Hello World" });

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByTestId("edit-btn-uuid-1")).toBeInTheDocument());

    await user.click(screen.getByTestId("edit-btn-uuid-1"));

    await user.click(screen.getByText("Test Render"));

    await waitFor(() => {
      expect(screen.getByText("Rendered: Hello World")).toBeInTheDocument();
    });
  });

  it("handles test render error", async () => {
    const user = userEvent.setup();
    (adminApi.testPromptTemplate as jest.Mock).mockRejectedValue(new Error("Render Failed"));

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByTestId("edit-btn-uuid-1")).toBeInTheDocument());

    await user.click(screen.getByTestId("edit-btn-uuid-1"));

    await user.click(screen.getByText("Test Render"));

    await waitFor(() => {
      expect(screen.getByText(/Error: Render Failed/)).toBeInTheDocument();
    });
  });

  it("does not test execution if template content is empty", async () => {
    const user = userEvent.setup();
    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());
    await user.click(screen.getByText("New Template"));

    // Content is initially empty string?
    // Actually our mock helper has "Template 1 {input_text}" or "template_content".
    // Wait, "New Template" starts with default empty object?
    // Let's check PromptTemplatesTab.tsx state init.
    // It seems to init with defaults.
    // We try to click Test Render immediately.

    await user.click(screen.getByText("Test Render"));

    expect(adminApi.testPromptTemplate).not.toHaveBeenCalled();
  });

  it("tests execution with no input variables", async () => {
    const user = userEvent.setup();
    (adminApi.testPromptTemplate as jest.Mock).mockResolvedValue({ rendered_content: "No Vars" });

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());
    await user.click(screen.getByText("New Template"));

    const contentInput = screen.getByLabelText(/Template Content/);
    await user.type(contentInput, "Just text");

    const varsInput = screen.getByLabelText(/Input Variables/);
    await user.clear(varsInput);
    // This makes it empty array? Or undefined?
    // OnChange splits string. "".split => [""]?
    // Code: .split(",").map(s => s.trim()).filter(Boolean) which gives []

    await user.click(screen.getByText("Test Render"));

    await waitFor(() => {
      expect(adminApi.testPromptTemplate).toHaveBeenCalledWith({
        template_content: "Just text",
        input_variables: {}
      });
      expect(screen.getByText("No Vars")).toBeInTheDocument();
    });
  });

  it("handles test execution error with non-Error object", async () => {
    const user = userEvent.setup();
    (adminApi.testPromptTemplate as jest.Mock).mockRejectedValue("String error");

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText("New Template")).toBeInTheDocument());
    await user.click(screen.getByText("New Template"));

    await user.type(screen.getByLabelText(/Template Content/), "Content");
    await user.click(screen.getByText("Test Render"));

    await waitFor(() => {
      expect(screen.getByText("Error: String error")).toBeInTheDocument();
    });
  });

  it("handles loading a template with undefined input_variables (legacy data)", async () => {
    const user = userEvent.setup();
    // Mock return with undefined input_variables
    const legacyTemplate = { ...mockTemplates[0], id: "legacy", input_variables: undefined };
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue([legacyTemplate]);

    render(<PromptTemplatesTab />);
    await waitFor(() => expect(screen.getByText(legacyTemplate.description)).toBeInTheDocument());

    // Enter edit mode
    await user.click(screen.getByTestId("edit-btn-legacy"));

    // Save immediately - should handle undefined vars -> []
    (adminApi.updatePromptTemplate as jest.Mock).mockResolvedValue({});
    await user.click(screen.getByText("Save Template"));

    await waitFor(() => {
      expect(adminApi.updatePromptTemplate).toHaveBeenCalledWith("legacy", expect.objectContaining({
        input_variables: []
      }));
    });
  });

  it("handles test render with undefined input_variables (legacy data)", async () => {
    const user = userEvent.setup();
    const legacyTemplate = { ...mockTemplates[0], id: "legacy-test", input_variables: undefined, template_content: "No vars" };
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue([legacyTemplate]);
    (adminApi.testPromptTemplate as jest.Mock).mockResolvedValue({ rendered_content: "OK" });

    render(<PromptTemplatesTab />);
    // The component renders "Variables: " with a space if empty
    await waitFor(() => expect(screen.getByText("Variables:", { exact: false })).toBeInTheDocument());

    // Check that we can see the "Variables:" label but no variables
    const varsContainer = screen.getByText("Variables:", { exact: false });
    expect(varsContainer).toHaveTextContent("Variables:");
    expect(varsContainer).not.toHaveTextContent("input_text");

    await user.click(screen.getByTestId("edit-btn-legacy-test"));
    await user.click(screen.getByText("Test Render"));

    await waitFor(() => {
      expect(adminApi.testPromptTemplate).toHaveBeenCalledWith({
        template_content: "No vars",
        input_variables: {}
      });
    });
  });
});
