/**
 * Tests for EmotionalControls Component
 *
 * Tests the canonical emotion buttons that allow users to explore
 * predefined emotional states.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmotionalControls } from "@/components/EmotionalControls";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { CANONICAL_EMOTIONS } from "@love/experience-shared";
import { act } from "@testing-library/react";

describe("EmotionalControls", () => {
  beforeEach(() => {
    const { reset } = useExperienceStore.getState();
    act(() => {
      reset();
    });
  });

  describe("Rendering", () => {
    it("renders the component title", () => {
      render(<EmotionalControls />);
      expect(screen.getByText("Canonical Emotions")).toBeInTheDocument();
    });

    it("renders all canonical emotion buttons", () => {
      render(<EmotionalControls />);

      const emotions = Object.values(CANONICAL_EMOTIONS);
      // Filter out neutral since it appears in "Reset to Neutral" button too
      const nonNeutralEmotions = emotions.filter((e) => e.name !== "Neutral");

      nonNeutralEmotions.forEach((emotion) => {
        const buttons = screen.getAllByRole("button");
        const found = buttons.some(
          (button) =>
            button.textContent?.includes(emotion.name) && button.textContent?.includes("V:")
        );
        expect(found).toBe(true);
      });
    });

    it("renders VAC values for each emotion", () => {
      render(<EmotionalControls />);

      // Check that VAC values are displayed (format: V:0.9 A:0.7 C:0.8)
      const buttons = screen.getAllByRole("button");

      // Each emotion button should show VAC values
      buttons.forEach((button) => {
        if (button.textContent?.includes("Reset")) return; // Skip reset button

        expect(button.textContent).toMatch(/V:[-\d.]+/);
        expect(button.textContent).toMatch(/A:[-\d.]+/);
        expect(button.textContent).toMatch(/C:[-\d.]+/);
      });
    });

    it("renders reset button", () => {
      render(<EmotionalControls />);
      expect(screen.getByRole("button", { name: /Reset to Neutral/i })).toBeInTheDocument();
    });
  });

  describe("Emotion Button Interactions", () => {
    it("sets target when emotion button clicked", async () => {
      const user = userEvent.setup();
      render(<EmotionalControls />);

      const joyButton = screen.getByRole("button", { name: /^Joy/i });
      await user.click(joyButton);

      const store = useExperienceStore.getState();
      expect(store.targetVAC).toEqual(CANONICAL_EMOTIONS.joy.vac);
      expect(store.isAnimating).toBe(true);
    });

    it("clicking different emotions updates target", async () => {
      const user = userEvent.setup();
      render(<EmotionalControls />);

      // Click Joy
      const joyButton = screen.getByRole("button", { name: /^Joy/i });
      await user.click(joyButton);

      let store = useExperienceStore.getState();
      expect(store.targetVAC).toEqual(CANONICAL_EMOTIONS.joy.vac);

      // Click Shame
      const shameButton = screen.getByRole("button", { name: /^Shame/i });
      await user.click(shameButton);

      store = useExperienceStore.getState();
      expect(store.targetVAC).toEqual(CANONICAL_EMOTIONS.shame.vac);
    });

    it("can select all canonical emotions", async () => {
      const user = userEvent.setup();
      render(<EmotionalControls />);

      const emotions = Object.entries(CANONICAL_EMOTIONS);

      for (const [, emotion] of emotions) {
        const buttons = screen.getAllByRole("button");
        const emotionButton = buttons.find(
          (button) =>
            button.textContent?.includes(emotion.name) && button.textContent?.includes("V:")
        );

        if (emotionButton) {
          await user.click(emotionButton);

          const store = useExperienceStore.getState();
          expect(store.targetVAC).toEqual(emotion.vac);
        }
      }
    });
  });

  describe("Reset Button", () => {
    it("resets store to neutral state", async () => {
      const user = userEvent.setup();
      render(<EmotionalControls />);

      // First set an emotion
      const joyButton = screen.getByRole("button", { name: /^Joy/i });
      await user.click(joyButton);

      // Then reset
      const resetButton = screen.getByRole("button", { name: /Reset to Neutral/i });
      await user.click(resetButton);

      const store = useExperienceStore.getState();
      expect(store.targetVAC).toEqual([0, 0, 0]);
      expect(store.currentVAC).toEqual([0, 0, 0]);
      expect(store.isAnimating).toBe(false);
    });
  });

  describe("Visual Styling", () => {
    it("applies positive color to positive valence emotions", () => {
      render(<EmotionalControls />);

      // Joy has positive valence, should have cyan background
      const joyButton = screen.getByRole("button", { name: /^Joy/i });
      expect(joyButton.className).toContain("bg-cyan-600");
    });

    it("applies negative color to negative valence emotions", () => {
      render(<EmotionalControls />);

      // Shame has negative valence, should have red background
      const shameButton = screen.getByRole("button", { name: /^Shame/i });
      expect(shameButton.className).toContain("bg-red-700");
    });
  });

  describe("Animation Indicator", () => {
    it("shows animating indicator when isAnimating is true", () => {
      // Set animating state
      act(() => {
        useExperienceStore.setState({ isAnimating: true });
      });

      render(<EmotionalControls />);
      expect(screen.getByText("Animating...")).toBeInTheDocument();
    });

    it("hides animating indicator when isAnimating is false", () => {
      // Ensure not animating
      act(() => {
        useExperienceStore.setState({ isAnimating: false });
      });

      render(<EmotionalControls />);
      expect(screen.queryByText("Animating...")).not.toBeInTheDocument();
    });

    it("shows animating after clicking emotion button", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<EmotionalControls />);

      const joyButton = screen.getByRole("button", { name: /^Joy/i });
      await user.click(joyButton);

      rerender(<EmotionalControls />);
      expect(screen.getByText("Animating...")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid button clicking", async () => {
      const user = userEvent.setup();
      render(<EmotionalControls />);

      const joyButton = screen.getByRole("button", { name: /^Joy/i });
      const shameButton = screen.getByRole("button", { name: /^Shame/i });

      // Rapid clicks
      await user.click(joyButton);
      await user.click(shameButton);
      await user.click(joyButton);

      // Should end with last clicked (Joy)
      const store = useExperienceStore.getState();
      expect(store.targetVAC).toEqual(CANONICAL_EMOTIONS.joy.vac);
    });

    it("reset works after multiple emotion selections", async () => {
      const user = userEvent.setup();
      render(<EmotionalControls />);

      // Click several emotions
      await user.click(screen.getByRole("button", { name: /^Joy/i }));
      await user.click(screen.getByRole("button", { name: /^Grief/i }));
      await user.click(screen.getByRole("button", { name: /^Calm/i }));

      // Reset
      await user.click(screen.getByRole("button", { name: /Reset to Neutral/i }));

      const store = useExperienceStore.getState();
      expect(store.targetVAC).toEqual([0, 0, 0]);
    });
  });

  describe("Accessibility", () => {
    it("all emotion buttons are keyboard accessible", () => {
      render(<EmotionalControls />);

      const emotions = Object.values(CANONICAL_EMOTIONS);
      // Filter out neutral to avoid ambiguity with "Reset to Neutral"
      const nonNeutralEmotions = emotions.filter((e) => e.name !== "Neutral");

      nonNeutralEmotions.forEach((emotion) => {
        const buttons = screen.getAllByRole("button");
        const emotionButton = buttons.find(
          (button) =>
            button.textContent?.includes(emotion.name) && button.textContent?.includes("V:")
        );
        expect(emotionButton).toBeDefined();
        expect(emotionButton).not.toHaveAttribute("tabindex", "-1");
      });
    });

    it("reset button is keyboard accessible", () => {
      render(<EmotionalControls />);

      const resetButton = screen.getByRole("button", { name: /Reset to Neutral/i });
      expect(resetButton).not.toHaveAttribute("tabindex", "-1");
    });

    it("has proper heading", () => {
      render(<EmotionalControls />);

      const heading = screen.getByRole("heading", { name: "Canonical Emotions" });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H3");
    });
  });

  describe("Button Content", () => {
    it("displays emotion name prominently", () => {
      render(<EmotionalControls />);

      const joyButton = screen.getByRole("button", { name: /^Joy/i });
      const buttonText = joyButton.textContent || "";

      expect(buttonText).toContain("Joy");
    });

    it("displays VAC values with one decimal place", () => {
      render(<EmotionalControls />);

      // Joy is [0.9, 0.7, 0.8]
      const joyButton = screen.getByRole("button", { name: /^Joy/i });
      const buttonText = joyButton.textContent || "";

      expect(buttonText).toContain("V:0.9");
      expect(buttonText).toContain("A:0.7");
      expect(buttonText).toContain("C:0.8");
    });

    it("formats negative values correctly", () => {
      render(<EmotionalControls />);

      // Shame has negative values
      const shameButton = screen.getByRole("button", { name: /^Shame/i });
      const buttonText = shameButton.textContent || "";

      // Should have negative signs
      expect(buttonText).toMatch(/V:-[\d.]+/);
      expect(buttonText).toMatch(/C:-[\d.]+/);
    });
  });
});
