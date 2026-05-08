import { NextResponse } from "next/server";

import { GoogleApiError, listGoogleProjects } from "../../../lib/firestore-rest";
import { getAccessToken } from "../../../lib/google-oauth";

export async function GET() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected to Google." }, { status: 401 });
  }

  try {
    const projects = await listGoogleProjects(accessToken);

    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list projects.";

    if (error instanceof GoogleApiError) {
      return NextResponse.json(
        {
          activationUrl: error.activationUrl,
          code: error.code,
          error: message,
          reason: error.reason,
          status: error.status,
        },
        { status: error.code && error.code >= 400 ? error.code : 500 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
