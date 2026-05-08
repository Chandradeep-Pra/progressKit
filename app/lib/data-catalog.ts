import type { SelectedCollectionContext } from "./collection-analysis";

export type FieldKind =
  | "array"
  | "boolean"
  | "mixed"
  | "null"
  | "number"
  | "object"
  | "string"
  | "timestamp";

export type FieldRole =
  | "dimension"
  | "enum"
  | "id"
  | "measure"
  | "nested"
  | "reference"
  | "timestamp";

export type FieldProfile = {
  cardinality: number;
  examples: string[];
  kind: FieldKind;
  name: string;
  nullRate: number;
  roles: FieldRole[];
};

export type EntityProfile = {
  collection: string;
  entityRole: "config" | "content" | "event" | "identity" | "log" | "transaction" | "unknown";
  fields: FieldProfile[];
  rowCount: number;
  score: number;
};

export type RelationshipCandidate = {
  confidence: number;
  fromCollection: string;
  fromField: string;
  reason: string;
  toCollection: string;
  toField: string;
};

export type DataCatalog = {
  dimensions: Array<{ collection: string; field: string }>;
  entities: EntityProfile[];
  measures: Array<{ collection: string; field: string }>;
  relationships: RelationshipCandidate[];
  timestamps: Array<{ collection: string; field: string }>;
};

function valueKind(value: unknown): FieldKind {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object") return "object";
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return "timestamp";
  return "string";
}

function flattenValue(value: unknown, prefix = ""): Record<string, unknown[]> {
  if (Array.isArray(value)) {
    if (value.length === 0) return { [`${prefix}[]`]: [] };

    return value.reduce<Record<string, unknown[]>>((acc, item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const nested = flattenValue(item, `${prefix}[]`);
        Object.entries(nested).forEach(([key, values]) => {
          acc[key] = [...(acc[key] || []), ...values];
        });
        return acc;
      }

      acc[`${prefix}[]`] = [...(acc[`${prefix}[]`] || []), item];
      return acc;
    }, {});
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown[]>>(
      (acc, [key, nestedValue]) => {
        const nestedPath = prefix ? `${prefix}.${key}` : key;
        const nested = flattenValue(nestedValue, nestedPath);
        Object.entries(nested).forEach(([nestedKey, values]) => {
          acc[nestedKey] = [...(acc[nestedKey] || []), ...values];
        });
        return acc;
      },
      {},
    );
  }

  return { [prefix]: [value] };
}

function flattenRows(rows: Record<string, unknown>[]) {
  return rows.reduce<Record<string, unknown[]>>((acc, row) => {
    const flattened = flattenValue(row);
    Object.entries(flattened).forEach(([key, values]) => {
      acc[key] = [...(acc[key] || []), ...values];
    });
    return acc;
  }, {});
}

function inferKind(values: unknown[]) {
  const kinds = Array.from(new Set(values.filter((value) => value !== undefined).map(valueKind)));
  if (kinds.length === 0) return "null";
  if (kinds.length === 1) return kinds[0];
  if (kinds.includes("timestamp") && kinds.every((kind) => kind === "timestamp" || kind === "null")) {
    return "timestamp";
  }
  return "mixed";
}

function inferRoles(name: string, kind: FieldKind, cardinality: number): FieldRole[] {
  const lower = name.toLowerCase();
  const roles = new Set<FieldRole>();
  if (lower === "id" || lower.endsWith(".id")) roles.add("id");
  if (/(^|\.|_)id$|ref$|userid|doctorid|productid|orderid|customerid|patientid/.test(lower)) roles.add("reference");
  if (kind === "number") roles.add("measure");
  if (kind === "timestamp" || /created|updated|date|time|timestamp/.test(lower)) roles.add("timestamp");
  if (name.includes(".") || name.includes("[]")) roles.add("nested");
  if (cardinality <= 12 && ["string", "boolean"].includes(kind)) roles.add("enum");
  if (["string", "boolean"].includes(kind)) roles.add("dimension");
  return Array.from(roles);
}

function inferEntityRole(collection: string, fields: FieldProfile[]) {
  const lower = `${collection} ${fields.map((field) => field.name).join(" ")}`.toLowerCase();
  if (/setting|config|admin|role|permission|token/.test(lower)) return "config";
  if (/user|customer|patient|doctor|profile|member/.test(lower)) return "identity";
  if (/order|payment|invoice|subscription|transaction|amount|price/.test(lower)) return "transaction";
  if (/event|session|activity|log|history/.test(lower)) return "event";
  if (/post|course|lesson|product|content|article/.test(lower)) return "content";
  if (/log|debug|audit/.test(lower)) return "log";
  return "unknown";
}

