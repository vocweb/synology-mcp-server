/**
 * MCP Prompts registry.
 * Exports list() and get(name, args) for the three prompts defined in spec §9.
 */

import { summarizeSpreadsheetPrompt, buildSummarizeSpreadsheet } from './summarize-spreadsheet.js';
import {
  draftEmailFromSpreadsheetPrompt,
  buildDraftEmailFromSpreadsheet,
} from './draft-email-from-spreadsheet.js';
import { scheduleFromListPrompt, buildScheduleFromList } from './schedule-from-list.js';

/** Argument descriptor for a prompt parameter. */
export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

/** Prompt descriptor returned by list(). */
export interface PromptDescriptor {
  name: string;
  description: string;
  arguments: readonly PromptArgument[];
}

/** MCP prompt message content. */
export interface PromptMessage {
  role: string;
  content: { type: string; text: string };
}

/** Result returned by get(). */
export interface PromptResult {
  messages: PromptMessage[];
}

const PROMPTS: PromptDescriptor[] = [
  summarizeSpreadsheetPrompt,
  draftEmailFromSpreadsheetPrompt,
  scheduleFromListPrompt,
];

type BuildFn = (args: Record<string, string>) => PromptResult;

const BUILDERS: Record<string, BuildFn> = {
  'summarize-spreadsheet': buildSummarizeSpreadsheet,
  'draft-email-from-spreadsheet': buildDraftEmailFromSpreadsheet,
  'schedule-from-list': buildScheduleFromList,
};

/**
 * Returns all registered prompt descriptors.
 */
export function list(): { prompts: PromptDescriptor[] } {
  return { prompts: PROMPTS };
}

/**
 * Builds and returns the messages for a named prompt.
 *
 * @param name - Prompt name matching one of the registered prompts.
 * @param args - Key/value arguments provided by the MCP client.
 * @returns Prompt result with messages array.
 * @throws Error when the prompt name is not recognised.
 */
export function get(name: string, args: Record<string, string>): PromptResult {
  const build = BUILDERS[name];
  if (build === undefined) {
    throw new Error(`Unknown prompt: ${name}`);
  }
  return build(args);
}
