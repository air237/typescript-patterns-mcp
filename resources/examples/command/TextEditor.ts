/**
 * Receiver — knows how to perform the actual work. Commands hold a
 * reference to the receiver and drive it; the receiver itself has no idea
 * a Command pattern is in play.
 */
export class TextEditor {
  #text = "";

  text(): string {
    return this.#text;
  }

  append(fragment: string): void {
    this.#text += fragment;
  }

  removeSuffix(length: number): void {
    if (length <= 0) return;
    this.#text = this.#text.slice(0, Math.max(0, this.#text.length - length));
  }
}
