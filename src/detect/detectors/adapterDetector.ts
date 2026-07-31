/**
 * Recognises the Adapter pattern.
 *
 * Signals (each 0.25):
 *   1. There is a class whose name ends with `Adapter`.
 *   2. That class has a `readonly` field of a DIFFERENT class or
 *      interface type (the adaptee).
 *   3. That class implements an interface (the target — the surface
 *      the client actually consumes).
 *   4. Some method of the adapter calls a method of the adaptee
 *      (`this.<adaptee>.<method>()`) — the actual translation.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine } from "./detectorHelpers.js";

export class AdapterDetector implements PatternDetector {
  readonly pattern = "ADAPTER" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const adapter of sourceFile.getClasses()) {
      const name = adapter.getName();
      if (name === undefined) continue;
      if (!name.endsWith("Adapter") || name === "Adapter") continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) name ends with Adapter
      signals++;
      evidence.push(`class name ends with 'Adapter' (${name})`);

      // 2) readonly field of another type (adaptee)
      const adapteeField = instanceFields(adapter).find((p) => {
        const isReadonly = p.hasModifier?.(SyntaxKind.ReadonlyKeyword) ?? false;
        if (!isReadonly) return false;
        const t = p.getTypeNode()?.getText() ?? "";
        return t !== "" && t !== name;
      });
      if (adapteeField !== undefined) {
        signals++;
        evidence.push(
          `readonly field '${adapteeField.getName()}' holds the adaptee (${adapteeField.getTypeNode()?.getText()})`,
        );
      }

      // 3) implements at least one interface (the target)
      const targetIface = adapter.getImplements()[0];
      if (targetIface !== undefined) {
        signals++;
        evidence.push(
          `implements ${targetIface.getText()} as the target surface`,
        );
      }

      // 4) at least one method calls into the adaptee
      if (adapteeField !== undefined) {
        const forwardCall = new RegExp(
          `this\\.${adapteeField.getName()}\\s*\\.\\s*\\w+\\s*\\(`,
        );
        const forwards = adapter
          .getMethods()
          .some((m) => forwardCall.test(m.getBodyText() ?? ""));
        if (forwards) {
          signals++;
          evidence.push(
            `at least one method calls this.${adapteeField.getName()}.x()`,
          );
        }
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "ADAPTER",
            className: name,
            startLine: startLine(adapter),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
