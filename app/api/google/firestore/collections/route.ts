import { NextRequest, NextResponse } from "next/server";

import {
  GoogleApiError,
  listFirestoreCollections,
} from "../../../../lib/firestore-rest";
import { getAccessToken } from "../../../../lib/google-oauth";

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected to Google." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      databaseId?: string;
      parentPath?: string;
      projectId?: string;
    };

    if (!body.projectId) {
      return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
    }

    const collections = await listFirestoreCollections(
      accessToken,
      body.projectId,
      body.databaseId || "(default)",
      body.parentPath || "",
    );

    return NextResponse.json({ collections });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not list Firestore collections.";

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
