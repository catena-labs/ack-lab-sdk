import {
  getDidResolver,
  verifyJwt,
  verifyParsedCredential,
  verifyPresentation,
  type DidUri,
  type JwtPayload,
  type JwtString,
  type Resolvable
} from "agentcommercekit"
import { didUriSchema } from "agentcommercekit/schemas/valibot"
import * as jose from "jose"
import * as v from "valibot"
import { generateChallenge } from "../utils/challenge"
import { ApiClient } from "./api-client"
import { verifyPresentationClaims } from "./credentials"

export class HandshakeClient {
  private readonly apiClient: ApiClient
  private readonly challenges = new Map<string, string>()

  private resolver: Resolvable

  constructor(apiClient: ApiClient, opts?: { resolver?: Resolvable }) {
    this.apiClient = apiClient
    this.resolver = opts?.resolver ?? getDidResolver()
  }

  /**
   * Create a handshake initialization message
   * @example
   * ```ts
   * apiClient.initializeHandshake("did:web:agentB")
   * // => JwtString<{
   *   "iss": "did:web:agentA", // this agent
   *   "type": "handshake-init", // constant
   *   "exp": 1234567890 // expiration time
   * }>
   */
  async initiateHandshake() {
    const { jwt } = await this.apiClient.sign({
      type: "handshake-init",
      exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes from now
    })

    return jwt
  }

  /**
   * Handle an incoming handshake initialization message from another agent.
   * Verifies the init message and responds with a verifiable presentation containing credentials.
   * @param jwt The handshake initialization JWT from the counterparty
   * @returns Object containing the response JWT to send back
   * @example
   * ```ts
   * const response = await sdk.handleHandshakeInit(initJwt)
   * // => { jwt: JwtString<VerifiablePresentation> }
   * ```
   */
  async handleHandshakeInit(jwt: JwtString): Promise<{ jwt: JwtString }> {
    const { issuer: callerDid } = await verifyJwt(jwt, {
      resolver: this.resolver
    })

    const challenge = this.generateChallenge(callerDid)

    const { presentation } =
      await this.apiClient.generateVerifiablePresentation({
        aud: callerDid as DidUri,
        nonce: challenge
      })

    return { jwt: presentation }
  }

  /**
   * Handle an incoming handshake response message and generate a continuation.
   * Processes the counterparty's verifiable presentation and creates the next message in the handshake flow.
   * @param jwt The handshake response JWT containing a verifiable presentation
   * @returns Object containing the continuation JWT and counterparty DID
   * @example
   * ```ts
   * const continuation = await sdk.handleHandshakeResponse(responseJwt)
   * // => { jwt: JwtString<VerifiablePresentation>, counterpartyDid: "did:web:agentB" }
   * ```
   */
  async handleHandshakeResponse(jwt: JwtString): Promise<{
    jwt: JwtString
    counterpartyDid: DidUri
  }> {
    const { payload, counterpartyDid } = await this.verifyPresentation(jwt, {
      validateChallenge: false
    })

    const counterpartyChallenge = this.extractCounterpartyChallenge(payload)

    const challenge = this.generateChallenge(counterpartyDid)

    const { presentation } =
      await this.apiClient.generateVerifiablePresentation({
        aud: counterpartyDid,
        challenge: counterpartyChallenge,
        nonce: challenge
      })

    return {
      jwt: presentation,
      counterpartyDid
    }
  }

  /**
   * Finalize the handshake by processing the continuation message and sending completion.
   * This is the final step for the responding agent in the handshake flow.
   * @param jwt The handshake continuation JWT from the initiating agent
   * @returns Object containing the completion JWT and counterparty DID
   * @example
   * ```ts
   * const completion = await sdk.finalizeHandshake(continuationJwt)
   * // => { counterpartyDid: "did:web:agentA", jwt: JwtString<{type: "handshake-complete"}> }
   * ```
   */
  async finalizeHandshake(
    jwt: JwtString
  ): Promise<{ counterpartyDid: DidUri; jwt: JwtString }> {
    const { payload, counterpartyDid } = await this.verifyPresentation(jwt, {
      validateChallenge: true
    })

    const counterpartyChallenge = this.extractCounterpartyChallenge(payload)

    const { jwt: responseJwt } = await this.apiClient.sign({
      type: "handshake-complete",
      nonce: counterpartyChallenge,
      aud: counterpartyDid,
      exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes from now
    })

    return { counterpartyDid, jwt: responseJwt }
  }

