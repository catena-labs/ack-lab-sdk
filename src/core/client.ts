import { verifyJwt, type DidUri, type JwtString } from "agentcommercekit"
import * as v from "valibot"
import { ApiClient, type ApiClientConfig } from "../api-client"
import { generateChallenge } from "../utils/challenge"
import { didUriSchema } from "agentcommercekit/schemas/valibot"

export class AckLabSdk {
  private readonly apiClient: ApiClient
  private readonly challenges = new Map<string, string>()

  constructor(config: ApiClientConfig) {
    this.apiClient = new ApiClient(config)
  }

  /**
   * Create a handshake initialization message
   * @example
   * ```ts
   * apiClient.initializeHandshake("did:web:agentB")
   * // => JwtString<{
   *   "iss": "did:web:agentA", // this agent
   *   "aud": "did:web:agentB", // recipient
   *   "jti": "a-generated-12345", // generated challenge
   *   "auth": "handshake-initialization", // constant
   *   "exp": 1234567890 // expiration time
   * }>
   */
  async initializeHandshake(recipient: DidUri): Promise<JwtString> {
    const challenge = this.generateChallenge(recipient)

    const { jwt } = await this.apiClient.sign({
      aud: recipient,
      jti: challenge,
      auth: "handshake-initialization",
      exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes from now
    })

    return jwt
  }

  /**
   * Verify a handshake initialization message and respond to it
   * @param jwt The handshake initialization message
   * @returns The handshake response message
   * @example
   * ```ts
   *  {
   *   "vp": {...},
   *   "iss": "did:web:agentB",
   *   "aud": "did:web:agentA",
   *   "nonce": "a-generated-12345",  // echoing a's jti
   *   "jti": "b-generated-67890",  // b's challenge for a
   *   "exp": 1234567890
   * }
   * ```
   */
  async verifyHandshakeResponse(_jwt: JwtString) {
    // get the challenge and verify we have this thing.
  }

  /**
   * @example
   * ```ts
   * {
   *   "vp": {...},
   *   "iss": "did:web:agentA",
   *   "aud": "did:web:agentB",
   *   "nonce": "b-generated-67890",  // echoing b's jti
   *   "jti": "a-generated-NEW-123",  // new jti for uniqueness
   *   "exp": 1234567890
   * }
   * ```
   * @param jwt The handshake response message
   */
  async generateHandshakeResponse(handshake: JwtString) {
    const { payload } = await verifyJwt(handshake)
    const { jti, iss } = v.parse(
      v.object({ jti: v.optional(v.string()), iss: didUriSchema }),
      payload
    )

    // TODO: Verify the JWT contents (e.g check the VP).
    // It may be a JWT VP, it may be a Handshake Initialization

    const challenge = this.generateChallenge(iss)

    const { presentation } =
      await this.apiClient.generateVerifiablePresentation({
        aud: iss,
        challenge,
        nonce: jti
      })

    return presentation
  }

  /**
   * Generate and cache a challenge for a counterparty
   */
  generateChallenge(counterparty: DidUri) {
    const challenge = generateChallenge()
    this.challenges.set(challenge, counterparty)
    return challenge
  }

  /**
   * Check if a challenge is valid for a counterparty
   * @param counterparty The counterparty of the challenge
   * @param challenge The challenge to check
   * @returns True if the challenge is valid for the counterparty, false otherwise
   */
  isValidChallengeForCounterparty(
    counterparty: DidUri,
    challenge: string
  ): boolean {
    return this.challenges.get(challenge) === counterparty
  }
}
