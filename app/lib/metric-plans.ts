import type { SelectedCollectionContext } from "./collection-analysis";
import type { DataCatalog } from "./data-catalog";

export type MetricVisualization =
  | "bar_chart"
  | "funnel"
  | "kpi"
  | "leaderboard"
  | "line_chart"
  | "progress"
  | "streak"
  | "table";

export type MetricPlan = {
  aggregation: "average" | "count" | "max" | "min" | "sum";
  assumptions: string[];
  confidence: number;
  description: string;
  dimensions: string[];
  filters: Array<{ field: string; operator: "==" | "!=" | ">" | "<" | "in"; value: string }>;
  id: string;
  joins: Array<{ from: string; to: string; confidence: number }>;
  measure: string;
  sourceCollections: string[];
  title: string;
  visualization: MetricVisualization;
};

export type MetricPlanResult = {
  plans: MetricPlan[];
  provider: "fallback" | "gemini";
};

function fieldPath(collection: string, field?: string) {
  return field ? `${collection}.${field}` : collection;
}

export function fallbackMetricPlans(
  contexts: SelectedCollectionContext[],
  catalog?: DataCatalog,
): MetricPlan[] {
  const relationships = catalog?.relationships ?? [];

  return contexts.flatMap(({ analysis, sample }, index) => {
    const measures =
      catalog?.measures
        .filter((measure) => measure.collection === sample.path)
        .map((measure) => measure.field) ?? [];
    const dimensions =
      catalog?.dimensions
        .filter((dimension) => dimension.collection === sample.path)
        .map((dimension) => dimension.field) ?? [];
    const timestamps =
      catalog?.timestamps
        .filter((timestamp) => timestamp.collection === sample.path)
        .map((timestamp) => timestamp.field) ?? [];
    const measure = fieldPath(sample.path, measures[0]);
    const dimension = fieldPath(sample.path, dimensions[0] || timestamps[0] || "id");
    const base = {
      assumptions: analysis.reasons,
      confidence: Math.min(0.95, Math.max(0.35, analysis.score / 100)),
      filters: [],
      joins: relationships
        .filter(
          (relationship) =>
            relationship.fromCollection === sample.path ||
            relationship.toCollection === sample.path,
        )
        .slice(0, 3)
        .map((relationship) => ({
          confidence: relationship.confidence,
          from: `${relationship.fromCollection}.${relationship.fromField}`,
          to: `${relationship.toCollection}.${relationship.toField}`,
        })),
      sourceCollections: [sample.path],
    } satisfies Pick<MetricPlan, "assumptions" | "confidence" | "filters" | "joins" | "sourceCollections">;

    return [
      {
        ...base,
        aggregation: measures[0] ? "sum" as const : "count" as const,
        description: `Track ${analysis.title} performance by ${dimensions[0] || "record"}.`,
        dimensions: [dimension],
        id: `metric-${index}-summary`,
        measure,
        title: `${analysis.title} Summary`,
        visualization: measures[0] ? "bar_chart" as const : "table" as const,
      },
      {
        ...base,
        aggregation: "count" as const,
        description: `Trend ${analysis.title} activity over time.`,
        dimensions: timestamps[0] ? [fieldPath(sample.path, timestamps[0])] : [dimension],
        id: `metric-${index}-trend`,
        measure: fieldPath(sample.path),
        title: `${analysis.title} Activity Trend`,
        visualization: timestamps[0] ? "line_chart" as const : "bar_chart" as const,
      },
    ];
  }).slice(0, 10);
}
