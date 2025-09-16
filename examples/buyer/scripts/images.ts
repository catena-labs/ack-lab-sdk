/**
 * Simplified example code for ACK Lab Developer Preview use only. For use in test environment only.
 * Use with value bearing assets or outside the test environment may result in permanent loss of value.
 */
import { config } from "dotenv"
import { AckLabAgent } from "@ack-lab/sdk"
import { verifyPaymentRequestToken, getDidResolver } from "agentcommercekit"
import { presidents } from "../data/presidents"
import fs, { mkdirSync } from "fs"

config()

const agent = new AckLabAgent({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!,
  agentId: process.env.ACK_LAB_AGENT_ID!
})

const purchaseEndpoint = `${process.env.PAYWALL_HOST}/api/images/buy`
const generateEndpoint = `${process.env.PAYWALL_HOST}/api/images/generate`

const imagesToPurchase = 30
const expectedPricePerImage = 1 //1 dollar per image

async function main() {
  console.log(`Buying the right to generate ${imagesToPurchase} images`)

  // Bulk purchase the right to generate images
  const response = await fetch(purchaseEndpoint, {
    method: "POST",
    body: JSON.stringify({
      count: imagesToPurchase
    }),
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
  const { receipt } = await agent.executePayment(paymentRequestToken)

  console.log("Payment made, generating images...")

  const imagesToGenerateNow = 5

  await Promise.all(
    Array.from({ length: imagesToGenerateNow }, () =>
      generatePresidentImage(receipt)
    )
  )

  console.log(
    `\n\nDone! We purchased ${imagesToPurchase} images, and generated ${imagesToGenerateNow}`
  )
}

async function generatePresidentImage(receipt: string) {
  //pick a random president
  const president = presidents[Math.floor(Math.random() * presidents.length)]

  console.log("Generating image for", president)

  const response = await fetch(generateEndpoint, {
    method: "POST",
    body: JSON.stringify({ receipt, name: president }),
    headers: {
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    console.log("Failed to generate image for", president)
    return
  }

  const image = await response.blob()

  //save the image
  const buffer = Buffer.from(await image.arrayBuffer())
  mkdirSync("./images", { recursive: true })
  fs.writeFileSync(`./images/${president}.png`, buffer)

  console.log("Generated image for", president)
}

//makes sure that the PRT is for the expected amount so we don't just blindly send money
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
    BigInt(
      expectedPricePerImage *
        imagesToPurchase *
        Math.pow(10, paymentOption.decimals)
    )
  )
}

main().catch(console.error)
