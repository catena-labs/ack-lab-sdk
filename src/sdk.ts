import {
  getDidResolver,
  verifyJwt,
  type JwtString,
  type Resolvable
} from "agentcommercekit"
import { jwtStringSchema } from "agentcommercekit/schemas/valibot"
import * as v from "valibot"
import { ApiClient, HandshakeClient, type ApiClientConfig } from "./core"

type AgentCaller = (input: { message: string }) => Promise<string>

type AgentFn = (prompt: string) => Promise<string>
type AgentHandler = (jwt: JwtString) => Promise<{ jwt: JwtString }>

const responseSchema = v.object({
  jwt: jwtStringSchema
})

const payloadSchema = v.object({
  text: v.string()
})

async function jwtFetch(url: string, jwt: JwtString) {
  const result = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ jwt }),
    headers: {
      "Content-Type": "application/json"
    }
  })

  if (!result.ok) {
    throw new Error(`Failed to call agent: ${await result.text()}`)
  }

  const { jwt: responseJwt } = v.parse(responseSchema, await result.json())

  return responseJwt
}

/**
 * AckLabSdk - The main SDK for building authenticated agent-to-agent communication.
 *
 * This SDK provides high-level utilities for agent developers to easily implement
 * secure handshake protocols and authenticated messaging between agents. It handles
 * the complex cryptographic handshake flow and provides simple factory methods
 * for creating agent callers and request handlers.
 *
 * @example Basic usage for calling another agent:
 * ```ts
 * const sdk = new AckLabSdk({
 *   clientId: "your-client-id",
 *   clientSecret: "your-client-secret"
 * })
 *
 * const callAgent = sdk.createAgentCaller("http://localhost:3000/chat")
 * const response = await callAgent({ message: "Hello, world!" })
 * console.log(response) // "Hello back!"
 * ```
 *
 * @example Basic usage for handling incoming requests:
 * ```ts
 * const sdk = new AckLabSdk(config)
 * const handler = sdk.createRequestHandler(async (message) => {
 *   return `You said: ${message}`
 * })
 *
 * // Use with your HTTP server framework
 * app.post('/chat', async (req, res) => {
 *   const { jwt } = req.body
 *   const response = await handler(jwt)
 *   res.json(response)
 * })
 * ```
 */
export class AckLabSdk {
  private readonly apiClient: ApiClient
  private readonly handshakeClient: HandshakeClient
  private readonly resolver: Resolvable

  /**
   * Create a new AckLabSdk instance.
   *
   * @param config - API client configuration containing credentials
   * @param config.clientId - Your agent's client ID from the AckLab platform
   * @param config.clientSecret - Your agent's client secret from the AckLab platform
   * @param opts - Optional configuration
   * @param opts.resolver - Custom DID resolver (defaults to standard resolver)
   *
   * @example
   * ```ts
   * const sdk = new AckLabSdk({
   *   clientId: "jkbouswwx3jz1zvz7hxgs3ff",
   *   clientSecret: "5a2b23d8408a1f7ea407eea43166553c2f50c8dbbee00b6f9ef159e1266601e8"
   * })
   * ```
   */
  constructor(config: ApiClientConfig, opts?: { resolver?: Resolvable }) {
    this.resolver = opts?.resolver ?? getDidResolver()

    this.apiClient = new ApiClient(config)

    this.handshakeClient = new HandshakeClient(this.apiClient, {
      resolver: this.resolver
    })
  }

  /**
   * Create a function for calling another agent at a specific URL.
   *
   * This method returns a function that handles authentication automatically
   * on first use and maintains the authenticated session for subsequent calls.
   * The handshake flow is performed transparently when needed.
   *
   * @param url - The HTTP endpoint URL of the target agent (e.g., "http://localhost:3000/chat")
   * @returns A function that takes a message and returns the agent's response
   *
   * @example Basic usage:
   * ```ts
   * const callMathAgent = sdk.createAgentCaller("http://localhost:3001/chat")
   *
   * const result = await callMathAgent({
   *   message: "What is 2 + 2?"
   * })
   * console.log(result) // "2 + 2 = 4"
   * ```
   *
   * @example Using with AI SDK tools:
   * ```ts
   * const callAgent = sdk.createAgentCaller("http://localhost:3001/chat")
   *
   * const additionTool = tool({
   *   description: "Call the math agent",
   *   inputSchema: z.object({ message: z.string() }),
   *   execute: async ({ message }) => {
   *     return await callAgent({ message })
   *   }
   * })
   * ```
   */
  createAgentCaller(url: string): AgentCaller {
    let authedDid: string | undefined

    return async (input) => {
      authedDid ??= await this.authenticateAgent(url)

      const { jwt: messageJwt } = await this.apiClient.sign({
        type: "message",
        ...input
      })

      const responseJwt = await jwtFetch(url, messageJwt)

      const parsed = await verifyJwt(responseJwt, { resolver: this.resolver })
      const { text } = v.parse(payloadSchema, parsed.payload)

      return text
    }
  }

