# How to Run

## Prerequisites

- [Claude Code](https://claude.ai/code) CLI installed
- [Node.js](https://nodejs.org/) v18+ (for the custom MCP server and `npx`)
- [GitHub CLI](https://cli.github.com/) (`gh`) authenticated — required for the GitHub MCP server

---

## 1. Install dependencies

Install the custom MCP server's dependencies:

```bash
cd local-resources-mcp
npm install
```

---

## 2. Connect external MCP servers

The three external MCP servers are declared in `.mcp.json` at the project root. Enable them in Claude Code from the project directory:

```bash
# Enable all servers listed in .mcp.json
claude mcp enable github
claude mcp enable filesystem
claude mcp enable atlassian
```

Or open the project in Claude Code — the `.claude/settings.json` file already lists `github`, `filesystem`, and `atlassian` in `enabledMcpjsonServers`, so they are picked up automatically.

The **Atlassian** server uses OAuth over HTTP. Claude Code will prompt you to authenticate the first time a tool from that server is called.

---

## 3. Register the custom MCP server

Register `local-resources-mcp` with Claude Code (run once; registration persists globally):

```bash
claude mcp add local-resources node /absolute/path/to/homework-5/local-resources-mcp/index.js
```

Replace `/absolute/path/to/homework-5` with the actual path on your machine (e.g. `C:\Development\_ai-courses\gen-ai-software-engineering\homework-5` on Windows).

Verify it is registered:

```bash
claude mcp list
```

---

## 4. Start Claude Code

Launch Claude Code in the project directory:

```bash
cd homework-5
claude
```

All configured MCP servers start automatically alongside the session.

---

## 5. Usage

### GitHub MCP

Ask Claude to interact with GitHub repositories and pull requests:

```
List my open pull requests in the gen-ai-software-engineering repo.
Show the latest commit on the main branch.
```

### Filesystem MCP

The server has read/write access to `C:\Development\_demo`. Ask Claude to list or read files in that directory:

```
List the files in the allowed directory.
Read the contents of demo.txt.
```

### Atlassian MCP

Interact with Jira and Confluence (requires authentication). Use Jira-specific language to avoid ambiguity with GitHub:

```
List my assigned Jira tickets in the current sprint.
Log 2 hours of work to Jira ticket PROJ-42.
```

### Custom local-resources MCP

Use the `read` tool or the resource template:

```
Read 50 words.
Give me 100 words.
```

Claude will call the `local-resources__read` tool and return the requested number of words from the lorem-ipsum corpus.
