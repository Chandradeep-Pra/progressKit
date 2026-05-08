import { cookies } from "next/headers";

const tokenCookie = "progresskit_google_access_token";
const refreshTokenCookie = "progresskit_google_refresh_token";
const oauthStateCookie = "progresskit_google_oauth_state";

export const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/firebase.readonly",
  "https://www.googleapis.com/auth/cloud-platform.read-only",
  "https://www.googleapis.com/auth/datastore",
];

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export async function setOAuthStateCookie(state: string) {
  const cookieStore = await cookies();

  cookieStore.set(oauthStateCookie, state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function consumeOAuthStateCookie() {
  const cookieStore = await cookies();
  const state = cookieStore.get(oauthStateCookie)?.value;

  cookieStore.delete(oauthStateCookie);

  return state;
}

export async function setAccessTokenCookie(accessToken: string, expiresIn = 3600) {
  const cookieStore = await cookies();

  cookieStore.set(tokenCookie, accessToken, {
    httpOnly: true,
    maxAge: Math.max(expiresIn - 60, 60),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function setRefreshTokenCookie(refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set(refreshTokenCookie, refreshToken, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

async function getRefreshToken() {
  const cookieStore = await cookies();

  return cookieStore.get(refreshTokenCookie)?.value;
}

async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    return undefined;
  }

  const token = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!token.access_token) {
    return undefined;
  }

  await setAccessTokenCookie(token.access_token, token.expires_in);

  return token.access_token;
}

export async function getAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(tokenCookie)?.value;

  if (accessToken) {
    return accessToken;
  }

  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return undefined;
  }

  return refreshAccessToken(refreshToken);
}
