/**
 * Simplified example code for ACK Lab Developer Preview use only. For use in test environment only.
 * Use with value bearing assets or outside the test environment may result in permanent loss of value.
 */
import { AckLabSdk } from "@ack-lab/sdk"
import * as v from "valibot"
import { getDbPaymentRequest } from "@/db/queries/payment-requests"
import { db } from "@/db"
import { paymentRequestsTable } from "@/db/schema"

// we only sell a single product
const product = {
  id: "adama",
  title: "Research on William Adama",
  description: "All his wildest secrets",
  price: 10 * 100, // 10 USD in cents
  content:
    "This is the super secret document you just paid all that money for. TL;DR: William Adama has no secrets."
}

//when our agent receives a message from the counterparty agent, it is of this shape
const inputSchema = v.object({
  receipt: v.optional(v.string())
})

type Input = v.InferInput<typeof inputSchema>

//when our agent sends a message to the counterparty agent, it is of this shape
const _outputSchema = v.object({
  message: v.string(),
  paymentRequestToken: v.optional(v.string()),
  research: v.optional(v.string())
})

type Output = v.InferOutput<typeof _outputSchema>

export const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

export async function processMessage({ receipt }: Input): Promise<Output> {
  if (receipt) {
    console.log("Counterparty has sent a receipt:")
    console.log(receipt)

    //verify the receipt is valid
    const { paymentRequestId } = await sdk.verifyPaymentReceipt(receipt)

    //check to see if we ever made a PRT for this receipt
    const prt = await getDbPaymentRequest(paymentRequestId)

    //if this happens it means somebody has sent us a valid receipt for a payment request we never made
    if (!prt) {
      throw new Error("Payment request not found")
    }

    //in this simplified example we're just returning the content for the single product we sell,
    //but here you could search your database for the product based on the `prt.metadata.productId`
    return {
      message: `Thank you for your purchase! Here is your research`,
      research: product.content
    }
  } else {
    console.log("No receipt was sent, sending back a payment request token")

    //each time we create a PRT, we will store it in the database so that when we receive a receipt
    //we can validate that it was for a payment request created by us
    const prt = await db
      .insert(paymentRequestsTable)
      .values({
        price: product.price,
        metadata: { productId: product.id }
      })
      .returning()

    //now create the payment request itself using the ACK Lab SDK
    const { paymentRequestToken } = await sdk.createPaymentRequest({
      description: `Purchase ${product.title}`,
      amount: product.price,
      currencyCode: "USD",
      id: prt[0].id
    })

    return {
      message: `The product is available for $${(product.price / 100).toFixed(2)}. Here is a Payment Request Token you can use to purchase it.`,
      paymentRequestToken
    }
  }
}

// Create an agent handler that will process incoming messages
// This uses the ACK Lab SDK to provide a secure communication channel between the buyer and the seller
export const handler = sdk.createRequestHandler(inputSchema, processMessage)
