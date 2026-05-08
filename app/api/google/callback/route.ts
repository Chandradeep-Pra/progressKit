import { NextRequest, NextResponse } from "next/server";

import {
  consumeOAuthStateCookie,
  getGoogleOAuthConfig,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../../../lib/google-oauth";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirect = new URL("/", appUrl);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = await consumeOAuthStateCookie();

  if (!code || !state || state !== savedState) {
    redirect.searchParams.set("oauth_error", "Google OAuth state check failed.");
    return NextResponse.redirect(redirect);
  }

  try {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const token = (await response.json()) as {
      access_token: string;
      expires_in?: number;
      refresh_token?: string;
    };

    await setAccessTokenCookie(token.access_token, token.expires_in);

    if (token.refresh_token) {
      await setRefreshTokenCookie(token.refresh_token);
    }

    redirect.searchParams.set("connected", "1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finish Google OAuth.";
    redirect.searchParams.set("oauth_error", message);
  }

  return NextResponse.redirect(redirect);
}
