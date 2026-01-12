import {
    isValidVAC,
    clampVAC,
    vacDistance,
    vacLerp,
    vacMagnitude,
    vacNormalize,
    getCanonicalEmotion,
    getCanonicalEmotionNames,
    CANONICAL_EMOTIONS,
    NEUTRAL_VAC
} from '../../src/core/vac';
import { VACVector } from '../../src/types';

describe('VAC Core Utilities', () => {
    describe('isValidVAC', () => {
        it('should return true for valid VAC vector', () => {
            // [valence, arousal, connection]
            expect(isValidVAC([0.5, 0.5, 0.5])).toBe(true);
        });

        it('should return true for boundary values', () => {
            expect(isValidVAC([-1, 1, 0])).toBe(true);
        });

        it('should return false for values out of range', () => {
            expect(isValidVAC([-1.1, 0, 0])).toBe(false);
            expect(isValidVAC([0, 1.1, 0])).toBe(false);
        });
    });

    describe('clampVAC', () => {
        it('should clamp values between -1 and 1', () => {
            const result = clampVAC([1.5, -1.5, 0.5]);
            expect(result).toEqual([1, -1, 0.5]);
        });
    });

    describe('vacDistance', () => {
        it('should calculate Euclidean distance correctly', () => {
            const v1: VACVector = [0, 0, 0];
            const v2: VACVector = [1, 0, 0];
            expect(vacDistance(v1, v2)).toBe(1);
        });

        it('should calculate distance for all components', () => {
            // sqrt(1^2 + 2^2 + 2^2) = sqrt(1 + 4 + 4) = sqrt(9) = 3
            const v1: VACVector = [0, 0, 0];
            const v2: VACVector = [1, 2, 2];
            expect(vacDistance(v1, v2)).toBe(3);
        });
    });

    describe('vacLerp', () => {
        it('should interpolate between two vectors', () => {
            const v1: VACVector = [0, 0, 0];
            const v2: VACVector = [1, 1, 1];
            const result = vacLerp(v1, v2, 0.5);
            expect(result).toEqual([0.5, 0.5, 0.5]);
        });

        it('should handle t=0', () => {
            const v1: VACVector = [0, 0, 0];
            const v2: VACVector = [1, 1, 1];
            expect(vacLerp(v1, v2, 0)).toEqual(v1);
        });

        it('should handle t=1', () => {
            const v1: VACVector = [0, 0, 0];
            const v2: VACVector = [1, 1, 1];
            expect(vacLerp(v1, v2, 1)).toEqual(v2);
        });
    });

    describe('vacMagnitude', () => {
        it('should calculate magnitude correctly', () => {
            expect(vacMagnitude([1, 0, 0])).toBe(1);
            // 3-4-5 triangle principle applies to any dimension pair
            expect(vacMagnitude([3, 4, 0])).toBe(5);
        });
    });

    describe('vacNormalize', () => {
        it('should normalize a vector', () => {
            const v: VACVector = [3, 0, 0];
            expect(vacNormalize(v)).toEqual([1, 0, 0]);
        });

        it('should handle zero vector', () => {
            expect(vacNormalize([0, 0, 0])).toEqual([0, 0, 0]);
        });

        it('should handle near-zero vector', () => {
            expect(vacNormalize([0.00001, 0.00001, 0.00001])).toEqual([0, 0, 0]);
        });
    });

    describe('getCanonicalEmotion', () => {
        it('should return correct canonical emotion', () => {
            expect(getCanonicalEmotion('joy')).toBe(CANONICAL_EMOTIONS.joy);
        });

        it('should return undefined for invalid emotion', () => {
            expect(getCanonicalEmotion('invalid')).toBeUndefined();
        });

        it('should be case insensitive', () => {
            expect(getCanonicalEmotion('JOY')).toBe(CANONICAL_EMOTIONS.joy);
        });
    });

    describe('getCanonicalEmotionNames', () => {
        it('should return list of emotion names', () => {
            const names = getCanonicalEmotionNames();
            expect(names).toContain('joy');
            expect(names).toContain('neutral');
            expect(names.length).toBeGreaterThan(0);
        });
    });
});
