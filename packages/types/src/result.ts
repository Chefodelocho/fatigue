/**
 * Result type for error-handling without exceptions.
 *
 * All calculation functions in the core engine return `Result<T, E>` instead
 * of throwing, making error handling explicit and predictable.
 *
 * @module result
 */

/**
 * A discriminated union representing either a successful result or a failure.
 *
 * @typeparam T - The type of the value on success
 * @typeparam E - The type of the error on failure (defaults to Error)
 *
 * @example
 * ```ts
 * const result: Result<number, string> = someCalculation();
 * if (result.ok) {
 *   console.log(result.value);  // number
 * } else {
 *   console.error(result.error); // string
 * }
 * ```
 */
type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Create a successful Result containing the given value.
 *
 * @param value - The success value
 * @returns A Result with ok: true
 */
function ok<T>(value: T): Result<T, never> {
  return { ok: true, value } as const;
}

/**
 * Create a failed Result containing the given error.
 *
 * @param error - The error value
 * @returns A Result with ok: false
 */
function err<E>(error: E): Result<never, E> {
  return { ok: false, error } as const;
}

export type { Result };
export { ok, err };
