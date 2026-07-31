/**
 * Tool `pattern_examples`: returns canonical TypeScript example sources for a
 * given design pattern.
 *
 * TypeScript sibling of `com.javapatterns.mcp.tools.PatternExamplesTool`.
 *
 * Input schema:
 *   {
 *     "pattern":       "Singleton" | "singleton" | "SINGLETON" | …   (required)
 *     "includeSource": true | false                                  (optional, default true)
 *   }
 *
 * Output (single text content block, JSON-encoded):
 *   {
 *     "pattern": "Singleton",
 *     "category": "Creational",
 *     "fileCount": 1,
 *     "files": [
 *       {
 *         "fileName": "Singleton.ts",
 *         "note": "Class-based Singleton with private constructor …",
 *         "source": "export class Singleton { ... }"
 *       }
 *     ]
 *   }
 *
 * When `includeSource=false`, the `source` field is omitted — useful when the
 * agent only wants to discover which files exist for a pattern before fetching
 * their bytes.
 *
 * Patterns without an example yet return `fileCount: 0` with an empty `files`
 * array, not an error. Use `list_patterns` to see all 23 supported keys, then
 * call this tool to discover which have examples wired up.
 *
 * The Java sibling's `packageName` field is intentionally absent: TypeScript
 * modules have no package declaration.
 */

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  categoryInfo,
  getPatternExamplesLoader,
  patternFromKey,
  patternInfo,
  type PatternExample,
  type PatternExamplesLoader,
} from "../catalog/index.js";
import { type McpToolModule } from "./mcpToolModule.js";

export const PATTERN_EXAMPLES_TOOL_NAME = "pattern_examples";

const patternExamplesInputShape = {
  pattern: z
    .string()
    .min(1)
    .describe(
      "Pattern identifier. Examples: 'singleton', 'Singleton', 'SINGLETON', " +
        "'chain-of-responsibility', 'Chain of Responsibility'.",
    ),
  includeSource: z
    .boolean()
    .optional()
    .describe("Include the file source bytes in the response. Defaults to true."),
};

interface FilePayloadWithSource {
  fileName: string;
  note: string;
  source: string;
}
interface FilePayloadWithoutSource {
  fileName: string;
  note: string;
}
type FilePayload = FilePayloadWithSource | FilePayloadWithoutSource;

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

// Exported for tests, mirrors the Java `handle(args)` package-private hook.
export function handlePatternExamples(
  loader: PatternExamplesLoader,
  args: { pattern: string; includeSource?: boolean | undefined },
): ToolResult {
  try {
    const patternKey = args.pattern.trim();
    if (patternKey === "") {
      return errorResult("Missing required argument: 'pattern'.");
    }
    const includeSource = args.includeSource ?? true;

    let pattern;
    try {
      pattern = patternFromKey(patternKey);
    } catch {
      return errorResult(
        `Unknown pattern '${patternKey}'. ` +
          "Use the `list_patterns` tool to see all supported pattern names.",
      );
    }

    const info = patternInfo(pattern);
    const examples = loader.forPattern(pattern);

    const payload: Payload = {
      pattern: info.displayName,
      category: categoryInfo(info.category).displayName,
      fileCount: examples.length,
      files: examples.map((ex) => toFilePayload(ex, includeSource)),
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      isError: false,
    };
  } catch (e) {
    return errorResult(`Internal error: ${(e as Error).message}`);
  }
}

function toFilePayload(ex: PatternExample, includeSource: boolean): FilePayload {
  if (includeSource) {
    return {
      fileName: ex.fileName,
      note: ex.note,
      source: ex.source,
    };
  }
  return {
    fileName: ex.fileName,
    note: ex.note,
  };
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export function createPatternExamplesTool(
  loader: PatternExamplesLoader = getPatternExamplesLoader(),
): McpToolModule {
  return {
    name: PATTERN_EXAMPLES_TOOL_NAME,
    register(server: McpServer): void {
      server.registerTool(
        PATTERN_EXAMPLES_TOOL_NAME,
        {
          description:
            "Return canonical, compilable TypeScript example source(s) for a " +
            "given Gang of Four design pattern. Accepts enum names, slugs, or " +
            "display names (case-insensitive). When `includeSource` is false " +
            "the file metadata is returned without the source bytes — useful " +
            "for discovery.",
          inputSchema: patternExamplesInputShape,
        },
        (args) => handlePatternExamples(loader, args),
      );
    },
  };
}
