/**
 * Tool `detect_pattern`: parses TypeScript source(s) and reports which
 * GoF design patterns the contained classes / interfaces participate in.
 *
 * TypeScript sibling of `com.javapatterns.mcp.tools.DetectPatternTool`.
 *
 * Accepts exactly one of three input modes:
 *
 *   { "source":    "class Foo { … }" }              // single inline source
 *   { "paths":     ["src/A.ts", "src/B.ts"] }       // list of files on disk
 *   { "directory": "src/main"                }      // recursive *.ts scan
 *
 * Output payload (single text content block, JSON-encoded):
 *
 *   {
 *     "supportedPatterns": [ "Singleton", "Builder", … ],
 *     "filesAnalyzed": 3,
 *     "detectionCount": 5,
 *     "detected": [
 *       { "file": "src/Foo.ts",
 *         "pattern": "Singleton",
 *         "category": "Creational",
 *         "className": "Logger",
 *         "startLine": 12,
 *         "confidence": 0.75,
 *         "evidence": ["private ctor", …] }
 *     ],
 *     "errors": [
 *       { "file": "src/Broken.ts", "message": "parse error: …" }
 *     ]
 *   }
 *
 * Patterns without a detector are neither listed in `supportedPatterns`
 * nor reported. This build ships detectors for all 23 GoF patterns, so
 * the list is complete.
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  categoryInfo,
  patternInfo,
  type Pattern,
} from "../catalog/index.js";
import {
  PatternDetectionEngine,
  type BatchResult,
  type FileDetection,
  type FileError,
} from "../detect/index.js";
import { type McpToolModule } from "./mcpToolModule.js";

export const DETECT_PATTERN_TOOL_NAME = "detect_pattern";

/** Safety caps mirroring the Java sibling. */
export const DEFAULT_MAX_FILES = 1000;
export const DEFAULT_MAX_FILE_BYTES = 1_048_576; // 1 MB

const detectPatternInputShape = {
  source: z
    .string()
    .optional()
    .describe(
      "A single TypeScript compilation unit as inline text. Use for ad-hoc analysis.",
    ),
  paths: z
    .array(z.string())
    .optional()
    .describe(
      "List of absolute or relative paths to .ts files. The server reads them itself, " +
        "so the caller does NOT need to slurp the source in. Recommended for a targeted " +
        "multi-file scan.",
    ),
  directory: z
    .string()
    .optional()
    .describe(
      "Path to a directory; the server walks it recursively and analyses every *.ts file. " +
        `Capped at ${DEFAULT_MAX_FILES} files.`,
    ),
};

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
};

interface Input {
  mode: "source" | "paths" | "directory";
  source?: string;
  paths?: readonly string[];
  directory?: string;
}

// Exported for tests.
export function parseInput(args: {
  source?: string | undefined;
  paths?: readonly string[] | undefined;
  directory?: string | undefined;
}): Input {
  const provided: string[] = [];
  if (typeof args.source === "string" && args.source !== "") provided.push("source");
  if (Array.isArray(args.paths) && args.paths.length > 0) provided.push("paths");
  if (typeof args.directory === "string" && args.directory !== "") provided.push("directory");

  if (provided.length === 0) {
    throw new Error(
      "Provide exactly one of: 'source' (inline string), 'paths' (string array), or 'directory' (string).",
    );
  }
  if (provided.length > 1) {
    throw new Error(
      `Provide exactly one of 'source', 'paths', or 'directory' — not several at once (got: ${provided.join(", ")}).`,
    );
  }

  if (provided[0] === "source") return { mode: "source", source: args.source! };
  if (provided[0] === "paths") return { mode: "paths", paths: args.paths! };
  return { mode: "directory", directory: args.directory! };
}

/**
 * Read one file, respecting the byte cap. Never throws — errors are
 * pushed to `errors` so a bad file cannot sink the batch.
 */
function tryReadOne(
  path: string,
  label: string,
  out: Map<string, string>,
  errors: FileError[],
): void {
  try {
    const st = statSync(path);
    if (!st.isFile()) {
      errors.push({ file: label, message: "not a regular file" });
      return;
    }
    if (st.size > DEFAULT_MAX_FILE_BYTES) {
      errors.push({
        file: label,
        message: `skipped: file is ${st.size} bytes, cap is ${DEFAULT_MAX_FILE_BYTES}`,
      });
      return;
    }
    out.set(label, readFileSync(path, "utf8"));
  } catch (e) {
    errors.push({
      file: label,
      message: `read failed: ${(e as Error).message}`,
    });
  }
}

