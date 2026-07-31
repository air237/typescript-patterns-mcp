import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import { buildServer, SERVER_NAME, SERVER_VERSION } from "../../src/server.js";

/**
 * End-to-end MCP handshake exercised over an in-memory transport pair.
 *
 * Same shape as the Java `JavaPatternsMcpServer` integration test, minus
 * stdio noise: build a real `McpServer`, connect it via
 * `InMemoryTransport.createLinkedPair()` to a real `Client`, then drive
 * `client.listTools()` and `client.callTool()`.
 *
 * If any tool-registration wiring in `buildServer()` drifts, one of these
 * assertions goes red — that is the whole point of the file.
 */
describe("MCP server integration (in-memory)", () => {
  async function connectClientAndServer(): Promise<{
    client: Client;
    close: () => Promise<void>;
  }> {
    const server = buildServer();
    const client = new Client({
      name: "typescript-patterns-mcp-integration-test",
      version: "0.0.0",
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    return {
      client,
      close: async () => {
        await client.close();
        await server.close();
      },
    };
  }

  it("advertises the ping, list_patterns, pattern_examples and generate_pattern tools via tools/list", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      const tools = await client.listTools();
      const names = tools.tools.map((t) => t.name);
      expect(names).toContain("ping");
      expect(names).toContain("list_patterns");
      expect(names).toContain("pattern_examples");
      expect(names).toContain("generate_pattern");
      expect(names).toHaveLength(4);
    } finally {
      await close();
    }
  });

  it("responds to ping with server identity and tool list", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      const result = await client.callTool({ name: "ping", arguments: {} });
      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.type).toBe("text");
      const text = content[0]?.text ?? "";
      expect(text).toContain(SERVER_NAME);
      expect(text).toContain(SERVER_VERSION);
      expect(text).toContain("ping");
      expect(text).toContain("list_patterns");
      expect(text).toContain("pattern_examples");
      expect(text).toContain("generate_pattern");
    } finally {
      await close();
    }
  });

  it("returns all 23 patterns when list_patterns is called without arguments", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      const result = await client.callTool({
        name: "list_patterns",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const payload = JSON.parse(content[0]!.text) as {
        count: number;
        patterns: Array<{ name: string }>;
      };
      expect(payload.count).toBe(23);
      expect(payload.patterns.map((p) => p.name)).toContain("Singleton");
      expect(payload.patterns.map((p) => p.name)).toContain("Visitor");
    } finally {
      await close();
    }
  });

  it("filters list_patterns to Creational (count=5)", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      const result = await client.callTool({
        name: "list_patterns",
        arguments: { category: "Creational" },
      });
      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const payload = JSON.parse(content[0]!.text) as {
        count: number;
        patterns: Array<{ name: string; category: string }>;
      };
      expect(payload.count).toBe(5);
      for (const p of payload.patterns) {
        expect(p.category).toBe("Creational");
      }
    } finally {
      await close();
    }
  });

  it("rejects invalid category argument via Zod input validation", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      // Zod rejects "Concurrency" at the SDK boundary — the SDK reports the
      // validation failure as a normal JSON-RPC tool response with
      // `isError: true` (MCP error -32602), NOT as a thrown promise.
      const result = await client.callTool({
        name: "list_patterns",
        arguments: { category: "Concurrency" },
      });
      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text ?? "").toMatch(/Invalid.*category|-32602/i);
    } finally {
      await close();
    }
  });

  it("returns Singleton example source via pattern_examples", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      const result = await client.callTool({
        name: "pattern_examples",
        arguments: { pattern: "singleton" },
      });
      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const payload = JSON.parse(content[0]!.text) as {
        pattern: string;
        category: string;
        fileCount: number;
        files: Array<{ fileName: string; note: string; source?: string }>;
      };
      expect(payload.pattern).toBe("Singleton");
      expect(payload.category).toBe("Creational");
      expect(payload.fileCount).toBe(1);
      expect(payload.files[0]?.fileName).toBe("Singleton.ts");
      expect(payload.files[0]?.source).toMatch(/private constructor/);
    } finally {
      await close();
    }
  });

  it("omits source when pattern_examples is called with includeSource=false", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      const result = await client.callTool({
        name: "pattern_examples",
        arguments: { pattern: "factory-method", includeSource: false },
      });
      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const payload = JSON.parse(content[0]!.text) as {
        fileCount: number;
        files: Array<{ fileName: string; note: string; source?: string }>;
      };
      expect(payload.fileCount).toBe(6);
      for (const f of payload.files) {
        expect(f.source).toBeUndefined();
      }
    } finally {
      await close();
    }
  });

  it("errors on unknown pattern via pattern_examples", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      const result = await client.callTool({
        name: "pattern_examples",
        arguments: { pattern: "Non-Existent-Pattern" },
      });
      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text ?? "").toMatch(/Unknown pattern/);
    } finally {
      await close();
    }
  });

  it("generates a Singleton via generate_pattern with typeName='AuditLogger'", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      const result = await client.callTool({
        name: "generate_pattern",
        arguments: { pattern: "singleton", typeName: "AuditLogger" },
      });
      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const payload = JSON.parse(content[0]!.text) as {
        pattern: string;
        category: string;
        fileCount: number;
        files: Array<{ fileName: string; source: string }>;
      };
      expect(payload.pattern).toBe("Singleton");
      expect(payload.category).toBe("Creational");
      expect(payload.fileCount).toBe(1);
      expect(payload.files[0]?.fileName).toBe("AuditLogger.ts");
      expect(payload.files[0]?.source).toMatch(/export class AuditLogger /);
      expect(payload.files[0]?.source).toMatch(/private constructor/);
      expect(payload.files[0]?.source).toMatch(/static getInstance\s*\(/);
    } finally {
      await close();
    }
  });

  it("rejects non-PascalCase typeName via generate_pattern", async () => {
    const { client, close } = await connectClientAndServer();
    try {
      const result = await client.callTool({
        name: "generate_pattern",
        arguments: { pattern: "singleton", typeName: "logger" },
      });
      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text ?? "").toMatch(/PascalCase/);
    } finally {
      await close();
    }
  });
});
