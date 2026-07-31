/**
 * Top-level taxonomy of the 23 Gang of Four design patterns, as classified in
 * the original 1994 GoF book and adopted by refactoring.guru.
 *
 *   - Creational — patterns that abstract or hide the instantiation process
 *     so the system is independent of how its objects are created, composed
 *     and represented.
 *   - Structural — patterns that compose classes and objects into larger
 *     structures while keeping these structures flexible and efficient.
 *   - Behavioral — patterns that focus on algorithms and the assignment of
 *     responsibilities between objects.
 *
 * TypeScript sibling of `com.javapatterns.mcp.catalog.PatternCategory`.
 */

export const PATTERN_CATEGORIES = ["CREATIONAL", "STRUCTURAL", "BEHAVIORAL"] as const;
export type PatternCategory = (typeof PATTERN_CATEGORIES)[number];

export interface PatternCategoryInfo {
  readonly key: PatternCategory;
  readonly displayName: string;
  readonly slug: string;
}

const CATEGORY_INFO: Record<PatternCategory, PatternCategoryInfo> = {
  CREATIONAL: {
    key: "CREATIONAL",
    displayName: "Creational",
    slug: "creational-patterns",
  },
  STRUCTURAL: {
    key: "STRUCTURAL",
    displayName: "Structural",
    slug: "structural-patterns",
  },
  BEHAVIORAL: {
    key: "BEHAVIORAL",
    displayName: "Behavioral",
    slug: "behavioral-patterns",
  },
};

/** Returns metadata (display name + refactoring.guru slug) for a category. */
export function categoryInfo(cat: PatternCategory): PatternCategoryInfo {
  return CATEGORY_INFO[cat];
}

/**
 * Resolve a `PatternCategory` from a free-form string. Accepts the enum key,
 * the display name (case-insensitive), or the URL slug.
 *
 * Returns `null` when nothing matches — callers decide whether that is an
 * error (tool argument) or "no filter" (list_patterns without `category`).
 */
export function categoryFromKey(raw: string | null | undefined): PatternCategory | null {
  if (raw === null || raw === undefined) return null;
  const value = raw.trim();
  if (value === "") return null;
  const lower = value.toLowerCase();
  for (const key of PATTERN_CATEGORIES) {
    const info = CATEGORY_INFO[key];
    if (
      key.toLowerCase() === lower ||
      info.displayName.toLowerCase() === lower ||
      info.slug.toLowerCase() === lower
    ) {
      return key;
    }
  }
  return null;
}
