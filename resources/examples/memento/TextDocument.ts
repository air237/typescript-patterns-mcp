import { DocumentMemento } from "./DocumentMemento.js";

/**
 * Originator — creates and consumes DocumentMementos. `#text` never leaks
 * through a getter; the only way to observe past state is via a Memento.
 */
export class TextDocument {
  #text = "";

  write(fragment: string): void {
    this.#text += fragment;
  }

  text(): string {
    return this.#text;
  }

  save(): DocumentMemento {
    return new DocumentMemento(this.#text);
  }

  restore(memento: DocumentMemento): void {
    this.#text = memento._snapshotText;
  }
}
