import { generateText, stepCountIs, tool } from "ai"
import { serveAgent, serveAuthedAgent } from "./serve-agent"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import colors from "yoctocolors"
import { input } from "@inquirer/prompts"
import { AckLabSdk } from "../sdk"

async function runAgentB(message: string) {
  const result = await generateText({
    model: anthropic("claude-3-5-haiku-20241022"),
    system:
      "You are a test agent that can add numbers. For any requests that are not about adding numbers, you should say 'I can only add numbers'.",
    prompt: message,
    tools: {
      addNumbers: tool({
        description: "Add two numbers",
        inputSchema: z.object({
          a: z.number(),
          b: z.number()
        }),
        execute: ({ a, b }) => Promise.resolve(a + b)
      })
    },
    stopWhen: stepCountIs(4)
  })

  return result.text
}

const ackLabSdk = new AckLabSdk({
  clientId: "jkbouswwx3jz1zvz7hxgs3ff",
  clientSecret:
    "5a2b23d8408a1f7ea407eea43166553c2f50c8dbbee00b6f9ef159e1266601e8"
})

const callAgent = ackLabSdk.createAgentCaller("http://localhost:7577/chat")

async function runAgentA(message: string) {
  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system:
      "You are a helpful assistant. For any addition requests, you should use call the Addition Agent",
    prompt: message,
    tools: {
      callAdditionAgent: tool({
        description: "Call the Addition Agent",
        inputSchema: z.object({
          message: z.string()
        }),
        execute: async ({ message }) => {
          console.log(">>>> calling addition agent", message)
          try {
            return await callAgent({ message })
          } catch (error) {
            console.error(">>>> error calling addition agent", error)
            return {
              error: true,
              message: error instanceof Error ? error.message : "Unknown error"
            }
          }
        }
      })
    },
    stopWhen: stepCountIs(4)
  })

  return result.text
}

async function main() {
  serveAgent({
    port: 7576,
    runAgent: runAgentA
  })

  serveAuthedAgent({
    port: 7577,
    runAgent: runAgentB,
    sdk: new AckLabSdk({
      clientId: "pj15b3fbe0pgbagaovq55co4",
      clientSecret:
        "128931b34f45732ecd99f643d04427c0a0bd154d1cfcd261707813465519e28f"
    })
  })

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const userInput = await input({
      message: colors.cyan("Enter your input (type /exit to quit):")
    })

    if (userInput.trim().toLowerCase() === "/exit") {
      console.log(colors.blue("Goodbye!"))
      break
    }

    console.log(colors.green("Processing input:"), userInput)

    const result = await fetch("http://localhost:7576/chat", {
      method: "POST",
      body: JSON.stringify({ message: userInput }),
      headers: {
        "Content-Type": "application/json"
      }
    })

    const { text } = z.parse(
      z.object({ text: z.string() }),
      await result.json()
    )

    console.log(colors.green("Result:"), text)
  }
}

main().catch(console.error)
