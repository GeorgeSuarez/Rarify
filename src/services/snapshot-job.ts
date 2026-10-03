import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type { PersistenceError } from "./rarify-store.ts";

/** Aggregate outcome of one nightly snapshot run without player identifiers. */
export interface SnapshotRunResult {
  readonly attempted: number;
  readonly recorded: number;
  readonly failed: number;
}

/** Snapshot scheduler operations invoked by Cloudflare Cron Triggers. */
export interface Interface {
  /**
   * Process every known Steam account for the UTC day containing `scheduledAtMs`.
   * Per-account failures are counted so one player cannot stop the batch.
   */
  readonly runDaily: (
    scheduledAtMs: number,
  ) => Effect.Effect<SnapshotRunResult, PersistenceError>;
}

/**
 * Effect service for the daily snapshot job; Worker scheduling remains an
 * Alchemy/Cloudflare adapter concern.
 */
export class Service extends Context.Service<Service, Interface>()(
  "@rarify/SnapshotJob",
) {}