function profileEntity(context: SelectedCollectionContext): EntityProfile {
  const flattened = flattenRows(context.sample.rows);
  const fields = Object.entries(flattened).map(([name, values]) => {
    const definedValues = values.filter((value) => value !== undefined && value !== null);
    const examples = Array.from(new Set(definedValues.map((value) => String(value)))).slice(0, 5);
    const kind = inferKind(values);
    const cardinality = new Set(definedValues.map((value) => JSON.stringify(value))).size;
    return {
      cardinality,
      examples,
      kind,
      name,
      nullRate: values.length > 0 ? 1 - definedValues.length / values.length : 1,
      roles: inferRoles(name, kind, cardinality),
    };
  });

  return {
    collection: context.sample.path,
    entityRole: inferEntityRole(context.sample.path, fields),
    fields,
    rowCount: context.sample.rows.length,
    score: context.analysis.score,
  };
}

function relationshipNameScore(fromField: string, toCollection: string) {
  const lowerField = fromField.toLowerCase().replace(/\[\]/g, "");
  const target = toCollection.split("/").at(-1)?.toLowerCase() || toCollection.toLowerCase();
  const singular = target.endsWith("s") ? target.slice(0, -1) : target;
  if (lowerField.includes(`${singular}id`) || lowerField.includes(`${target}id`)) return 0.55;
  if (lowerField.includes(singular) || lowerField.includes(target)) return 0.35;
  if (lowerField.endsWith("id") || lowerField.endsWith(".id")) return 0.18;
  return 0;
}

function fieldValues(context: SelectedCollectionContext, fieldName: string) {
  const flattened = flattenRows(context.sample.rows);
  return new Set((flattened[fieldName] || []).map((value) => String(value)));
}

function detectRelationships(contexts: SelectedCollectionContext[], entities: EntityProfile[]) {
  const relationships: RelationshipCandidate[] = [];

  entities.forEach((source) => {
    source.fields
      .filter((field) => field.roles.includes("reference") || field.name.toLowerCase().endsWith("id"))
      .forEach((field) => {
        const sourceContext = contexts.find((context) => context.sample.path === source.collection);
        if (!sourceContext) return;
        const sourceValues = fieldValues(sourceContext, field.name);
        if (sourceValues.size === 0) return;

        entities.forEach((target) => {
          if (target.collection === source.collection) return;
          const targetContext = contexts.find((context) => context.sample.path === target.collection);
          if (!targetContext) return;

          const targetIds = new Set(targetContext.sample.rows.map((row) => String(row.id)).filter(Boolean));
          const overlap = Array.from(sourceValues).filter((value) => targetIds.has(value)).length;
          const overlapScore = overlap / Math.max(sourceValues.size, 1);
          const nameScore = relationshipNameScore(field.name, target.collection);
          const confidence = Math.min(0.98, nameScore + overlapScore * 0.7);

          if (confidence >= 0.25) {
            relationships.push({
              confidence,
              fromCollection: source.collection,
              fromField: field.name,
              reason: overlap > 0 ? "ID values overlap sampled document IDs" : "field name matches target entity",
              toCollection: target.collection,
              toField: "id",
            });
          }
        });
      });
  });

  return relationships.sort((a, b) => b.confidence - a.confidence).slice(0, 30);
}

export function buildDataCatalog(contexts: SelectedCollectionContext[]): DataCatalog {
  const entities = contexts.map(profileEntity);

  return {
    dimensions: entities.flatMap((entity) =>
      entity.fields
        .filter((field) => field.roles.includes("dimension") || field.roles.includes("enum"))
        .map((field) => ({ collection: entity.collection, field: field.name })),
    ),
    entities,
    measures: entities.flatMap((entity) =>
      entity.fields
        .filter((field) => field.roles.includes("measure"))
        .map((field) => ({ collection: entity.collection, field: field.name })),
    ),
    relationships: detectRelationships(contexts, entities),
    timestamps: entities.flatMap((entity) =>
      entity.fields
        .filter((field) => field.roles.includes("timestamp"))
        .map((field) => ({ collection: entity.collection, field: field.name })),
    ),
  };
}
