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
| Singleton | ✅ | ✅ | ✅ | ✅ | ✅ (2) |
| Builder | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| Factory Method | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| Observer | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| Strategy | ✅ | ✅ | ✅ | ✅ | ⚪ |
| Decorator | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| State | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| Command | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| Adapter | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| Composite | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| Proxy | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| Template Method | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| **Group A subtotals** | **12/12** | **12/12** | **12/12** | **12/12** | **11 patterns / 12 refactorings** |

### B — generate + detect + validate (refactor stays out of scope)

| Pattern | `pattern_examples` | `generate` | `detect` | `validate` | `refactor` |
|---|:---:|:---:|:---:|:---:|:---:|
| Abstract Factory | ✅ | ✅ | ✅ | ✅ | ⚪ |
| Bridge | ✅ | ✅ | ✅ | ✅ | ⚪ |
| Facade | ✅ | ✅ | ✅ | ✅ | ⚪ |
| Visitor | ✅ | ✅ | ✅ | ✅ | ⚪ |
| Chain of Responsibility | ✅ | ✅ | ✅ | ✅ | ⚪ |
| Mediator | ✅ | ✅ | ✅ | ✅ | ⚪ |
| **Group B subtotals** | **6/6** | **6/6** | **6/6** | **6/6** | – |

### C — examples-only by design (extended with detect + generate)

| Pattern | `pattern_examples` | `generate` | `detect` | `validate` | `refactor` |
|---|:---:|:---:|:---:|:---:|:---:|
| Prototype | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| Flyweight | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| Interpreter | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| Iterator | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| Memento | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| **Group C subtotals** | **5/5** | **5/5** | **5/5** | – | – |

---

## Totals

| Tool | Implemented | Out of 23 | % | Source of truth (once wired) |
|---|---:|---:|---:|---|
| `pattern_examples` | 23 | 23 | 100% | `resources/examples/<slug>/` directories, indexed by `resources/examples/examples-index.json` |
| `generate_pattern` | 23 | 23 | 100% | `resources/templates/<slug>/` directories, indexed by `resources/templates/<slug>/template-index.json` per pattern; declared in `SUPPORTED_PATTERNS` in `src/generate/patternGenerator.ts` |
| `detect_pattern` | 23 | 23 | 100% | `PatternDetectionEngine` detector list in `src/detect/patternDetectionEngine.ts`; per-pattern detectors under `src/detect/detectors/` |
| `validate_pattern` | 18 | 18 | 100% | `PatternValidationEngine` validators list in `src/validate/patternValidationEngine.ts`; per-pattern validators under `src/validate/validators/` (Group C excluded by design) |
| `refactor_to_pattern` | 12 refactorings on 11 patterns | – | – | `REFACTORING_IDS` in `src/refactor/refactoringId.ts`; per-recipe classes under `src/refactor/refactorings/` |

> **🎉 All five functional tools now ship: `pattern_examples`,
> `generate_pattern`, `detect_pattern`, `validate_pattern` AND
> `refactor_to_pattern`.** The full pipeline — canonical example →
> template → AST detection → quality validation → automated rewrite —
> is closed for every applicable Gang-of-Four pattern. Automated
> checks:
>   - `test/catalog/examplesCompile.test.ts` — the 74 bundled
>     examples type-check under `tsc --strict --noEmit`.
>   - `test/generate/generatedCompile.test.ts` — every template's
>     generated output type-checks under the same tsconfig.
>   - `test/detect/detectorCoverage.test.ts` — each pattern's
>     canonical example triggers its own detector at confidence >= 0.50.
>   - `test/validate/canonicalCleanTest.test.ts` — each pattern's
>     canonical example produces zero ERROR-severity issues from its
>     own validator.
>   - `test/validate/antiPatterns.test.ts` — for each of the 18
>     validators, a deliberately broken snippet produces at least
>     one issue of the expected severity.
>   - `test/refactor/refactoringCoverage.test.ts` — each of the 12
>     refactorings rewrites its anti-pattern AND is idempotent
>     (running twice yields `changed: false`).

---

## Refactorings inventory

The `refactor_to_pattern` tool exposes individual transformations,
not "pattern conversions". Each entry below is the public slug callers
pass to the MCP tool.

