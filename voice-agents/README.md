# Voice Agents

Real-time voice agents with speech-to-text, text-to-speech, and conversational AI.

## Features

- **Real-time Voice Processing**: Low-latency audio streaming
- **Speech-to-Text**: DeepGram-powered transcription
- **Text-to-Speech**: ElevenLabs-powered voice synthesis
- **Voice Activity Detection**: Automatic speech detection and silence handling
- **Conversational AI**: Context-aware LLM responses
- **WebSocket Streaming**: Real-time bidirectional audio streaming
- **Session Management**: Redis-backed conversation state

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5
- **Framework**: Express 4
- **STT**: DeepGram Nova-2
- **TTS**: ElevenLabs Multilingual v2
- **LLM**: OpenAI GPT-4o
- **Cache**: Redis 7
- **WebSocket**: ws library
- **Validation**: Zod
- **Logging**: Winston

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional)
- OpenAI API key
- DeepGram API key
- ElevenLabs API key

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

### Voice Sessions

```bash
POST /api/v1/voice/session          # Create session
GET /api/v1/voice/session/:id       # Get session
DELETE /api/v1/voice/session/:id    # Delete session
POST /api/v1/voice/session/:id/stop # Stop session
GET /api/v1/voice/sessions          # List sessions
```

### Transcript

```bash
POST /api/v1/voice/session/:id/transcript  # Add transcript entry
GET /api/v1/voice/session/:id/transcript  # Get transcript
```

### Health

```bash
GET /health
GET /health/ready
GET /health/live
```

## WebSocket

Connect to `ws://localhost:3002/ws` with header `x-api-key: your-api-key`.

Send binary audio data for real-time transcription.
Send control messages to manage sessions.

## Environment Variables

See `.env` for all configuration options.

## Project Structure

```
voice-agents/
├── src/
│   ├── index.ts          # Server entry point
│   ├── config/           # Configuration
│   ├── utils/            # Utilities (logger)
│   ├── memory/           # Redis & conversation management
│   ├── voice/            # Voice pipeline components
│   │   ├── pipeline.ts   # Voice processing pipeline
│   │   ├── stt.ts        # Speech-to-text provider
│   │   ├── tts.ts        # Text-to-speech provider
│   │   ├── vad.ts        # Voice activity detection
│   │   ├── llm.ts        # LLM client
│   │   └── types.ts      # Type definitions
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
