/**
 * UI Event Handler Types
 *
 * Reusable React synthetic event handler types for consistent typing
 * across UI components.
 */

import type { ChangeEvent, FormEvent, MouseEvent, KeyboardEvent, FocusEvent } from "react";

// ============================================================================
// FORM INPUT HANDLERS
// ============================================================================

/** Standard text input change handler */
export type InputChangeHandler = (e: ChangeEvent<HTMLInputElement>) => void;

/** Select/dropdown change handler */
export type SelectChangeHandler = (e: ChangeEvent<HTMLSelectElement>) => void;

/** Textarea change handler */
export type TextAreaChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => void;

/** Generic form submit handler */
export type FormSubmitHandler = (e: FormEvent<HTMLFormElement>) => void;

// ============================================================================
// MOUSE EVENT HANDLERS
// ============================================================================

/** Button/element click handler */
export type ClickHandler<T = HTMLElement> = (e: MouseEvent<T>) => void;

/** Button click handler (specific) */
export type ButtonClickHandler = (e: MouseEvent<HTMLButtonElement>) => void;

/** Div click handler (specific) */
export type DivClickHandler = (e: MouseEvent<HTMLDivElement>) => void;

// ============================================================================
// KEYBOARD EVENT HANDLERS
// ============================================================================

/** Keyboard event handler */
export type KeyHandler<T = HTMLElement> = (e: KeyboardEvent<T>) => void;

/** Input keyboard event handler */
export type InputKeyHandler = (e: KeyboardEvent<HTMLInputElement>) => void;

// ============================================================================
// FOCUS EVENT HANDLERS
// ============================================================================

/** Focus event handler */
export type FocusHandler<T = HTMLElement> = (e: FocusEvent<T>) => void;

/** Blur event handler */
export type BlurHandler<T = HTMLElement> = (e: FocusEvent<T>) => void;

// ============================================================================
// SETTINGS & CONFIGURATION TYPES
// ============================================================================

/** Settings tab identifiers */
export type SettingsTab = "visual" | "behavior" | "accessibility" | "chat" | "experimental";

/** Render quality levels */
export type RenderQuality = "low" | "medium" | "high" | "ultra";

/** Animation speed presets */
export type AnimationSpeed = "slow" | "normal" | "fast";

// ============================================================================
// GENERIC HANDLERS WITH UNKNOWN PAYLOAD
// ============================================================================

/**
 * Generic event handler when exact type is unknown
 * Prefer specific types above, but use this for dynamic/polymorphic cases
 */
export type GenericEventHandler = (e: React.SyntheticEvent) => void;
