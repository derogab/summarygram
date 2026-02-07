# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SummaryGram is a Telegram bot that summarizes group chat messages using AI. It supports multiple LLM backends (OpenAI, Ollama, Cloudflare AI, llama.cpp) via the `@derogab/llm-proxy` library.

## Build and Run Commands

```bash
# Install dependencies
npm install

# Compile TypeScript to JavaScript (outputs to ./out)
npm run compile

# Run the compiled bot
npm run start

# Docker deployment (includes Redis)
docker compose -f docker/docker-compose.yml up -d

# Stop Docker deployment
docker compose -f docker/docker-compose.yml down
```

## Architecture

The bot has a simple structure in `src/`:

- **index.ts**: Entry point. Initializes the grammY bot, sets up the `/summary` command listener and cron job scheduler.
- **controller/core.ts**: Core business logic with two main handlers:
  - `onMessageReceived`: Handles incoming messages, stores them in Redis, responds to `/summary` command, auto-summarizes long messages (>MSG_LENGTH_LIMIT chars)
  - `onCronJob`: Scheduled job that sends daily summaries to all active chats
- **utils/data.ts**: Redis storage layer. Messages stored with key pattern `chat:{chatId}` and expire after 8 hours of inactivity. Format: `username###message`.

## Key Dependencies

- **grammY**: Telegram bot framework
- **@derogab/llm-proxy**: Unified interface for multiple LLM providers (OpenAI, Ollama, Cloudflare, llama.cpp)
- **node-cron**: Scheduled summary jobs
- **redis**: Message history persistence

## Configuration

All configuration via environment variables (see README.md for full list). Key ones:
- `TELEGRAM_BOT_TOKEN` (required)
- `WHITELISTED_CHATS`: Comma-separated chat IDs for access control
- `CRON_SCHEDULE`: When to send auto-summaries (default: `59 23 * * *`), set to `never` to disable
- LLM provider configs: `OPENAI_API_KEY`, `OLLAMA_URI`/`OLLAMA_MODEL`, Cloudflare credentials, or `LLAMA_CPP_MODEL_PATH` for local inference

## Conventional Commits

This project follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Format

```
<type>: <description>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or modifying tests |
| `chore` | Maintenance tasks (dependencies, configs) |
| `build` | Changes to build system or dependencies |
| `perf` | Performance improvement |
| `ci` | CI/CD configuration changes |

### Examples

```bash
feat: add support for new LLM provider
fix: resolve timeout issue with Ollama requests
docs: update README with configuration examples
refactor: simplify provider selection logic
test: add unit tests for error handling
chore: update dependencies
```

### Breaking Changes

Add `!` after the type for breaking changes:

```bash
feat!: change API response format
```
