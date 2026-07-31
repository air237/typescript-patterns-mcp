/**
 * Tool `list_patterns`: returns the catalog of the 23 Gang of Four design
 * patterns, optionally filtered by category.
 *
 * TypeScript sibling of `com.javapatterns.mcp.tools.ListPatternsTool`.
 *
 * Input schema:
 *   {
 *     "category": "Creational" | "Structural" | "Behavioral"   // optional
 *   }
 *
 * Output (single text content block, JSON-encoded):
 *   {
 *     "count": 5,
 *     "patterns": [
 *       {
 *         "name": "Singleton",
 *         "category": "Creational",
 *         "slug": "singleton",
 *         "aliases": ["Holder"],
 *         "intent": "Lets you ensure ...",
 *         "referenceUrl": "https://refactoring.guru/design-patterns/singleton"
 *       },
 *       ...
 *     ]
 *   }
 *
 * Returning the payload as a JSON string inside a single `text` content block
 * (rather than as `structuredContent`) is intentional: it keeps the tool
 * output compact, machine-parseable, AND immediately readable in any MCP
 * client UI without extra rendering.
 */

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  categoryFromKey,
  categoryInfo,
  getPatternRegistry,
  patternInfo,
  referenceUrl,
  type PatternMetadata,
  type PatternRegistry,
} from "../catalog/index.js";
import { type McpToolModule } from "./mcpToolModule.js";

export const LIST_PATTERNS_TOOL_NAME = "list_patterns";

// Accept every case variant, same as the Java sibling's enum-of-strings.
const CategoryArg = z
  .enum([
    "Creational",
    "Structural",
    "Behavioral",
    "creational",
    "structural",
    "behavioral",
  ])
  .describe(
    "Filter by category. Allowed values: Creational, Structural, Behavioral. " +
      "Case-insensitive. Omit to return all 23 patterns.",
  );

const listPatternsInputShape = {
  category: CategoryArg.optional(),
};

// Exported for tests — mirrors the Java `handle(args)` package-private hook.
export function handleListPatterns(
  registry: PatternRegistry,
  args: { category?: string | undefined },
): { content: Array<{ type: "text"; text: string }>; isError: boolean } {
  try {
    const filter = args.category === undefined ? null : categoryFromKey(args.category);

    if (args.category !== undefined && filter === null) {
      // categoryFromKey returned null even though a value was provided ⇒
      // unknown category label. Turn that into a structured error.
      throw new Error(
        `Unknown category '${args.category}'. Allowed: Creational, Structural, Behavioral.`,
      );
    }

    const entries: readonly PatternMetadata[] =
      filter === null ? registry.all() : registry.byCategory(filter);

    const payload = {
      count: entries.length,
      patterns: entries.map((md) => toJsonModel(md)),
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      isError: false,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text" as const, text: `Invalid argument: ${msg}` }],
      isError: true,
    };
  }
}

function toJsonModel(md: PatternMetadata): {
  name: string;
  category: string;
  slug: string;
  aliases: readonly string[];
  intent: string;
  referenceUrl: string;
} {
  const info = patternInfo(md.pattern);
  return {
    name: info.displayName,
    category: categoryInfo(info.category).displayName,
    slug: info.slug,
    aliases: md.aliases,
    intent: md.intent,
    referenceUrl: referenceUrl(md.pattern),
  };
}

export function createListPatternsTool(
  registry: PatternRegistry = getPatternRegistry(),
): McpToolModule {
  return {
    name: LIST_PATTERNS_TOOL_NAME,
    register(server: McpServer): void {
      server.registerTool(
        LIST_PATTERNS_TOOL_NAME,
        {
          description:
            "List the 23 Gang of Four design patterns with their intent, " +
            "category, aliases and reference URL. Optional argument `category` " +
            "filters the result: Creational, Structural, or Behavioral.",
          inputSchema: listPatternsInputShape,
        },
        (args) => handleListPatterns(registry, args),
      );
    },
  };
}
