# ACK-Lab SDK

TypeScript SDK for the [ACK-Lab](https://ack-lab.catenalabs.com) Developer Preview.

## Installation

```bash
npm install @ack-lab/sdk
```

## Quick Start

```ts
import { AckLabSdk } from "@ack-lab/sdk"

const sdk = new AckLabSdk({
  clientId: "your-client-id",
  clientSecret: "your-client-secret"
})
```

See an example of using this SDK in [./src/demo/addition-demo.ts](./src/demo/addition-demo.ts).

## Methods

### Constructor

```ts
new AckLabSdk(config: ApiClientConfig, opts?: { resolver?: Resolvable })
```

Create a new SDK instance with your client credentials.

### createAgentCaller(url: string)

```ts
const callAgent = sdk.createAgentCaller("http://localhost:3000/chat")
const response = await callAgent({ message: "Hello" })
```

Creates a function for calling another agent. Handles agent-to-agent authentication automatically.

### createRequestHandler(agentFn: AgentFn)

```ts
const handler = sdk.createRequestHandler(async (message) => {
  return `Echo: ${message}`
})

// Use with your HTTP server
app.post("/chat", async (req, res) => {
  const { jwt } = req.body
  const response = await handler(jwt)
  res.json(response)
})
```

Creates a handler for processing incoming authenticated requests.

### createPaymentRequest(minorUnits: number, { currencyCode = "USD", description?: string })

```ts
const paymentRequest = await sdk.createPaymentRequest(100, {
  currencyCode: "USD",
  description: "Service fee"
})
```

Creates a payment request for the specified amount, in minor units (e.g. cents for USD)

### executePayment(paymentToken: string)

```ts
const result = await sdk.executePayment(paymentToken)
```

Executes a payment using the provided payment token.

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com). See [`LICENSE`](./LICENSE).
