export type CollectionSample = {
  count: number;
  fields: string[];
  path: string;
  rows: Record<string, unknown>[];
};

export type CollectionAnalysis = {
  confidence: "High" | "Medium" | "Low";
  description: string;
  reasons: string[];
  score: number;
  tags: string[];
  title: string;
};

export type AiCollectionAnalysisResult = {
  analyses: CollectionAnalysis[];
  provider: "gemini" | "fallback";
};

export type SelectedCollectionContext = {
  analysis: CollectionAnalysis;
  sample: CollectionSample;
};

export function buildSelectedCollectionContext(
  analyses: CollectionAnalysis[],
  sampleMap: Record<string, CollectionSample>,
  selectedCollections: string[],
) {
  return analyses
    .filter((analysis) => selectedCollections.includes(analysis.title))
    .map((analysis) => ({
      analysis,
      sample:
        sampleMap[analysis.title] ||
        Object.values(sampleMap).find(
          (sample) => sample.path.split("/").filter(Boolean).at(-1) === analysis.title,
        ) ||
        {
          count: 0,
          fields: [],
          path: analysis.title,
          rows: [],
        },
    }));
}

const analyticsKeywords = [
  "activity",
  "amount",
  "appointment",
  "completed",
  "created",
  "event",
  "order",
  "paid",
  "payment",
  "progress",
  "revenue",
  "score",
  "session",
  "status",
  "streak",
  "total",
  "updated",
  "user",
];

const lowValueKeywords = [
  "admin",
  "config",
  "permission",
  "role",
  "setting",
  "token",
];

function normalizeWords(values: string[]) {
  return values.map((value) => value.toLowerCase());
}

function hasAny(values: string[], keywords: string[]) {
  return values.some((value) =>
    keywords.some((keyword) => value.includes(keyword)),
  );
}

function inferDescription(tags: string[]) {
  if (tags.includes("Revenue")) {
    return "Good for payment, revenue, and conversion analytics.";
  }

  if (tags.includes("Progress")) {
    return "Good for progress, completion, and leaderboard metrics.";
  }

  if (tags.includes("Activity")) {
    return "Good for usage, activity, and trend analysis.";
  }

  if (tags.includes("Identity")) {
    return "Useful as a supporting user dimension.";
  }

  return "Limited analytics signal in the sampled fields.";
}

export function analyzeCollection(sample: CollectionSample): CollectionAnalysis {
  const collectionName = sample.path.split("/").filter(Boolean).at(-1) ?? sample.path;
  const words = normalizeWords([collectionName, ...sample.fields]);
  const tags = new Set<string>();
  const reasons: string[] = [];
  let score = 20;

  if (sample.count > 0) {
    score += 15;
    reasons.push(`${sample.count} sampled documents`);
  } else {
    reasons.push("No sampled documents");
  }

  if (sample.fields.length >= 4) {
    score += 15;
    reasons.push(`${sample.fields.length} fields detected`);
  }

  if (hasAny(words, ["created", "updated", "date", "time", "timestamp"])) {
    score += 15;
    tags.add("Activity");
    reasons.push("time fields found");
  }

  if (hasAny(words, ["progress", "score", "points", "rank", "completed", "streak"])) {
    score += 20;
    tags.add("Progress");
    reasons.push("progress fields found");
  }

  if (hasAny(words, ["amount", "price", "revenue", "paid", "payment", "order"])) {
    score += 20;
    tags.add("Revenue");
    reasons.push("money fields found");
  }

  if (hasAny(words, ["user", "email", "name", "profile", "customer"])) {
    score += 10;
    tags.add("Identity");
    reasons.push("identity fields found");
  }

  if (hasAny(words, analyticsKeywords)) {
    score += 10;
  }

  if (hasAny(words, lowValueKeywords)) {
    score -= 35;
    tags.add("Low signal");
    reasons.push("admin/config fields lower analytics value");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const finalTags = Array.from(tags);

  return {
    confidence: finalScore >= 70 ? "High" : finalScore >= 45 ? "Medium" : "Low",
    description: inferDescription(finalTags),
    reasons: reasons.slice(0, 3),
    score: finalScore,
    tags: finalTags.length > 0 ? finalTags : ["Explore"],
    title: collectionName,
  };
}
