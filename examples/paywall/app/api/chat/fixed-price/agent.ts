import { AckLabSdk } from "@ack-lab/sdk"
import * as v from "valibot"

// we only sell a single product
const product = {
  id: "adama",
  title: "Research on William Adama",
  description: "All his wildest secrets",
  price: 10,
  content:
    "This is the super secret document you just paid all that money for. TL;DR: William Adama has no secrets."
}

//when our agent receives a message from the counterparty agent, it is of this shape
const inputSchema = v.object({
  receipt: v.optional(v.string())
})

type Input = v.InferInput<typeof inputSchema>

//when our agent sends a message to the counterparty agent, it is of this shape
const outputSchema = v.object({
  message: v.string(),
  paymentRequestToken: v.optional(v.string()),
  research: v.optional(v.string())
})

type Output = v.InferOutput<typeof outputSchema>

export const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

export async function processMessage({ receipt }: Input): Promise<Output> {
  if (receipt) {
    console.log("Counterparty has sent a receipt:")
    console.log(receipt)

    //FIXME: verify the receipt here

    return {
      message: `Thank you for your purchase! Here is your research`,
      research: product.content
    }
  } else {
    console.log("No receipt was sent, sending back a payment request token")

    //FIXME: we should be able to create a payment request with a product ID but description is the only field we can set
    const { paymentRequestToken } = await sdk.createPaymentRequest({
      description: `Purchase ${product.title}`,
      amount: product.price * 100,
      currencyCode: "USD"
    })

    return {
      message: `The product is available for $${product.price}. Here is a Payment Request Token you can use to purchase it.`,
      paymentRequestToken
    }
  }
}

// Create an agent handler that will process incoming messages
// This uses the ACK Lab SDK to provide a secure communication channel between the buyer and the seller
export const handler = sdk.createRequestHandler(inputSchema, processMessage)
