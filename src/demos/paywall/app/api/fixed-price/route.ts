import { sdk, processMessage } from "../../fixed-price"

// Create an agent handler that will process incoming messages
// This uses the ACK Lab SDK to provide a secure communication channel between the buyer and the seller
const agentHandler = sdk.createRequestHandler(processMessage)

// This is the endpoint that the buyer will call to purchase research
// Almost all of the actual work is delegated to the processMessage function in agent.ts
export async function POST(req: Request) {
  const body = await req.json()

  const response = await agentHandler(body.jwt)

  return new Response(JSON.stringify(response))
}
