import type {
  AiCollectionAnalysisResult,
  CollectionAnalysis,
  CollectionSample,
  SelectedCollectionContext,
} from "./collection-analysis";
import type { DataCatalog } from "./data-catalog";

export type CachedFirestoreDb = {
  analysisProvider?: AiCollectionAnalysisResult["provider"];
  collectionAnalyses?: CollectionAnalysis[];
  collections: string[];
  dataCatalog?: DataCatalog;
  sampleMap: Record<string, CollectionSample>;
  savedAt: number;
  selectedCollectionContext?: SelectedCollectionContext[];
  selectedCollections?: string[];
  version: 1;
};

function firestoreCacheKey(projectId: string, databaseId: string) {
  return `progresskit:firestore:${projectId}:${databaseId}:v1`;
}

export function readFirestoreCache(projectId: string, databaseId: string) {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem(firestoreCacheKey(projectId, databaseId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedFirestoreDb;
    return parsed.version === 1 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function writeFirestoreCache(
  projectId: string,
  databaseId: string,
  patch: Partial<Omit<CachedFirestoreDb, "savedAt" | "version">>,
) {
  if (typeof window === "undefined") return;

  try {
    const current = readFirestoreCache(projectId, databaseId);
    const next: CachedFirestoreDb = {
      analysisProvider: patch.analysisProvider ?? current?.analysisProvider,
      collectionAnalyses: patch.collectionAnalyses ?? current?.collectionAnalyses,
      collections: patch.collections ?? current?.collections ?? [],
      dataCatalog: patch.dataCatalog ?? current?.dataCatalog,
      sampleMap: {
        ...(current?.sampleMap ?? {}),
        ...(patch.sampleMap ?? {}),
      },
      savedAt: Date.now(),
      selectedCollectionContext:
        patch.selectedCollectionContext ?? current?.selectedCollectionContext,
      selectedCollections: patch.selectedCollections ?? current?.selectedCollections,
      version: 1,
    };

    window.localStorage.setItem(
      firestoreCacheKey(projectId, databaseId),
      JSON.stringify(next),
    );
  } catch {
    // Temporary browser storage can be unavailable or full. Live fetch remains the fallback.
  }
}
