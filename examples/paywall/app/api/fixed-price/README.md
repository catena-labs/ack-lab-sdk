# Fixed-Price Digital Product Example

This example demonstrates the simplest possible implementation of a digital product sale using the ACK Lab SDK. It sells a single digital product at a fixed price of $10, handling both payment request generation and receipt validation in a single endpoint.

## Overview

This example implements a basic digital commerce pattern where:

1. A buyer requests the digital product without providing payment
2. The seller responds with a Payment Request Token (PRT) for the fixed price
3. The buyer pays using the PRT and receives a receipt
4. The buyer submits the receipt back to the seller
5. The seller validates the receipt and delivers the digital content

## Files

- `route.ts` - Single Next.js API route handling both payment requests and receipt validation

## How It Works

### 1. Request Processing and Schema Validation

The endpoint accepts optional receipt data and processes accordingly:

```typescript
const requestSchema = v.object({ receipt: v.optional(v.string()) })

const { receipt } = v.parse(requestSchema, body)
```

**Why we do this:**

- Single endpoint handles both payment request generation and product delivery
- Optional receipt field allows the same URL for both phases of the transaction
- Schema validation ensures data integrity

### 2. Receipt Validation and Product Delivery

When a receipt is provided, the system validates and delivers the product:

```typescript
if (receipt) {
  //verify the receipt is valid
  const { paymentRequestId } = await sdk.verifyPaymentReceipt(receipt)

  //check to see if we ever made a PRT for this receipt
  const prt = await getDbPaymentRequest(paymentRequestId)

  //if this happens it means somebody has sent us a valid receipt for a payment request we never made
  if (!prt) {
    throw new Error("Payment request not found")
  }

  //give the user what they paid for
  return new Response(content)
}
```

**Why we do this:**

- Cryptographic verification ensures the receipt is authentic and unmodified
- Database lookup confirms we actually created the payment request

### 3. Payment Request Generation

When no receipt is provided, a new payment request is created:

```typescript
//each time we create a PRT, we will store it in the database so that when we receive a receipt
//we can validate that it was for a payment request created by us
const prt = await db
  .insert(paymentRequestsTable)
  .values({
    price: productPrice,
    metadata: { productId: "the-only-product-we-have" }
  })
  .returning()

//now create the payment request itself using the ACK Lab SDK
const { paymentRequestToken } = await sdk.createPaymentRequest({
  amount: productPrice,
  currencyCode: "USD",
  description: "Test payment request",
  id: prt[0].id
})

return new Response(paymentRequestToken, { status: 402 })
```

**Why we do this:**

- Database storage before ACK Lab creation enables later receipt verification
- HTTP 402 status indicates payment is required
- Metadata tracking allows for product identification and analytics

## Usage

This pattern is ideal for:

- Simple digital products with fixed pricing
- Proof-of-concept implementations
- Learning the basic ACK Lab SDK patterns
- Single-product storefronts
- Digital content with immediate delivery

## Testing with the Buyer Script

You can test the complete fixed-price flow using the companion buyer script:

```bash
cd examples/buyer
pnpm run buy-fixed-price
```

The buyer script (`buyer/scripts/buy-fixed-price.ts`) implements:

- **Direct HTTP requests** - Makes standard fetch requests to the endpoint (no agent communication)
- **Payment request validation** - Verifies the PRT amount before paying
- **Automatic payment execution** - Pays the PRT and receives a receipt
- **Receipt submission** - Sends the receipt back to get the digital product

**Buyer Script Flow:**

1. Makes POST request to `/api/fixed-price` without receipt
2. Receives 402 status with Payment Request Token
3. Validates the PRT amount matches expected price ($10)
4. Executes payment using `sdk.executePayment()`
5. Makes second POST request with receipt to receive digital product

## Environment Variables

To run both sides of the transaction:

**Paywall (Seller):**

- `ACK_LAB_CLIENT_ID` - Your ACK Lab client ID
- `ACK_LAB_CLIENT_SECRET` - Your ACK Lab client secret
- `DATABASE_URL` - Your database URL (neon works)

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

2. **Run the buyer script:**

   ```bash
   cd examples/buyer
   pnpm run buy-fixed-price
   ```

3. **Watch the complete transaction** flow through console logs

## Comparison with Other Examples

This fixed-price example is simpler than:

- **`/chat/fixed-price`** - Uses conversational agents and more complex messaging
- **`/chat/negotiate`** - Includes AI-powered price negotiation
- **`/images/buy`** - Implements credit-based purchasing systems

Use this example when you need the most straightforward implementation possible.

## Next Steps

To extend this example, you might:

- Add multiple products with different prices
- Implement user authentication and purchase history
- Add product catalogs and inventory management
- Create more sophisticated content delivery
- Add analytics and purchase tracking
- Implement refund or exchange mechanisms
