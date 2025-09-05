/**
 * This endpoint allows a buyer to purchase the right to generate a number of images.
 */
import * as v from "valibot"
import { AckLabSdk } from "@ack-lab/sdk"
import { db } from "@/db"
import { paymentRequestTokensTable } from "@/db/schema"
import { decodeJwt } from "jose"

const requestSchema = v.object({
  count: v.number()
})

// Create an ACK Lab SDK instance with the client ID and client secret for the Seller Agent in ACK Lab
export const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

const pricePerImage = 1 * 100 // 1 USD in cents

export async function POST(req: Request) {
  const { count } = v.parse(requestSchema, await req.json())
  const price = count * pricePerImage

  //create a payment request token
  const { paymentRequestToken } = await sdk.createPaymentRequest(price, {
    currencyCode: "USD",
    description: `Purchase of ${count} image generation credits`
  })

  const prtId = await getPaymentRequestTokenId(paymentRequestToken)

  //save the payment request token to the database
  await db
    .insert(paymentRequestTokensTable)
    .values({ price, id: prtId, metadata: { credits: count } })

  return new Response(paymentRequestToken, { status: 402 })
}

async function getPaymentRequestTokenId(token: string) {
  const decoded = decodeJwt(token)

  return decoded.id as string // JWT ID claim
}
