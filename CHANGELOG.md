# Changelog

## 2.0.0 — 2026-06-23

**BREAKING**: Migrated from `@doist/todoist-ai` to `@doist/todoist-mcp`.

- Updated package import from `@doist/todoist-ai` to `@doist/todoist-mcp` (v10.4.0+)
- Updated `@doist/todoist-sdk` to v10.4.1+
- Added Zod-based parameter schema conversion (Zod → JSON Schema) for new tool format
- Adapted tool execution to handle new `{ textContent, structuredContent }` response format
- Added Goal management tools: `todoist_add_goals`, `todoist_complete_goals`, `todoist_find_goals`, `todoist_link_goal_tasks`, `todoist_update_goals`
- Added `todoist_update_labels` tool
- Removed unused `extractAgentIdFromSessionKey` function
- Fixed stray backtick syntax error in `getToolParameters`

## 1.0.0 — 2026-04-13

Initial release.

- Dynamic tool discovery from `@doist/todoist-ai` exports (40+ tools)
- Per-agent API key resolution with shared default fallback
- Tool name normalization to `todoist_<name>` convention
- Bundled SKILL.md with full tool reference, safety rules, and usage workflows
- Support for task management, projects, sections, comments, labels, filters, reminders, collaboration, and productivity insights
