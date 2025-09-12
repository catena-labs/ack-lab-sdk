/**
 * Simplified example code for ACK Lab Developer Preview use only. For use in test environment only.
 * Use with value bearing assets or outside the test environment may result in permanent loss of value.
 */
import { config } from "dotenv"
import { AckLabAgent } from "@ack-lab/sdk"
import { verifyPaymentRequestToken, getDidResolver } from "agentcommercekit"

config()

const sdk = new AckLabAgent({
  baseUrl: process.env.ACK_LAB_BASE_URL!,
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!,
  agentId: process.env.ACK_LAB_AGENT_ID!
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

  // The Payment Option returned is for a testnet currency, which is swapped 1:1
  // when the Payment Request was generated, but operates at a different precision
  // so we need to account for that when comparing the amounts
  return (
    BigInt(paymentOption.amount) ===
    BigInt(expectedPrice * Math.pow(10, paymentOption.decimals))
  )
}

main().catch(console.error)
