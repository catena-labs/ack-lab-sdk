import { config } from "dotenv"
import { AckLabSdk } from "@ack-lab/sdk"
import { verifyPaymentRequestToken, getDidResolver } from "agentcommercekit"

config()

const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

const endpoint = `${process.env.PAYWALL_HOST}/api/fixed-price`
const expectedPrice = 10 //10 SOL

async function main() {
  console.log("Buying the digital product")

  // POST to the endpoint, without a receipt at first.
  // We should get a 402 response with a payment request token
  const response = await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json"
    }
  })

  // We should expect a 402 response with a payment request token
  console.log(`Response Status: ${response.status}`)

  const paymentRequestToken = await response.text()

  console.log("\n\nPayment Request Token received:")
  console.log(paymentRequestToken)

  console.log(
    "\n\nChecking that the payment request token is for the correct amount"
  )
  const isCorrect = await checkPaymentRequestToken(paymentRequestToken)

  if (!isCorrect) {
    throw new Error("Payment request token is for the wrong amount")
  }

  console.log("\n\nExecuting payment...")
  const { receipt } = await sdk.executePayment(paymentRequestToken)

  console.log("Payment made, sending receipt to seller...")
  console.log(receipt)

  const productResponse = await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({ receipt }),
    headers: {
      "Content-Type": "application/json"
    }
  })

  console.log("\n\nReceived digital product from seller: ")
  console.log(await productResponse.text())
}

async function checkPaymentRequestToken(paymentRequestToken: string) {
  const { paymentRequest } = await verifyPaymentRequestToken(
    paymentRequestToken,
    {
      resolver: getDidResolver()
    }
  )

  const paymentOption = paymentRequest.paymentOptions[0]

  return (
    BigInt(paymentOption.amount) ===
    BigInt(expectedPrice * Math.pow(10, paymentOption.decimals))
  )
}

main()
