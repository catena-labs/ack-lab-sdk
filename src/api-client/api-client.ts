import {
  curveToJwtAlgorithm,
  generateKeypair,
  hexStringToBytes,
  keypairToJwk,
  type DidUri,
  type JwtString,
  type W3CCredential
} from "agentcommercekit"
import {
  credentialSchema,
  didUriSchema,
  jwtStringSchema
} from "agentcommercekit/schemas/valibot"
import * as jose from "jose"
import { stringify } from "safe-stable-stringify"
import * as v from "valibot"
import { sha256 } from "../utils/sha-256"
import type { ApiClientConfig } from "./types"

export interface RequestOptions {
  method: string
  path: string
  body?: unknown
}

const apiResponseSchema = v.variant("ok", [
  v.object({
    ok: v.literal(false),
    message: v.string(),
    cause: v.optional(v.unknown())
  }),
  v.object({ ok: v.literal(true), data: v.nullable(v.unknown()) })
])

const agentMetadataSchema = v.object({
  did: didUriSchema,
  vc: credentialSchema
})

type AgentMetadata = v.InferOutput<typeof agentMetadataSchema>

export class ApiClient {
  private readonly baseUrl: string
  private readonly clientId: string
  private readonly clientSecret: string

  private _metadata: AgentMetadata | undefined = undefined

  constructor({ baseUrl, clientId, clientSecret }: ApiClientConfig) {
    this.baseUrl = baseUrl ?? "http://localhost:4002"
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  async getAgentMetadata(): Promise<AgentMetadata> {
    // Metadata does not change for an agent, so we cache it
    if (this._metadata) {
      return this._metadata
    }

    const metadata = await this.request(
      { method: "GET", path: "/v1/metadata" },
      agentMetadataSchema
    )

    this._metadata = metadata

    return metadata
  }

  async getBalance(): Promise<Record<string, string>> {
    return this.request(
      { method: "GET", path: "/v1/balance" },
      v.record(v.string(), v.string())
    )
  }

  async getPaymentRequest(
    amount: number,
    description?: string
  ): Promise<{ paymentToken: string }> {
    return this.request(
      {
        method: "POST",
        path: "/v1/payment-requests",
        body: { amount, description }
      },
      v.object({ paymentToken: v.string() })
    )
  }

  async executePayment(
    paymentToken: string
  ): Promise<{ receipt: W3CCredential }> {
    return this.request(
      {
        method: "POST",
        path: "/v1/payments",
        body: { paymentToken }
      },
      v.object({ receipt: credentialSchema })
    )
  }

  /**
   * Create a signed JWT using the client's private key.
   *
   * @param payload The payload to sign
   * @returns The signed payload
   */
  async sign(payload: unknown): Promise<{ jwt: JwtString }> {
    return this.request(
      { method: "POST", path: "/v1/sign", body: payload },
      v.object({ jwt: jwtStringSchema })
    )
  }

  /**
   * Generate a verifiable presentation
   * @param aud The audience of the presentation
   * @param challenge The challenge to use for the presentation
   * @returns The verifiable presentation
   */
  async generateVerifiablePresentation({
    aud,
    challenge,
    nonce
  }: {
    aud: DidUri
    challenge?: string
    nonce?: string
  }) {
    return this.request(
      {
        method: "POST",
        path: "/v1/verifiable-presentations",
        body: { aud, challenge, nonce }
      },
      v.object({ presentation: jwtStringSchema })
    )
  }

  async verify(challenge: string): Promise<null> {
    return this.request(
      { method: "POST", path: "/v1/verify", body: { challenge } },
      v.null()
    )
  }

  private async request<T>(
    options: RequestOptions,
    schema: v.GenericSchema<unknown, T> // We only care about the output type
  ): Promise<T> {
    const keypair = await generateKeypair(
      "Ed25519",
      hexStringToBytes(this.clientSecret)
    )

    const joseKeypair = await jose.importJWK(
      keypairToJwk(keypair),
      keypair.curve
    )

    const bodyString = options.body ? stringify(options.body) : ""

    const bodyHash = await sha256(bodyString)

    const authHeaderPayload = {
      method: options.method,
      path: options.path,
      bodyHash
    }

    const authHeader = await new jose.SignJWT(authHeaderPayload)
      .setProtectedHeader({
        alg: curveToJwtAlgorithm(keypair.curve),
        kid: this.clientId
      })
      .sign(joseKeypair)

    const url = new URL(options.path, this.baseUrl)
    const init: RequestInit = {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authHeader}`
      }
    }

    if (options.body) {
      init.body = bodyString
    }

    const response = await fetch(url, init)

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`)
    }

    const result = v.parse(apiResponseSchema, await response.json())

    if (!result.ok) {
      throw new Error(result.message)
    }

    return v.parse(schema, result.data)
  }
}
