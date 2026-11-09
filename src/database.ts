import * as Cloudflare from "@alchemy.run/cloudflare";

/**
 * Fresh D1 database whose schema is applied from the committed SQLite
 * migrations when Alchemy deploys the stack.
 */
export const Database = Cloudflare.D1.Database("RarifyDatabase", {
  migrations: "./migrations",
});