  /**
   * Verify the handshake completion message from the counterparty.
   * Final verification step for the initiating agent to confirm successful handshake.
   * @param jwt The handshake completion JWT from the responding agent
   * @returns Object containing the verified payload and counterparty DID
   * @example
   * ```ts
   * const result = await sdk.verifyHandshakeComplete(completionJwt)
   * // => { payload: JwtPayload, counterpartyDid: "did:web:agentB" }
   * ```
   */
  async verifyHandshakeComplete(jwt: JwtString): Promise<{
    payload: Partial<JwtPayload>
    counterpartyDid: DidUri
  }> {
    const { did } = await this.apiClient.getAgentMetadata()

    const { payload, issuer: counterpartyDid } = await verifyJwt(jwt, {
      resolver: this.resolver,
      audience: did
    })

    this.validateChallenge(counterpartyDid, payload)

    return { payload, counterpartyDid: counterpartyDid as DidUri }
  }

  /**
   * Check if a JWT payload represents a handshake response message.
   * Used internally to distinguish between different message types in the handshake flow.
   * @param payload The decoded JWT payload to check
   * @returns True if the payload contains a verifiable presentation (indicating handshake response)
   */
  isHandshakeResponseMessage(payload: unknown) {
    return v.safeParse(
      v.object({
        vp: v.record(v.string(), v.unknown())
      }),
      payload
    ).success
  }

  /**
   * Determine the type of request from a JWT message.
   * Analyzes the JWT payload to classify it as init, response, or regular message.
   * @param jwt The JWT string to analyze
   * @returns The classified request type
   * @example
   * ```ts
   * const type = sdk.getRequestType(incomingJwt)
   * if (type === "handshake-init") {
   *   await sdk.handleHandshakeInit(incomingJwt)
   * }
   * ```
   */
  getRequestType(
    jwt: JwtString
  ): "handshake-init" | "handshake-response" | "message" {
    const payload = jose.decodeJwt(jwt)

    // Would be nice if we could just have a `type` field in the payload
    // here to, but would need to update that on our api end.
    if (this.isHandshakeResponseMessage(payload)) {
      return "handshake-response"
    }

    const result = v.safeParse(
      v.object({
        type: v.picklist(["message", "handshake-init"])
      }),
      payload
    )

    if (!result.success) {
      throw new Error("Invalid message")
    }

    return result.output.type
  }

  /**
   * Verify a handshake response JWT and extract relevant information.
   * Internal method that validates the verifiable presentation and credentials.
   * @param jwt The handshake response JWT to verify
   * @param opts.validateChallenge Whether to validate the challenge response.
   * @returns Object containing verified payload and counterparty DID
   */
  private async verifyPresentation(
    jwt: JwtString,
    { validateChallenge = false }: { validateChallenge?: boolean } = {}
  ): Promise<{
    payload: Partial<JwtPayload>
    counterpartyDid: DidUri
  }> {
    const { did } = await this.apiClient.getAgentMetadata()

    const {
      payload,
      verifiablePresentation,
      issuer: counterpartyDid
    } = await verifyPresentation(jwt, this.resolver, {
      domain: did
    })

    if (validateChallenge) {
      this.validateChallenge(counterpartyDid, payload)
    }

    const credentials = verifiablePresentation.verifiableCredential ?? []

    await Promise.all(
      credentials.map(async (credential) => {
        await verifyParsedCredential(credential, { resolver: this.resolver })
      })
    )

    verifyPresentationClaims(counterpartyDid, credentials)

    return { payload, counterpartyDid: counterpartyDid as DidUri }
  }

  /**
   * Validate that the received challenge matches the expected one for a counterparty.
   * Internal security check to prevent replay attacks and ensure proper handshake flow.
   * @param counterpartyDid The DID of the counterparty agent
   * @param payload The JWT payload containing the nonce to validate
   * @throws Error if challenge validation fails
   */
  private validateChallenge(
    counterpartyDid: string,
    payload: Partial<JwtPayload>
  ) {
    const expectedChallenge = this.challenges.get(counterpartyDid)

    const { nonce } = v.parse(
      v.object({ nonce: v.optional(v.string()) }),
      payload
    )

    if (expectedChallenge && expectedChallenge !== nonce) {
      throw new Error(
        `Expected challenge ${expectedChallenge} but got ${nonce ?? "undefined"}`
      )
    }
  }

  /**
   * Generate and cache a challenge for a counterparty
   */
  private generateChallenge(counterparty?: string) {
    const challenge = generateChallenge()

    if (counterparty) {
      this.challenges.set(counterparty, challenge)
    }

    return challenge
  }

  /**
   * Extract the counterparty's challenge (jti) from a JWT payload.
   * Internal helper to parse challenge information from handshake messages.
   * @param payload The JWT payload to extract challenge from
   * @returns The challenge string or undefined if not present
   */
  private extractCounterpartyChallenge(payload: unknown) {
    const { jti: callerChallenge } = v.parse(
      v.object({ jti: v.optional(v.string()), iss: didUriSchema }),
      payload
    )

    return callerChallenge
  }
}
