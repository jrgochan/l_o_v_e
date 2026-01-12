/**
 * Tests for EmotionalInput Component
 *
 * Tests the text input form that submits to Listener API for emotional analysis.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmotionalInput } from "@/components/EmotionalInput";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { act } from "@testing-library/react";
import * as SharedAPI from "@love/experience-shared";

// Mock the analyzeText API call
jest.mock("@love/experience-shared", () => ({
  ...jest.requireActual("@love/experience-shared"),
  analyzeText: jest.fn(),
}));

const mockAnalyzeText = SharedAPI.analyzeText as jest.MockedFunction<typeof SharedAPI.analyzeText>;

// Mock response data
const mockResponse = {
  user_id: "web-user",
  session_id: "test-session",
  emotion: "Joy",
  category: "Places We Go When Life Is Good",
  vac: { valence: 0.9, arousal: 0.7, connection: 0.8 },
  confidence: 0.85,
  reasoning: "Positive valence and high arousal indicate joy",
  processing_time_ms: 150,
};

describe("EmotionalInput", () => {
  beforeEach(() => {
    const { reset } = useExperienceStore.getState();
    act(() => {
      reset();
    });
    mockAnalyzeText.mockClear();
  });

  describe("Rendering", () => {
    it("renders the component title", () => {
      render(<EmotionalInput />);
      expect(screen.getByText("Emotional Input")).toBeInTheDocument();
    });

    it("renders textarea with placeholder", () => {
      render(<EmotionalInput />);
      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("renders submit button", () => {
      render(<EmotionalInput />);
      expect(screen.getByRole("button", { name: /Analyze Emotion/i })).toBeInTheDocument();
    });

    it("renders helper text", () => {
      render(<EmotionalInput />);
      expect(
        screen.getByText(/Type a sentence describing your emotional state/i)
      ).toBeInTheDocument();
    });
  });

  describe("User Interaction", () => {
    it("allows typing in textarea", async () => {
      const user = userEvent.setup();
      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "I feel happy today");

      expect(textarea).toHaveValue("I feel happy today");
    });

    it("enables submit button when text is entered", async () => {
      const user = userEvent.setup();
      render(<EmotionalInput />);

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      expect(button).toBeDisabled();

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "I feel happy");

      expect(button).not.toBeDisabled();
    });

    it("keeps button disabled for whitespace-only text", async () => {
      const user = userEvent.setup();
      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "   ");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Successful Analysis", () => {
    it("calls analyzeText API on submit", async () => {
      const user = userEvent.setup();
      mockAnalyzeText.mockResolvedValue(mockResponse);

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "I feel amazing today!");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockAnalyzeText).toHaveBeenCalledWith(
          "I feel amazing today!",
          "web-user",
          expect.any(String)
        );
      });
    });

    it("updates store with analyzed VAC", async () => {
      const user = userEvent.setup();
      mockAnalyzeText.mockResolvedValue(mockResponse);

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "I feel great!");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        const store = useExperienceStore.getState();
        expect(store.targetVAC).toEqual([0.9, 0.7, 0.8]);
      });
    });

    it("displays detected emotion", async () => {
      const user = userEvent.setup();
      mockAnalyzeText.mockResolvedValue(mockResponse);

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "I feel wonderful!");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Detected:/i)).toBeInTheDocument();
        expect(screen.getByText("Joy")).toBeInTheDocument();
      });
    });

    it("clears input after successful analysis", async () => {
      const user = userEvent.setup();
      mockAnalyzeText.mockResolvedValue(mockResponse);

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(
        /Type how you're feeling/i
      ) as HTMLTextAreaElement;
      await user.type(textarea, "I feel happy!");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(textarea.value).toBe("");
      });
    });
  });

  describe("Loading State", () => {
    it("shows analyzing state during API call", async () => {
      const user = userEvent.setup();

      // Mock a delayed response
      mockAnalyzeText.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "I feel happy!");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      // Should show "Analyzing..." immediately
      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
      expect(button).toBeDisabled();
      expect(textarea).toBeDisabled();

      // Wait for completion
      await waitFor(
        () => {
          expect(screen.getByText(/Analyze Emotion/i)).toBeInTheDocument();
        },
        { timeout: 200 }
      );
    });
  });

  describe("Error Handling", () => {
    it("displays error message on API failure", async () => {
      const user = userEvent.setup();
      mockAnalyzeText.mockRejectedValue(new Error("Network error"));

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "I feel sad");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("shows API URL in error message", async () => {
      const user = userEvent.setup();
      mockAnalyzeText.mockRejectedValue(new Error("Connection failed"));

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "test");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Make sure Listener API is running/i)).toBeInTheDocument();
        expect(screen.getByText(/localhost:8002/i)).toBeInTheDocument();
      });
    });

    it("keeps text in textarea after error", async () => {
      const user = userEvent.setup();
      mockAnalyzeText.mockRejectedValue(new Error("Failed"));

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(
        /Type how you're feeling/i
      ) as HTMLTextAreaElement;
      await user.type(textarea, "I feel confused");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });

      // Text should still be there
      expect(textarea.value).toBe("I feel confused");
    });

    it("re-enables form after error", async () => {
      const user = userEvent.setup();
      mockAnalyzeText.mockRejectedValue(new Error("Failed"));

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "test");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });

      // Form should be enabled again
      expect(button).not.toBeDisabled();
      expect(textarea).not.toBeDisabled();
    });
  });

  describe("Form Validation", () => {
    it("prevents submission with empty text", async () => {
      const user = userEvent.setup();
      render(<EmotionalInput />);

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });

      // Try to click disabled button
      await user.click(button);

      // API should not be called
      expect(mockAnalyzeText).not.toHaveBeenCalled();
    });

    it("prevents submission during analysis", async () => {
      const user = userEvent.setup();

      // Mock a slow response
      mockAnalyzeText.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 500))
      );

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "I feel happy!");

      const button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      // Button should be disabled during analysis
      expect(button).toBeDisabled();

      // Multiple clicks shouldn't trigger multiple API calls
      await user.click(button);
      await user.click(button);

      await waitFor(
        () => {
          expect(screen.getByText(/Analyze Emotion/i)).toBeInTheDocument();
        },
        { timeout: 600 }
      );

      // Should only have called API once
      expect(mockAnalyzeText).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("uses semantic form element", () => {
      render(<EmotionalInput />);
      const form = screen.getByRole("button", { name: /Analyze Emotion/i }).closest("form");
      expect(form).toBeInTheDocument();
      expect(form?.tagName).toBe("FORM");
    });

    it("has proper heading", () => {
      render(<EmotionalInput />);
      const heading = screen.getByRole("heading", { name: "Emotional Input" });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H3");
    });

    it("textarea is keyboard accessible", () => {
      render(<EmotionalInput />);
      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      expect(textarea).not.toHaveAttribute("tabindex", "-1");
    });
  });

  describe("Multiple Submissions", () => {
    it("can submit multiple times", async () => {
      const user = userEvent.setup();

      // First analysis
      mockAnalyzeText.mockResolvedValueOnce(mockResponse);

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "I feel happy!");

      let button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Joy")).toBeInTheDocument();
      });

      // Second analysis
      const calmResponse = {
        ...mockResponse,
        emotion: "Calm",
        category: "Places We Go When Life Is Good",
        vac: { valence: 0.7, arousal: -0.5, connection: 0.6 },
        confidence: 0.8,
      };
      mockAnalyzeText.mockResolvedValueOnce(calmResponse);

      await user.type(textarea, "Now I feel peaceful");
      button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Calm")).toBeInTheDocument();
      });

      expect(mockAnalyzeText).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Recovery", () => {
    it("clears previous error on new submission", async () => {
      const user = userEvent.setup();

      // First call fails
      mockAnalyzeText.mockRejectedValueOnce(new Error("First error"));

      render(<EmotionalInput />);

      const textarea = screen.getByPlaceholderText(/Type how you're feeling/i);
      await user.type(textarea, "test");

      let button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("First error")).toBeInTheDocument();
      });

      // Second call succeeds
      mockAnalyzeText.mockResolvedValueOnce(mockResponse);

      await user.clear(textarea);
      await user.type(textarea, "I feel better now");
      button = screen.getByRole("button", { name: /Analyze Emotion/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.queryByText("First error")).not.toBeInTheDocument();
        expect(screen.getByText("Joy")).toBeInTheDocument();
      });
    });
  });
});
