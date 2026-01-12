import {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
  smoothStep,
  smootherStep,
  getEasingByName,
  emotionalEasings,
  easedLerp,
} from "../../src/core/easing";

describe("Easing Core Utilities", () => {
  const easings = [
    { name: "linear", fn: linear },
    { name: "easeInQuad", fn: easeInQuad },
    { name: "easeOutQuad", fn: easeOutQuad },
    { name: "easeInOutQuad", fn: easeInOutQuad },
    { name: "easeInCubic", fn: easeInCubic },
    { name: "easeOutCubic", fn: easeOutCubic },
    { name: "easeInOutCubic", fn: easeInOutCubic },
    { name: "easeInQuart", fn: easeInQuart },
    { name: "easeOutQuart", fn: easeOutQuart },
    { name: "easeInOutQuart", fn: easeInOutQuart },
    { name: "easeInSine", fn: easeInSine },
    { name: "easeOutSine", fn: easeOutSine },
    { name: "easeInOutSine", fn: easeInOutSine },
    { name: "easeInExpo", fn: easeInExpo },
    { name: "easeOutExpo", fn: easeOutExpo },
    { name: "easeInOutExpo", fn: easeInOutExpo },
    { name: "easeInElastic", fn: easeInElastic },
    { name: "easeOutElastic", fn: easeOutElastic },
    { name: "easeInOutElastic", fn: easeInOutElastic },
    { name: "easeInBounce", fn: easeInBounce },
    { name: "easeOutBounce", fn: easeOutBounce },
    { name: "easeInOutBounce", fn: easeInOutBounce },
    { name: "smoothStep", fn: smoothStep },
    { name: "smootherStep", fn: smootherStep },
  ];

  describe("Standard Easings", () => {
    easings.forEach(({ name, fn }) => {
      describe(name, () => {
        it("should return 0 at t=0", () => {
          expect(fn(0)).toBeCloseTo(0);
        });

        it("should return 1 at t=1", () => {
          expect(fn(1)).toBeCloseTo(1);
        });

        // Elastic functions can overshoot 0 and 1, so skip this check for them
        if (!name.toLowerCase().includes("elastic") && !name.toLowerCase().includes("bounce")) {
          it("should return a value between 0 and 1 for t=0.5", () => {
            const val = fn(0.5);
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThanOrEqual(1);
          });
        }
      });
    });

    // Test specific logic branches

    it("easeInOutQuad logic", () => {
      expect(easeInOutQuad(0.25)).toBe(2 * 0.25 * 0.25);
      expect(easeInOutQuad(0.75)).toBe(-1 + (4 - 2 * 0.75) * 0.75);
    });

    it("easeInOutCubic logic", () => {
      expect(easeInOutCubic(0.25)).toBe(4 * Math.pow(0.25, 3));
      expect(easeInOutCubic(0.75)).toBe((0.75 - 1) * Math.pow(2 * 0.75 - 2, 2) + 1);
    });

    it("easeInOutQuart logic", () => {
      expect(easeInOutQuart(0.25)).toBe(8 * Math.pow(0.25, 4));
      expect(easeInOutQuart(0.75)).toBe(1 - 8 * Math.pow(0.75 - 1, 4));
    });

    it("easeInExpo logic", () => {
      expect(easeInExpo(0)).toBe(0);
      expect(easeInExpo(0.5)).toBe(Math.pow(2, 10 * (0.5 - 1)));
    });

    it("easeOutExpo logic", () => {
      expect(easeOutExpo(1)).toBe(1);
      expect(easeOutExpo(0.5)).toBe(1 - Math.pow(2, -10 * 0.5));
    });

    it("easeInOutExpo logic", () => {
      expect(easeInOutExpo(0)).toBe(0);
      expect(easeInOutExpo(1)).toBe(1);
      expect(easeInOutExpo(0.25)).toBe(Math.pow(2, 20 * 0.25 - 10) / 2);
      expect(easeInOutExpo(0.75)).toBe((2 - Math.pow(2, -20 * 0.75 + 10)) / 2);
    });

    it("easeInElastic logic", () => {
      expect(easeInElastic(0)).toBe(0);
      expect(easeInElastic(1)).toBe(1);
      expect(easeInElastic(0.5)).not.toBeNaN();
    });

    it("easeOutElastic logic", () => {
      expect(easeOutElastic(0)).toBe(0);
      expect(easeOutElastic(1)).toBe(1);
      expect(easeOutElastic(0.5)).not.toBeNaN();
    });

    it("easeInOutElastic logic", () => {
      expect(easeInOutElastic(0)).toBe(0);
      expect(easeInOutElastic(1)).toBe(1);
      expect(easeInOutElastic(0.25)).not.toBeNaN();
      expect(easeInOutElastic(0.75)).not.toBeNaN();
    });

    it("easeOutBounce logic", () => {
      // Test branches
      // t < 1/2.75
      expect(easeOutBounce(0.1)).toBe(7.5625 * 0.1 * 0.1);
      // t < 2/2.75 (~0.72)
      expect(easeOutBounce(0.5)).not.toBeNaN();
      // t < 2.5/2.75 (~0.90)
      expect(easeOutBounce(0.8)).not.toBeNaN();
      // else
      expect(easeOutBounce(0.95)).not.toBeNaN();
    });

    it("easeInOutBounce logic", () => {
      expect(easeInOutBounce(0.25)).toBe((1 - easeOutBounce(1 - 2 * 0.25)) / 2);
      expect(easeInOutBounce(0.75)).toBe((1 + easeOutBounce(2 * 0.75 - 1)) / 2);
    });
  });

  describe("getEasingByName", () => {
    it("should return correct function", () => {
      expect(getEasingByName("linear")).toBe(linear);
    });

    it("should return linear for invalid name", () => {
      expect(getEasingByName("invalid")).toBe(linear);
    });

    // Improve coverage by calling every single key in the map
    easings.forEach(({ name, fn }) => {
      expect(getEasingByName(name)).toBe(fn);
    });
  });

  describe("emotionalEasings", () => {
    it("should have mappings for emotions", () => {
      expect(emotionalEasings.natural).toBeDefined();
      expect(emotionalEasings.dramatic).toBeDefined();
      expect(emotionalEasings.bouncy).toBeDefined();
    });
  });

  describe("easedLerp", () => {
    it("should use easing function", () => {
      // Linear easing
      expect(easedLerp(0, 10, 0.5, linear)).toBe(5);

      // Quad easing (0.5 -> 0.25)
      expect(easedLerp(0, 10, 0.5, easeInQuad)).toBe(2.5);
    });

    it("should clamp t", () => {
      expect(easedLerp(0, 10, 1.5, linear)).toBe(10);
      expect(easedLerp(0, 10, -0.5, linear)).toBe(0);
    });

    it("should default to smootherStep", () => {
      // smootherStep(0.5) is 0.5 for symmetric functions
      // smootherStep(0.5) = 0.5
      expect(easedLerp(0, 10, 0.5)).toBe(5);
    });
  });
});
