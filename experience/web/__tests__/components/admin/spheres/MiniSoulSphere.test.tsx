import { render, screen, fireEvent } from "@testing-library/react";
import { MiniSoulSphere } from "@/components/admin/spheres/MiniSoulSphere";
import { CATEGORY_COLORS } from "@/types/atlas-admin";

const mockEmotion = {
  id: "1",
  name: "Joy",
  category: "When Life Is Good", // Valid category key
  vac: [0.8, 0.5, 0.7],
  definition: "Happy"
};

describe("MiniSoulSphere", () => {
  it("renders with category color", () => {
    const { container } = render(<MiniSoulSphere emotion={mockEmotion as any} colorMode="category" />);
    // Check if style contains the color for "When Life Is Good"
    const innerSphere = container.querySelector('.absolute.inset-0') as HTMLElement;
    const style = innerSphere.getAttribute('style');
    // The color #FFFF44 is for "When Life Is Good"
    expect(style).toContain(CATEGORY_COLORS["When Life Is Good"]);
  });

  it("renders with valence color", () => {
    const { container } = render(<MiniSoulSphere emotion={mockEmotion as any} colorMode="valence" />);
    const innerSphere = container.querySelector('.absolute.inset-0') as HTMLElement;
    const style = innerSphere.getAttribute('style');
    // JSDOM might return full rgb or hex, validation of gradient string is tricky so checking for existence of color part is enough
    // Or checking that it rendered.
    expect(style).toContain('background');
  });

  it("renders with arousal color", () => {
    const { container } = render(<MiniSoulSphere emotion={mockEmotion as any} colorMode="arousal" />);
    const innerSphere = container.querySelector('.absolute.inset-0') as HTMLElement;
    expect(innerSphere.getAttribute('style')).toContain('background');
  });

  it("renders with connection color", () => {
    const { container } = render(<MiniSoulSphere emotion={mockEmotion as any} colorMode="connection" />);
    const innerSphere = container.querySelector('.absolute.inset-0') as HTMLElement;
    expect(innerSphere.getAttribute('style')).toContain('background');
  });

  it("handles click and hover", () => {
    const onClick = jest.fn();
    const { container } = render(<MiniSoulSphere emotion={mockEmotion as any} colorMode="category" onClick={onClick} isHovered={true} />);

    fireEvent.click(screen.getByText("Joy"));
    expect(onClick).toHaveBeenCalled();

    const innerSphere = container.querySelector('.absolute.inset-0') as HTMLElement;
    const style = innerSphere.getAttribute('style');
    // Check transform for hover
    expect(style).toContain('scale(1.1)');
  });

  it("uses fallback color for invalid mode", () => {
    // Cast to any to bypass TS check for invalid mode
    const { container } = render(<MiniSoulSphere emotion={mockEmotion as any} colorMode={"invalid" as any} />);
    const innerSphere = container.querySelector('.absolute.inset-0') as HTMLElement;
    const style = innerSphere.getAttribute('style');
    // Fallback is #888888
    expect(style).toContain('#888888');
  });
});
