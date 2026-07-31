/**
 * Validates Facade pattern implementations.
 *
 * Rules (pinned to a class named `*Facade` OR owning >=3 subsystem
 * class-typed fields):
 *   - ERROR   — the facade exposes an internal subsystem via a
 *               getter/public field. The whole point is to hide them.
 *   - WARNING — a subsystem class referenced by the facade is
 *               `export`ed (i.e. not module-private). Consumers can
 *               reach past the facade.
 *   - INFO    — the facade offers zero public methods. Empty
 *               facades are dead abstractions.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import {
  instanceFields,
  isExported,
  startLine,
} from "./validatorHelpers.js";

export class FacadeValidator implements PatternValidator {
  readonly pattern = "FACADE" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const classes = sourceFile.getClasses();
    const classesByName = new Map(classes.map((c) => [c.getName() ?? "", c]));

    for (const facade of classes) {
      const name = facade.getName();
      if (name === undefined) continue;

      const nameHint = /Facade$/.test(name);
      const subsystemFields = instanceFields(facade).filter((f) => {
        // Explicit type annotation
        let t = f.getTypeNode()?.getText() ?? "";
        if (t === "") {
          // TS-idiomatic: `readonly foo = new Foo()` has no explicit
          // type annotation; try to peek at the initializer expression
          // and pull the class name out of `new ClassName(...)`.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyF = f as unknown as { getInitializer?: () => { getText(): string } | undefined };
          const init = anyF.getInitializer?.()?.getText() ?? "";
          const m = /^new\s+(\w+)/.exec(init);
          if (m !== null) t = m[1]!;
        }
        const cls = classesByName.get(t);
        return cls !== undefined && cls !== facade;
      });
      // Gate: either name hint OR >=3 subsystem fields.
      if (!nameHint && subsystemFields.length < 3) continue;

      const line = startLine(facade);

      // ─── ERROR: a subsystem is exposed as public / non-# ───────
      const exposedSubsystem = subsystemFields.find((f) => {
        if (f.getName().startsWith("#")) return false;
        if (f.hasModifier?.(SyntaxKind.PrivateKeyword) === true) return false;
        return true;
      });
      if (exposedSubsystem !== undefined) {
        issues.push(
          validationIssue({
            pattern: "FACADE",
            className: name,
            line: startLine(exposedSubsystem),
            severity: "ERROR",
            issue: `Facade ${name} exposes subsystem field '${exposedSubsystem.getName()}' as public — callers can reach past the facade.`,
            suggestion:
              "Make the subsystem field `#private` (or `private readonly`) so only the facade may touch it.",
          }),
        );
      }

      // ─── WARNING: a subsystem class is exported ────────────────
      const leakedSubsystem = subsystemFields.find((f) => {
        let t = f.getTypeNode()?.getText() ?? "";
        if (t === "") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyF = f as unknown as { getInitializer?: () => { getText(): string } | undefined };
          const init = anyF.getInitializer?.()?.getText() ?? "";
          const m = /^new\s+(\w+)/.exec(init);
          if (m !== null) t = m[1]!;
        }
        const cls = classesByName.get(t);
        return cls !== undefined && isExported(cls);
      });
      if (leakedSubsystem !== undefined) {
        const t = (() => {
          let tt = leakedSubsystem.getTypeNode()?.getText() ?? "";
          if (tt === "") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyF = leakedSubsystem as unknown as { getInitializer?: () => { getText(): string } | undefined };
            const init = anyF.getInitializer?.()?.getText() ?? "";
            const m = /^new\s+(\w+)/.exec(init);
            if (m !== null) tt = m[1]!;
          }
          return tt || "?";
        })();
        issues.push(
          validationIssue({
            pattern: "FACADE",
            className: name,
            line: startLine(leakedSubsystem),
            severity: "WARNING",
            issue: `Subsystem class ${t} is \`export\`ed — callers can bypass ${name} entirely.`,
            suggestion:
              "Drop the `export` keyword from subsystem classes; keep them module-private.",
          }),
        );
      }

      // ─── INFO: zero public methods ─────────────────────────────
      const publicMethods = facade
        .getMethods()
        .filter((m) => !m.hasModifier(SyntaxKind.PrivateKeyword));
      if (publicMethods.length === 0) {
        issues.push(
          validationIssue({
            pattern: "FACADE",
            className: name,
            line,
            severity: "INFO",
            issue: `Facade ${name} declares no public methods — nothing for callers to use.`,
            suggestion:
              "Add at least one high-level method that drives the subsystems in one call.",
          }),
        );
      }
    }
    return issues;
  }
}
