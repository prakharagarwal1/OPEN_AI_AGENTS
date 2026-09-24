# Sandbox Agents

Sandboxed code execution environment for autonomous AI agents with security controls.

## Features

- **Sandboxed code execution** for JavaScript, TypeScript, Python, Bash, Go, Rust
- **Command execution** with allowlist/blocklist security
- **Resource limits** - timeout, memory, CPU, process count
- **Docker integration** for isolated execution environments
- **Job management** - create, cancel, delete, list
- **Redis persistence** for job state
- **WebSocket support** for real-time job updates
- **Rate limiting** with Redis backend
- **API key authentication**

## Architecture

```
sandbox-agents/
├── src/
│   ├── index.ts           # Server entry point
│   ├── config/            # Environment configuration (Zod validated)
│   ├── llm/               # LLM client
│   ├── memory/            # Redis memory
│   ├── middleware/        # Auth & rate limiting
│   ├── routes/            # HTTP routes
│   ├── sandbox/           # Sandbox execution engine
│   │   ├── manager.ts     # Job orchestration & lifecycle
│   │   ├── executor.ts    # Code execution (JS/TS/Python)
│   │   ├── runner.ts      # Command execution (Bash/Go/Rust)
│   │   └── types.ts       # Type definitions
│   ├── utils/             # Logger
│   └── ws/websocket.ts    # WebSocket manager
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env
```

## Quick Start

```bash
cd sandbox-agents
npm install
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/v1/sandbox/jobs` - Create execution job
- `GET /api/v1/sandbox/jobs/:id` - Get job result
- `DELETE /api/v1/sandbox/jobs/:id` - Delete job
- `GET /api/v1/sandbox/jobs` - List all jobs
- `POST /api/v1/sandbox/jobs/:id/cancel` - Cancel running job
- `GET /api/v1/sandbox/commands/allowed` - List allowed commands
- `GET /api/v1/sandbox/status` - Get sandbox status
- `WS /ws` - WebSocket for real-time job updates

## Environment Variables

See `.env` for all configuration options.

## Docker

```bash
docker compose up --build
```
