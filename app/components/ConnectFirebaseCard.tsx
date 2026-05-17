import { FormEvent, useState } from "react";
import { Check, Database, Flame, FolderKanban, ShieldCheck } from "lucide-react";

import type { FirestoreDatabase, GoogleProject } from "../lib/firestore-rest";
import { AccessFixLinks } from "./AccessFixLinks";
import { Button } from "./ui/button";

type ConnectFirebaseCardProps = {
  activationUrl?: string;
  collections: string[];
  connected: boolean;
  databases: FirestoreDatabase[];
  error?: string;
  isLoadingDatabases: boolean;
  isDiscovering: boolean;
  isConnecting: boolean;
  lastProjectId?: string;
  onContinue: (
    projectId: string,
    databaseId: string,
    collectionPath: string,
  ) => void;
  onDiscoverCollections: (projectId: string, databaseId: string) => void;
  onLoadDatabases: (projectId: string) => void;
  onSelectProject: (projectId: string, databaseId: string) => void;
  onStartOAuth: () => void;
  projects: GoogleProject[];
};

const inputClass =
  "h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-black outline-none transition focus:border-black";

export function ConnectFirebaseCard({
  activationUrl,
  collections,
  connected,
  databases,
  error,
  isLoadingDatabases,
  isDiscovering,
  isConnecting,
  lastProjectId,
  onContinue,
  onDiscoverCollections,
  onLoadDatabases,
  onSelectProject,
  onStartOAuth,
  projects,
}: ConnectFirebaseCardProps) {
  const [collectionPath, setCollectionPath] = useState("users");
  const [databaseId, setDatabaseId] = useState("(default)");
  const [projectId, setProjectId] = useState("");
  const selectedProjectId = projectId || projects[0]?.projectId || "";
  const selectedDatabaseId = databaseId || databases[0]?.id || "(default)";
  const selectedCollectionPath = collectionPath || collections[0] || "";
  const selectedDatabase = databases.find(
    (database) => database.id === selectedDatabaseId,
  );
  const selectedProject = projects.find(
    (project) => project.projectId === selectedProjectId,
  );

  const chooseProject = (nextProjectId: string) => {
    setProjectId(nextProjectId);
    setDatabaseId("(default)");
    setCollectionPath("");
    onSelectProject(nextProjectId, "(default)");
  };

  const submitConnection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onContinue(selectedProjectId, selectedDatabaseId, selectedCollectionPath);
  };

  const discoverCollections = () => {
    onDiscoverCollections(selectedProjectId, selectedDatabaseId);
  };

  const loadDatabases = () => {
    onLoadDatabases(selectedProjectId);
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div
        className={`mx-auto grid gap-5 ${
          connected ? "lg:grid-cols-[280px_minmax(0,1fr)]" : "max-w-xl"
        }`}
      >
        {connected && (
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-neutral-200 bg-white/85 p-4 shadow-[0_18px_48px_rgba(20,20,20,0.08)] backdrop-blur">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-2xl bg-black text-white">
                  <FolderKanban className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-black">Projects</p>
                  <p className="text-xs text-neutral-500">
                    {projects.length} fetched
                  </p>
                </div>
              </div>

              <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-auto pr-1">
                {projects.length === 0 && (
                  <p className="rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-3 text-sm text-neutral-500">
                    No readable projects found.
                  </p>
                )}
                {projects.map((project) => {
                  const isSelected = project.projectId === selectedProjectId;
                  return (
                    <button
                      className={`w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                        isSelected
                          ? "border-black bg-black text-white"
                          : "border-neutral-200 bg-[#fbfaf7] text-black hover:border-neutral-300 hover:bg-white"
                      }`}
                      key={project.name}
                      onClick={() => chooseProject(project.projectId)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {project.displayName || project.projectId}
                          </p>
                          <p
                            className={`mt-1 truncate text-xs ${
                              isSelected ? "text-white/65" : "text-neutral-500"
                            }`}
                          >
                            {project.projectId}
                          </p>
                        </div>
                        {isSelected && <Check className="mt-0.5 size-4 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button
                className="mt-4 w-full"
                disabled={!selectedProjectId || isLoadingDatabases}
                onClick={loadDatabases}
                variant="secondary"
              >
                {isLoadingDatabases ? "Finding" : "Find databases"}
              </Button>
            </div>
          </aside>
        )}

      <form
        className="mx-auto w-full max-w-xl rounded-2xl border border-neutral-200 bg-white/80 p-6 text-center shadow-[0_18px_48px_rgba(20,20,20,0.08)]"
        onSubmit={submitConnection}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-neutral-200 bg-[#fff8e7]">
          <Flame className="size-6 text-black" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-black">Connect Firebase</h2>

        {!connected ? (
          <Button className="mt-6 w-full" onClick={onStartOAuth}>
            <span className="flex size-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
              G
            </span>
            Continue with Google
          </Button>
        ) : (
          <div className="mt-6 grid gap-3 text-left">
            <div className="rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-3">
              <p className="text-xs font-medium text-neutral-500">
                Selected project
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-black">
                {selectedProject?.displayName || selectedProjectId || "Choose a project"}
              </p>
              {selectedProjectId && (
                <p className="mt-1 truncate text-xs text-neutral-500">
                  {selectedProjectId}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-neutral-500">
                Firestore database
              </label>
              <button
                className="text-xs font-medium text-black underline-offset-4 hover:underline"
                disabled={!selectedProjectId || isLoadingDatabases}
                onClick={loadDatabases}
                type="button"
              >
                {isLoadingDatabases ? "Finding" : "Find databases"}
              </button>
            </div>
            {databases.length > 0 ? (
              <select
                className={inputClass}
                onChange={(event) => {
                  setDatabaseId(event.target.value);
                  setCollectionPath("");
                }}
                required
                value={selectedDatabaseId}
              >
                {databases.map((database) => (
                  <option key={database.name} value={database.id}>
                    {database.id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass}
                onChange={(event) => {
                  setDatabaseId(event.target.value);
                  setCollectionPath("");
                }}
                placeholder="(default)"
                required
                value={databaseId}
              />
            )}
            {selectedDatabase && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-3 text-xs text-neutral-600">
                <span className="font-medium text-black">
                  {selectedDatabase.databaseEdition || "Standard"}
                </span>
                {" · "}
                Firestore API:{" "}
                <span className="font-medium text-black">
                  {selectedDatabase.firestoreDataAccessMode || "unknown"}
                </span>
                {selectedDatabase.mongodbCompatibleDataAccessMode && (
                  <>
                    {" · "}MongoDB API:{" "}
                    <span className="font-medium text-black">
                      {selectedDatabase.mongodbCompatibleDataAccessMode}
                    </span>
                  </>
                )}
              </div>
            )}
            <label className="text-xs font-medium text-neutral-500">
              Firestore collection path
            </label>
            {collections.length > 0 ? (
              <select
                className={inputClass}
                onChange={(event) => setCollectionPath(event.target.value)}
                required
                value={selectedCollectionPath}
              >
                {collections.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass}
                onChange={(event) => setCollectionPath(event.target.value)}
                placeholder="users"
                required
                value={collectionPath}
              />
            )}
            <Button
              className="h-10 w-full"
              disabled={!selectedProjectId || isDiscovering}
              onClick={discoverCollections}
              variant="secondary"
            >
              {isDiscovering ? "Finding collections" : "Find collections"}
            </Button>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
              <Database className="mb-2 size-4 text-black" />
              We fetch real Firestore documents from the selected collection.
            </div>
          </div>
        )}

        {connected && projects.length === 0 && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
            No readable Google Cloud projects found for this account.
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            <p>{error}</p>
            {activationUrl && (
              <a
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
                href={activationUrl}
                rel="noreferrer"
                target="_blank"
              >
                Enable required API
              </a>
            )}
          </div>
        )}

        {error && (
          <AccessFixLinks
            activationUrl={activationUrl}
            projectId={projectId || lastProjectId || projects[0]?.projectId}
          />
        )}

        {connected && (
          <Button
            className="mt-6 w-full"
            disabled={
              isConnecting ||
              projects.length === 0 ||
              !selectedCollectionPath
            }
            type="submit"
          >
            {isConnecting ? "Fetching data" : "Fetch sample data"}
          </Button>
        )}

        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-neutral-500">
          <ShieldCheck className="size-3.5" />
          Read-only access
        </p>
      </form>
      </div>
    </section>
  );
}
