/**
 * Simplified example code for ACK Lab Developer Preview use only. For use in test environment only.
 * Use with value bearing assets or outside the test environment may result in permanent loss of value.
 */
import { NegotiatingBuyerAgent } from "@/src/negotiate"
import { config } from "dotenv"
config()

async function main() {
  const name = "William Adama"

  const agent = new NegotiatingBuyerAgent({
    clientId: process.env.ACK_LAB_CLIENT_ID!,
    clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
  })

  const research = await agent.purchaseResearch(name)

  console.log("\n\nResearch received:")
  console.log(research)
}

main().catch(console.error)
