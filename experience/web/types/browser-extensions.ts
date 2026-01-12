/**
 * Browser API Extensions
 *
 * Type definitions for browser APIs that need polyfills or vendor prefixes.
 * Extends the standard Window interface with webkit-prefixed APIs.
 */

/**
 * Extended Window interface with vendor-prefixed browser APIs
 *
 * Usage:
 * ```typescript
 * const AudioContextClass = (window as ExtendedWindow).webkitAudioContext || AudioContext;
 * ```
 */
export interface ExtendedWindow extends Window {
  // Web Audio API (webkit prefixed)
  webkitAudioContext?: typeof AudioContext;

  // Speech Recognition API (webkit prefixed) - using any since not in TS lib
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webkitSpeechRecognition?: any;

  // Command Palette integration
  openCommandPalette?: () => void;
  __commandPaletteOpen?: boolean;
}

/**
 * Type guard to check if window has webkit audio context
 */
export function hasWebkitAudioContext(
  win: Window
): win is ExtendedWindow & { webkitAudioContext: typeof AudioContext } {
  return "webkitAudioContext" in win;
}

/**
 * Type guard to check if window has webkit speech recognition
 */
export function hasWebkitSpeechRecognition(
  win: Window
): win is ExtendedWindow & { webkitSpeechRecognition: unknown } {
  return "webkitSpeechRecognition" in win;
}

/**
 * Get AudioContext class with fallback to webkit version
 */
export function getAudioContext(): typeof AudioContext {
  return (window as ExtendedWindow).webkitAudioContext || AudioContext;
}
