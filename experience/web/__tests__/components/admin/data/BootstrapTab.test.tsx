
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import BootstrapTab from "@/components/admin/data/BootstrapTab";
import { adminApi } from "@/utils/api";

jest.mock("@/utils/api", () => ({
  adminApi: {
    getBootstrapData: jest.fn(),
    createBootstrapData: jest.fn(),
    updateBootstrapData: jest.fn(),
    deleteBootstrapData: jest.fn(),
  },
}));

describe("BootstrapTab", () => {
  const mockData = [
    {
      id: "b1",
      data_type: "strategy_effectiveness",
      data_category: "cat1",
      content: { foo: "bar" },
      created_at: "2024-01-01T00:00:00Z"
    },
    {
      id: "b2",
      data_type: "path_template",
      data_category: null,
      content: { baz: "qux" },
      created_at: "2024-02-01T00:00:00Z"
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockReturnValue(new Promise(() => { }));
    const { container } = render(<BootstrapTab />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders data list on success", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    render(<BootstrapTab />);

    await waitFor(() => {
      expect(screen.getByText("cat1")).toBeInTheDocument();
    });

    expect(screen.getAllByText("strategy_effectiveness").length).toBeGreaterThan(0);
    expect(screen.getAllByText("path_template").length).toBeGreaterThan(0);
    // Verify JSON content display
    expect(screen.getByText(/"foo": "bar"/)).toBeInTheDocument();
  });

  it("handles filter change", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    render(<BootstrapTab />);

    await waitFor(() => {
      expect(adminApi.getBootstrapData).toHaveBeenCalledWith(undefined);
    });

    const filter = screen.getByLabelText("Filter by Type");
    fireEvent.change(filter, { target: { value: "path_template" } });

    await waitFor(() => {
      expect(adminApi.getBootstrapData).toHaveBeenCalledWith("path_template");
    });
  });

  it("handles item deletion", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    (adminApi.deleteBootstrapData as jest.Mock).mockResolvedValue({});

    // Mock confirm
    window.confirm = jest.fn(() => true);

    render(<BootstrapTab />);
    await waitFor(() => expect(screen.getByText("cat1")).toBeInTheDocument());

    const deleteBtn = screen.getByTestId("delete-btn-b1");
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(adminApi.deleteBootstrapData).toHaveBeenCalledWith("b1");
      expect(adminApi.getBootstrapData).toHaveBeenCalledTimes(2); // Reload triggered
    });
  });

  it("cancels deletion if not confirmed", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    window.confirm = jest.fn(() => false);

    render(<BootstrapTab />);
    await waitFor(() => expect(screen.getByText("cat1")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("delete-btn-b1"));
    expect(adminApi.deleteBootstrapData).not.toHaveBeenCalled();
  });

  it("handles item creation flow", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    (adminApi.createBootstrapData as jest.Mock).mockResolvedValue({});

    render(<BootstrapTab />);
    await waitFor(() => expect(screen.getByText("cat1")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Add Item"));

    // Check form appears
    expect(screen.getByText("New Item")).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: "New Cat" } });
    fireEvent.change(screen.getByLabelText(/JSON Content/), { target: { value: '{"new": "val"}' } });

    fireEvent.click(screen.getByLabelText("Save Item"));

    await waitFor(() => {
      expect(adminApi.createBootstrapData).toHaveBeenCalledWith(expect.objectContaining({
        data_category: "New Cat",
        content: { new: "val" }
      }));
      expect(adminApi.getBootstrapData).toHaveBeenCalledTimes(2); // Reload
    });

    // Should return to list view
    expect(screen.queryByText("New Item")).not.toBeInTheDocument();
  });

  it("handles item edit flow", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    (adminApi.updateBootstrapData as jest.Mock).mockResolvedValue({});

    render(<BootstrapTab />);
    await waitFor(() => expect(screen.getByText("cat1")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("edit-btn-b1"));

    expect(screen.getByText("Edit Item")).toBeInTheDocument();
    expect(screen.getByDisplayValue("cat1")).toBeInTheDocument();

    // Change value
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: "Updated Cat" } });

    fireEvent.click(screen.getByLabelText("Save Item"));

    await waitFor(() => {
      expect(adminApi.updateBootstrapData).toHaveBeenCalledWith("b1", expect.objectContaining({
        data_category: "Updated Cat"
      }));
    });
  });

  it("handles fetch error", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockRejectedValue(new Error("Fetch failed"));
    render(<BootstrapTab />);

    await waitFor(() => {
      // It logs error but might not show UI error? 
      // The component code: console.error(...); setError("Failed to load data");
      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    });
  });

  it("handles cancel edit", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    render(<BootstrapTab />);
    await waitFor(() => expect(screen.getByText("cat1")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Add Item"));
    expect(screen.getByText("New Item")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Cancel"));
    expect(screen.queryByText("New Item")).not.toBeInTheDocument();
  });

  it("handles type change in edit", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    render(<BootstrapTab />);
    await waitFor(() => expect(screen.getByText("cat1")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Add Item"));

    const select = screen.getByLabelText("Data Type");
    fireEvent.change(select, { target: { value: "path_template" } });

    expect(select).toHaveValue("path_template");
  });

  it("handles invalid JSON in editor", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    render(<BootstrapTab />);
    await waitFor(() => expect(screen.getByText("cat1")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Add Item"));

    const jsonInput = screen.getByLabelText(/JSON Content/);

    // Invalid JSON input (component swallows error but doesn't update state)
    // Or if component allows typing but doesn't update internal 'content' object?
    // Let's see: `onChange` tries `JSON.parse`. If fails, catches. 
    // It does NOT update `currentEdit.content`. 
    // BUT since it's controlled `value={...JSON.stringify...}`, 
    // if `currentEdit.content` doesn't update, the textarea value will revert to old valid json!
    // This is a UI quirk in the component "Allow simple editing...".
    // "For now, we rely on the user pasting valid JSON or careful editing"
    // Actually if `currentEdit.content` is not updated, the textarea will rerender with the old value immediately, preventing typing invalid json!
    // Wait, the component code is:
    /*
     value={JSON.stringify(currentEdit.content, null, 2)}
     onChange={(e) => {
       try {
         const parsed = JSON.parse(e.target.value);
         setCurrentEdit({ ...currentEdit, content: parsed });
       } catch {}
     }}
    */
    // YES, this component implementation prevents typing partial JSON. You can only type/paste VALID full JSON at once.
    // This is a known issue/feature. 
    // Testing this: if I fireChange with invalid JSON, the state won't update.

    // However, Jest fireEvent/Simulate doesn't exactly simulate the "revert" visually unless we check what happens.
    // If I fire "{" (invalid), state not updated. value remains `{}` (default).
    // So let's test that protection.

    const initialValue = jsonInput.textContent || jsonInput.value; // likely "{}"
    fireEvent.change(jsonInput, { target: { value: "{" } });

    // Since state didn't update, the rerender should show initialValue
    expect(jsonInput).toHaveValue(initialValue);
  });

  it("handles save error", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    (adminApi.updateBootstrapData as jest.Mock).mockRejectedValue(new Error("Save failed"));

    render(<BootstrapTab />);
    await waitFor(() => expect(screen.getByText("cat1")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("edit-btn-b1"));
    fireEvent.click(screen.getByLabelText("Save Item"));

    await waitFor(() => {
      expect(screen.getByText(/Failed to save item/)).toBeInTheDocument();
    });
  });

  it("handles delete error", async () => {
    (adminApi.getBootstrapData as jest.Mock).mockResolvedValue(mockData);
    (adminApi.deleteBootstrapData as jest.Mock).mockRejectedValue(new Error("Delete failed"));
    window.confirm = jest.fn(() => true);

    render(<BootstrapTab />);
    await waitFor(() => expect(screen.getByText("cat1")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("delete-btn-b1"));

    await waitFor(() => {
      expect(screen.getByText("Failed to delete item")).toBeInTheDocument();
    });
  });
});
