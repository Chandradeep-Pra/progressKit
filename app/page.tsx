"use client";

import { useEffect, useState } from "react";
import { CollectionAnalysis } from "./components/CollectionAnalysis";
import { ConnectFirebaseCard } from "./components/ConnectFirebaseCard";
import { DataCatalogView } from "./components/DataCatalogView";
import { DataExplorer } from "./components/DataExplorer";
import { GeneratedPreview } from "./components/GeneratedPreview";
import { Hero } from "./components/Hero";
import { MetricCanvas } from "./components/MetricCanvas";
import { MetricSuggestionBoard } from "./components/MetricSuggestionBoard";
import { Navbar } from "./components/Navbar";
import {
  OperationStatus,
  OperationStatusState,
} from "./components/OperationStatus";
import { ScanningSteps } from "./components/ScanningSteps";
import {
  analyzeCollection,
  AiCollectionAnalysisResult,
  buildSelectedCollectionContext,
  CollectionSample,
  SelectedCollectionContext,
} from "./lib/collection-analysis";
import { buildDataCatalog, DataCatalog } from "./lib/data-catalog";
import type { FirestoreDatabase, GoogleProject } from "./lib/firestore-rest";
import type {
  MetricSuggestion,
  MetricSuggestionResult,
} from "./lib/metric-suggestions";
import type { MetricPlan, MetricPlanResult } from "./lib/metric-plans";
import {
  readFirestoreCache,
  writeFirestoreCache,
} from "./lib/temp-storage";

type FlowStage =
  | "landing"
  | "connect"
  | "scanning"
  | "explorer"
  | "analysis"
  | "catalog"
  | "metrics"
  | "generated";

