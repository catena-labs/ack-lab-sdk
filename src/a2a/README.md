# A2A SDK

Agent-to-Agent (A2A) protocol implementation for secure agent authentication and communication.

## Overview

The A2A SDK provides two main classes for implementing secure agent communication:

- **AckLabClientSdk**: Authenticate with agents and sign messages
- **AckLabServerSdk**: Handle authentication requests and verify client credentials

## API Reference

### AckLabClientSdk

Client-side SDK for agent authentication and message signing.

#### Constructor

```typescript
new AckLabClientSdk(config: AckHubSdkConfig)
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
  role: "user",
  parts: [{ type: "text", text: "Hello agent" }]
})
```

### AckLabServerSdk

Server-side SDK for handling authentication and verification.

#### Constructor

```typescript
new AckLabServerSdk(config: AckHubSdkConfig)
```

#### Methods

##### `handleRequest(request: SendMessageRequest): Promise<SendMessageResponse | undefined>`

Handle incoming A2A requests, including authentication and message verification.

Returns `undefined` if the request should be handled by your application logic.

## Usage Examples

### Client Implementation

```typescript
import { A2AClient } from "@a2a-js/sdk"
import { AckLabClientSdk } from "ack-lab-sdk/a2a"

const client = new AckLabClientSdk({
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
  kind: "message",
  messageId: "message-id",
  role: "user",
  parts: [{ kind: "text", text: "Hello agent" }]
}

const signedMessage = await client.signMessage(message)
const response = await a2aClient.sendMessage({
  message: signedMessage
})
```

### Server Implementation

```typescript
import { AckLabServerSdk } from "ack-lab-sdk/a2a"
import { A2AServer, DefaultA2ARequestHandler } from "@a2a-js/sdk"

const serverSdk = new AckLabServerSdk({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  trustedIssuers: ["did:web:example.com"],
  trustedAgentControllers: ["did:web:example.com:agent"]
})

class AgentExecutor {
  async execute(requestContext, eventBus) {
    // Handle authentication and verification
    const authResult = await serverSdk.handleRequest(requestContext)

    if (authResult) {
      eventBus.publish(authResult)
    }

    // Handle your application logic
    eventBus.publish({
      kind: "message"
      messageId: "response-id",
      role: "agent",
      parts: [{ kind: "text", text: "Message received" }]
    }
  }
}

const server = new A2AExpressApp(
  new DefaultRequestHandler(agentCard, new InMemoryTaskStore(), agent)
).setupRoutes(express(), "")
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
