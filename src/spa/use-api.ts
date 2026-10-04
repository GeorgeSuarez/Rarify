import { useEffect, useState } from "react";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { UnauthorizedError } from "../api/contracts.ts";

/** Lifecycle of a client-side API read. */
export type ApiState<A> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly data: A }
  | { readonly status: "unauthorized" }
  | { readonly status: "error"; readonly message: string };

/**
 * Run an API effect for a route and track its loading, unauthorized, and error
 * states so pages can render a truthful fallback.
 *
 * Failures are classified inside the Effect runtime, so the hook never handles
 * an untyped promise rejection.
 *
 * @param load - Starts the API request; must be stable across renders.
 * @param deps - Values that invalidate the request when they change.
 * @returns The current API state for the page.
 */
export function useApi<A, E>(
  load: () => Effect.Effect<A, E | UnauthorizedError>,
  deps: ReadonlyArray<unknown>,
): ApiState<A> {
  const [state, setState] = useState<ApiState<A>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    const outcome = load().pipe(
      Effect.map((data) => ({ status: "ready", data }) as const),
      Effect.catchTag("UnauthorizedError", () =>
        Effect.succeed({ status: "unauthorized" } as const),
      ),
      Effect.catchCause((cause) =>
        Effect.succeed({
          status: "error",
          message: Cause.pretty(cause),
        } as const),
      ),
    );

    Effect.runPromise(outcome).then((result) => {
      if (cancelled) return;

      if (result.status === "ready") setState({ status: "ready", data: result.data });
      else if (result.status === "unauthorized") setState({ status: "unauthorized" });
      else setState({ status: "error", message: result.message });
    });

    return () => {
      cancelled = true;
    };
    // SAFETY: callers pass a fresh `load` closure for each dependency change; the
    // dependency list is the documented contract of this hook.
  }, deps);

  return state;
}
