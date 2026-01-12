import {
  vacToQuaternion,
  angularDistance,
  slerp,
  normalize,
  multiply,
  conjugate,
  angularVelocity,
  isValid,
  IDENTITY,
  generateSlerpPath,
} from "../../src/core/quaternion";
import { Quaternion, VACVector } from "../../src/types";

describe("Quaternion Core Utilities", () => {
  // [w, x, y, z]
  const q1: Quaternion = [1, 0, 0, 0];
  const q2: Quaternion = [0, 1, 0, 0];

  describe("isValid", () => {
    it("should return true for valid quaternion", () => {
      expect(isValid(q1)).toBe(true);
    });

    it("should return false for invalid quaternion (wrong length)", () => {
      expect(isValid([2, 0, 0, 0])).toBe(false);
    });
  });

  describe("normalize", () => {
    it("should normalize a quaternion", () => {
      const q: Quaternion = [2, 0, 0, 0];
      expect(normalize(q)).toEqual([1, 0, 0, 0]);
    });

    it("should handle identity/zero cases", () => {
      expect(normalize(IDENTITY)).toEqual(IDENTITY);
      expect(normalize([0, 0, 0, 0])).toEqual(IDENTITY);
    });
  });

  describe("multiply", () => {
    it("should multiply two quaternions", () => {
      // i * j = k
      // i = (0, 1, 0, 0)
      // j = (0, 0, 1, 0)
      // k = (0, 0, 0, 1)
      const i: Quaternion = [0, 1, 0, 0];
      const j: Quaternion = [0, 0, 1, 0];
      const k: Quaternion = [0, 0, 0, 1];
      expect(multiply(i, j)).toEqual(k);
    });
  });

  describe("conjugate", () => {
    it("should return conjugate", () => {
      const q: Quaternion = [1, 2, 3, 4];
      expect(conjugate(q)).toEqual([1, -2, -3, -4]);
    });
  });

  describe("slerp", () => {
    it("should interpolate between quaternions", () => {
      const result = slerp(q1, q2, 0.5);
      // 0.5 slerp between 1 and i is roughly 0.707, 0.707 (w and x)
      expect(result[0]).toBeCloseTo(0.7071, 3);
      expect(result[1]).toBeCloseTo(0.7071, 3);
    });

    it("should handle t=0", () => {
      expect(slerp(q1, q2, 0)).toEqual(q1);
    });

    it("should handle t=1", () => {
      expect(slerp(q1, q2, 1)).toEqual(q2);
    });

    it("should handle obtuse angles (negative dot product)", () => {
      // q3 is close to -q1, but slerp should take shortest path
      // If we negate q1, we get [-1, 0, 0, 0] which is same rotation as q1.
      // Let's use a value that produces negative dot product but is valid
      const q3: Quaternion = [-0.99, 0.1, 0, 0];
      // normalize it
      const q3n = normalize(q3);

      // Dot product with q1 (1,0,0,0) is -0.99 (negative)
      // internally slerp should negate q3n to make dot positive (~0.99)
      const mid = slerp(q1, q3n, 0.5);
      expect(isValid(mid)).toBe(true);
    });

    it("should fallback to linear interpolation for very close quaternions", () => {
      const qNear: Quaternion = [0.9999, 0.01, 0, 0];
      const normalized = normalize(qNear);
      const res = slerp(q1, normalized, 0.5);
      expect(isValid(res)).toBe(true);
    });
  });

  describe("vacToQuaternion", () => {
    it("should convert neutral VAC to identity quaternion", () => {
      const neutral: VACVector = [0, 0, 0];
      expect(vacToQuaternion(neutral)).toEqual(IDENTITY);
    });

    it("should convert joy VAC to valid quaternion", () => {
      // Joy = [0.9, 0.7, 0.8]
      const joy: VACVector = [0.9, 0.7, 0.8];
      const q = vacToQuaternion(joy);
      expect(isValid(q)).toBe(true);
    });
  });

  describe("angularDistance", () => {
    it("should return 0 for same quaternion", () => {
      expect(angularDistance(q1, q1)).toBe(0);
    });

    it("should return PI for orthogonal quaternions (180 deg rotation)", () => {
      expect(angularDistance(q1, q2)).toBeCloseTo(Math.PI);
    });
  });

  describe("angularVelocity", () => {
    it("should calculate angular velocity", () => {
      // If moving 180 degrees in 1 second
      expect(angularVelocity(q1, q2, 1)).toBeCloseTo(Math.PI);
    });
  });

  describe("generateSlerpPath", () => {
    it("should generate a path of steps", () => {
      const path = generateSlerpPath(q1, q2, 5);
      expect(path.length).toBe(5 + 1); // 0 to steps inclusive
      expect(path[0]).toEqual(q1);
      expect(path[5]).toEqual(q2);
    });

    it("should use default steps if not provided", () => {
      const path = generateSlerpPath(q1, q2);
      expect(path.length).toBe(61); // Default 60 steps -> 61 points
    });
  });
});
