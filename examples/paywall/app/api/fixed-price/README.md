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

## Environment Variables

To run this example:

- `ACK_LAB_CLIENT_ID` - Your ACK Lab client ID
- `ACK_LAB_CLIENT_SECRET` - Your ACK Lab client secret
- `DATABASE_URL` - Your database URL (neon works)

## Testing

You can test this endpoint by:

1. **Making a request without receipt** to get a Payment Request Token
2. **Using the ACK Lab payment flow** to pay the PRT
3. **Submitting the receipt** to receive the digital product

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
