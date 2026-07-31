/**
 * Tool `validate_pattern`: parses a TypeScript source and checks each
 * detected pattern instance against pattern-specific correctness rules.
 *
 * TypeScript sibling of `com.javapatterns.mcp.tools.ValidatePatternTool`.
 *
 * Input schema:
 *   {
 *     "source":  "…",                              (required)
 *     "pattern": "singleton" | "builder" | …       (optional)
 *   }
 *
 * When `pattern` is omitted, every supported pattern is validated.
 *
 * Output (single text content block, JSON-encoded):
 *   {
 *     "supportedPatterns": ["Builder", "Observer", "Singleton", …],
 *     "issueCount": 2,
 *     "errors": 1, "warnings": 1, "infos": 0,
 *     "issues": [
 *       { "pattern": "Singleton", "className": "Cache", "line": 5,
 *         "severity": "ERROR",
 *         "issue": "…", "suggestion": "…" }
 *     ]
 *   }
 *
 * An empty `issues` array means the code matches the rules this build
 * encodes. A non-empty list does not mean the code is broken — only
 * that a validator's heuristic fired. Read each issue's severity +
 * suggestion before changing anything.
 */

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  patternFromKey,
  patternInfo,
  type Pattern,
} from "../catalog/index.js";
import {
  PatternValidationEngine,
  ValidationError,
  type ValidationIssue,
} from "../validate/index.js";
import { type McpToolModule } from "./mcpToolModule.js";

export const VALIDATE_PATTERN_TOOL_NAME = "validate_pattern";

const validatePatternInputShape = {
  source: z
    .string()
    .min(1)
    .describe("The full TypeScript source text to validate."),
  pattern: z
    .string()
    .optional()
    .describe(
      "Optional pattern identifier. If omitted, every supported pattern is validated. " +
        "Accepts enum names, slugs, and display names.",
    ),
};

interface IssuePayload {
  pattern: string;
  className: string;
  line: number;
  severity: "ERROR" | "WARNING" | "INFO";
  issue: string;
  suggestion: string;
}
interface Payload {
  supportedPatterns: string[];
  issueCount: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: IssuePayload[];
}

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
};

export function handleValidatePattern(
  engine: PatternValidationEngine,
  args: { source: string; pattern?: string | undefined },
): ToolResult {
  const source = args.source;
  if (source.trim() === "") {
    return errorResult("Missing required argument: 'source'.");
  }
  const patternKey = args.pattern;

  let issues: readonly ValidationIssue[];
  try {
    if (patternKey === undefined || patternKey.trim() === "") {
      issues = engine.validateAll(source);
    } else {
      let pattern: Pattern;
      try {
        pattern = patternFromKey(patternKey);
      } catch {
        return errorResult(`Unknown pattern '${patternKey}'.`);
      }
      const supported = new Set(engine.supportedPatterns());
      if (!supported.has(pattern)) {
        return errorResult(
          `No validator for ${patternInfo(pattern).displayName}. Supported: ${supportedSlugList()}.`,
        );
      }
      issues = engine.validateOne(source, pattern);
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      return errorResult(`Failed to parse source: ${e.message}`);
    }
    return errorResult(`Internal error: ${(e as Error).message}`);
  }

  const counts = { errors: 0, warnings: 0, infos: 0 };
  for (const i of issues) {
    if (i.severity === "ERROR") counts.errors++;
    else if (i.severity === "WARNING") counts.warnings++;
    else counts.infos++;
  }

  const supportedNames = engine
    .supportedPatterns()
    .map((p) => patternInfo(p).displayName)
    .sort();

  const payload: Payload = {
    supportedPatterns: supportedNames,
    issueCount: issues.length,
    errors: counts.errors,
    warnings: counts.warnings,
    infos: counts.infos,
    issues: issues.map(toIssuePayload),
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    isError: false,
  };
}

function toIssuePayload(i: ValidationIssue): IssuePayload {
  return {
    pattern: patternInfo(i.pattern).displayName,
    className: i.className,
    line: i.line,
    severity: i.severity,
    issue: i.issue,
    suggestion: i.suggestion,
  };
}

function supportedSlugList(): string {
  return PatternValidationEngine.getInstance()
    .supportedPatterns()
    .map((p) => patternInfo(p).slug)
    .sort()
    .join(", ");
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export function createValidatePatternTool(
  engine: PatternValidationEngine = PatternValidationEngine.getInstance(),
): McpToolModule {
  return {
    name: VALIDATE_PATTERN_TOOL_NAME,
    register(server: McpServer): void {
      server.registerTool(
        VALIDATE_PATTERN_TOOL_NAME,
        {
          description:
            "Validate the implementation quality of design pattern instances in a " +
            "TypeScript source. Returns issues grouped by ERROR / WARNING / INFO, " +
            "each with a concrete suggestion. Pass `pattern` to focus on one; omit " +
            "to validate every supported pattern in the source. Supported in this " +
            `build: ${supportedSlugList()}.`,
          inputSchema: validatePatternInputShape,
        },
        (args) => handleValidatePattern(engine, args),
      );
    },
  };
}
