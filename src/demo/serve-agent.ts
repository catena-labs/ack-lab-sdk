import { serve } from "@hono/node-server"
import { vValidator } from "@hono/valibot-validator"
import { type JwtString } from "agentcommercekit"
import { jwtStringSchema } from "agentcommercekit/schemas/valibot"
import { Hono, type TypedResponse } from "hono"
import { logger } from "hono/logger"
import * as v from "valibot"
import type { AckLabAgent } from "../agent"

type AgentFn = (prompt: string) => Promise<string>

interface ServeAgentConfig {
  runAgent: AgentFn
  port: number
}

interface ServeAuthedAgentConfig extends ServeAgentConfig {
  sdk: AckLabAgent
}

export function serveAuthedAgent({
  port,
  runAgent,
  sdk
}: ServeAuthedAgentConfig) {
  console.log(`> Starting local server...`)

  const agentHandler = sdk.createRequestHandler(v.string(), runAgent)

  const app = new Hono()

  app.use("*", logger())
  app.post(
    "/chat",
    vValidator("json", v.object({ jwt: jwtStringSchema })),
    async (c): Promise<TypedResponse<{ jwt: JwtString }>> => {
      const { jwt } = c.req.valid("json")

      console.log(">>>> received jwt", jwt)

      const result = await agentHandler(jwt)

      return c.json(result)
    }
  )

  serve({
    fetch: app.fetch,
    port
  })
}

export function serveAgent({ port, runAgent }: ServeAgentConfig) {
  console.log(`> Starting local server...`)

  const app = new Hono()
  app.use("*", logger())
  app.post(
    "/chat",
    vValidator("json", v.object({ message: v.string() })),
    async (c) => {
      const { message } = c.req.valid("json")

      console.log(">>> received message", message)

      const text = await runAgent(message)

      return c.json({ text })
    }
  )

  serve({
    fetch: app.fetch,
    port
  })
}
