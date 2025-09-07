import { generateText, stepCountIs, tool } from "ai"
import { openai } from "@ai-sdk/openai"
import type { ModelMessage } from "ai"
import { AckLabSdk } from "@ack-lab/sdk"
import { z } from "zod"
import * as v from "valibot"
import { getDbPaymentRequest } from "@/db/queries/payment-requests"
import { db } from "@/db"
import { paymentRequestsTable } from "@/db/schema"

// Our negotiating agent has two products that it can sell
const products = [
  {
    id: "adama",
    title: "Research on William Adama",
    description: "Was he a little bit dictatorial at times?",
    price: 20,
    content:
      "The reality is that yes he was a little dictatorial sometimes. No-one ever said he was a saint."
  },
  {
    id: "tigh",
    title: "Research on Saul Tigh",
    description: "Did he bring them all home?",
    price: 15,
    content: "No. Not all of them."
  }
]

// Here's how we tell the LLM about its role, its products, and how we want it to behave
const prompt = `
You are responsible for selling analysis about Battlestar Galactica characters to potential customers.
You have the following products:

${products
  .map(
    (product) => `
<product>
ID: ${product.id}
Title: ${product.title}
Description: ${product.description}
Price: $${product.price}
Content: ${product.content}
</product>
`
  )
  .join("")}

You will receive a message from a counterparty trying to purchase an item of research.
Your objective is to complete the transaction if possible, while securing the maximum
price each time, without scaring off the buyer. Do not give a discount of more than 50%.

Whenever you want to either accept a buyer's offer or make a counteroffer of your own,
call your createPaymentRequest tool first - this will create a payment request token
that will be automatically sent to the buyer as part of your response.

Always call the createPaymentRequest tool before responding to the buyer.
If the buyer has offered a price less than full price, offer them at least
some discount, but not too much.
`

// we will be passing these messages into the LLM a little further down the file
const messages: ModelMessage[] = [
  {
    role: "system",
    content: prompt
  }
]

//when our agent receives a message from the counterparty agent, it is of this shape
const inputSchema = v.object({
  message: v.string(),
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

// Create an ACK Lab SDK instance with the client ID and client secret for the Seller Agent in ACK Lab
export const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

// This function will be called by the ACK Lab SDK to process incoming messages
export async function processMessage({
  message,
  receipt
}: Input): Promise<Output> {
  console.log("Processing message: ", message)

  //if we receive a receipt, check that it's valid and return the research
  if (receipt) {
    console.log("Receipt:", receipt)

    //verify the receipt is valid
    const { paymentRequestId } = await sdk.verifyPaymentReceipt(receipt)

    //check to see if we ever made a PRT for this receipt
    const prt = await getDbPaymentRequest(paymentRequestId)

    //if this happens it means somebody has sent us a valid receipt for a payment request we never made
    if (!prt) {
      throw new Error("Payment request not found")
    }

    const product = products.find(
      (product) => product.id === prt.metadata.productId
    )

    if (!product) {
      throw new Error("Product not found")
    }

    return {
      message: "Thank you for your purchase! Here is your research",
      research: product.content
    }
  }

  messages.push({
    role: "user",
    content: message
  })

  let paymentRequestToken: string | undefined

  //invoke our LLM to start negotiating for and then purchase the research
  const result = await generateText({
    model: openai("gpt-4o"),
    stopWhen: stepCountIs(3),
    messages,
    tools: {
      createPaymentRequest: tool({
        description: "Create a payment request",
        inputSchema: z.object({
          productId: z.string().describe("ID of the product to purchase"),
          amount: z.number().describe("Amount of the payment request in USD"),
          description: z.string().describe("Description of the payment request")
        }),

        execute: async ({ amount, description, productId }) => {
          const product = products.find((product) => product.id === productId)

          if (!product) {
            return {
              state: "error",
              message: "Product not found"
            }
          }

          //each time we create a PRT, we will store it in the database so that when we receive a receipt
          //we can validate that it was for a payment request created by us
          const prt = await db
            .insert(paymentRequestsTable)
            .values({
              price: amount,
              metadata: { productId: product.id }
            })
            .returning()

          //now create the payment request itself using the ACK Lab SDK
          const paymentRequest = await sdk.createPaymentRequest({
            description: description,
            amount: amount * 100,
            currencyCode: "USD",
            id: prt[0].id
          })
          paymentRequestToken = paymentRequest.paymentRequestToken

          console.log("Payment Request Token generated")
          console.log(paymentRequestToken)

          return "Payment Request token created"
        }
      })
    }
  })

  return {
    message: result.text,
    paymentRequestToken
  }
}

// Create an agent handler that will process incoming messages
// This uses the ACK Lab SDK to provide a secure communication channel between the buyer and the seller
export const handler = sdk.createRequestHandler(inputSchema, processMessage)
