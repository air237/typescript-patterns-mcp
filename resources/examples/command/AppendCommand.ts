import { type Command } from "./Command.js";
import { type TextEditor } from "./TextEditor.js";

/**
 * Concrete command wrapping `TextEditor.append(fragment)` plus the matching
 * `undo()` that removes the very fragment this command added — even if
 * further commands ran in between.
 */
export class AppendCommand implements Command {
  constructor(
    private readonly editor: TextEditor,
    private readonly fragment: string,
  ) {}

  execute(): void {
    this.editor.append(this.fragment);
  }

  undo(): void {
    this.editor.removeSuffix(this.fragment.length);
  }
}
