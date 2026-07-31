/**
 * Validates Chain of Responsibility implementations.
 *
 * Rules (pinned to an abstract `*Handler` class or interface):
 *   - ERROR   — the handle() method's return type is not nullable
 *               (no `| null`, `| undefined`, `?`). Then the handler
 *               cannot "punt" and the chain cannot terminate.
 *   - WARNING — the `setNext()` method does not return the Handler
 *               type — chain-building will not be fluent.
 *   - WARNING — no concrete subclass in the file `extends` /
 *               `implements` the Handler contract; the chain has
 *               no links.
 *   - INFO    — the abstract base has no default forward() /
 *               fallthrough helper. Concrete handlers then have to
 *               reimplement chain traversal.
 */

import { type SourceFile } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import {
  isAbstractClass,
  startLine,
} from "./validatorHelpers.js";

export class ChainOfResponsibilityValidator implements PatternValidator {
  readonly pattern = "CHAIN_OF_RESPONSIBILITY" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const classes = sourceFile.getClasses();

    const candidates: Array<{
      name: string;
      line: number;
      handleRt: string;
      hasHandle: boolean;
      hasSetNext: boolean;
      setNextRt: string;
      hasForward: boolean;
    }> = [];

    const collect = (
      contractName: string,
      methods: Array<{
        name: string;
        returnType: string;
      }>,
      line: number,
    ): void => {
      const handle = methods.find((m) => m.name === "handle");
      const setNext = methods.find((m) => m.name === "setNext");
      const forward = methods.find((m) => m.name === "forward");
      candidates.push({
        name: contractName,
        line,
        handleRt: handle?.returnType ?? "",
        hasHandle: handle !== undefined,
        hasSetNext: setNext !== undefined,
        setNextRt: setNext?.returnType ?? "",
        hasForward: forward !== undefined,
      });
    };

    for (const c of classes) {
      const n = c.getName();
      if (n === undefined || !isAbstractClass(c)) continue;
      if (!n.endsWith("Handler")) continue;
      collect(
        n,
        c.getMethods().map((m) => ({
          name: m.getName(),
          returnType: m.getReturnTypeNode()?.getText() ?? "",
        })),
        startLine(c),
      );
    }
    for (const iface of sourceFile.getInterfaces()) {
      const n = iface.getName();
      if (!n.endsWith("Handler")) continue;
      collect(
        n,
        iface.getMethods().map((m) => ({
          name: m.getName(),
          returnType: m.getReturnTypeNode()?.getText() ?? "",
        })),
        startLine(iface),
      );
    }

    for (const cand of candidates) {
      if (!cand.hasHandle) continue;

      // ─── ERROR: handle() return type not nullable ──────────────
      const nullable = /\bnull\b|\|\s*undefined|\?\s*$/.test(cand.handleRt);
      if (!nullable) {
        issues.push(
          validationIssue({
            pattern: "CHAIN_OF_RESPONSIBILITY",
            className: cand.name,
            line: cand.line,
            severity: "ERROR",
            issue: `${cand.name}.handle() returns ${cand.handleRt || "?"} — no way to "punt" to the next handler.`,
            suggestion:
              "Widen the return type to `T | null` (or `T | undefined`) so a handler can return null to delegate.",
          }),
        );
      }

      // ─── WARNING: setNext does not return Handler ──────────────
      if (
        cand.hasSetNext &&
        cand.setNextRt !== "" &&
        !cand.setNextRt.includes(cand.name)
      ) {
        issues.push(
          validationIssue({
            pattern: "CHAIN_OF_RESPONSIBILITY",
            className: cand.name,
            line: cand.line,
            severity: "WARNING",
            issue: `${cand.name}.setNext() returns ${cand.setNextRt} — chain-building is not fluent.`,
            suggestion:
              `Return ${cand.name} from setNext() so callers can write \`h1.setNext(h2).setNext(h3);\`.`,
          }),
        );
      }

      // ─── WARNING: no concrete subclass ─────────────────────────
      const hasConcreteSub = classes.some((c) => {
        const ext = c.getExtends()?.getText();
        const implementsIt = c
          .getImplements()
          .some((i) => i.getText() === cand.name);
        return (
          (ext === cand.name || implementsIt) && !isAbstractClass(c)
        );
      });
      if (!hasConcreteSub) {
        issues.push(
          validationIssue({
            pattern: "CHAIN_OF_RESPONSIBILITY",
            className: cand.name,
            line: cand.line,
            severity: "WARNING",
            issue: `${cand.name} has no concrete subclass in this file — the chain has no links.`,
            suggestion:
              "Add at least one concrete handler that extends the base and either handles or forwards.",
          }),
        );
      }

      // ─── INFO: no default forward() helper ─────────────────────
      if (!cand.hasForward) {
        issues.push(
          validationIssue({
            pattern: "CHAIN_OF_RESPONSIBILITY",
            className: cand.name,
            line: cand.line,
            severity: "INFO",
            issue: `${cand.name} has no default forward() helper for concrete handlers to punt with.`,
            suggestion:
              "Add a `protected forward(request): T | null` that returns `this.next?.handle(request) ?? null`.",
          }),
        );
      }
    }
    return issues;
  }
}
