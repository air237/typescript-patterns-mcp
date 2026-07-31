/**
 * Builds the `McpServer` instance and registers the currently wired tool
 * set. Kept separate from the stdio bootstrap in `index.ts` so integration
 * tests can build a server against an in-memory transport without touching
 * stdio.
 *
 * TypeScript sibling of `com.javapatterns.mcp.JavaPatternsMcpServer#buildServer`.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  createDetectPatternTool,
  createGeneratePatternTool,
  createListPatternsTool,
  createPatternExamplesTool,
  createPingTool,
  type McpToolModule,
} from "./tools/index.js";

/** Fixed identity of this MCP server. */
export const SERVER_NAME = "typescript-patterns-mcp";
export const SERVER_VERSION = "0.1.0";

export function buildServer(): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // The tool list drives what `ping` reports; keep it as the single
  // registration snapshot so late additions cannot desync.
  const registeredToolNames: string[] = [];

  // `ping` is built first, but its callback reads the tool-name array
  // lazily, so tools registered afterwards still show up.
  const ping = createPingTool({
    serverName: SERVER_NAME,
    serverVersion: SERVER_VERSION,
    registeredToolNames: () => [...registeredToolNames],
  });

  const listPatterns = createListPatternsTool();
  const patternExamples = createPatternExamplesTool();
  const generatePattern = createGeneratePatternTool();
  const detectPattern = createDetectPatternTool();

  const modules: readonly McpToolModule[] = [
    ping,
    listPatterns,
    patternExamples,
    generatePattern,
    detectPattern,
  ];
  for (const mod of modules) {
    mod.register(server);
    registeredToolNames.push(mod.name);
  }

  return server;
}
