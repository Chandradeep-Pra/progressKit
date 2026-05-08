import {
  ArrowRight,
  BarChart3,
  Database,
  LineChart,
  ShieldCheck,
} from "lucide-react";

import { Button } from "./ui/button";

const previewRows = [
  { name: "Activation", value: "84%", width: "w-[84%]" },
  { name: "Lessons", value: "67%", width: "w-[67%]" },
  { name: "Revenue", value: "$18k", width: "w-[73%]" },
];

type HeroProps = {
  onConnect: () => void;
  onDemo: () => void;
};

export function Hero({ onConnect, onDemo }: HeroProps) {
  return (
    <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:pb-20 lg:pt-14">
      <div className="max-w-2xl">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm">
          <span className="size-1.5 rounded-full bg-black" />
          AI analytics layer
        </div>
        <h1 className="max-w-[760px] text-5xl font-semibold leading-[1.02] tracking-normal text-black sm:text-6xl lg:text-7xl">
          Connect data. Generate progress.
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-neutral-600 sm:text-lg">
          One-click metrics, leaderboards, and insights.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={onConnect}>
            Connect Firebase
            <ArrowRight className="size-4" />
          </Button>
          <Button onClick={onDemo} variant="secondary">
            View demo
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-5 rounded-[2rem] bg-white/50 blur-2xl" />
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-[0_24px_70px_rgba(20,20,20,0.10)] backdrop-blur">
          <div className="rounded-[1.25rem] border border-neutral-200 bg-[#fbfaf7] p-4">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">Workspace</p>
                <p className="text-lg font-semibold text-black">Live metrics</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium">
                <ShieldCheck className="size-3.5" />
                Read-only
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Users", "12.8k", Database],
                ["Growth", "+28%", LineChart],
                ["Score", "91", BarChart3],
              ].map(([label, value, Icon]) => (
                <div
                  className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                  key={label as string}
                >
                  <Icon className="mb-4 size-4 text-neutral-500" />
                  <p className="text-xs text-neutral-500">{label as string}</p>
                  <p className="mt-1 text-2xl font-semibold text-black">
                    {value as string}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-black">Generated board</p>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                  real-time
                </span>
              </div>
              <div className="space-y-3">
                {previewRows.map((row) => (
                  <div
                    className="grid grid-cols-[90px_1fr_44px] items-center gap-3"
                    key={row.name}
                  >
                    <span className="text-xs text-neutral-500">{row.name}</span>
                    <div className="h-2 rounded-full bg-neutral-100">
                      <div className={`h-2 rounded-full bg-black ${row.width}`} />
                    </div>
                    <span className="text-right text-xs font-medium text-black">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
