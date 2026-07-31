/**
 * Enumeration of the 23 Gang of Four design patterns, with category and the
 * `refactoring.guru` URL slug for each.
 *
 * TypeScript sibling of `com.javapatterns.mcp.catalog.Pattern`.
 *
 * The `Pattern` type is a string-literal union — the TypeScript idiomatic
 * replacement for a numeric Java enum. Each key is UPPER_SNAKE_CASE and
 * matches the corresponding entry in `resources/catalog/patterns.json`.
 *
 * Ordering follows refactoring.guru:
 *   Creational (5), Structural (7), Behavioral (11). Total: 23.
 */

import { type PatternCategory } from "./patternCategory.js";

// ─── the enum-like union ──────────────────────────────────────────────

export const PATTERNS = [
  // Creational
  "ABSTRACT_FACTORY",
  "BUILDER",
  "FACTORY_METHOD",
  "PROTOTYPE",
  "SINGLETON",
  // Structural
  "ADAPTER",
  "BRIDGE",
  "COMPOSITE",
  "DECORATOR",
  "FACADE",
  "FLYWEIGHT",
  "PROXY",
  // Behavioral
  "CHAIN_OF_RESPONSIBILITY",
  "COMMAND",
  "INTERPRETER",
  "ITERATOR",
  "MEDIATOR",
  "MEMENTO",
  "OBSERVER",
  "STATE",
  "STRATEGY",
  "TEMPLATE_METHOD",
  "VISITOR",
] as const;

export type Pattern = (typeof PATTERNS)[number];

// ─── per-pattern structural facts (category + display name + slug) ────

export interface PatternInfo {
  readonly key: Pattern;
  readonly category: PatternCategory;
  readonly displayName: string;
  /** URL slug used on refactoring.guru, e.g. "chain-of-responsibility". */
  readonly slug: string;
}

export const REFACTORING_GURU_BASE = "https://refactoring.guru/design-patterns/";

const PATTERN_INFO: Record<Pattern, PatternInfo> = {
  // ─── Creational ───────────────────────────────────────────────────
  ABSTRACT_FACTORY: {
    key: "ABSTRACT_FACTORY",
    category: "CREATIONAL",
    displayName: "Abstract Factory",
    slug: "abstract-factory",
  },
  BUILDER: {
    key: "BUILDER",
    category: "CREATIONAL",
    displayName: "Builder",
    slug: "builder",
  },
  FACTORY_METHOD: {
    key: "FACTORY_METHOD",
    category: "CREATIONAL",
    displayName: "Factory Method",
    slug: "factory-method",
  },
  PROTOTYPE: {
    key: "PROTOTYPE",
    category: "CREATIONAL",
    displayName: "Prototype",
    slug: "prototype",
  },
  SINGLETON: {
    key: "SINGLETON",
    category: "CREATIONAL",
    displayName: "Singleton",
    slug: "singleton",
  },

  // ─── Structural ───────────────────────────────────────────────────
  ADAPTER: {
    key: "ADAPTER",
    category: "STRUCTURAL",
    displayName: "Adapter",
    slug: "adapter",
  },
  BRIDGE: {
    key: "BRIDGE",
    category: "STRUCTURAL",
    displayName: "Bridge",
    slug: "bridge",
  },
  COMPOSITE: {
    key: "COMPOSITE",
    category: "STRUCTURAL",
    displayName: "Composite",
    slug: "composite",
  },
  DECORATOR: {
    key: "DECORATOR",
    category: "STRUCTURAL",
    displayName: "Decorator",
    slug: "decorator",
  },
  FACADE: {
    key: "FACADE",
    category: "STRUCTURAL",
    displayName: "Facade",
    slug: "facade",
  },
  FLYWEIGHT: {
    key: "FLYWEIGHT",
    category: "STRUCTURAL",
    displayName: "Flyweight",
    slug: "flyweight",
  },
  PROXY: {
    key: "PROXY",
    category: "STRUCTURAL",
    displayName: "Proxy",
    slug: "proxy",
  },

  // ─── Behavioral ───────────────────────────────────────────────────
  CHAIN_OF_RESPONSIBILITY: {
    key: "CHAIN_OF_RESPONSIBILITY",
    category: "BEHAVIORAL",
    displayName: "Chain of Responsibility",
    slug: "chain-of-responsibility",
  },
  COMMAND: {
    key: "COMMAND",
    category: "BEHAVIORAL",
    displayName: "Command",
    slug: "command",
  },
  INTERPRETER: {
    key: "INTERPRETER",
    category: "BEHAVIORAL",
    displayName: "Interpreter",
    slug: "interpreter",
  },
  ITERATOR: {
    key: "ITERATOR",
    category: "BEHAVIORAL",
    displayName: "Iterator",
    slug: "iterator",
  },
  MEDIATOR: {
    key: "MEDIATOR",
    category: "BEHAVIORAL",
    displayName: "Mediator",
    slug: "mediator",
  },
  MEMENTO: {
    key: "MEMENTO",
    category: "BEHAVIORAL",
    displayName: "Memento",
    slug: "memento",
  },
  OBSERVER: {
    key: "OBSERVER",
    category: "BEHAVIORAL",
    displayName: "Observer",
    slug: "observer",
  },
  STATE: {
    key: "STATE",
    category: "BEHAVIORAL",
    displayName: "State",
    slug: "state",
  },
  STRATEGY: {
    key: "STRATEGY",
    category: "BEHAVIORAL",
    displayName: "Strategy",
    slug: "strategy",
  },
  TEMPLATE_METHOD: {
    key: "TEMPLATE_METHOD",
    category: "BEHAVIORAL",
    displayName: "Template Method",
    slug: "template-method",
  },
  VISITOR: {
    key: "VISITOR",
    category: "BEHAVIORAL",
    displayName: "Visitor",
    slug: "visitor",
  },
};

