"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import {
  ArrowRight,
  Bot,
  Database,
  GitBranch,
  Loader2,
  Maximize2,
  MessageSquare,
  Minus,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
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
  initialTab?: CanvasTab;
  isRefreshing?: boolean;
  onProceed: () => void;
  onRefresh: () => void;
  onToggleTheme: () => void;
  theme: "dark" | "light";
};

type CanvasTab = "relationships" | "entities" | "ingredients";
type CanvasDrag =
  | {
      collection: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      type: "card";
    }
  | {
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      type: "pan";
    };
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

const tabs: Array<{ icon: typeof Database; id: CanvasTab; label: string }> = [
  { icon: GitBranch, id: "relationships", label: "Connections" },
  { icon: Database, id: "entities", label: "Collections" },
  { icon: TableProperties, id: "ingredients", label: "Fields" },
];

const nodePositions = [
  { x: 230, y: 150 },
  { x: 590, y: 150 },
  { x: 590, y: 430 },
  { x: 230, y: 430 },
  { x: 950, y: 150 },
  { x: 950, y: 430 },
  { x: 230, y: 710 },
  { x: 590, y: 710 },
  { x: 950, y: 710 },
  { x: 1310, y: 430 },
];

function generatedPosition(index: number) {
  const preset = nodePositions[index];
  if (preset) return preset;

  return {
    x: 230 + (index % 4) * 360,
    y: 150 + Math.floor(index / 4) * 280,
  };
}

const exampleEntities: EntityProfile[] = [
  {
    collection: "users",
    entityRole: "identity",
    fields: [
      { cardinality: 4, examples: ["user_1"], kind: "string", name: "id", nullRate: 0, roles: ["id"] },
      { cardinality: 4, examples: ["Pro"], kind: "string", name: "plan", nullRate: 0, roles: ["dimension"] },
      { cardinality: 4, examples: ["2026-05-16"], kind: "timestamp", name: "createdAt", nullRate: 0, roles: ["timestamp"] },
    ],
    rowCount: 4,
    score: 92,
  },
  {
    collection: "orders",
    entityRole: "transaction",
    fields: [
      { cardinality: 4, examples: ["order_1"], kind: "string", name: "id", nullRate: 0, roles: ["id"] },
      { cardinality: 3, examples: ["user_1"], kind: "string", name: "userId", nullRate: 0, roles: ["reference"] },
      { cardinality: 4, examples: ["4900"], kind: "number", name: "amount", nullRate: 0, roles: ["measure"] },
    ],
    rowCount: 4,
    score: 88,
  },
  {
    collection: "payments",
    entityRole: "transaction",
    fields: [
      { cardinality: 4, examples: ["pay_1"], kind: "string", name: "id", nullRate: 0, roles: ["id"] },
      { cardinality: 4, examples: ["order_1"], kind: "string", name: "orderId", nullRate: 0, roles: ["reference"] },
      { cardinality: 2, examples: ["paid"], kind: "string", name: "status", nullRate: 0, roles: ["dimension"] },
    ],
    rowCount: 4,
    score: 84,
  },
  {
    collection: "events",
    entityRole: "event",
    fields: [
      { cardinality: 4, examples: ["evt_1"], kind: "string", name: "id", nullRate: 0, roles: ["id"] },
      { cardinality: 3, examples: ["user_1"], kind: "string", name: "userId", nullRate: 0, roles: ["reference"] },
      { cardinality: 4, examples: ["login"], kind: "string", name: "type", nullRate: 0, roles: ["dimension"] },
    ],
    rowCount: 4,
    score: 80,
  },
];

const exampleRelationships: RelationshipCandidate[] = [
  {
    confidence: 0.86,
    fromCollection: "orders",
    fromField: "userId",
    reason: "example user reference",
    toCollection: "users",
    toField: "id",
  },
  {
    confidence: 0.82,
    fromCollection: "payments",
    fromField: "orderId",
    reason: "example order reference",
    toCollection: "orders",
    toField: "id",
  },
  {
    confidence: 0.78,
    fromCollection: "events",
    fromField: "userId",
    reason: "example user activity reference",
    toCollection: "users",
    toField: "id",
  },
];

function collectionLabel(path: string) {
  return path.split("/").at(-1) || path;
}

