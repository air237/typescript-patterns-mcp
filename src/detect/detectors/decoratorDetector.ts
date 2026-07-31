/**
 * Recognises the Decorator pattern.
 *
 * Signals (each 0.25):
 *   1. There is an interface (the Component) implemented by 2+ classes.
 *   2. There is a class with a `readonly` field of the Component type
 *      (the wrapped delegate).
 *   3. That class implements the same Component interface (so callers
 *      cannot distinguish decorator from wrapped).
 *   4. Some method of the decorator delegates to the wrapped field
 *      (`this.<wrapped>.<method>()`) — the forwarding shape.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine } from "./detectorHelpers.js";

export class DecoratorDetector implements PatternDetector {
  readonly pattern = "DECORATOR" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const classes = sourceFile.getClasses();
    const interfaces = sourceFile.getInterfaces();

    // A "component" interface is one with >=2 implementors in the file.
    const componentIfaces = interfaces.filter(
      (i) =>
        classes.filter((c) =>
          c.getImplements().some((imp) => imp.getText() === i.getName()),
        ).length >= 2,
    );

    for (const decorator of classes) {
      const name = decorator.getName();
      if (name === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;
      let componentType: string | null = null;

      // 3 (checked first for structural reasons): implements a Component
      for (const iface of componentIfaces) {
        if (
          decorator.getImplements().some((i) => i.getText() === iface.getName())
        ) {
          componentType = iface.getName();
          break;
        }
      }

      // 1) Component interface exists at all
      if (componentType !== null) {
        signals++;
        evidence.push(
          `component interface ${componentType} has multiple implementors`,
        );
      }

      // 2) readonly field of the Component type (the wrapped delegate)
      const wrappedField =
        componentType === null
          ? undefined
          : instanceFields(decorator).find((p) => {
              const type = p.getTypeNode()?.getText() ?? "";
              // Check for readonly (either the modifier keyword or the
              // 'readonly' word before the type, which is how some
              // ts-morph nodes render it).
              const isReadonly =
                p.hasModifier?.(SyntaxKind.ReadonlyKeyword) ?? false;
              return type === componentType && isReadonly;
            });
      if (wrappedField !== undefined) {
        signals++;
        evidence.push(
          `readonly field '${wrappedField.getName()}' holds the wrapped ${componentType}`,
        );
      }

      // 3 (signal): decorator implements the Component (accounted above
      // via componentType). Give it a separate credit as the "same
      // surface" signal.
      if (componentType !== null) {
        signals++;
        evidence.push(
          `decorator itself implements ${componentType} (same surface as wrapped)`,
        );
      }

      // 4) some method delegates to the wrapped field
      if (wrappedField !== undefined) {
        const forwardCall = new RegExp(
          `this\\.${wrappedField.getName()}\\s*\\.\\s*\\w+\\s*\\(`,
        );
        const delegates = decorator
          .getMethods()
          .some((m) => forwardCall.test(m.getBodyText() ?? ""));
        if (delegates) {
          signals++;
          evidence.push(
            `at least one method delegates to this.${wrappedField.getName()}.x()`,
          );
        }
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "DECORATOR",
            className: name,
            startLine: startLine(decorator),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
