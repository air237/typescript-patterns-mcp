/**
 * Generates fully-parameterised TypeScript sources for a design pattern.
 *
 * TypeScript sibling of `com.javapatterns.mcp.generate.PatternGenerator`.
 *
 * Each supported pattern has a template index file at
 * `resources/templates/<slug>/template-index.json` listing the template
 * files and their resolved file names. Each template file lives next to
 * the index and uses `${PLACEHOLDER}` markers (no escaping, no nesting —
 * intentional: keeps generation deterministic and easy to debug).
 *
 * Placeholders exposed to every template:
 *   - `${TYPE_NAME}`          — the caller's chosen main type
 *                               (e.g. `"Logger"` for Singleton). Must be
 *                               PascalCase.
 *   - `${TYPE_NAME_CAMEL}`    — the same name with the first letter
 *                               lowered (`"logger"`). Used for local
 *                               variable names and export identifiers
 *                               inside the generated code.
 *   - `${TYPE_NAME_LOWERCASE}` — the entire name lowercased
 *                                (`"logger"`, `"httpservice"`). Used for
 *                                naming helper modules.
 *
 * The Java sibling's `${PACKAGE_NAME}` and `${PACKAGE_DECL}` placeholders
 * are intentionally absent — TypeScript modules have no package
 * declaration. See COVERAGE.md → "TS-specific deltas".
 *
 * Patterns absent from `SUPPORTED_PATTERNS` throw when passed to
 * {@link generate}; the calling tool converts that into a structured
 * "not generated yet" error message.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { PATTERNS, type Pattern, patternInfo } from "../catalog/index.js";
import { type GeneratedFile } from "./generatedFile.js";

/** Patterns whose templates are bundled in this build. */
export const SUPPORTED_PATTERNS: readonly Pattern[] = [...PATTERNS] as const;

// ─── resource resolution ──────────────────────────────────────────────

/**
 * Locate the bundled `resources/` folder. `import.meta.url` at build time
 * is `.../dist/generate/patternGenerator.js`, at test time
 * `.../src/generate/patternGenerator.ts`. `../..` reaches the package
 * root where `resources/` lives in both cases.
 */
function resourcesRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "resources");
}

// ─── manifest shape ───────────────────────────────────────────────────

interface RawIndex {
  files: RawFile[];
}

interface RawFile {
  /** Output file name; may itself contain `${TYPE_NAME}` etc. */
  fileName: string;
  /** Template resource name under `resources/templates/<slug>/`. */
  template: string;
}

// ─── PatternGenerator ─────────────────────────────────────────────────

export interface GenerateParams {
  /** The caller's chosen main type name (must be PascalCase). */
  typeName: string;
}

export class PatternGenerator {
  private constructor(private readonly root: string) {}

  private static _instance: PatternGenerator | null = null;

  static getInstance(): PatternGenerator {
    PatternGenerator._instance ??= new PatternGenerator(resourcesRoot());
    return PatternGenerator._instance;
  }

  /**
   * Returns true if this build ships a template set for `pattern`.
   */
  supports(pattern: Pattern): boolean {
    return SUPPORTED_PATTERNS.includes(pattern);
  }

  /**
   * Generates the file set for the given pattern.
   *
   * @param pattern the pattern to render.
   * @param params  placeholder values; `typeName` is required.
   * @returns the ordered list of generated files.
   * @throws if the pattern is not in {@link SUPPORTED_PATTERNS}, or if a
   *         template file is missing or the index is malformed.
   */
  generate(pattern: Pattern, params: GenerateParams): readonly GeneratedFile[] {
    if (!this.supports(pattern)) {
      // A defensive `patternInfo()` lookup here would itself throw on
      // completely bogus input (which callers exercise via `as any`
      // casts in tests), so keep the message safe against that.
      const slug = (PATTERNS as readonly string[]).includes(pattern)
        ? patternInfo(pattern).slug
        : String(pattern).toLowerCase();
      throw new Error(
        `No template wired yet for pattern ${pattern}. ` +
          "Use the pattern_examples tool for canonical reference sources, or " +
          `contribute a template under resources/templates/${slug}/.`,
      );
    }

    const substitutions: Record<string, string> = {
      TYPE_NAME: params.typeName,
      TYPE_NAME_CAMEL: lowerFirst(params.typeName),
      TYPE_NAME_LOWERCASE: params.typeName.toLowerCase(),
    };

    const index = this.loadIndex(pattern);
    const out: GeneratedFile[] = [];
    for (const tf of index.files) {
      const body = this.readTemplate(pattern, tf.template);
      const rendered = substitute(body, substitutions);
      const fileName = substitute(tf.fileName, substitutions);
      out.push({ fileName, source: rendered });
    }
    return out;
  }

  // ─── resource I/O ───────────────────────────────────────────────────

