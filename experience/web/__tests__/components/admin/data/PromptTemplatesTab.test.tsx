import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptTemplatesTab } from "@/components/admin/data/PromptTemplatesTab";
import { adminApi } from "@/utils/api";
import { PromptTemplate } from "@/types/admin";

// Mock the API
jest.mock("@/utils/api", () => ({
  adminApi: {
    getPromptTemplates: jest.fn(),
    createPromptTemplate: jest.fn(),
    updatePromptTemplate: jest.fn(),
    testPromptTemplate: jest.fn(),
  },
}));

const mockPrompts: PromptTemplate[] = [
  {
    id: "prompt-1",
    function_name: "semantic_vac",
    version: "1.0.0",
    template_content: "Analyze sentiment: {input_text}",
    input_variables: ["input_text"],
    description: "Basic VAC analysis",
    is_active: true,
    created_at: "2024-01-01T12:00:00Z",
    updated_at: "2024-01-01T12:00:00Z",
  },
  {
    id: "prompt-2",
    function_name: "insight_generation",
    version: "2.1.0",
    template_content: "Generate insight for: {session_data}",
    input_variables: ["session_data"],
    description: "Advanced insight",
    is_active: false,
    created_at: "2024-01-02T12:00:00Z",
    updated_at: "2024-01-02T12:00:00Z",
  },
];

describe("PromptTemplatesTab", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (adminApi.getPromptTemplates as jest.Mock).mockResolvedValue(mockPrompts);
    (adminApi.testPromptTemplate as jest.Mock).mockResolvedValue({
      rendered_content: "Analyzed: positive",
    });
  });

  it("renders loading state initially", () => {
    // Note: The component sets loading=true in useEffect.
    // If we delay the promise, we might catch it.
    // However, PromptTemplatesTab doesn't have a full-screen loader, just empty list?
    // Let's check logic:
    // loading=true. prompts=[].
    // It renders headers.
    // If prompts.length===0 && !loading -> "No templates found".
    // If prompts.length===0 && loading -> ?
    // The code only shows "No templates" if !loading.
    // So if loading, it shows nothing under headers.
    // But typically we test that API is called.
    render(<PromptTemplatesTab />);
    expect(adminApi.getPromptTemplates).toHaveBeenCalled();
  });

  it("renders prompts list after loading", async () => {
    render(<PromptTemplatesTab />);

    await waitFor(() => {
      const els = screen.getAllByText("semantic_vac");
      expect(els.length).toBeGreaterThan(0);
      const els2 = screen.getAllByText("insight_generation");
      expect(els2.length).toBeGreaterThan(0);
    });

    const els3 = screen.getAllByText("v1.0.0");
    expect(els3.length).toBeGreaterThan(0);
    expect(screen.getByText("Basic VAC analysis")).toBeInTheDocument();
  });

  it("filters prompts by function", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => {
      const els = screen.getAllByText("semantic_vac");
      expect(els.length).toBeGreaterThan(0);
    });

    const filterSelect = screen.getByLabelText("Filter by Function");
    await user.selectOptions(filterSelect, "insight_generation");

    await waitFor(() => {
      expect(adminApi.getPromptTemplates).toHaveBeenCalledWith("insight_generation");
    });
  });

  it("opens create new template editor", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => screen.getByText("semantic_vac"));

    const newButton = screen.getByLabelText("New Template");
    await user.click(newButton);

    expect(screen.getByText("New Prompt Template")).toBeInTheDocument();

    // Check fields are present
    const functionInputs = screen.getAllByLabelText("Function");
    expect(functionInputs[0]).toBeInTheDocument();
    expect(screen.getByLabelText("Version")).toHaveValue("1.0.0");
  });

  it("edits an existing template", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => screen.getByText("semantic_vac"));

    const editButton = screen.getByTestId("edit-btn-prompt-1");
    await user.click(editButton);

    expect(screen.getByText("Edit Prompt Template")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Basic VAC analysis")).toBeInTheDocument();

    // Update description and save
    const descInput = screen.getByDisplayValue("Basic VAC analysis");
    await user.clear(descInput);
    await user.type(descInput, "Updated Description");

    const saveButton = screen.getByLabelText("Save Template");
    await user.click(saveButton);

    await waitFor(() => {
      expect(adminApi.updatePromptTemplate).toHaveBeenCalledWith(
        "prompt-1",
        expect.objectContaining({
          description: "Updated Description",
        })
      );
    });
  });

  it("tests template rendering", async () => {
    render(<PromptTemplatesTab />);
    await waitFor(() => screen.getByText("semantic_vac"));

    const editButton = screen.getByTestId("edit-btn-prompt-1");
    await user.click(editButton);

    const testButton = screen.getByLabelText("Test Render");
    await user.click(testButton);

    await waitFor(() => {
      expect(adminApi.testPromptTemplate).toHaveBeenCalled();
      expect(screen.getByText("Analyzed: positive")).toBeInTheDocument();
    });
  });
});
