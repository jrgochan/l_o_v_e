import { render, fireEvent } from "@testing-library/react";
import { AnimationModeSelector } from "../../../../../components/admin/panels/ControlPanel/AnimationModeSelector";

describe("AnimationModeSelector", () => {
  it("should render all options", () => {
    const { getByText } = render(
      <AnimationModeSelector currentMode="subtle" onModeChange={jest.fn()} />
    );
    expect(getByText(/Subtle/)).toBeInTheDocument();
    expect(getByText(/Dynamic/)).toBeInTheDocument();
    expect(getByText(/Mystical/)).toBeInTheDocument();
  });

  it("should highlight active mode", () => {
    const { getByText } = render(
      <AnimationModeSelector currentMode="dynamic" onModeChange={jest.fn()} />
    );
    // Dynamic should have bg-orange-600 (or visually distinct style, checking text presence of visible indicator logic)
    // The component renders a checkmark "✓" only for active mode
    // We can check if checkmark is near Dynamic?
    // Or check classes.
    // Let's check classes for simplicity and robustness if classes are stable.
    const dynamicButton = getByText("😊 Dynamic Playful").closest("button");
    expect(dynamicButton).toHaveClass("bg-orange-600");

    const subtleButton = getByText("😌 Subtle Elegant").closest("button");
    expect(subtleButton).not.toHaveClass("bg-blue-600");
  });

  it("should highlight mystical mode", () => {
    const { getByText } = render(
      <AnimationModeSelector currentMode="mystical" onModeChange={jest.fn()} />
    );
    const mysticalButton = getByText("🔮 Mystical Ethereal").closest("button");
    expect(mysticalButton).toHaveClass("bg-purple-600");
  });

  it("should call onModeChange when clicked", () => {
    const onChangeMock = jest.fn();
    const { getByText } = render(
      <AnimationModeSelector currentMode="subtle" onModeChange={onChangeMock} />
    );

    fireEvent.click(getByText("🔮 Mystical Ethereal"));
    expect(onChangeMock).toHaveBeenCalledWith("mystical");

    fireEvent.click(getByText("😊 Dynamic Playful"));
    expect(onChangeMock).toHaveBeenCalledWith("dynamic");

    fireEvent.click(getByText("😌 Subtle Elegant"));
    expect(onChangeMock).toHaveBeenCalledWith("subtle");
  });
});
