/**
 * Simplified example code for ACK Lab Developer Preview use only. For use in test environment only.
 * Use with value bearing assets or outside the test environment may result in permanent loss of value.
 */
import { AckLabAgent } from "@ack-lab/sdk"
import { verifyPaymentRequestToken, getDidResolver } from "agentcommercekit"

import { generateText, tool, stepCountIs } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import * as v from "valibot"
import type { ModelMessage } from "ai"

// When our agent sends messages to the counterparty agent, the messages are of this shape
// There is always a message, and sometimes a receipt and sessionId
const requestSchema = v.object({
  message: v.string(),
  receipt: v.optional(v.string()),
  sessionId: v.optional(v.string())
})

// When the counterparty agent sends messages to our agent, the messages are of this shape
// There is always a message, and sometimes a payment request token, research, or sessionId
const responseSchema = v.object({
  message: v.string(),
  paymentRequestToken: v.optional(v.string()),
  research: v.optional(v.string()),
  sessionId: v.optional(v.string())
})

//this is how much our agent should expect to pay at full price
const expectedFullPrice = 20 // in USD

const systemPrompt = `You are a helpful assistant who can buy research for a given person.
Use your buyResearch tool to purchase research.
The research in question is usually sold for ${expectedFullPrice} USD,
but see if you can get it for ${expectedFullPrice - 5} USD or less.

IMPORTANT: always use your buyResearch tool multiple times in a row until
the negotiation is complete, you are not negotiating with the user but
with a counterparty via the buyResearch tool. If the seller offers you a discount,
try to see if you can get a little more discount, but accept the first discount offered
if the seller remains firm on that.`

export class NegotiatingBuyerAgent {
  sdk: AckLabAgent
  messages: ModelMessage[]
  callAgent
  sessionId?: string

  constructor({
    clientId,
    clientSecret
  }: {
    clientId: string
    clientSecret: string
  }) {
    this.sdk = new AckLabAgent({
      clientId,
      clientSecret,
      agentId: process.env.ACK_LAB_AGENT_ID!,
      baseUrl: process.env.ACK_LAB_BASE_URL!
    })

    this.messages = [
      {
        role: "system",
        content: systemPrompt
      }
    ]

    this.callAgent = this.sdk.createAgentCaller(
      `${process.env.PAYWALL_HOST}/api/chat/negotiate`,
      requestSchema,
      responseSchema
    )
  }

  async purchaseResearch(name: string) {
    this.messages.push({
      role: "user",
      content: `Please purchase research on ${name}. Negotiate the price as low as you can.
        Keep on negotiating until the seller agrees to a price of $15 or less.`
    })

    const { text } = await generateText({
      model: openai("gpt-4o"),
      stopWhen: stepCountIs(10),
      messages: this.messages,
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

            console.log("sending message to seller agent:", message)

            const sellerResponse = await this.callAgent({
              message,
              sessionId: this.sessionId
            })

            // Store sessionId from response for future calls
            if (sellerResponse.sessionId) {
              this.sessionId = sellerResponse.sessionId
            }

            this.messages.push({
              role: "assistant",
              content: message
            })

            this.messages.push({
              role: "user",
              content: sellerResponse.message
            })

            console.log("\n\nseller response:")
            console.log(sellerResponse)

            const negotiation = await assessCounterOffer(sellerResponse)

            if (
              negotiation.state === "price_agreed" &&
              negotiation.paymentRequestToken
            ) {
              console.log(
                "\n\nwe have reached a price agreement, execute the payment"
              )
              //we have reached a price agreement, execute the payment
              const { receipt } = await this.sdk.executePayment(
                negotiation.paymentRequestToken
              )

              console.log("\n\npayment made, here is the receipt we will send:")
              console.log(receipt)

              const purchaseResponse = await this.callAgent({
                message: `Here is my receipt for purchasing research on ${name}`,
                receipt,
                sessionId: this.sessionId
              })

              return assessCounterOffer(purchaseResponse)
            } else {
              //we are either still negotiating or the negotiation is complete
              return negotiation
            }
          }
        })
      }
    })

    return text
  }
}

type Payload = v.InferInput<typeof responseSchema>

// Because we are engaged in a negotiation with the seller,
// we need to keep track of the state of the negotiation
type Negotiation = {
  state: "negotiating" | "price_agreed" | "complete"
  research: any
  paymentRequestToken?: string
  message?: string //the most recent message from the seller
}

// This function assesses the counter offer from the seller
// In this case we're just accepting the offer if it's less than full price
async function assessCounterOffer({
  paymentRequestToken,
  research,
  message
}: Payload): Promise<Negotiation> {
  //if we have received the research, the negotiation is complete
  if (research) {
    return {
      state: "complete",
      research,
      paymentRequestToken,
      message
    }
  }

  // if there is a payment request token, we need to verify it and see if we want to accept it
  if (paymentRequestToken) {
    const { paymentRequest } = await verifyPaymentRequestToken(
      paymentRequestToken,
      {
        resolver: getDidResolver()
      }
    )

    //we'll accept any discount at all
    const priceAcceptable =
      BigInt(paymentRequest.paymentOptions[0].amount) <
      BigInt(expectedFullPrice * 1000000)

    //This payment option is known to always be a testname USD-parity currency with 6dp
    //Obviously, this is brittle and will need to be updated when we leave developer preview
    return {
      state: priceAcceptable ? "price_agreed" : "negotiating",
      research,
      paymentRequestToken,
      message
    }
  }

  throw new Error("No payment request token or research")
}