  /**
   * Create a request handler for processing incoming agent messages.
   *
   * This method returns a function that can be integrated with any HTTP server
   * framework to handle incoming JWT messages from other agents. It automatically
   * manages the handshake flow and authentication state, only allowing messages
   * from properly authenticated agents.
   *
   * @param runAgent - Function that processes authenticated messages and returns responses
   * @returns A handler function that processes incoming JWTs and returns responses
   *
   * @example With Express.js:
   * ```ts
   * const handler = sdk.createRequestHandler(async (message) => {
   *   return `Echo: ${message}`
   * })
   *
   * app.post('/chat', async (req, res) => {
   *   try {
   *     const { jwt } = req.body
   *     const response = await handler(jwt)
   *     res.json(response)
   *   } catch (error) {
   *     res.status(400).json({ error: error.message })
   *   }
   * })
   * ```
   *
   * @example With Hono:
   * ```ts
   * const handler = sdk.createRequestHandler(async (message) => {
   *   // Use AI to generate response
   *   const result = await generateText({
   *     model: anthropic("claude-3-5-haiku-20241022"),
   *     prompt: message
   *   })
   *   return result.text
   * })
   *
   * app.post('/chat', async (c) => {
   *   const { jwt } = await c.req.json()
   *   const response = await handler(jwt)
   *   return c.json(response)
   * })
   * ```
   */
  createRequestHandler(runAgent: AgentFn): AgentHandler {
    const authedDids = new Set<string>()

    return async (jwt) => {
      const requestType = this.handshakeClient.getRequestType(jwt)

      switch (requestType) {
        case "handshake-init": {
          return this.handshakeClient.handleHandshakeInit(jwt)
        }
        case "handshake-response": {
          const { counterpartyDid, jwt: responseJwt } =
            await this.handshakeClient.finalizeHandshake(jwt)

          authedDids.add(counterpartyDid)

          return { jwt: responseJwt }
        }
        case "message": {
          const { payload, issuer: counterpartyDid } = await verifyJwt(jwt, {
            resolver: this.resolver
          })

          if (!authedDids.has(counterpartyDid)) {
            throw new Error(
              `Counterparty ${counterpartyDid} is not authed. Please authenticate first.`
            )
          }

          const { message } = v.parse(
            v.object({ message: v.string() }),
            payload
          )

          const text = await runAgent(message)

          return this.apiClient.sign({ text })
        }
      }
    }
  }

  /**
   * Create a payment request for the agent.
   *
   * @param minorUnits - The amount in minor units to request (e.g. 1000 for $10 in USD)
   * @param currencyCode - The currency code to request (e.g. "USD")
   * @param description - Optional description of the payment request
   * @returns Promise resolving to the payment request token
   */
  async createPaymentRequest(
    minorUnits: number,
    {
      currencyCode = "USD",
      description
    }: { currencyCode?: string; description?: string } = {}
  ) {
    return this.apiClient.getPaymentRequest(minorUnits, {
      currencyCode,
      description
    })
  }

  /**
   * Execute a payment request for the agent.
   *
   * @param paymentRequestToken - The signed payment request token to pay
   * @returns Promise resolving to the payment result
   */
  async executePayment(paymentRequestToken: string) {
    return this.apiClient.executePayment(paymentRequestToken)
  }

  /**
   * Authenticate with a remote agent by performing the full handshake flow.
   *
   * This private method handles the complete agent-to-agent authentication process:
   * 1. Sends handshake initialization message
   * 2. Processes the agent's verifiable presentation response
   * 3. Sends handshake continuation with own credentials
   * 4. Verifies the final handshake completion message
   *
   * @param url - The HTTP endpoint URL of the target agent
   * @returns Promise resolving to the authenticated agent's DID
   * @private
   */
  private async authenticateAgent(url: string) {
    const initHandshakeMessage = await this.handshakeClient.initiateHandshake()

    const handshakeResponseJwt = await jwtFetch(url, initHandshakeMessage)

    const { jwt: responseJwt } =
      await this.handshakeClient.handleHandshakeResponse(handshakeResponseJwt)

    const handshakeCompleteJwt = await jwtFetch(url, responseJwt)

    const { counterpartyDid } =
      await this.handshakeClient.verifyHandshakeComplete(handshakeCompleteJwt)

    return counterpartyDid
  }
}
