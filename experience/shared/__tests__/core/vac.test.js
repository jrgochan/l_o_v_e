"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vac_1 = require("../../src/core/vac");
describe('VAC Core Utilities', () => {
    describe('isValidVAC', () => {
        it('should return true for valid VAC vector', () => {
            expect((0, vac_1.isValidVAC)([0.5, 0.5, 0.5])).toBe(true);
        });
        it('should return true for boundary values', () => {
            expect((0, vac_1.isValidVAC)([-1, 1, 0])).toBe(true);
        });
        it('should return false for values out of range', () => {
            expect((0, vac_1.isValidVAC)([-1.1, 0, 0])).toBe(false);
            expect((0, vac_1.isValidVAC)([0, 1.1, 0])).toBe(false);
        });
    });
    describe('clampVAC', () => {
        it('should clamp values between -1 and 1', () => {
            const result = (0, vac_1.clampVAC)([1.5, -1.5, 0.5]);
            expect(result).toEqual([1, -1, 0.5]);
        });
    });
    describe('vacDistance', () => {
        it('should calculate Euclidean distance correctly', () => {
            const v1 = [0, 0, 0];
            const v2 = [1, 0, 0];
            expect((0, vac_1.vacDistance)(v1, v2)).toBe(1);
        });
        it('should calculate distance for all components', () => {
            const v1 = [0, 0, 0];
            const v2 = [1, 2, 2];
            expect((0, vac_1.vacDistance)(v1, v2)).toBe(3);
        });
    });
    describe('vacLerp', () => {
        it('should interpolate between two vectors', () => {
            const v1 = [0, 0, 0];
            const v2 = [1, 1, 1];
            const result = (0, vac_1.vacLerp)(v1, v2, 0.5);
            expect(result).toEqual([0.5, 0.5, 0.5]);
        });
        it('should handle t=0', () => {
            const v1 = [0, 0, 0];
            const v2 = [1, 1, 1];
            expect((0, vac_1.vacLerp)(v1, v2, 0)).toEqual(v1);
        });
        it('should handle t=1', () => {
            const v1 = [0, 0, 0];
            const v2 = [1, 1, 1];
            expect((0, vac_1.vacLerp)(v1, v2, 1)).toEqual(v2);
        });
    });
    describe('vacMagnitude', () => {
        it('should calculate magnitude correctly', () => {
            expect((0, vac_1.vacMagnitude)([1, 0, 0])).toBe(1);
            expect((0, vac_1.vacMagnitude)([3, 4, 0])).toBe(5);
        });
    });
    describe('vacNormalize', () => {
        it('should normalize a vector', () => {
            const v = [3, 0, 0];
            expect((0, vac_1.vacNormalize)(v)).toEqual([1, 0, 0]);
        });
        it('should handle zero vector', () => {
            expect((0, vac_1.vacNormalize)([0, 0, 0])).toEqual([0, 0, 0]);
        });
        it('should handle near-zero vector', () => {
            expect((0, vac_1.vacNormalize)([0.00001, 0.00001, 0.00001])).toEqual([0, 0, 0]);
        });
    });
    describe('getCanonicalEmotion', () => {
        it('should return correct canonical emotion', () => {
            expect((0, vac_1.getCanonicalEmotion)('joy')).toBe(vac_1.CANONICAL_EMOTIONS.joy);
        });
        it('should return undefined for invalid emotion', () => {
            expect((0, vac_1.getCanonicalEmotion)('invalid')).toBeUndefined();
        });
        it('should be case insensitive', () => {
            expect((0, vac_1.getCanonicalEmotion)('JOY')).toBe(vac_1.CANONICAL_EMOTIONS.joy);
        });
    });
    describe('getCanonicalEmotionNames', () => {
        it('should return list of emotion names', () => {
            const names = (0, vac_1.getCanonicalEmotionNames)();
            expect(names).toContain('joy');
            expect(names).toContain('neutral');
            expect(names.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=vac.test.js.map