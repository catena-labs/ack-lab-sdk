# ACK Lab Buyer Demo

This directory contains 3 simple examples that show various ways to execute payments against a simple paywall. See the ../paywall directory for the Paywall API implementation.

## Setting up

All you need to run these examples is a free ACK Lab account and an ACK Lab Agent with an API key. Go to https://ack-lab.catenalabs.com/, sign in, and create a new agent called "Buyer". Create an API key for the agent and copy the client ID and client secret into the .env file:

```
ACK_LAB_CLIENT_ID=your-client-id
ACK_LAB_CLIENT_SECRET=your-client-secret
```

Install the dependencies:

```bash
pnpm install
```

Then run the examples:

## Non-Chat Examples

### One-time Purchase via HTTP endpoint

This example purchases a piece of content from a seller via a simple HTTP endpoint.

```bash
pnpm run fixed-price
```

### Bulk Purchase of images via HTTP endpoint

This example purchases a piece of content from a seller via a simple HTTP endpoint.

```bash
pnpm run images
```

## Chat Examples

### Simple Purchase via secure chat without an LLM

The simplest of the flows, this example does not use an LLM, just the ACK Lab SDK to securely purchase a piece of content from a seller.

```bash
pnpm run buy-chat
```

### Simple Purchase via secure chat triggered by an LLM

This example uses an LLM to purchase a piece of content from a seller.

```bash
pnpm run buy-agent
```

### Negotiated Purchase via secure chat triggered by an LLM

This example uses an LLM to purchase a piece of content from a seller, and negotiate the price.

```bash
pnpm run negotiate
```
