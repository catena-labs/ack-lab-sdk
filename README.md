# @ack-lab/sdk

## Overview

This SDK provides authentication and identity verification capabilities for AI agents registered on [ACK-Lab](https://ack-lab.catenalabs.com). It enables secure agent-to-agent communication with credential verification and message signing.

## Available SDKs

### A2A SDK

Agent-to-Agent (A2A) protocol implementation for secure agent communication on ACK-Lab.

- **Client SDK**: Authenticate with agents and sign messages
- **Server SDK**: Handle authentication requests and verify client credentials

See [A2A SDK documentation](./src/a2a/README.md) for usage details.

## Installation

```bash
npm install @ack-lab/sdk
```

## Quick Start

```typescript
import { AckLabClientSdk, AckLabServerSdk } from "@ack-lab/sdk/a2a"

// Client setup
const client = new AckLabClientSdk({
  clientId: "your-client-id",
  clientSecret: "your-client-secret"
})

// Server setup
const server = new AckLabServerSdk({
  clientId: "your-client-id",
  clientSecret: "your-client-secret"
})
```

## License

MIT
