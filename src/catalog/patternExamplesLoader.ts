/**
 * Loads and caches the canonical TypeScript examples for every pattern that
 * has any. Examples live under `resources/examples/<slug>/...` and are
 * indexed by `resources/examples/examples-index.json`.
 *
 * TypeScript sibling of `com.javapatterns.mcp.catalog.PatternExamplesLoader`,
 * minus `packageName` (see `PatternExample`).
 *
 * Index file shape:
 *   {
 *     "examples": [
 *       {
 *         "pattern": "SINGLETON",
 *         "files": [
 *           {
 *             "fileName": "Singleton.ts",
 *             "path": "examples/singleton/Singleton.ts",
 *             "note": "Class-based Singleton with private constructor …"
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * Patterns without an example yet are simply absent from the index —
 * `forPattern(pattern)` returns an empty array in that case.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { PATTERNS, type Pattern } from "./pattern.js";
import { type PatternExample } from "./patternExample.js";

// ─── resource resolution ──────────────────────────────────────────────

const RESOURCES_ROOT = "resources";
const INDEX_RELATIVE_PATH = "examples/examples-index.json";

/**
 * Locate the bundled `resources/` folder. `import.meta.url` at build time is
 * `.../dist/catalog/patternExamplesLoader.js` and at test time
 * `.../src/catalog/patternExamplesLoader.ts`. From both, `../..` reaches the
 * package root where `resources/` lives.
 */
function resourcesRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", RESOURCES_ROOT);
}

// ─── raw JSON shape ───────────────────────────────────────────────────

interface RawIndex {
  examples: RawEntry[];
}

interface RawEntry {
  pattern: string;
  files: RawFile[];
}

interface RawFile {
  fileName: string;
  path: string;
  note: string;
}

// ─── the loader itself ────────────────────────────────────────────────

export class PatternExamplesLoader {
  private readonly byPattern: ReadonlyMap<Pattern, readonly PatternExample[]>;

  private constructor(byPattern: Map<Pattern, readonly PatternExample[]>) {
    this.byPattern = byPattern;
  }

  /** Returns the immutable example list for the given pattern, or an empty array. */
  forPattern(pattern: Pattern): readonly PatternExample[] {
    return this.byPattern.get(pattern) ?? [];
  }

  /** Total number of (pattern, file) tuples loaded. */
  totalExamples(): number {
    let n = 0;
    for (const list of this.byPattern.values()) n += list.length;
    return n;
  }

  /** Patterns that have at least one example, in {@link PATTERNS} declaration order. */
  coveredPatterns(): readonly Pattern[] {
    return PATTERNS.filter((p) => this.byPattern.has(p));
  }

  // ─── loader ─────────────────────────────────────────────────────────

  static load(root: string = resourcesRoot()): PatternExamplesLoader {
    const indexPath = resolve(root, INDEX_RELATIVE_PATH);

    let indexRaw: string;
    try {
      indexRaw = readFileSync(indexPath, "utf8");
    } catch (_e) {
      // A missing index is a valid early state — no examples yet.
      return new PatternExamplesLoader(new Map());
    }

    let parsed: RawIndex;
    try {
      parsed = JSON.parse(indexRaw) as RawIndex;
    } catch (e) {
      throw new Error(
        `examples-index.json at ${indexPath} is malformed: ${(e as Error).message}`,
      );
    }

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.examples)
    ) {
      throw new Error(
        `examples-index.json at ${indexPath} is not the expected shape.`,
      );
    }

    const map = new Map<Pattern, readonly PatternExample[]>();

    for (const entry of parsed.examples) {
      if (
        entry === null ||
        typeof entry !== "object" ||
        typeof entry.pattern !== "string" ||
        !Array.isArray(entry.files)
      ) {
        throw new Error(
          `examples-index.json entry has invalid shape: ${JSON.stringify(entry)}`,
        );
      }

      if (!(PATTERNS as readonly string[]).includes(entry.pattern)) {
        throw new Error(
          `examples-index.json references unknown pattern key '${entry.pattern}'.`,
        );
      }
      const patternKey = entry.pattern as Pattern;

      if (map.has(patternKey)) {
        throw new Error(
          `examples-index.json has duplicate entry for pattern: ${patternKey}`,
        );
      }

      const files: PatternExample[] = entry.files.map((rf) =>
        readExampleFile(root, patternKey, rf),
      );

      map.set(patternKey, Object.freeze([...files]));
    }

    // Preserve declaration order in iteration
    const ordered = new Map<Pattern, readonly PatternExample[]>();
    for (const p of PATTERNS) {
      const list = map.get(p);
      if (list !== undefined) ordered.set(p, list);
    }
    return new PatternExamplesLoader(ordered);
  }
}

function readExampleFile(
  root: string,
  pattern: Pattern,
  raw: RawFile,
): PatternExample {
  if (
    typeof raw.fileName !== "string" ||
    raw.fileName.trim() === "" ||
    typeof raw.path !== "string" ||
    raw.path.trim() === "" ||
    typeof raw.note !== "string"
  ) {
    throw new Error(
      `examples-index.json file entry has invalid shape: ${JSON.stringify(raw)}`,
    );
  }
  const filePath = resolve(root, raw.path);
  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (e) {
    throw new Error(
      `Example source listed in index but missing on disk: ${filePath} (${(e as Error).message})`,
    );
  }
  return {
    pattern,
    fileName: raw.fileName,
    source,
    note: raw.note,
  };
}

// ─── module-level singleton ───────────────────────────────────────────

let cached: PatternExamplesLoader | null = null;

/**
 * Returns the process-wide loader, loading and validating the JSON index on
 * first access.
 */
export function getPatternExamplesLoader(): PatternExamplesLoader {
  if (cached === null) {
    cached = PatternExamplesLoader.load();
  }
  return cached;
}

/**
 * Test-only: drop the cached loader so a subsequent call reloads the JSON
 * from disk. Do NOT use in production code.
 *
 * @internal
 */
export function _resetPatternExamplesLoaderForTests(): void {
  cached = null;
}
