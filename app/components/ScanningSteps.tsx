import { Check, Circle, Loader2 } from "lucide-react";

const steps = ["Connecting", "Fetching schema", "Sampling data", "Finding metrics"];

type ScanningStepsProps = {
  activeStep: number;
};

export function ScanningSteps({ activeStep }: ScanningStepsProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Loader2 className="mb-4 size-7 animate-spin text-black" />
            <h2 className="text-2xl font-semibold text-black">Reading collections</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const isDone = index < activeStep;
              const isActive = index === activeStep;

              return (
              <div
                className={`flex min-w-40 items-center gap-3 rounded-2xl border p-3 shadow-sm transition-all duration-300 ${
                  isActive
                    ? "border-black bg-white"
                    : "border-neutral-200 bg-white/80"
                }`}
                key={step}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                  {isActive ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isDone ? (
                    <Check className="size-4" />
                  ) : (
                    <Circle className="size-4 text-neutral-300" />
                  )}
                </span>
                <span className="text-sm font-medium text-black">{step}</span>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
