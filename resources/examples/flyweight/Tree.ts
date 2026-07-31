import { type TreeType } from "./TreeType.js";

/**
 * Context — holds the extrinsic state (x, y position) plus a reference to
 * the shared intrinsic TreeType. Millions of trees, but only a handful of
 * TreeType instances.
 */
export class Tree {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly type: TreeType,
  ) {}

  draw(): string {
    return `${this.type.name}@(${this.x},${this.y})`;
  }
}
