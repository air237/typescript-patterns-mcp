/**
 * After every concrete Command implementation, emit
 * `Object.freeze(<CommandClass>.prototype);` at module level.
 *
 * Same shape as `state-make-implementations-final`; the target contract
 * is an interface whose name ends with `Command` and that has at least
 * one implementor.
 *
 * Idempotency: freeze-line for a class present anywhere → skip.
 */

import { type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { escapeRegExp, startLine } from "./refactoringHelpers.js";

export class CommandMakeImplementationsFinal implements PatternRefactoring {
  readonly id = "COMMAND_MAKE_IMPLEMENTATIONS_FINAL" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];

    const commandContracts = sourceFile
      .getInterfaces()
      .map((i) => i.getName())
      .filter((n) => n.endsWith("Command"));
    if (commandContracts.length === 0) {
      return {
        refactoringId: this.id,
        newSource: sourceFile.getFullText(),
        changed: false,
        changes: [],
      };
    }

    const fileText = sourceFile.getFullText();
    const contractSet = new Set(commandContracts);

    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;

      const impls = cls.getImplements().map((i) => i.getText());
      if (!impls.some((i) => contractSet.has(i))) continue;

      const freezeRe = new RegExp(
        `Object\\.freeze\\s*\\(\\s*${escapeRegExp(name)}\\.prototype\\s*\\)`,
      );
      if (freezeRe.test(fileText)) continue;

      sourceFile.insertStatements(cls.getChildIndex() + 1, [
        `Object.freeze(${name}.prototype);`,
      ]);
      changes.push(
        `${name}: concrete command at line ${startLine(cls)} — prototype frozen`,
      );
    }

    return {
      refactoringId: this.id,
      newSource: sourceFile.getFullText(),
      changed: changes.length > 0,
      changes,
    };
  }
}
