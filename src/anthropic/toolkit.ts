import { handleToolCalls, toAnthropicTools } from "tool-adapters/anthropic"
import { getCoreTools, type IdentityToolkitConfig } from "../core/tools"
import type Anthropic from "@anthropic-ai/sdk"
import type { ToolBase } from "tool-adapters"

export class IdentityHubToolkit {
  private tools: ToolBase[]

  constructor(private readonly config: IdentityToolkitConfig) {
    this.tools = getCoreTools(this.config)
  }

  getTools(): Anthropic.Tool[] {
    return toAnthropicTools(this.tools)
  }

  handleToolCalls(
    message: Anthropic.Message
  ): Promise<Anthropic.ToolResultBlockParam[]> {
    return handleToolCalls(message, this.tools)
  }
}

export function createIdentityHubToolkit(
  config: IdentityToolkitConfig
): IdentityHubToolkit {
  return new IdentityHubToolkit(config)
}
