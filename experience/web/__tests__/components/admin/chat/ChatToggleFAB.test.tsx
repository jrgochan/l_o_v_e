import { render, screen, fireEvent } from "@testing-library/react";
import { ChatToggleFAB } from "@/components/admin/chat/ChatToggleFAB";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

// Mock useAdminTheme
jest.mock("@/hooks/admin/useAdminTheme");

describe("ChatToggleFAB", () => {
  const mockTheme = {
    colors: {
      primary: "bg-cyan-500",
      border: "border-cyan-200",
    },
    effects: {
      glass: "backdrop-blur-md",
    },
  };

  beforeEach(() => {
    (useAdminTheme as jest.Mock).mockReturnValue(mockTheme);
  });

  it("renders with correct theme classes", () => {
    render(<ChatToggleFAB onClick={jest.fn()} />);

    const button = screen.getByRole("button", { name: /open emotional chat/i });
    expect(button).toHaveClass("bg-cyan-500");
    expect(button).toHaveClass("backdrop-blur-md");
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = jest.fn();
    render(<ChatToggleFAB onClick={handleClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("shows unread badge when isUnread is true", () => {
    const { container } = render(<ChatToggleFAB onClick={jest.fn()} isUnread={true} />);

    // The badge is an empty span with bg-red-500
    // We can query by class or assume structure
    const badge = container.querySelector(".bg-red-500");
    expect(badge).toBeInTheDocument();
  });

  it("hides unread badge when isUnread is false", () => {
    const { container } = render(<ChatToggleFAB onClick={jest.fn()} isUnread={false} />);

    const badge = container.querySelector(".bg-red-500");
    expect(badge).not.toBeInTheDocument();
  });
});
