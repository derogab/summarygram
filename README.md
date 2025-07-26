<p align="center">
  <img src="./.github/assets/logo.png" width="140px" style="border-radius: 15%;">
</p>
<h1 align="center">SummaryGram</h1>
<p align="center">A Dockerized Telegram bot that summarize last messages in a group</p>
<p align="center">
  <a href="https://github.com/derogab/summarygram/actions/workflows/docker-publish.yml">
    <img src="https://github.com/derogab/summarygram/actions/workflows/docker-publish.yml/badge.svg">
  </a>
</p>

### Features

- 🤖 Telegram bot interface
- ⚙️ Command-based interaction
- 📝 Summarize recent messages in group chats
- 🧠 AI-powered summarization
- 🔌 Customizable LLM integration (OpenAI, [Ollama](https://github.com/ollama/ollama), Cloudflare AI)
- 🐳 Docker containerized for easy deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token (required) | - |
| `WHITELISTED_CHATS` | Comma-separated list of allowed chat IDs (optional) | - |
| `OPENAI_API_KEY` | Your OpenAI API key (optional, for OpenAI integration) | - |
| `OLLAMA_URI` | URI for the Ollama server (optional) | http://localhost:11434 |
| `OLLAMA_MODEL` | Model to use with Ollama (optional) | llama3.1 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (optional, for Cloudflare AI) | - |
| `CLOUDFLARE_AUTH_KEY` | Cloudflare authorization key (optional, for Cloudflare AI) | - |
| `CLOUDFLARE_MODEL` | Cloudflare model name (optional, for Cloudflare AI) | - |
| `REDIS_URL` | URL for the Redis server (optional) | redis://localhost:6379 |

### Credits
_SummaryGram_ is made with ♥ by [derogab](https://github.com/derogab) and it's released under the [MIT license](./LICENSE).

### Contributors

<a href="https://github.com/derogab/summarygram/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=derogab/summarygram" />
</a>

### Tip
If you like this project or directly benefit from it, please consider buying me a coffee:  
🔗 `bc1qd0qatgz8h62uvnr74utwncc6j5ckfz2v2g4lef`  
⚡️ `derogab@sats.mobi`  
💶 [Sponsor on GitHub](https://github.com/sponsors/derogab)

### Stargazers over time

[![Stargazers over time](https://starchart.cc/derogab/summarygram.svg)](https://starchart.cc/derogab/summarygram)
