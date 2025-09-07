# AI-Powered Price Negotiation Example

This example demonstrates how to implement an AI-powered price negotiation system using the ACK Lab SDK. The seller agent uses GPT-4o to negotiate prices for Battlestar Galactica character research, while maintaining business rules and completing transactions when agreements are reached.

## Overview

This example implements an AI-driven negotiation pattern where:

1. A buyer initiates negotiation for specific research products
2. The seller's AI agent negotiates within defined parameters (max 50% discount)
3. When a price is agreed upon, the AI creates a Payment Request Token
4. The buyer pays and receives a receipt
5. The seller validates the receipt and delivers the research content
6. Both sides can be run independently to test the full negotiation flow

## Files

- `route.ts` - Next.js API route that handles negotiation requests
- `agent.ts` - AI-powered negotiation logic and payment processing

## How It Works

### 1. Product Catalog and AI Instructions

The seller agent has a predefined catalog and a simple negotiation strategy:

```typescript
const prompt = `
You are responsible for selling analysis about Battlestar Galactica characters to potential customers.
Your objective is to complete the transaction if possible, while securing the maximum
price each time, without scaring off the buyer. Do not give a discount of more than 50%.

Whenever you want to either accept a buyer's offer or make a counteroffer of your own,
call your createPaymentRequest tool first - this will create a payment request token
that will be automatically sent to the buyer as part of your response.
`
```

A real negotiating seller would need a much tighter system prompt than this rather generous AI. Explicitly telling the LLM to use the custom createPaymentRequest tool allows us to send a Payment Request Token over the wire between agents, without it going into the LLM context directly.

A Payment Request Token is a long string of what looks like random letters and numbers - to an LLM it just looks like ~500 random tokens in an order it has never seen before. Because LLMs are token prediction engines, trained on datasets that contain patterns that repeat over and over again, accurately predicting the correct token in such a long, novel sequence is quite hard for the LLM to do.

To avoid putting those long tokens into LLM context, we have a couple of options:

1. Use a shorter token or URL to load the full Payment Request Token from
2. Send the Payment Request Token out-of-band with the chat message

Our [Marketplace Seller Demo](https://github.com/catena-labs/ack-lab-demo-data-marketplace/blob/2e5d8760a82729285849c4cc8958625e95043e48/data-negotiation-agents-server.ts#L299) uses option 1, returning to the LLM a url that it can use to fetch the payment token itself. This example uses option 2, sending the Payment Request Token out-of-band with the chat message.

### 2. AI Tool Integration for Payment Requests

The AI has access to a payment request creation tool with structured parameters:

```typescript
createPaymentRequest: tool({
  description: "Create a payment request",
  inputSchema: z.object({
    productId: z.string().describe("ID of the product to purchase"),
    amount: z.number().describe("Amount of the payment request in USD"),
    description: z.string().describe("Description of the payment request")
  }),

  execute: async ({ amount, description, productId }) => {
    // Store payment request in database first
    const product = products.find((product) => product.id === productId)
    const prt = await db
      .insert(paymentRequestsTable)
      .values({
        price: amount,
        metadata: { productId: product.id }
      })
      .returning()

    // Create ACK Lab payment request
    const { paymentRequestToken } = await sdk.createPaymentRequest({
      description: description,
      amount: product.price * 100, // Convert to cents
      currencyCode: "USD",
      id: prt[0].id
    })

    return "Payment Request token created"
  }
})
```

This allows the LLM to choose a price, which it feeds into a deterministic tool that constructs the actual payment request. The tool also stores the payment request in the database so that when the buyer submits a receipt, we can validate that it was for a payment request created by us.

### 3. Receipt Validation and Product Delivery

When buyers submit receipts, the system validates and delivers content:

```typescript
if (receipt) {
  // Verify receipt cryptographically
  const { paymentRequestId } = await sdk.verifyPaymentReceipt(receipt)

  // Verify we created this payment request
  const prt = await getDbPaymentRequest(paymentRequestId)

  if (!prt) {
    throw new Error("Payment request not found")
  }

  // Find and deliver the specific product
  const product = products.find(
    (product) => product.id === prt.metadata.productId
  )

  return {
    message: "Thank you for your purchase! Here is your research",
    research: product.content
  }
}
```

**Why we do this:**

- Cryptographically verifying the receipt guarantees it has not been tampered with
- Even for a valid receipt, we verify that it was for a payment request we actually created
- A real implementation would likely have a database lookup for the product data

## Testing with the Buyer Agent

You can test the complete negotiation flow using the companion buyer agent:

```bash
cd examples/buyer
pnpm run negotiate
```

The buyer agent (`buyer/src/negotiate.ts`) implements:

- **Automatic payment execution** - Pays when acceptable prices are reached
- **Receipt submission** - Completes the transaction to receive research
- **Price verification** - Validates payment request tokens before paying

**Buyer Agent Flow:**

1. Sends negotiation messages to the seller endpoint
2. Evaluates counter-offers using payment request token verification
3. Accepts offers below the target price ($15 or less)
4. Executes payment and submits receipt to complete purchase

## Usage

This pattern is ideal for:

- Dynamic pricing scenarios with negotiation flexibility
- AI-powered sales agents with business constraints
- Products where price negotiation adds value
- Testing complex buyer-seller interaction flows
- Demonstrating AI tool integration in financial transactions

## Environment Variables

To run both sides of the negotiation:

**Paywall (Seller):**

- `ACK_LAB_CLIENT_ID` - Your ACK Lab client ID
- `ACK_LAB_CLIENT_SECRET` - Your ACK Lab client secret
- `DATABASE_URL` - Your database URL (neon works)
- `OPENAI_API_KEY` - Your OpenAI API key

**Buyer:**

- `ACK_LAB_CLIENT_ID` - Your ACK Lab client ID (can be same as seller)
- `ACK_LAB_CLIENT_SECRET` - Your ACK Lab client secret (can be same as seller)
- `PAYWALL_HOST` - URL of the running paywall (e.g., `http://localhost:3000`)
- `OPENAI_API_KEY` - Your OpenAI API key

## Running the Complete Example

1. **Start the paywall server:**

   ```bash
   cd examples/paywall
   pnpm dev
   ```

2. **Run the buyer negotiation:**

   ```bash
   cd examples/buyer
   pnpm run negotiate
   ```

3. **Watch the AI agents negotiate** in real-time through console logs

## Next Steps

To extend this example, you might:

- Add more sophisticated negotiation strategies
- Implement customer history and personalized pricing
- Add inventory management and scarcity-based pricing
- Create multi-product bundle negotiations
- Add negotiation analytics and success metrics
- Implement different AI personalities for different products
