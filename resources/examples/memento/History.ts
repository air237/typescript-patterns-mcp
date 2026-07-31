import { type DocumentMemento } from "./DocumentMemento.js";

/**
 * Caretaker — stores Mementos without inspecting them. This is a plain undo
 * stack: `push()` on every edit, `pop()` to revert.
 */
export class History {
  readonly #stack: DocumentMemento[] = [];

  push(memento: DocumentMemento): void {
    this.#stack.push(memento);
  }

  pop(): DocumentMemento | null {
    return this.#stack.pop() ?? null;
  }

  size(): number {
    return this.#stack.length;
  }
}
