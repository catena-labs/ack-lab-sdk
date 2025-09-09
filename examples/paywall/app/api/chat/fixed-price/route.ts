import { handler } from "./agent"

// This is the endpoint that the buyer will call to purchase research
// Almost all of the actual work is delegated to the processMessage function in agent.ts
export async function POST(req: Request) {
  const body = await req.json()

  const response = await handler(body.jwt)

  return new Response(JSON.stringify(response))
}
