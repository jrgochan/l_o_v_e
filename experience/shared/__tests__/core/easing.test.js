"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const easing_1 = require("../../src/core/easing");
describe('Easing Core Utilities', () => {
    const easings = [
        { name: 'linear', fn: easing_1.linear },
        { name: 'easeInQuad', fn: easing_1.easeInQuad },
        { name: 'easeOutQuad', fn: easing_1.easeOutQuad },
        { name: 'easeInOutQuad', fn: easing_1.easeInOutQuad },
        { name: 'easeInCubic', fn: easing_1.easeInCubic },
        { name: 'easeOutCubic', fn: easing_1.easeOutCubic },
        { name: 'easeInOutCubic', fn: easing_1.easeInOutCubic },
        { name: 'easeInQuart', fn: easing_1.easeInQuart },
        { name: 'easeOutQuart', fn: easing_1.easeOutQuart },
        { name: 'easeInOutQuart', fn: easing_1.easeInOutQuart },
        { name: 'easeInSine', fn: easing_1.easeInSine },
        { name: 'easeOutSine', fn: easing_1.easeOutSine },
        { name: 'easeInOutSine', fn: easing_1.easeInOutSine },
        { name: 'easeInExpo', fn: easing_1.easeInExpo },
        { name: 'easeOutExpo', fn: easing_1.easeOutExpo },
        { name: 'easeInOutExpo', fn: easing_1.easeInOutExpo },
        { name: 'easeInElastic', fn: easing_1.easeInElastic },
        { name: 'easeOutElastic', fn: easing_1.easeOutElastic },
        { name: 'easeInOutElastic', fn: easing_1.easeInOutElastic },
        { name: 'easeInBounce', fn: easing_1.easeInBounce },
        { name: 'easeOutBounce', fn: easing_1.easeOutBounce },
        { name: 'easeInOutBounce', fn: easing_1.easeInOutBounce },
        { name: 'smoothStep', fn: easing_1.smoothStep },
        { name: 'smootherStep', fn: easing_1.smootherStep },
    ];
    describe('Standard Easings', () => {
        easings.forEach(({ name, fn }) => {
            describe(name, () => {
                it('should return 0 at t=0', () => {
                    expect(fn(0)).toBeCloseTo(0);
                });
                it('should return 1 at t=1', () => {
                    expect(fn(1)).toBeCloseTo(1);
                });
                if (!name.toLowerCase().includes('elastic') && !name.toLowerCase().includes('bounce')) {
                    it('should return a value between 0 and 1 for t=0.5', () => {
                        const val = fn(0.5);
                        expect(val).toBeGreaterThanOrEqual(0);
                        expect(val).toBeLessThanOrEqual(1);
                    });
                }
            });
        });
        it('easeInOutQuad logic', () => {
            expect((0, easing_1.easeInOutQuad)(0.25)).toBe(2 * 0.25 * 0.25);
            expect((0, easing_1.easeInOutQuad)(0.75)).toBe(-1 + (4 - 2 * 0.75) * 0.75);
        });
        it('easeInOutCubic logic', () => {
            expect((0, easing_1.easeInOutCubic)(0.25)).toBe(4 * Math.pow(0.25, 3));
            expect((0, easing_1.easeInOutCubic)(0.75)).toBe((0.75 - 1) * Math.pow(2 * 0.75 - 2, 2) + 1);
        });
        it('easeInOutQuart logic', () => {
            expect((0, easing_1.easeInOutQuart)(0.25)).toBe(8 * Math.pow(0.25, 4));
            expect((0, easing_1.easeInOutQuart)(0.75)).toBe(1 - 8 * Math.pow(0.75 - 1, 4));
        });
        it('easeInExpo logic', () => {
            expect((0, easing_1.easeInExpo)(0)).toBe(0);
            expect((0, easing_1.easeInExpo)(0.5)).toBe(Math.pow(2, 10 * (0.5 - 1)));
        });
        it('easeOutExpo logic', () => {
            expect((0, easing_1.easeOutExpo)(1)).toBe(1);
            expect((0, easing_1.easeOutExpo)(0.5)).toBe(1 - Math.pow(2, -10 * 0.5));
        });
        it('easeInOutExpo logic', () => {
            expect((0, easing_1.easeInOutExpo)(0)).toBe(0);
            expect((0, easing_1.easeInOutExpo)(1)).toBe(1);
            expect((0, easing_1.easeInOutExpo)(0.25)).toBe(Math.pow(2, 20 * 0.25 - 10) / 2);
            expect((0, easing_1.easeInOutExpo)(0.75)).toBe((2 - Math.pow(2, -20 * 0.75 + 10)) / 2);
        });
        it('easeInElastic logic', () => {
            expect((0, easing_1.easeInElastic)(0)).toBe(0);
            expect((0, easing_1.easeInElastic)(1)).toBe(1);
            expect((0, easing_1.easeInElastic)(0.5)).not.toBeNaN();
        });
        it('easeOutElastic logic', () => {
            expect((0, easing_1.easeOutElastic)(0)).toBe(0);
            expect((0, easing_1.easeOutElastic)(1)).toBe(1);
            expect((0, easing_1.easeOutElastic)(0.5)).not.toBeNaN();
        });
        it('easeInOutElastic logic', () => {
            expect((0, easing_1.easeInOutElastic)(0)).toBe(0);
            expect((0, easing_1.easeInOutElastic)(1)).toBe(1);
            expect((0, easing_1.easeInOutElastic)(0.25)).not.toBeNaN();
            expect((0, easing_1.easeInOutElastic)(0.75)).not.toBeNaN();
        });
        it('easeOutBounce logic', () => {
            expect((0, easing_1.easeOutBounce)(0.1)).toBe(7.5625 * 0.1 * 0.1);
            expect((0, easing_1.easeOutBounce)(0.5)).not.toBeNaN();
            expect((0, easing_1.easeOutBounce)(0.8)).not.toBeNaN();
            expect((0, easing_1.easeOutBounce)(0.95)).not.toBeNaN();
        });
        it('easeInOutBounce logic', () => {
            expect((0, easing_1.easeInOutBounce)(0.25)).toBe((1 - (0, easing_1.easeOutBounce)(1 - 2 * 0.25)) / 2);
            expect((0, easing_1.easeInOutBounce)(0.75)).toBe((1 + (0, easing_1.easeOutBounce)(2 * 0.75 - 1)) / 2);
        });
    });
    describe('getEasingByName', () => {
        it('should return correct function', () => {
            expect((0, easing_1.getEasingByName)('linear')).toBe(easing_1.linear);
        });
        it('should return linear for invalid name', () => {
            expect((0, easing_1.getEasingByName)('invalid')).toBe(easing_1.linear);
        });
        easings.forEach(({ name, fn }) => {
            expect((0, easing_1.getEasingByName)(name)).toBe(fn);
        });
    });
    describe('emotionalEasings', () => {
        it('should have mappings for emotions', () => {
            expect(easing_1.emotionalEasings.natural).toBeDefined();
            expect(easing_1.emotionalEasings.dramatic).toBeDefined();
            expect(easing_1.emotionalEasings.bouncy).toBeDefined();
        });
    });
    describe('easedLerp', () => {
        it('should use easing function', () => {
            expect((0, easing_1.easedLerp)(0, 10, 0.5, easing_1.linear)).toBe(5);
            expect((0, easing_1.easedLerp)(0, 10, 0.5, easing_1.easeInQuad)).toBe(2.5);
        });
        it('should clamp t', () => {
            expect((0, easing_1.easedLerp)(0, 10, 1.5, easing_1.linear)).toBe(10);
            expect((0, easing_1.easedLerp)(0, 10, -0.5, easing_1.linear)).toBe(0);
        });
        it('should default to smootherStep', () => {
            expect((0, easing_1.easedLerp)(0, 10, 0.5)).toBe(5);
        });
    });
});
//# sourceMappingURL=easing.test.js.map