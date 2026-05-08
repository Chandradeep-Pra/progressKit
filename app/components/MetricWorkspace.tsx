import { useState } from "react";
import { Copy, Save } from "lucide-react";

import type { SelectedCollectionContext } from "../lib/collection-analysis";
import type { MetricSuggestion } from "../lib/metric-suggestions";
import { Button } from "./ui/button";

type MetricWorkspaceProps = {
  contexts: SelectedCollectionContext[];
  suggestion: MetricSuggestion;
};

type Aggregation = "count" | "sum" | "average";
type Visualization = "chart" | "table" | "leaderboard" | "progress" | "funnel" | "streak";

const tabs = ["Preview", "Data", "Logic", "Component"] as const;

function getContext(contexts: SelectedCollectionContext[], suggestion: MetricSuggestion) {
  return (
    contexts.find((context) => context.sample.path === suggestion.collection) ||
    contexts.find((context) => context.analysis.title === suggestion.collection) ||
    contexts[0]
  );
}

function getPrimitiveFields(rows: Record<string, unknown>[]) {
  const fields = new Set<string>();

  rows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
        fields.add(key);
      }
    });
  });

  return Array.from(fields);
}

function getNumericFields(rows: Record<string, unknown>[]) {
  return getPrimitiveFields(rows).filter((field) =>
    rows.some((row) => typeof row[field] === "number"),
  );
}

function getDateFields(rows: Record<string, unknown>[]) {
  return getPrimitiveFields(rows).filter((field) =>
    rows.some((row) => {
      const value = row[field];
      return typeof value === "string" && !Number.isNaN(Date.parse(value));
    }),
  );
}

