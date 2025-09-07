# Image Credits Purchase Example

This example demonstrates how to implement a credit-based purchasing system using the ACK Lab SDK. Buyers can purchase image generation credits in bulk, receiving a receipt that can later be used to generate AI images of 19th century US presidents through the companion `/images/generate` endpoint.

## Overview

This example implements a credit-based e-commerce pattern where:

1. A buyer requests to purchase a specific number of image generation credits
2. The system calculates the total price based on credits requested
3. A Payment Request Token (PRT) is created and stored in the database
4. The buyer receives the PRT to complete payment
5. After payment, the buyer receives a receipt that can be used to generate images
6. The receipt can be used to generate images until the credits are exhausted

## Files

- `route.ts` - Next.js API route that handles credit purchase requests

## How It Works

### 1. Database Storage Before Payment Request Creation

When a buyer wants to purchase image generation credits, they send a POST request with the desired credit count.

Before returning the ACK Lab payment request, we store the request details in our database:

```typescript
//each time we create a PRT, we will store it in the database so that when we receive a receipt
//we can validate that it was for a payment request created by us
const prt = await db
  .insert(paymentRequestsTable)
  .values({ price, metadata: { credits: count } })
  .returning()
```

**Why we do this:**

- Storing payment request details before creating the ACK Lab PRT ensures we can later verify any receipt corresponds to a payment request we actually made
- The `metadata.credits` field stores how many credits this payment should grant, which will be used when the receipt is redeemed. This could be expanded to include arbitrary data.
- This creates an audit trail and prevents unauthorized credit generation

### 2. Payment Request Token Creation

After storing our record, we create the actual payment request with ACK Lab:

```typescript
//now create the payment request itself using the ACK Lab SDK
const { paymentRequestToken } = await sdk.createPaymentRequest({
  amount: price,
  currencyCode: "USD",
  description: `Purchase of ${count} image generation credits`,
  id: prt[0].id
})
```

**Why we do this:**

- Using our database record's `id` as the payment request ID creates a verifiable link between ACK Lab's system and our records
- The `amount` is in cents (USD minor units) as required by payment processors
- A descriptive message helps buyers understand what they're purchasing
- The returned `paymentRequestToken` is what the buyer uses to complete payment

### 3. Response with 402 Status Code

The endpoint returns the PRT with a 402 Payment Required status:

```typescript
return new Response(paymentRequestToken, { status: 402 })
```

**Why we do this:**

- HTTP 402 "Payment Required" is the semantically correct status for requesting payment
- Returning the PRT directly in the response body makes it easy for clients to initiate payment
- This follows REST conventions for payment-required scenarios

## Usage

This pattern is ideal for:

- Credit-based services where users pre-purchase usage rights
- Bulk purchasing scenarios with per-unit pricing
- Services that need to track remaining balances or usage
- Systems where payment and consumption happen at different times

## Testing with the Buyer Script

You can test the complete credit purchase and image generation flow using the companion buyer script:

```bash
cd examples/buyer
pnpm run images
```

The buyer script (`buyer/scripts/images.ts`) demonstrates the full workflow:

- **Credit purchase** - Requests 3 image generation credits from `/api/images/buy`
- **Payment validation** - Verifies the PRT amount before paying ($3 for 3 credits)
- **Automatic payment execution** - Pays the PRT and receives a receipt
- **Image generation** - Uses the receipt at `/api/images/generate` to create 2 president images
- **File saving** - Saves generated images to `./images/` directory

**Buyer Script Flow:**

1. Makes POST request to `/api/images/buy` requesting 3 credits
2. Receives 402 status with Payment Request Token for $3
3. Validates the PRT amount matches expected price ($1 per credit)
4. Executes payment using `sdk.executePayment()`
5. Uses the receipt to generate 2 random president images at `/api/images/generate`
6. Saves images locally, leaving 1 credit remaining on the receipt

## Integration with Image Generation

After purchasing credits with this endpoint, buyers can:

1. Use the receipt from their payment at `/images/generate`
2. Generate AI images of 19th century US presidents
3. Each generation consumes one credit from their balance
4. Continue generating until credits are exhausted

## Environment Variables

To run both the purchase and generation flow:

**Paywall (Seller):**

- `ACK_LAB_CLIENT_ID` - Your ACK Lab client ID
- `ACK_LAB_CLIENT_SECRET` - Your ACK Lab client secret
- `DATABASE_URL` - Your database URL (neon works)
- `OPENAI_API_KEY` - Your OpenAI API key for DALL-E 3 access

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
   pnpm run images
   ```

3. **Check the generated images** in `examples/buyer/images/`

## Next Steps

To extend this example, you might:

- Add bulk discount pricing tiers
- Implement credit expiration dates
- Add different credit types for different services
- Create credit transfer or gifting functionality
- Add usage analytics and reporting
- Implement credit refund mechanisms
