/**
 * Recognises the Command pattern.
 *
 * Signals (each 0.25):
 *   1. There is an interface whose name ends with `Command`.
 *   2. That interface declares an `execute` method.
 *   3. That interface also declares an `undo` method (bi-directional
 *      operation, characteristic of Command).
 *   4. There is at least one class implementing that Command interface.
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { startLine } from "./detectorHelpers.js";

export class CommandDetector implements PatternDetector {
  readonly pattern = "COMMAND" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      if (!name.endsWith("Command")) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) name ends with Command
      signals++;
      evidence.push(`interface name ends with 'Command' (${name})`);

      // 2) execute method
      const hasExecute = iface.getMethods().some((m) => m.getName() === "execute");
      if (hasExecute) {
        signals++;
        evidence.push("declares an execute() method");
      }

      // 3) undo method
      const hasUndo = iface.getMethods().some((m) => m.getName() === "undo");
      if (hasUndo) {
        signals++;
        evidence.push("declares an undo() method");
      }

      // 4) at least one implementor
      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText() === name));
      if (implementors.length >= 1) {
        signals++;
        evidence.push(
          `${implementors.length} class(es) implement ${name}`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "COMMAND",
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
