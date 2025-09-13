import type { StepResult } from "ai"

// In the Vercel AI SDK, tools can be retried so we don't get an visible error shown if something
// went wrong unless we log the tool errors ourselves
export function logToolErrors(steps: StepResult<any>[]) {
  const toolErrors = steps.flatMap((s) =>
    s.content.filter((p) => p.type === "tool-error")
  )
  if (toolErrors.length) {
    console.log("Encountered tool errors:")
    console.log(toolErrors)
  }
}
