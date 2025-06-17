import type {
  FunctionDeclaration,
  FunctionResponse,
  GenerateContentResponse
} from "@google/genai"
import { getCoreTools, type IdentityToolkitConfig } from "../core/tools"
import type { ToolBase } from "tool-adapters"
import {
  handleFunctionCalls,
  toFunctionDeclarations
} from "tool-adapters/google"

export class IdentityHubToolkit {
  private tools: ToolBase[]

  constructor(private readonly config: IdentityToolkitConfig) {
    this.tools = getCoreTools(this.config)
  }

  getTools(): FunctionDeclaration[] {
    return toFunctionDeclarations(this.tools)
  }

  handleFunctionCalls(
    message: GenerateContentResponse
  ): Promise<FunctionResponse[]> {
    return handleFunctionCalls(message, this.tools)
  }
}

export function createIdentityHubToolkit(
  config: IdentityToolkitConfig
): IdentityHubToolkit {
  return new IdentityHubToolkit(config)
}
