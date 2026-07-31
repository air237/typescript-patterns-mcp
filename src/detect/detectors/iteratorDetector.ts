/**
 * Recognises the Iterator pattern.
 *
 * DELIBERATELY ignores TypeScript's built-in `Symbol.iterator` /
 * `Iterator<T>` idiom — the pattern here is only interesting when the
 * user has hand-rolled a GoF-shaped iterator, because the built-in
 * shape is language-level and adds no design intent.
 *
 * Signals (each 0.25):
 *   1. There is a user-defined interface with both `hasNext()` and
 *      `next()` methods, and whose name is NOT `Iterator` (the
 *      built-in type).
 *   2. There is an "aggregate" interface / class that has an
 *      `iterator()` method returning the iterator interface.
 *   3. There is at least one class implementing the iterator interface.
 *   4. That implementation carries a cursor field (`#cursor`, `_index`,
 *      `position`, `index`, etc.).
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine, typeMentionsClass } from "./detectorHelpers.js";

const CURSOR_NAMES = /^[#_]?(cursor|index|position|pos|idx)$/i;

export class IteratorDetector implements PatternDetector {
  readonly pattern = "ITERATOR" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const iterIface of sourceFile.getInterfaces()) {
      const name = iterIface.getName();
      if (name === "Iterator") continue;

      const methodNames = iterIface.getMethods().map((m) => m.getName());
      if (!methodNames.includes("hasNext") || !methodNames.includes("next")) {
        continue;
      }

      const evidence: string[] = [];
      let signals = 0;

      // 1) hasNext + next
      signals++;
      evidence.push(
        `interface ${name} declares hasNext() + next() (GoF iterator contract)`,
      );

      // 2) aggregate interface / class returning this iterator
      const hasAggregate =
        sourceFile.getInterfaces().some((otherIface) =>
          otherIface.getMethods().some((m) => {
            if (m.getName() !== "iterator") return false;
            const rt = m.getReturnTypeNode()?.getText() ?? "";
            return typeMentionsClass(rt, name);
          }),
        ) ||
        sourceFile.getClasses().some((c) =>
          c.getMethods().some((m) => {
            if (m.getName() !== "iterator") return false;
            const rt = m.getReturnTypeNode()?.getText() ?? "";
            return typeMentionsClass(rt, name);
          }),
        );
      if (hasAggregate) {
        signals++;
        evidence.push(
          `an aggregate exposes iterator(): ${name} (or a generic instantiation)`,
        );
      }

      // 3) at least one implementor
      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText().startsWith(name)));
      if (implementors.length >= 1) {
        signals++;
        evidence.push(
          `${implementors.length} class(es) implement ${name}`,
        );
      }

      // 4) cursor field on the implementor
      const cursoredImpl = implementors.find((c) =>
        instanceFields(c).some((p) => CURSOR_NAMES.test(p.getName())),
      );
      if (cursoredImpl !== undefined) {
        signals++;
        evidence.push(
          `${cursoredImpl.getName() ?? "<anon>"} carries a cursor field`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "ITERATOR",
            className: name,
            startLine: startLine(iterIface),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
