import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import {
  analyzeCollection,
  CollectionAnalysis,
  CollectionSample,
} from "../../../lib/collection-analysis";

const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-09-2025";

function fallback(samples: CollectionSample[]) {
  return samples.map(analyzeCollection).sort((a, b) => b.score - a.score);
}

function normalizeAnalysis(
  analysis: Partial<CollectionAnalysis>,
  sample: CollectionSample,
): CollectionAnalysis {
  const deterministic = analyzeCollection(sample);
  const score = Math.max(0, Math.min(100, Number(analysis.score ?? deterministic.score)));
  const confidence =
    analysis.confidence === "High" ||
    analysis.confidence === "Medium" ||
    analysis.confidence === "Low"
      ? analysis.confidence
      : deterministic.confidence;

  return {
    confidence,
    description: analysis.description || deterministic.description,
    reasons:
      Array.isArray(analysis.reasons) && analysis.reasons.length > 0
        ? analysis.reasons.slice(0, 3)
        : deterministic.reasons,
    score,
    tags:
      Array.isArray(analysis.tags) && analysis.tags.length > 0
        ? analysis.tags.slice(0, 4)
        : deterministic.tags,
    title: analysis.title || deterministic.title,
  };
}

function sanitizeRows(rows: Record<string, unknown>[]) {
  return rows.slice(0, 3).map((row) =>
    Object.fromEntries(
      Object.entries(row).slice(0, 12).map(([key, value]) => {
        if (value === null) {
          return [key, null];
        }

        if (Array.isArray(value)) {
          return [key, `[array:${value.length}]`];
        }

        if (typeof value === "object") {
          return [key, "{object}"];
        }

        if (typeof value === "string") {
          return [key, value.length > 80 ? `${value.slice(0, 80)}...` : value];
        }

        return [key, value];
      }),
    ),
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { samples?: CollectionSample[] };
  const samples = body.samples ?? [];

  if (samples.length === 0) {
    return NextResponse.json({ analyses: [], provider: "fallback" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      analyses: fallback(samples),
      provider: "fallback",
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analyses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  confidence: {
                    type: Type.STRING,
                    enum: ["High", "Medium", "Low"],
                  },
                  description: { type: Type.STRING },
                  reasons: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  score: { type: Type.NUMBER },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  title: { type: Type.STRING },
                },
                required: ["confidence", "description", "reasons", "score", "tags", "title"],
              },
            },
          },
          required: ["analyses"],
        },
        systemInstruction:
          "You analyze database collections for analytics value. Score each collection 0-100 for usefulness in progress tracking, activity analytics, leaderboards, funnels, retention, or revenue insights. Penalize admin/config/role/token collections unless they contain meaningful events. Keep descriptions short.",
      },
      contents: JSON.stringify({
        instructions:
          "Return one analysis for every collection. Use the collection path as title. Base the result only on sampled fields and rows.",
        samples: samples.map((sample) => ({
          count: sample.count,
          fields: sample.fields,
          path: sample.path,
          rows: sanitizeRows(sample.rows),
        })),
      }),
      model,
    });

    const parsed = JSON.parse(response.text || "{}") as {
      analyses?: Partial<CollectionAnalysis>[];
    };
    const analyses = samples
      .map((sample, index) => normalizeAnalysis(parsed.analyses?.[index] ?? {}, sample))
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ analyses, provider: "gemini" });
  } catch {
    return NextResponse.json({
      analyses: fallback(samples),
      provider: "fallback",
    });
  }
}
