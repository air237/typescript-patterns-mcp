/**
 * Health-check tool: clients can call `ping` to verify the server is alive
 * and report its identity, version, and the list of currently registered
 * tools.
 *
 * TypeScript sibling of `com.javapatterns.mcp.tools.PingTool`.
 *
 * Useful for:
 *   - Smoke-testing the MCP stdio handshake from a real client
 *     (OpenCode, Claude Desktop, Cursor, etc.).
 *   - Asserting in integration tests that the server starts and responds.
 *   - Debugging tool-registration drift — the response lists every tool
 *     currently exposed by the server.
 *
 * Input: no arguments.
 * Output: a single `text` content block with a short status string.
 */

import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { type McpToolModule } from "./mcpToolModule.js";

export const PING_TOOL_NAME = "ping";

export interface PingToolConfig {
  readonly serverName: string;
  readonly serverVersion: string;
  /**
   * Snapshot-provider for the currently registered tool names. Called on
   * every `ping` invocation, so late registrations show up too.
   */
  readonly registeredToolNames: () => readonly string[];
}

export function createPingTool(config: PingToolConfig): McpToolModule {
  return {
    name: PING_TOOL_NAME,
    register(server: McpServer): void {
      server.registerTool(
        PING_TOOL_NAME,
        {
          description:
            "Health-check tool. Returns server name, version, and the list of " +
            "currently registered MCP tools. Takes no arguments.",
        },
        () => {
          const tools = config.registeredToolNames();
          const response =
            `${config.serverName} ${config.serverVersion} — alive. ` +
            `Registered tools: [${tools.join(", ")}]`;
          return {
            content: [{ type: "text" as const, text: response }],
            isError: false,
          };
        },
      );
    },
  };
}
