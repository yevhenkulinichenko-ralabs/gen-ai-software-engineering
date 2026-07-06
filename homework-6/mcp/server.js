'use strict';

/**
 * Pipeline-status MCP server.
 *
 * Exposes the contents of `shared/results/` (produced by `orchestrator.js`)
 * to any MCP-capable client (e.g. Claude Desktop, Claude Code) via:
 *
 *   - Tool `get_transaction_status` — look up one transaction's final record.
 *   - Tool `list_pipeline_results`  — aggregate counts across all results.
 *   - Resource `pipeline://summary` — the raw `shared/results/summary.json`.
 *
 * Per research-notes.md entry #3 (context7 was unreachable for this
 * lookup; API confirmed instead from the installed package's own type
 * declarations/README), high-level `McpServer` API: tools are registered
 * with
 * `server.registerTool(name, { title, description, inputSchema }, handler)`
 * where `inputSchema` is a plain object of Zod schemas (a "raw shape"), and
 * a handler returns `{ content: [{ type: 'text', text }] }`. Resources are
 * registered with `server.registerResource(name, uri, metadata, handler)`
 * where the handler returns `{ contents: [{ uri, text }] }`. The server is
 * connected to the outside world over stdio via
 * `server.connect(new StdioServerTransport())`, matching how `mcp.json`
 * launches this file as a child process (`node mcp/server.js`) for a
 * local/stdio MCP integration.
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Resolved relative to this file so the server works regardless of the
// process's current working directory when launched by an MCP client.
const RESULTS_DIR = path.join(__dirname, '..', 'shared', 'results');
const SUMMARY_PATH = path.join(RESULTS_DIR, 'summary.json');

function textResult(payload) {
  return {
    content: [
      {
        type: 'text',
        text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

/**
 * Read and parse `shared/results/<transactionId>.json`.
 *
 * @param {string} transactionId
 * @returns {{ found: boolean, data?: object, error?: string }}
 */
function readTransactionResult(transactionId) {
  const filePath = path.join(RESULTS_DIR, `${transactionId}.json`);

  if (!fs.existsSync(filePath)) {
    return { found: false };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return { found: true, data: JSON.parse(raw) };
  } catch (err) {
    return { found: false, error: `failed_to_read_result:${err.message}` };
  }
}

/**
 * List every per-transaction result file in `shared/results/`
 * (everything except `summary.json`), parsed into objects.
 *
 * @returns {object[]}
 */
function listAllResults() {
  if (!fs.existsSync(RESULTS_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(RESULTS_DIR)
    .filter((name) => name.endsWith('.json') && name !== 'summary.json');

  const results = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8');
      results.push(JSON.parse(raw));
    } catch (err) {
      // Skip unreadable/corrupt files rather than throwing.
      continue;
    }
  }

  return results;
}

function buildServer() {
  const server = new McpServer({
    name: 'pipeline-status',
    version: '1.0.0',
  });

  server.registerTool(
    'get_transaction_status',
    {
      title: 'Get transaction status',
      description:
        'Look up the final settlement record for one transaction_id from ' +
        'shared/results/. Returns a not-found object rather than throwing ' +
        'if the transaction has not been processed yet.',
      inputSchema: {
        transaction_id: z.string().describe('Transaction ID, e.g. "TXN001"'),
      },
    },
    async ({ transaction_id }) => {
      const result = readTransactionResult(transaction_id);

      if (!result.found) {
        return textResult({
          found: false,
          transaction_id,
          message: result.error
            ? `Error reading result for ${transaction_id}: ${result.error}`
            : `No pipeline result found for transaction_id "${transaction_id}". ` +
              'It may not have been processed yet.',
        });
      }

      return textResult({ found: true, transaction_id, result: result.data });
    }
  );

  server.registerTool(
    'list_pipeline_results',
    {
      title: 'List pipeline results',
      description:
        'Summarize every processed transaction in shared/results/: total ' +
        'count, counts per final_status, and the transaction_ids in each ' +
        'status bucket.',
      inputSchema: {},
    },
    async () => {
      const results = listAllResults();

      const byStatus = {};
      for (const record of results) {
        const status = record.final_status || record.data?.final_status || 'unknown';
        const txId = record.transaction_id || record.data?.transaction_id || 'unknown';

        if (!byStatus[status]) {
          byStatus[status] = [];
        }
        byStatus[status].push(txId);
      }

      const countsByStatus = {};
      for (const [status, ids] of Object.entries(byStatus)) {
        countsByStatus[status] = ids.length;
      }

      return textResult({
        total: results.length,
        counts_by_status: countsByStatus,
        transaction_ids_by_status: byStatus,
      });
    }
  );

  server.registerResource(
    'pipeline-summary',
    'pipeline://summary',
    {
      title: 'Pipeline run summary',
      description: 'Contents of shared/results/summary.json, the aggregate report from the last orchestrator run.',
      mimeType: 'text/plain',
    },
    async (uri) => {
      if (!fs.existsSync(SUMMARY_PATH)) {
        return {
          contents: [
            {
              uri: uri.href,
              text: 'No pipeline run yet — shared/results/summary.json does not exist. Run `npm run pipeline` first.',
            },
          ],
        };
      }

      const raw = fs.readFileSync(SUMMARY_PATH, 'utf8');
      return {
        contents: [
          {
            uri: uri.href,
            text: raw,
          },
        ],
      };
    }
  );

  return server;
}

async function main() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('pipeline-status MCP server failed to start:', err);
    process.exit(1);
  });
}

module.exports = { buildServer, readTransactionResult, listAllResults };
