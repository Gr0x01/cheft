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

function stripWebSearchCitations(text: string): string {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s*\(\[.*?\]\(.*?\)\)/g, '')
    .replace(/【\d+†source】/g, '')
    .replace(/\[[a-zA-Z0-9.-]+\.(com|edu|org|net|gov|io)\]/g, '');
}

function findMatchingBrace(text: string, startIndex: number): number {
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingBracket(text: string, startIndex: number): number {
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === '[') depth++;
    if (text[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function extractJsonFromText(text: string): string {
  let cleaned = stripWebSearchCitations(text);
  
  cleaned = cleaned.trim();
  
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  cleaned = cleaned.trim();
  
  if (cleaned.startsWith('{')) {
    const endIndex = findMatchingBrace(cleaned, 0);
    if (endIndex !== -1) {
      return stripWebSearchCitations(cleaned.substring(0, endIndex + 1));
    }
  }
  
  if (cleaned.startsWith('[')) {
    const endIndex = findMatchingBracket(cleaned, 0);
    if (endIndex !== -1) {
      return stripWebSearchCitations(cleaned.substring(0, endIndex + 1));
    }
  }
  
  const objectStart = cleaned.indexOf('{');
  if (objectStart !== -1) {
    const endIndex = findMatchingBrace(cleaned, objectStart);
    if (endIndex !== -1) {
      return stripWebSearchCitations(cleaned.substring(objectStart, endIndex + 1));
    }
  }
  
  const arrayStart = cleaned.indexOf('[');
  if (arrayStart !== -1) {
    const endIndex = findMatchingBracket(cleaned, arrayStart);
    if (endIndex !== -1) {
      return stripWebSearchCitations(cleaned.substring(arrayStart, endIndex + 1));
    }
  }
  
  return stripWebSearchCitations(cleaned);
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
