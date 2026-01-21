/**
 * @love/experience-shared
 *
 * Public API for shared utilities and business logic across all Experience platforms.
 * This is the main entry point for the shared package.
 */

// ===== Core Utilities =====

// VAC Model
export {
  CANONICAL_EMOTIONS,
  NEUTRAL_VAC,
  IDENTITY_QUATERNION,
  getCanonicalEmotionNames,
  getCanonicalEmotion,
  isValidVAC,
  clampVAC,
  vacDistance,
  vacLerp,
  vacMagnitude,
  vacNormalize,
} from "./core/vac";

// Quaternion Math
export {
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
} from "./core/quaternion";

// Easing Functions
export {
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
} from "./core/easing";

export type { EasingFunction } from "./core/easing";

// ===== API Clients =====

// Observer API
export {
  getObserverClient,
  createPollingManager,
  fetchCurrentState,
  generateMockResponse,
  convertQuaternion,
  convertVAC,
  ObserverPollingManager,
} from "./api/observer";

export type {
  ObserverEmotionResponse,
  ObserverHistoryResponse,
  AtlasEmotion,
  AtlasEmotionsResponse,
  StrategyInfo,
  WaypointInfo,
  TransitionPathResponse,
  BootstrapStrategyRating,
  BootstrapPathTemplate,
  UserContext,
  ContextualRecommendation,
  ChallengePattern,
  EmotionCollection,
} from "./api/observer";

// Listener API
export * from "./api/listener";

// ===== Types =====
export type {
  VACVector,
  Quaternion,
  HapticMode,
  CanonicalEmotion,
  EmotionalState,
  EmotionalSettings,
  Platform,
  AnimationCallback,
} from "./types";
