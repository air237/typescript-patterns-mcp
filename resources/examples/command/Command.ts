/**
 * Command interface — supports both `execute()` and `undo()` so a caretaker
 * can operate an undo stack without knowing what any specific command does.
 */
export interface Command {
  execute(): void;
  undo(): void;
}
