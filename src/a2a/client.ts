import { A2AClient, Role } from "a2a-js"
import { v4 as uuidV4 } from "uuid"
import {
  createA2AHandshakeMessageFromJwt,
  createA2AHandshakePayload,
  verifyA2AHandshakeMessage
} from "agentcommercekit/a2a"
import type { Message } from "a2a-js"
import type { DidUri } from "agentcommercekit"
import { ApiClient } from "../api-client"
import type { AckHubSdkConfig } from "../types"
import { verifyCredential } from "../utils/verify-credential"

export class AckHubClientSdk {
  private apiClient: ApiClient
  private config: AckHubSdkConfig

  constructor(config: AckHubSdkConfig) {
    this.apiClient = new ApiClient(config)
    this.config = config
  }

  async authenticate(url: string, serverDid: DidUri) {
    const { did, vc } = await this.apiClient.getAgentMetadata()

    const payload = createA2AHandshakePayload({ recipient: serverDid, vc })

    const { jwt } = await this.apiClient.sign(payload)

    const nonce = payload.nonce

    const identityParams = {
      id: uuidV4(),
      message: createA2AHandshakeMessageFromJwt(Role.User, jwt)
    }

    const a2aClient = new A2AClient(url)

    const authResponse = await a2aClient.sendTask(identityParams)

    const { nonce: serverNonce, vc: serverVc } =
      await verifyA2AHandshakeMessage(authResponse, {
        did,
        counterparty: serverDid
      })

    await verifyCredential(serverVc, {
      trustedIssuers: this.config.trustedIssuers,
      trustedAgentControllers: this.config.trustedAgentControllers
    })

    if (serverNonce !== nonce) {
      throw new Error("Server nonce mismatch")
    }
  }

  async signMessage({ metadata, ...message }: Message) {
    const { jwt: sig } = await this.apiClient.sign({ message })

    const metadataWithSig = {
      ...metadata,
      sig
    }

    return { ...message, metadata: metadataWithSig }
  }
}
