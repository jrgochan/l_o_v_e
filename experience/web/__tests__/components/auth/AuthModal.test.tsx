import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuthStore } from "@/stores/authStore";

// Mock Auth Store
jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(),
}));

describe("AuthModal", () => {
  const mockLogin = jest.fn();
  const mockRegister = jest.fn();
  const mockOnClose = jest.fn();

  const defaultStoreState = {
    login: mockLogin,
    register: mockRegister,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(defaultStoreState)
    );
  });

  it("does not render when closed", () => {
    render(<AuthModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText("Welcome Back")).not.toBeInTheDocument();
  });

  it("renders login mode by default", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    // Tab and Submit button both say "Sign In"
    const buttons = screen.getAllByRole("button", { name: "Sign In" });
    expect(buttons.length).toBeGreaterThan(1);

    expect(screen.queryByPlaceholderText("Full Name")).not.toBeInTheDocument();
  });

  it("switches to register mode", async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Click the "Create Account" tab (initially only one button with this name)
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Full Name" })).toBeInTheDocument();

    // Now there should be two "Create Account" buttons (Tab + Submit)
    const buttons = screen.getAllByRole("button", { name: "Create Account" });
    expect(buttons.length).toBeGreaterThan(1);
  });

  it("switches back to login mode", async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Switch to register first
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();

    // Switch back to login
    // "Sign In" tab is present
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Full Name")).not.toBeInTheDocument();
  });

  it("calls login on submit", async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    await user.type(screen.getByRole("textbox", { name: "Email Address" }), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");

    // "Sign In" is present on both Tab and Submit button.
    // The submit button is likely the second one, or we can look for the one in the form (harder without testid).
    // Let's use getAllByRole and click the second one (Submit)
    const buttons = screen.getAllByRole("button", { name: "Sign In" });
    await user.click(buttons[1]);

    expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls register on submit", async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Switch to register check the tab.
    // Initially "Create Account" is only the tab.
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await user.type(screen.getByRole("textbox", { name: "Email Address" }), "new@example.com");
    await user.type(screen.getByRole("textbox", { name: "Full Name" }), "New User");
    await user.type(screen.getByLabelText("Password"), "securepass");

    // Check consents
    await user.click(screen.getByLabelText(/Terms of Service/i));
    await user.click(screen.getByLabelText(/Privacy Policy/i));

    // Now click submit "Create Account".
    // Re-query buttons to ensure we get the enabled one (though waitFor/disabled check handled by userEvent usually)
    const submitBtn = screen.getAllByRole("button", { name: "Create Account" })[1];
    await user.click(submitBtn);

    expect(mockRegister).toHaveBeenCalledWith("new@example.com", "securepass", "New User", ["terms_of_service", "privacy_policy"]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("displays error message from store", () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        ...defaultStoreState,
        error: "Invalid credentials",
      })
    );

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("disables submit while loading", () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        ...defaultStoreState,
        isLoading: true,
      })
    );

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Loading...")).toBeDisabled();
  });
});
