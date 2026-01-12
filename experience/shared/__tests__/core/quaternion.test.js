"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const quaternion_1 = require("../../src/core/quaternion");
describe('Quaternion Core Utilities', () => {
    const q1 = [1, 0, 0, 0];
    const q2 = [0, 1, 0, 0];
    describe('isValid', () => {
        it('should return true for valid quaternion', () => {
            expect((0, quaternion_1.isValid)(q1)).toBe(true);
        });
        it('should return false for invalid quaternion (wrong length)', () => {
            expect((0, quaternion_1.isValid)([2, 0, 0, 0])).toBe(false);
        });
    });
    describe('normalize', () => {
        it('should normalize a quaternion', () => {
            const q = [2, 0, 0, 0];
            expect((0, quaternion_1.normalize)(q)).toEqual([1, 0, 0, 0]);
        });
        it('should handle identity/zero cases', () => {
            expect((0, quaternion_1.normalize)(quaternion_1.IDENTITY)).toEqual(quaternion_1.IDENTITY);
            expect((0, quaternion_1.normalize)([0, 0, 0, 0])).toEqual(quaternion_1.IDENTITY);
        });
    });
    describe('multiply', () => {
        it('should multiply two quaternions', () => {
            const i = [0, 1, 0, 0];
            const j = [0, 0, 1, 0];
            const k = [0, 0, 0, 1];
            expect((0, quaternion_1.multiply)(i, j)).toEqual(k);
        });
    });
    describe('conjugate', () => {
        it('should return conjugate', () => {
            const q = [1, 2, 3, 4];
            expect((0, quaternion_1.conjugate)(q)).toEqual([1, -2, -3, -4]);
        });
    });
    describe('slerp', () => {
        it('should interpolate between quaternions', () => {
            const result = (0, quaternion_1.slerp)(q1, q2, 0.5);
            expect(result[0]).toBeCloseTo(0.7071, 3);
            expect(result[1]).toBeCloseTo(0.7071, 3);
        });
        it('should handle t=0', () => {
            expect((0, quaternion_1.slerp)(q1, q2, 0)).toEqual(q1);
        });
        it('should handle t=1', () => {
            expect((0, quaternion_1.slerp)(q1, q2, 1)).toEqual(q2);
        });
        it('should handle obtuse angles (negative dot product)', () => {
            const q3 = [-0.99, 0.1, 0, 0];
            const q3n = (0, quaternion_1.normalize)(q3);
            const mid = (0, quaternion_1.slerp)(q1, q3n, 0.5);
            expect((0, quaternion_1.isValid)(mid)).toBe(true);
        });
        it('should fallback to linear interpolation for very close quaternions', () => {
            const qNear = [0.9999, 0.01, 0, 0];
            const normalized = (0, quaternion_1.normalize)(qNear);
            const res = (0, quaternion_1.slerp)(q1, normalized, 0.5);
            expect((0, quaternion_1.isValid)(res)).toBe(true);
        });
    });
    describe('vacToQuaternion', () => {
        it('should convert neutral VAC to identity quaternion', () => {
            const neutral = [0, 0, 0];
            expect((0, quaternion_1.vacToQuaternion)(neutral)).toEqual(quaternion_1.IDENTITY);
        });
        it('should convert joy VAC to valid quaternion', () => {
            const joy = [0.9, 0.7, 0.8];
            const q = (0, quaternion_1.vacToQuaternion)(joy);
            expect((0, quaternion_1.isValid)(q)).toBe(true);
        });
    });
    describe('angularDistance', () => {
        it('should return 0 for same quaternion', () => {
            expect((0, quaternion_1.angularDistance)(q1, q1)).toBe(0);
        });
        it('should return PI for orthogonal quaternions (180 deg rotation)', () => {
            expect((0, quaternion_1.angularDistance)(q1, q2)).toBeCloseTo(Math.PI);
        });
    });
    describe('angularVelocity', () => {
        it('should calculate angular velocity', () => {
            expect((0, quaternion_1.angularVelocity)(q1, q2, 1)).toBeCloseTo(Math.PI);
        });
    });
    describe('generateSlerpPath', () => {
        it('should generate a path of steps', () => {
            const path = (0, quaternion_1.generateSlerpPath)(q1, q2, 5);
            expect(path.length).toBe(5 + 1);
            expect(path[0]).toEqual(q1);
            expect(path[5]).toEqual(q2);
        });
        it('should use default steps if not provided', () => {
            const path = (0, quaternion_1.generateSlerpPath)(q1, q2);
            expect(path.length).toBe(61);
        });
    });
});
//# sourceMappingURL=quaternion.test.js.map