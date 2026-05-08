import { BarChart3, Check, Folder, Sparkles } from "lucide-react";

import type { CollectionAnalysis as Analysis } from "../lib/collection-analysis";
import { Button } from "./ui/button";

type CollectionAnalysisProps = {
  analyses: Analysis[];
  isAnalyzing: boolean;
  onProceed: () => void;
  onToggle: (collection: string) => void;
  provider: "gemini" | "fallback";
  selectedCollections: string[];
};

export function CollectionAnalysis({
  analyses,
  isAnalyzing,
  onProceed,
  onToggle,
  provider,
  selectedCollections,
}: CollectionAnalysisProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-neutral-500">
            AI layer
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-black sm:text-4xl">
            Collection scores
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            {provider === "gemini" ? "Gemini 2.5 Flash analysis" : "Fallback local analysis"}
          </p>
        </div>
        <Button disabled={selectedCollections.length === 0 || isAnalyzing} onClick={onProceed}>
          Proceed
        </Button>
      </div>

      {isAnalyzing && (
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white/75 p-4 text-sm text-neutral-600 shadow-sm">
          Gemini is scoring collections.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {analyses.map((analysis) => {
          const selected = selectedCollections.includes(analysis.title);

          return (
            <button
              className={`rounded-2xl border p-5 text-left shadow-sm transition-all hover:-translate-y-1 ${
                selected
                  ? "border-black bg-white shadow-[0_20px_48px_rgba(20,20,20,0.09)]"
                  : "border-neutral-200 bg-white/75 hover:bg-white"
              }`}
              key={analysis.title}
              onClick={() => onToggle(analysis.title)}
              type="button"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-neutral-200 bg-[#fbfaf7]">
                  <Folder className="size-5 text-black" />
                </div>
                <span
                  className={`flex size-7 items-center justify-center rounded-full border ${
                    selected
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 bg-white text-transparent"
                  }`}
                >
                  <Check className="size-4" />
                </span>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="truncate text-lg font-semibold text-black">
                  {analysis.title}
                </h3>
                <span className="text-2xl font-semibold text-black">
                  {analysis.score}
                </span>
              </div>

              <div className="h-2 rounded-full bg-neutral-100">
                <div
                  className="h-2 rounded-full bg-black"
                  style={{ width: `${analysis.score}%` }}
                />
              </div>

              <p className="mt-4 min-h-10 text-sm leading-5 text-neutral-500">
                {analysis.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600">
                  <Sparkles className="size-3" />
                  {analysis.confidence}
                </span>
                {analysis.tags.map((tag) => (
                  <span
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-4 space-y-1 text-xs text-neutral-500">
                {analysis.reasons.map((reason) => (
                  <div className="flex items-center gap-2" key={reason}>
                    <BarChart3 className="size-3" />
                    {reason}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
