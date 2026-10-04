import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as HttpRouter from "effect/http/HttpRouter";
import { SteamIdSchema } from "@/lib/types";
import { authRoutesLayer } from "@/src/api/auth-routes";
import { SESSION_COOKIE } from "@/src/api/session-cookie";
import * as SteamLogin from "@/src/services/steam-login";
import * as SteamOpenId from "@/src/services/steam-openid";

const STEAM_ID = Schema.decodeUnknownSync(SteamIdSchema)("76561198000000001");

const PUBLIC_APP_URL = "https://rarify.example";

const makeSteamLogin = (
  completeLogin: SteamLogin.Interface["completeLogin"],
): SteamLogin.Interface => ({ completeLogin });

const failingLogin = makeSteamLogin(() =>
  Effect.fail(
    new SteamOpenId.SteamOpenIdError({
      operation: "verifyAssertion",
      message: "Steam rejected the OpenID assertion",
      cause: new Error("invalid"),
    }),
  ),
);

const succeedingLogin = makeSteamLogin(() => Effect.succeed(Redacted.make("issued-token")));

const buildHandler = (steamLogin: SteamLogin.Interface) =>
  HttpRouter.toWebHandler(
    authRoutesLayer({
      steamLogin,
      publicAppUrl: PUBLIC_APP_URL,
      secureCookies: true,
    }),
    { disableLogger: true },
  );

describe("Steam auth routes", () => {
  it("starts Steam OpenID with return_to and realm on the public origin", async () => {
    const built = buildHandler(succeedingLogin);

    try {
      const response = await built.handler(new Request("https://rarify.example/auth/steam"));

      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("https://steamcommunity.com/openid/login");
      const parameters = new URL(location ?? "").searchParams;
      expect(parameters.get("openid.mode")).toBe("checkid_setup");
      expect(parameters.get("openid.return_to")).toBe(`${PUBLIC_APP_URL}/auth/steam/callback`);
      expect(parameters.get("openid.realm")).toBe(PUBLIC_APP_URL);
    } finally {
      await built.dispose();
    }
  });

  it("sets the HTTP-only session cookie on a successful callback", async () => {
    const built = buildHandler(succeedingLogin);

    try {
      const response = await built.handler(
        new Request(
          `https://rarify.example/auth/steam/callback?openid.mode=id_res&openid.claimed_id=https://steamcommunity.com/openid/id/${STEAM_ID}`,
        ),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(`${PUBLIC_APP_URL}/`);
      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain(`${SESSION_COOKIE}=issued-token`);
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("Secure");
      expect(setCookie).toContain("SameSite=Lax");
    } finally {
      await built.dispose();
    }
  });

  it("redirects to the login screen with an error when verification fails", async () => {
    const built = buildHandler(failingLogin);

    try {
      const response = await built.handler(
        new Request("https://rarify.example/auth/steam/callback?openid.mode=id_res"),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(`${PUBLIC_APP_URL}/login?error=auth_failed`);
      expect(response.headers.get("set-cookie")).toBeNull();
    } finally {
      await built.dispose();
    }
  });

  it("expires the session cookie on logout", async () => {
    const built = buildHandler(succeedingLogin);

    try {
      const response = await built.handler(
        new Request("https://rarify.example/auth/logout", { method: "POST" }),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(`${PUBLIC_APP_URL}/login`);
      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain(`${SESSION_COOKIE}=`);
      expect(setCookie).toContain("Max-Age=0");
    } finally {
      await built.dispose();
    }
  });

  it("marks cookies insecure only when the public origin is http", async () => {
    const built = HttpRouter.toWebHandler(
      authRoutesLayer({
        steamLogin: succeedingLogin,
        publicAppUrl: "http://localhost:5173",
        secureCookies: false,
      }),
      { disableLogger: true },
    );

    try {
      const response = await built.handler(
        new Request("http://localhost:5173/auth/steam/callback?openid.mode=id_res"),
      );

      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain(`${SESSION_COOKIE}=issued-token`);
      expect(setCookie).not.toContain("Secure");
    } finally {
      await built.dispose();
    }
  });
});
