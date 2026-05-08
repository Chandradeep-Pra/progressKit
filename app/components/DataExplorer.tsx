import { useMemo, useState } from "react";
import {
  Braces,
  ChevronRight,
  Database,
  FileJson,
  Folder,
  TableProperties,
} from "lucide-react";

import { Button } from "./ui/button";

type DataExplorerProps = {
  collections: string[];
  sample: {
    count: number;
    databaseId: string;
    fields: string[];
    path: string;
    projectId: string;
    rows: Record<string, unknown>[];
  };
  onContinue: () => void;
  onSelectCollection: (collectionPath: string) => void;
};

function formatValue(value: unknown) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }

  if (typeof value === "object") {
    return "{...}";
  }

  return String(value);
}

export function DataExplorer({
  collections,
  sample,
  onContinue,
  onSelectCollection,
}: DataExplorerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeSelectedIndex = Math.min(selectedIndex, Math.max(sample.rows.length - 1, 0));
  const selectedRow = useMemo(
    () => sample.rows[safeSelectedIndex] ?? {},
    [sample.rows, safeSelectedIndex],
  );
  const pathParts = sample.path.split("/").filter(Boolean);
  const collectionName = pathParts.at(-1) ?? sample.path;
  const allCollections = collections.length > 0 ? collections : [collectionName];

  const visibleFields = useMemo(() => {
    const fields = sample.fields.filter((field) => field !== "id");

    return fields.length > 0 ? fields : Object.keys(selectedRow).filter((field) => field !== "id");
  }, [sample.fields, selectedRow]);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-neutral-500">
            Data explorer
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-black sm:text-4xl">
            Raw Firestore sample
          </h2>
        </div>
        <Button onClick={onContinue}>Analyze collections</Button>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-neutral-200 bg-white/80 shadow-[0_22px_64px_rgba(20,20,20,0.08)] lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-neutral-200 bg-[#fbfaf7] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Database className="size-4" />
              {sample.projectId}
            </div>
            <p className="mt-1 text-xs text-neutral-500">{sample.count} sampled docs</p>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 rounded-xl px-2 py-2 font-medium text-black">
              <ChevronRight className="size-4 text-neutral-400" />
              <Folder className="size-4" />
              {sample.databaseId}
            </div>
            <div className="ml-6 space-y-1">
              {allCollections.map((collection) => {
                const isSelected = collection === collectionName;

                return (
                  <div key={collection}>
                    <button
                      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left font-medium transition ${
                        isSelected
                          ? "bg-white text-black shadow-sm"
                          : "text-neutral-600 hover:bg-white hover:text-black"
                      }`}
                      onClick={() => {
                        if (!isSelected) {
                          onSelectCollection(collection);
                        }
                      }}
                      type="button"
                    >
                      <ChevronRight className="size-4 text-neutral-400" />
                      <Folder className="size-4" />
                      <span className="truncate">{collection}</span>
                    </button>

                    {isSelected && (
                      <div className="ml-6 space-y-1 pt-1">
                        {sample.rows.map((row, index) => (
                          <button
                            className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition ${
                              safeSelectedIndex === index
                                ? "bg-black text-white"
                                : "text-neutral-600 hover:bg-white hover:text-black"
                            }`}
                            key={`${row.id ?? index}`}
                            onClick={() => setSelectedIndex(index)}
                            type="button"
                          >
                            <FileJson className="size-4 shrink-0" />
                            <span className="truncate">
                              {String(row.id ?? `doc-${index + 1}`)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-neutral-500">Selected document</p>
              <h3 className="truncate text-xl font-semibold text-black">
                {String(selectedRow.id ?? "Untitled document")}
              </h3>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600">
              <TableProperties className="size-3.5" />
              {visibleFields.length} fields
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-black">
                <TableProperties className="size-4" />
                Fields
              </div>
              <div className="divide-y divide-neutral-100">
                {visibleFields.map((field) => (
                  <div
                    className="grid grid-cols-[minmax(90px,0.45fr)_1fr] gap-3 py-3 text-sm"
                    key={field}
                  >
                    <span className="truncate font-medium text-black">{field}</span>
                    <span className="truncate text-neutral-500">
                      {formatValue(selectedRow[field])}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-neutral-200 bg-black p-4 text-white">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Braces className="size-4" />
                JSON
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-2xl bg-white/[0.06] p-4 text-xs leading-6 text-neutral-200">
                {JSON.stringify(selectedRow, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