function scoreTone(score: number) {
  if (score >= 75) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (score >= 45) return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-neutral-100 text-neutral-600 ring-neutral-200";
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

function CollectionCanvasCard({
  activeTab,
  chat,
  entity,
  isAsking,
  isDragging,
  isOpen,
  message,
  onAsk,
  onMessage,
  onSelect,
  relationship,
}: {
  activeTab: CanvasTab;
  chat?: DbChat;
  entity: EntityProfile;
  isAsking: boolean;
  isDragging: boolean;
  isOpen: boolean;
  message: string;
  onAsk: (collection: string) => void;
  onMessage: (collection: string, value: string) => void;
  onSelect: (collection: string) => void;
  relationship?: RelationshipCandidate;
}) {
  const measures = entity.fields.filter((field) => field.roles.includes("measure"));
  const timestamps = entity.fields.filter((field) => field.roles.includes("timestamp"));
  const dimensions = entity.fields.filter((field) => field.roles.includes("dimension"));
  const visibleFields =
    activeTab === "ingredients"
      ? [...measures, ...timestamps, ...dimensions].slice(0, 8)
      : activeTab === "relationships"
        ? entity.fields.filter((field) => field.roles.includes("reference")).slice(0, 8)
        : entity.fields.slice(0, 6);

  return (
    <div
      className={`w-[304px] rounded-2xl border bg-white/95 p-4 text-left shadow-[0_18px_45px_rgba(15,15,15,0.1)] backdrop-blur transition hover:border-[var(--accent-blue)] ${
        isOpen ? "border-black ring-4 ring-black/5" : "border-neutral-200"
      } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <button
        className="w-full text-left"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(entity.collection);
        }}
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

      {relationship && (
        <div className="mt-3 rounded-2xl border border-dashed border-neutral-200 bg-[#fbfaf7] px-3 py-2 text-xs text-neutral-500">
          {collectionLabel(relationship.fromCollection)}.{relationship.fromField}
          <span className="px-1 text-black">{"->"}</span>
          {collectionLabel(relationship.toCollection)}
        </div>
      )}

      <div className="mt-3 flex min-h-7 flex-wrap gap-2">
        {visibleFields.length > 0 ? (
          visibleFields.slice(0, isOpen ? 8 : 4).map((field) => (
            <span
              className="max-w-full truncate rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600"
              key={field.name}
            >
              {field.name}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
            Sample pending
          </span>
        )}
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

      {isOpen && (
        <div
          className="mt-4 cursor-default rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-3"
          onPointerDown={(event) => event.stopPropagation()}
        >
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

          {chat && (
            <div className="mb-3 rounded-2xl border border-neutral-200 bg-white p-3 text-xs text-neutral-600">
              <p className="text-sm font-medium text-black">{chat.answer}</p>
              <p className="mt-2 font-medium text-neutral-500">Read plan</p>
              <p className="mt-1 truncate">
                {chat.command.intent} - {chat.command.collections.join(", ")}
              </p>
              {chat.evidence[0] && (
                <p className="mt-2 text-neutral-500">{chat.evidence[0]}</p>
              )}
            </div>
          )}

          <textarea
            className="h-20 w-full resize-none rounded-2xl border border-neutral-200 bg-white p-3 text-sm text-black outline-none placeholder:text-neutral-400 focus:border-neutral-400"
            onChange={(event) => onMessage(entity.collection, event.target.value)}
            placeholder={`Ask about ${collectionLabel(entity.collection)}...`}
            value={message}
          />
          <div className="mt-2 flex justify-end">
            <Button
              className="h-9 px-4"
              disabled={!message.trim() || isAsking}
              onClick={() => onAsk(entity.collection)}
            >
              {isAsking && <Loader2 className="size-3.5 animate-spin" />}
              Ask AI
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataCatalogView({
  catalog,
  contexts,
  initialTab = "relationships",
  isRefreshing = false,
  onProceed,
  onRefresh,
  onToggleTheme,
  theme,
}: DataCatalogViewProps) {
  const [activeTab, setActiveTab] = useState<CanvasTab>(initialTab);
  const [customMetric, setCustomMetric] = useState("");
  const [drag, setDrag] = useState<CanvasDrag>();
  const [ideas, setIdeas] = useState<string[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(
    catalog.entities[0]?.collection || exampleEntities[0].collection,
  );
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [chats, setChats] = useState<Record<string, DbChat>>({});
  const [askingCollection, setAskingCollection] = useState<string>();
  const [nodePositionMap, setNodePositionMap] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [canvasPointer, setCanvasPointer] = useState({ x: "50%", y: "50%" });
  const [viewport, setViewport] = useState({ x: 330, y: 190, zoom: 0.85 });

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

  const displayEntities =
    catalog.entities.length > 0 ? catalog.entities : exampleEntities;
  const displayRelationships =
    catalog.entities.length > 0 ? catalog.relationships : exampleRelationships;
  const relationships =
    displayRelationships.length > 0
      ? displayRelationships
      : fallbackRelationships(displayEntities);
  const positions = useMemo(
    () =>
      Object.fromEntries(
        displayEntities.map((entity, index) => [
          entity.collection,
          nodePositionMap[entity.collection] ||
            generatedPosition(index),
        ]),
      ) as Record<string, { x: number; y: number }>,
    [displayEntities, nodePositionMap],
  );
  const seeds = useMemo(() => metricSeeds(catalog), [catalog]);

  const addIdea = () => {
    const next = customMetric.trim();
    if (!next) return;
    setIdeas((current) => [next, ...current.filter((idea) => idea !== next)]);
    setCustomMetric("");
  };

  const moveCanvas = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setCanvasPointer({
      x: `${event.clientX - bounds.left}px`,
      y: `${event.clientY - bounds.top}px`,
    });

    if (!drag) return;

    if (drag.type === "card") {
      setNodePositionMap((current) => ({
        ...current,
        [drag.collection]: {
          x: drag.startX + (event.clientX - drag.startClientX) / viewport.zoom,
          y: drag.startY + (event.clientY - drag.startClientY) / viewport.zoom,
        },
      }));
      return;
    }

    setViewport((current) => ({
      ...current,
      x: drag.startX + event.clientX - drag.startClientX,
      y: drag.startY + event.clientY - drag.startClientY,
    }));
  };

  const zoomCanvas = (nextZoom: number) => {
    setViewport((current) => ({
      ...current,
      zoom: Math.max(0.35, Math.min(1.8, nextZoom)),
    }));
  };

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    event.preventDefault();
    const nextZoom = Math.max(
      0.35,
      Math.min(1.8, viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.08)),
    );
    const worldX = (event.clientX - viewport.x) / viewport.zoom;
    const worldY = (event.clientY - viewport.y) / viewport.zoom;

    setViewport({
      x: event.clientX - worldX * nextZoom,
      y: event.clientY - worldY * nextZoom,
      zoom: nextZoom,
    });
  };

  return (
    <section
      className="relation-canvas-shell fixed inset-0 z-40 overflow-hidden text-black"
      onPointerCancel={() => setDrag(undefined)}
      onPointerMove={moveCanvas}
      onPointerUp={() => setDrag(undefined)}
      onWheel={handleWheel}
      style={
        {
          "--canvas-pointer-x": canvasPointer.x,
          "--canvas-pointer-y": canvasPointer.y,
        } as CSSProperties
      }
    >
      <aside className="absolute left-4 top-4 z-30 flex max-h-[calc(100vh-32px)] w-[276px] flex-col rounded-2xl border border-neutral-200 bg-white/88 p-4 shadow-[0_24px_70px_rgba(15,15,15,0.12)] backdrop-blur xl:left-6 xl:top-6">
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-500">
            {/* <Sparkles className="size-3.5" /> */}
            Analyze connection
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-black">Data canvas</h2>
        </div>

        <button
          className="mb-4 flex w-full items-center justify-between rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-black transition hover:border-neutral-300"
          onClick={onToggleTheme}
          type="button"
        >
          <span className="flex items-center gap-2">
            {theme === "dark" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
            {theme === "dark" ? "Dark" : "Light"}
          </span>
          <span
            className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
              theme === "dark" ? "justify-end bg-black" : "justify-start bg-neutral-200"
            }`}
          >
            <span className="size-4 rounded-full bg-white shadow-sm" />
          </span>
        </button>

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
          Metric ideas
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
          Open metric builder
        </Button>
      </aside>

      <div className="absolute left-[312px] right-4 top-4 z-20 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white/80 px-5 py-3 shadow-sm backdrop-blur xl:left-[330px] xl:right-6 xl:top-6">
        <div>
          <p className="text-xs font-medium uppercase text-neutral-500">
            {displayEntities.length} collections - {relationships.length} detected links
          </p>
          <h3 className="mt-1 text-xl font-semibold text-black">
            {activeTab === "relationships" && "Database connections"}
            {activeTab === "entities" && "Collection intelligence"}
            {activeTab === "ingredients" && "Metric-ready fields"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500">
            {displayEntities.length} collection cards on canvas
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-medium text-black transition hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] disabled:opacity-60"
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      <div
        className={`relation-canvas-stage absolute inset-0 z-10 ${drag?.type === "pan" ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          setDrag({
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: viewport.x,
            startY: viewport.y,
            type: "pan",
          });
        }}
      >
        <div
          className="absolute left-0 top-0 h-[1000px] w-[1300px]"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <svg className="absolute inset-0 z-0 overflow-visible" height="1200" width="1600">
            <defs>
              <marker
                id="relation-arrow"
                markerHeight="7"
                markerWidth="7"
                orient="auto"
                refX="6"
                refY="3.5"
              >
                <polygon fill="var(--accent-blue)" points="0 0, 7 3.5, 0 7" />
              </marker>
            </defs>
            {relationships.map((relationship) => {
              const from = positions[relationship.fromCollection];
              const to = positions[relationship.toCollection];
              if (!from || !to) return null;
              const selected =
                selectedCollection === relationship.fromCollection ||
                selectedCollection === relationship.toCollection;

              return (
                <g key={relationshipKey(relationship)}>
                  <line
                    markerEnd="url(#relation-arrow)"
                    stroke={selected ? "var(--accent-blue)" : "var(--border-hover)"}
                    strokeDasharray={catalog.relationships.length > 0 ? undefined : "7 7"}
                    strokeLinecap="round"
                    strokeWidth={selected ? 2.5 : 1.5}
                    x1={from.x}
                    x2={to.x}
                    y1={from.y}
                    y2={to.y}
                  />
                  <text
                    fill="var(--text-muted)"
                    fontSize="13"
                    textAnchor="middle"
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 12}
                  >
                    {relationship.fromField}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="absolute inset-0 z-10">
          {displayEntities.map((entity) => {
            const position = positions[entity.collection];
            return (
              <div
                className="absolute will-change-transform"
                key={entity.collection}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedCollection(entity.collection);
                  setDrag({
                    collection: entity.collection,
                    startClientX: event.clientX,
                    startClientY: event.clientY,
                    startX: position.x,
                    startY: position.y,
                    type: "card",
                  });
                }}
                style={{
                  left: position.x,
                  top: position.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <CollectionCanvasCard
                  activeTab={activeTab}
                  chat={chats[entity.collection]}
                  entity={entity}
                  isAsking={askingCollection === entity.collection}
                  isDragging={
                    drag?.type === "card" && drag.collection === entity.collection
                  }
                  isOpen={selectedCollection === entity.collection}
                  message={messages[entity.collection] || ""}
                  onAsk={askDbAi}
                  onMessage={updateNodeMessage}
                  onSelect={setSelectedCollection}
                  relationship={relationshipForNode(entity, relationships)}
                />
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <div className="canvas-controls absolute bottom-6 left-[318px] z-30 flex">
        <button
          className="react-flow__controls-button"
          onClick={() => zoomCanvas(viewport.zoom + 0.12)}
          type="button"
        >
          <Plus className="size-4" />
        </button>
        <button
          className="react-flow__controls-button"
          onClick={() => zoomCanvas(viewport.zoom - 0.12)}
          type="button"
        >
          <Minus className="size-4" />
        </button>
        <button
          className="react-flow__controls-button"
          onClick={() => setViewport({ x: 330, y: 190, zoom: 0.85 })}
          type="button"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      <div className="canvas-minimap absolute bottom-6 right-6 z-30 h-[150px] w-[220px]">
        <div className="relative size-full">
          {relationships.map((relationship) => {
            const from = positions[relationship.fromCollection];
            const to = positions[relationship.toCollection];
            if (!from || !to) return null;
            return (
              <svg className="absolute inset-0 size-full" key={relationshipKey(relationship)}>
                <line
                  stroke="var(--border-hover)"
                  strokeWidth="1"
                  x1={`${(from.x / 1300) * 100}%`}
                  x2={`${(to.x / 1300) * 100}%`}
                  y1={`${(from.y / 1000) * 100}%`}
                  y2={`${(to.y / 1000) * 100}%`}
                />
              </svg>
            );
          })}
          {displayEntities.map((entity) => {
            const position = positions[entity.collection];
            return (
              <span
                className="absolute size-2 rounded-full bg-[var(--accent-blue)]"
                key={entity.collection}
                style={{
                  left: `${(position.x / 1300) * 100}%`,
                  top: `${(position.y / 1000) * 100}%`,
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
