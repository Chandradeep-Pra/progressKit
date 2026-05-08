import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import type { SelectedCollectionContext } from "../../../lib/collection-analysis";
import type { DataCatalog } from "../../../lib/data-catalog";
import {
  fallbackMetricPlans,
  MetricPlan,
} from "../../../lib/metric-plans";

const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-09-2025";

function sanitizeCatalog(catalog?: DataCatalog) {
  if (!catalog) return undefined;
  return {
    dimensions: catalog.dimensions.slice(0, 80),
    entities: catalog.entities.map((entity) => ({
      collection: entity.collection,
      entityRole: entity.entityRole,
      fields: entity.fields.slice(0, 40).map((field) => ({
        examples: field.examples.slice(0, 3),
        kind: field.kind,
        name: field.name,
        roles: field.roles,
      })),
      score: entity.score,
    })),
    measures: catalog.measures.slice(0, 80),
    relationships: catalog.relationships.slice(0, 50),
    timestamps: catalog.timestamps.slice(0, 80),
  };
}

function sanitizeContexts(contexts: SelectedCollectionContext[]) {
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
            if (typeof value === "string") return [key, value.slice(0, 80)];
            return [key, value];
          }),
        ),
      ),
    },
  }));
}

function normalizePlan(plan: Partial<MetricPlan>, fallback: MetricPlan, index: number): MetricPlan {
  return {
    aggregation:
      plan.aggregation === "average" ||
      plan.aggregation === "count" ||
      plan.aggregation === "max" ||
      plan.aggregation === "min" ||
      plan.aggregation === "sum"
        ? plan.aggregation
        : fallback.aggregation,
    assumptions: Array.isArray(plan.assumptions) ? plan.assumptions.slice(0, 4) : fallback.assumptions,
    confidence: Math.max(0, Math.min(1, Number(plan.confidence ?? fallback.confidence))),
    description: plan.description || fallback.description,
    dimensions: Array.isArray(plan.dimensions) ? plan.dimensions.slice(0, 4) : fallback.dimensions,
    filters: Array.isArray(plan.filters) ? plan.filters.slice(0, 5) as MetricPlan["filters"] : fallback.filters,
    id: plan.id || fallback.id || `metric-${index}`,
    joins: Array.isArray(plan.joins) ? plan.joins.slice(0, 5) as MetricPlan["joins"] : fallback.joins,
    measure: plan.measure || fallback.measure,
    sourceCollections: Array.isArray(plan.sourceCollections)
      ? plan.sourceCollections.slice(0, 5)
      : fallback.sourceCollections,
    title: plan.title || fallback.title,
    visualization:
      plan.visualization === "bar_chart" ||
      plan.visualization === "funnel" ||
      plan.visualization === "kpi" ||
      plan.visualization === "leaderboard" ||
      plan.visualization === "line_chart" ||
      plan.visualization === "progress" ||
      plan.visualization === "streak" ||
      plan.visualization === "table"
        ? plan.visualization
        : fallback.visualization,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    catalog?: DataCatalog;
    contexts?: SelectedCollectionContext[];
    customPrompt?: string;
  };
  const contexts = body.contexts ?? [];
  const fallback = fallbackMetricPlans(contexts, body.catalog);

  if (!process.env.GEMINI_API_KEY || contexts.length === 0) {
    return NextResponse.json({ plans: fallback, provider: "fallback" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plans: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  aggregation: { type: Type.STRING, enum: ["average", "count", "max", "min", "sum"] },
                  assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  confidence: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  dimensions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  filters: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        field: { type: Type.STRING },
                        operator: { type: Type.STRING, enum: ["==", "!=", ">", "<", "in"] },
                        value: { type: Type.STRING },
                      },
                    },
                  },
                  id: { type: Type.STRING },
                  joins: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        confidence: { type: Type.NUMBER },
                        from: { type: Type.STRING },
                        to: { type: Type.STRING },
                      },
                    },
                  },
                  measure: { type: Type.STRING },
                  sourceCollections: { type: Type.ARRAY, items: { type: Type.STRING } },
                  title: { type: Type.STRING },
                  visualization: {
                    type: Type.STRING,
                    enum: ["bar_chart", "funnel", "kpi", "leaderboard", "line_chart", "progress", "streak", "table"],
                  },
                },
                required: ["aggregation", "assumptions", "confidence", "description", "dimensions", "filters", "id", "joins", "measure", "sourceCollections", "title", "visualization"],
              },
            },
          },
          required: ["plans"],
        },
        systemInstruction:
          "Create high-quality analytics metric plans from a semantic data catalog. Prefer multi-entity metrics when relationships are confident. Use only provided collections and fields. Each plan must be executable later and explain assumptions.",
      },
      contents: JSON.stringify({
        catalog: sanitizeCatalog(body.catalog),
        contexts: sanitizeContexts(contexts),
        customPrompt: body.customPrompt || "",
        instructions:
          "Return 6-10 metric plans. If customPrompt exists, put a matching custom plan first.",
      }),
      model,
    });
    const parsed = JSON.parse(response.text || "{}") as { plans?: Partial<MetricPlan>[] };
    const plans = (parsed.plans ?? [])
      .slice(0, 10)
      .map((plan, index) => normalizePlan(plan, fallback[index] || fallback[0], index));

    return NextResponse.json({ plans: plans.length ? plans : fallback, provider: "gemini" });
  } catch {
    return NextResponse.json({ plans: fallback, provider: "fallback" });
  }
}
