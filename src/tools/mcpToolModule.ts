/**
 * Small type definition shared by all tool modules. Each tool exports a
 * `register(server)` function that wires its `registerTool(...)` call into
 * the `McpServer` instance. This keeps the wiring code in one place
 * (`buildServer` in `../server.ts`) and mirrors the
 * `<Tool>.specification()` factory approach used on the Java side.
 */

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface McpToolModule {
  /** Tool name as exposed over MCP. */
  readonly name: string;
  /** Wire this tool into an `McpServer` instance. */
  register(server: McpServer): void;
}
