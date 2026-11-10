/**
 * Namespace ids for the API Worker's Cloudflare Rate Limiting bindings.
 *
 * Cloudflare counts per `namespace_id` across the whole account — including
 * across different Workers — so two stages that share an id share their
 * counters for a given key. Preview and production must therefore not collide,
 * or a burst against the preview host would spend production's allowance.
 *
 * @see https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
 */

/** Namespace id base for the Steam sign-in callback bucket. */
const AUTH_NAMESPACE_BASE = 1001;

/** Namespace id base for the dashboard API bucket. */
const API_NAMESPACE_BASE = 1002;

/** Distance between stage blocks, leaving room for more buckets per stage. */
const STAGE_STRIDE = 10_000;

/** Bucket ids for one stage. */
export interface RateLimitNamespaces {
  /** Namespace for `/auth/steam/callback`. */
  readonly auth: number;
  /** Namespace for `/api/*`. */
  readonly api: number;
}

/**
 * Stage blocks. Production keeps the base ids; every other stage gets its own
 * block so counters never cross between deployments.
 */
const STAGE_OFFSETS = new Map<string, number>([
  ["prod", 0],
  ["preview", 1],
]);

/** Block used by local `alchemy dev` runs and any stage not listed above. */
const FALLBACK_OFFSET_BASE = 3;

/**
 * Deterministic block for stages without an explicit assignment, so a stage
 * added later cannot silently share counters with another.
 *
 * @param stage - Alchemy stage name.
 * @returns A block index at or above {@link FALLBACK_OFFSET_BASE}.
 */
function fallbackOffset(stage: string): number {
  let hash = 0;

  for (let index = 0; index < stage.length; index += 1) {
    hash = (hash * 31 + stage.charCodeAt(index)) % 1000;
  }

  return FALLBACK_OFFSET_BASE + hash;
}

/**
 * Resolve the rate limiting namespace ids for one Alchemy stage.
 *
 * @param stage - Alchemy stage name, e.g. `prod`, `preview`, or `live_<user>`.
 * @returns Namespace ids that are unique to that stage within the account.
 */
export function rateLimitNamespaces(stage: string): RateLimitNamespaces {
  const offset = STAGE_OFFSETS.get(stage) ?? fallbackOffset(stage);

  return {
    auth: AUTH_NAMESPACE_BASE + offset * STAGE_STRIDE,
    api: API_NAMESPACE_BASE + offset * STAGE_STRIDE,
  };
}
