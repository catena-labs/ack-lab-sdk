/**
 * Simplified example code for ACK Lab Developer Preview use only. For use in test environment only.
 * Use with value bearing assets or outside the test environment may result in permanent loss of value.
 */
import { AckLabAgent } from "@ack-lab/sdk"

import { generateText, tool, stepCountIs } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import * as v from "valibot"
import { logToolErrors } from "./utils/log-tool-errors"

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

export class ResearchPurchasingAgent {
  agent: AckLabAgent
  callAgent

  constructor({
    clientId,
    clientSecret
  }: {
    clientId: string
    clientSecret: string
  }) {
    this.agent = new AckLabAgent({
      clientId,
      clientSecret,
      agentId: process.env.ACK_LAB_AGENT_ID!
    })

    this.callAgent = this.agent.createAgentCaller(
      `${process.env.PAYWALL_HOST}/api/chat/fixed-price`,
      requestSchema,
      responseSchema
    )
  }

  async purchaseResearch(name: string) {
    let researchResult: string | undefined

    const { steps } = await generateText({
      model: openai("gpt-4o"),
      stopWhen: stepCountIs(10),
      tools: {
        buyResearch: tool({
          description: "Buy research",
          inputSchema: z.object({
            name: z.string().describe("Name of the research to buy")
          }),
          execute: async ({ name }) => {
            console.log(
              "Making an LLM-triggered offer to purchase research on",
              name
            )

            const { paymentRequestToken, research } = await this.callAgent({
              message: "Hello I would like to buy research on " + name
            })

            if (research) {
              console.log("\n\nResearch received:")
              console.log(research)
              return research
            }

            if (paymentRequestToken) {
              console.log("\n\nPayment Request Token received:")
              console.log(paymentRequestToken)

              console.log("\n\nExecuting payment...")
              const { receipt } =
                await this.agent.executePayment(paymentRequestToken)

              console.log("\n\nPayment made, here is the receipt:")
              console.log(receipt)

              const { research } = await this.callAgent({
                message:
                  "Here is my receipt for purchasing research on " + name,
                receipt
              })

              researchResult = research

              return research
            }
          }
        })
      },
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant who can buy research for a given person. Use your buyResearch tool to purchase research."
        },
        {
          role: "user",
          content: "Please purchase research on " + name
        }
      ]
    })

    logToolErrors(steps)

    return researchResult
  }
}
