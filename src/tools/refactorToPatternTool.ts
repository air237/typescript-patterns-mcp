/**
 * Tool `refactor_to_pattern`: applies a small, idempotent AST-level
 * refactoring to a TypeScript source and returns the rewritten code
 * plus a changelog.
 *
 * TypeScript sibling of `com.javapatterns.mcp.tools.RefactorPatternTool`.
 *
 * Input schema:
 *   {
 *     "source":      "…",                       (required)
 *     "refactoring": "singleton-make-ctor-private" | …   (required)
 *   }
 *
 * Output (single text content block, JSON-encoded):
 *   {
 *     "refactoring":  "singleton-make-ctor-private",
 *     "pattern":      "Singleton",
 *     "changed":      true,
 *     "changeCount":  1,
 *     "changes":      ["Logger: constructor at line 5 made private"],
 *     "newSource":    "…"
 *   }
 *
 * A `changed: false` response indicates the refactoring was a no-op —
 * either the source already conforms to the target shape, or the class
 * didn't match the refactoring's shape gate. Either way, `newSource`
 * equals the input.
 */

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { patternInfo } from "../catalog/index.js";
import {
  PatternRefactoringEngine,
  RefactoringError,
  refactoringFromKey,
  refactoringInfo,
  type RefactoringId,
} from "../refactor/index.js";
import { type McpToolModule } from "./mcpToolModule.js";

export const REFACTOR_TO_PATTERN_TOOL_NAME = "refactor_to_pattern";

const refactorInputShape = {
  source: z
    .string()
    .min(1)
    .describe("The TypeScript source to rewrite."),
  refactoring: z
    .string()
    .min(1)
    .describe(
      "Refactoring identifier. Accepts either the enum key " +
        "(e.g. 'SINGLETON_MAKE_CTOR_PRIVATE') or the public slug " +
        "(e.g. 'singleton-make-ctor-private').",
    ),
};

interface Payload {
  refactoring: string;
  pattern: string;
  changed: boolean;
  changeCount: number;
  changes: readonly string[];
  newSource: string;
}

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
};

export function handleRefactorToPattern(
  engine: PatternRefactoringEngine,
  args: { source: string; refactoring: string },
): ToolResult {
  const source = args.source;
  if (source.trim() === "") {
    return errorResult("Missing required argument: 'source'.");
  }
  const key = args.refactoring;
  if (key.trim() === "") {
    return errorResult("Missing required argument: 'refactoring'.");
  }

  let id: RefactoringId;
  try {
    id = refactoringFromKey(key);
  } catch {
    return errorResult(
      `Unknown refactoring '${key}'. Supported: ${supportedSlugList()}.`,
    );
  }

  try {
    const result = engine.apply(source, id);
    const info = refactoringInfo(id);
    const payload: Payload = {
      refactoring: info.slug,
      pattern: patternInfo(info.pattern).displayName,
      changed: result.changed,
      changeCount: result.changes.length,
      changes: result.changes,
      newSource: result.newSource,
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      isError: false,
    };
  } catch (e) {
    if (e instanceof RefactoringError) {
      return errorResult(e.message);
    }
    return errorResult(`Internal error: ${(e as Error).message}`);
  }
}

function supportedSlugList(): string {
  return PatternRefactoringEngine.getInstance()
    .supported()
    .map((r) => refactoringInfo(r).slug)
    .sort()
    .join(", ");
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export function createRefactorToPatternTool(
  engine: PatternRefactoringEngine = PatternRefactoringEngine.getInstance(),
): McpToolModule {
  return {
    name: REFACTOR_TO_PATTERN_TOOL_NAME,
    register(server: McpServer): void {
      server.registerTool(
        REFACTOR_TO_PATTERN_TOOL_NAME,
        {
          description:
            "Apply a small, idempotent AST refactoring to a TypeScript source. " +
            "Returns the rewritten code plus a changelog. Use validate_pattern " +
            "first to discover which refactoring to apply. Supported in this " +
            `build: ${supportedSlugList()}.`,
          inputSchema: refactorInputShape,
        },
        (args) => handleRefactorToPattern(engine, args),
      );
    },
  };
}
