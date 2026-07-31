/**
 * Abstract product — the sibling of Button in the same family.
 *
 * The Abstract Factory guarantees that a client using the same factory gets
 * a Button and a Checkbox that visually belong together.
 */
export interface Checkbox {
  paint(): string;
}