function readPaths(
  paths: readonly string[],
  out: Map<string, string>,
  errors: FileError[],
): void {
  let count = 0;
  for (const p of paths) {
    if (count >= DEFAULT_MAX_FILES) {
      errors.push({
        file: p,
        message: `skipped: file count cap of ${DEFAULT_MAX_FILES} reached`,
      });
      continue;
    }
    tryReadOne(p, p, out, errors);
    count++;
  }
}

function readDirectory(
  directory: string,
  out: Map<string, string>,
  errors: FileError[],
): void {
  let rootStat;
  try {
    rootStat = statSync(directory);
  } catch {
    errors.push({ file: directory, message: "not a directory or does not exist" });
    return;
  }
  if (!rootStat.isDirectory()) {
    errors.push({ file: directory, message: "not a directory or does not exist" });
    return;
  }

  const files: string[] = [];
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      errors.push({
        file: dir,
        message: `directory walk failed: ${(e as Error).message}`,
      });
      return;
    }
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile() && extname(ent.name) === ".ts") {
        files.push(full);
      }
    }
  };
  walk(resolve(directory));

  files.sort();
  let count = 0;
  const rootResolved = resolve(directory);
  for (const p of files) {
    const label = relative(rootResolved, p) || p;
    if (count >= DEFAULT_MAX_FILES) {
      errors.push({
        file: label,
        message: `skipped: file count cap of ${DEFAULT_MAX_FILES} reached`,
      });
      continue;
    }
    tryReadOne(p, label, out, errors);
    count++;
  }
}

/** Round to N decimal places, matching the Java sibling's `round` helper. */
function round(v: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(v * factor) / factor;
}

interface FilePayload {
  file: string;
  pattern: string;
  category: string;
  className: string;
  startLine: number;
  confidence: number;
  evidence: readonly string[];
}

function toFilePayload(fd: FileDetection): FilePayload {
  const info = patternInfo(fd.detection.pattern);
  return {
    file: fd.file,
    pattern: info.displayName,
    category: categoryInfo(info.category).displayName,
    className: fd.detection.className,
    startLine: fd.detection.startLine,
    confidence: round(fd.detection.confidence, 3),
    evidence: fd.detection.evidence,
  };
}

// Exported for tests.
export function handleDetectPattern(
  engine: PatternDetectionEngine,
  args: {
    source?: string | undefined;
    paths?: readonly string[] | undefined;
    directory?: string | undefined;
  },
): ToolResult {
  let input: Input;
  try {
    input = parseInput(args);
  } catch (e) {
    return errorResult((e as Error).message);
  }

  const sources = new Map<string, string>();
  const ioErrors: FileError[] = [];
  if (input.mode === "source") {
    sources.set("<source>", input.source!);
  } else if (input.mode === "paths") {
    readPaths(input.paths!, sources, ioErrors);
  } else {
    readDirectory(input.directory!, sources, ioErrors);
  }

  let batch: BatchResult;
  if (sources.size === 0) {
    batch = { detections: [], errors: [], filesAnalyzed: 0 };
  } else {
    batch = engine.detectAll(sources);
  }

  const allErrors: FileError[] = [...ioErrors, ...batch.errors];
  const supportedNames = engine
    .supportedPatterns()
    .map((p: Pattern) => patternInfo(p).displayName)
    .sort();

  const payload = {
    supportedPatterns: supportedNames,
    filesAnalyzed: batch.filesAnalyzed,
    detectionCount: batch.detections.length,
    detected: batch.detections.map(toFilePayload),
    errors: allErrors.map((e) => ({ file: e.file, message: e.message })),
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    isError: false,
  };
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

function supportedSlugList(): string {
  return PatternDetectionEngine.getInstance()
    .supportedPatterns()
    .map((p) => patternInfo(p).slug)
    .sort()
    .join(", ");
}

export function createDetectPatternTool(
  engine: PatternDetectionEngine = PatternDetectionEngine.getInstance(),
): McpToolModule {
  return {
    name: DETECT_PATTERN_TOOL_NAME,
    register(server: McpServer): void {
      server.registerTool(
        DETECT_PATTERN_TOOL_NAME,
        {
          description:
            "Parse TypeScript source(s) and report which GoF design patterns the " +
            "contained classes / interfaces participate in. Returns per-instance " +
            "confidence (0-1) and the structural signals that fired, with the " +
            "originating file for every hit. Supports three input modes — pass " +
            "exactly one of: 'source' (single inline string), 'paths' (list of " +
            ".ts files on disk), or 'directory' (recursive scan). Per-file parse " +
            "failures are reported in 'errors' and do NOT abort the batch. " +
            `Supported patterns in this build: ${supportedSlugList()}.`,
          inputSchema: detectPatternInputShape,
        },
        (args) => handleDetectPattern(engine, args),
      );
    },
  };
}