type FirebaseSample = {
  count: number;
  databaseId: string;
  databaseType: "firestore";
  fields: string[];
  path: string;
  projectId: string;
  rows: Record<string, unknown>[];
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function hydrateCachedSample(
  sample: CollectionSample,
  projectId: string,
  databaseId: string,
): FirebaseSample {
  return {
    count: sample.count,
    databaseId,
    databaseType: "firestore",
    fields: sample.fields,
    path: sample.path,
    projectId,
    rows: sample.rows,
  };
}

const sampleDesignContexts: SelectedCollectionContext[] = [
  {
    analysis: {
      confidence: "High",
      description: "Primary user dimension for progress and activity metrics.",
      reasons: ["identity fields found", "time fields found", "progress fields found"],
      score: 92,
      tags: ["Identity", "Progress"],
      title: "users",
    },
    sample: {
      count: 3,
      fields: ["id", "name", "plan", "createdAt", "progressScore", "streak"],
      path: "users",
      rows: [
        {
          createdAt: "2026-05-01T09:00:00Z",
          id: "user_001",
          name: "Ava Shah",
          plan: "Pro",
          progressScore: 84,
          streak: 12,
        },
        {
          createdAt: "2026-05-03T10:30:00Z",
          id: "user_002",
          name: "Noah Lee",
          plan: "Free",
          progressScore: 67,
          streak: 5,
        },
        {
          createdAt: "2026-05-05T13:15:00Z",
          id: "user_003",
          name: "Mia Chen",
          plan: "Team",
          progressScore: 91,
          streak: 18,
        },
      ],
    },
  },
  {
    analysis: {
      confidence: "High",
      description: "Good for completion, cadence, and engagement analytics.",
      reasons: ["3 sampled documents", "progress fields found", "time fields found"],
      score: 88,
      tags: ["Activity", "Progress"],
      title: "lessons",
    },
    sample: {
      count: 3,
      fields: ["id", "userId", "title", "completed", "durationMinutes", "completedAt"],
      path: "lessons",
      rows: [
        {
          completed: true,
          completedAt: "2026-05-08T12:00:00Z",
          durationMinutes: 42,
          id: "lesson_101",
          title: "Foundations",
          userId: "user_001",
        },
        {
          completed: true,
          completedAt: "2026-05-09T15:20:00Z",
          durationMinutes: 36,
          id: "lesson_102",
          title: "Activation",
          userId: "user_003",
        },
        {
          completed: false,
          completedAt: null,
          durationMinutes: 28,
          id: "lesson_103",
          title: "Retention",
          userId: "user_002",
        },
      ],
    },
  },
  {
    analysis: {
      confidence: "Medium",
      description: "Good for payment, revenue, and conversion analytics.",
      reasons: ["money fields found", "identity fields found", "time fields found"],
      score: 76,
      tags: ["Revenue"],
      title: "payments",
    },
    sample: {
      count: 3,
      fields: ["id", "userId", "amount", "status", "paidAt"],
      path: "payments",
      rows: [
        {
          amount: 4900,
          id: "pay_201",
          paidAt: "2026-05-06T08:30:00Z",
          status: "paid",
          userId: "user_001",
        },
        {
          amount: 9900,
          id: "pay_202",
          paidAt: "2026-05-07T11:40:00Z",
          status: "paid",
          userId: "user_003",
        },
        {
          amount: 0,
          id: "pay_203",
          paidAt: null,
          status: "trial",
          userId: "user_002",
        },
      ],
    },
  },
];

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const savedTheme = window.localStorage.getItem("progresskit-theme");
    return savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : "dark";
  });
  const [stage, setStage] = useState<FlowStage>("landing");
  const [activeStep, setActiveStep] = useState(0);
  const [activationUrl, setActivationUrl] = useState<string>();
  const [collections, setCollections] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string>();
  const [databases, setDatabases] = useState<FirestoreDatabase[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshingRelations, setIsRefreshingRelations] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [lastProjectId, setLastProjectId] = useState<string>();
  const [lastDatabaseId, setLastDatabaseId] = useState<string>();
  const [projects, setProjects] = useState<GoogleProject[]>([]);
  const [sample, setSample] = useState<FirebaseSample>();
  const [sampleMap, setSampleMap] = useState<Record<string, CollectionSample>>({});
  const [collectionAnalyses, setCollectionAnalyses] = useState<
    AiCollectionAnalysisResult["analyses"]
  >([]);
  const [analysisProvider, setAnalysisProvider] =
    useState<AiCollectionAnalysisResult["provider"]>("fallback");
  const [operationStatus, setOperationStatus] = useState<OperationStatusState>({
    state: "idle",
    title: "",
  });
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedCollectionContext, setSelectedCollectionContext] = useState<
    SelectedCollectionContext[]
  >([]);
  const [dataCatalog, setDataCatalog] = useState<DataCatalog>();
  const [metricProvider, setMetricProvider] =
    useState<MetricSuggestionResult["provider"]>("fallback");
  const [metricSuggestions, setMetricSuggestions] = useState<MetricSuggestion[]>([]);
  const [isSuggestingMetrics, setIsSuggestingMetrics] = useState(false);
  const [selectedMetricSuggestion, setSelectedMetricSuggestion] =
    useState<MetricSuggestion>();
  const [metricPlans, setMetricPlans] = useState<MetricPlan[]>([]);
  const [metricPlanProvider, setMetricPlanProvider] =
    useState<MetricPlanResult["provider"]>("fallback");
  const [selectedMetricPlan, setSelectedMetricPlan] = useState<MetricPlan>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("oauth_error");
    const connected = params.get("connected") === "1";

    if (oauthError) {
      window.setTimeout(() => {
        setConnectionError(oauthError);
        setStage("connect");
        window.history.replaceState({}, "", "/");
      }, 0);
      return;
    }

    async function loadProjects() {
      setStage("connect");
      setIsGoogleConnected(true);
      setIsConnecting(true);
      setOperationStatus({
        detail: "Checking saved Google session and loading accessible projects.",
        state: "running",
        title: "Loading Firebase projects",
      });
      window.history.replaceState({}, "", "/");

      try {
        const response = await fetch("/api/google/projects");
        const data = (await response.json()) as {
          error?: string;
          projects?: GoogleProject[];
        };

        if (!response.ok) {
          throw new Error(data.error || "Could not load Google projects.");
        }

        setProjects(data.projects ?? []);
        setOperationStatus({
          detail: `${data.projects?.length ?? 0} projects found.`,
          state: "success",
          title: "Projects loaded",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not load Google projects.";

        setConnectionError(message);
        setOperationStatus({
          detail: message,
          state: "error",
          title: "Project loading failed",
        });
      } finally {
        setIsConnecting(false);
      }
    }

    async function resumeSession() {
      if (!connected) {
        const response = await fetch("/api/google/session");
        const data = (await response.json()) as { connected?: boolean };

        if (!data.connected) {
          return;
        }
      }

      loadProjects();
    }

    resumeSession();
  }, []);

  useEffect(() => {
    window.localStorage.setItem("progresskit-theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const startConnect = () => {
    setActiveStep(0);
    setActivationUrl(undefined);
    setCollections([]);
    setConnectionError(undefined);
    setDatabases([]);
    setOperationStatus({ state: "idle", title: "" });
    setStage("connect");
  };

  const startOAuth = () => {
    window.location.href = "/api/google/connect";
  };

  const openRelationMapFromSamples = async (
    projectId: string,
    databaseId: string,
    collectionList: string[],
    startingSampleMap: Record<string, CollectionSample> = {},
  ) => {
    const nextSampleMap = { ...startingSampleMap };
    const missingCollections = collectionList.filter(
      (collection) => !nextSampleMap[collection],
    );

    setLastProjectId(projectId);
    setLastDatabaseId(databaseId);
    setCollections(collectionList);
    setSampleMap(nextSampleMap);
    setIsConnecting(true);
    setOperationStatus({
      detail:
        missingCollections.length > 0
          ? `${missingCollections.length} collections need samples for relation mapping.`
          : "Using cached samples to build relation map.",
      state: "running",
      title: "Preparing relation map",
    });

    try {
      for (const collectionPath of missingCollections) {
        setOperationStatus({
          detail: `Sampling ${collectionPath} for fields and references.`,
          state: "running",
          title: "Reading collection sample",
        });
        const response = await fetch("/api/google/firestore/sample", {
          body: JSON.stringify({ collectionPath, databaseId, projectId }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as {
          activationUrl?: string;
          sample?: FirebaseSample;
        };

        if (response.ok && data.sample) {
          nextSampleMap[data.sample.path] = data.sample;
        }

        if (!response.ok && data.activationUrl) {
          setActivationUrl(data.activationUrl);
        }
      }

      collectionList.forEach((collectionPath) => {
        if (!nextSampleMap[collectionPath]) {
          nextSampleMap[collectionPath] = {
            count: 0,
            fields: [],
            path: collectionPath,
            rows: [],
          };
        }
      });

      const samples = collectionList.map((collectionPath) => nextSampleMap[collectionPath]);
      const analyses = samples.map(analyzeCollection);
      const selected = analyses.map((analysis) => analysis.title);
      const context = buildSelectedCollectionContext(
        analyses,
        nextSampleMap,
        selected,
      );
      const catalog = buildDataCatalog(context);

      setSampleMap(nextSampleMap);
      setCollectionAnalyses(analyses);
      setAnalysisProvider("fallback");
      setSelectedCollections(selected);
      setSelectedCollectionContext(context);
      setDataCatalog(catalog);
      writeFirestoreCache(projectId, databaseId, {
        analysisProvider: "fallback",
        collectionAnalyses: analyses,
        collections: collectionList,
        dataCatalog: catalog,
        sampleMap: nextSampleMap,
        selectedCollectionContext: context,
        selectedCollections: selected,
      });
      setOperationStatus({
        detail: `${context.length} collections mapped into relation canvas.`,
        state: "success",
        title: "Relation map ready",
      });
      setStage("catalog");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not build the relation map.";

      setConnectionError(message);
      setOperationStatus({
        detail: message,
        state: "error",
        title: "Relation map failed",
      });
      setStage("connect");
    } finally {
      setIsConnecting(false);
      setIsDiscovering(false);
    }
  };

  const selectProjectForRelations = async (
    projectId: string,
    databaseId = "(default)",
  ) => {
    setLastProjectId(projectId);
    setLastDatabaseId(databaseId);
    setActivationUrl(undefined);
    setConnectionError(undefined);
    setDatabases([]);

    const cached = readFirestoreCache(projectId, databaseId);

    if (cached?.dataCatalog && cached.selectedCollectionContext?.length) {
      setCollections(cached.collections);
      setSampleMap(cached.sampleMap);
      setCollectionAnalyses(cached.collectionAnalyses ?? []);
      setAnalysisProvider(cached.analysisProvider || "fallback");
      setSelectedCollections(cached.selectedCollections ?? []);
      setSelectedCollectionContext(cached.selectedCollectionContext);
      setDataCatalog(cached.dataCatalog);
      setOperationStatus({
        detail: `${cached.collections.length} cached collections opened in the relation canvas.`,
        state: "success",
        title: "Relation map restored",
      });
      setStage("catalog");
      return;
    }

    if (cached?.collections.length) {
      await openRelationMapFromSamples(
        projectId,
        databaseId,
        cached.collections,
        cached.sampleMap,
      );
      return;
    }

    await discoverCollections(projectId, databaseId);
  };

  const discoverCollections = async (projectId: string, databaseId: string) => {
    setLastProjectId(projectId);
    setLastDatabaseId(databaseId);
    setActivationUrl(undefined);
    setConnectionError(undefined);
    setCollections([]);
    setIsDiscovering(true);
    setOperationStatus({
      detail: `Project ${projectId}, database ${databaseId}.`,
      state: "running",
      title: "Reading Firestore collections",
    });

    try {
      const cached = readFirestoreCache(projectId, databaseId);

      if (cached?.collections.length) {
        await openRelationMapFromSamples(
          projectId,
          databaseId,
          cached.collections,
          cached.sampleMap,
        );
        return;
      }

      const response = await fetch("/api/google/firestore/collections", {
        body: JSON.stringify({ databaseId, projectId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as {
        activationUrl?: string;
        collections?: string[];
        error?: string;
      };

      if (!response.ok) {
        setActivationUrl(data.activationUrl);
        throw new Error(data.error || "Could not find Firestore collections.");
      }

      setCollections(data.collections ?? []);
      writeFirestoreCache(projectId, databaseId, {
        collections: data.collections ?? [],
      });
      setOperationStatus({
        detail: `${data.collections?.length ?? 0} root collections found.`,
        state: "success",
        title: "Collections found",
      });

      if ((data.collections ?? []).length === 0) {
        setConnectionError("No root collections found for this Firestore database.");
        return;
      }

      await openRelationMapFromSamples(
        projectId,
        databaseId,
        data.collections ?? [],
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not find Firestore collections.";

      setConnectionError(message);
      setOperationStatus({
        detail: message,
        state: "error",
        title: "Collection discovery failed",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const refreshRelationCollections = async () => {
    const projectId = lastProjectId || sample?.projectId;
    const databaseId = lastDatabaseId || sample?.databaseId || "(default)";

    if (!projectId) {
      setOperationStatus({
        detail: "Choose a Firebase project before refreshing collections.",
        state: "error",
        title: "No project selected",
      });
      return;
    }

    setIsRefreshingRelations(true);
    setActivationUrl(undefined);
    setConnectionError(undefined);
    setOperationStatus({
      detail: `Refreshing collections from ${projectId}/${databaseId}.`,
      state: "running",
      title: "Refreshing relation canvas",
    });

    try {
      const response = await fetch("/api/google/firestore/collections", {
        body: JSON.stringify({ databaseId, projectId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as {
        activationUrl?: string;
        collections?: string[];
        error?: string;
      };

      if (!response.ok) {
        setActivationUrl(data.activationUrl);
        throw new Error(data.error || "Could not refresh Firestore collections.");
      }

      const nextCollections = data.collections ?? [];
      setCollections(nextCollections);
      writeFirestoreCache(projectId, databaseId, {
        collections: nextCollections,
        sampleMap: {},
      });
      await openRelationMapFromSamples(projectId, databaseId, nextCollections, {});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not refresh Firestore collections.";

      setConnectionError(message);
      setOperationStatus({
        detail: message,
        state: "error",
        title: "Refresh failed",
      });
    } finally {
      setIsRefreshingRelations(false);
    }
  };

  const loadDatabases = async (projectId: string) => {
    setLastProjectId(projectId);
    setActivationUrl(undefined);
    setConnectionError(undefined);
    setCollections([]);
    setDatabases([]);
    setIsLoadingDatabases(true);
    setOperationStatus({
      detail: `Project ${projectId}.`,
      state: "running",
      title: "Finding Firestore databases",
    });

    try {
      const response = await fetch("/api/google/firestore/databases", {
        body: JSON.stringify({ projectId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as {
        activationUrl?: string;
        databases?: FirestoreDatabase[];
        error?: string;
      };

      if (!response.ok) {
        setActivationUrl(data.activationUrl);
        throw new Error(data.error || "Could not find Firestore databases.");
      }

      setDatabases(data.databases ?? []);
      setOperationStatus({
        detail: `${data.databases?.length ?? 0} databases found.`,
        state: "success",
        title: "Databases found",
      });

      if ((data.databases ?? []).length === 0) {
        setConnectionError("No Firestore databases found for this project.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not find Firestore databases.";

      setConnectionError(message);
      setOperationStatus({
        detail: message,
        state: "error",
        title: "Database discovery failed",
      });
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  const startScan = async (
    projectId: string,
    databaseId: string,
    collectionPath: string,
    showScanning = true,
  ) => {
    setLastProjectId(projectId);
    setLastDatabaseId(databaseId);
    setConnectionError(undefined);
    setActivationUrl(undefined);
    setIsConnecting(true);
    setActiveStep(0);
    setStage(showScanning ? "scanning" : "explorer");
    setOperationStatus({
      detail: `Reading ${collectionPath} from ${databaseId}.`,
      state: "running",
      title: "Sampling Firestore data",
    });

    try {
      const cachedSample =
        readFirestoreCache(projectId, databaseId)?.sampleMap[collectionPath];

      if (cachedSample) {
        const nextSample = hydrateCachedSample(cachedSample, projectId, databaseId);
        setSample(nextSample);
        setSampleMap((current) => ({
          ...current,
          [nextSample.path]: nextSample,
        }));
        setOperationStatus({
          detail: `${nextSample.path} sample restored from this browser.`,
          state: "success",
          title: "Sample loaded from cache",
        });
        setStage("explorer");
        return;
      }

      if (showScanning) {
        await wait(650);
        setActiveStep(1);
        await wait(650);
        setActiveStep(2);
      }

      const response = await fetch("/api/google/firestore/sample", {
        body: JSON.stringify({ collectionPath, databaseId, projectId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as {
        activationUrl?: string;
        error?: string;
        sample?: FirebaseSample;
      };

      if (!response.ok || !data.sample) {
        setActivationUrl(data.activationUrl);
        throw new Error(data.error || "Could not fetch Firestore sample.");
      }

      const nextSample = data.sample;
      setSample(nextSample);
      setSampleMap((current) => ({
        ...current,
        [nextSample.path]: nextSample,
      }));
      writeFirestoreCache(projectId, databaseId, {
        collections,
        sampleMap: {
          [nextSample.path]: nextSample,
        },
      });
      setOperationStatus({
        detail: `${nextSample.count} documents sampled from ${nextSample.path}.`,
        state: "success",
        title: "Sample data loaded",
      });

      if (showScanning) {
        setActiveStep(3);
        await wait(750);
      }

      setStage("explorer");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not connect to this Firebase project.";

      setConnectionError(message);
      setOperationStatus({
        detail: message,
        state: "error",
        title: "Firestore sampling failed",
      });
      setStage("connect");
    } finally {
      setIsConnecting(false);
    }
  };

  const showDemo = () => {
    const catalog = buildDataCatalog(sampleDesignContexts);

    setSelectedCollectionContext(sampleDesignContexts);
    setDataCatalog(catalog);
    setOperationStatus({
      detail: "Sample users, lessons, and payments loaded for visual canvas design.",
      state: "success",
      title: "Sample canvas ready",
    });
    setStage("catalog");
  };

  const analyzeCollections = async () => {
    if (!sample) {
      return;
    }

    const projectId = sample.projectId || lastProjectId || "";
    const databaseId = sample.databaseId || lastDatabaseId || "(default)";
    const nextSampleMap = { ...sampleMap };
    const missingCollections = collections.filter(
      (collection) => !nextSampleMap[collection],
    );
    const cachedAnalysis = readFirestoreCache(projectId, databaseId);

    if (
      cachedAnalysis?.collectionAnalyses?.length &&
      collections.every((collection) => cachedAnalysis.sampleMap[collection])
    ) {
      setSampleMap(cachedAnalysis.sampleMap);
      setCollectionAnalyses(cachedAnalysis.collectionAnalyses);
      setAnalysisProvider(cachedAnalysis.analysisProvider || "fallback");
      setSelectedCollections(cachedAnalysis.selectedCollections ?? []);
      setSelectedCollectionContext(cachedAnalysis.selectedCollectionContext ?? []);
      setDataCatalog(cachedAnalysis.dataCatalog);
      setOperationStatus({
        detail: "Collection scoring and catalog restored from temporary storage.",
        state: "success",
        title: "Analysis loaded from cache",
      });
      setStage("analysis");
      return;
    }

    setIsAnalyzing(true);
    setIsConnecting(true);
    setOperationStatus({
      detail: `${missingCollections.length} collections need samples before Gemini analysis.`,
      state: "running",
      title: "Preparing collection analysis",
    });

    try {
      for (const collectionPath of missingCollections) {
        setOperationStatus({
          detail: `Reading ${collectionPath}.`,
          state: "running",
          title: "Sampling remaining collections",
        });
        const response = await fetch("/api/google/firestore/sample", {
          body: JSON.stringify({ collectionPath, databaseId, projectId }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as {
          sample?: FirebaseSample;
        };

        if (response.ok && data.sample) {
          nextSampleMap[data.sample.path] = data.sample;
        }
      }
      setSampleMap(nextSampleMap);
      writeFirestoreCache(projectId, databaseId, {
        collections,
        sampleMap: nextSampleMap,
      });
      setOperationStatus({
        detail: "Sending sanitized schema and small samples to Gemini.",
        state: "running",
        title: "Gemini is scoring collections",
      });
      const response = await fetch("/api/ai/analyze-collections", {
        body: JSON.stringify({ samples: Object.values(nextSampleMap) }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as AiCollectionAnalysisResult;
      const analyses =
        result.analyses?.length > 0
          ? result.analyses
          : Object.values(nextSampleMap).map(analyzeCollection);
      const selected = analyses
        .filter((analysis) => analysis.score >= 45)
        .map((analysis) => analysis.title);

      setCollectionAnalyses(analyses);
      setAnalysisProvider(result.provider || "fallback");
      writeFirestoreCache(projectId, databaseId, {
        analysisProvider: result.provider || "fallback",
        collectionAnalyses: analyses,
        collections,
        sampleMap: nextSampleMap,
        selectedCollections: selected,
      });
      setOperationStatus({
        detail:
          result.provider === "gemini"
            ? "Gemini completed collection scoring."
          : "Gemini unavailable, fallback scoring used.",
        state: "success",
        title: "Collection analysis complete",
      });
      setSelectedCollections(selected);
      setStage("analysis");
    } catch {
      const analyses = Object.values(nextSampleMap).map(analyzeCollection);
      const selected = analyses
        .filter((analysis) => analysis.score >= 45)
        .map((analysis) => analysis.title);

      setSampleMap(nextSampleMap);
      setCollectionAnalyses(analyses);
      setAnalysisProvider("fallback");
      writeFirestoreCache(projectId, databaseId, {
        analysisProvider: "fallback",
        collectionAnalyses: analyses,
        collections,
        sampleMap: nextSampleMap,
        selectedCollections: selected,
      });
      setOperationStatus({
        detail: "AI analysis failed, fallback scoring used.",
        state: "error",
        title: "Gemini analysis failed",
      });
      setSelectedCollections(selected);
      setStage("analysis");
    } finally {
      setIsConnecting(false);
      setIsAnalyzing(false);
    }
  };

  const suggestMetrics = async (
    context: SelectedCollectionContext[],
    customPrompt = "",
    catalog = dataCatalog,
  ) => {
    setIsSuggestingMetrics(true);
    setOperationStatus({
      detail: customPrompt
        ? "Gemini is mapping your custom metric to selected collections."
        : "Gemini is exploring metric combinations from selected collections.",
      state: "running",
      title: "Generating metric suggestions",
    });

    try {
      const response = await fetch("/api/ai/suggest-metrics", {
        body: JSON.stringify({ catalog, contexts: context, customPrompt }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as MetricSuggestionResult;

      setMetricProvider(result.provider || "fallback");
      setMetricSuggestions((current) => {
        if (!customPrompt) {
          return result.suggestions ?? [];
        }

        const customSuggestions = result.suggestions ?? [];
        return [...customSuggestions, ...current].filter(
          (suggestion, index, list) =>
            list.findIndex((item) => item.title === suggestion.title) === index,
        );
      });
      if (customPrompt && result.suggestions?.[0]) {
        setSelectedMetricSuggestion(result.suggestions[0]);
      }
      setOperationStatus({
        detail:
          result.provider === "gemini"
            ? `${result.suggestions?.length ?? 0} Gemini suggestions created.`
            : "Fallback metric suggestions created.",
        state: "success",
        title: "Metric suggestions ready",
      });
    } catch {
      setMetricProvider("fallback");
      setOperationStatus({
        detail: "Metric suggestion failed.",
        state: "error",
        title: "Gemini metric generation failed",
      });
    } finally {
      setIsSuggestingMetrics(false);
    }
  };

  const planMetrics = async (
    context: SelectedCollectionContext[],
    customPrompt = "",
    catalog = dataCatalog,
  ) => {
    setIsSuggestingMetrics(true);
    setOperationStatus({
      detail: customPrompt
        ? "Gemini is turning your custom ask into an executable metric plan."
        : "Gemini is creating executable metric plans from the data catalog.",
      state: "running",
      title: "Planning metrics",
    });

    try {
      const response = await fetch("/api/ai/plan-metrics", {
        body: JSON.stringify({ catalog, contexts: context, customPrompt }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as MetricPlanResult;
      setMetricPlanProvider(result.provider || "fallback");
      setMetricPlans((current) => {
        if (!customPrompt) return result.plans ?? [];
        return [...(result.plans ?? []), ...current].filter(
          (plan, index, list) =>
            list.findIndex((item) => item.title === plan.title) === index,
        );
      });
      if (customPrompt && result.plans?.[0]) {
        setSelectedMetricPlan(result.plans[0]);
      }
      setOperationStatus({
        detail:
          result.provider === "gemini"
            ? `${result.plans?.length ?? 0} executable metric plans created.`
            : "Fallback metric plans created.",
        state: "success",
        title: "Metric plans ready",
      });
    } catch {
      setMetricPlanProvider("fallback");
      setOperationStatus({
        detail: "Metric planning failed.",
        state: "error",
        title: "Gemini metric planning failed",
      });
    } finally {
      setIsSuggestingMetrics(false);
    }
  };

  const proceedToMetrics = () => {
    const context = buildSelectedCollectionContext(
      collectionAnalyses,
      sampleMap,
      selectedCollections,
    );
    const catalog = buildDataCatalog(context);
    const projectId = sample?.projectId || lastProjectId;
    const databaseId = sample?.databaseId || lastDatabaseId || "(default)";

    setSelectedCollectionContext(context);
    setOperationStatus({
      detail: `${context.length} scored collections mapped into catalog.`,
      state: "success",
      title: "Data catalog created",
    });
    setDataCatalog(catalog);
    if (projectId) {
      writeFirestoreCache(projectId, databaseId, {
        collectionAnalyses,
        collections,
        dataCatalog: catalog,
        sampleMap,
        selectedCollectionContext: context,
        selectedCollections,
      });
    }
    setStage("catalog");
  };

  const proceedFromCatalog = () => {
    setStage("metrics");
    planMetrics(selectedCollectionContext, "", dataCatalog);
  };

  return (
    <main
      className={`theme-${theme} min-h-screen overflow-hidden bg-[#f7f4ee] text-black`}
    >
      <Navbar
        theme={theme}
        onToggleTheme={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
      />
      <OperationStatus status={operationStatus} />

      {stage === "landing" && (
        <Hero onConnect={startConnect} onDemo={showDemo} />
      )}

      {stage === "connect" && (
        <ConnectFirebaseCard
          activationUrl={activationUrl}
          collections={collections}
          connected={isGoogleConnected}
          databases={databases}
          error={connectionError}
          isDiscovering={isDiscovering}
          isLoadingDatabases={isLoadingDatabases}
          isConnecting={isConnecting}
          lastProjectId={lastProjectId}
          onContinue={startScan}
          onDiscoverCollections={discoverCollections}
          onLoadDatabases={loadDatabases}
          onSelectProject={selectProjectForRelations}
          onStartOAuth={startOAuth}
          projects={projects}
        />
      )}

      {stage === "scanning" && <ScanningSteps activeStep={activeStep} />}

      {stage === "explorer" && sample && (
        <DataExplorer
          collections={collections}
          sample={sample}
          onContinue={analyzeCollections}
          onSelectCollection={(collectionPath) =>
            startScan(
              sample.projectId || lastProjectId || "",
              sample.databaseId || lastDatabaseId || "(default)",
              collectionPath,
              false,
            )
          }
        />
      )}

      {stage === "analysis" && (
        <CollectionAnalysis
          analyses={collectionAnalyses}
          isAnalyzing={isAnalyzing}
          provider={analysisProvider}
          selectedCollections={selectedCollections}
          onProceed={proceedToMetrics}
          onToggle={(collection) =>
            setSelectedCollections((current) =>
              current.includes(collection)
                ? current.filter((item) => item !== collection)
                : [...current, collection],
            )
          }
        />
      )}

      {stage === "catalog" && dataCatalog && (
        <DataCatalogView
          catalog={dataCatalog}
          contexts={selectedCollectionContext}
          initialTab="relationships"
          isRefreshing={isRefreshingRelations}
          onProceed={proceedFromCatalog}
          onRefresh={refreshRelationCollections}
          onToggleTheme={() =>
            setTheme((current) => (current === "dark" ? "light" : "dark"))
          }
          theme={theme}
        />
      )}

      {stage === "metrics" && (
        <MetricCanvas
          isLoading={isSuggestingMetrics}
          plans={metricPlans}
          provider={metricPlanProvider}
          selectedPlan={selectedMetricPlan}
          onAddCustom={(prompt) => planMetrics(selectedCollectionContext, prompt)}
          onBack={() => setStage(dataCatalog ? "catalog" : "analysis")}
          onSelectPlan={setSelectedMetricPlan}
        />
      )}

      {false && stage === "metrics" && (
        <MetricSuggestionBoard
          contexts={selectedCollectionContext}
          isLoading={isSuggestingMetrics}
          provider={metricProvider}
          selectedSuggestion={selectedMetricSuggestion}
          suggestions={metricSuggestions}
          onAddCustom={(prompt) => suggestMetrics(selectedCollectionContext, prompt)}
          onSelect={setSelectedMetricSuggestion}
        />
      )}

      {stage === "generated" && (
        <GeneratedPreview metricTitle={selectedMetricSuggestion?.title || "Metric"} />
      )}
    </main>
  );
}
