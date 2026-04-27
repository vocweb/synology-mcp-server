/**
 * Minimal Zod → JSON Schema converter for MCP tool input schemas.
 *
 * Handles the subset of Zod types used by this project's tool definitions:
 * ZodObject, ZodString, ZodNumber, ZodBoolean, ZodEnum, ZodArray,
 * ZodOptional, ZodDefault, ZodNullable, ZodLiteral, ZodUnion.
 *
 * Does NOT add a new production dependency — implements only what is needed.
 *
 * NOTE: This file intentionally accesses Zod's internal `_def` property which
 * is not part of the public API surface and carries `any` types. All unsafe-*
 * rules are disabled file-wide; the type assertions here are deliberate and
 * tested.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import type { ZodTypeAny } from 'zod';

/** JSON Schema object (subset sufficient for MCP tool descriptors). */
export interface JsonSchema {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
  anyOf?: JsonSchema[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
}

/**
 * Converts a Zod schema to a JSON Schema object suitable for MCP ListTools responses.
 *
 * @param schema - Any Zod schema; unrecognised types fall back to `{}`.
 * @returns JSON Schema representation.
 */
export function zodToJsonSchema(schema: ZodTypeAny): JsonSchema {
  return convertZod(schema);
}

// ---------------------------------------------------------------------------
// Internal recursive converter
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertZod(schema: any): JsonSchema {
  if (schema === undefined || schema === null) return {};

  const typeName: string = schema._def?.typeName ?? '';
  const description: string | undefined = schema._def?.description;
  const base: JsonSchema = description !== undefined ? { description } : {};

  switch (typeName) {
    case 'ZodString': {
      const checks: Array<{ kind: string; value?: number }> = schema._def.checks ?? [];
      const result: JsonSchema = { ...base, type: 'string' };
      for (const check of checks) {
        if (check.kind === 'min' && check.value !== undefined) result.minLength = check.value;
      }
      return result;
    }

    case 'ZodNumber':
    case 'ZodBigInt':
      return { ...base, type: 'number' };

    case 'ZodBoolean':
      return { ...base, type: 'boolean' };

    case 'ZodLiteral':
      return { ...base, enum: [schema._def.value] };

    case 'ZodEnum':
      return { ...base, type: 'string', enum: schema._def.values as unknown[] };

    case 'ZodNativeEnum': {
      const values = Object.values(schema._def.values as Record<string, unknown>);
      return { ...base, enum: values };
    }

    case 'ZodArray': {
      const items = convertZod(schema._def.type);
      return { ...base, type: 'array', items };
    }

    case 'ZodObject': {
      const shape: Record<string, ZodTypeAny> = schema._def.shape();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = convertZod(value);
        // A field is required unless it is Optional, Nullable with default, or has a Default
        const fieldTypeName: string = (value as ZodTypeAny)._def?.typeName ?? '';
        if (fieldTypeName !== 'ZodOptional' && fieldTypeName !== 'ZodDefault') {
          required.push(key);
        }
      }

      const result: JsonSchema = { ...base, type: 'object', properties };
      if (required.length > 0) result.required = required;
      return result;
    }

    case 'ZodOptional': {
      // Unwrap and mark as nullable in the description but keep the inner type
      const inner = convertZod(schema._def.innerType);
      return { ...base, ...inner };
    }

    case 'ZodNullable': {
      const inner = convertZod(schema._def.innerType);
      return { ...base, ...inner, type: [inner.type as string, 'null'].filter(Boolean) };
    }

    case 'ZodDefault': {
      const inner = convertZod(schema._def.innerType);
      const defaultVal: unknown = schema._def.defaultValue();
      return { ...base, ...inner, default: defaultVal };
    }

    case 'ZodUnion': {
      const options = schema._def.options as ZodTypeAny[];
      const anyOf = options.map((o) => convertZod(o));
      return { ...base, anyOf };
    }

    case 'ZodEffects':
      // Transform/refine — convert the inner schema
      return convertZod(schema._def.schema);

    default:
      return base;
  }
}
