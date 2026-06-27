---
name: todoist-ai-tools
description: "Use when: you need Todoist task/project/section/goal/comment/label/filter operations, productivity insights, or Todoist search/fetch via the todoist-ai plugin tools"
license: MIT
metadata:
  author: github.com/alejdg
  version: "2.0.0"
---

# Todoist AI Plugin Skill

This skill documents how to use Todoist tools exposed by the `todoist-ai-tools` plugin.

When the plugin is enabled, tools from `@doist/todoist-mcp` are dynamically discovered and registered.
The plugin normalizes names to `todoist_<tool_name>` (hyphens become underscores).

## Setup and Auth

1. The API key is resolved automatically per agent from `plugins.entries.todoist-ai-tools.config.apiKeys` in openclaw.json (keyed by agent ID, with `default` fallback), then `process.env.TODOIST_API_KEY`.
2. Ensure the `todoist-ai-tools` plugin is enabled.
3. Verify account context early with `todoist_user_info` before write actions.

## Safety Rules

1. Ask for explicit user confirmation before any write/destructive call.
2. Treat these as write/destructive: create/update/complete/uncomplete/reorder/delete/move/reschedule/assignment operations.
3. Prefer read tools first (`find*`, `get*`, `user_info`, `search`, `fetch`).
4. Todoist API can rate limit high-volume requests; batch carefully and paginate.

## Tool Name Mapping

The upstream tool name `add-tasks` is exposed as `todoist_add_tasks`.
General rule:

- `add-tasks` -> `todoist_add_tasks`
- `find-projects` -> `todoist_find_projects`
- `user-info` -> `todoist_user_info`

## Available Tools

### Task Management

- `todoist_add_tasks` (write)
- `todoist_update_tasks` (write/destructive)
- `todoist_complete_tasks` (write/destructive)
- `todoist_uncomplete_tasks` (write)
- `todoist_reschedule_tasks` (write/destructive)
- `todoist_find_tasks` (read)
- `todoist_find_tasks_by_date` (read)
- `todoist_find_completed_tasks` (read)

### Project and Section Management

- `todoist_add_projects` (write)
- `todoist_update_projects` (write/destructive)
- `todoist_find_projects` (read)
- `todoist_add_sections` (write)
- `todoist_update_sections` (write/destructive)
- `todoist_find_sections` (read)

### Goal Management

- `todoist_add_goals` (write)
- `todoist_update_goals` (write/destructive)
- `todoist_complete_goals` (write/destructive)
- `todoist_find_goals` (read)
- `todoist_link_goal_tasks` (write)

### Comments, Labels, Filters

- `todoist_add_comments` (write)
- `todoist_update_comments` (write/destructive)
- `todoist_find_comments` (read)
- `todoist_add_labels` (write)
- `todoist_update_labels` (write/destructive)
- `todoist_find_labels` (read)
- `todoist_add_filters` (write)
- `todoist_update_filters` (write/destructive)
- `todoist_find_filters` (read)

### Collaboration, Activity, and Insights

- `todoist_find_project_collaborators` (read)
- `todoist_manage_assignments` (write/destructive)
- `todoist_find_activity` (read)
- `todoist_get_overview` (read)
- `todoist_get_productivity_stats` (read)
- `todoist_get_project_health` (read)
- `todoist_get_project_activity_stats` (read)
- `todoist_analyze_project_health` (read)
- `todoist_get_workspace_insights` (read)
- `todoist_list_workspaces` (read)

### Generic Object and OpenAI MCP Compatibility

- `todoist_delete_object` (write/destructive)
- `todoist_reorder_objects` (write)
- `todoist_user_info` (read)
- `todoist_search` (read)
- `todoist_fetch` (read)
- `todoist_view_attachment` (read)

## Core Workflows

### 1. Add a Task Safely

1. Read context with `todoist_user_info` and optionally `todoist_find_projects`.
2. Ask for confirmation with task content, due date, and target project.
3. Execute `todoist_add_tasks`.
4. Confirm created IDs back to user.

### 2. Find and Triage Tasks

1. Use `todoist_find_tasks_by_date` for date windows (today/this week).
2. Refine with `todoist_find_tasks` using labels, responsible user, project, or search text.
3. Apply updates through `todoist_update_tasks` or completion through `todoist_complete_tasks` only after confirmation.

### 3. Project Maintenance

1. Inspect state with `todoist_find_projects`, `todoist_find_sections`, and `todoist_get_project_health`.
2. Propose plan (rename/archive/reorganize).
3. Confirm and execute with project/section update tools.

## Parameter and Response Notes

- Many finder tools support pagination (`limit`, `cursor`, `nextCursor`).
- For labels in searches, use label names unless explicitly requiring IDs.
- Prefer incremental operations over large destructive batches.
- The plugin returns serialized JSON text payloads from tool responses.

## Error Handling

1. Missing auth/config: verify `plugins.entries.todoist-ai-tools.config.apiKeys` has an entry for this agent ID, or that `process.env.TODOIST_API_KEY` is set.
2. Tool not found: check normalized `todoist_` naming.
3. Validation errors: fix parameter shape and retry once.
4. Rate limit or transient network issues: back off and retry with smaller batches.
