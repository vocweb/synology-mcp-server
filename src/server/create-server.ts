/**
 * MCP Server factory.
 * Instantiates a configured Server instance and registers all request handlers
 * for tools, resources, and prompts.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { ToolDefinition, ToolContext } from '../tools/types.js';
import { zodToJsonSchema } from '../utils/zod-to-json-schema.js';
import * as resources from '../resources/index.js';
import * as prompts from '../prompts/index.js';

/** Package metadata used in MCP server info. */
const SERVER_NAME = 'synology-office-mcp';
const SERVER_VERSION = '0.2.0';

/**
 * Creates and configures an MCP Server with all handlers wired.
 *
 * @param tools - Flat array of tool definitions (feature-flag filtered).
 * @param ctx - Runtime context with authenticated Synology clients.
 * @returns Configured Server instance ready for transport connection.
 */
export function createServer(tools: ToolDefinition[], ctx: ToolContext): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  // -------------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------------

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: rawArgs } = req.params;

    const tool = tools.find((t) => t.name === name);
    if (tool === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: true,
              code: 'TOOL_NOT_FOUND',
              message: `Tool not found: ${name}`,
              retryable: false,
            }),
          },
        ],
        isError: true,
      };
    }

    const parsed = tool.inputSchema.safeParse(rawArgs ?? {});
    if (!parsed.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: true,
              code: 'VALIDATION_ERROR',
              message: parsed.error.message,
              issues: parsed.error.issues,
              retryable: false,
            }),
          },
        ],
        isError: true,
      };
    }

    const result = await tool.handler(parsed.data, ctx);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  });

  // -------------------------------------------------------------------------
  // Resources
  // -------------------------------------------------------------------------

  server.setRequestHandler(ListResourcesRequestSchema, () => resources.list());

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const uri = req.params.uri;
    try {
      return await resources.read(uri, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Resource read failed for "${uri}": ${message}`);
    }
  });

  // -------------------------------------------------------------------------
  // Prompts
  // -------------------------------------------------------------------------

  server.setRequestHandler(ListPromptsRequestSchema, () => prompts.list());

  server.setRequestHandler(GetPromptRequestSchema, (req) => {
    const { name, arguments: rawArgs } = req.params;
    const args: Record<string, string> = {};
    if (rawArgs !== undefined) {
      for (const [k, v] of Object.entries(rawArgs)) {
        if (v !== undefined) args[k] = String(v);
      }
    }
    try {
      const result = prompts.get(name, args);
      // The SDK's GetPromptResult type includes union members for task-management
      // (added in SDK v1.10+) that we do not need to supply. Our shape is
      // structurally compatible at runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      return result as unknown as any;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Prompt not found: ${message}`);
    }
  });

  return server;
}
