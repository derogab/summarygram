# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SummaryGram is a Telegram bot that summarizes group chat messages using AI. It supports:
- **Multiple LLM backends**: OpenAI, Ollama, Cloudflare AI, llama.cpp via `@derogab/llm-proxy`
- **Voice transcription**: Converts voice messages to text using whisper.cpp (local) or Cloudflare AI Whisper via `@derogab/stt-proxy`
- **Auto-summarization**: Long messages (>MSG_LENGTH_LIMIT) get automatic TL;DR summaries
- **Scheduled summaries**: Daily conversation digests via cron jobs

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

- **index.ts**: Entry point. Initializes the grammY bot, sets up message listeners and cron job scheduler.
- **controller/core.ts**: Core business logic with two main handlers:
  - `onMessageReceived`: Handles incoming messages including:
    - Voice/audio message transcription (if STT configured)
    - Stores messages in Redis
    - Responds to `/summary` command
    - Auto-summarizes long messages (>MSG_LENGTH_LIMIT chars)
  - `onCronJob`: Scheduled job that sends daily summaries to all active chats
- **utils/data.ts**: Redis storage layer. Messages stored with key pattern `chat:{chatId}` and expire after 8 hours of inactivity. Format: `username###message`.

## Key Dependencies

- **grammY**: Telegram bot framework
- **@derogab/llm-proxy**: Unified interface for multiple LLM providers (OpenAI, Ollama, Cloudflare, llama.cpp)
- **@derogab/stt-proxy**: Unified interface for speech-to-text providers (whisper.cpp, Cloudflare AI Whisper)
- **node-cron**: Scheduled summary jobs
- **redis**: Message history persistence

## Configuration

All configuration via environment variables (see README.md for full list). Key ones:

**Required:**
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token

**Access Control:**
- `WHITELISTED_CHATS`: Comma-separated chat IDs to restrict bot access

**LLM Configuration (choose one):**
- `LLM_PROVIDER`: Force specific provider (`openai`, `ollama`, `cloudflare`, `llama.cpp`) - auto-detects if not set
- `OPENAI_API_KEY` + `OPENAI_MODEL`: OpenAI integration
- `OLLAMA_URI` + `OLLAMA_MODEL`: Ollama integration
- `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_AUTH_KEY` + `CLOUDFLARE_MODEL`: Cloudflare AI
- `LLAMA_CPP_MODEL_PATH`: Local llama.cpp inference

**STT Configuration (optional, for voice transcription):**
- `STT_PROVIDER`: Force specific provider (`whisper.cpp`, `cloudflare`) - auto-detects if not set
- `WHISPER_CPP_MODEL_PATH`: Path to Whisper GGML model for local transcription
- Or use Cloudflare credentials above for cloud-based transcription

**Other:**
- `CRON_SCHEDULE`: When to send auto-summaries (default: `59 23 * * *`), set to `never` to disable
- `MSG_LENGTH_LIMIT`: Minimum chars to trigger auto-summarization (default: `1000`)
- `REDIS_URL`: Redis connection string (default: `redis://localhost:6379`)

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
