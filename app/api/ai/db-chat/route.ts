import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import type { SelectedCollectionContext } from "../../../lib/collection-analysis";
import type { DataCatalog } from "../../../lib/data-catalog";

const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-09-2025";

type DbChatResponse = {
  answer: string;
  command: {
    collections: string[];
    fields: string[];
    filters: string[];
    intent: string;
    limit: number;
  };
  evidence: string[];
  provider: "fallback" | "gemini";
};

function trimValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return `[array:${value.length}]`;
  if (typeof value === "object") return "{object}";
  if (typeof value === "string") return value.slice(0, 120);
  return value;
}

function sanitizeCatalog(catalog?: DataCatalog) {
  if (!catalog) return undefined;
  return {
    dimensions: catalog.dimensions.slice(0, 80),
    entities: catalog.entities.map((entity) => ({
      collection: entity.collection,
      entityRole: entity.entityRole,
      fields: entity.fields.slice(0, 50).map((field) => ({
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

function sanitizeContexts(
  contexts: SelectedCollectionContext[],
  selectedCollection: string,
) {
  const selected = contexts.filter(
    (context) => context.sample.path === selectedCollection,
  );
  const related = contexts.filter(
    (context) => context.sample.path !== selectedCollection,
  );

  return [...selected, ...related].slice(0, 8).map(({ analysis, sample }) => ({
    analysis,
    sample: {
      count: sample.count,
      fields: sample.fields.slice(0, 80),
      path: sample.path,
      rows: sample.rows.slice(0, selectedCollection === sample.path ? 8 : 3).map((row) =>
        Object.fromEntries(
          Object.entries(row)
            .slice(0, 24)
            .map(([key, value]) => [key, trimValue(value)]),
        ),
      ),
    },
  }));
}

function fallbackAnswer(
  collection: string,
  contexts: SelectedCollectionContext[],
  question: string,
): DbChatResponse {
  const context = contexts.find((item) => item.sample.path === collection);
  const fields = context?.sample.fields.slice(0, 8) ?? [];

  return {
    answer: context
      ? `I found ${context.sample.count} sampled documents in ${collection}. Useful fields include ${fields.join(", ") || "no sampled fields"}.`
      : `I could not find sampled rows for ${collection}, so I can only answer from the catalog.`,
    command: {
      collections: [collection],
      fields,
      filters: [],
      intent: question,
      limit: 8,
    },
    evidence: [
      context
        ? `${collection} sample has ${context.sample.fields.length} fields.`
        : "No selected sample context was provided.",
    ],
    provider: "fallback",
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    catalog?: DataCatalog;
    collection?: string;
    contexts?: SelectedCollectionContext[];
    question?: string;
  };
  const collection = body.collection || "";
  const contexts = body.contexts ?? [];
  const question = body.question?.trim() || "";

  if (!question || !collection) {
    return NextResponse.json(
      { error: "Question and collection are required." },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(fallbackAnswer(collection, contexts, question));
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            command: {
              type: Type.OBJECT,
              properties: {
                collections: { type: Type.ARRAY, items: { type: Type.STRING } },
                fields: { type: Type.ARRAY, items: { type: Type.STRING } },
                filters: { type: Type.ARRAY, items: { type: Type.STRING } },
                intent: { type: Type.STRING },
                limit: { type: Type.NUMBER },
              },
              required: ["collections", "fields", "filters", "intent", "limit"],
            },
            evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["answer", "command", "evidence"],
        },
        systemInstruction:
          "You are ProgressKit DB AI. Convert the user's question into a safe read-only retrieval plan, then answer using only the provided catalog and sampled rows. Do not invent fields. If live data is needed, say which read command should run next.",
      },
      contents: JSON.stringify({
        catalog: sanitizeCatalog(body.catalog),
        contexts: sanitizeContexts(contexts, collection),
        question,
        selectedCollection: collection,
      }),
      model,
    });
    const parsed = JSON.parse(response.text || "{}") as Partial<DbChatResponse>;

    return NextResponse.json({
      answer: parsed.answer || "I could not derive an answer from the provided sample.",
      command: {
        collections: parsed.command?.collections?.slice(0, 5) || [collection],
        fields: parsed.command?.fields?.slice(0, 12) || [],
        filters: parsed.command?.filters?.slice(0, 8) || [],
        intent: parsed.command?.intent || question,
        limit: Number(parsed.command?.limit ?? 8),
      },
      evidence: parsed.evidence?.slice(0, 5) || [],
      provider: "gemini",
    } satisfies DbChatResponse);
  } catch {
    return NextResponse.json(fallbackAnswer(collection, contexts, question));
  }
}
