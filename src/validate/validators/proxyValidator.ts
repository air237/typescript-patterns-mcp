/**
 * Validates Proxy pattern implementations.
 *
 * Rules (pinned to a class whose name matches the proxy naming
 * heuristic AND that implements the same interface as one of its
 * fields):
 *   - ERROR   — real-subject field is not `readonly`. Swapping the
 *               real subject mid-flight defeats the pattern.
 *   - ERROR   — the proxy class does not `implements` the same
 *               interface as the real-subject field's type. Callers
 *               cannot see it as the same surface.
 *   - WARNING — every proxy method forwards unconditionally
 *               (no `if` guard, no caching). That shape is a
 *               Decorator, not a Proxy.
 *   - INFO    — the proxy is not named `*Proxy` (e.g. `CachingFoo`).
 *               Naming lets detectors and reviewers spot the intent.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { instanceFields, startLine } from "./validatorHelpers.js";

const PROXY_NAME_HINT =
  /(Proxy|Cache|Cached|Lazy|Auth|Authenticated|Remote|Logging|Logged)/i;

export class ProxyValidator implements PatternValidator {
  readonly pattern = "PROXY" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const interfaceNames = new Set(
      sourceFile.getInterfaces().map((i) => i.getName()),
    );

    for (const proxy of sourceFile.getClasses()) {
      const name = proxy.getName();
      if (name === undefined) continue;
      if (!PROXY_NAME_HINT.test(name)) continue;

      const line = startLine(proxy);
      const subject = instanceFields(proxy).find((f) => {
        const t = f.getTypeNode()?.getText() ?? "";
        return interfaceNames.has(t);
      });
      if (subject === undefined) continue;
      const subjectType = subject.getTypeNode()!.getText();

      const impls = proxy.getImplements().map((i) => i.getText());
      const sameSurface = impls.includes(subjectType);

      // ─── ERROR: real-subject field not readonly ────────────────
      const isReadonly =
        subject.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true;
      if (!isReadonly) {
        issues.push(
          validationIssue({
            pattern: "PROXY",
            className: name,
            line: startLine(subject),
            severity: "ERROR",
            issue: `Real-subject field '${subject.getName()}' of ${name} is not \`readonly\` — the subject can be swapped mid-flight.`,
            suggestion:
              "Mark the subject field `readonly` (or make it a `readonly` constructor parameter property).",
          }),
        );
      }

      // ─── ERROR: proxy does not implement the same surface ──────
      if (!sameSurface) {
        issues.push(
          validationIssue({
            pattern: "PROXY",
            className: name,
            line,
            severity: "ERROR",
            issue: `${name} holds a ${subjectType} but does not \`implements ${subjectType}\` — callers cannot use it as a substitute.`,
            suggestion: `Add \`implements ${subjectType}\` and forward through the subject.`,
          }),
        );
      }

      // ─── WARNING: unconditional forwarding shape (=> Decorator) ─
      const subjectName = subject.getName();
      const forward = new RegExp(
        `this\\.${subjectName}\\s*\\.\\s*\\w+\\s*\\(`,
      );
      const methods = proxy
        .getMethods()
        .filter((m) => !m.isStatic() && !m.hasModifier(SyntaxKind.PrivateKeyword));
      const alwaysUnconditional =
        methods.length > 0 &&
        methods.every((m) => {
          const body = m.getBodyText() ?? "";
          if (!forward.test(body)) return false;
          // Any `if` / `?` / early return would count as a gate.
          return !/\bif\s*\(/.test(body) && !/return\s+.*\?/.test(body);
        });
      if (alwaysUnconditional) {
        issues.push(
          validationIssue({
            pattern: "PROXY",
            className: name,
            line,
            severity: "WARNING",
            issue: `${name}'s methods forward to \`this.${subjectName}\` unconditionally — that's a Decorator, not a Proxy.`,
            suggestion:
              "Add gating logic (caching, lazy init, access checks). If the class just decorates, rename to `<X>Decorator`.",
          }),
        );
      }

      // ─── INFO: naming convention ───────────────────────────────
      if (!/Proxy$/.test(name)) {
        issues.push(
          validationIssue({
            pattern: "PROXY",
            className: name,
            line,
            severity: "INFO",
            issue: `${name} has proxy-shaped behaviour but does not end with 'Proxy'.`,
            suggestion:
              "Rename to `<Variant>Proxy` (e.g. `CachingServiceProxy`) so the intent is obvious.",
          }),
        );
      }
    }
    return issues;
  }
}
