import { config } from "dotenv"
import { AckLabSdk } from "@ack-lab/sdk"

import { generateText, tool, stepCountIs } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

config()

const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

const callAgent = sdk.createAgentCaller(`http://localhost:3000/api/fixed-price`)

const buyResearchInput = z.object({
  name: z.string().describe("Name of the research to buy")
})

async function main() {
  const dataCache = new Map<string, any>()

  console.log("Buying research on William Adama")

  const { text } = await generateText({
    model: openai("gpt-4o"),
    stopWhen: stepCountIs(10),
    tools: {
      buyResearch: tool({
        description: "Buy research",
        inputSchema: buyResearchInput,
        execute: async ({ name }) => {
          console.log(
            "Making an LLM-triggered offer to purchase research on",
            name
          )

          const { message, data } = await callAgent({
            message: "Hello I would like to buy research on " + name
          })

          const { paymentRequestToken, research } = data as any

          if (research) {
            dataCache.set(name, research)
            return research
          }

          if (paymentRequestToken) {
            console.log("\n\nPayment Request Token received:")
            console.log(paymentRequestToken)

            console.log("\n\nExecuting payment...")
            const { receipt } = await sdk.executePayment(paymentRequestToken)

            console.log("\n\nPayment made, here is the receipt:")
            console.log(receipt)

            const { message, data: docData } = await callAgent({
              message: "Here is my receipt for purchasing research on " + name,
              data: {
                receipt
              }
            })

            console.log("\n\nSeller final response: ")
            console.log(message)
            console.log("research:")
            console.log(docData)

            dataCache.set("research", docData)
            dataCache.set("paymentRequestToken", paymentRequestToken)
            return docData
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
        content: "Please purchase research on William Adama"
      }
    ]
  })

  console.log(text)
}

main()
