import { generateText, stepCountIs, tool } from "ai"
import { openai } from "@ai-sdk/openai"
import type { ModelMessage } from "ai"
import { AckLabSdk } from "@ack-lab/sdk"
import { z } from "zod"
import * as v from "valibot"

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

  if (receipt) {
    console.log("Receipt:", receipt)

    //FIXME: verify the receipt
    //FIXME: how do we get the real product ID here? It needs to be on the PRT really
    const productId = "adama"

    return {
      message: "Thank you for your purchase! Here is your research",
      research: products.find((product) => product.id === productId)?.content
    }
  } else {
    console.log("No receipt, here's the message from the buyer:")
    console.log(message)
  }

  messages.push({
    role: "user",
    content: message
  })

  let paymentRequestToken: string | undefined

  const result = await generateText({
    model: openai("gpt-4o"),
    stopWhen: stepCountIs(3),
    messages,
    tools: {
      createPaymentRequest: tool({
        description: "Create a payment request",
        inputSchema: z.object({
          amount: z.number(),
          description: z.string()
        }),

        execute: async ({ amount, description }) => {
          const result = await sdk.createPaymentRequest({
            amount: amount * 100,
            currencyCode: "USD",
            description
          })

          paymentRequestToken = result.paymentRequestToken

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
