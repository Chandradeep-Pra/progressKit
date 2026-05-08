"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import {
  ArrowRight,
  Bot,
  Boxes,
  Database,
  GitBranch,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  TableProperties,
} from "lucide-react";

import type { SelectedCollectionContext } from "../lib/collection-analysis";
import type {
  DataCatalog,
  EntityProfile,
  RelationshipCandidate,
} from "../lib/data-catalog";
import { Button } from "./ui/button";

type DataCatalogViewProps = {
  catalog: DataCatalog;
  contexts: SelectedCollectionContext[];
  onProceed: () => void;
};

type CanvasTab = "map" | "relationships" | "entities" | "ingredients";
type DbChat = {
  answer: string;
  command: {
    collections: string[];
    fields: string[];
    filters: string[];
    intent: string;
    limit: number;
  };
  evidence: string[];
  provider: "fallback" | "gemini";
};
type DbNodeData = {
  activeTab: CanvasTab;
  chat?: DbChat;
  entity: EntityProfile;
  isAsking: boolean;
  isOpen: boolean;
  message: string;
  relationship?: RelationshipCandidate;
  onAsk: (collection: string) => void;
  onMessage: (collection: string, value: string) => void;
  onSelect: (collection: string) => void;
};

const tabs: Array<{ icon: typeof Database; id: CanvasTab; label: string }> = [
  { icon: Boxes, id: "map", label: "Map" },
  { icon: GitBranch, id: "relationships", label: "Relations" },
  { icon: Database, id: "entities", label: "Collections" },
  { icon: TableProperties, id: "ingredients", label: "Fields" },
];

const nodePositions = [
  { x: 640, y: 90 },
  { x: 930, y: 260 },
  { x: 790, y: 590 },
  { x: 430, y: 610 },
  { x: 250, y: 280 },
  { x: 1120, y: 610 },
  { x: 220, y: 690 },
  { x: 420, y: 120 },
  { x: 1110, y: 100 },
  { x: 630, y: 360 },
];

function collectionLabel(path: string) {
  return path.split("/").at(-1) || path;
}

function scoreTone(score: number) {
  if (score >= 75) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (score >= 45) return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-neutral-100 text-neutral-600 ring-neutral-200";
}

function metricSeeds(catalog: DataCatalog) {
  const seeds = [
    ...catalog.measures.slice(0, 4).map((item) => ({
      detail: item.field,
      title: `${collectionLabel(item.collection)} trend`,
    })),
    ...catalog.timestamps.slice(0, 3).map((item) => ({
      detail: item.field,
      title: `${collectionLabel(item.collection)} velocity`,
    })),
    ...catalog.relationships.slice(0, 4).map((item) => ({
      detail: `${collectionLabel(item.fromCollection)} to ${collectionLabel(item.toCollection)}`,
      title: "Relationship metric",
    })),
  ];

  return seeds.length > 0
    ? seeds
    : [{ detail: "Use sampled rows", title: "Collection health" }];
}

function relationshipKey(relationship: RelationshipCandidate) {
  return `${relationship.fromCollection}-${relationship.fromField}-${relationship.toCollection}-${relationship.toField}`;
}

function fallbackRelationships(entities: EntityProfile[]) {
  return entities.slice(1).map((entity) => ({
    confidence: 0.2,
    fromCollection: entities[0]?.collection || entity.collection,
    fromField: "sampled schema",
    reason: "Shown as a canvas grouping until stronger joins are detected.",
    toCollection: entity.collection,
    toField: "collection",
  }));
}

function relationshipForNode(
  entity: EntityProfile,
  relationships: RelationshipCandidate[],
) {
  return relationships.find(
    (relationship) =>
      relationship.fromCollection === entity.collection ||
      relationship.toCollection === entity.collection,
  );
}

