/**
 * Recognises the Observer pattern (a.k.a. Publish-Subscribe).
 *
 * Signals (each 0.25):
 *   1. There is a class that owns a collection field named like
 *      `observers`, `listeners`, or `subscribers`.
 *   2. That class exposes a `subscribe`, `addObserver`, or `on(…)`
 *      method (naming heuristic).
 *   3. That class exposes a `publish`, `notify`, `emit`, or `fire`
 *      method that ITERATES over the collection (`for…of` or
 *      `.forEach`).
 *   4. The iteration is over a snapshot (`[...listeners]` or
 *      `listeners.slice()`) — the anti-flake shape the sibling
 *      `observer-snapshot-iteration` refactoring recipe promotes.
 *      Missing snapshot lowers confidence but does NOT reject.
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine } from "./detectorHelpers.js";

const COLLECTION_NAMES = /^(observers|listeners|subscribers|handlers)$/i;
const SUBSCRIBE_NAMES = /^(subscribe|addObserver|addListener|addSubscriber|on)$/;
const PUBLISH_NAMES = /^(publish|notify|emit|fire|dispatch)$/;

export class ObserverDetector implements PatternDetector {
  readonly pattern = "OBSERVER" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) collection field
      const collectionField = instanceFields(cls)
        .find((p) => COLLECTION_NAMES.test(p.getName()));
      if (collectionField !== undefined) {
        signals++;
        evidence.push(
          `field '${collectionField.getName()}' looks like an observer collection`,
        );
      }

      // 2) subscribe-like method
      const subMethod = cls
        .getMethods()
        .find((m) => SUBSCRIBE_NAMES.test(m.getName()));
      if (subMethod !== undefined) {
        signals++;
        evidence.push(
          `${subMethod.getName()}() looks like a subscribe method`,
        );
      }

      // 3) publish-like method that iterates a collection
      const pubMethod = cls
        .getMethods()
        .find((m) => PUBLISH_NAMES.test(m.getName()));
      let pubBody = "";
      if (pubMethod !== undefined) {
        pubBody = pubMethod.getBodyText() ?? "";
        if (/for\s*\(/.test(pubBody) || /\.forEach\s*\(/.test(pubBody)) {
          signals++;
          evidence.push(
            `${pubMethod.getName()}() iterates a collection (fan-out shape)`,
          );
        }
      }

      // 4) snapshot iteration
      if (
        pubBody !== "" &&
        (/\[\s*\.\.\./.test(pubBody) || /\.slice\s*\(\s*\)/.test(pubBody))
      ) {
        signals++;
        evidence.push(
          `${pubMethod!.getName()}() iterates a snapshot ([...] or .slice())`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "OBSERVER",
            className: name,
            startLine: startLine(cls),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
