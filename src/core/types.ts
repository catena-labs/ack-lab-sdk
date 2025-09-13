export interface ApiClientConfig {
  baseUrl?: string
  clientId: string
  clientSecret: string
}

export interface AckHubSdkConfig extends ApiClientConfig {
  trustedIssuers?: string[]
  trustedAgentControllers?: string[]
}

export interface AckLabAgentConfig extends ApiClientConfig {
  agentId: string
}
