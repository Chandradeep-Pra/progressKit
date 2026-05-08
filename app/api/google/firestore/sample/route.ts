import { NextRequest, NextResponse } from "next/server";

import {
  GoogleApiError,
  sampleFirestoreCollection,
} from "../../../../lib/firestore-rest";
import { getAccessToken } from "../../../../lib/google-oauth";

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected to Google." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      collectionPath?: string;
      databaseId?: string;
      projectId?: string;
    };

    if (!body.projectId || !body.collectionPath) {
      return NextResponse.json(
        { error: "Project ID and collection path are required." },
        { status: 400 },
      );
    }

    const sample = await sampleFirestoreCollection(
      accessToken,
      body.projectId,
      body.databaseId || "(default)",
      body.collectionPath,
    );

    return NextResponse.json({ sample });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sample Firestore.";

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