| Slug | Pattern | What it does | State |
|---|---|---|:---:|
| `singleton-make-ctor-private` | Singleton | Turn a public constructor into a private one. | ✅ |
| `singleton-add-holder-idiom` | Singleton | Java Bill-Pugh idiom has no useful TS equivalent (`??=` already handles lazy init). | ⚪ |
| `singleton-freeze-instance` | Singleton | Add `Object.freeze(this);` at the end of the private constructor. TS-specific — takes the role of Java's `readResolve`. | ✅ |
| `builder-make-fields-readonly` | Builder | Mark every instance field of the Builder's product class as `readonly`. | ✅ |
| `observer-snapshot-iteration` | Observer | Wrap the iterated collection inside a publish-like method with `[...listeners]` (TS spread) to snapshot the observer list. | ✅ |
| `adapter-make-adaptee-readonly` | Adapter | Mark the adaptee field of an Adapter-shaped class as `readonly`. | ✅ |
| `template-method-make-final` | Template Method | Add a `@final` JSDoc marker AND emit `Object.freeze(<Class>.prototype.<method>)` so subclasses cannot bypass the locked algorithm skeleton. | ✅ |
| `factory-method-restrict-creator-ctor` | Factory Method | Demote public constructors of an abstract Creator to `protected` so callers cannot bypass the factory method. | ✅ |
| `strategy-narrow-to-function-type` | Strategy | Replace a one-method `*Strategy` interface with a callable-type alias. Non-trivial AST rewrite (interface → type alias plus renaming every implementor). Left out of scope for the initial roll-out. | ⚪ |
| `decorator-make-wrapped-readonly` | Decorator | Mark the wrapped delegate field of a Decorator-shaped class as `readonly`. | ✅ |
| `state-make-implementations-final` | State | Emit `Object.freeze(<StateClass>.prototype)` after every concrete State declaration. | ✅ |
| `command-make-implementations-final` | Command | Same treatment as State for concrete command classes. | ✅ |
| `composite-make-children-readonly` | Composite | Mark the children collection field of a Composite-shaped class as `readonly`. | ✅ |
| `proxy-make-subject-readonly` | Proxy | Mark the delegate (real-subject) field of a Proxy-shaped class as `readonly`. | ✅ |

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

✅ Complete for all 23 patterns. The Java sibling documented Phase 7
as "Group A starter" (5 patterns) and only reached 23/23 through the
Phase 11 broadening milestone. The TypeScript port collapses the two
into a single roll-out because the template engine here is a plain
`${KEY}` scan (no JTE, no additional dependency), so adding a pattern
is nearly free after the first one.

Deltas vs. the Java sibling:
  - No `packageName` / `PACKAGE_DECL` placeholders — TS modules have
    no package declaration. The tool's input schema is therefore just
    `{ pattern, typeName }`.
  - Additional placeholders: `${TYPE_NAME_CAMEL}` (lower-first) and
    `${TYPE_NAME_LOWERCASE}`. These are needed because TS uses the
    same identifier space for classes and their methods / module
    names, so a Strategy's method name conventionally camel-cases the
    class name.
  - Template escape rule: `\${…}` in a template renders as a literal
    `${…}` in the output (backslash consumed). This is necessary
    because TypeScript templates frequently contain real template
    literals inside backtick strings, and the naive Java-style scan
    would eat them.
  - Strict PascalCase validation on `typeName` (`^[A-Z][A-Za-z0-9]*$`).
    The Java sibling accepts any Java identifier; the TS variant is
    stricter because every bundled example uses class-name conventions
    and mixing in `_x`, `$x`, or leading-digit names would produce
    generated code that most linters reject.

### Phase 8 — `detect_pattern`

✅ Complete for all 23 patterns. Every canonical example bundled
under `resources/examples/<slug>/` triggers its own detector at
confidence >= 0.50 (verified by `test/detect/detectorCoverage.test.ts`).

Deltas vs. the Java sibling:
  - AST engine: `ts-morph` (fluent wrapper over the TypeScript
    Compiler API) instead of `JavaParser`. Each detection call
    creates a throwaway `Project` with an in-memory file system so
    per-call analyses stay isolated.
  - Java parameter fields have no direct analogue — TS has
    "parameter properties" (`constructor(private readonly foo: Foo)`)
    which are syntactically a `ParameterDeclaration` but
    semantically an instance field. The shared `instanceFields()`
    helper (`src/detect/detectors/detectorHelpers.ts`) unifies the
    two node kinds so every detector rule works on both shapes at
    once. Without this, half the canonical examples (Adapter,
    Bridge, Composite, Decorator, Mediator, Proxy…) would miss
    their "readonly field" signal because the field is declared on
    the constructor parameter.
  - Confidence scoring is identical: 4 independent structural
    signals per pattern, each contributing 0.25. A detector fires
    at 0.50 (2 signals) or above; anything less is likely a
    false positive and gets dropped.
  - Naming rules are slightly more permissive: where the Java
    sibling requires `name !== "Handler"` etc. (to reject the
    literal interface name), the TS detectors ONLY apply the
    exclusion where it prevents a real false positive. The
    canonical examples in `resources/examples/` intentionally use
    short single-word names (`Handler`, `Command`, `Notifier`,
    …) — the Java-style stricture would reject them.

