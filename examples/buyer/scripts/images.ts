import { config } from "dotenv"
import { AckLabSdk } from "@ack-lab/sdk"
import { verifyPaymentRequestToken, getDidResolver } from "agentcommercekit"
import { presidents } from "../data/presidents"
import fs, { mkdirSync } from "fs"

config()

const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

const purchaseEndpoint = `${process.env.PAYWALL_HOST}/api/images/buy`
const generateEndpoint = `${process.env.PAYWALL_HOST}/api/images/generate`

const imagesToPurchase = 3
const expectedPricePerImage = 1 //1 dollar per image

async function main() {
  console.log("Buying the right to generate 3 images")

  // Purchase the right to generate 3 images
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
  const { receipt } = await sdk.executePayment(paymentRequestToken)

  console.log("Payment made, generating images")

  //generate a couple of images (we bought 3 so we should have one left after this)
  await generatePresidentImage(receipt)
  await generatePresidentImage(receipt)

  console.log("\n\nDone! We purchased 3 images, and generated 2")
}

async function generatePresidentImage(receipt: string) {
  //pick a random president
  const president = presidents[Math.floor(Math.random() * presidents.length)]

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
