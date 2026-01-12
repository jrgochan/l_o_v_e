/**
 * Type Utilities
 *
 * Reusable TypeScript utility types for the L.O.V.E. Experience module.
 * Provides common type transformations and helpers.
 */

/**
 * Make specific properties of T required, rest optional
 *
 * @example
 * type User = { id: string; name?: string; email?: string; }
 * type RequiredEmail = RequireOnly<User, 'email'>
 * // Result: { id?: string; name?: string; email: string; }
 */
export type RequireOnly<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make specific properties of T optional, rest required
 *
 * @example
 * type User = { id: string; name: string; email: string; }
 * type OptionalEmail = Optional<User, 'email'>
 * // Result: { id: string; name: string; email?: string; }
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make all properties of T and nested objects readonly (deep)
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Make all properties of T and nested objects partial (deep)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract keys of T where the value extends type V
 *
 * @example
 * type Obj = { a: string; b: number; c: string; }
 * type StringKeys = KeysOfType<Obj, string>
 * // Result: 'a' | 'c'
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Create a type with specific keys omitted and replaced with new type
 *
 * @example
 * type User = { id: string; createdAt: Date; }
 * type UserDTO = Replace<User, 'createdAt', string>
 * // Result: { id: string; createdAt: string; }
 */
export type Replace<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V };

/**
 * Ensure at least one property from K is present in T
 */
export type RequireAtLeastOne<T, K extends keyof T = keyof T> = Pick<T, Exclude<keyof T, K>> &
  {
    [P in K]-?: Required<Pick<T, P>> & Partial<Pick<T, Exclude<K, P>>>;
  }[K];

/**
 * Ensure exactly one property from K is present in T
 */
export type RequireExactlyOne<T, K extends keyof T = keyof T> = Pick<T, Exclude<keyof T, K>> &
  {
    [P in K]: Required<Pick<T, P>> & Partial<Record<Exclude<K, P>, never>>;
  }[K];

/**
 * Extract promise type
 *
 * @example
 * type Result = Awaited<Promise<string>>
 * // Result: string
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Function that returns void (useful for event handlers)
 */
export type VoidFunction = () => void;

/**
 * Function that returns void with single parameter
 */
export type Callback<T> = (value: T) => void;

/**
 * Async version of Callback
 */
export type AsyncCallback<T> = (value: T) => Promise<void>;

/**
 * Standard props for components that can be styled
 */
export interface StyleProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Standard props for components with children
 */
export interface ChildrenProps {
  children?: React.ReactNode;
}

/**
 * Combined style and children props (common pattern)
 */
export interface BaseComponentProps extends StyleProps, ChildrenProps {}
