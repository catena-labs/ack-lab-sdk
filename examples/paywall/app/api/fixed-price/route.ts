/**
 * This endpoint sells a fixed price digital product for $10.
 * If the buyer sends a receipt, it will validate it and return the digital product.
 * If not, it will send a payment request token.
 */
import { AckLabSdk } from "@ack-lab/sdk"
import * as v from "valibot"
import { getDbPaymentRequest } from "@/db/queries/payment-requests"
import { db } from "@/db"
import { paymentRequestsTable } from "@/db/schema"

// Create an ACK Lab SDK instance with the client ID and client secret for the Seller Agent in ACK Lab
export const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

const requestSchema = v.object({ receipt: v.optional(v.string()) })

const productPrice = 10 * 100 // 10 USD in cents
const content = "Here is your digital product that you just paid us for."

export async function POST(req: Request) {
  const body = await req.json()

  const { receipt } = v.parse(requestSchema, body)

  if (receipt) {
    console.log("Received a receipt from the buyer")

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
  } else {
    console.log(
      "Did not receive a receipt from the buyer, sending a payment request token"
    )

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
  }
}
