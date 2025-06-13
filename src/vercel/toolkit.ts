import type { ToolSet } from "ai"
import { getCoreTools, type IdentityToolkitConfig } from "../core/tools"
import { toVercelTools } from "tool-adapters/vercel"

export function getIdentityHubTools(config: IdentityToolkitConfig): ToolSet {
  return toVercelTools(getCoreTools(config))
}
