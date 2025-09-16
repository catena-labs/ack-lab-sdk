/**
 * Simplified example code for ACK Lab Developer Preview use only. For use in test environment only.
 * Use with value bearing assets or outside the test environment may result in permanent loss of value.
 *
 * This endpoint generates images when a buyer presents a valid
 * receipt that has credits remaining. Each image generation
 * consumes one credit.
 */
import { consumeReceiptCredit, getOrCreateCredits } from "@/db/queries/credits"
import * as v from "valibot"
import { experimental_generateImage as generateImage } from "ai"
import { openai } from "@ai-sdk/openai"
import { AckLabAgent } from "@ack-lab/sdk"
import { presidents } from "@/data/presidents"

const requestSchema = v.object({ receipt: v.string(), name: v.string() })

// Create an ACK Lab SDK instance with the client ID and client secret for the Seller Agent in ACK Lab
export const agent = new AckLabAgent({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!,
  agentId: process.env.ACK_LAB_AGENT_ID!
})

export async function POST(req: Request) {
  const { receipt: receiptJwt, name } = v.parse(requestSchema, await req.json())

  // make sure the buyer is asking for a 19th century US president
  if (!presidents.includes(name)) {
    return new Response("Invalid name", { status: 400 })
  }

  // check the Receipt JWT is valid
  const { paymentRequestId } = await agent.verifyPaymentReceipt(receiptJwt)

  if (!paymentRequestId) {
    return new Response("Invalid receipt", { status: 400 })
  }

  // find out how many credits are remaining on this receipt
  // (under the covers this creates an entry in the credits table if it doesn't exist)
  const { id, remainingCredits } = await getOrCreateCredits(paymentRequestId)

  if (remainingCredits === 0) {
    return new Response("No credits remaining", { status: 400 })
  }

  // generate the image
  const { image } = await generateImage({
    model: openai.image("dall-e-3"),
    prompt: `US President ${name} sitting in a chair`
  })

  // finally, consume the receipt credit.
  // more sophisticated use cases could consume multiple credits at once
  await consumeReceiptCredit(id)

  // return the image
  return new Response(image.uint8Array, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": image.uint8Array.length.toString()
    }
  })
}
