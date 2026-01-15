import { render, screen, fireEvent } from "@testing-library/react";
import { MatrixHeader } from "@/components/admin/visualizations/PathMatrix/MatrixHeader";

describe("MatrixHeader", () => {
  const defaultProps = {
    viewMode: "emotions" as const,
    onViewModeChange: jest.fn(),
    isComputing: false,
    isLoadingCache: false,
    progress: { current: 0, total: 100, percentage: 0 },
    estimatedTimeRemaining: "5 mins",
    stats: { computed: 50, totalPossible: 100, percentage: "50.0" },
    onLoadCache: jest.fn(),
    onComputeAll: jest.fn(),
    onExport: jest.fn(),
    onClose: jest.fn(),
  };

  it("renders correctly in default state", () => {
    render(<MatrixHeader {...defaultProps} />);
    expect(screen.getByText("Emotion Transition Matrix")).toBeInTheDocument();
    expect(
      screen.getByText("87×87 grid showing all possible emotional transitions")
    ).toBeInTheDocument();
    expect(screen.getByText(/Computed:/)).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText(/\(50\.0%\)/)).toBeInTheDocument();
  });

  it("handles view mode toggle", () => {
    render(<MatrixHeader {...defaultProps} />);

    const categoriesBtn = screen.getByText(/Categories/);
    fireEvent.click(categoriesBtn);
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith("categories");

    const emotionsBtn = screen.getByText(/Emotions/);
    fireEvent.click(emotionsBtn);
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith("emotions");
  });

  it("highlights active view mode button", () => {
    const { rerender } = render(<MatrixHeader {...defaultProps} viewMode="emotions" />);
    const emotionsBtn = screen.getByText(/Emotions/).closest("button");
    const categoriesBtn = screen.getByText(/Categories/).closest("button");

    expect(emotionsBtn).toHaveClass("bg-cyan-600");
    expect(categoriesBtn).not.toHaveClass("bg-cyan-600");

    rerender(<MatrixHeader {...defaultProps} viewMode="categories" />);
    expect(screen.getByText(/Emotions/).closest("button")).not.toHaveClass("bg-cyan-600");
    expect(screen.getByText(/Categories/).closest("button")).toHaveClass("bg-cyan-600");
  });

  it("renders computing state correctly", () => {
    render(
      <MatrixHeader
        {...defaultProps}
        isComputing={true}
        progress={{ current: 10, total: 100, percentage: 10 }}
        estimatedTimeRemaining="2 mins"
      />
    );

    expect(screen.getByText(/Computing: 10 \/ 100 \(10%\)/)).toBeInTheDocument();
    expect(screen.getByText("2 mins")).toBeInTheDocument();
    expect(screen.queryByText("Load Cached Paths")).not.toBeInTheDocument(); // Controls hidden
    expect(screen.getByText("Close")).toBeDisabled();
  });

  it("renders loading cache state correctly", () => {
    render(<MatrixHeader {...defaultProps} isLoadingCache={true} />);
    expect(screen.getByText("Loading cache...")).toBeInTheDocument();
    expect(screen.queryByText("Load Cached Paths")).not.toBeInTheDocument();
  });

  it("renders action buttons based on stats", () => {
    // Computed < Total -> Show Compute All
    // Computed > 0 -> Show Export
    render(<MatrixHeader {...defaultProps} />);

    expect(screen.getByText("Load Cached Paths")).toBeInTheDocument();
    expect(screen.getByText("Compute All Paths")).toBeInTheDocument();
    expect(screen.getByText("Export CSV")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Load Cached Paths"));
    expect(defaultProps.onLoadCache).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Compute All Paths"));
    expect(defaultProps.onComputeAll).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Export CSV"));
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  it("hides Compute All when fully computed", () => {
    render(
      <MatrixHeader
        {...defaultProps}
        stats={{ computed: 100, totalPossible: 100, percentage: "100.0" }}
      />
    );
    expect(screen.queryByText("Compute All Paths")).not.toBeInTheDocument();
  });

  it("hides Export when nothing computed", () => {
    render(
      <MatrixHeader
        {...defaultProps}
        stats={{ computed: 0, totalPossible: 100, percentage: "0.0" }}
      />
    );
    expect(screen.queryByText("Export CSV")).not.toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<MatrixHeader {...defaultProps} />);
    fireEvent.click(screen.getByText("Close"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
