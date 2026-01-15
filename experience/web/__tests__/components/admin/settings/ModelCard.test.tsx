import { render, screen, fireEvent } from "@testing-library/react";
import { ModelCard } from "@/components/admin/settings/ModelCard";
import type { ModelInfo } from "@/hooks/useOllamaModels";

const mockModel: ModelInfo = {
  name: "llama3:8b",
  size: 5000000000,
  digest: "sha256:1234567890",
  modified_at: "2024-01-01T00:00:00.000Z",
  details: {
    parent_model: "",
    format: "gguf",
    family: "llama",
    families: ["llama"],
    parameter_size: "8b",
    quantization_level: "Q4_0",
  },
  parameter_size: "8b",
  quantization: "Q4_0",
  family: "llama",
};

describe("ModelCard", () => {
  const mockOnDelete = jest.fn();
  const mockOnAssign = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders model information correctly", () => {
    render(
      <ModelCard
        model={mockModel}
        usedByFunctions={[]}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );

    expect(screen.getByText("llama3:8b")).toBeInTheDocument();
    expect(screen.getByText("4.7 GB")).toBeInTheDocument(); // 5000000000 bytes
    expect(screen.getByText("8b params")).toBeInTheDocument();
  });

  it("handles model with no parameter details gracefully", () => {
    const noParamsModel = { ...mockModel, parameter_size: undefined };
    render(
      <ModelCard
        model={noParamsModel as any}
        usedByFunctions={[]}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );
    // Should default to Speed 5 (Very Fast), Quality 3 (Good), RAM 4-6 GB
    expect(screen.getByText("Very Fast")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText("4-6 GB")).toBeInTheDocument();
  });

  it("renders correct usage text for single function", () => {
    const usedFunctions = ["chat_response"];
    render(
      <ModelCard
        model={mockModel}
        usedByFunctions={usedFunctions}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );
    expect(screen.getByText("Used by 1 function:")).toBeInTheDocument();
  });

  it("renders correct usage text for multiple functions", () => {
    const usedFunctions = ["chat_response", "sentiment"];
    render(
      <ModelCard
        model={mockModel}
        usedByFunctions={usedFunctions}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );
    expect(screen.getByText("Used by 2 functions:")).toBeInTheDocument();
  });

  it("renders correct badge for 70b models", () => {
    const hugeModel = { ...mockModel, parameter_size: "70b" };
    render(
      <ModelCard
        model={hugeModel}
        usedByFunctions={[]}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );
    expect(screen.getByText("Clinical Grade")).toBeInTheDocument();
  });

  it("calls buttons", () => {
    render(
      <ModelCard
        model={mockModel}
        usedByFunctions={[]}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /assign to function/i }));
    expect(mockOnAssign).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(mockOnDelete).toHaveBeenCalled();
  });

  describe("Rating Helpers", () => {
    const testCases = [
      {
        size: "70b",
        speed: "Moderate",
        quality: "Excellent",
        ram: "48+ GB",
        badge: "Clinical Grade",
      },
      { size: "34b", speed: "Moderate", quality: "Excellent", ram: "32 GB", badge: null },
      { size: "8x7b", speed: "Fast", quality: "Excellent", ram: "32 GB", badge: "High Quality" },
      { size: "13b", speed: "Fast", quality: "Very Good", ram: "16 GB", badge: null },
      { size: "8b", speed: "Very Fast", quality: "Very Good", ram: "10 GB", badge: "Balanced" },
      { size: "3b", speed: "Very Fast", quality: "Good", ram: "4-6 GB", badge: "Fast & Efficient" },
      { size: "1b", speed: "Very Fast", quality: "Good", ram: "4-6 GB", badge: null },
    ];

    testCases.forEach(({ size, speed, quality, ram, badge }) => {
      it(`renders correct ratings for ${size}`, () => {
        let expectedBadge = badge;
        if (size === "34b") expectedBadge = null;
        const model = {
          ...mockModel,
          parameter_size: size,
          name: size.includes("3b") ? "mini" : "model",
        };

        render(
          <ModelCard
            model={model}
            usedByFunctions={[]}
            onDelete={mockOnDelete}
            onAssign={mockOnAssign}
          />
        );

        if (speed) expect(screen.getByText(speed)).toBeInTheDocument();
        if (quality) expect(screen.getByText(quality)).toBeInTheDocument();
        if (ram) expect(screen.getByText(ram)).toBeInTheDocument();
        if (expectedBadge) expect(screen.getByText(expectedBadge)).toBeInTheDocument();
      });
    });
  });
});
