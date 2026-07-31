#!/usr/bin/env node
/**
 * Entry point for the `typescript-patterns-mcp` server.
 *
 * Bootstraps an MCP server over stdio:
 *   1. Creates a StdioServerTransport that reads JSON-RPC frames from stdin
 *      and writes responses to stdout.
 *   2. Builds an McpServer (see `./server.ts`) and connects it to the
 *      transport.
 *   3. Blocks the process by leaving stdin open — Node exits when the
 *      client closes stdin or sends SIGINT/SIGTERM.
 *
 * IMPORTANT: MCP stdio uses stdout EXCLUSIVELY for JSON-RPC frames. Every
 * log line goes to stderr. `console.log` is banned via ESLint; use
 * `console.error` for diagnostics.
 *
 * TypeScript sibling of `com.javapatterns.mcp.JavaPatternsMcpServer#main`.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { buildServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

async function main(): Promise<void> {
  console.error(
    `${SERVER_NAME} ${SERVER_VERSION} starting (Phase 3: stdio + ping + list_patterns)`,
  );

  const server = buildServer();
  const transport = new StdioServerTransport();

  const cleanup = async (signal: string): Promise<void> => {
    console.error(`Shutdown signal ${signal} received, closing MCP server gracefully.`);
    try {
      await server.close();
    } catch (e) {
      console.error("Error during server graceful shutdown:", e);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void cleanup("SIGINT"));
  process.on("SIGTERM", () => void cleanup("SIGTERM"));

  await server.connect(transport);
  console.error("MCP server ready, waiting for client over stdio.");
}

main().catch((err: unknown) => {
  console.error("Fatal error while starting MCP server:", err);
  process.exit(1);
});
