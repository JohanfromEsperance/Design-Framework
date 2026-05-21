/**
 * Converts Date objects to ISO strings so Zod schemas expecting
 * string for date-time fields parse correctly.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}
