# Step 005 — Custom MCP Server & Combined `mcp.json`

## Goal
Build the project's own MCP server that makes pipeline results queryable,
and configure it alongside context7 in one `mcp.json`.

## Agent
**pipeline-codegen** (`.claude/agents/pipeline-codegen.md`) — Agent 2.
Invoke via the Agent/Task tool (`subagent_type: pipeline-codegen`); this is
still code-generation work (Task 4's custom MCP server), just against a
different target file.

## Prerequisites
- Step 004 complete (`shared/results/` structure and `summary.json` shape
  are final).

## Deliverables
- `mcp/server.js`
- `mcp.json` (both servers configured)

## Prompt to hand the `pipeline-codegen` subagent

```
Before implementing, use the context7 MCP tool to look up
@modelcontextprotocol/sdk server patterns for Node.js/JavaScript
(resolve-library-id for "@modelcontextprotocol/sdk" or "model context
protocol typescript sdk", then get-library-docs) — specifically the
high-level McpServer API for defining tools and resources, and how to
connect it over stdio. Append the query to research-notes.md.

Implement mcp/server.js as an MCP server (CommonJS, using
@modelcontextprotocol/sdk's McpServer + StdioServerTransport) exposing:

1. Tool `get_transaction_status`
   - Input schema: { transaction_id: string }
   - Reads shared/results/<transaction_id>.json
   - Returns its contents, or a clear "not found" object (do not throw)
     if the transaction hasn't been processed yet
2. Tool `list_pipeline_results`
   - No input
   - Reads every JSON file in shared/results/ except summary.json
   - Returns a summary: total count, counts per final_status, and the
     list of transaction_ids in each status bucket
3. Resource `pipeline://summary`
   - Returns the contents of shared/results/summary.json as text (or a
     "no run yet" message if the file doesn't exist)

Resolve the shared/results/ path relative to the repo root using
path.join(__dirname, '..', 'shared', 'results') so it works regardless of
the server's current working directory.

Then create/update mcp.json at the repo root with both servers:

{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "pipeline-status": {
      "command": "node",
      "args": ["mcp/server.js"]
    }
  }
}

Confirm `@modelcontextprotocol/sdk` is in package.json dependencies (added
in Step 001).
```

## Acceptance criteria
- [ ] `mcp.json` configures both `context7` and `pipeline-status`
- [ ] `get_transaction_status` returns the real result after a pipeline
      run, and a graceful not-found for an unknown ID
- [ ] `list_pipeline_results` counts match `shared/results/summary.json`
- [ ] `pipeline://summary` resource returns the latest run's summary text
- [ ] `research-notes.md` gained an MCP-SDK-related entry
