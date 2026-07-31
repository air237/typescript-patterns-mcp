/**
 * Loads and caches the canonical metadata for every {@link Pattern} from the
 * bundled `resources/catalog/patterns.json` file.
 *
 * TypeScript sibling of `com.javapatterns.mcp.catalog.PatternRegistry`.
 *
 * The registry is a lazy-init module-level singleton. Node ESM guarantees that
 * a module is evaluated exactly once, and `getPatternRegistry()` caches the
 * loaded instance for every subsequent call. It validates at load time that
 * *every* {@link Pattern} key has a {@link PatternMetadata} entry — a missing
 * entry is a programming error and throws.
 *
 * This module is intentionally read-only. Modifying patterns means editing
 * the JSON resource and the {@link PATTERNS} constant together, not mutating
 * runtime state.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  PATTERNS,
  patternInfo,
  type Pattern,
} from "./pattern.js";
import { type PatternCategory } from "./patternCategory.js";
import { type PatternMetadata } from "./patternMetadata.js";

// ─── resource resolution ──────────────────────────────────────────────

/**
 * Locate the bundled `patterns.json`.
 *
 * `import.meta.url` at build time is `.../dist/catalog/patternRegistry.js`,
 * and at test time under Vitest it is `.../src/catalog/patternRegistry.ts`.
 * From both, `../../resources/catalog/patterns.json` is correct because
 * `resources/` lives at the package root, one level above both `src/` and
 * `dist/`.
 */
function catalogResourcePath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "resources", "catalog", "patterns.json");
}

// ─── raw JSON shape ───────────────────────────────────────────────────

interface RawCatalog {
  patterns: RawEntry[];
}

interface RawEntry {
  pattern: string;
  intent: string;
  problem: string;
  aliases?: string[];
}

// ─── the registry itself ──────────────────────────────────────────────

export class PatternRegistry {
  private readonly byKey: ReadonlyMap<Pattern, PatternMetadata>;

  private constructor(byKey: Map<Pattern, PatternMetadata>) {
    this.byKey = byKey;
  }

  /** Returns metadata for the given pattern. Never `undefined`. */
  get(pattern: Pattern): PatternMetadata {
    const md = this.byKey.get(pattern);
    if (md === undefined) {
      // Defensive: the load path guarantees completeness, but if someone
      // adds a new pattern key without updating the JSON we want a clear
      // failure at first access.
      throw new Error(
        `No metadata loaded for pattern ${pattern} — add it to resources/catalog/patterns.json`,
      );
    }
    return md;
  }

  /** Returns metadata for all 23 patterns, in declaration order. */
  all(): readonly PatternMetadata[] {
    return PATTERNS.map((p) => this.get(p));
  }

  /** Returns metadata for patterns in a given category. */
  byCategory(category: PatternCategory): readonly PatternMetadata[] {
    return this.all().filter((md) => patternInfo(md.pattern).category === category);
  }

  /** Number of patterns in the registry — must be 23. */
  size(): number {
    return this.byKey.size;
  }

  // ─── loader ─────────────────────────────────────────────────────────

  static load(path: string = catalogResourcePath()): PatternRegistry {
    let raw: string;
    try {
      raw = readFileSync(path, "utf8");
    } catch (e) {
      throw new Error(
        `Failed to read catalog resource at ${path}: ${(e as Error).message}`,
      );
    }

    let parsed: RawCatalog;
    try {
      parsed = JSON.parse(raw) as RawCatalog;
    } catch (e) {
      throw new Error(`Catalog JSON at ${path} is malformed: ${(e as Error).message}`);
    }

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.patterns) ||
      parsed.patterns.length === 0
    ) {
      throw new Error(`Catalog JSON at ${path} is empty or malformed.`);
    }

    const map = new Map<Pattern, PatternMetadata>();

    for (const entry of parsed.patterns) {
      if (
        entry === null ||
        typeof entry !== "object" ||
        typeof entry.pattern !== "string" ||
        typeof entry.intent !== "string" ||
        typeof entry.problem !== "string"
      ) {
        throw new Error(
          `Catalog entry has invalid shape: ${JSON.stringify(entry)}`,
        );
      }

      if (!(PATTERNS as readonly string[]).includes(entry.pattern)) {
        throw new Error(
          `Catalog references unknown pattern key '${entry.pattern}'. ` +
            `Update src/catalog/pattern.ts if this is a new pattern.`,
        );
      }
      const key = entry.pattern as Pattern;

      if (map.has(key)) {
        throw new Error(`Duplicate entry for pattern: ${key}`);
      }
      map.set(key, {
        pattern: key,
        intent: entry.intent,
        problem: entry.problem,
        aliases: Object.freeze([...(entry.aliases ?? [])]),
      });
    }

    // Completeness check: every declared pattern must be present.
    for (const p of PATTERNS) {
      if (!map.has(p)) {
        throw new Error(
          `Catalog is missing entry for pattern: ${p}. Update resources/catalog/patterns.json`,
        );
      }
    }

    return new PatternRegistry(map);
  }
}

// ─── module-level singleton ───────────────────────────────────────────

let cached: PatternRegistry | null = null;

/**
 * Returns the process-wide registry, loading and validating the JSON
 * resource on first access. Thread-safety is a non-issue in Node's single
 * event loop; this is just lazy init.
 */
export function getPatternRegistry(): PatternRegistry {
  if (cached === null) {
    cached = PatternRegistry.load();
  }
  return cached;
}

/**
 * Test-only: drop the cached registry so a subsequent call reloads the
 * JSON from disk. Do NOT use in production code.
 *
 * @internal
 */
export function _resetPatternRegistryForTests(): void {
  cached = null;
}
