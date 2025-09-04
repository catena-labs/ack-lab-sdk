/**
 * This endpoint generates images when a buyer presents a valid
 * receipt that has credits remaining. Each image generation
 * consumes one credit.
 */
import {
  verifyPaymentReceipt,
  getDidResolver,
  isRevoked
} from "agentcommercekit"
import {
  consumeReceiptCredit,
  getOrCreateDbReceipt
} from "@/db/queries/receipts"
import * as v from "valibot"
import { experimental_generateImage as generateImage } from "ai"
import { openai } from "@ai-sdk/openai"

const requestSchema = v.object({ receipt: v.string(), name: v.string() })

export async function POST(req: Request) {
  const { receipt: receiptJwt, name } = v.parse(requestSchema, await req.json())

  //first, check the Receipt JWT is valid
  const receiptId = await getReceiptId(receiptJwt)

  if (!receiptId) {
    return new Response("Invalid receipt", { status: 400 })
  }

  console.log("Got receipt ID: ", receiptId)

  //then, get or create the receipt and check if it has credits remaining
  const receipt = await getOrCreateDbReceipt(receiptId)

  if (receipt.creditsRemaining === 0) {
    return new Response("No credits remaining", { status: 400 })
  }

  //generate the image
  const { image } = await generateImage({
    model: openai.image("dall-e-3"),
    prompt: `US President ${name} sitting in a chair`
  })

  //finally, consume the receipt credit
  await consumeReceiptCredit(receipt.id)

  //return the image
  return new Response(image.uint8Array, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": image.uint8Array.length.toString()
    }
  })
}

async function getReceiptId(receiptJwt: string): Promise<string | undefined> {
  const { receipt: receiptData, paymentRequest } = await verifyPaymentReceipt(
    receiptJwt,
    {
      resolver: getDidResolver()
    }
  )

  const {
    id,
    credentialSubject: { paymentRequestToken }
  } = receiptData

  const tokenRevoked = await isRevoked(paymentRequestToken)

  if (tokenRevoked || !paymentRequest || !receiptData.id) {
    return undefined
  }

  return paymentRequest.id
}
