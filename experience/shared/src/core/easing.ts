/**
 * Easing Functions
 *
 * Provides various easing functions for smooth, natural animations.
 * All functions take a value t in [0, 1] and return an eased value in [0, 1].
 */

export type EasingFunction = (t: number) => number;

/**
 * Linear easing (no easing)
 */
export const linear: EasingFunction = (t) => t;

/**
 * Ease In Quad - Accelerating from zero velocity
 */
export const easeInQuad: EasingFunction = (t) => t * t;

/**
 * Ease Out Quad - Decelerating to zero velocity
 */
export const easeOutQuad: EasingFunction = (t) => t * (2 - t);

/**
 * Ease In Out Quad - Acceleration until halfway, then deceleration
 */
export const easeInOutQuad: EasingFunction = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/**
 * Ease In Cubic - Accelerating from zero velocity (stronger)
 */
export const easeInCubic: EasingFunction = (t) => t * t * t;

/**
 * Ease Out Cubic - Decelerating to zero velocity (stronger)
 */
export const easeOutCubic: EasingFunction = (t) => {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
};

/**
 * Ease In Out Cubic - Strong acceleration and deceleration
 */
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

/**
 * Ease In Quart - Very strong acceleration
 */
export const easeInQuart: EasingFunction = (t) => t * t * t * t;

/**
 * Ease Out Quart - Very strong deceleration
 */
export const easeOutQuart: EasingFunction = (t) => {
  const t1 = t - 1;
  return 1 - t1 * t1 * t1 * t1;
};

/**
 * Ease In Out Quart - Very strong acceleration and deceleration
 */
export const easeInOutQuart: EasingFunction = (t) => {
  if (t < 0.5) {
    return 8 * t * t * t * t;
  } else {
    const t1 = t - 1;
    return 1 - 8 * t1 * t1 * t1 * t1;
  }
};

/**
 * Ease In Sine - Sinusoidal acceleration
 */
export const easeInSine: EasingFunction = (t) => 1 - Math.cos((t * Math.PI) / 2);

/**
 * Ease Out Sine - Sinusoidal deceleration
 */
export const easeOutSine: EasingFunction = (t) => Math.sin((t * Math.PI) / 2);

/**
 * Ease In Out Sine - Sinusoidal acceleration and deceleration
 */
export const easeInOutSine: EasingFunction = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Ease In Expo - Exponential acceleration
 */
export const easeInExpo: EasingFunction = (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));

/**
 * Ease Out Expo - Exponential deceleration
 */
export const easeOutExpo: EasingFunction = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Ease In Out Expo - Exponential acceleration and deceleration
 */
export const easeInOutExpo: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;

  if (t < 0.5) {
    return Math.pow(2, 20 * t - 10) / 2;
  } else {
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  }
};

/**
 * Ease In Elastic - Elastic snap from start
 */
export const easeInElastic: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;

  const c4 = (2 * Math.PI) / 3;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
};

/**
 * Ease Out Elastic - Elastic snap to end
 */
export const easeOutElastic: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;

  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/**
 * Ease In Out Elastic - Elastic snap both ways
 */
export const easeInOutElastic: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;

  const c5 = (2 * Math.PI) / 4.5;

  if (t < 0.5) {
    return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
  } else {
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  }
};

/**
 * Ease Out Bounce - Bouncing effect at the end
 */
export const easeOutBounce: EasingFunction = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    const t2 = t - 1.5 / d1;
    return n1 * t2 * t2 + 0.75;
  } else if (t < 2.5 / d1) {
    const t2 = t - 2.25 / d1;
    return n1 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / d1;
    return n1 * t2 * t2 + 0.984375;
  }
};

/**
 * Ease In Bounce - Bouncing effect at the start
 */
export const easeInBounce: EasingFunction = (t) => 1 - easeOutBounce(1 - t);

/**
 * Ease In Out Bounce - Bouncing effect both ways
 */
export const easeInOutBounce: EasingFunction = (t) => {
  if (t < 0.5) {
    return (1 - easeOutBounce(1 - 2 * t)) / 2;
  } else {
    return (1 + easeOutBounce(2 * t - 1)) / 2;
  }
};

/**
 * Smooth Step - Hermite interpolation
 * Very smooth, natural feeling easing
 */
export const smoothStep: EasingFunction = (t) => {
  return t * t * (3 - 2 * t);
};

/**
 * Smoother Step - Even smoother than smoothStep
 * Uses 5th order polynomial
 */
export const smootherStep: EasingFunction = (t) => {
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/**
 * Get easing function by name
 */
export function getEasingByName(name: string): EasingFunction {
  const easingMap: Record<string, EasingFunction> = {
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
  };

  return easingMap[name] || linear;
}

/**
 * Recommended easings for emotional transitions
 */
export const emotionalEasings = {
  // Gradual, natural transitions (most common)
  natural: smootherStep,

  // Quick, responsive transitions
  responsive: easeOutCubic,

  // Dramatic, impactful transitions
  dramatic: easeInOutQuart,

  // Gentle, subtle transitions
  gentle: easeOutSine,

  // Excited, bouncy transitions (for joy/excitement)
  bouncy: easeOutBounce,

  // Elastic, playful transitions
  playful: easeOutElastic,
};

/**
 * Apply easing to a lerp operation
 */
export function easedLerp(
  start: number,
  end: number,
  t: number,
  easingFn: EasingFunction = smootherStep
): number {
  const easedT = easingFn(Math.max(0, Math.min(1, t)));
  return start + (end - start) * easedT;
}
