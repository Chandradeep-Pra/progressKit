import { FormEvent, useState } from "react";
import { BarChart3, Bot, MessageSquare, Plus, SlidersHorizontal } from "lucide-react";

import type { MetricPlan } from "../lib/metric-plans";
import { Button } from "./ui/button";

type MetricCanvasProps = {
  isLoading: boolean;
  onAddCustom: (prompt: string) => void;
  onSelectPlan: (plan: MetricPlan) => void;
  plans: MetricPlan[];
  provider: "fallback" | "gemini";
  selectedPlan?: MetricPlan;
};

function confidenceLabel(confidence: number) {
  if (confidence >= 0.75) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

export function MetricCanvas({
  isLoading,
  onAddCustom,
  onSelectPlan,
  plans,
  provider,
  selectedPlan,
}: MetricCanvasProps) {
  const [prompt, setPrompt] = useState("");

  const submitCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    onAddCustom(prompt.trim());
    setPrompt("");
  };

  return (
    <section className="h-[calc(100vh-96px)] min-h-[760px] px-5 py-6 sm:px-8">
      <div className="grid h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white/75 shadow-[0_22px_64px_rgba(20,20,20,0.08)] xl:grid-cols-[320px_1fr_340px]">
        <aside className="overflow-auto border-b border-neutral-200 bg-[#fbfaf7] p-4 xl:border-b-0 xl:border-r">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase text-neutral-500">Metric plans</p>
            <h2 className="mt-2 text-2xl font-semibold text-black">Canvas</h2>
            <p className="mt-2 text-xs text-neutral-500">
              {provider === "gemini" ? "Gemini planned" : "Fallback planned"}
            </p>
          </div>

          <form className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm" onSubmit={submitCustom}>
            <label className="text-xs font-medium text-neutral-500">Add custom metric</label>
            <textarea
              className="mt-2 min-h-20 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm text-black outline-none transition focus:border-black"
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Compare appointment completion by doctor and week"
              value={prompt}
            />
            <Button className="mt-3 h-10 w-full" disabled={isLoading || !prompt.trim()} type="submit">
              <Plus className="size-4" />
              Add
            </Button>
          </form>

          {isLoading && (
            <div className="mb-3 rounded-2xl border border-neutral-200 bg-white p-3 text-xs text-neutral-600 shadow-sm">
              Gemini is planning executable metrics.
            </div>
          )}

          <div className="space-y-2">
            {plans.map((plan) => {
              const selected = selectedPlan?.id === plan.id;
              return (
                <button
                  className={`w-full rounded-2xl border bg-white p-3 text-left shadow-sm transition ${
                    selected ? "border-black" : "border-neutral-200 hover:border-black"
                  }`}
                  key={plan.id}
                  onClick={() => onSelectPlan(plan)}
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-[#fbfaf7]">
                      <BarChart3 className="size-4 text-black" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-black">{plan.title}</h3>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                          {confidenceLabel(plan.confidence)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">
                        {plan.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[plan.visualization, plan.aggregation].map((tag) => (
                          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600" key={tag}>
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

        <main className="relative overflow-auto bg-[#f7f4ee] p-6">
          <div className="absolute inset-0 bg-[linear-gradient(#e7e2d8_1px,transparent_1px),linear-gradient(90deg,#e7e2d8_1px,transparent_1px)] bg-[size:32px_32px] opacity-55" />
          <div className="relative grid gap-4 lg:grid-cols-2">
            {plans.map((plan) => (
              <button
                className={`min-h-56 rounded-2xl border bg-white/95 p-5 text-left shadow-sm transition hover:-translate-y-1 ${
                  selectedPlan?.id === plan.id ? "border-black" : "border-neutral-200"
                }`}
                key={`canvas-${plan.id}`}
                onClick={() => onSelectPlan(plan)}
                type="button"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-neutral-500">{plan.visualization}</p>
                    <h3 className="mt-2 text-xl font-semibold text-black">{plan.title}</h3>
                  </div>
                  <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                    {Math.round(plan.confidence * 100)}%
                  </span>
                </div>
                <p className="text-sm leading-6 text-neutral-500">{plan.description}</p>
                <div className="mt-5 space-y-2 text-xs text-neutral-600">
                  <p>Measure: {plan.measure}</p>
                  <p>Dimensions: {plan.dimensions.join(", ") || "none"}</p>
                  <p>Sources: {plan.sourceCollections.join(", ")}</p>
                </div>
              </button>
            ))}

            {plans.length === 0 && (
              <div className="col-span-full flex min-h-[560px] items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white">
                    <BarChart3 className="size-6 text-black" />
                  </div>
                  <h3 className="text-2xl font-semibold text-black">Metric canvas</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-500">
                    Gemini plans will appear here as editable analytics blocks.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="overflow-auto border-t border-neutral-200 bg-white p-4 xl:border-l xl:border-t-0">
          {selectedPlan ? (
            <div>
              <div className="mb-5 flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                <h3 className="font-semibold text-black">Inspector</h3>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-4">
                  <p className="text-xs text-neutral-500">Selected metric</p>
                  <p className="mt-1 font-semibold text-black">{selectedPlan.title}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{selectedPlan.description}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <p className="mb-3 text-sm font-semibold text-black">Plan</p>
                  <div className="space-y-2 text-sm text-neutral-600">
                    <p>Aggregation: {selectedPlan.aggregation}</p>
                    <p>Visualization: {selectedPlan.visualization}</p>
                    <p>Measure: {selectedPlan.measure}</p>
                    <p>Dimensions: {selectedPlan.dimensions.join(", ") || "none"}</p>
                    <p>Joins: {selectedPlan.joins.length}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquare className="size-4" />
                    <p className="text-sm font-semibold text-black">AI chat</p>
                  </div>
                  <div className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-500">
                    Ask for changes to this metric soon: filters, grouping, chart type, joins, or explanation.
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input className="h-10 min-w-0 flex-1 rounded-2xl border border-neutral-200 px-3 text-sm outline-none" placeholder="Make this weekly" />
                    <Button className="h-10 px-3">
                      <Bot className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-96 items-center justify-center text-center text-sm text-neutral-500">
              Select a metric on the canvas to inspect or chat.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
