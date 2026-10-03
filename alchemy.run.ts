import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import ApiWorker from "./src/api-worker.ts";
import { Database } from "./src/database.ts";
import { Website } from "./src/website.ts";

/**
 * Alchemy's production composition root for the Rarify Cloudflare stack.
 *
 * @returns The deployed website/API URLs and D1 database name.
 */
export default Alchemy.Stack(
  "Rarify",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const database = yield* Database;
    const website = yield* Website;
    const api = yield* ApiWorker;

    return {
      websiteUrl: website.url,
      apiUrl: api.url,
      databaseName: database.databaseName,
    };
  }),
);
