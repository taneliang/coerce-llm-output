import { parseJSON } from "partial-json";
import { z } from "zod";

function normalizeKey(key: string): string {
  return key.replace(/_/g, "").toLowerCase();
}

export function recursivelyFixKeysToMatchSchema(
  thing: unknown,
  schema: z.ZodType
): unknown {
  if (schema instanceof z.ZodObject) {
    if (typeof thing !== "object" || thing === null) {
      return thing; // Unnormalizable because it's not an object
    }
    return recursivelyFixKeysInObjToMatchSchema(thing, schema);
  } else if (schema instanceof z.ZodArray) {
    if (!Array.isArray(thing)) {
      return thing; // Unnormalizable because it's not an array
    }
    return thing.map((item) =>
      recursivelyFixKeysToMatchSchema(item, schema.element)
    );
  } else {
    return thing;
  }
}

function recursivelyFixKeysInObjToMatchSchema(
  obj: object,
  schema: z.AnyZodObject
): unknown {
  const normalizedKeysToExpectedKeys = Object.fromEntries(
    Object.keys(schema.shape).map((key) => [normalizeKey(key), key])
  );
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      normalizedKeysToExpectedKeys[normalizeKey(key)],
      recursivelyFixKeysToMatchSchema(value, schema.shape[key]),
    ])
  );
}

export function extractJsonLikeString(llmOutput: string): string {
  // Try to find a Markdown block
  if (llmOutput.includes("```json")) {
    const completeJsonBlockMatch = llmOutput.match(
      /```json\n([\s\S\n]+)(```)/m
    )?.[1];
    if (completeJsonBlockMatch) {
      return completeJsonBlockMatch.trim();
    }
    const incompleteJsonBlockMatch =
      llmOutput.match(/```json\n([\s\S\n]+)/m)?.[1];
    if (incompleteJsonBlockMatch) {
      return incompleteJsonBlockMatch.trim();
    }
  }

  // Match anything that looks like the start of a JSON object or array
  const jsonLikeString = llmOutput.match(/[[{]([\s\S\n]+)/m)?.[0];
  if (jsonLikeString) {
    return jsonLikeString.trim();
  }

  // Assume the whole string is JSON
  return llmOutput;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function coerceLlmOutput<T extends z.AnyZodObject | z.ZodArray<any>>(
  schema: T,
  llmOutput: string
): z.infer<T> {
  return schema.parse(
    recursivelyFixKeysToMatchSchema(
      parseJSON(extractJsonLikeString(llmOutput)),
      schema
    )
  );
}
