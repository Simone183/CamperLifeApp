/**
 * Helper utilities for Firestore data sanitation
 */

export function sanitizeForFirestore<T = any>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (typeof obj === "number") {
    if (isNaN(obj) || !isFinite(obj)) return undefined as any;
    return obj;
  }
  if (typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined) as any;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      const sanitized = sanitizeForFirestore(value);
      if (sanitized !== undefined) {
        clean[key] = sanitized;
      }
    }
  }
  return clean as T;
}
