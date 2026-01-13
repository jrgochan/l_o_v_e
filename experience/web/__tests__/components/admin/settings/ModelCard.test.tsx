
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
    expect(screen.getByText("Q4_0")).toBeInTheDocument();
    expect(screen.getByText("llama")).toBeInTheDocument();
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

  it("renders correct badge for 8b models", () => {
    render(
      <ModelCard
        model={mockModel}
        usedByFunctions={[]}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );
    expect(screen.getByText("Balanced")).toBeInTheDocument();
  });

  it("renders active state and usage tags", () => {
    const usedFunctions = ["chat_response", "sentiment_analysis"];
    render(
      <ModelCard
        model={mockModel}
        usedByFunctions={usedFunctions}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Used by 2 functions:")).toBeInTheDocument();
    expect(screen.getByText("chat response")).toBeInTheDocument();
    expect(screen.getByText("sentiment analysis")).toBeInTheDocument();
  });

  it("renders ratings based on model size", () => {
    render(
      <ModelCard
        model={mockModel}
        usedByFunctions={[]}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );

    // 8b returns speed 4 (Very Fast) and quality 4 (Very Good)
    expect(screen.getByText("Very Fast")).toBeInTheDocument();
    expect(screen.getByText("Very Good")).toBeInTheDocument();
    expect(screen.getByText("10 GB")).toBeInTheDocument(); // RAM estimate for 8b
  });

  it("calls onAssign when assign button is clicked", () => {
    render(
      <ModelCard
        model={mockModel}
        usedByFunctions={[]}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /assign to function/i }));
    expect(mockOnAssign).toHaveBeenCalledWith(mockModel.name);
  });

  it("calls onDelete when delete button is clicked", () => {
    render(
      <ModelCard
        model={mockModel}
        usedByFunctions={[]}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(mockOnDelete).toHaveBeenCalledWith(mockModel.name);
  });
});
