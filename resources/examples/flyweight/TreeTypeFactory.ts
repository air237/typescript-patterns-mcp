import { TreeType } from "./TreeType.js";

/**
 * Flyweight factory — returns a shared `TreeType` per (name, texture, colour)
 * key. If two callers ask for `TreeTypeFactory.get("oak", "smooth", "brown")`
 * they receive the SAME reference, not two equal but distinct objects. That
 * is the entire memory-saving contract of the pattern.
 *
 * The cache is scoped to the class (`static`) — a fresh factory instance
 * would defeat the purpose.
 */
export class TreeTypeFactory {
  static readonly #cache = new Map<string, TreeType>();

  static get(name: string, texture: string, color: string): TreeType {
    const key = `${name}|${texture}|${color}`;
    let existing = TreeTypeFactory.#cache.get(key);
    if (existing === undefined) {
      existing = new TreeType(name, texture, color);
      TreeTypeFactory.#cache.set(key, existing);
    }
    return existing;
  }

  static poolSize(): number {
    return TreeTypeFactory.#cache.size;
  }
}
