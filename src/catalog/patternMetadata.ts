/**
 * Immutable metadata for a single design pattern, loaded from the
 * `resources/catalog/patterns.json` resource at startup.
 *
 * TypeScript sibling of `com.javapatterns.mcp.catalog.PatternMetadata`.
 *
 * The richer fields (intent, problem hint, aliases) live in the JSON so
 * copy editing does not require a code change. The structural fields
 * (category, display name, slug, reference URL) live on the {@link Pattern}
 * type / info table and stay the single source of truth.
 */

import { type Pattern } from "./pattern.js";

export interface PatternMetadata {
  readonly pattern: Pattern;
  /** One-sentence purpose statement from the GoF book / refactoring.guru. */
  readonly intent: string;
  /** Short description of the design problem this pattern solves (1–2 sentences). */
  readonly problem: string;
  /** Alternative names used in industry, e.g. Observer ↔ "Publish-Subscribe". */
  readonly aliases: readonly string[];
}
