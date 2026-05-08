import { FormEvent, useState } from "react";
import {
  Activity,
  BarChart3,
  Flame,
  GitBranch,
  ListChecks,
  Plus,
  TableProperties,
  Trophy,
} from "lucide-react";

import type { MetricSuggestion } from "../lib/metric-suggestions";
import type { SelectedCollectionContext } from "../lib/collection-analysis";
import { MetricWorkspace } from "./MetricWorkspace";
import { Button } from "./ui/button";

type MetricSuggestionBoardProps = {
  contexts: SelectedCollectionContext[];
  isLoading: boolean;
  onAddCustom: (prompt: string) => void;
  onSelect: (suggestion: MetricSuggestion) => void;
  provider: "gemini" | "fallback";
  selectedSuggestion?: MetricSuggestion;
  suggestions: MetricSuggestion[];
};

const icons = {
  activity: Activity,
  custom: Plus,
  funnel: GitBranch,
  leaderboard: Trophy,
  progress: BarChart3,
  revenue: TableProperties,
  streak: Flame,
};

export function MetricSuggestionBoard({
  contexts,
  isLoading,
  onAddCustom,
  onSelect,
  provider,
  selectedSuggestion,
  suggestions,
}: MetricSuggestionBoardProps) {
  const [customPrompt, setCustomPrompt] = useState("");

  const submitCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (customPrompt.trim()) {
      onAddCustom(customPrompt.trim());
      setCustomPrompt("");
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="grid min-h-[680px] overflow-hidden rounded-2xl border border-neutral-200 bg-white/75 shadow-[0_22px_64px_rgba(20,20,20,0.08)] lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-neutral-200 bg-[#fbfaf7] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase text-neutral-500">
              Metric builder
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-black">
              Suggested metrics
            </h2>
            <p className="mt-2 text-xs text-neutral-500">
              {provider === "gemini" ? "Gemini generated" : "Fallback suggestions"}
            </p>
          </div>

          <form
            className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
            onSubmit={submitCustom}
          >
            <label className="text-xs font-medium text-neutral-500">
              Add custom metric
            </label>
            <textarea
              className="mt-2 min-h-20 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm text-black outline-none transition focus:border-black"
              onChange={(event) => setCustomPrompt(event.target.value)}
              placeholder="Weekly appointment completion by doctor"
              value={customPrompt}
            />
            <Button
              className="mt-3 h-10 w-full"
              disabled={isLoading || !customPrompt.trim()}
              type="submit"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </form>

          {isLoading && (
            <div className="mb-3 rounded-2xl border border-neutral-200 bg-white p-3 text-xs text-neutral-600 shadow-sm">
              Gemini is generating metric possibilities.
            </div>
          )}

          <div className="space-y-2">
            {suggestions.map((suggestion) => {
              const Icon = icons[suggestion.type] || ListChecks;

              return (
                <button
                  className="w-full rounded-2xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition hover:border-black"
                  key={`${suggestion.title}-${suggestion.collection}`}
                  onClick={() => onSelect(suggestion)}
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-[#fbfaf7]">
                      <Icon className="size-4 text-black" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-black">
                          {suggestion.title}
                        </h3>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                          {suggestion.confidence}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">
                        {suggestion.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[suggestion.output, suggestion.complexity]
                          .filter(Boolean)
                          .map((tag) => (
                            <span
                              className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
                              key={tag}
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-h-[640px] bg-white/50">
          {selectedSuggestion ? (
            <MetricWorkspace contexts={contexts} suggestion={selectedSuggestion} />
          ) : (
            <div className="flex min-h-[640px] items-center justify-center p-6">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-neutral-200 bg-[#fbfaf7]">
                  <BarChart3 className="size-6 text-black" />
                </div>
                <h3 className="text-2xl font-semibold text-black">
                  Generate a metric
                </h3>
                <p className="mt-3 text-sm leading-6 text-neutral-500">
                  Select a suggested metric from the left panel or add a custom one.
                  The generated preview, query, and component will appear here.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
