/**
 * Recognises the Memento pattern.
 *
 * Signals (each 0.25):
 *   1. There is a class whose name ends with `Memento`.
 *   2. That class exposes only readonly fields AND has an
 *      `@internal` JSDoc marker on the snapshot field (the
 *      "opaque memento" contract).
 *   3. Another class in the file has a `save()` method returning
 *      the memento type AND a `restore(m: Memento)` method taking
 *      it (the originator).
 *   4. Yet another class stores mementos WITHOUT reading their
 *      fields (the caretaker) — heuristic: a class with a field of
 *      type `Memento[]` or `Array<Memento>` AND no code that reads
 *      `._<field>` or the internal marker.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { escapeRegExp, instanceFields, startLine } from "./detectorHelpers.js";

export class MementoDetector implements PatternDetector {
  readonly pattern = "MEMENTO" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const memento of sourceFile.getClasses()) {
      const name = memento.getName();
      if (name === undefined) continue;
      if (!name.endsWith("Memento") || name === "Memento") continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) name ends with Memento
      signals++;
      evidence.push(`class name ends with 'Memento' (${name})`);

      // 2) all instance fields are readonly AND at least one is documented @internal
      const props = instanceFields(memento);
      const allReadonly =
        props.length >= 1 &&
        props.every((p) => p.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true);
      const hasInternalMarker = props.some((p) => {
        const docs = p.getLeadingCommentRanges().map((r) => r.getText());
        return docs.some((d) => /@internal/.test(d));
      });
      if (allReadonly && hasInternalMarker) {
        signals++;
        evidence.push(
          "all instance fields are readonly and at least one is documented @internal (opaque memento)",
        );
      }

      // 3) an originator class in the file has save(): Memento + restore(Memento)
      const originator = sourceFile.getClasses().find((c) => {
        if (c === memento) return false;
        const save = c.getMethods().find((m) => m.getName() === "save");
        if (save === undefined) return false;
        const saveRt = save.getReturnTypeNode()?.getText() ?? "";
        if (saveRt !== name) return false;
        const restore = c.getMethods().find((m) => m.getName() === "restore");
        if (restore === undefined) return false;
        const restorePt =
          restore.getParameters()[0]?.getTypeNode()?.getText() ?? "";
        return restorePt === name;
      });
      if (originator !== undefined) {
        signals++;
        evidence.push(
          `${originator.getName() ?? "<anon>"} has save():${name} and restore(${name}) — originator shape`,
        );
      }

      // 4) a caretaker stores mementos without reading their internals
      const caretaker = sourceFile.getClasses().find((c) => {
        if (c === memento || c === originator) return false;
        const holdsMementos = instanceFields(c).some((p) => {
          const t = p.getTypeNode()?.getText() ?? "";
          return new RegExp(
            `^(readonly\\s+)?${escapeRegExp(name)}\\s*\\[\\]|Array\\s*<\\s*${escapeRegExp(name)}\\s*>$`,
          ).test(t);
        });
        if (!holdsMementos) return false;
        // Ensure the caretaker never reads a `._<field>` on the memento —
        // classic caretaker contract.
        const bodies = c
          .getMethods()
          .map((m) => m.getBodyText() ?? "")
          .join("\n");
        return !/\.\s*_[a-zA-Z]/.test(bodies);
      });
      if (caretaker !== undefined) {
        signals++;
        evidence.push(
          `${caretaker.getName() ?? "<anon>"} stores ${name}s without reading their internals (caretaker)`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "MEMENTO",
            className: name,
            startLine: startLine(memento),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
