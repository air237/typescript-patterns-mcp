/**
 * Recognises the State pattern.
 *
 * Signals (each 0.25):
 *   1. There is an interface whose name ends with `State`.
 *   2. That interface declares a method returning itself (transition
 *      method, e.g. `next(): FooState`).
 *   3. There are >=2 concrete classes implementing that State interface.
 *   4. There is another class in the file that holds a `#state` (or
 *      `_state`) field of the State type AND some method reassigns it
 *      via `this.#state = this.#state.next()`-shaped code.
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine, typeMentionsClass } from "./detectorHelpers.js";

export class StateDetector implements PatternDetector {
  readonly pattern = "STATE" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      if (!name.endsWith("State") || name === "State") continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) name ends with State
      signals++;
      evidence.push(`interface name ends with 'State' (${name})`);

      // 2) has a self-returning method
      const selfReturning = iface.getMethods().some((m) => {
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        return typeMentionsClass(rt, name);
      });
      if (selfReturning) {
        signals++;
        evidence.push(
          `at least one method returns ${name} (transition contract)`,
        );
      }

      // 3) >=2 concrete implementors
      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText() === name));
      if (implementors.length >= 2) {
        signals++;
        evidence.push(
          `${implementors.length} classes implement ${name} (concrete states)`,
        );
      }

      // 4) a context class that holds a State field and rotates it
      const contextClass = sourceFile.getClasses().find((c) => {
        const holdsState = instanceFields(c).some((p) => {
          const t = p.getTypeNode()?.getText() ?? "";
          return typeMentionsClass(t, name);
        });
        if (!holdsState) return false;
        // Look for `this.<field> = this.<field>.<method>()` shape
        return c.getMethods().some((m) => {
          const body = m.getBodyText() ?? "";
          return /this\.[#_]?\w+\s*=\s*this\.[#_]?\w+\s*\.\s*\w+\s*\(/.test(
            body,
          );
        });
      });
      if (contextClass !== undefined) {
        signals++;
        evidence.push(
          `${contextClass.getName() ?? "<anon>"} holds a ${name} and reassigns it (context)`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "STATE",
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
