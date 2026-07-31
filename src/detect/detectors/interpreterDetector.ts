/**
 * Recognises the Interpreter pattern.
 *
 * Signals (each 0.25):
 *   1. There is an interface with an `evaluate(...)` or `interpret(...)`
 *      method (the AST node contract).
 *   2. That method takes a "context" parameter — either typed as a
 *      class named `*Context`, or the parameter name is `ctx` /
 *      `context`.
 *   3. There are >=2 classes implementing that interface (terminals
 *      + non-terminals).
 *   4. At least one implementor holds a field typed as the SAME
 *      interface (a non-terminal expression composed of sub-expressions).
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine } from "./detectorHelpers.js";

export class InterpreterDetector implements PatternDetector {
  readonly pattern = "INTERPRETER" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      const evaluateMethod = iface
        .getMethods()
        .find(
          (m) => m.getName() === "evaluate" || m.getName() === "interpret",
        );
      if (evaluateMethod === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) evaluate/interpret method exists
      signals++;
      evidence.push(
        `interface ${name} declares ${evaluateMethod.getName()}(…)`,
      );

      // 2) context parameter
      const contextParam = evaluateMethod.getParameters()[0];
      const paramType = contextParam?.getTypeNode()?.getText() ?? "";
      const paramName = contextParam?.getName() ?? "";
      const contextByType = /Context$|Ctx$/.test(paramType);
      const contextByName = /^(ctx|context|environment|env)$/.test(paramName);
      if (contextByType || contextByName) {
        signals++;
        evidence.push(
          `takes a context parameter (${paramName}: ${paramType || "any"})`,
        );
      }

      // 3) >=2 implementors
      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText() === name));
      if (implementors.length >= 2) {
        signals++;
        evidence.push(
          `${implementors.length} classes implement ${name}`,
        );
      }

      // 4) at least one implementor is a non-terminal (holds a
      //    same-typed field)
      const hasNonTerminal = implementors.some((c) =>
        instanceFields(c).some((p) => {
          const t = p.getTypeNode()?.getText() ?? "";
          return t === name;
        }),
      );
      if (hasNonTerminal) {
        signals++;
        evidence.push(
          `at least one implementor holds a ${name} field (non-terminal expression)`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "INTERPRETER",
            className: name,
            startLine: startLine(iface),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
