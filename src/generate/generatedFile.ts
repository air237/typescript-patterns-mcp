/**
 * A single generated TypeScript source file produced by
 * {@link PatternGenerator#generate}.
 *
 * TypeScript sibling of `com.javapatterns.mcp.generate.PatternGenerator.GeneratedFile`,
 * minus the Java-specific `packageName` field.
 *
 * Fields:
 *   - `fileName` — the file name including extension (e.g. `"Logger.ts"`).
 *   - `source`   — the rendered TypeScript source, ready to write to disk.
 */
export interface GeneratedFile {
  readonly fileName: string;
  readonly source: string;
}
