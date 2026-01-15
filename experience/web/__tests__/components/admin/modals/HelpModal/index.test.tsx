import { render, screen, fireEvent } from "@testing-library/react";
import { HelpModal } from "@/components/admin/modals/HelpModal";

describe("HelpModal", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal content", () => {
    render(<HelpModal onClose={onClose} />);
    expect(screen.getByText("Soul Sphere Atlas - Help & Guide")).toBeInTheDocument();
    // Default tab is Model
    expect(screen.getByText("What is the Soul Sphere?")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(<HelpModal onClose={onClose} />);
    const closeBtn = screen.getByText("Close");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("switches tabs correctly", () => {
    render(<HelpModal onClose={onClose} />);

    // Switch to Usage tab
    fireEvent.click(screen.getByText("🎯 How to Use"));
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.queryByText("What is the Soul Sphere?")).not.toBeInTheDocument();

    // Switch to Shortcuts tab
    fireEvent.click(screen.getByText("⌨️ Shortcuts"));
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

    // Switch to Concepts tab
    fireEvent.click(screen.getByText("🌟 Key Concepts"));
    expect(screen.getByText("The 87 Emotions")).toBeInTheDocument();

    // Switch back to Model tab
    fireEvent.click(screen.getByText("🧠 VAC Model & Soul Sphere"));
    expect(screen.getByText("What is the Soul Sphere?")).toBeInTheDocument();
  });

  it("renders specific content in Model tab", () => {
    render(<HelpModal onClose={onClose} />);
    expect(screen.getByText("The VAC Model")).toBeInTheDocument();
    expect(screen.getByText("Valence-Arousal-Connection")).toBeInTheDocument();
    // Check for specific sub-sections
    expect(screen.getByText("Why Connection Matters")).toBeInTheDocument();
  });

  it("renders specific content in Concepts tab", () => {
    render(<HelpModal onClose={onClose} />);
    fireEvent.click(screen.getByText("🌟 Key Concepts"));
    // Check for bridge emotions list
    expect(screen.getByText("Bridge Emotions (6 Gateway States)")).toBeInTheDocument();
    expect(screen.getByText("Vulnerability")).toBeInTheDocument();
    expect(screen.getByText("Awe")).toBeInTheDocument();
  });
});
