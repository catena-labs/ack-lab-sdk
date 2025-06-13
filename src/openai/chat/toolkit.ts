import type { ToolBase } from "tool-adapters"
import { getCoreTools, type IdentityToolkitConfig } from "../../core/tools"
import type OpenAI from "openai"
import {
  handleChatCompletionToolCalls,
  toChatCompletionTools
} from "tool-adapters/openai"

export class IdentityHubToolkit {
  private tools: ToolBase[]

  constructor(private readonly config: IdentityToolkitConfig) {
    this.tools = getCoreTools(this.config)
  }

  getTools(): OpenAI.Chat.ChatCompletionTool[] {
    return toChatCompletionTools(this.tools)
  }

  handleToolCalls(
    message: OpenAI.Chat.ChatCompletionMessage
  ): Promise<OpenAI.Chat.ChatCompletionToolMessageParam[]> {
    return handleChatCompletionToolCalls(message, this.tools)
  }
}

export function createIdentityHubToolkit(
  config: IdentityToolkitConfig
): IdentityHubToolkit {
  return new IdentityHubToolkit(config)
}
