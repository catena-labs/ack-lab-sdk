import type { ApiClientConfig } from "./core/types"
import { AckLabAgent } from "./agent"

/**
 * Top-level SDK class for interacting with the ACK Lab platform.
 *
 * @example
 * ```ts
 * // the client ID and secret can be used across multiple agents
 * // Generate a client ID and secret at https://ack-lab.catenalabs.com
 * const sdk = new AckLabSdk({
 *   clientId: "your-client-id",
 *   clientSecret: "your-client-secret",
 * })
 *
 * const agent = sdk.agent({ agentId: "your-agent-id" })
 *
 * agent.createPaymentRequest({
 *   id: "your-payment-request-id",
 *   amount: 100,
 *   currencyCode: "USD",
 *   description: "Service fee"
 * })
 *
 * // the same SDK instance can be used to control multiple agents in the same organization
 * const payerAgent = sdk.agent({ agentId: "payer-agent-id" })
 * const receipt = await payerAgent.executePayment(paymentRequestToken)
 *
 * // cryptographically verify the receipt
 * const { paymentRequestId, receipt } = await payerAgent.verifyPaymentReceipt(receipt)
 *
 * ```
 */
export class AckLabSdk {
  private readonly agents: Map<string, AckLabAgent>
  private readonly config: ApiClientConfig

  constructor(config: ApiClientConfig) {
    this.agents = new Map()
    this.config = config
  }

  /**
   * Get an agent instance by ID.
   *
   * @param agentId - The ID of the agent
   * @returns The agent instance
   */
  agent(agentId: string): AckLabAgent {
    if (this.agents.has(agentId)) {
      const agent = this.agents.get(agentId)

      if (agent) {
        return agent
      }
    }
    const agent = new AckLabAgent({ ...this.config, agentId })
    this.agents.set(agentId, agent)
    return agent
  }
}
