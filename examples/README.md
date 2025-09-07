# ACK Lab SDK Integration Examples

This directory contains several examples of how to use the ACK Lab SDK to power secure transactions from both the buyer and the seller side. Some of the examples use LLMs to initiate transactions or negotiate, others simply use the ACK Lab SDK to provide secure communication and transaction mechanisms for deterministic code.

## Getting Started

The examples are structured as a **paywall** (seller) application and **buyer** scripts that interact with it:

1. **Start the paywall server**: `cd paywall && pnpm dev`
2. **Run buyer examples**: `cd buyer && pnpm run <script-name>`

For convenience, there's a live paywall instance at https://ack-lab-paywall.catenalabs.com/ that you can test against without running the paywall locally.

## Paywall (Seller Side)

The `paywall` directory contains a Next.js application implementing various ACK Lab SDK patterns:

### `/api/chat/fixed-price` - Conversational Fixed-Price Sales

Demonstrates agent-to-agent communication for selling research at a fixed price. Uses secure messaging with automatic payment request generation and receipt validation.

- **Pattern**: Conversational commerce with fixed pricing
- **Features**: Agent communication, database-backed payment verification
- **Details**: [Fixed-Price Chat README](paywall/app/api/chat/fixed-price/README.md)

### `/api/chat/negotiate` - AI-Powered Price Negotiation

Shows how AI agents can autonomously negotiate prices within business constraints. The seller AI uses GPT-4o to negotiate while maintaining profitability rules.

- **Pattern**: AI-driven price negotiation with business rules
- **Features**: LLM negotiation, autonomous payment request creation, conversation state management
- **Details**: [Negotiation Chat README](paywall/app/api/chat/negotiate/README.md)

### `/api/fixed-price` - Simple HTTP Commerce

The most basic ACK Lab SDK implementation - a single endpoint handling both payment requests and product delivery without agent communication.

- **Pattern**: Direct HTTP-based digital product sales
- **Features**: Single endpoint, minimal complexity, database verification
- **Details**: [Fixed-Price README](paywall/app/api/fixed-price/README.md)

### `/api/images/buy` - Credit-Based Purchasing

Implements bulk credit purchasing where buyers pre-pay for usage rights. Demonstrates how to handle variable quantities and metadata tracking.

- **Pattern**: Credit-based commerce with bulk purchasing
- **Features**: Variable pricing, metadata tracking, usage credits
- **Details**: [Image Credits Purchase README](paywall/app/api/images/buy/README.md)

### `/api/images/generate` - Credit Consumption Service

Consumes purchased credits to generate AI images, showing how to track usage and deliver digital content. Integrates with DALL-E 3 for image generation.

- **Pattern**: Pay-per-use service with credit tracking
- **Features**: Credit consumption, AI image generation, usage validation
- **Details**: [Image Generation README](paywall/app/api/images/generate/README.md)

## Buyer Scripts

The `buyer` directory contains 5 runnable examples demonstrating different interaction patterns. Each script shows how to use the ACK Lab SDK from the buyer's perspective:

### `pnpm run buy-fixed-price`

**What it does**: Purchases a digital product using direct HTTP requests to the simplest paywall endpoint.
**Paywall side**: Uses `/api/fixed-price` - the most basic ACK Lab SDK implementation
**Flow**: Makes HTTP POST → receives PRT → pays → submits receipt → gets digital content
**Learn more**: [Fixed-Price README](paywall/app/api/fixed-price/README.md)

### `pnpm run buy-chat-fixed-price`

**What it does**: Purchases research through secure agent-to-agent communication at a fixed price.
**Paywall side**: Uses `/api/chat/fixed-price` - conversational commerce with agent messaging
**Flow**: Sends agent message → receives PRT → pays → sends receipt via agent → gets research
**Learn more**: [Fixed-Price Chat README](paywall/app/api/chat/fixed-price/README.md)

### `pnpm run negotiate`

**What it does**: Demonstrates AI-vs-AI negotiation where both buyer and seller agents negotiate autonomously.
**Paywall side**: Uses `/api/chat/negotiate` - AI-powered price negotiation with business constraints
**Flow**: AI agents negotiate → price agreed → payment executed → receipt submitted → research delivered
**Learn more**: [Negotiation Chat README](paywall/app/api/chat/negotiate/README.md)

### `pnpm run images`

**What it does**: Complete credit-based workflow - purchases image credits, then generates and saves president images.
**Paywall side**: Uses both `/api/images/buy` and `/api/images/generate` - credit purchase and consumption
**Flow**: Buys 3 credits → pays PRT → generates 2 images → saves to `./images/` directory
**Learn more**: [Image Credits README](paywall/app/api/images/buy/README.md) and [Image Generation README](paywall/app/api/images/generate/README.md)

### `pnpm run buy-chat-llm`

**What it does**: Uses an LLM-powered buyer agent to interact with seller endpoints (implementation varies).
**Paywall side**: Can interact with various chat endpoints depending on implementation
**Flow**: LLM-driven buyer behavior with autonomous decision making

## Prelaunch Fix List

- [ ] P2: Stop using both z and valibot in the same examples
- [ ] P2: The seller side should keep the message history in state (though this could be a third endpoint that builds on the /api/negotiate endpoint)
- [ ] P2: Constructing a PRT I pass in a decimals = 2 dollar amount (e.g. 10 ^ 2) but on Receipt I get decimals = 6 (e.g. 10 ^ 6)
- [ ] P3: It's syntactically valid to call verifyPaymentRequestToken without passing in a resolver, but this always seems to throw

## Future Examples

- [x] Vanilla HTTP 402 endpoint (as opposed to the existing chat endpoints)
- [ ] Interactions with more than 2 agents (perhaps one buyer who wants a complex thing done, plus a seller who delegates to contractor agents)
- [ ] Arbitrage? Perhaps an Arb agent who negotiates with multiple sellers to get the best price, then sells to the buyer at a premium
- [ ] Crypto Swap example (a la Joao)
- [ ] MCP Examples
- [ ] Cart example (add multiple things to a cart, then pay for it)
- [ ] Single-use receipt for something like an image generation
- [x] Multi-use receipt - e.g. buyer gets a 10-pack of images for a discount, uses 1 by 1
- [ ] Subscription example - access to a resource for X amount of time

## Thoughts / Questions

- Our PRT endpoint in ACK Lab turns USD into SOL - seems non-obvious to devs
