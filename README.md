# ACK-Lab SDK

TypeScript SDK for the [ACK-Lab](https://ack-lab.catenalabs.com) Developer Preview.

ACK-Lab is an experimental online service that makes it easy to research and test agentic payments using stablecoins. The service implements the [Agentic Commerce Kit (ACK)](https://www.agentcommercekit.com/) protocol and patterns.

## Installation

```bash
npm install @ack-lab/sdk
```

## Quick Start

```ts
import { AckLabAgent } from "@ack-lab/sdk"
import * as v from "valibot" // or any Standard Schema compliant library

const agent = new AckLabAgent({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  agentId: "your-agent-id"
})
```

See an example of using this SDK in [./src/demo/addition-demo.ts](./src/demo/addition-demo.ts).

To create your Client ID & Secret, sign up for a free account at [ACK-Lab](https://ack-lab.catenalabs.com). Create an Agent in the dashboard, copy the agent ID from the URL, and create a Client ID & Secret in the API Keys tab.

## Usage

The ACK Lab SDK offers a collection of agent-centric actions that can be performed using the `AckLabAgent` class:

- Requesting Payments from other Agents
- Making Payments to other Agents
- Exchanging secure messages and data with other Agents
- Verifying Payment Receipts from other Agents

### Payments

An Agent can generate a payment request token that can be sent to another agent:

```ts
const paymentRequest = await agent.createPaymentRequest({
  id: crypto.randomUUID(),
  amount: 100,
  currencyCode: "USD",
  description: "Service fee"
})
```

The payment request token can then be sent to another agent, who can execute it using the `executePayment` method:

```ts
const result = await otherAgent.executePayment(paymentRequestToken)
```

The result will contain the payment receipt, which can be verified by the agent who made the payment request using the `verifyPaymentReceipt` method:

```ts
try {
  const { receipt, paymentRequestId } = await agent.verifyPaymentReceipt(
    result.receipt
  )
} catch (e) {
  console.error("Failed to verify payment receipt:", e)
}

// paymentRequestId can be used to look up the payment request in your database
// and deliver the purchased goods/services to the buyer
```

### Messaging

The SDK also provides a secure messaging channel to allow LLMs on either side of a payment to exchange messages and data, simply by supplying an HTTP endpoint that the message will be sent to.

Under the covers, the function returned by `createAgentCaller` uses ACK and ACK Lab to securely perform an exchange of Verifiable Presentations between the two agents during an initial handshake process. This process verifies the identity of both agents and establishes a secure channel for subsequent messages. This happens transparently and is handled automatically by the ACK Lab SDK:

```ts
const sendMessage = agent.createAgentCaller(
  "https://some-chatty-bot.ai/chat",
  v.string(),
  v.string()
)
const response = await sendMessage("Hello!")

// after the initial handshake and the message has been sent, we're expecting this response to be "Echo: Hello!"
console.log(response)
```

The `/chat` endpoint above could look something like this, using `createRequestHandler` - the mirror of `createAgentCaller` - to automatically handle the secure reception of messages from the initiating agent:

```ts
// create an ACK Lab agent instance for the echo agent
const echoAgent = new AckLabAgent({
  clientId: "echo-agent-org-client-id",
  clientSecret: "echo-agent-org-client-secret",
  agentId: "echo-agent-id-from-ack-lab"
})

// this entire endpoint is just something that accepts a message and echoes it back
const handler = echoAgent.createRequestHandler(v.string(), async (message) => {
  return `Echo: ${message}`
})

// Use with your HTTP server
app.post("/chat", async (req, res) => {
  const { jwt } = req.body
  const response = await handler(jwt)
  res.json(response)
})
```

See the [buy-chat-fixed-price example](./examples/buyer) for an example where we send back structured data as well as text messages, allowing LLMs to respond flexibly.

### Examples

The SDK ships with a set of buy-side and sell-side examples, which you can find in the examples directory. The examples demonstrate a variety of payment patterns, from simple one-off payments through to AI-negotiated deals.

Check out the [examples README](./examples/README.md) to find out more and run the examples yourself.

## Methods

### Constructor

```ts
new AckLabAgent(config: ApiClientConfig, opts?: { resolver?: Resolvable })
```

Create a new agent instance with your client credentials.

### createAgentCaller(url: string, inputSchema: Schema, outputSchema: Schema)

```ts
const callAgent = agent.createAgentCaller(
  "http://localhost:3000/chat",
  v.object({ message: v.string() }),
  v.string()
)
const response = await callAgent({ message: "Hello" })
```

Creates a function for calling another agent. Handles agent-to-agent authentication automatically.

The schema parameters accept any [Standard Schema](https://standardschema.dev/) compliant validation library.

### createRequestHandler(schema: Schema, handler: HandlerFn)

```ts
const handler = agent.createRequestHandler(
  v.object({ message: v.string() }),
  async (input) => {
    return `Echo: ${input.message}`
  }
)

// Use with your HTTP server
app.post("/chat", async (req, res) => {
  const { jwt } = req.body
  const response = await handler(jwt)
  res.json(response)
})
```

Creates a handler for processing incoming authenticated requests.

The schema parameter accepts any [Standard Schema](https://standardschema.dev/) compliant validation library.

### createPaymentRequest(params: { id?: string, amount: number, currencyCode?: string, description?: string })

```ts
const paymentRequest = await agent.createPaymentRequest({
  id: crypto.randomUUID(),
  amount: 100,
  currencyCode: "USD",
  description: "Service fee"
})
```

Creates a payment request for the specified amount, in minor units (e.g. cents for USD)

### executePayment(paymentRequestToken: string)

```ts
const result = await agent.executePayment(paymentRequestToken)
```

Executes a payment using the provided payment request token.

### verifyPaymentReceipt(receipt: string)

```ts
const { receipt, paymentRequestId } =
  await agent.verifyPaymentReceipt(receiptString)
```

Verifies a payment receipt and returns the verified receipt along with the associated payment request ID.

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com). See [`LICENSE`](./LICENSE).
