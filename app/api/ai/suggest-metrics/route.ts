import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import type { SelectedCollectionContext } from "../../../lib/collection-analysis";
import type { DataCatalog } from "../../../lib/data-catalog";
import {
  fallbackMetricSuggestions,
  MetricSuggestion,
} from "../../../lib/metric-suggestions";

const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-09-2025";

function sanitizeContext(contexts: SelectedCollectionContext[]) {
  return contexts.map(({ analysis, sample }) => ({
    analysis,
    sample: {
      count: sample.count,
      fields: sample.fields,
      path: sample.path,
      rows: sample.rows.slice(0, 3).map((row) =>
        Object.fromEntries(
          Object.entries(row).slice(0, 10).map(([key, value]) => {
            if (value === null) return [key, null];
            if (Array.isArray(value)) return [key, `[array:${value.length}]`];
            if (typeof value === "object") return [key, "{object}"];
            if (typeof value === "string") {
              return [key, value.length > 80 ? `${value.slice(0, 80)}...` : value];
            }
            return [key, value];
          }),
        ),
      ),
    },
  }));
}

function sanitizeCatalog(catalog?: DataCatalog) {
  if (!catalog) return undefined;

  return {
    dimensions: catalog.dimensions.slice(0, 60),
    entities: catalog.entities.map((entity) => ({
      collection: entity.collection,
      entityRole: entity.entityRole,
      fields: entity.fields.slice(0, 40).map((field) => ({
        cardinality: field.cardinality,
        examples: field.examples.slice(0, 3),
        kind: field.kind,
        name: field.name,
        roles: field.roles,
      })),
      rowCount: entity.rowCount,
      score: entity.score,
    })),
    measures: catalog.measures.slice(0, 60),
    relationships: catalog.relationships.slice(0, 30),
    timestamps: catalog.timestamps.slice(0, 60),
  };
}

function normalizeSuggestion(
  suggestion: Partial<MetricSuggestion>,
  fallback: MetricSuggestion,
): MetricSuggestion {
  return {
    collection: suggestion.collection || fallback.collection,
    complexity:
      suggestion.complexity === "Easy" ||
      suggestion.complexity === "Medium" ||
      suggestion.complexity === "Advanced"
        ? suggestion.complexity
        : fallback.complexity,
    confidence:
      suggestion.confidence === "High" ||
      suggestion.confidence === "Medium" ||
      suggestion.confidence === "Low"
        ? suggestion.confidence
        : fallback.confidence,
    description: suggestion.description || fallback.description,
    fields: Array.isArray(suggestion.fields) ? suggestion.fields.slice(0, 5) : fallback.fields,
    output:
      suggestion.output === "chart" ||
      suggestion.output === "table" ||
      suggestion.output === "leaderboard" ||
      suggestion.output === "progress" ||
      suggestion.output === "funnel" ||
      suggestion.output === "streak"
        ? suggestion.output
        : fallback.output,
    title: suggestion.title || fallback.title,
    type:
      suggestion.type === "progress" ||
      suggestion.type === "leaderboard" ||
      suggestion.type === "streak" ||
      suggestion.type === "activity" ||
      suggestion.type === "funnel" ||
      suggestion.type === "revenue" ||
      suggestion.type === "custom"
        ? suggestion.type
        : fallback.type,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    catalog?: DataCatalog;
    contexts?: SelectedCollectionContext[];
    customPrompt?: string;
  };
  const contexts = body.contexts ?? [];
  const fallback = fallbackMetricSuggestions(contexts);

  if (contexts.length === 0) {
    return NextResponse.json({ provider: "fallback", suggestions: fallback });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ provider: "fallback", suggestions: fallback });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  collection: { type: Type.STRING },
                  complexity: {
                    type: Type.STRING,
                    enum: ["Easy", "Medium", "Advanced"],
                  },
                  confidence: {
                    type: Type.STRING,
                    enum: ["High", "Medium", "Low"],
                  },
                  description: { type: Type.STRING },
                  fields: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  output: {
                    type: Type.STRING,
                    enum: ["chart", "table", "leaderboard", "progress", "funnel", "streak"],
                  },
                  title: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    enum: ["progress", "leaderboard", "streak", "activity", "funnel", "revenue", "custom"],
                  },
                },
                required: [
                  "collection",
                  "complexity",
                  "confidence",
                  "description",
                  "fields",
                  "output",
                  "title",
                  "type",
                ],
              },
            },
          },
          required: ["suggestions"],
        },
        systemInstruction:
          "You suggest dashboard metrics that can be built from selected database collections. Use the collection analysis score, tags, fields, and samples. Suggest practical widgets such as progress trackers, leaderboards, streaks, charts, funnels, and tables. Include combinations across collections when useful, but only if fields suggest a relationship.",
      },
      contents: JSON.stringify({
        customPrompt: body.customPrompt || "",
        instructions:
          "Return 6-10 possible metrics. If customPrompt is present, include one matching custom metric first. Prefer the catalog semantic roles, relationships, measures, dimensions, timestamps, and entity roles over raw field names.",
        catalog: sanitizeCatalog(body.catalog),
        selectedCollections: sanitizeContext(contexts),
      }),
      model,
    });
    const parsed = JSON.parse(response.text || "{}") as {
      suggestions?: Partial<MetricSuggestion>[];
    };
    const suggestions = (parsed.suggestions ?? [])
      .slice(0, 10)
      .map((suggestion, index) =>
        normalizeSuggestion(suggestion, fallback[index] ?? fallback[0]),
      );

    return NextResponse.json({
      provider: "gemini",
      suggestions: suggestions.length > 0 ? suggestions : fallback,
    });
  } catch {
    return NextResponse.json({ provider: "fallback", suggestions: fallback });
  }
}
