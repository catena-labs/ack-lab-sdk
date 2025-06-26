# A2A SDK

Agent-to-Agent (A2A) protocol implementation for secure agent authentication and communication.

## Overview

The A2A SDK provides two main classes for implementing secure agent communication:

- **AckHubClientSdk**: Authenticate with agents and sign messages
- **AckHubServerSdk**: Handle authentication requests and verify client credentials

## API Reference

### AckHubClientSdk

Client-side SDK for agent authentication and message signing.

#### Constructor

```typescript
new AckHubClientSdk(config: AckHubSdkConfig)
```

**Config:**

- `clientId`: Your client identifier
- `clientSecret`: Your client secret
- `trustedIssuers?`: Array of trusted issuer DIDs
- `trustedAgentControllers?`: Array of trusted agent controller DIDs

#### Methods

##### `authenticate(url: string, serverDid: DidUri): Promise<void>`

Authenticate with a target agent server.

```typescript
await client.authenticate("http://localhost:3001", "did:web:example.com:agent")
```

##### `signMessage(message: Message): Promise<Message>`

Sign a message with your agent's credentials.

```typescript
const signedMessage = await client.signMessage({
  role: Role.User,
  parts: [{ type: "text", text: "Hello agent" }]
})
```

### AckHubServerSdk

Server-side SDK for handling authentication and verification.

#### Constructor

```typescript
new AckHubServerSdk(config: AckHubSdkConfig)
```

#### Methods

##### `handleRequest(request: SendMessageRequest): Promise<SendMessageResponse | undefined>`

Handle incoming A2A requests, including authentication and message verification.

Returns `undefined` if the request should be handled by your application logic.

## Usage Examples

### Client Implementation

```typescript
import { AckHubClientSdk } from "ack-hub-sdk/a2a"
import { A2AClient, Role } from "a2a-js"

const client = new AckHubClientSdk({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  trustedIssuers: ["did:web:example.com"],
  trustedAgentControllers: ["did:web:example.com:agent"]
})

// Authenticate with target agent
await client.authenticate("http://localhost:3001", "did:web:example.com:agent")

// Send signed message
const a2aClient = new A2AClient("http://localhost:3001")
const message = {
  role: Role.User,
  parts: [{ type: "text", text: "Hello agent" }]
}

const signedMessage = await client.signMessage(message)
const response = await a2aClient.sendTask({
  id: "task-id",
  message: signedMessage
})
```

### Server Implementation

```typescript
import { AckHubServerSdk } from "ack-hub-sdk/a2a"
import { A2AServer, DefaultA2ARequestHandler } from "a2a-js"

const serverSdk = new AckHubServerSdk({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  trustedIssuers: ["did:web:example.com"],
  trustedAgentControllers: ["did:web:example.com:agent"]
})

class AgentExecutor {
  async onMessageSend(request, task) {
    // Handle authentication and verification
    const authResult = await serverSdk.handleRequest(request)

    if (authResult) {
      return authResult
    }

    // Handle your application logic
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        role: Role.Agent,
        parts: [{ type: "text", text: "Message received" }]
      }
    }
  }
}

const server = new A2AServer(
  agentCard,
  new DefaultA2ARequestHandler(new AgentExecutor())
)
server.start({ port: 3001 })
```

## Error Handling

The SDK throws errors for:

- Authentication failures
- Invalid credentials
- Network errors
- Verification failures

Handle errors appropriately in your application:

```typescript
try {
  await client.authenticate(url, serverDid)
} catch (error) {
  console.error("Authentication failed:", error.message)
}
```
