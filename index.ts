// index.ts
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import * as todoistMcp from "@doist/todoist-mcp";
import { TodoistApi } from "@doist/todoist-sdk";
import { z } from "zod";

type DoistToolObject = {
  name?: string;
  description?: string;
  parameters?: unknown;
  annotations?: unknown;
  execute: (params: unknown, client: TodoistApi) => Promise<unknown>;
};

type DoistCallable = ((params: unknown, client?: TodoistApi) => Promise<unknown>) | DoistToolObject;

type ToolDefinition = {
  name: string;
  description: string;
  parameters: unknown;
  handler: DoistCallable;
};

const FALLBACK_PARAMETERS = {
  type: "object",
  additionalProperties: true,
  properties: {},
};

function cloneFallbackParameters() {
  return {
    ...FALLBACK_PARAMETERS,
    properties: { ...FALLBACK_PARAMETERS.properties },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExecutableObject(value: unknown): value is DoistToolObject {
  return isRecord(value) && typeof value.execute === "function";
}

function normalizeToolName(rawName: string): string {
  const cleaned = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `todoist_${cleaned}`;
}

function hasJsonSchemaType(value: Record<string, unknown>): boolean {
  return typeof value.type === "string" || Array.isArray(value.type);
}

function getToolParameters(value: unknown): unknown {
  if (!isExecutableObject(value)) {
    return cloneFallbackParameters();
  }

  const raw = value.parameters;
  if (!isRecord(raw)) {
    return cloneFallbackParameters();
  }

  // Zod shapes don't have a string "type" at top level (JSON Schema objects do)
  if (!hasJsonSchemaType(raw)) {
    try {
      const schema = z.object(raw as Record<string, z.ZodType>);
      return z.toJSONSchema(schema, { unrepresentable: "any" });
    } catch {
      return cloneFallbackParameters();
    }
  }

  // Legacy JSON Schema handling
  const schema = { ...raw };
  const schemaType = schema.type;

  if (schemaType === "object") {
    return schema;
  }

  if (Array.isArray(schemaType) && schemaType.includes("object")) {
    return {
      ...schema,
      type: "object",
    };
  }

  if (isRecord(schema.properties)) {
    return {
      ...schema,
      type: "object",
      additionalProperties: schema.additionalProperties ?? true,
    };
  }

  return cloneFallbackParameters();
}

function toToolDefinition(exportName: string, value: unknown): ToolDefinition | null {
  if (typeof value === "function") {
    return {
      name: normalizeToolName(exportName),
      description: `Todoist tool ${exportName}`,
      parameters: FALLBACK_PARAMETERS,
      handler: value as DoistCallable,
    };
  }

  if (!isExecutableObject(value)) {
    return null;
  }

  const rawName = typeof value.name === "string" && value.name.length > 0 ? value.name : exportName;
  const description =
    typeof value.description === "string" && value.description.length > 0
      ? value.description
      : `Todoist tool ${rawName}`;

  return {
    name: normalizeToolName(rawName),
    description,
    parameters: getToolParameters(value),
    handler: value,
  };
}

function resolveToolDefinitions(moduleExports: Record<string, unknown>): ToolDefinition[] {
  const resolved: ToolDefinition[] = [];
  const toolsExport = moduleExports.tools;

  if (isRecord(toolsExport)) {
    for (const [exportName, value] of Object.entries(toolsExport)) {
      const definition = toToolDefinition(exportName, value);
      if (definition) {
        resolved.push(definition);
      }
    }
    return resolved;
  }

  for (const [exportName, value] of Object.entries(moduleExports)) {
    if (exportName === "default" || exportName === "tools") {
      continue;
    }

    const definition = toToolDefinition(exportName, value);
    if (definition) {
      resolved.push(definition);
    }
  }

  return resolved;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "Failed to serialize tool response" });
  }
}

async function executeDoistTool(definition: ToolDefinition, params: unknown, client: TodoistApi) {
  try {
    const result =
      typeof definition.handler === "function"
        ? await definition.handler(params, client)
        : await definition.handler.execute(params, client);

    // Handle new @doist/todoist-mcp response format { textContent, structuredContent, contentItems }
    const response = isRecord(result) && ("structuredContent" in result || "textContent" in result)
      ? (result as Record<string, unknown>).structuredContent ?? (result as Record<string, unknown>).textContent ?? result
      : result;

    return {
      content: [{ type: "text", text: safeStringify(response) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: message,
            tool: definition.name,
          }),
        },
      ],
    };
  }
}

function createTodoistClient(apiKey: string): TodoistApi {
  return new TodoistApi(apiKey);
}

function resolveApiKey(apiKeys: Record<string, string> | undefined, agentId: string | undefined): string | null {
  if (apiKeys) {
    if (agentId && apiKeys[agentId]?.trim()) {
      console.debug(`[todoist] resolveApiKey: using key for "${agentId}"`);
      return apiKeys[agentId].trim();
    }
    if (apiKeys.default?.trim()) {
      console.debug(`[todoist] resolveApiKey: agentId=${agentId}, falling back to "default" key`);
      return apiKeys.default.trim();
    }
  }

  const envKey = process.env.TODOIST_API_KEY?.trim() || null;
  console.debug(`[todoist] resolveApiKey: agentId=${agentId}, env fallback ${envKey ? "present" : "absent"}`);
  return envKey;
}

function assertUniqueToolNames(definitions: ToolDefinition[]) {
  const names = new Set<string>();
  for (const definition of definitions) {
    if (names.has(definition.name)) {
      throw new Error(`Duplicate tool name detected: ${definition.name}`);
    }
    names.add(definition.name);
  }
}

export default definePluginEntry({
  id: "todoist-ai-tools",
  name: "Todoist AI Tools",
  description: "Expose Todoist MCP tools to OpenClaw agents",
  register(api: any) {
    const toolDefinitions = resolveToolDefinitions(todoistMcp as Record<string, unknown>);
    if (toolDefinitions.length === 0) {
      throw new Error("No executable tools discovered from @doist/todoist-mcp exports");
    }

    assertUniqueToolNames(toolDefinitions);

    const apiKeys: Record<string, string> | undefined = api.pluginConfig?.apiKeys;

    for (const definition of toolDefinitions) {
      api.registerTool(
        (ctx: any) => {
          let agentId = ctx?.agentId;
          if (!agentId && typeof ctx?.sessionKey === "string") {
            const m = ctx.sessionKey.match(/^agent:([^:]+):/);
            if (m) agentId = m[1];
          }

          console.debug(`[todoist] Binding tool ${definition.name} for agentId=${agentId}`);

          return {
            name: definition.name,
            description: definition.description,
            parameters: definition.parameters,
            async execute(toolCallId: unknown, params: unknown) {
              const apiKey = resolveApiKey(apiKeys, agentId);

              if (!apiKey) {
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        error: "TODOIST_API_KEY is not configured for this agent.",
                        tool: definition.name,
                        agentId: agentId || "unknown",
                      }),
                    },
                  ],
                };
              }

              const todoistClient = createTodoistClient(apiKey);
              return executeDoistTool(definition, params, todoistClient);
            },
          };
        },
        { optional: true }
      );
    }
  },
});