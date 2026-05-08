type FirestoreValue = {
  arrayValue?: { values?: FirestoreValue[] };
  booleanValue?: boolean;
  doubleValue?: number;
  integerValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  nullValue?: null;
  stringValue?: string;
  timestampValue?: string;
};

type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
  name: string;
};

export type GoogleProject = {
  displayName?: string;
  name: string;
  projectId: string;
};

type FirebaseProject = {
  displayName?: string;
  name: string;
  projectId: string;
};

export type FirestoreDatabase = {
  databaseEdition?: string;
  firestoreDataAccessMode?: string;
  id: string;
  locationId?: string;
  mongodbCompatibleDataAccessMode?: string;
  name: string;
  type?: string;
};

export class GoogleApiError extends Error {
  activationUrl?: string;
  code?: number;
  reason?: string;
  status?: string;

  constructor(
    message: string,
    metadata: {
      activationUrl?: string;
      code?: number;
      reason?: string;
      status?: string;
    } = {},
  ) {
    super(message);
    this.name = "GoogleApiError";
    this.activationUrl = metadata.activationUrl;
    this.code = metadata.code;
    this.reason = metadata.reason;
    this.status = metadata.status;
  }
}

type GoogleErrorResponse = {
  error?: {
    code?: number;
    details?: Array<{
      "@type"?: string;
      domain?: string;
      metadata?: {
        activationUrl?: string;
        service?: string;
        serviceTitle?: string;
      };
      reason?: string;
    }>;
    message?: string;
    status?: string;
  };
};

async function throwGoogleApiError(response: Response) {
  const text = await response.text();

  try {
    const data = JSON.parse(text) as GoogleErrorResponse;
    const error = data.error;
    const serviceDisabled = error?.details?.find(
      (detail) => detail.reason === "SERVICE_DISABLED",
    );

    throw new GoogleApiError(error?.message || text, {
      activationUrl: serviceDisabled?.metadata?.activationUrl,
      code: error?.code,
      reason: serviceDisabled?.reason,
      status: error?.status,
    });
  } catch (error) {
    if (error instanceof GoogleApiError) {
      throw error;
    }

    throw new GoogleApiError(text || "Google API request failed.", {
      code: response.status,
      status: response.statusText,
    });
  }
}

function parseFirestoreValue(value: FirestoreValue): unknown {
  if ("stringValue" in value) {
    return value.stringValue;
  }

  if ("integerValue" in value) {
    return Number(value.integerValue);
  }

  if ("doubleValue" in value) {
    return value.doubleValue;
  }

  if ("booleanValue" in value) {
    return value.booleanValue;
  }

  if ("timestampValue" in value) {
    return value.timestampValue;
  }

  if ("nullValue" in value) {
    return null;
  }

  if (value.arrayValue) {
    return (value.arrayValue.values ?? []).map(parseFirestoreValue);
  }

  if (value.mapValue) {
    return parseFirestoreFields(value.mapValue.fields ?? {});
  }

  return undefined;
}

function parseFirestoreFields(fields: Record<string, FirestoreValue>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, parseFirestoreValue(value)]),
  );
}

function parseDocument(document: FirestoreDocument) {
  const id = document.name.split("/").at(-1) ?? document.name;

  return {
    id,
    ...parseFirestoreFields(document.fields ?? {}),
  };
}

async function listFirebaseProjects(accessToken: string) {
  const response = await fetch("https://firebase.googleapis.com/v1beta1/projects?pageSize=100", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    await throwGoogleApiError(response);
  }

  const data = (await response.json()) as { results?: FirebaseProject[] };

  return (data.results ?? []).map((project) => ({
    displayName: project.displayName,
    name: project.name,
    projectId: project.projectId,
  }));
}

async function listCloudProjects(accessToken: string) {
  const response = await fetch(
    "https://cloudresourcemanager.googleapis.com/v3/projects:search?pageSize=30",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    await throwGoogleApiError(response);
  }

  const data = (await response.json()) as { projects?: GoogleProject[] };

  return data.projects ?? [];
}

export async function listGoogleProjects(accessToken: string) {
  try {
    return await listFirebaseProjects(accessToken);
  } catch {
    return listCloudProjects(accessToken);
  }
}

export async function listFirestoreCollections(
  accessToken: string,
  projectId: string,
  databaseId: string,
  parentPath = "",
) {
  const cleanDatabaseId = databaseId.trim() || "(default)";
  const cleanParentPath = parentPath.trim().replace(/^\/|\/$/g, "");
  const parent = cleanParentPath
    ? `projects/${projectId}/databases/${cleanDatabaseId}/documents/${cleanParentPath}`
    : `projects/${projectId}/databases/${cleanDatabaseId}/documents`;

  const response = await fetch(
    `https://firestore.googleapis.com/v1/${parent}:listCollectionIds`,
    {
      body: JSON.stringify({ pageSize: 100 }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    await throwGoogleApiError(response);
  }

  const data = (await response.json()) as { collectionIds?: string[] };

  return data.collectionIds ?? [];
}

export async function listFirestoreDatabases(accessToken: string, projectId: string) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    await throwGoogleApiError(response);
  }

  const data = (await response.json()) as {
    databases?: Array<Omit<FirestoreDatabase, "id">>;
  };

  return (data.databases ?? []).map((database) => ({
    ...database,
    id: database.name.split("/").at(-1) ?? "(default)",
  }));
}

export async function sampleFirestoreCollection(
  accessToken: string,
  projectId: string,
  databaseId: string,
  collectionPath: string,
) {
  const cleanDatabaseId = databaseId.trim() || "(default)";
  const cleanPath = collectionPath.trim().replace(/^\/|\/$/g, "");
  const pathSegments = cleanPath.split("/").filter(Boolean);

  if (!cleanPath || pathSegments.length % 2 === 0) {
    throw new Error("Enter a Firestore collection path, like users or companies/acme/events.");
  }

  const collectionId = pathSegments.at(-1);
  const parentPath = pathSegments.slice(0, -1).join("/");
  const parent = parentPath
    ? `projects/${projectId}/databases/${cleanDatabaseId}/documents/${parentPath}`
    : `projects/${projectId}/databases/${cleanDatabaseId}/documents`;

  const url = `https://firestore.googleapis.com/v1/${parent}/${collectionId}?pageSize=20`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    await throwGoogleApiError(response);
  }

  const data = (await response.json()) as { documents?: FirestoreDocument[] };
  const rows = (data.documents ?? []).map(parseDocument);
  const fields = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 12);

  return {
    count: rows.length,
    databaseId: cleanDatabaseId,
    databaseType: "firestore" as const,
    fields,
    path: cleanPath,
    projectId,
    rows,
  };
}
