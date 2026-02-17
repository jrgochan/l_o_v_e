import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import ConsentGate from "@/components/auth/ConsentGate";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/utils/api";

// Mock Stores and API
jest.mock("@/stores/authStore");
jest.mock("@/utils/api", () => ({
  api: {
    post: jest.fn(),
  },
}));

// Mock Headless UI to avoid animation issues/portal issues in test if needed,
// but usually simplified mocks for Transition help.
// For now, let's try testing without mocking Headless UI deep internals,
// just standard render. If it fails due to Portal/Transition, we'll mock.
// Actually, Headless UI Dialog renders into a portal usually.
// We might need to check document.body or baseElement.

afterEach(cleanup);

describe("ConsentGate", () => {
  const mockOutstandingPolicies = [
    { key: "terms", title: "Terms of Service", description: "Terms desc", required: true },
    { key: "privacy", title: "Privacy Policy", description: "Privacy desc", required: true },
    { key: "marketing", title: "Marketing", description: "Marketing desc", required: false },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      consentRequired: true,
      outstandingPolicies: mockOutstandingPolicies,
    });

    // Mock setState on the store itself since the component calls useAuthStore.setState
    (useAuthStore as any).setState = jest.fn();
  });

  it("renders children directly if consent not required", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      consentRequired: false,
      outstandingPolicies: [],
    });

    render(
      <ConsentGate>
        <div data-testid="protected-content">Protected Content</div>
      </ConsentGate>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.queryByText("Policy Updates Required")).not.toBeInTheDocument();
  });

  it("renders modal when consent required", async () => {
    render(
      <ConsentGate>
        <div data-testid="protected-content">Protected Content</div>
      </ConsentGate>
    );

    // Headless UI Dialog might render asynchronously or in a portal
    await waitFor(() => {
      expect(screen.getByText("Policy Updates Required")).toBeInTheDocument();
    });

    // Content should be present but maybe blurred/inert
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("pre-selects required policies", async () => {
    render(
      <ConsentGate>
        <div />
      </ConsentGate>
    );

    await waitFor(() => {
      expect(screen.getByText("Policy Updates Required")).toBeInTheDocument();
    });

    const termsCheckbox = screen.getByLabelText(/Terms of Service/);
    const privacyCheckbox = screen.getByLabelText(/Privacy Policy/);
    const marketingCheckbox = screen.getByLabelText(/Marketing/);

    expect(termsCheckbox).toBeChecked();
    expect(privacyCheckbox).toBeChecked();
    expect(marketingCheckbox).not.toBeChecked();
  });

  it("toggles policies", async () => {
    render(
      <ConsentGate>
        <div />
      </ConsentGate>
    );
    await waitFor(() => screen.getByText("Policy Updates Required"));

    const marketingCheckbox = screen.getByLabelText(/Marketing/);
    fireEvent.click(marketingCheckbox);
    expect(marketingCheckbox).toBeChecked();

    fireEvent.click(marketingCheckbox);
    expect(marketingCheckbox).not.toBeChecked();
  });

  it("disables submit if required policies unchecked", async () => {
    render(
      <ConsentGate>
        <div />
      </ConsentGate>
    );
    await waitFor(() => screen.getByText("Policy Updates Required"));

    const termsCheckbox = screen.getByLabelText(/Terms of Service/);
    const submitBtn = screen.getByText("Accept & Continue");

    expect(submitBtn).toBeEnabled();

    fireEvent.click(termsCheckbox); // Uncheck required
    expect(termsCheckbox).not.toBeChecked();
    expect(submitBtn).toBeDisabled();
  });

  it("submits consents successfully", async () => {
    (api.post as jest.Mock).mockResolvedValue({ success: true });

    render(
      <ConsentGate>
        <div />
      </ConsentGate>
    );
    await waitFor(() => screen.getByText("Policy Updates Required"));

    const submitBtn = screen.getByText("Accept & Continue");
    fireEvent.click(submitBtn);

    expect(api.post).toHaveBeenCalledWith("/consent/me", {
      policy_keys: ["terms", "privacy"], // Default required ones
    });

    await waitFor(() => {
      // Check if store updated
      expect((useAuthStore as any).setState).toHaveBeenCalledWith({
        consentRequired: false,
        outstandingPolicies: [],
      });
    });
  });

  it("handles submission error", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("API Error"));

    render(
      <ConsentGate>
        <div />
      </ConsentGate>
    );
    await waitFor(() => screen.getByText("Policy Updates Required"));

    const submitBtn = screen.getByText("Accept & Continue");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });

  it("handles non-Error submission failure", async () => {
    (api.post as jest.Mock).mockRejectedValue("String Error"); // Not an Error object

    render(
      <ConsentGate>
        <div />
      </ConsentGate>
    );
    await waitFor(() => screen.getByText("Policy Updates Required"));

    const submitBtn = screen.getByText("Accept & Continue");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Failed to grant consents")).toBeInTheDocument();
    });
  });

  it("calls generic onClose (coverage)", async () => {
    render(
      <ConsentGate>
        <div />
      </ConsentGate>
    );
    await waitFor(() => screen.getByText("Policy Updates Required"));
    fireEvent.keyDown(window, { key: "Escape" });
  });

  it("expands policy details and rotates chevron", async () => {
    render(
      <ConsentGate>
        <div />
      </ConsentGate>
    );
    await waitFor(() => screen.getByText("Policy Updates Required"));

    // Find the first disclosure button (for Terms)
    const buttons = screen.getAllByRole("button");
    const termsButton = buttons[0]; // Assuming order: Terms, Privacy, Marketing, Submit

    // Initially closed
    expect(screen.queryByText("Terms desc")).not.toBeInTheDocument();
    // Chevron handling: depends on how Lucide renders. Usually SVG.
    // We can check if the button (or SVG inside) has rotate class?
    // The class is on the icon.
    // SVG usually has "lucide-chevron-down" class or similar if from lucide-react?
    // Or we can check if the icon inside the button has the class.
    const icon = termsButton.querySelector("svg");
    expect(icon).not.toHaveClass("rotate-180");

    // Click to open
    fireEvent.click(termsButton);
    await waitFor(() => {
      expect(screen.getByText("Terms desc")).toBeInTheDocument();
    });
    expect(icon).toHaveClass("rotate-180");
  });
});
