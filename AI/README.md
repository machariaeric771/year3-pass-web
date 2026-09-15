# Year 3 Study OS — AI subsystem

This folder is designed to drop directly into the existing `YEAR3-STUDY-OS/AI/` directory.

## Current provider
OpenRouter.

## Default model
`openai/gpt-oss-120b`

## API key
Set `OPENROUTER_API_KEY` in the environment of the Electron main process. Do not put the key in renderer JavaScript, `models.json`, Git, or the packaged application source.

## Architecture
UI → preload/IPC → CORE → AI/aiManager.js → AI router → OpenRouter client → model.

The AI layer does not depend on any medical module existing yet. Later modules can pass subject/topic/content context into `AIManager.chat()`.

## Planned expansion
- persistent memory backed by DATA/
- streaming responses
- structured JSON tasks
- module-aware retrieval from DATA/
- model-specific routing and fallbacks
- token/cost tracking
- AI settings in DATA/system/settings.json
