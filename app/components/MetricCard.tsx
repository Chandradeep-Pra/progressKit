import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { Button } from "./ui/button";

type MetricCardProps = {
  description: string;
  icon: ComponentType<LucideProps>;
  onGenerate: () => void;
  tags: string[];
  title: string;
};

export function MetricCard({
  description,
  icon: Icon,
  onGenerate,
  tags,
  title,
}: MetricCardProps) {
  return (
    <article className="group rounded-2xl border border-neutral-200 bg-white/75 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[0_20px_48px_rgba(20,20,20,0.09)]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-neutral-200 bg-[#fbfaf7]">
          <Icon className="size-5 text-black" />
        </div>
        <ArrowRight className="size-4 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-black" />
      </div>
      <h3 className="text-lg font-semibold text-black">{title}</h3>
      <p className="mt-2 min-h-10 text-sm leading-5 text-neutral-500">
        {description}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
      <Button className="mt-5 h-10 w-full" onClick={onGenerate} variant="secondary">
        Generate
      </Button>
    </article>
  );
}