### Phase 9 — `validate_pattern`

✅ Complete for all 18 patterns in Group A + Group B (12 + 6). Group C
patterns (Prototype, Flyweight, Interpreter, Iterator, Memento) are
intentionally out of scope — there is no widely-agreed "wrong
Prototype" or "wrong Iterator" heuristic that would carry its weight.

Deltas vs. the Java sibling:
  - Java-specific rules dropped as inapplicable to TS:
    - Singleton `Serializable` / `readResolve()` — TS has no
      `Serializable` marker; serialization is JSON at caller's
      option.
    - `synchronized` / `volatile` — the JS event loop is
      single-threaded; there is no double-checked-locking anti-pattern
      to catch.
    - Reflective bypass via `setAccessible(true)` — TS has no
      equivalent (`Reflect.construct` etc. is different in kind).
  - TS-specific rules added:
    - Singleton without `Object.freeze(this)` and no `readonly`
      fields → INFO. The nearest analogue to Java's readResolve rule.
    - Composite / Adapter / Bridge / Decorator / Proxy require the
      wrapped / delegate / children field to be `readonly`. TS's
      `#private` fields count as acceptably locked too because
      they cannot be reassigned from outside.
    - State's "state field is not private" rule accepts both
      `#state` (ES private) and `private state` (TS soft private).
  - Group A / Group B split identical to Java: Group C stays
    validator-less because a rule that fires only occasionally on
    Prototype code has bad signal-to-noise.

Standalone validators (Java-parity architecture): each validator
gates on structural shape ("does this class LOOK like the target
pattern?") and stays silent otherwise. This lets `validate_pattern`
run unconditionally on random code without generating noise on
non-pattern classes.

### Phase 10 — `refactor_to_pattern`

✅ Complete. 12 idempotent AST rewrites shipped across 11 of the 12
Group A patterns. Every recipe is:
  - Small (one obvious fix per pass).
  - Idempotent (running the same refactoring twice on the same
    source returns `changed: false` the second time — verified by
    `test/refactor/refactoringCoverage.test.ts`).
  - Gated on shape (touches only classes that already look like
    the target pattern — never a random class that happens to have
    a public constructor).

Deltas vs. the Java sibling:
  - **`*-make-*-final` → `*-make-*-readonly`.** TS has no `final`
    keyword; the closest structural equivalent for fields is the
    `readonly` modifier. State / Command / Template Method
    "make-implementations-final" refactorings emit
    `Object.freeze(<Class>.prototype)` (or
    `Object.freeze(<Class>.prototype.<method>)`) — TypeScript's
    only real "runtime-locked class" idiom.
  - **`singleton-add-read-resolve` → `singleton-freeze-instance`.**
    The Java rule targets deserialisation; TS's concern is
    accidental mutation of the shared instance across module
    graphs. `Object.freeze(this)` in the constructor is the
    idiomatic hardening.
  - **`singleton-add-holder-idiom` → ⚪.** Java's Bill-Pugh
    holder idiom has no useful TS equivalent — the `??=` operator
    already handles lazy init in one line, and every canonical
    Singleton example uses it.
  - **`strategy-add-functional-interface` → `strategy-narrow-to-function-type` (⚪).**
    The Java `@FunctionalInterface` annotation is a one-line
    modifier; the TS equivalent (`interface {…}` → `type = () => …`)
    would require renaming every implementor's class-level
    `implements` clause and every consumer's method call. Non-
    trivial AST rewrite left out of scope for the initial roll-out.

### Phase 12 — CI

GitHub Actions: Node 20 + Node 22, `npm ci`, `tsc --noEmit`, `vitest run`,
`eslint`. Same shape as the Java `ci.yml`.

### 🏁 Long-term parity target — reached

23/23 `pattern_examples`, 23/23 `generate_pattern`, 23/23
`detect_pattern`, 18/18 `validate_pattern`, 12 refactorings on 11
patterns for `refactor_to_pattern`. Feature parity with
[`java-patterns-mcp`](https://github.com/air237/java-patterns-mcp)
is reached, with all TS-specific deviations documented in the
per-phase Roadmap sections above.

Project-level follow-ups that would make sense from here:

- **README polish + end-to-end demo** — walk an LLM agent through
  the full pipeline (`detect` → `validate` → `refactor`) on a
  real codebase.
- **npm publication** — make the JAR-equivalent (the built `dist/`
  bundle) consumable without cloning.
- **CI bloat** — coverage report, release workflow, signed
  artefacts.
- **The two ⚪ refactorings** (`singleton-add-holder-idiom`,
  `strategy-narrow-to-function-type`) — either close them if a
  clean TS shape emerges, or document them permanently as
  "not-applicable to TypeScript" in the Refactorings inventory.

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
