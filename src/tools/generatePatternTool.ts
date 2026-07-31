/**
 * Tool `generate_pattern`: produces a tailored TypeScript implementation of
 * a chosen pattern using the caller's main type name.
 *
 * TypeScript sibling of `com.javapatterns.mcp.tools.GeneratePatternTool`.
 *
 * Input schema:
 *   {
 *     "pattern":  "singleton" | "builder" | …   (required, resolved via `patternFromKey`)
 *     "typeName": "Logger"                       (required, must be PascalCase)
 *   }
 *
 * Java's `packageName` parameter is intentionally absent: TypeScript modules
 * have no package declaration.
 *
 * Output (single text content block, JSON-encoded):
 *   {
 *     "pattern":   "Singleton",
 *     "category":  "Creational",
 *     "fileCount": 1,
 *     "files": [
 *       { "fileName": "Logger.ts", "source": "…" }
 *     ]
 *   }
 *
 * `typeName` MUST match `/^[A-Z][A-Za-z0-9]*$/` — strict PascalCase. Anything
 * else (leading digit, lower-case start, non-ASCII, `_`, `$`, whitespace,
 * empty) is rejected as `isError: true`.
 */

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  categoryInfo,
  patternFromKey,
  patternInfo,
  type Pattern,
} from "../catalog/index.js";
import {
  PatternGenerator,
  SUPPORTED_PATTERNS,
  type GeneratedFile,
} from "../generate/index.js";
import { type McpToolModule } from "./mcpToolModule.js";

export const GENERATE_PATTERN_TOOL_NAME = "generate_pattern";

const generatePatternInputShape = {
  pattern: z
    .string()
    .min(1)
    .describe(
      "Pattern identifier. Case-insensitive. Accepts enum names " +
        "('SINGLETON'), slugs ('singleton', 'chain-of-responsibility'), and " +
        "display names ('Singleton', 'Chain of Responsibility').",
    ),
  typeName: z
    .string()
    .min(1)
    .describe(
      "Main type name to use in the generated code (e.g. 'Logger' for " +
        "Singleton, 'Pizza' for Builder). Must be PascalCase (regex " +
        "^[A-Z][A-Za-z0-9]*$).",
    ),
};

// Strict PascalCase — starts with an ASCII upper-case letter, then only
// ASCII letters and digits. Matches the class-name convention used in every
// bundled example, so a generated file drops in without lint pushback.
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;

interface FilePayload {
  fileName: string;
  source: string;
}
interface Payload {
  pattern: string;
  category: string;
  fileCount: number;
  files: FilePayload[];
}

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
};

/** Exported for tests. */
export function isPascalCase(name: string): boolean {
  return PASCAL_CASE.test(name);
}

export function handleGeneratePattern(
  generator: PatternGenerator,
  args: { pattern: string; typeName: string },
): ToolResult {
  try {
    const patternKey = args.pattern.trim();
    const typeName = args.typeName.trim();

    if (patternKey === "") return errorResult("Missing required argument: 'pattern'.");
    if (typeName === "") return errorResult("Missing required argument: 'typeName'.");

    if (!isPascalCase(typeName)) {
      return errorResult(
        `'typeName' must be PascalCase (^[A-Z][A-Za-z0-9]*$), got: '${typeName}'.`,
      );
    }

    let pattern: Pattern;
    try {
      pattern = patternFromKey(patternKey);
    } catch {
      return errorResult(
        `Unknown pattern '${patternKey}'. ` +
          "Use the `list_patterns` tool to see all supported pattern names.",
      );
    }

    if (!generator.supports(pattern)) {
      return errorResult(
        `No generator template wired yet for ${patternInfo(pattern).displayName}. ` +
          `Supported in this build: ${supportedSlugList()}. For a canonical ` +
          "reference implementation use the `pattern_examples` tool.",
      );
    }

    const files = generator.generate(pattern, { typeName });
    const info = patternInfo(pattern);
    const payload: Payload = {
      pattern: info.displayName,
      category: categoryInfo(info.category).displayName,
      fileCount: files.length,
      files: files.map(toFilePayload),
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      isError: false,
    };
  } catch (e) {
    return errorResult(`Internal error: ${(e as Error).message}`);
  }
}

function toFilePayload(g: GeneratedFile): FilePayload {
  return {
    fileName: g.fileName,
    source: g.source,
  };
}

function supportedSlugList(): string {
  return SUPPORTED_PATTERNS.map((p) => patternInfo(p).slug)
    .sort()
    .join(", ");
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export function createGeneratePatternTool(
  generator: PatternGenerator = PatternGenerator.getInstance(),
): McpToolModule {
  return {
    name: GENERATE_PATTERN_TOOL_NAME,
    register(server: McpServer): void {
      server.registerTool(
        GENERATE_PATTERN_TOOL_NAME,
        {
          description:
            "Generate a customised TypeScript implementation of a design " +
            "pattern using the caller's main type name. Returns the rendered " +
            `source, ready to compile. Supported patterns: ${supportedSlugList()}. ` +
            "Enum names, slugs, and display names are all accepted " +
            "(case-insensitive). 'typeName' must be PascalCase.",
          inputSchema: generatePatternInputShape,
        },
        (args) => handleGeneratePattern(generator, args),
      );
    },
  };
}