  private loadIndex(pattern: Pattern): RawIndex {
    const slug = patternInfo(pattern).slug;
    const indexPath = resolve(
      this.root,
      "templates",
      slug,
      "template-index.json",
    );
    let raw: string;
    try {
      raw = readFileSync(indexPath, "utf8");
    } catch (e) {
      throw new Error(
        `Template index missing at ${indexPath}: ${(e as Error).message}`,
      );
    }

    let parsed: RawIndex;
    try {
      parsed = JSON.parse(raw) as RawIndex;
    } catch (e) {
      throw new Error(
        `template-index.json at ${indexPath} is malformed: ${(e as Error).message}`,
      );
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.files) ||
      parsed.files.length === 0
    ) {
      throw new Error(
        `template-index.json at ${indexPath} is not the expected shape.`,
      );
    }
    for (const f of parsed.files) {
      if (
        f === null ||
        typeof f !== "object" ||
        typeof f.fileName !== "string" ||
        typeof f.template !== "string"
      ) {
        throw new Error(
          `template-index.json entry has invalid shape: ${JSON.stringify(f)}`,
        );
      }
    }
    return parsed;
  }

  private readTemplate(pattern: Pattern, templateName: string): string {
    const slug = patternInfo(pattern).slug;
    const templatePath = resolve(this.root, "templates", slug, templateName);
    try {
      return readFileSync(templatePath, "utf8");
    } catch (e) {
      throw new Error(
        `Template file missing at ${templatePath}: ${(e as Error).message}`,
      );
    }
  }
}

// ─── helpers (exported for tests) ─────────────────────────────────────

/**
 * Plain `${KEY}` substitution. Unknown keys are left untouched (verbatim).
 * A leading backslash escapes the placeholder — `\${foo}` renders as
 * literal `${foo}` (the backslash is consumed). This is necessary because
 * TypeScript templates frequently need real template literals inside a
 * backtick string, and we don't want the generator to eat them.
 *
 * No regex — a single-pass scan so behaviour is trivially predictable.
 * Same algorithm as the Java sibling's `PatternGenerator.substitute`,
 * extended with the escape rule.
 */
export function substitute(
  template: string,
  params: Readonly<Record<string, string>>,
): string {
  let out = "";
  let i = 0;
  while (i < template.length) {
    const dollar = template.indexOf("${", i);
    if (dollar < 0) {
      out += template.slice(i);
      break;
    }
    // Escape rule: `\${…}` -> literal `${…}`, backslash consumed.
    if (dollar > 0 && template[dollar - 1] === "\\") {
      const end = template.indexOf("}", dollar + 2);
      if (end < 0) {
        out += template.slice(i);
        break;
      }
      // Emit up to (but excluding) the backslash, then the literal `${…}`.
      out += template.slice(i, dollar - 1);
      out += template.slice(dollar, end + 1);
      i = end + 1;
      continue;
    }
    const end = template.indexOf("}", dollar + 2);
    if (end < 0) {
      // No closing brace — emit the rest verbatim.
      out += template.slice(i);
      break;
    }
    out += template.slice(i, dollar);
    const key = template.slice(dollar + 2, end);
    const value = params[key];
    if (value !== undefined) {
      out += value;
    } else {
      // Unknown placeholder — leave `${…}` untouched.
      out += template.slice(dollar, end + 1);
    }
    i = end + 1;
  }
  return out;
}

/**
 * `"Logger"` → `"logger"`, `"HttpService"` → `"httpService"`.
 * Empty input returns empty. Handles a leading run of upper-case letters
 * gracefully (`"HTTPService"` → `"httpService"`).
 */
export function lowerFirst(name: string): string {
  if (name.length === 0) return "";
  if (name.length === 1) return name.toLowerCase();
  // Preserve acronym runs: HTTPService -> httpService (not hTTPService).
  const first = name[0]!;
  const second = name[1]!;
  if (first === first.toUpperCase() && second === second.toUpperCase()) {
    // Find the run of consecutive upper-case letters and lower-case all
    // but the last one (which starts the "real" word).
    let runEnd = 1;
    while (
      runEnd < name.length &&
      name[runEnd] === name[runEnd]!.toUpperCase() &&
      name[runEnd]!.toLowerCase() !== name[runEnd]
    ) {
      runEnd += 1;
    }
    if (runEnd === name.length) {
      // Whole name is upper-case: "HTTP" -> "http".
      return name.toLowerCase();
    }
    // Lower-case everything up to (but excluding) the last upper of the run.
    return (
      name.slice(0, runEnd - 1).toLowerCase() + name.slice(runEnd - 1)
    );
  }
  return first.toLowerCase() + name.slice(1);
}

// ─── test-only reset hook ─────────────────────────────────────────────

/** @internal Test-only: drop the cached PatternGenerator instance. */
export function _resetPatternGeneratorForTests(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (PatternGenerator as unknown as { _instance: PatternGenerator | null })._instance = null;
}
