import { Role } from "a2a-js"
import { isDidUri } from "agentcommercekit"
import {
  createA2AHandshakeMessageFromJwt,
  createA2AHandshakePayload,
  verifyA2AHandshakeMessage,
  verifyA2ASignedMessage
} from "agentcommercekit/a2a"
import type {
  DataPart,
  Part,
  SendMessageRequest,
  SendMessageResponse
} from "a2a-js"
import type { AckHubSdkConfig } from "../types"
import { ApiClient } from "../api-client"
import { verifyCredential } from "../utils/verify-credential"

type VerificationPart = Omit<DataPart, "data"> & {
  data: {
    verificationChallenge: string
  }
}

function isVerificationPart(part: Part): part is VerificationPart {
  return part.type === "data" && "verificationChallenge" in part.data
}

export class AckHubServerSdk {
  private authenticatedClients = new Set<string>()
  private apiClient: ApiClient
  private config: AckHubSdkConfig

  constructor(config: AckHubSdkConfig) {
    this.apiClient = new ApiClient(config)
    this.config = config
  }

  async handleRequest(
    request: SendMessageRequest
  ): Promise<SendMessageResponse | undefined> {
    const message = request.params.message

    if (this.isVerificationRequest(request)) {
      return this.handleVerification(request)
    }

    if (this.isAuthRequest(request)) {
      return this.handleAuthentication(request)
    }

    const { did } = await this.apiClient.getAgentMetadata()

    try {
      const { issuer: clientDid } = await verifyA2ASignedMessage(message, {
        did
      })

      if (!isDidUri(clientDid)) {
        throw new Error("Invalid issuer")
      }

      // Will need to extend this mechanism to support a serverless context
      if (!this.authenticatedClients.has(clientDid)) {
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32001, message: "Authentication required" }
        }
      }
    } catch (error) {
      // There are a lot of reasons this verification could have failed.
      // We might want to refactor this to better indicate what went wrong
      console.error(error)
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32001, message: "Identity verification failed" }
      }
    }
  }
  private isVerificationRequest(request: SendMessageRequest): boolean {
    return request.params.message.parts.some(isVerificationPart)
  }

  private isAuthRequest(request: SendMessageRequest): boolean {
    return request.params.message.parts.some(
      (part) => "data" in part && "jwt" in part.data
    )
  }

  private async handleAuthentication(
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      const { did, vc } = await this.apiClient.getAgentMetadata()

      const {
        nonce: clientNonce,
        iss: clientDid,
        vc: clientVc
      } = await verifyA2AHandshakeMessage(request.params.message, {
        did
      })

      await verifyCredential(clientVc, {
        trustedIssuers: this.config.trustedIssuers,
        trustedAgentControllers: this.config.trustedAgentControllers
      })

      // We need to verify the client here
      this.authenticatedClients.add(clientDid)

      const payload = createA2AHandshakePayload({
        recipient: clientDid,
        requestNonce: clientNonce,
        vc
      })

      const { jwt } = await this.apiClient.sign(payload)

      return {
        jsonrpc: "2.0",
        id: request.id,
        result: createA2AHandshakeMessageFromJwt(Role.Agent, jwt)
      }
    } catch (error) {
      console.error(error)
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32603, message: "Identity verification failed" }
      }
    }
  }

  private async handleVerification(
    request: SendMessageRequest
  ): Promise<SendMessageResponse | undefined> {
    const message = request.params.message
    const part = message.parts.find(isVerificationPart)

    if (!part) {
      return
    }

    const { verificationChallenge } = part.data

    let success = true

    try {
      await this.apiClient.verify(verificationChallenge)
    } catch (error) {
      console.error(error)
      success = false
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        role: Role.Agent,
        parts: [{ type: "data", data: { verified: success } }]
      }
    }
  }
}
