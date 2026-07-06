# Research Notes — context7 queries (Agent 2 / pipeline-codegen)

This file documents the context7 lookups performed before implementing
non-trivial library usage in the pipeline, per `specification.md` and the
`pipeline-codegen` agent instructions. Each entry records: what was
searched, the library ID returned, and where/how the resulting pattern was
applied in this codebase.

## 1. decimal.js — invalid argument handling & comparisons

- **Query**: "Decimal constructor invalid string error handling, isNaN,
  abs(), greaterThan comparison"
- **Library ID resolved**: `/mikemcl/decimal.js` (via
  `resolve-library-id` on `decimal.js`)
- **Key finding**: `new Decimal('abc')` *throws* a `DecimalError`
  (`[DecimalError] Invalid argument: abc`) rather than returning a
  sentinel `NaN` Decimal the way `new Decimal(NaN)` does. Non-numeric
  amount strings must therefore be validated with a `try { new
  Decimal(str) } catch { ... }` guard, not an `isNaN()` check after
  construction. Comparisons use `.greaterThan()`/`.gt()`,
  `.abs()` returns a new normalized (non-negative) Decimal without
  mutating the original.
- **Applied in**: `pipeline/validator.js` (`parseAmount()` wraps
  `new Decimal(record.amount)` in try/catch to produce the
  `invalid_amount` rejection reason instead of trusting `isNaN`) and the
  refund normalization step (`amount.abs()` for `transaction_type ===
  'refund'`). Also used in `pipeline/fraud-detector.js`, which compares
  the validated decimal string against `10000`/`50000` thresholds via
  `new Decimal(data.amount).greaterThan(10000)` instead of
  `Number(data.amount) > 10000`.

## 2. Express 5 — static file serving + JSON body parsing + POST handler

- **Query**: "serve static files, express.json() body parsing, POST route
  handler example, express 5"
- **Library ID resolved**: `/expressjs/express` (v5 docs; package.json
  pins `express@^5.2.1`)
- **Key finding**: Express 5's recommended baseline app wires
  `app.use(express.json())` before `app.use(express.static('public'))`
  and route handlers, with `req.body` available directly after the
  `express.json()` middleware runs; POST handlers should validate/short
  circuit with `res.status(...).json({...})` and otherwise respond with
  `res.json(...)`. No separate `body-parser` dependency is needed since
  `express.json()` is built in as of Express 4+/5.
- **Applied in**: `frontend/server.js` — `app.use(express.json())` +
  `app.use(express.static(path.join(__dirname, 'public')))` for the
  front-end shell, and `app.post('/api/run-pipeline', (req, res) => {
  ... res.json(summary) })` which calls `runPipeline()` synchronously and
  returns the resulting summary object as JSON for the browser to render.

## Notes on scope

Both queries above were run through the context7 MCP tools
(`mcp__context7__resolve-library-id` then `mcp__context7__query-docs`)
prior to writing `pipeline/validator.js`, `pipeline/fraud-detector.js`,
and `frontend/server.js`, satisfying the "use context7 before
implementing each non-trivial library integration" requirement for at
least 2 documented queries.

## 3. @modelcontextprotocol/sdk — McpServer tool/resource registration + stdio transport

- **Query**: "McpServer high-level API for Node.js/JavaScript: registering
  tools with registerTool, registering resources with registerResource,
  and connecting a server over stdio with StdioServerTransport"
- **Library ID resolved**: **context7 was not reachable in this run** —
  no `mcp__context7__resolve-library-id` / `mcp__context7__query-docs`
  tools (and no `ToolSearch` tool) were exposed to this agent session, so
  no context7 library ID was returned and none is fabricated here. This
  is reported plainly per instructions rather than inventing a result.
- **Key finding (fallback source)**: instead of context7, the pattern was
  taken directly from the installed package's own type declarations and
  README at `node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.d.ts`
  and `node_modules/@modelcontextprotocol/sdk/README.md` (version pinned
  in `package.json`, `^1.29.0`). Confirmed API shape: `new McpServer({
  name, version })`; `server.registerTool(name, { title, description,
  inputSchema }, async (args) => ({ content: [{ type: 'text', text }] }))`
  where `inputSchema` is a plain object of Zod schemas (a Zod "raw
  shape") — an empty object `{}` is valid for a zero-argument tool;
  `server.registerResource(name, uri, { title, description, mimeType },
  async (uri) => ({ contents: [{ uri: uri.href, text }] }))` for a static
  resource URI; and `await server.connect(new StdioServerTransport())`
  from `@modelcontextprotocol/sdk/server/stdio.js` to serve over stdio,
  which is how `mcp.json` launches a local server as a child process.
  `zod` is a required (non-optional) peer dependency of the SDK
  (`peerDependenciesMeta.zod.optional === false`) and was already present
  transitively in `node_modules`, so it was added explicitly to
  `package.json` `dependencies` rather than left implicit.
- **Applied in**: `mcp/server.js` — `get_transaction_status` and
  `list_pipeline_results` tools registered via `registerTool` (the latter
  with an empty `inputSchema: {}` for its zero-argument signature), and
  the `pipeline://summary` resource registered via `registerResource`,
  all served over `StdioServerTransport`.
