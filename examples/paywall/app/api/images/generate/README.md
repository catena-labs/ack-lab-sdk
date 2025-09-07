# Image Generation Example

This example demonstrates how to implement a credit-based image generation service using the ACK Lab SDK. Buyers present receipts from credit purchases to generate AI images of 19th century US presidents, with each generation consuming one credit from their balance.

## Overview

This example implements a consumption-based service pattern where:

1. A buyer submits a receipt (from `/images/buy`) along with a president's name
2. The system validates the receipt cryptographically
3. The system checks that credits remain on the receipt
4. An AI image is generated using DALL-E 3
5. One credit is consumed from the receipt's balance
6. The generated image is returned to the buyer

## Files

- `route.ts` - Next.js API route that handles image generation requests

## How It Works

### 1. Input Validation and President Verification

The endpoint accepts a receipt and president name, validating both:

```typescript
const requestSchema = v.object({ receipt: v.string(), name: v.string() })

const { receipt: receiptJwt, name } = v.parse(requestSchema, await req.json())

//make sure the buyer is asking for a 19th century US president
if (!presidents.includes(name)) {
  return new Response("Invalid name", { status: 400 })
}
```

**Why we do this:**

- Schema validation ensures both receipt and name are provided as strings
- The presidents list restricts generation to a curated set of historical figures
- This prevents abuse and ensures consistent, appropriate content generation

### 2. Receipt Verification

The receipt undergoes cryptographic verification to ensure authenticity:

```typescript
//check the Receipt JWT is valid
const { paymentRequestId } = await sdk.verifyPaymentReceipt(receiptJwt)

if (!paymentRequestId) {
  return new Response("Invalid receipt", { status: 400 })
}
```

**Why we do this:**

- `sdk.verifyPaymentReceipt()` cryptographically validates the receipt hasn't been tampered with
- It extracts the `paymentRequestId` that links back to the original purchase
- Invalid receipts are rejected immediately, preventing unauthorized access

### 3. Credit Balance Check and Management

Before generating, the system checks and manages the credit balance:

```typescript
// find out how many credits are remaining on this receipt
// (under the covers this creates an entry in the credits table if it doesn't exist)
const { id, remainingCredits } = await getOrCreateCredits(paymentRequestId)

if (remainingCredits === 0) {
  return new Response("No credits remaining", { status: 400 })
}
```

### 4. AI Image Generation

Once validated, the system generates the requested image:

```typescript
//generate the image
const { image } = await generateImage({
  model: openai.image("dall-e-3"),
  prompt: `US President ${name} sitting in a chair`
})
```

### 5. Credit Consumption and Response

After successful generation, one credit is consumed and the image returned:

```typescript
//finally, consume the receipt credit.
//more sophisticated use cases could consume multiple credits at once
await consumeReceiptCredit(id)

//return the image
return new Response(image.uint8Array, {
  headers: {
    "Content-Type": "image/png",
    "Content-Length": image.uint8Array.length.toString()
  }
})
```

## Database Integration

The example uses the credits system to track usage:

```typescript
export const creditsTable = pgTable("credits", {
  id: uuid().primaryKey().defaultRandom(),
  paymentRequestId: uuid().notNull(),
  initialCredits: integer().notNull(),
  remainingCredits: integer().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})
```

This tracks:

- **paymentRequestId**: Links back to the original purchase
- **initialCredits**: Total credits purchased
- **remainingCredits**: Current available balance

## Security Considerations

1. **Receipt Validation**: Cryptographic verification prevents forged receipts
2. **Content Restrictions**: President name validation prevents inappropriate content generation
3. **Credit Tracking**: Database-backed credit system prevents overuse
4. **Atomic Operations**: Credits consumed only after successful generation
5. **Payment Verification**: Only receipts from verified payment requests are accepted

## Usage

This pattern is ideal for:

- Pay-per-use services with digital delivery
- Content generation APIs with usage limits
- Services where consumption and payment are separated in time
- Systems requiring usage tracking and analytics

## Testing with the Buyer Script

You can test the complete credit purchase and image generation flow using the companion buyer script:

```bash
cd examples/buyer
pnpm run images
```

The buyer script (`buyer/scripts/images.ts`) demonstrates the full workflow by calling both endpoints:

- **Credit purchase** - First calls `/api/images/buy` to purchase 3 image generation credits
- **Payment execution** - Pays the received Payment Request Token
- **Image generation** - Uses the receipt to call `/api/images/generate` twice
- **Random president selection** - Picks random 19th century US presidents for each image
- **File management** - Saves generated images to `./images/` directory with president names

**Complete Flow Demonstration:**

1. Purchases 3 credits at `/api/images/buy` for $3 total
2. Receives and validates the Payment Request Token
3. Executes payment and receives a receipt
4. Calls `/api/images/generate` twice with random presidents
5. Each call consumes 1 credit and returns a PNG image
6. Saves images locally, leaving 1 unused credit on the receipt

## Integration with Credit Purchase

This endpoint works in conjunction with `/images/buy`:

1. Buyers first purchase credits at `/images/buy` and receive a receipt
2. They can then use that receipt multiple times at `/images/generate`
3. Each generation consumes one credit until the balance is exhausted
4. The same receipt can be used across multiple sessions

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

- Add different image styles or models
- Implement variable credit costs for different image types
- Add image size or quality options
- Create batch generation endpoints
- Add image storage and retrieval systems
