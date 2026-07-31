# typescript-patterns-mcp

> A **Model Context Protocol (MCP)** server that exposes the 23 Gang of Four
> design patterns to AI coding agents — **generation**, **canonical examples**,
> **AST-based detection**, **validation**, and **anti-pattern refactoring**
> for TypeScript codebases.

[![Node 20+](https://img.shields.io/badge/Node-20%2B-brightgreen)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.30-purple)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Sibling project of [`java-patterns-mcp`](https://github.com/air237/java-patterns-mcp).
Same intent, same tool surface, same 23-pattern coverage matrix — but for
TypeScript source code and running on Node.js via the official
`@modelcontextprotocol/sdk`.

---

## Why

Generic LLMs can describe design patterns, but their generated TypeScript
code is inconsistent — wrong `readonly` placement, subtle double-dispatch
bugs in Visitor, missing `Object.freeze` on Prototype clones, Singleton
"instances" that lose identity across `import` graphs when bundlers split
chunks. And no LLM can deterministically scan a real TypeScript codebase
to say *"this class is a buggy Singleton because it uses a plain module
constant with a public constructor"*.

This MCP server fills that gap with **deterministic, AST-backed tooling**
built on [`ts-morph`](https://ts-morph.com/) (the TypeScript Compiler API
made ergonomic).

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Project skeleton (`package.json`, `tsconfig`, ESLint, Vitest, licence, structure) | ✅ done |
| 1 | MCP bootstrap + stdio transport + `ping` tool | ✅ done |
| 2 | Pattern catalog model (23 GoF + metadata) | ✅ done |
| 3 | `list_patterns` tool | ✅ done |
| 4–6 | `pattern_examples` tool — canonical, tsc-tested examples for all 23 patterns | ✅ all 23 patterns |
| 7  | `generate_pattern` tool — templates for all 23 patterns (Java Phase 7 + 11 collapsed) | ✅ all 23 patterns |
| 8  | `detect_pattern` (ts-morph AST detectors) — all 23 patterns | ✅ all 23 patterns |
| 9  | `validate_pattern` — Group A + Group B (18 patterns; Group C intentionally out of scope) | ✅ 18/18 |
| 10 | `refactor_to_pattern` (atomic AST rewrites) | ⏳ planned |
| 11 | Broadened coverage across all 3 groups | ✅ folded into Phase 7 |
| 12 | GitHub Actions CI (Node 20, `npm ci`, `tsc`, Vitest) | ✅ done |
| 13 | npm publication | ⏳ planned |

## Tools (target API)

```
list_patterns         List all 23 GoF patterns, filterable by category.
pattern_examples      Return canonical, compilable example(s) for a pattern.
generate_pattern      Generate a customized pattern implementation
                      (module, type names, modern TS features).
detect_pattern        Scan TS source/dir for pattern instances with evidence.
validate_pattern      Verify a given implementation against pattern rules.
refactor_to_pattern   Transform anti-pattern code into a proper pattern.
```

> **Per-pattern tool coverage:** see [`COVERAGE.md`](./COVERAGE.md) for the
> exact tool × pattern matrix (which of the 23 GoF patterns each tool
> supports, where the gaps are, and the roadmap for closing them).

## Build

Requires **Node.js 20+** and **npm 10+**.

```bash
npm ci
npm run build
# produces: dist/index.js  (with a #!/usr/bin/env node shebang, exec bit set)
```

## Try it (Phases 1–9 — `ping`, `list_patterns`, `pattern_examples`, `generate_pattern`, `detect_pattern` and `validate_pattern` are wired)

After `npm run build`, smoke-test directly with shell-piped JSON-RPC.
Note: the `(... ; sleep N)` wrapper keeps stdin open long enough for the
transport to flush each `tools/call` response.

```bash
(
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}'
  echo '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_patterns","arguments":{"category":"Creational"}}}'
  echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"pattern_examples","arguments":{"pattern":"singleton"}}}'
  echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"generate_pattern","arguments":{"pattern":"singleton","typeName":"AuditLogger"}}}'
  echo '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"detect_pattern","arguments":{"source":"export class L { static #instance: L | undefined; private constructor() {} static getInstance(): L { L.#instance ??= new L(); return L.#instance; } }"}}}'
  echo '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"validate_pattern","arguments":{"source":"export class Broken { public constructor() {} static getInstance(): Broken { return new Broken(); } }","pattern":"singleton"}}}'
  sleep 2
) | node dist/index.js
```

Expected: eight JSON-RPC responses on stdout — the last one a
`validate_pattern` result flagging the `Broken` class with an ERROR
issue about the public constructor.

## Wire into OpenCode

```jsonc
// ~/.config/opencode/opencode.json
{
  "mcp": {
    "typescript-patterns": {
      "type": "local",
      "command": [
        "node",
        "/Users/<you>/git/com/typescript-patterns-mcp/dist/index.js"
      ]
    }
  }
}
```

## Project layout

```
typescript-patterns-mcp/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── eslint.config.js
├── README.md
├── COVERAGE.md
├── LICENSE
├── resources/
│   ├── catalog/patterns.json        ← refactoring.guru-style metadata
│   ├── examples/examples-index.json ← manifest of the bundled example files
│   ├── examples/tsconfig.examples.json ← tsc config the examples are compiled against
│   ├── examples/<slug>/*.ts         ← canonical examples (23 patterns, 74 files)
│   └── templates/<slug>/            ← code-generation templates (23 patterns, 61 .template files)
│       ├── template-index.json      ← per-pattern manifest ({ files: [{ fileName, template }] })
│       └── *.ts.template            ← `${TYPE_NAME}` placeholders scanned by PatternGenerator
├── src/
│   ├── index.ts                     ← main() — stdio MCP server
│   ├── catalog/                     ← Pattern union + metadata + registry + examples loader
│   ├── generate/                    ← PatternGenerator + template rendering
│   ├── detect/                      ← PatternDetectionEngine + 23 ts-morph AST detectors
│   ├── validate/                    ← PatternValidationEngine + 18 ts-morph rule validators
│   ├── tools/                       ← MCP tool handlers
│   │   ├── pingTool.ts              ← ✅ Phase 1
│   │   ├── listPatternsTool.ts      ← ✅ Phase 3
│   │   ├── patternExamplesTool.ts   ← ✅ Phase 4-6
│   │   ├── generatePatternTool.ts   ← ✅ Phase 7 (23/23)
│   │   ├── detectPatternTool.ts     ← ✅ Phase 8 (23/23)
|   │   ├── validatePatternTool.ts   ← ✅ Phase 9 (18/18)
│   │   └── refactorToPatternTool.ts ← Phase 10 (planned)
│   └── refactor/                    ← atomic AST rewrites (Phase 10+)
└── test/
    ├── catalog/                     ← registry / metadata / examples-loader / tsc-compile tests
    ├── detect/                      ← PatternDetectionEngine + detectorCoverage (23-pattern lakmus) tests
    ├── generate/                    ← PatternGenerator + generatedCompile tests
    ├── validate/                    ← canonical-clean + anti-pattern + engine tests
    └── tools/                       ← tool-level tests + full stdio integration test
```

## Design decisions

* **`ts-morph` instead of raw TypeScript Compiler API.** Same power, ~5x
  less boilerplate. Sibling of JavaParser on the Java side.
* **Zod for input schemas.** Every tool schema is a `z.object({...})`
  reused for JSON Schema export and for run-time argument validation.
* **`console.error` only on stdio.** MCP's stdio transport uses `stdout`
  exclusively for JSON-RPC frames. `console.log` is banned by ESLint —
  logging goes to `stderr`.
* **Same coverage matrix as `java-patterns-mcp`.** See `COVERAGE.md`. The
  goal is functional parity: every pattern that has a detector / validator /
  refactoring in the Java version gets one here too.

## License

[MIT](./LICENSE) © 2026 contributors. Pattern examples are adapted from
[refactoring.guru](https://refactoring.guru/design-patterns/typescript) and
the original *Design Patterns: Elements of Reusable Object-Oriented Software*
(Gamma, Helm, Johnson, Vlissides). All adapted code is original
re-implementation; reproduced verbatim third-party code is marked as such.
