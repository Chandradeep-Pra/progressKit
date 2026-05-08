import { NextResponse } from "next/server";

import { getAccessToken } from "../../../lib/google-oauth";

export async function GET() {
  const accessToken = await getAccessToken();

  return NextResponse.json({ connected: Boolean(accessToken) });
}
