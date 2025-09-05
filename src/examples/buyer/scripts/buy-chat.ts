import { config } from "dotenv"
import { AckLabSdk } from "@ack-lab/sdk"
import * as v from "valibot"

config()

const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

// When our agent sends messages to the counterparty agent, the messages are of this shape
// There is always a message, and sometimes a receipt
const requestSchema = v.object({
  message: v.string(),
  receipt: v.optional(v.string())
})

// When the counterparty agent sends messages to our agent, the messages are of this shape
// There is always a message, and sometimes a payment request token or the research itself
const responseSchema = v.object({
  message: v.string(),
  paymentRequestToken: v.optional(v.string()),
  research: v.optional(v.string())
})

const callAgent = sdk.createAgentCaller(
  `${process.env.PAYWALL_HOST}/api/chat/fixed-price`,
  requestSchema,
  responseSchema
)

async function main() {
  console.log("Buying research on William Adama")

  const { paymentRequestToken } = await callAgent({
    message: "Hello I would like to buy research on William Adama"
  })

  if (!paymentRequestToken) {
    throw new Error("No payment request token received")
  }

  console.log("\n\nPayment Request Token received:")
  console.log(paymentRequestToken)

  console.log("\n\nExecuting payment...")
  const { receipt } = await sdk.executePayment(paymentRequestToken)

  console.log("\n\nPayment made, sending receipt to seller...")
  console.log(receipt)

  const { message, research } = await callAgent({
    message: "Hello I would like to buy research on William Adama",
    receipt
  })

  console.log("\n\nSeller final response: ")
  console.log(message)
  console.log("research:")
  console.log(research)
}

main()
