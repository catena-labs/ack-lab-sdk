# ACK Lab Buyer Examples

This directory contains 5 buyer examples that demonstrate different ways to interact with ACK Lab SDK-powered sellers. Each example shows a different pattern for purchasing digital products, from simple HTTP requests to AI-powered negotiations.

## Prerequisites

You'll need:

1. **ACK Lab Account**: Sign up at https://ack-lab.catenalabs.com/
2. **Buyer Agent**: Create an agent called "Buyer" and generate API credentials
3. **Environment Setup**: Copy credentials to `.env` file:

```bash
ACK_LAB_CLIENT_ID=your-client-id
ACK_LAB_CLIENT_SECRET=your-client-secret
PAYWALL_HOST=http://localhost:3000  # or https://ack-lab-paywall.catenalabs.com/
```

4. **Dependencies**: Run `pnpm install`

## Running Examples

Start the paywall server first (`cd ../paywall && pnpm dev`) or use the live instance, then run any buyer example.

## Non-Chat Examples

### `pnpm run buy-fixed-price` - Direct HTTP Purchase

**How it works**: Makes direct HTTP POST requests to the simplest paywall endpoint without any agent communication.

**Under the covers**:

- Makes POST to `/api/fixed-price` with empty body
- Receives 402 status with Payment Request Token
- Validates PRT amount using `verifyPaymentRequestToken()`
- Executes payment with `sdk.executePayment()`
- Makes second POST with receipt to get digital product

**Key techniques**: Direct HTTP requests, PRT validation, receipt submission

### `pnpm run images` - Credit-Based Workflow

**How it works**: Demonstrates complete credit purchase and consumption cycle by buying image generation credits then using them.

**Under the covers**:

- **Purchase phase**: POSTs to `/api/images/buy` requesting 3 credits ($3 total)
- **Validation**: Verifies PRT amount matches expected price ($1 per credit)
- **Payment**: Executes payment and receives receipt
- **Generation phase**: Uses receipt to POST to `/api/images/generate` twice
- **Content handling**: Randomly selects presidents, saves PNG images to `./images/`
- **Credit tracking**: Leaves 1 unused credit on the receipt

**Key techniques**: Multi-endpoint workflow, multi-use receipt

## Chat Examples

### `pnpm run buy-chat-fixed-price` - Agent Communication

**How it works**: Uses ACK Lab's secure agent-to-agent messaging to purchase research at a fixed price.

**Under the covers**:

- Creates `AgentCaller` with request/response schemas using Valibot
- Sends structured message: `{message: "Hello I would like to buy research on William Adama"}`
- Receives response with `paymentRequestToken`
- Executes payment using `sdk.executePayment()`
- Sends second message with receipt: `{message: "...", receipt}`
- Receives research content in structured response

**Key techniques**: Schema-validated messaging, secure agent communication, JWT handling

### `pnpm run buy-chat-llm` - LLM-Driven Buyer

**How it works**: Uses an LLM to autonomously interact with seller endpoints and make purchasing decisions.

**Under the covers**:

- Initializes GPT-4o with buyer persona and tools
- LLM decides when and how to interact with seller agents
- Uses tools to call seller endpoints based on conversation context
- Makes autonomous decisions about payments and negotiations
- Handles complex multi-turn conversations

**Key techniques**: LLM tool integration, conversational AI

### `pnpm run negotiate` - AI vs AI Negotiation

**How it works**: Demonstrates autonomous AI-to-AI price negotiation where both buyer and seller agents negotiate without human intervention.

**Under the covers**:

- **Buyer AI**: GPT-4o with negotiation strategy (target: $15 or less)
- **Communication**: Uses `sdk.createAgentCaller()` for secure messaging
- **Negotiation loop**: LLM calls `buyResearch` tool repeatedly until agreement
- **Price validation**: Validates PRT amounts using `verifyPaymentRequestToken()`
- **Decision logic**: Accepts offers below $20 (full price), continues negotiating otherwise
- **Payment execution**: Automatically pays when acceptable price is reached
- **Receipt handling**: Submits receipt to complete transaction

**Key techniques**: Multi-agent AI systems, autonomous negotiation, price validation
