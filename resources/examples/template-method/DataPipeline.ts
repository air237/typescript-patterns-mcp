/**
 * Abstract template — defines the algorithm skeleton in `process()`.
 * Subclasses fill in only `parse()` and `transform()`; the top-level flow
 * cannot be rearranged.
 *
 * The Java sibling marks `process()` `final`; TypeScript lacks a `final`
 * keyword. The equivalent is a JSDoc `@final` marker plus
 * `Object.freeze(cls.prototype.process)` — but here the shape is enforced
 * by making `process()` a plain method not marked as overridable and by
 * subclasses only ever supplying the hook methods.
 *
 * The `template-method-make-final` refactoring recipe (planned) adds an
 * explicit `Object.freeze(...)` call on the prototype method.
 */
export abstract class DataPipeline {
  /** Template method — do not override. */
  process(raw: string): string {
    const parsed = this.parse(raw);
    const transformed = this.transform(parsed);
    return this.format(transformed);
  }

  protected abstract parse(raw: string): readonly string[];
  protected abstract transform(parsed: readonly string[]): readonly string[];

  /** Concrete default step — subclasses may override, but usually do not. */
  protected format(items: readonly string[]): string {
    return items.join(",");
  }
}
