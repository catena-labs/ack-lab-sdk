import { ResearchPurchasingAgent } from "@/src/buy-agent"
import { config } from "dotenv"
config()

async function main() {
  const name = "William Adama"

  const agent = new ResearchPurchasingAgent({
    clientId: process.env.ACK_LAB_CLIENT_ID!,
    clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
  })

  const research = await agent.purchaseResearch(name)

  console.log("\n\nResearch received:")
  console.log(research)
}

main().catch(console.error)
