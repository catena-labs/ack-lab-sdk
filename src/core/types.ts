export interface ApiClientConfig {
  baseUrl?: string
  clientId: string
  clientSecret: string
  agentId: string
}

export interface AckHubSdkConfig extends ApiClientConfig {
  trustedIssuers?: string[]
  trustedAgentControllers?: string[]
}
