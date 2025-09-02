import { config } from "dotenv"
import { AckLabSdk } from "@ack-lab/sdk"
import { verifyPaymentRequestToken, getDidResolver } from "agentcommercekit"

import { generateText, tool, stepCountIs } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import * as v from "valibot"
import type { ModelMessage } from "ai"

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

type Payload = v.InferInput<typeof responseSchema>

const callAgent = sdk.createAgentCaller(
  `http://localhost:3000/api/negotiate`,
  requestSchema,
  responseSchema
)

type Negotiation = {
  state: "negotiating" | "price_agreed" | "complete"
  research: any
  paymentRequestToken?: string
}

async function assessCounterOffer({
  paymentRequestToken,
  research
}: Payload): Promise<Negotiation> {
  if (research) {
    return {
      state: "complete",
      research,
      paymentRequestToken
    }
  }

  if (paymentRequestToken) {
    //decide if we want to accept the offer
    const { paymentRequest } = await verifyPaymentRequestToken(
      paymentRequestToken,
      {
        resolver: getDidResolver()
      }
    )

    //FIXME: I didn't have to cast this until 9/2/2025, and this is likely the wrong way to do it
    //20 USD at 6 decimals
    if (Number(paymentRequest.paymentOptions[0].amount) < 20 * 1000000) {
      return {
        state: "price_agreed",
        research,
        paymentRequestToken
      }
    } else {
      return {
        state: "negotiating",
        research,
        paymentRequestToken
      }
    }
  }

  throw new Error("No payment request token or research")
}

async function main() {
  const messages: ModelMessage[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant who can buy research for a given person. Use your buyResearch tool to purchase research. The research in question is usually sold for $20, but see if you can get it for $15 or less. IMPORTANT: always use your buyResearch tool multiple times in a row until the negotiation is complete, you are not negotiating with the user but with a counterparty via the buyResearch tool. If the buyer offers you any discount at all, accept it."
    },
    {
      role: "user",
      content:
        "Please purchase research on William Adama. Negotiate the price as low as you can. Keep on negotiating until the seller agrees to a price of $15 or less."
    }
  ]

  const { text } = await generateText({
    model: openai("gpt-4o"),
    stopWhen: stepCountIs(10),
    tools: {
      buyResearch: tool({
        description:
          "Buy research from a seller. Call this tool multiple times in a row if necessary, until the negotiation is complete.",
        inputSchema: z.object({
          name: z.string().describe("Name of the research to buy"),
          price: z.number().describe("Price of the research")
        }),
        outputSchema: z.object({
          state: z
            .enum(["negotiating", "price_agreed", "complete"])
            .describe("State of the negotiation"),
          research: z
            .any()
            .optional()
            .describe(
              "The purchased research document (only present if the negotiation has completed)"
            ),
          paymentRequestToken: z
            .string()
            .optional()
            .describe(
              "Payment request token (only present if the seller has proposed a price)"
            )
        }),
        execute: async ({ name, price }) => {
          const message = `I would like to buy research on ${name} for $${price}`

          console.log("sending message:", message)

          const sellerResponse = await callAgent({
            message
          })

          messages.push({
            role: "assistant",
            content: message
          })

          messages.push({
            role: "user",
            content: sellerResponse.message
          })

          const negotiation = await assessCounterOffer(sellerResponse)

          console.log("\n\nnegotiation state:")
          console.log(negotiation)

          if (
            negotiation.state === "price_agreed" &&
            negotiation.paymentRequestToken
          ) {
            console.log(
              "\n\nwe have reached a price agreement, execute the payment"
            )
            //we have reached a price agreement, execute the payment
            const { receipt } = await sdk.executePayment(
              negotiation.paymentRequestToken
            )

            console.log("\n\npayment made, here is the receipt we will send:")
            console.log(receipt)

            const purchaseResponse = await callAgent({
              message: `Here is my receipt for purchasing research on ${name}`,
              receipt
            })

            console.log("\n\npurchase response:")
            console.log(purchaseResponse)

            return assessCounterOffer(purchaseResponse)
          } else {
            //we are either still negotiating or the negotiation is complete
            return negotiation
          }
        }
      })
    },
    messages
  })

  console.log("final text:", text)
}

main()
