import {
  A2AError,
  type DataPart,
  type Message,
  type Part,
  type RequestContext
} from "@a2a-js/sdk"
import { isDidUri } from "agentcommercekit"
import {
  createA2AHandshakeMessageFromJwt,
  createA2AHandshakePayload,
  verifyA2AHandshakeMessage,
  verifyA2ASignedMessage
} from "agentcommercekit/a2a"
import { v4 } from "uuid"
import { ApiClient, type AckHubSdkConfig } from "../api-client"
import { verifyCredential } from "../utils/verify-credential"

type VerificationPart = Omit<DataPart, "data"> & {
  data: {
    verificationChallenge: string
  }
}

function isVerificationPart(part: Part): part is VerificationPart {
  return part.kind === "data" && "verificationChallenge" in part.data
}

export class AckLabServerSdk {
  private authenticatedClients = new Set<string>()
  private apiClient: ApiClient
  private config: AckHubSdkConfig

  constructor(config: AckHubSdkConfig) {
    this.apiClient = new ApiClient(config)
    this.config = config
  }

  async handleRequest(
    requestContext: RequestContext
  ): Promise<Message | undefined> {
    const message = requestContext.userMessage

    if (this.isVerificationRequest(message)) {
      return this.handleVerification(requestContext)
    }

    if (this.isAuthRequest(message)) {
      return this.handleAuthentication(requestContext)
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
        throw new A2AError(
          -32001,
          "Authentication required",
          {},
          requestContext.taskId
        )
      }
    } catch (error) {
      // There are a lot of reasons this verification could have failed.
      // We might want to refactor this to better indicate what went wrong
      console.error(error)
      throw new A2AError(
        -32001,
        "Identity verification failed",
        {},
        requestContext.taskId
      )
    }
  }

  private isVerificationRequest(message: Message): boolean {
    return message.parts.some(isVerificationPart)
  }

  private isAuthRequest(message: Message): boolean {
    return message.parts.some(
      (part) => part.kind === "data" && "jwt" in part.data
    )
  }

  private async handleAuthentication(
    requestContext: RequestContext
  ): Promise<Message> {
    try {
      const { did, vc } = await this.apiClient.getAgentMetadata()

      const {
        nonce: clientNonce,
        iss: clientDid,
        vc: clientVc
      } = await verifyA2AHandshakeMessage(requestContext.userMessage, {
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

      return createA2AHandshakeMessageFromJwt("agent", jwt)
    } catch (error) {
      console.error(error)
      throw new A2AError(
        -32603,
        "Identity verification failed",
        {},
        requestContext.taskId
      )
    }
  }

  private async handleVerification(
    requestContext: RequestContext
  ): Promise<Message | undefined> {
    const message = requestContext.userMessage
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
      kind: "message",
      messageId: v4(),
      role: "agent",
      parts: [{ kind: "data", data: { verified: success } }]
    }
  }
}