function DbCollectionNode({ data }: NodeProps<Node<DbNodeData, "dbCollection">>) {
  const entity = data.entity;
  const measures = entity.fields.filter((field) => field.roles.includes("measure"));
  const timestamps = entity.fields.filter((field) => field.roles.includes("timestamp"));
  const dimensions = entity.fields.filter((field) => field.roles.includes("dimension"));
  const visibleFields =
    data.activeTab === "ingredients"
      ? [...measures, ...timestamps, ...dimensions].slice(0, 8)
      : data.activeTab === "relationships"
        ? entity.fields.filter((field) => field.roles.includes("reference")).slice(0, 8)
        : entity.fields.slice(0, 6);

  return (
    <div
      className={`w-[304px] rounded-2xl border bg-white/95 p-4 text-left shadow-[0_18px_45px_rgba(15,15,15,0.1)] backdrop-blur transition ${
        data.isOpen ? "border-black ring-4 ring-black/5" : "border-neutral-200"
      }`}
    >
      <Handle id="target" position={Position.Left} type="target" />
      <Handle id="source" position={Position.Right} type="source" />

      <button
        className="w-full text-left"
        onClick={() => data.onSelect(entity.collection)}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-black text-white">
              <Database className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-black">
                {collectionLabel(entity.collection)}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {entity.entityRole} - {entity.fields.length} fields
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${scoreTone(entity.score)}`}
          >
            {entity.score}
          </span>
        </div>
      </button>

      {data.relationship && (
        <div className="mt-3 rounded-2xl border border-dashed border-neutral-200 bg-[#fbfaf7] px-3 py-2 text-xs text-neutral-500">
          {collectionLabel(data.relationship.fromCollection)}.
          {data.relationship.fromField}
          <span className="px-1 text-black">{"->"}</span>
          {collectionLabel(data.relationship.toCollection)}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {visibleFields.slice(0, data.isOpen ? 8 : 4).map((field) => (
          <span
            className="max-w-full truncate rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600"
            key={field.name}
          >
            {field.name}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-neutral-500">
        <div className="rounded-2xl bg-[#fbfaf7] px-2 py-2">
          <p className="font-semibold text-black">{entity.rowCount}</p>
          <p>Rows</p>
        </div>
        <div className="rounded-2xl bg-[#fbfaf7] px-2 py-2">
          <p className="font-semibold text-black">{measures.length}</p>
          <p>Nums</p>
        </div>
        <div className="rounded-2xl bg-[#fbfaf7] px-2 py-2">
          <p className="font-semibold text-black">{timestamps.length}</p>
          <p>Dates</p>
        </div>
      </div>

      {data.isOpen && (
        <div className="nodrag nowheel mt-4 rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-3">
          <div className="mb-3 flex items-start gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-black text-white">
              <Bot className="size-3.5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-black">
                <MessageSquare className="size-3.5" />
                Chat with this collection
              </div>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                AI will create a read plan, inspect the sampled context, then answer.
              </p>
            </div>
          </div>

          {data.chat && (
            <div className="mb-3 rounded-2xl border border-neutral-200 bg-white p-3 text-xs text-neutral-600">
              <p className="text-sm font-medium text-black">{data.chat.answer}</p>
              <p className="mt-2 font-medium text-neutral-500">Read plan</p>
              <p className="mt-1 truncate">
                {data.chat.command.intent} · {data.chat.command.collections.join(", ")}
              </p>
              {data.chat.evidence[0] && (
                <p className="mt-2 text-neutral-500">{data.chat.evidence[0]}</p>
              )}
            </div>
          )}

          <textarea
            className="h-20 w-full resize-none rounded-2xl border border-neutral-200 bg-white p-3 text-sm text-black outline-none placeholder:text-neutral-400 focus:border-neutral-400"
            onChange={(event) => data.onMessage(entity.collection, event.target.value)}
            placeholder={`Ask about ${collectionLabel(entity.collection)}...`}
            value={data.message}
          />
          <div className="mt-2 flex justify-end">
            <Button
              className="h-9 px-4"
              disabled={!data.message.trim() || data.isAsking}
              onClick={() => data.onAsk(entity.collection)}
            >
              {data.isAsking && <Loader2 className="size-3.5 animate-spin" />}
              Ask AI
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  dbCollection: DbCollectionNode,
};

export function DataCatalogView({
  catalog,
  contexts,
  onProceed,
}: DataCatalogViewProps) {
  const [activeTab, setActiveTab] = useState<CanvasTab>("map");
  const [customMetric, setCustomMetric] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [showMetrics, setShowMetrics] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState(
    catalog.entities[0]?.collection || "",
  );
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [chats, setChats] = useState<Record<string, DbChat>>({});
  const [askingCollection, setAskingCollection] = useState<string>();
  const [nodePositionMap, setNodePositionMap] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const updateNodeMessage = useCallback((collection: string, value: string) => {
    setMessages((current) => ({ ...current, [collection]: value }));
  }, []);

  const askDbAi = useCallback(
    async (collection: string) => {
      const question = messages[collection]?.trim();
      if (!question) return;
      setAskingCollection(collection);

      try {
        const response = await fetch("/api/ai/db-chat", {
          body: JSON.stringify({
            catalog,
            collection,
            contexts,
            question,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const result = (await response.json()) as DbChat;
        setChats((current) => ({ ...current, [collection]: result }));
      } catch {
        setChats((current) => ({
          ...current,
          [collection]: {
            answer: "I could not complete the DB chat request yet.",
            command: {
              collections: [collection],
              fields: [],
              filters: [],
              intent: "fallback",
              limit: 0,
            },
            evidence: ["Server request failed."],
            provider: "fallback",
          },
        }));
      } finally {
        setAskingCollection(undefined);
      }
    },
    [catalog, contexts, messages],
  );

  const relationships = useMemo(
    () =>
      catalog.relationships.length > 0
        ? catalog.relationships
        : fallbackRelationships(catalog.entities),
    [catalog.entities, catalog.relationships],
  );
  const seeds = useMemo(() => metricSeeds(catalog), [catalog]);
  const baseNodes = useMemo<Node<DbNodeData, "dbCollection">[]>(
    () =>
      catalog.entities.map((entity, index) => ({
        data: {
          activeTab,
          chat: chats[entity.collection],
          entity,
          isAsking: askingCollection === entity.collection,
          isOpen: selectedCollection === entity.collection,
          message: messages[entity.collection] || "",
          onAsk: askDbAi,
          onMessage: updateNodeMessage,
          onSelect: setSelectedCollection,
          relationship: relationshipForNode(entity, relationships),
        },
        id: entity.collection,
        position:
          nodePositionMap[entity.collection] ||
          nodePositions[index % nodePositions.length] ||
          { x: 600, y: 360 },
        type: "dbCollection",
      })),
    [
      activeTab,
      askingCollection,
      askDbAi,
      catalog.entities,
      chats,
      messages,
      nodePositionMap,
      relationships,
      selectedCollection,
      updateNodeMessage,
    ],
  );

  const edges = useMemo<Edge[]>(
    () =>
      relationships.map((relationship) => ({
        animated:
          selectedCollection === relationship.fromCollection ||
          selectedCollection === relationship.toCollection,
        data: relationship,
        id: relationshipKey(relationship),
        label: relationship.fromField,
        markerEnd: {
          color: "#171717",
          type: MarkerType.ArrowClosed,
        },
        source: relationship.fromCollection,
        sourceHandle: "source",
        style: {
          stroke:
            selectedCollection === relationship.fromCollection ||
            selectedCollection === relationship.toCollection
              ? "#171717"
              : "#a3a3a3",
          strokeDasharray: catalog.relationships.length > 0 ? undefined : "6 6",
          strokeWidth:
            selectedCollection === relationship.fromCollection ||
            selectedCollection === relationship.toCollection
              ? 2.4
              : 1.4,
        },
        target: relationship.toCollection,
        targetHandle: "target",
        type: "smoothstep",
      })),
    [catalog.relationships.length, relationships, selectedCollection],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<DbNodeData, "dbCollection">>[]) => {
      setNodePositionMap((current) => {
        const changedNodes = applyNodeChanges(changes, baseNodes);
        return {
          ...current,
          ...Object.fromEntries(
            changedNodes.map((node) => [node.id, node.position]),
          ),
        };
      });
    },
    [baseNodes],
  );

  const addIdea = () => {
    const next = customMetric.trim();
    if (!next) return;
    setIdeas((current) => [next, ...current.filter((idea) => idea !== next)]);
    setCustomMetric("");
  };

  return (
    <section className="fixed inset-0 z-40 overflow-hidden bg-[#f7f4ee] text-black">
      <aside className="absolute left-4 top-4 z-30 flex max-h-[calc(100vh-32px)] w-[276px] flex-col rounded-2xl border border-neutral-200 bg-white/88 p-4 shadow-[0_24px_70px_rgba(15,15,15,0.12)] backdrop-blur xl:left-6 xl:top-6">
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-500">
            <Sparkles className="size-3.5" />
            Analyze connection
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-black">Data canvas</h2>
        </div>

        <div className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-black text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {tab.label}
                </span>
                <ArrowRight className="size-3.5" />
              </button>
            );
          })}
        </div>

        <div className="my-5 h-px bg-neutral-200" />

        <button
          className="mb-3 flex w-full items-center justify-between rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-black transition hover:border-neutral-300"
          onClick={() => setShowMetrics((current) => !current)}
          type="button"
        >
          Possible metrics
          <span className="text-xs text-neutral-500">
            {showMetrics ? "Hide" : "Show"}
          </span>
        </button>

        {showMetrics && (
          <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            {[...ideas.map((idea) => ({ detail: "Custom ask", title: idea })), ...seeds]
              .slice(0, 7)
              .map((seed) => (
                <button
                  className="w-full rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-3 text-left transition hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-white hover:shadow-sm"
                  key={`${seed.title}-${seed.detail}`}
                  type="button"
                >
                  <p className="truncate text-sm font-semibold text-black">
                    {seed.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-neutral-500">
                    {seed.detail}
                  </p>
                </button>
              ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-neutral-500" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-neutral-400"
              onChange={(event) => setCustomMetric(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addIdea();
              }}
              placeholder="Add metric idea"
              value={customMetric}
            />
          </div>
        </div>

        <Button className="mt-4 w-full" onClick={onProceed}>
          Generate metrics
        </Button>
      </aside>

      <div className="absolute left-[312px] right-4 top-4 z-20 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white/80 px-5 py-3 shadow-sm backdrop-blur xl:left-[330px] xl:right-6 xl:top-6">
        <div>
          <p className="text-xs font-medium uppercase text-neutral-500">
            {catalog.entities.length} collections - {catalog.relationships.length} detected links
          </p>
          <h3 className="mt-1 text-xl font-semibold text-black">
            {activeTab === "map" && "Database relationship map"}
            {activeTab === "relationships" && "Detected joins and paths"}
            {activeTab === "entities" && "Collection intelligence"}
            {activeTab === "ingredients" && "Metric-ready fields"}
          </h3>
        </div>
        <div className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500">
          Drag cards. Click one to chat inside it.
        </div>
      </div>

      <ReactFlow
        className="bg-[linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:34px_34px]"
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.35}
        nodes={baseNodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        panOnScroll
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d4d4d4" gap={34} size={1} />
        <Controls className="!bottom-6 !left-[318px] !rounded-2xl !border !border-neutral-200 !bg-white/90 !shadow-lg" />
        <MiniMap
          className="!bottom-6 !right-6 !rounded-2xl !border !border-neutral-200 !bg-white/90 !shadow-lg"
          maskColor="rgba(247,244,238,0.62)"
          nodeColor="#111111"
          pannable
          zoomable
        />
      </ReactFlow>
    </section>
  );
}
