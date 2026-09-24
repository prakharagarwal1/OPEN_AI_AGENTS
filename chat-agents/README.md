# Chat Agents

A multi-agent chat system with LLM routing, conversation memory, and tool calling.

## Features

- **Multi-Agent Architecture**: General, Code, Research, and Support agents
- **Smart Routing**: Automatically routes requests to the best agent
- **Conversation Memory**: Redis-backed conversation history
- **Tool Calling**: Code execution, web search, file operations, calculations
- **WebSocket Support**: Real-time chat over WebSocket
- **Rate Limiting**: Redis-backed rate limiting
- **Docker Ready**: Production-ready Docker configuration

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5
- **Framework**: Express 4
- **LLM**: OpenAI API
- **Cache**: Redis 7
- **WebSocket**: ws library
- **Validation**: Zod
- **Logging**: Winston

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional)
- OpenAI API key

### Local Development

```bash
# Install dependencies
npm install

# Copy and edit environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Docker

```bash
# Start with Docker Compose (includes Redis)
docker-compose up -d

# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up -d
```

## API Endpoints

### Chat

```bash
POST /api/v1/chat
{
  "message": "Hello!",
  "conversationId": "optional-id",
  "stream": false
}
```

### Agents

```bash
GET /api/v1/agents
POST /api/v1/agents/:agentId/test
```

### Health

```bash
GET /health
GET /health/ready
GET /health/live
```

## WebSocket

Connect to `ws://localhost:3001/ws` with header `x-api-key: your-api-key`.

## Environment Variables

See `.env` for all configuration options.

## Project Structure

```
chat-agents/
├── src/
│   ├── index.ts          # Server entry point
│   ├── config/           # Configuration
│   ├── utils/            # Utilities (logger)
│   ├── memory/           # Redis & conversation management
│   ├── llm/              # LLM client
│   ├── agents/           # Agent registry, types, implementations
│   ├── tools/            # Tool implementations
│   ├── routes/           # API routes
│   ├── middleware/       # Auth, rate limiting
│   └── ws/               # WebSocket manager
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env
├── package.json
└── tsconfig.json
```

## License

MIT
