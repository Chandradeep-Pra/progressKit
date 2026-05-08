import { Copy, Save, Trophy } from "lucide-react";

import { Button } from "./ui/button";

const leaders = [
  ["Ava", "98", "w-[98%]"],
  ["Noah", "86", "w-[86%]"],
  ["Mia", "74", "w-[74%]"],
];

type GeneratedPreviewProps = {
  metricTitle: string;
};

export function GeneratedPreview({ metricTitle }: GeneratedPreviewProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-[0_22px_64px_rgba(20,20,20,0.08)] sm:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 p-1">
            {["Preview", "Query", "Component", "Setup"].map((tab, index) => (
              <span
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  index === 0 ? "bg-white text-black shadow-sm" : "text-neutral-500"
                }`}
                key={tab}
              >
                {tab}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
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

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500">Preview</p>
                <h2 className="text-2xl font-semibold text-black">
                  {metricTitle}
                </h2>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-black text-white">
                <Trophy className="size-5" />
              </div>
            </div>
            <div className="space-y-3">
              {leaders.map(([name, score, width], index) => (
                <div
                  className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                  key={name}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-black">
                      {index + 1}. {name}
                    </span>
                    <span className="text-sm font-semibold text-black">{score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100">
                    <div className={`h-2 rounded-full bg-black ${width}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-black p-5 text-white">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Generated logic</h2>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                mock
              </span>
            </div>
            <pre className="overflow-x-auto rounded-2xl bg-white/[0.06] p-4 text-sm leading-7 text-neutral-200">
{`const metric = collection("users")
  .where("completed", "==", true)
  .orderBy("progress", "desc")
  .limit(10);

return createLeaderboard(metric);`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