// ─── public API ───────────────────────────────────────────────────────

/** Returns the structural facts (category + display name + slug) for a pattern. */
export function patternInfo(pattern: Pattern): PatternInfo {
  return PATTERN_INFO[pattern];
}

/** Full URL of the main article on refactoring.guru for a pattern. */
export function referenceUrl(pattern: Pattern): string {
  return REFACTORING_GURU_BASE + PATTERN_INFO[pattern].slug;
}

/**
 * Resolve a Pattern from a free-form identifier. Accepts the enum key
 * (any case), the slug (dashes or spaces or underscores), or the display
 * name. Throws when nothing matches — used to normalize tool input.
 *
 * Examples that all resolve to `SINGLETON`:
 *   "singleton"
 *   "Singleton"
 *   "SINGLETON"
 *   "sInGlEtOn"
 *
 * Examples that all resolve to `CHAIN_OF_RESPONSIBILITY`:
 *   "Chain of Responsibility"
 *   "chain-of-responsibility"
 *   "chain_of_responsibility"
 *   "CHAIN_OF_RESPONSIBILITY"
 */
export function patternFromKey(key: string | null | undefined): Pattern {
  if (key === null || key === undefined || key.trim() === "") {
    throw new Error("Pattern key must be non-blank");
  }
  const normalized = key.trim();

  // 1) enum key match (case-insensitive)
  for (const p of PATTERNS) {
    if (p.toLowerCase() === normalized.toLowerCase()) return p;
  }
  // 2) slug match — normalize separators
  const slugCandidate = normalized.toLowerCase().replace(/[ _]/g, "-");
  for (const p of PATTERNS) {
    if (PATTERN_INFO[p].slug === slugCandidate) return p;
  }
  // 3) display name match
  for (const p of PATTERNS) {
    if (PATTERN_INFO[p].displayName.toLowerCase() === normalized.toLowerCase()) return p;
  }
  throw new Error(`Unknown design pattern: '${key}'`);
}
