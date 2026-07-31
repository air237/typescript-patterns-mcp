/**
 * Recognises the Template Method pattern.
 *
 * Signals (each 0.25):
 *   1. There is an `abstract` class.
 *   2. It has a NON-abstract method (the template) that calls other
 *      methods via `this.<name>(...)`.
 *   3. Among those `this.x()` targets, at least one is declared
 *      `abstract` on the same class (the hook).
 *   4. There is at least one concrete subclass in the same file that
 *      overrides the abstract hook (`override` keyword).
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { isAbstractClass, startLine } from "./detectorHelpers.js";

export class TemplateMethodDetector implements PatternDetector {
  readonly pattern = "TEMPLATE_METHOD" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const classes = sourceFile.getClasses();

    for (const base of classes) {
      const name = base.getName();
      if (name === undefined || !isAbstractClass(base)) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) abstract class
      signals++;
      evidence.push("class is abstract (candidate template holder)");

      const abstractHookNames = new Set(
        base
          .getMethods()
          .filter((m) => m.hasModifier(SyntaxKind.AbstractKeyword))
          .map((m) => m.getName()),
      );

      // 2) template method calls other this.x()
      let templateHookCall = false;
      let calledHookName: string | null = null;
      for (const m of base.getMethods()) {
        if (m.hasModifier(SyntaxKind.AbstractKeyword)) continue;
        const body = m.getBodyText() ?? "";
        const calls = body.match(/this\.(\w+)\s*\(/g);
        if (calls === null) continue;
        for (const call of calls) {
          const match = /this\.(\w+)/.exec(call);
          if (match === null) continue;
          const targetName = match[1]!;
          if (abstractHookNames.has(targetName)) {
            templateHookCall = true;
            calledHookName = targetName;
            break;
          }
        }
        if (templateHookCall) break;
      }
      if (templateHookCall) {
        signals++;
        evidence.push(
          "non-abstract method calls a this.<hook>() where <hook> is abstract on this class",
        );
      }

      // 3) at least one abstract hook exists
      if (abstractHookNames.size > 0) {
        signals++;
        evidence.push(
          `class declares ${abstractHookNames.size} abstract hook method(s)`,
        );
      }

      // 4) concrete subclass overrides the hook
      const overridingSubclass = classes.find((c) => {
        if (c === base) return false;
        const ext = c.getExtends()?.getText();
        if (ext !== name) return false;
        return c
          .getMethods()
          .some(
            (m) =>
              m.hasModifier(SyntaxKind.OverrideKeyword) &&
              abstractHookNames.has(m.getName()),
          );
      });
      if (overridingSubclass !== undefined) {
        signals++;
        evidence.push(
          `${overridingSubclass.getName() ?? "<anon>"} overrides ${calledHookName ?? "the hook"}`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "TEMPLATE_METHOD",
            className: name,
            startLine: startLine(base),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
