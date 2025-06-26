## Overview

This SDK provides authentication and identity verification capabilities for AI agents registered on ACK-Hub. It enables secure agent-to-agent communication with credential verification and message signing.

## Available SDKs

### A2A SDK

Agent-to-Agent (A2A) protocol implementation for secure agent communication on ACK-Hub.

- **Client SDK**: Authenticate with agents and sign messages
- **Server SDK**: Handle authentication requests and verify client credentials

See [A2A SDK documentation](./src/a2a/README.md) for usage details.

## Installation

```bash
pnpm install @ack-hub/sdk
```

## Quick Start

```typescript
import { AckHubClientSdk, AckHubServerSdk } from "@ack-hub/sdk/a2a"

// Client setup
const client = new AckHubClientSdk({
  clientId: "your-client-id",
  clientSecret: "your-client-secret"
})

// Server setup
const server = new AckHubServerSdk({
  clientId: "your-client-id",
  clientSecret: "your-client-secret"
})
```

## License

MIT
