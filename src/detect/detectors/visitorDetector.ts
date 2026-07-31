/**
 * Recognises the Visitor pattern.
 *
 * Signals (each 0.25):
 *   1. There is an interface with a method named `accept` — the
 *      element side of the double dispatch.
 *   2. That `accept` method takes a parameter typed as ANOTHER
 *      interface (the visitor).
 *   3. The visitor interface has >=2 methods (one per concrete
 *      element type) whose names start with `visit`.
 *   4. There are >=2 concrete classes implementing the element
 *      interface, each with a real `accept()` that calls back
 *      `visitor.visit<Concrete>(this)` — the second dispatch.
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { startLine } from "./detectorHelpers.js";

export class VisitorDetector implements PatternDetector {
  readonly pattern = "VISITOR" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const interfaces = sourceFile.getInterfaces();
    const classes = sourceFile.getClasses();

    for (const element of interfaces) {
      const elementName = element.getName();
      const evidence: string[] = [];
      let signals = 0;

      // 1) accept method exists
      const accept = element.getMethods().find((m) => m.getName() === "accept");
      if (accept === undefined) continue;
      signals++;
      evidence.push(`interface ${elementName} declares accept(…)`);

      // 2) accept takes an interface-typed argument
      const acceptParam = accept.getParameters()[0];
      const visitorTypeRaw = acceptParam?.getTypeNode()?.getText() ?? "";
      // Strip generic instantiation ("FooVisitor<R>" -> "FooVisitor").
      const visitorTypeName = visitorTypeRaw.replace(/\s*<[^>]*>\s*$/, "");
      const visitorIface = interfaces.find(
        (i) => i.getName() === visitorTypeName,
      );
      if (visitorIface !== undefined) {
        signals++;
        evidence.push(
          `accept()'s argument type is another interface (${visitorTypeName})`,
        );
      }

      // 3) visitor interface has >=2 visit* methods
      if (visitorIface !== undefined) {
        const visitMethods = visitorIface
          .getMethods()
          .filter((m) => /^visit[A-Z]?/.test(m.getName()));
        if (visitMethods.length >= 2) {
          signals++;
          evidence.push(
            `${visitorTypeName} has ${visitMethods.length} visit* methods`,
          );
        }
      }

      // 4) concrete elements implement the element interface AND
      //    their accept() calls a visit* method on the visitor
      if (visitorIface !== undefined) {
        const concreteElements = classes.filter((c) =>
          c.getImplements().some((i) => i.getText() === elementName),
        );
        const doublyDispatching = concreteElements.filter((c) => {
          const acceptImpl = c.getMethods().find((m) => m.getName() === "accept");
          if (acceptImpl === undefined) return false;
          const body = acceptImpl.getBodyText() ?? "";
          // `visitor.visitFoo(this)` — parameter name may vary; use a
          // generic pattern of `<something>.visit<Word>(this)`.
          return /\w+\s*\.\s*visit\w*\s*\(\s*this\s*\)/.test(body);
        });
        if (doublyDispatching.length >= 2) {
          signals++;
          evidence.push(
            `${doublyDispatching.length} concrete elements double-dispatch to visitor.visit*(this)`,
          );
        }
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "VISITOR",
            className: elementName,
            startLine: startLine(element),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
