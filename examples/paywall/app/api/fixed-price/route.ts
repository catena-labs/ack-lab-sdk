/**
 * This endpoint sells a fixed price digital product for $10.
 * If the buyer sends a receipt, it will validate it and return the digital product.
 * If not, it will send a payment request token.
 */
import { AckLabSdk } from "@ack-lab/sdk"
import * as v from "valibot"
import {
  verifyPaymentReceipt,
  getDidResolver,
  isRevoked
} from "agentcommercekit"

// Create an ACK Lab SDK instance with the client ID and client secret for the Seller Agent in ACK Lab
export const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

const requestSchema = v.object({ receipt: v.optional(v.string()) })

const productPrice = 10 * 100 // 10 USD in cents
const content = "Here is your digital product delivery"

export async function POST(req: Request) {
  const body = await req.json()

  const { receipt } = v.parse(requestSchema, body)

  if (receipt) {
    console.log("Received a receipt from the buyer")

    //verify the receipt is valid and for the right amount
    const isCorrect = await isReceiptCorrect(receipt)

    if (!isCorrect) {
      return new Response("Invalid receipt", { status: 400 })
    }

    return new Response(content)
  } else {
    console.log(
      "Did not receive a receipt from the buyer, sending a payment request token"
    )

    const { paymentRequestToken } = await sdk.createPaymentRequest(
      productPrice,
      {
        currencyCode: "USD",
        description: "Test payment request"
      }
    )

    return new Response(paymentRequestToken, { status: 402 })
  }
}

const resolver = getDidResolver()

//verifies that a receipt is valid, not revoked, and for the right amount
async function isReceiptCorrect(receiptJwt: string): Promise<boolean> {
  const { receipt, paymentRequest } = await verifyPaymentReceipt(receiptJwt, {
    resolver
  })

  const {
    credentialSubject: { paymentRequestToken }
  } = receipt

  const tokenRevoked = await isRevoked(paymentRequestToken)

  if (tokenRevoked || !paymentRequest) {
    return false
  }

  const { amount } = paymentRequest.paymentOptions[0]

  //FIXME: it is quite surprising to have to multiply by 10000 here
  return BigInt(amount) === BigInt(productPrice * 10000)
}
