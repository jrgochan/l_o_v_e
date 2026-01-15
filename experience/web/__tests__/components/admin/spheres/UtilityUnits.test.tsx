import {
  getColorFromValence,
  blendColors,
  getColorFromCategory,
} from "@/components/admin/spheres/BaseSphere";
import { MiniSoulSphere } from "@/components/admin/spheres/MiniSoulSphere";
import { render } from "@testing-library/react";
import * as THREE from "three";

describe("BaseSphere Utilities", () => {
  describe("getColorFromValence", () => {
    it("returns correct colors for all ranges", () => {
      // > 0.5 (Green)
      expect(getColorFromValence(0.6).getHexString()).toBe("22c55e");
      // > 0.1 (Lime)
      expect(getColorFromValence(0.2).getHexString()).toBe("a3e635");
      // > -0.1 (Amber)
      expect(getColorFromValence(0).getHexString()).toBe("fbbf24");
      // > -0.5 (Orange)
      expect(getColorFromValence(-0.2).getHexString()).toBe("f97316");
      // <= -0.5 (Red)
      expect(getColorFromValence(-0.6).getHexString()).toBe("ef4444");
    });
  });

  describe("blendColors", () => {
    it("handles missing weights (defaults to 1.0)", () => {
      const c1 = new THREE.Color(1, 0, 0); // Red
      const c2 = new THREE.Color(0, 0, 1); // Blue
      // blendColors([c1, c2], [1]) -> c2 defaults to weight 1.
      // Weighted R: 1*1 + 0*1 = 1
      // Weighted B: 0*1 + 1*1 = 1
      // Total weight: 2
      // Result: 0.5, 0, 0.5
      const result = blendColors([c1, c2], [1]);
      expect(result.r).toBeCloseTo(0.5);
      expect(result.b).toBeCloseTo(0.5);
    });

    it("handles zero total weight", () => {
      const c1 = new THREE.Color(1, 0, 0);
      const result = blendColors([c1], [0]);
      // Should return default ammo/amber color (0xfbbf24 -> r:0.98, g:0.75, b:0.14)
      const expected = new THREE.Color(0xfbbf24);
      expect(result.getHexString()).toBe(expected.getHexString());
    });
  });
});

describe("MiniSoulSphere", () => {
  it("uses default color for unknown category", () => {
    const emotion = {
      id: "e1",
      name: "Test",
      category: "UnknownCategoryXYZ",
      vac: [0, 0, 0],
      definition: "test",
      quaternion: [0, 0, 0, 1],
    };

    // We can't easily check internal hex logic without snapshot or inspecting style
    // But we can check that it doesn't crash and renders
    const { container } = render(<MiniSoulSphere emotion={emotion as any} colorMode="category" />);

    // The radial gradient should contain the fallback color #888888
    const sphere = container.querySelector(".absolute.inset-0");
    const style = sphere?.getAttribute("style");
    expect(style).toContain("#888888");
  });
});
