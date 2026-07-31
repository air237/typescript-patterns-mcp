/**
 * Validates Singleton pattern implementations.
 *
 * TypeScript sibling of `com.javapatterns.mcp.validate.SingletonValidator`,
 * adapted to TS idioms (no Serializable/readResolve, no synchronized/
 * volatile — the JS event loop is single-threaded).
 *
 * Rules:
 *   - ERROR   — class declares a `public` constructor. Callers can
 *               bypass the singleton with `new Foo()`.
 *   - ERROR   — `getInstance()` calls `new ClassName()` without an
 *               instance cache field. Every call constructs a fresh
 *               instance, defeating the point of the pattern.
 *   - WARNING — Singleton exposes non-`readonly` public/mutable state,
 *               so callers holding the reference can mutate global
 *               state through the singleton.
 *   - INFO    — Singleton does not `Object.freeze(this)` in the
 *               constructor (or expose only `readonly` state). The TS
 *               analogue of Java's "no readResolve on Serializable"
 *               warning: freezing hard-locks the shape, preventing
 *               accidental mutation across module graphs.
 *
 * The validator gates on shape: it only fires if the class looks like a
 * Singleton — has AT LEAST a private constructor OR a static
 * getInstance() method. Otherwise every regular class would emit noise.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import {
  escapeRegExp,
  instanceFields,
  startLine,
  staticFields,
  typeMentionsClass,
} from "./validatorHelpers.js";

export class SingletonValidator implements PatternValidator {
  readonly pattern = "SINGLETON" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const cls of sourceFile.getClasses()) {
      const className = cls.getName();
      if (className === undefined) continue;

      const privateCtor = cls
        .getConstructors()
        .some((c) => c.hasModifier(SyntaxKind.PrivateKeyword));
      const hasGetInstance = cls
        .getStaticMethods()
        .some((m) => m.getName() === "getInstance");
      // Gate: only speak up on Singleton-shaped classes.
      if (!privateCtor && !hasGetInstance) continue;

      const clsLine = startLine(cls);

      // ─── ERROR: public constructor ─────────────────────────────
      const pubCtor = cls
        .getConstructors()
        .find(
          (c) =>
            c.hasModifier(SyntaxKind.PublicKeyword) ||
            (!c.hasModifier(SyntaxKind.PrivateKeyword) &&
              !c.hasModifier(SyntaxKind.ProtectedKeyword)),
        );
      // Only complain if it's ACTUALLY public — a class with no ctor
      // at all defaults to a public default constructor, which is
      // just as bad.
      if (pubCtor !== undefined || cls.getConstructors().length === 0) {
        // But do NOT warn on the "no-ctor" case when the only signal is
        // getInstance — the class might be a Java-parity Singleton
        // where getInstance is the entire surface and there's no
        // explicit ctor. The Java sibling requires an EXPLICIT public
        // ctor, so we do too.
        if (pubCtor !== undefined) {
          issues.push(
            validationIssue({
              pattern: "SINGLETON",
              className,
              line: startLine(pubCtor),
              severity: "ERROR",
              issue:
                "Singleton declares a public constructor; callers can bypass the singleton with `new " +
                className +
                "()`.",
              suggestion:
                "Make the constructor `private constructor()` so external callers must go through the static access point.",
            }),
          );
        }
      }

      // ─── ERROR: getInstance() constructs fresh instance every call ─
      if (hasGetInstance) {
        const hasCacheField = staticFields(cls).some((p) => {
          const t = p.getTypeNode()?.getText() ?? "";
          return typeMentionsClass(t, className);
        });
        const newExpr = new RegExp(`new\\s+${escapeRegExp(className)}\\s*\\(`);
        const uncachedNew = cls
          .getStaticMethods()
          .filter((m) => m.getName() === "getInstance")
          .find((m) => {
            const body = m.getBodyText() ?? "";
            if (!newExpr.test(body)) return false;
            // No cache field and no `??=` / undefined guard = uncached.
            return (
              !hasCacheField &&
              !body.includes("??=") &&
              !/===\s*undefined|===\s*null/.test(body)
            );
          });
        if (uncachedNew !== undefined) {
          issues.push(
            validationIssue({
              pattern: "SINGLETON",
              className,
              line: startLine(uncachedNew),
              severity: "ERROR",
              issue:
                "getInstance() calls `new " +
                className +
                "()` without caching the result — every call constructs a fresh instance.",
              suggestion:
                "Store the instance in a static field (e.g. `static #instance: " +
                className +
                " | undefined`) and cache it lazily: `" +
                className +
                ".#instance ??= new " +
                className +
                "()`.",
            }),
          );
        }
      }

      // ─── WARNING: exposes non-readonly public mutable state ─────
      const publicMutable = instanceFields(cls).filter((p) => {
        // Skip parameter properties inside a private constructor — they
        // are not observable from outside anyway.
        if (
          p.hasModifier?.(SyntaxKind.PrivateKeyword) === true ||
          p.hasModifier?.(SyntaxKind.ProtectedKeyword) === true ||
          p.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true
        ) {
          return false;
        }
        // ES-private fields (`#foo`) never leak.
        if (p.getName().startsWith("#")) return false;
        return true;
      });
      if (publicMutable.length > 0) {
        issues.push(
          validationIssue({
            pattern: "SINGLETON",
            className,
            line: clsLine,
            severity: "WARNING",
            issue:
              "Singleton exposes non-readonly public/mutable state (" +
              publicMutable.map((p) => p.getName()).join(", ") +
              ") — callers can mutate the shared instance.",
            suggestion:
              "Mark public state `readonly`, use ES `#private` fields, or expose only getters.",
          }),
        );
      }

      // ─── INFO: constructor does not freeze `this` ───────────────
      // Heuristic: private ctor exists, no `Object.freeze(this)` in
      // its body, no `readonly`-marked instance fields either.
      const privateCtorNode = cls
        .getConstructors()
        .find((c) => c.hasModifier(SyntaxKind.PrivateKeyword));
      if (privateCtorNode !== undefined) {
        const body = privateCtorNode.getBodyText() ?? "";
        const freezes = /Object\.freeze\s*\(\s*this\s*\)/.test(body);
        const anyReadonly = instanceFields(cls).some((p) =>
          p.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true,
        );
        if (!freezes && !anyReadonly) {
          issues.push(
            validationIssue({
              pattern: "SINGLETON",
              className,
              line: startLine(privateCtorNode),
              severity: "INFO",
              issue:
                "Singleton constructor does not `Object.freeze(this)` nor declare any `readonly` fields.",
              suggestion:
                "Add `Object.freeze(this);` at the end of the constructor to hard-lock the instance against accidental mutation.",
            }),
          );
        }
      }
    }
    return issues;
  }
}
