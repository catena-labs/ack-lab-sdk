# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development

- `pnpm build` - Build the SDK using tsdown
- `pnpm test` - Run tests using Vitest
- `pnpm check` - Run all checks (format, lint, types, publint, tests)
- `pnpm check:types` - Type check with TypeScript
- `pnpm check:lint` - Lint with ESLint
- `pnpm check:format` - Check formatting with Prettier
- `pnpm format` - Format code with Prettier
- `pnpm lint:fix` - Auto-fix linting issues

### Testing

- `pnpm test` - Run all tests
- `vitest` - Run tests directly (supports watch mode if needed)

### Demo

- `pnpm demo` - Run the addition demo showcasing agent-to-agent communication

## Architecture Overview

This is the **Ack Lab SDK** - a TypeScript SDK for secure agent-to-agent (A2A) authentication and communication on the ACK-Lab platform.

### Core Structure

- **Main export** (`src/index.ts`): Exposes the main `AckLabSdk` class
- **SDK implementation** (`src/sdk.ts`): Core `AckLabSdk` class with agent caller and request handler factories
- **Core** (`src/core/`): API client, handshake protocol, and type definitions
- **Utils** (`src/utils/`): Challenge generation and SHA-256 hashing utilities
- **Demo** (`src/demo/`): Example implementations showing A2A communication patterns

### Key Components

- **AckLabSdk**: Main SDK class that provides high-level APIs for agent-to-agent communication
  - `createAgentCaller(url)`: Creates a function for calling remote agents with automatic authentication
  - `createRequestHandler(agentFn)`: Creates a handler for processing incoming authenticated requests
  - Handles cryptographic handshake protocol automatically
- **ApiClient**: HTTP client for ACK-Lab platform API with JWT-based authentication
- **HandshakeClient**: Manages the multi-step cryptographic handshake protocol between agents
- **Challenge utilities**: Generate and verify random challenges for security

### Dependencies

- `agentcommercekit`: Agent commerce functionality and DID resolution
- `jose`: JWT operations and cryptographic functions
- `valibot`: Schema validation and type safety
- `uuid`: UUID generation for challenges
- `safe-stable-stringify`: Deterministic JSON serialization

### Build System

- Uses `tsdown` for building TypeScript to ESM
- Single entry point at `src/index.ts`
- Outputs to `dist/` with separate type definitions
- ESM-only package (`"type": "module"`)
- Vitest for testing with pass-through configuration for no tests
