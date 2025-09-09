import { handler } from "./agent"

// This is the endpoint that the buyer will call to purchase research
export async function POST(req: Request) {
  const body = await req.json()

  const response = await handler(body.jwt)

  return new Response(JSON.stringify(response))
}
