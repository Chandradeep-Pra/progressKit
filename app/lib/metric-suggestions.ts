import type { SelectedCollectionContext } from "./collection-analysis";

export type MetricSuggestion = {
  collection: string;
  complexity: "Easy" | "Medium" | "Advanced";
  confidence: "High" | "Medium" | "Low";
  description: string;
  fields: string[];
  output: "chart" | "table" | "leaderboard" | "progress" | "funnel" | "streak";
  title: string;
  type: "progress" | "leaderboard" | "streak" | "activity" | "funnel" | "revenue" | "custom";
};

export type MetricSuggestionResult = {
  provider: "gemini" | "fallback";
  suggestions: MetricSuggestion[];
};

export function fallbackMetricSuggestions(
  contexts: SelectedCollectionContext[],
): MetricSuggestion[] {
  return contexts.flatMap(({ analysis, sample }) => {
    const collection = sample.path || analysis.title;
    const fields = sample.fields.filter((field) => field !== "id");
    const lowerFields = fields.map((field) => field.toLowerCase());
    const suggestions: MetricSuggestion[] = [];

    if (lowerFields.some((field) => /score|point|rank|progress/.test(field))) {
      suggestions.push({
        collection,
        complexity: "Easy",
        confidence: analysis.confidence,
        description: `Rank records in ${collection} by progress-like fields.`,
        fields: fields.filter((field) => /score|point|rank|progress|name|user/i.test(field)).slice(0, 4),
        output: "leaderboard",
        title: `${analysis.title} Leaderboard`,
        type: "leaderboard",
      });
    }

    if (lowerFields.some((field) => /created|updated|date|time|timestamp/.test(field))) {
      suggestions.push({
        collection,
        complexity: "Easy",
        confidence: analysis.confidence,
        description: `Track activity volume over time for ${collection}.`,
        fields: fields.filter((field) => /created|updated|date|time|timestamp|status/i.test(field)).slice(0, 4),
        output: "chart",
        title: `${analysis.title} Activity Trend`,
        type: "activity",
      });
    }

    if (lowerFields.some((field) => /amount|price|revenue|paid|payment|total/.test(field))) {
      suggestions.push({
        collection,
        complexity: "Medium",
        confidence: analysis.confidence,
        description: `Summarize revenue and payment signals from ${collection}.`,
        fields: fields.filter((field) => /amount|price|revenue|paid|payment|total|created/i.test(field)).slice(0, 4),
        output: "chart",
        title: `${analysis.title} Revenue Insights`,
        type: "revenue",
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        collection,
        complexity: "Medium",
        confidence: analysis.confidence,
        description: `Explore tabular analytics from fields in ${collection}.`,
        fields: fields.slice(0, 4),
        output: "table",
        title: `${analysis.title} Summary Table`,
        type: "activity",
      });
    }

    return suggestions;
  }).slice(0, 9);
}
