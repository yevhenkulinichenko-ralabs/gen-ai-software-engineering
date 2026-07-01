# Homework 5 — MCP Servers

Exploration and implementation of Model Context Protocol (MCP) servers with Claude Code.

**Student Name**: Yevhen Kulinichenko AAI02  
**Date Submitted**: 01.07.2026  
**AI Tools Used**: Claude Code  

## Description

This project covers two aspects of MCP integration:

**External MCP servers** — three third-party MCP servers are configured in `.mcp.json`:

| Server | Transport | Purpose |
|--------|-----------|---------|
| `github` | stdio (`gh mcp serve`) | GitHub repository, issue, and PR management |
| `filesystem` | stdio (`npx @modelcontextprotocol/server-filesystem`) | Read/write access to a local directory |
| `atlassian` | HTTP (remote) | Jira and Confluence integration |

**Custom MCP server** (`local-resources-mcp/`) — a Node.js MCP server built with the official MCP SDK that exposes:

- **Resource template** `lorem-ipsum://{word_count}` — returns N words from a local lorem-ipsum corpus
- **Tool `read`** — callable by Claude; returns N words from the same corpus

