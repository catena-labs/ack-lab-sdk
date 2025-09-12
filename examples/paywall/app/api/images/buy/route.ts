/**
 * Simplified example code for ACK Lab Developer Preview use only. For use in test environment only.
 * Use with value bearing assets or outside the test environment may result in permanent loss of value.
 *
 * This endpoint allows a buyer to purchase the right to generate a number of images.
 */
import * as v from "valibot"
import { AckLabAgent } from "@ack-lab/sdk"
import { db } from "@/db"
import { paymentRequestsTable } from "@/db/schema"

const requestSchema = v.object({
  count: v.number()
})

// Create an ACK Lab SDK instance with the client ID and client secret for the Seller Agent in ACK Lab
export const agent = new AckLabAgent({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!,
  agentId: process.env.ACK_LAB_AGENT_ID!,
  baseUrl: process.env.ACK_LAB_BASE_URL!
})

const pricePerImage = 1 * 100 // 1 USD in cents

export async function POST(req: Request) {
  const { count } = v.parse(requestSchema, await req.json())
  const price = count * pricePerImage

  // Each time we create a PRT, we will store it in the database so that when we receive a receipt
  // we can validate that it was for a payment request created by us
  const prt = await db
    .insert(paymentRequestsTable)
    .values({ price, metadata: { credits: count } })
    .returning()

  // Now create the payment request itself using the ACK Lab SDK
  const { paymentRequestToken } = await agent.createPaymentRequest({
    amount: price,
    currencyCode: "USD",
    description: `Purchase of ${count} image generation credits`,
    id: prt[0].id
  })

  return new Response(paymentRequestToken, { status: 402 })
}
