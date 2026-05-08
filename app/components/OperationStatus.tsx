import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export type OperationStatusState = {
  detail?: string;
  state: "idle" | "running" | "success" | "error";
  title: string;
};

type OperationStatusProps = {
  status: OperationStatusState;
};

export function OperationStatus({ status }: OperationStatusProps) {
  if (status.state === "idle") {
    return null;
  }

  const Icon =
    status.state === "running"
      ? Loader2
      : status.state === "success"
        ? CheckCircle2
        : AlertCircle;

  return (
    <div
      className={`mx-auto mt-4 w-full max-w-7xl px-5 sm:px-8 ${
        status.state === "error" ? "text-red-700" : "text-neutral-700"
      }`}
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 text-sm shadow-sm ${
          status.state === "error"
            ? "border-red-200 bg-red-50"
            : "border-neutral-200 bg-white/75"
        }`}
      >
        <Icon
          className={`mt-0.5 size-4 shrink-0 ${
            status.state === "running" ? "animate-spin text-black" : ""
          }`}
        />
        <div>
          <p className="font-medium text-black">{status.title}</p>
          {status.detail && <p className="mt-1 text-xs">{status.detail}</p>}
        </div>
      </div>
    </div>
  );
}
