/**
 * Recognises the Composite pattern.
 *
 * Signals (each 0.25):
 *   1. There is an interface OR abstract class whose name looks like
 *      a Component (heuristic: appears in `implements`/`extends`
 *      clauses of two or more classes in the same file).
 *   2. There is a class that owns a collection field of that
 *      Component type (the composite's children).
 *   3. That composite class exposes an `add`/`addChild`/`append`
 *      method taking a Component.
 *   4. The composite recurses into its children — its main method
 *      contains `for` iteration over the children collection.
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine } from "./detectorHelpers.js";

const ADD_NAMES = /^(add|addChild|append|push)$/;

export class CompositeDetector implements PatternDetector {
  readonly pattern = "COMPOSITE" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const classes = sourceFile.getClasses();
    const interfaces = sourceFile.getInterfaces();

    // Any interface / abstract class implemented by >=2 classes counts as
    // a candidate Component.
    const candidates: string[] = [];
    for (const iface of interfaces) {
      const implementors = classes.filter((c) =>
        c.getImplements().some((i) => i.getText() === iface.getName()),
      );
      if (implementors.length >= 2) candidates.push(iface.getName());
    }

    for (const composite of classes) {
      const name = composite.getName();
      if (name === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;
      let componentType: string | null = null;

      // 1) Component candidate exists
      // AND this class implements it
      const impls = composite.getImplements().map((i) => i.getText());
      for (const c of candidates) {
        if (impls.includes(c)) {
          componentType = c;
          break;
        }
      }
      if (componentType !== null) {
        signals++;
        evidence.push(
          `implements common component interface ${componentType}`,
        );
      }

      // 2) collection field of the Component type
      const childrenField =
        componentType === null
          ? undefined
          : instanceFields(composite).find((p) => {
              const t = p.getTypeNode()?.getText() ?? "";
              // `Component[]` or `readonly Component[]` or `Array<Component>`
              const arrayShape = new RegExp(
                `${componentType}\\s*\\[\\]|Array\\s*<\\s*${componentType}\\s*>`,
              );
              return arrayShape.test(t);
            });
      if (childrenField !== undefined) {
        signals++;
        evidence.push(
          `field '${childrenField.getName()}' holds a collection of ${componentType}`,
        );
      }

      // 3) add-like method taking a Component
      const addMethod = composite.getMethods().find((m) => {
        if (!ADD_NAMES.test(m.getName())) return false;
        const params = m.getParameters();
        if (params.length === 0) return false;
        const pt = params[0]?.getTypeNode()?.getText() ?? "";
        return componentType !== null && pt === componentType;
      });
      if (addMethod !== undefined) {
        signals++;
        evidence.push(
          `${addMethod.getName()}() accepts a ${componentType} argument`,
        );
      }

      // 4) recursion — some method iterates the children field
      if (childrenField !== undefined) {
        const recursesIntoChildren = composite.getMethods().some((m) => {
          const body = m.getBodyText() ?? "";
          const iterationOnField = new RegExp(
            `for\\s*\\(\\s*(?:const|let|var)\\s+\\w+\\s+of\\s+[^;]*${childrenField.getName()}|` +
              `${childrenField.getName()}\\s*\\.\\s*(?:forEach|map|reduce|filter)\\s*\\(`,
          );
          return iterationOnField.test(body);
        });
        if (recursesIntoChildren) {
          signals++;
          evidence.push(
            `recurses into '${childrenField.getName()}' collection`,
          );
        }
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "COMPOSITE",
            className: name,
            startLine: startLine(composite),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
