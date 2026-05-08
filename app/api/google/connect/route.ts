import { NextResponse } from "next/server";

import {
  getGoogleOAuthConfig,
  googleScopes,
  setOAuthStateCookie,
} from "../../../lib/google-oauth";

export async function GET() {
  try {
    const { clientId, redirectUri } = getGoogleOAuthConfig();
    const state = crypto.randomUUID();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", googleScopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    await setOAuthStateCookie(state);

    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth is not configured.";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    return NextResponse.redirect(
      new URL(`/?oauth_error=${encodeURIComponent(message)}`, appUrl),
    );
  }
}
