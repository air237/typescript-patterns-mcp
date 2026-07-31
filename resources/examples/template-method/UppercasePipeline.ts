import { DataPipeline } from "./DataPipeline.js";

/**
 * Concrete subclass — fills in only the two abstract hooks. The high-level
 * `process()` flow is inherited unchanged from the base.
 */
export class UppercasePipeline extends DataPipeline {
  protected override parse(raw: string): readonly string[] {
    return raw.split(/\s+/).filter((s) => s.length > 0);
  }

  protected override transform(parsed: readonly string[]): readonly string[] {
    return parsed.map((s) => s.toUpperCase());
  }
}
