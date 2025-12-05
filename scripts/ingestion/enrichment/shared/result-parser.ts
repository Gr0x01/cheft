import { z } from 'zod';

export function stripCitations(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/\s*\(\[.*?\]\(.*?\)\)/g, '')
    .replace(/\s*\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

export function enumWithCitationStrip<T extends string>(enumValues: readonly [T, ...T[]]) {
  return z.string().nullable().optional().transform((val): T | null => {
    if (!val) return null;
    const cleaned = stripCitations(val);
    if (!cleaned) return null;
    if (enumValues.includes(cleaned as T)) {
      return cleaned as T;
    }
    return null;
  });
}

export function extractJsonFromText(text: string): string {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return text;
}

export function parseAndValidate<T>(text: string, schema: z.ZodSchema<T>): T {
  try {
    const jsonText = extractJsonFromText(text);
    const parsed = JSON.parse(jsonText);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in LLM response: ${error.message}`);
    }
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`);
  }
}
