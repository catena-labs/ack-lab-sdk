# ACK Lab Paywall Demo

This directory contains a Next.js application implementing 5 different ACK Lab SDK patterns as API endpoints. Each endpoint demonstrates a different approach to digital commerce, from simple HTTP transactions to AI-powered negotiations.

These Paywall endpoints power the buyer-side examples that can be found inside the `examples/buyer` directory of the ACK Lab SDK. Each buyer-side example there calls one or more of these endpoints.

## Prerequisites

You'll need:

1. **ACK Lab Account**: Sign up at https://ack-lab.catenalabs.com/
2. **Paywall Agent**: Create an agent called "Paywall" and generate API credentials
3. **Environment Setup**: Copy credentials to `.env` file:

```bash
ACK_LAB_CLIENT_ID=your-client-id
ACK_LAB_CLIENT_SECRET=your-client-secret
OPENAI_API_KEY=your-openai-key  # Optional, required for LLM and image generation endpoints
```

4. **Database Setup**: The app uses Drizzle ORM with PostgreSQL for payment request tracking

## Running the Paywall

Install dependencies and start the server:

```bash
pnpm install
pnpm run setup # Creates the database and .env file; you still need to populate ACK_LAB_CLIENT_* vars
pnpm run dev
```

The paywall runs on http://localhost:3000 and provides API endpoints that buyer scripts can interact with.

## Testing with Buyer Scripts

Each endpoint can be tested using corresponding buyer scripts from the `../buyer` directory:

- **Simple HTTP**: `pnpm run buy-fixed-price` → `/api/fixed-price`
- **Agent Chat**: `pnpm run buy-chat-fixed-price` → `/api/chat/fixed-price`
- **AI Negotiation**: `pnpm run negotiate` → `/api/chat/negotiate`
- **Credit Workflow**: `pnpm run images` → `/api/images/buy` + `/api/images/generate`

## API Endpoints

### `/api/fixed-price` - Simple HTTP Commerce

The most basic ACK Lab SDK implementation - handles both payment requests and product delivery in a single endpoint.

- **How it works**: Direct HTTP POST requests without agent communication
- **Pattern**: Fixed-price digital product sales
- **Buyer script**: `cd ../buyer && pnpm run buy-fixed-price`
- **Details**: [Fixed-Price README](app/api/fixed-price/README.md)

### `/api/chat/fixed-price` - Conversational Fixed-Price Sales

Demonstrates secure agent-to-agent communication for selling research at a fixed price.

- **How it works**: Uses ACK Lab's secure messaging with structured schemas
- **Pattern**: Conversational commerce with agent communication
- **Buyer script**: `cd ../buyer && pnpm run buy-chat-fixed-price`
- **Details**: [Fixed-Price Chat README](app/api/chat/fixed-price/README.md)

### `/api/chat/negotiate` - AI-Powered Price Negotiation

Shows autonomous AI agents negotiating prices within business constraints using GPT-4o.

- **How it works**: LLM-driven negotiation with autonomous payment request creation
- **Pattern**: AI-vs-AI price negotiation with business rules
- **Buyer script**: `cd ../buyer && pnpm run negotiate`
- **Details**: [Negotiation Chat README](app/api/chat/negotiate/README.md)

### `/api/images/buy` - Credit-Based Purchasing

Implements bulk credit purchasing where buyers pre-pay for image generation rights.

- **How it works**: Variable quantity purchasing with metadata tracking
- **Pattern**: Credit-based commerce with bulk purchasing
- **Buyer script**: `cd ../buyer && pnpm run images` (uses both buy and generate)
- **Details**: [Image Credits Purchase README](app/api/images/buy/README.md)

### `/api/images/generate` - Credit Consumption Service

Consumes purchased credits to generate AI images using DALL-E 3, with usage tracking.

- **How it works**: Credit validation, AI image generation, and credit consumption
- **Pattern**: Pay-per-use service with credit tracking
- **Buyer script**: `cd ../buyer && pnpm run images` (uses both buy and generate)
- **Details**: [Image Generation README](app/api/images/generate/README.md)

## Prerequisites

You'll need:

1. **ACK Lab Account**: Sign up at https://ack-lab.catenalabs.com/
2. **Paywall Agent**: Create an agent called "Paywall" and generate API credentials
3. **Environment Setup**: Copy credentials to `.env` file:

```bash
ACK_LAB_CLIENT_ID=your-client-id
ACK_LAB_CLIENT_SECRET=your-client-secret
OPENAI_API_KEY=your-openai-key  # Optional, required for LLM and image generation endpoints
```

4. **Database Setup**: The app uses Drizzle ORM with PostgreSQL for payment request tracking

## Running the Paywall

Install dependencies and start the server:

```bash
pnpm install
pnpm run dev
```

The paywall runs on http://localhost:3000 and provides API endpoints that buyer scripts can interact with.

## Testing with Buyer Scripts

Each endpoint can be tested using corresponding buyer scripts from the `../buyer` directory:

- **Simple HTTP**: `pnpm run buy-fixed-price` → `/api/fixed-price`
- **Agent Chat**: `pnpm run buy-chat-fixed-price` → `/api/chat/fixed-price`
- **AI Negotiation**: `pnpm run negotiate` → `/api/chat/negotiate`
- **Credit Workflow**: `pnpm run images` → `/api/images/buy` + `/api/images/generate`

## Architecture Patterns

### Database-First Payment Requests

All endpoints store payment requests in the database before creating ACK Lab payment requests, enabling receipt verification:

```typescript
// Store first
const prt = await db.insert(paymentRequestsTable).values({...}).returning()
// Then create with ACK Lab
const { paymentRequestToken } = await agent.createPaymentRequest({id: prt[0].id})
```

### Receipt Validation

Two-step verification ensures security:

```typescript
// 1. Cryptographic verification
const { paymentRequestId } = await agent.verifyPaymentReceipt(receipt)
// 2. Database verification
const prt = await getDbPaymentRequest(paymentRequestId)
```

### Agent Communication

Chat endpoints use structured messaging:

```typescript
export const handler = agent.createRequestHandler(inputSchema, processMessage)
```

## Security Features

- **Cryptographic Receipt Verification**: All receipts are validated cryptographically
- **Payment Request Tracking**: Database storage prevents replay attacks
- **Schema Validation**: Input/output validation using Valibot
- **Secure Agent Communication**: JWT-based encrypted messaging
