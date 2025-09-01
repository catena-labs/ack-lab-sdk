import { config } from "dotenv"
import { AckLabSdk } from "@ack-lab/sdk"

config()

const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

const callAgent = sdk.createAgentCaller(`http://localhost:3000/api/fixed-price`)

async function main() {
  console.log("Buying research on William Adama")

  const { data } = await callAgent({
    message: "Hello I would like to buy research on William Adama"
  })

  const { paymentRequestToken } = data as any

  console.log("\n\nPayment Request Token received:")
  console.log(paymentRequestToken)

  console.log("\n\nExecuting payment...")
  const { receipt } = await sdk.executePayment(paymentRequestToken)

  console.log("Payment made, here is the receipt:")
  console.log(receipt)

  console.log("\n\nSending receipt to seller...")
  const { message, data: docData } = await callAgent({
    message: "Hello I would like to buy research on William Adama",
    data: {
      receipt
    }
  })

  console.log("\n\nSeller final response: ")
  console.log(message)
  console.log("research:")
  console.log(docData)
}

main()
