# Fixed-Price Chat Example

This example demonstrates how to implement a simple fixed-price digital product sale using the ACK Lab SDK. The pattern shows a conversational flow where a buyer can request a product and receive a payment request, then submit a receipt to receive the digital content.

## Overview

This example implements a basic e-commerce pattern where:

1. A buyer initiates a conversation without providing payment
2. The seller responds with product information and a Payment Request Token (PRT)
3. The buyer pays using the PRT and receives a receipt
4. The buyer submits the receipt back to the seller
5. The seller validates the receipt and delivers the digital product

## Files

- `route.ts` - Next.js API route that handles incoming requests
- `agent.ts` - Core business logic for processing messages and payments

## How It Works

### 1. Initial Request (No Payment)

When a buyer first contacts the seller without providing a receipt, the system creates a new payment request:

```typescript
// Store the payment request in our database for later verification
const prt = await db
  .insert(paymentRequestsTable)
  .values({
    price: product.price,
    metadata: { productId: product.id }
  })
  .returning()

// Create the payment request using ACK Lab SDK
const { paymentRequestToken } = await agent.createPaymentRequest({
  description: `Purchase ${product.title}`,
  amount: product.price * 100, // Amount in cents
  currencyCode: "USD",
  id: prt[0].id // Link to our database record
})
```

**Why we do this:**

- We store the payment request in our database so we can later verify that any receipt we receive corresponds to a payment request we actually created
- The `metadata` field allows us to associate the payment with specific product information
- Using the database record's `id` as the payment request ID creates a verifiable link between our records and ACK Lab's payment system

### 2. Payment and Receipt Submission

After the buyer pays using the PRT, they receive a receipt which they can submit back to the seller:

```typescript
if (receipt) {
  // Verify the receipt is cryptographically valid
  const { paymentRequestId } = await agent.verifyPaymentReceipt(receipt)

  // Check that we actually created this payment request
  const prt = await getDbPaymentRequest(paymentRequestId)

  if (!prt) {
    throw new Error("Payment request not found")
  }

  // Deliver the digital product
  return {
    message: `Thank you for your purchase! Here is your research`,
    research: product.content
  }
}
```

**Why we do this:**

- `agent.verifyPaymentReceipt()` cryptographically validates that the receipt is authentic and hasn't been tampered with
- Checking our database ensures we only deliver products for payments we actually requested - this prevents replay attacks where someone might try to use a valid receipt from a different merchant
- The two-step verification (cryptographic + database lookup) provides strong security guarantees

### 3. Message Schema Definition

The example uses Valibot schemas to define the structure of messages:

```typescript
// Input from the buyer
const inputSchema = v.object({
  receipt: v.optional(v.string())
})

// Output to the buyer
const outputSchema = v.object({
  message: v.string(),
  paymentRequestToken: v.optional(v.string()),
  research: v.optional(v.string())
})
```

**Why we do this:**

- Type safety ensures messages conform to expected formats
- The ACK Lab SDK uses these schemas to validate and structure communications
- Optional fields allow the same endpoint to handle both initial requests and receipt submissions

### 4. Request Handler Integration

The ACK Lab SDK provides a request handler that manages the secure communication:

```typescript
export const handler = agent.createRequestHandler(inputSchema, processMessage)
```

**Why we do this:**

- The SDK handles JWT token validation and secure message decryption/encryption
- It automatically validates input against your schema before calling your business logic
- It ensures responses are properly formatted and secured for transmission

## Database Schema

The example uses a simple payment requests table:

```typescript
export const paymentRequestsTable = pgTable("payment_requests", {
  id: uuid().primaryKey().defaultRandom(),
  price: integer().notNull(),
  metadata: jsonb().$type<PaymentRequestMetadata>(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})
```

This allows tracking of:

- **id**: Unique identifier that links to ACK Lab payment requests
- **price**: The amount charged (stored in dollars, converted to cents for ACK Lab)
- **metadata**: Flexible JSON field for product information and other data
- **createdAt**: Timestamp for audit trails and analytics

## Security Considerations

1. **Receipt Validation**: Always verify receipts cryptographically using `agent.verifyPaymentReceipt()`
2. **Payment Request Verification**: Check that receipts correspond to payment requests you actually created
3. **Database Integrity**: Store payment request details before creating the ACK Lab payment request
4. **Error Handling**: Fail securely when receipts don't match your records

## Testing with the Buyer Agent

You can test the complete fixed-price chat flow using the companion buyer agent:

```bash
cd examples/buyer
pnpm run buy-chat-fixed-price
```

The buyer agent (`buyer/scripts/buy-chat-fixed-price.ts`) implements:

- **Direct agent communication** - Uses the ACK Lab SDK's `createAgentCaller` for secure messaging
- **Automatic payment execution** - Pays the received Payment Request Token immediately
- **Receipt submission** - Completes the transaction to receive the research content

**Buyer Agent Flow:**

1. Sends initial message requesting research on William Adama
2. Receives payment request token from the seller
3. Executes payment using `agent.executePayment()`
4. Submits receipt back to seller with the same message
5. Receives and displays the purchased research content

## Usage

This pattern is ideal for:

- Digital products with fixed pricing
- Simple one-time purchases
- Products that can be delivered immediately upon payment
- Scenarios where you want to show product information before requiring payment

## Environment Variables

To run both sides of the transaction:

**Paywall (Seller):**

- `ACK_LAB_CLIENT_ID` - Your ACK Lab client ID
- `ACK_LAB_CLIENT_SECRET` - Your ACK Lab client secret

**Buyer:**

- `ACK_LAB_CLIENT_ID` - Your ACK Lab client ID (can be same as seller)
- `ACK_LAB_CLIENT_SECRET` - Your ACK Lab client secret (can be same as seller)
- `PAYWALL_HOST` - URL of the running paywall (e.g., `http://localhost:3000`)

## Running the Complete Example

1. **Start the paywall server:**

   ```bash
   cd examples/paywall
   pnpm dev
   ```

2. **Run the buyer agent:**

   ```bash
   cd examples/buyer
   pnpm run buy-chat-fixed-price
   ```

3. **Watch the complete transaction** flow through console logs

## Next Steps

To extend this example, you might:

- Add product catalogs with multiple items
- Implement user accounts and purchase history
- Add more sophisticated metadata tracking
- Integrate with external fulfillment systems
- Add analytics and reporting features
