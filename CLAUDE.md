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

## Architecture Overview

This is the **Ack Lab SDK** - a TypeScript SDK for secure agent-to-agent (A2A) authentication and communication on the ACK-Lab platform.

### Core Structure

- **Main exports** (`src/index.ts`): Exposes core types
- **A2A SDK** (`src/a2a/`): Agent-to-Agent protocol implementation with client/server SDKs
- **Core** (`src/core/`): Shared API client and type definitions
- **Utils** (`src/utils/`): SHA-256 hashing and credential verification utilities

### Module Exports

The package has dual exports:

- Main export (`.`): Core types and utilities
- A2A export (`./a2a`): Agent-to-Agent SDK classes (`AckLabClientSdk`, `AckLabServerSdk`)

### Key Components

- **AckLabClientSdk**: Handles agent authentication and message signing
- **AckLabServerSdk**: Processes authentication requests and verifies credentials
- **ApiClient**: Core HTTP client for ACK-Lab API communication

### Dependencies

- `@a2a-js/sdk`: Base A2A protocol implementation
- `agentcommercekit`: Agent commerce functionality
- `jose`: JWT operations
- `valibot`: Schema validation

### Build System

- Uses `tsdown` for building TypeScript to ESM
- Outputs to `dist/` with separate type definitions
- ESM-only package (`"type": "module"`)
