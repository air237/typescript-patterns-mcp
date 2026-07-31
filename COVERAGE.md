# Tool ↔ Pattern Coverage

Track which of the five functional MCP tools (`pattern_examples`,
`generate_pattern`, `detect_pattern`, `validate_pattern`,
`refactor_to_pattern`) supports which of the 23 Gang of Four design
patterns in **`typescript-patterns-mcp`**.

> **How to read this file:** the matrix below is the canonical
> "what does this MCP actually do for pattern X" reference. If you
> add a new detector / validator / refactoring / template, update the
> corresponding cell in the same commit so this file stays a single
> source of truth.

The `ping` and `list_patterns` tools are not in the matrix — they are
administrative and pattern-agnostic by design (`list_patterns`
always returns the full 23-pattern catalogue).

> **Parity note.** This file mirrors the layout of
> [`java-patterns-mcp/COVERAGE.md`](https://github.com/air237/java-patterns-mcp/blob/main/COVERAGE.md).
> The target end-state is functional parity across every cell.
> Anything currently missing lives in the "Roadmap" section at the bottom.

---

## Strategic grouping

Not every pattern deserves every tool. Patterns fall into three
prioritisation buckets — identical to the Java sibling:

| Group | Patterns | Strategy |
|---|---|---|
| **A — full 4-tool coverage** | Singleton, Builder, Factory Method, Observer, Strategy, Decorator, State, Command, Adapter, Composite, Proxy, Template Method | High-frequency patterns with well-known anti-pattern variants. Worth implementing `generate` + `detect` + `validate` + `refactor`. |
| **B — generate + detect + validate, no refactor** | Abstract Factory, Bridge, Facade, Visitor, Chain of Responsibility, Mediator | Common enough to recognise, scaffold AND quality-check. Validators focus on the concrete anti-patterns that recur in practice. `refactor` stays out of scope: the "one obvious fix" is less crisp than for Group A, and the risk of an automated AST rewrite isn't justified. |
| **C — generate + detect, no validate / refactor** | Prototype, Flyweight, Interpreter, Iterator, Memento | Rare in modern TS, or superseded by language idioms (`for...of`, structural typing, module-level constants). The canonical example + recognition is the main contribution. |

---

## Coverage matrix

Legend: ✅ supported · ⛔ not implemented (planned) · ⚪ intentionally
out of scope (see "Strategic grouping" above).

### A — full coverage target

| Pattern | `pattern_examples` | `generate` | `detect` | `validate` | `refactor` |
|---|:---:|:---:|:---:|:---:|:---:|
| Singleton | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Builder | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Factory Method | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Observer | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Strategy | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Decorator | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| State | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Command | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Adapter | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Composite | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Proxy | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| Template Method | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| **Group A subtotals** | **12/12** | **0/12** | **0/12** | **0/12** | **0/12** |

### B — generate + detect + validate (refactor stays out of scope)

| Pattern | `pattern_examples` | `generate` | `detect` | `validate` | `refactor` |
|---|:---:|:---:|:---:|:---:|:---:|
| Abstract Factory | ✅ | ⛔ | ⛔ | ⛔ | ⚪ |
| Bridge | ✅ | ⛔ | ⛔ | ⛔ | ⚪ |
| Facade | ✅ | ⛔ | ⛔ | ⛔ | ⚪ |
| Visitor | ✅ | ⛔ | ⛔ | ⛔ | ⚪ |
| Chain of Responsibility | ✅ | ⛔ | ⛔ | ⛔ | ⚪ |
| Mediator | ✅ | ⛔ | ⛔ | ⛔ | ⚪ |
| **Group B subtotals** | **6/6** | **0/6** | **0/6** | **0/6** | – |

### C — examples-only by design (extended with detect + generate)

| Pattern | `pattern_examples` | `generate` | `detect` | `validate` | `refactor` |
|---|:---:|:---:|:---:|:---:|:---:|
| Prototype | ✅ | ⛔ | ⛔ | ⚪ | ⚪ |
| Flyweight | ✅ | ⛔ | ⛔ | ⚪ | ⚪ |
| Interpreter | ✅ | ⛔ | ⛔ | ⚪ | ⚪ |
| Iterator | ✅ | ⛔ | ⛔ | ⚪ | ⚪ |
| Memento | ✅ | ⛔ | ⛔ | ⚪ | ⚪ |
| **Group C subtotals** | **5/5** | **0/5** | **0/5** | – | – |

---

## Totals

| Tool | Implemented | Out of 23 | % | Source of truth (once wired) |
|---|---:|---:|---:|---|
| `pattern_examples` | 23 | 23 | 100% | `resources/examples/<slug>/` directories, indexed by `resources/examples/examples-index.json` |
| `generate_pattern` | 0 | 23 | 0% | `PatternGenerator.SUPPORTED` |
| `detect_pattern` | 0 | 23 | 0% | `PatternDetectionEngine` detectors list |
| `validate_pattern` | 0 | 18 | 0% | `PatternValidationEngine` validators list |
| `refactor_to_pattern` | 0 | – | 0% | `RefactoringId` enum |

> **🎉 `pattern_examples` is now 23/23 — full parity with `java-patterns-mcp`.**
> Every example type-checks under `tsc --strict --noEmit`; the check is
> automated by `test/catalog/examplesCompile.test.ts` (the sibling of the
> Java `PatternExamplesCompileTest`).

---

## Refactorings inventory

The `refactor_to_pattern` tool will expose individual transformations,
not "pattern conversions". Each entry below is the public slug callers
pass to the MCP tool. Nothing wired yet — this table is planned parity
with `java-patterns-mcp`.

| Slug | Pattern | What it does | State |
|---|---|---|:---:|
| `singleton-make-ctor-private` | Singleton | Turn a public constructor into a private one. | ⛔ |
| `singleton-add-holder-idiom` | Singleton | Replace an uncached `getInstance()` with a lazy-init singleton idiom (module-level `let instance` guarded by `getInstance()`). | ⛔ |
| `singleton-freeze-instance` | Singleton | Wrap the returned instance in `Object.freeze(...)` inside `getInstance()` (TS-specific — takes the role of Java's `readResolve`). | ⛔ |
| `builder-make-fields-readonly` | Builder | Mark every field of the Builder's product class as `readonly`. | ⛔ |
| `observer-snapshot-iteration` | Observer | Wrap the iterated collection of a publish-like method with `[...listeners]` (TS spread) to snapshot the observer list. | ⛔ |
| `adapter-make-adaptee-readonly` | Adapter | Mark the adaptee field of an Adapter-shaped class as `readonly`. | ⛔ |
| `template-method-make-final` | Template Method | Emit `Object.freeze(cls.prototype.templateMethod)` or a JSDoc `@final` annotation with an ESLint hint so subclasses cannot bypass the locked algorithm skeleton. | ⛔ |
| `factory-method-restrict-creator-ctor` | Factory Method | Demote public constructors of a concrete Creator to `protected` so callers cannot bypass the factory method. | ⛔ |
| `strategy-narrow-to-function-type` | Strategy | Replace a one-method `*Strategy` interface with a callable-type alias (`type PricingStrategy = (order: Order) => Price`). | ⛔ |
| `decorator-make-wrapped-readonly` | Decorator | Mark the wrapped delegate field of a Decorator-shaped class as `readonly`. | ⛔ |
| `state-make-implementations-final` | State | JSDoc-mark or `Object.freeze` every concrete state class. | ⛔ |
| `command-make-implementations-final` | Command | Same treatment as State for concrete command classes. | ⛔ |
| `composite-make-children-readonly` | Composite | Mark the children collection field of a Composite-shaped class as `readonly`, and rewrite the getter to return `readonly T[]`. | ⛔ |
| `proxy-make-subject-readonly` | Proxy | Mark the delegate (real-subject) field of a Proxy-shaped class as `readonly`. | ⛔ |

---

## Roadmap

### ✅ Phase 4–6 — `pattern_examples` complete (23/23)

Canonical, `tsc --strict --noEmit`-tested TypeScript examples for all 23
patterns are wired up. Delivered in a single roll-out (Java sibling had
three: Creational → Structural → Behavioral). Each pattern ships between
1 and 6 files under `resources/examples/<slug>/` alongside a `note`
that captures the specific variant chosen (e.g. Singleton uses the
class-based idiom rather than a module-level const, because only the
class form preserves the two GoF invariants — private constructor and
static access point).

TS-specific deltas vs. the Java sibling:
  - No `packageName` field on the `PatternExample` payload — TS modules
    have no package declaration, so exposing it would be misleading.
  - Singleton: class with `private constructor()` and a lazy static
    `getInstance()`, guarded via `#instance ??=`. Faithful to GoF; a
    `module-const` variant would be idiomatic ESM but is not a GoF
    Singleton (public constructor still reachable).
  - Prototype: copy-constructor + `clone()` overriding, no `Cloneable`
    interface (there is no such thing in TS).
  - Strategy: SAM interface form kept for the detector's fingerprint;
    the callable-type-alias idiom is what the `strategy-narrow-to-function-type`
    refactoring recipe (Phase 10) will emit.
  - Decorator's file comment calls out that this is the GoF pattern,
    NOT TypeScript's `@decorator` syntax.
  - Facade's subsystems are module-private classes (`export`-less) —
    the direct analogue of Java's package-private.

### Phase 7 — `generate_pattern`

Start with Group A (5 patterns: Singleton, Builder, Strategy, Observer,
Factory Method) — same starter set as the Java sibling. Template
engine: plain TypeScript template strings + a small `renderTemplate`
helper. No JTE-equivalent for TS is worth the dependency weight.

### Phase 8 — `detect_pattern`

ts-morph AST detectors, starting with the same 6 patterns the Java
version shipped first: Singleton, Builder, Factory Method, Strategy,
Observer, Composite. Each detector reports a confidence score
∈ [0, 1] and a list of structural signals that fired.

### Phase 9 — `validate_pattern`

Rule-based quality checks that fire only on already-detected pattern
instances, so validators never contribute false positives on random
classes. Same 3-then-6 rollout plan as the Java sibling.

### Phase 10 — `refactor_to_pattern`

Atomic AST rewrites. Each recipe is a single, idempotent, obvious
fix (e.g. "promote this field to `readonly`"). Never bulk changes.

### Phase 12 — CI

GitHub Actions: Node 20 + Node 22, `npm ci`, `tsc --noEmit`, `vitest run`,
`eslint`. Same shape as the Java `ci.yml`.

### 🏁 Long-term parity target

Same 23/23 examples + generate + detect, 18/23 validate, 12
patterns / 14 refactorings — matching what
[`java-patterns-mcp`](https://github.com/air237/java-patterns-mcp)
ships today. Any deviations (e.g. TS-specific validator rules that
have no Java counterpart, or the reverse) get called out explicitly
in this file so the two projects stay in lockstep.

---

## Updating this file

When you ship a new component, update:

1. The corresponding cell in the **Coverage matrix** above.
2. The relevant **Totals** row.
3. If you added a refactoring, the **Refactorings inventory** table
   (change the state cell from ⛔ to ✅).
4. Cross-check against the source of truth listed in the **Totals**
   table (e.g. `PatternGenerator.SUPPORTED`, `PatternDetectionEngine`
   detector list, etc.). The matrix MUST match the code.

A `npm test` run is the simplest check that the registrations actually
agree with what the engines expose at runtime — every engine has (or
should have) a "reports the N wired …" sanity test.
