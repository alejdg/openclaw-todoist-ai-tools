# Todoist AI Tools

OpenClaw plugin that exposes 45+ [Todoist](https://todoist.com) tools to your agents via [`@doist/todoist-mcp`](https://www.npmjs.com/package/@doist/todoist-mcp).

## Features

- **Dynamic tool discovery** — automatically registers every tool exported by `@doist/todoist-mcp`
- **Per-agent API keys** — each agent can use a different Todoist account
- **Normalized naming** — all tools follow the `todoist_<name>` convention
- **Safety-aware skill docs** — bundled SKILL.md categorizes tools as read vs. write/destructive

## Prerequisites

- OpenClaw **≥ 2026.5.17**
- A [Todoist API key](https://todoist.com/help/articles/find-your-api-token-Jpzx9IIlB) (one per agent, or a shared default)

## Installation

```bash
openclaw plugins install clawhub:alejdg/todoist-ai-tools
```

## Configuration

Add the plugin to your `openclaw.json`:

```jsonc
{
  "plugins": {
    "entries": {
      "todoist-ai-tools": {
        "enabled": true,
        "config": {
          "apiKeys": {
            "default": "${TODOIST_API_KEY}",
            "my-agent": "${MY_AGENT_TODOIST_KEY}"
          }
        }
      }
    }
  }
}
```

API key resolution order:

1. `apiKeys.<agentId>` — exact match for the running agent
2. `apiKeys.default` — shared fallback
3. `TODOIST_API_KEY` environment variable

## Tool Categories

| Category | Examples | Count |
|---|---|---|
| Task Management | `todoist_add_tasks`, `todoist_find_tasks`, `todoist_complete_tasks` | 8 |
| Projects & Sections | `todoist_add_projects`, `todoist_find_sections` | 8 |
| Goals | `todoist_add_goals`, `todoist_find_goals`, `todoist_complete_goals` | 5 |
| Comments, Labels, Filters | `todoist_add_comments`, `todoist_find_labels`, `todoist_update_labels` | 12 |
| Collaboration & Insights | `todoist_get_overview`, `todoist_get_productivity_stats` | 10 |
| Generic / Compatibility | `todoist_search`, `todoist_fetch`, `todoist_user_info` | 7 |

See [skills/todoist-ai/SKILL.md](skills/todoist-ai/SKILL.md) for the full tool reference and usage workflows.

## Dependencies

| Package | Purpose |
|---|---|
| `@doist/todoist-mcp` | MCP-based Todoist tools with structured parameters |
| `@doist/todoist-sdk` | Todoist REST API client |
| `zod` | Zod-to-JSON Schema conversion for tool parameters |

## License

[MIT](LICENSE)
