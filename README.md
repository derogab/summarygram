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

### Setup

#### 1. Create Telegram Bot
1. Open Telegram and search for [@BotFather](https://t.me/botfather).
2. Send `/newbot` command and follow the instructions.
3. Choose a name and username for your bot.
4. Save the bot token provided by BotFather.

#### 2. Configure Bot Privacy
1. Send `/setprivacy` to [@BotFather](https://t.me/botfather).
2. Select your bot from the list.
3. Choose "Disable" to allow the bot to read group messages.
4. This is required for the bot to access and summarize group messages.

#### 3. Configure Environment
1. **For OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys).
2. **For Ollama**: No API key needed, just ensure Ollama is running locally.
3. **For Cloudflare AI**: Get your account ID and auth key from [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens).
4. Create a `.env` file in the project root with your configuration:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   OPENAI_API_KEY=your_openai_key_here
   # Add other variables as needed
   ```

### Deployment

#### Start the Bot
```bash
docker compose -f docker/docker-compose.yml up -d
```

#### Stop the Bot
```bash
docker compose -f docker/docker-compose.yml down
```

### Usage

#### 1. Add the Bot to a Group
1. Add your bot to any Telegram group where you want to use it.
2. The bot will automatically start monitoring messages in the group.
3. If you want to restrict the bot to specific groups, add the group IDs to the `WHITELISTED_CHATS` environment variable, separated by commas, and restart the bot.

#### 2. Use Summary Command
- Send `/summary` in the group chat.
- The bot will analyze all available messages in the chat and provide a concise summary. The message history is automatically cleared after 8 hours of inactivity.

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
