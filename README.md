# ACK-Lab SDK

TypeScript SDK for the [ACK-Lab](https://ack-lab.catenalabs.com) Developer Preview.

## Installation

```bash
npm install @ack-lab/sdk
```

## Quick Start

```ts
import { AckLabSdk } from "@ack-lab/sdk"
import * as v from "valibot" // or any Standard Schema compliant library

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

### createAgentCaller(url: string, inputSchema: Schema, outputSchema: Schema)

```ts
const callAgent = sdk.createAgentCaller(
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
const handler = sdk.createRequestHandler(
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
const paymentRequest = await sdk.createPaymentRequest({
  id: crypto.randomUUID(),
  amount: 100,
  currencyCode: "USD",
  description: "Service fee"
})
```

Creates a payment request for the specified amount, in minor units (e.g. cents for USD)

### executePayment(paymentRequestToken: string)

```ts
const result = await sdk.executePayment(paymentRequestToken)
```

Executes a payment using the provided payment request token.

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com). See [`LICENSE`](./LICENSE).