function getLabel(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function aggregateRows(
  rows: Record<string, unknown>[],
  groupBy: string,
  valueField: string,
  aggregation: Aggregation,
  limit: number,
) {
  const groups = new Map<string, { count: number; sum: number }>();

  rows.forEach((row) => {
    const label = getLabel(row[groupBy]);
    const current = groups.get(label) || { count: 0, sum: 0 };

    groups.set(label, {
      count: current.count + 1,
      sum: current.sum + numberValue(row[valueField]),
    });
  });

  return Array.from(groups.entries())
    .map(([label, value]) => ({
      count: value.count,
      label,
      value:
        aggregation === "sum"
          ? value.sum
          : aggregation === "average"
            ? value.count > 0
              ? value.sum / value.count
              : 0
            : value.count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function getTimeBuckets(rows: Record<string, unknown>[], dateField: string) {
  const buckets = new Map<string, number>();

  rows.forEach((row) => {
    const value = row[dateField];
    if (typeof value !== "string") return;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;

    const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets.set(key, (buckets.get(key) || 0) + 1);
  });

  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toLocaleString();
}

function getCompletionValue(label: string, value: number, maxValue: number) {
  if (/complete|success|paid|active|done|true/i.test(label)) {
    return Math.round((value / Math.max(maxValue, 1)) * 100);
  }

  return Math.round((value / Math.max(maxValue, 1)) * 100);
}

function getComponentName(title: string) {
  const cleaned = title.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned || "GeneratedMetric";
}

function PreviewWidget({
  aggregation,
  dateField,
  groupBy,
  previewRows,
  rows,
  valueField,
  visualization,
}: {
  aggregation: Aggregation;
  dateField: string;
  groupBy: string;
  previewRows: ReturnType<typeof aggregateRows>;
  rows: Record<string, unknown>[];
  valueField: string;
  visualization: Visualization;
}) {
  const maxValue = Math.max(...previewRows.map((row) => row.value), 1);
  const total = previewRows.reduce((sum, row) => sum + row.value, 0);
  const timeBuckets = dateField ? getTimeBuckets(rows, dateField) : [];
  const timeMax = Math.max(...timeBuckets.map((row) => row.value), 1);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
        No sampled rows available for this metric.
      </div>
    );
  }

  if (visualization === "table") {
    return (
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">{groupBy}</th>
              <th className="px-4 py-3 font-medium">{aggregation}</th>
              <th className="px-4 py-3 font-medium">records</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {previewRows.map((row) => (
              <tr key={row.label}>
                <td className="px-4 py-3 font-medium text-black">{row.label}</td>
                <td className="px-4 py-3 text-neutral-600">{formatNumber(row.value)}</td>
                <td className="px-4 py-3 text-neutral-500">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (visualization === "leaderboard") {
    return (
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
        {previewRows.map((row, index) => (
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-[#fbfaf7] p-3" key={row.label}>
            <span className="flex size-8 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-black">{row.label}</p>
              <div className="mt-2 h-2 rounded-full bg-neutral-100">
                <div className="h-2 rounded-full bg-black" style={{ width: `${Math.max((row.value / maxValue) * 100, 4)}%` }} />
              </div>
            </div>
            <span className="text-sm font-semibold text-black">{formatNumber(row.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (visualization === "progress") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {previewRows.map((row) => {
          const percent = getCompletionValue(row.label, row.value, maxValue);
          return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4" key={row.label}>
              <div className="mb-3 flex items-center justify-between">
                <p className="truncate text-sm font-semibold text-black">{row.label}</p>
                <span className="text-sm font-semibold text-black">{percent}%</span>
              </div>
              <div className="h-3 rounded-full bg-neutral-100">
                <div className="h-3 rounded-full bg-black" style={{ width: `${Math.max(percent, 4)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (visualization === "funnel") {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[#fbfaf7] p-3">
            <p className="text-xs text-neutral-500">Total</p>
            <p className="mt-1 text-2xl font-semibold text-black">{rows.length}</p>
          </div>
          <div className="rounded-2xl bg-[#fbfaf7] p-3">
            <p className="text-xs text-neutral-500">Segments</p>
            <p className="mt-1 text-2xl font-semibold text-black">{previewRows.length}</p>
          </div>
          <div className="rounded-2xl bg-[#fbfaf7] p-3">
            <p className="text-xs text-neutral-500">Top share</p>
            <p className="mt-1 text-2xl font-semibold text-black">{Math.round((previewRows[0]?.value || 0) / Math.max(total, 1) * 100)}%</p>
          </div>
        </div>
        <div className="space-y-3">
          {previewRows.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-black">{row.label}</span>
                <span className="text-neutral-500">{formatNumber(row.value)}</span>
              </div>
              <div className="h-8 rounded-r-full bg-neutral-100">
                <div className="flex h-8 items-center rounded-r-full bg-black px-3 text-xs text-white" style={{ width: `${Math.max((row.value / maxValue) * 100, 8)}%` }}>
                  {Math.round((row.value / Math.max(total, 1)) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visualization === "streak") {
    const buckets = timeBuckets.length > 0 ? timeBuckets : previewRows;
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Activity days</p>
            <p className="mt-1 text-2xl font-semibold text-black">{buckets.length}</p>
          </div>
          <div>
            <p className="text-right text-xs text-neutral-500">Peak</p>
            <p className="mt-1 text-2xl font-semibold text-black">{Math.max(...buckets.map((row) => row.value), 0)}</p>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {buckets.slice(0, 28).map((row) => (
            <div className="aspect-square rounded-lg bg-black" key={row.label} style={{ opacity: 0.18 + (row.value / Math.max(timeMax, 1)) * 0.82 }} title={`${row.label}: ${row.value}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[#fbfaf7] p-3">
          <p className="text-xs text-neutral-500">Rows</p>
          <p className="mt-1 text-2xl font-semibold text-black">{rows.length}</p>
        </div>
        <div className="rounded-2xl bg-[#fbfaf7] p-3">
          <p className="text-xs text-neutral-500">Top value</p>
          <p className="mt-1 text-2xl font-semibold text-black">{formatNumber(maxValue)}</p>
        </div>
        <div className="rounded-2xl bg-[#fbfaf7] p-3">
          <p className="text-xs text-neutral-500">Field</p>
          <p className="mt-1 truncate text-lg font-semibold text-black">{valueField || "count"}</p>
        </div>
      </div>
      <div className="flex h-72 items-end gap-3 border-b border-l border-neutral-200 px-3 pt-4">
        {previewRows.map((row) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={row.label}>
            <div className="w-full rounded-t-2xl bg-black transition-all" style={{ height: `${Math.max((row.value / maxValue) * 240, 8)}px` }} />
            <span className="w-full truncate text-center text-xs text-neutral-500">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MetricWorkspace({ contexts, suggestion }: MetricWorkspaceProps) {
  const context = getContext(contexts, suggestion);
  const rows = context?.sample.rows ?? [];
  const fields = context?.sample.fields ?? [];
  const primitiveFields = getPrimitiveFields(rows);
  const numericFields = getNumericFields(rows);
  const dateFields = getDateFields(rows);
  const defaultGroupBy =
    suggestion.fields.find((field) => primitiveFields.includes(field)) ||
    primitiveFields.find((field) => /name|status|type|user|doctor|category/i.test(field)) ||
    primitiveFields[0] ||
    "id";
  const defaultValueField =
    suggestion.fields.find((field) => numericFields.includes(field)) ||
    numericFields[0] ||
    "";
  const defaultDateField =
    suggestion.fields.find((field) => dateFields.includes(field)) ||
    dateFields[0] ||
    "";

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Preview");
  const [visualization, setVisualization] = useState<Visualization>(suggestion.output);
  const [groupBy, setGroupBy] = useState(defaultGroupBy);
  const [valueField, setValueField] = useState(defaultValueField);
  const [dateField, setDateField] = useState(defaultDateField);
  const [aggregation, setAggregation] = useState<Aggregation>(
    defaultValueField ? "sum" : "count",
  );
  const [limit, setLimit] = useState(8);

  const previewRows = aggregateRows(rows, groupBy, valueField, aggregation, limit);
  const logic = {
    aggregation,
    collection: context?.sample.path || suggestion.collection,
    dateField: dateField || null,
    fields: {
      groupBy,
      value: valueField || "document count",
    },
    limit,
    sampleRows: rows.length,
    visualization,
  };

  const componentName = getComponentName(suggestion.title);
  const componentCode = `const metricPlan = ${JSON.stringify(logic, null, 2)};

export function ${componentName}({ rows }) {
  const data = aggregate(rows, metricPlan);
  return <ProgressKitMetric title="${suggestion.title}" data={data} />;
}`;

  return (
    <div className="flex h-full min-h-[640px] flex-col p-5">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-neutral-500">
            Generated metric
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-black">
            {suggestion.title}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            {suggestion.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Copy className="size-4" />
            Copy code
          </Button>
          <Button>
            <Save className="size-4" />
            Save metric
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-3 md:grid-cols-6">
        <select className="h-10 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none" onChange={(event) => setVisualization(event.target.value as Visualization)} value={visualization}>
          {["chart", "table", "leaderboard", "progress", "funnel", "streak"].map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <select className="h-10 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none" onChange={(event) => setGroupBy(event.target.value)} value={groupBy}>
          {fields.map((field) => (
            <option key={field} value={field}>group: {field}</option>
          ))}
        </select>
        <select className="h-10 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none" onChange={(event) => setValueField(event.target.value)} value={valueField}>
          <option value="">count documents</option>
          {numericFields.map((field) => (
            <option key={field} value={field}>value: {field}</option>
          ))}
        </select>
        <select className="h-10 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none" onChange={(event) => setAggregation(event.target.value as Aggregation)} value={aggregation}>
          <option value="count">count</option>
          <option value="sum">sum</option>
          <option value="average">average</option>
        </select>
        <select className="h-10 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none" onChange={(event) => setDateField(event.target.value)} value={dateField}>
          <option value="">date field</option>
          {dateFields.map((field) => (
            <option key={field} value={field}>date: {field}</option>
          ))}
        </select>
        <input className="h-10 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none" max={20} min={3} onChange={(event) => setLimit(Number(event.target.value))} type="number" value={limit} />
      </div>

      <div className="mb-4 inline-flex w-fit rounded-full border border-neutral-200 bg-neutral-50 p-1">
        {tabs.map((tab) => (
          <button className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === tab ? "bg-white text-black shadow-sm" : "text-neutral-500"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Preview" && (
        <div className="grid flex-1 gap-4 xl:grid-cols-[1fr_0.72fr]">
          <PreviewWidget aggregation={aggregation} dateField={dateField} groupBy={groupBy} previewRows={previewRows} rows={rows} valueField={valueField} visualization={visualization} />
          <div className="rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-4">
            <p className="text-sm font-semibold text-black">Metric plan</p>
            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <p>Collection: {logic.collection}</p>
              <p>Rows sampled: {rows.length}</p>
              <p>Group by: {groupBy}</p>
              <p>Value: {valueField || "document count"}</p>
              <p>Aggregation: {aggregation}</p>
              {dateField && <p>Date: {dateField}</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Data" && (
        <div className="overflow-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                {fields.slice(0, 8).map((field) => (
                  <th className="px-4 py-3 font-medium" key={field}>{field}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.slice(0, 20).map((row, index) => (
                <tr key={`${row.id ?? index}`}>
                  {fields.slice(0, 8).map((field) => (
                    <td className="max-w-48 truncate px-4 py-3 text-neutral-600" key={field}>{getLabel(row[field])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Logic" && (
        <pre className="flex-1 overflow-auto rounded-2xl bg-black p-5 text-sm leading-7 text-neutral-200">{JSON.stringify(logic, null, 2)}</pre>
      )}

      {activeTab === "Component" && (
        <pre className="flex-1 overflow-auto rounded-2xl bg-black p-5 text-sm leading-7 text-neutral-200">{componentCode}</pre>
      )}
    </div>
  );
}
