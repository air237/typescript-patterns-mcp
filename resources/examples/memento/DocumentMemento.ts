/**
 * Opaque Memento — the caretaker cannot read its state, only pass it back
 * to the originator on restore.
 *
 * The pattern's rigour depends on this opacity: the state field is
 * accessible only to `TextDocument` (a same-module deal here, since TS
 * has no package-private modifier). External callers cannot import
 * `_snapshotText` — the field starts with `_` and is documented as
 * `@internal`, and no other module reaches into it.
 */
export class DocumentMemento {
  /** @internal — only TextDocument may read this. */
  readonly _snapshotText: string;

  constructor(snapshotText: string) {
    this._snapshotText = snapshotText;
    Object.freeze(this);
  }
}
