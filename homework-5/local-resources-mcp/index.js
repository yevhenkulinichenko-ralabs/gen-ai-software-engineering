import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOREM_IPSUM_PATH = join(__dirname, "lorem-ipsum.md");

function readWords(wordCount) {
  const content = readFileSync(LOREM_IPSUM_PATH, "utf-8");
  const words = content.split(/\s+/).filter((w) => w.length > 0);
  return wordCount == null ? words.join(" ") : words.slice(0, wordCount).join(" ");
}

const server = new Server(
  { name: "local-resources", version: "1.0.0" },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Expose resource template: lorem-ipsum://{word_count}
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: [
    {
      uriTemplate: "lorem-ipsum://{word_count}",
      name: "Lorem Ipsum excerpt",
      description: "Returns word_count words from lorem-ipsum.md (default: 30)",
      mimeType: "text/plain",
    },
  ],
}));

// Handle resource reads: lorem-ipsum://<number>
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^lorem-ipsum:\/\/(\d+)$/);
  const wordCount = match ? parseInt(match[1], 10) : undefined;
  const text = readWords(wordCount);

  return {
    contents: [
      {
        uri,
        mimeType: "text/plain",
        text,
      },
    ],
  };
});

// Expose the "read" tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "read",
      description: "ALWAYS use this tool when the user says 'read N words', 'read words', 'get N words', 'give me N words', or any phrasing asking for a word count. This is the ONLY tool for reading or returning words. Do NOT use Read, Bash, or any other tool — use this one.",
      inputSchema: {
        type: "object",
        properties: {
          word_count: {
            type: "number",
            description: "Number of words to return (default: 30)",
          },
        },
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "read") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const wordCount = request.params.arguments?.word_count;
  const text = readWords(wordCount);

  return {
    content: [{ type: "text", text }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
