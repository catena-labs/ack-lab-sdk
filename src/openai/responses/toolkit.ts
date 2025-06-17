import type { ToolBase } from "tool-adapters"
import { getCoreTools, type IdentityToolkitConfig } from "../../core/tools"
import type OpenAI from "openai"
import {
  handleResponsesToolCalls,
  toResponsesTools
} from "tool-adapters/openai"

export class IdentityHubToolkit {
  private tools: ToolBase[]

  constructor(private readonly config: IdentityToolkitConfig) {
    this.tools = getCoreTools(this.config)
  }

  getTools(): OpenAI.Responses.FunctionTool[] {
    return toResponsesTools(this.tools)
  }

  handleToolCalls(
    message: OpenAI.Responses.Response
  ): Promise<OpenAI.Responses.ResponseInputItem.FunctionCallOutput[]> {
    return handleResponsesToolCalls(message, this.tools)
  }
}

export function createIdentityHubToolkit(
  config: IdentityToolkitConfig
): IdentityHubToolkit {
  return new IdentityHubToolkit(config)
}
