/**
 * Validates Observer pattern implementations (subject side).
 *
 * TypeScript sibling of `com.javapatterns.mcp.validate.ObserverValidator`,
 * adapted to TS idioms:
 *   - The "safely copies" check looks for `[...listeners]` /
 *     `listeners.slice()` / `Array.from(listeners)` — the TS spread
 *     idiom rather than Java's `List.copyOf(...)`.
 *
 * Rules:
 *   - ERROR   — class has a publish-like method but no unsubscribe-like
 *               method AND the subscribe method does not return an
 *               unsubscribe closure. Observers can never detach; every
 *               subscription is a memory leak.
 *   - WARNING — publish iterates the live subscriber list (no snapshot
 *               idiom found in the body). A listener that
 *               subscribes/unsubscribes DURING dispatch will corrupt
 *               the iteration or skip peers.
 *
 * The validator gates on shape: it only speaks if the class has BOTH a
 * subscribe-like and a publish-like method — otherwise it isn't an
 * observer subject.
 */

import { type SourceFile } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { startLine } from "./validatorHelpers.js";

const SUBSCRIBE = new Set([
  "subscribe",
  "register",
  "addlistener",
  "addobserver",
  "addsubscriber",
  "on",
]);
const UNSUBSCRIBE = new Set([
  "unsubscribe",
  "unregister",
  "removelistener",
  "removeobserver",
  "removesubscriber",
  "off",
]);
const PUBLISH_PREFIXES = ["publish", "notify", "fire", "dispatch", "emit"];

export class ObserverValidator implements PatternValidator {
  readonly pattern = "OBSERVER" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;

      const clsLine = startLine(cls);

      const hasSubscribe = cls
        .getMethods()
        .some((m) => SUBSCRIBE.has(m.getName().toLowerCase()));
      const publishMethod = cls
        .getMethods()
        .find((m) =>
          PUBLISH_PREFIXES.some((p) => m.getName().toLowerCase().startsWith(p)),
        );
      if (!hasSubscribe || publishMethod === undefined) continue;

      // ─── ERROR: no unsubscribe (closure or method) ─────────────
      const hasUnsubscribeMethod = cls
        .getMethods()
        .some((m) => UNSUBSCRIBE.has(m.getName().toLowerCase()));
      const subscribeReturnsFn = cls.getMethods().some((m) => {
        if (!SUBSCRIBE.has(m.getName().toLowerCase())) return false;
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        return /=>/.test(rt) || rt.startsWith("()");
      });
      if (!hasUnsubscribeMethod && !subscribeReturnsFn) {
        issues.push(
          validationIssue({
            pattern: "OBSERVER",
            className: name,
            line: clsLine,
            severity: "ERROR",
            issue:
              `${name} offers subscribe + publish but no way to unsubscribe — every subscriber is a memory leak.`,
            suggestion:
              "Add an `unsubscribe()` / `off()` method that removes the observer from the internal list, OR make `subscribe()` return an unsubscribe closure.",
          }),
        );
      }

      // ─── WARNING: publish iterates live list ───────────────────
      const publishBody = publishMethod.getBodyText() ?? "";
      const safelyCopies =
        /\[\s*\.\.\./.test(publishBody) ||
        /\.slice\s*\(\s*\)/.test(publishBody) ||
        /Array\.from\s*\(/.test(publishBody);
      if (!safelyCopies) {
        issues.push(
          validationIssue({
            pattern: "OBSERVER",
            className: name,
            line: startLine(publishMethod),
            severity: "WARNING",
            issue:
              `${publishMethod.getName()}() appears to iterate the live subscriber list — a listener that subscribes or unsubscribes during dispatch will corrupt the iteration.`,
            suggestion:
              "Iterate over a snapshot: `for (const l of [...this.#listeners]) …`.",
          }),
        );
      }
    }
    return issues;
  }
}
