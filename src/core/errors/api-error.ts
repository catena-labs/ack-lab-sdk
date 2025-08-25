import * as v from "valibot"

export const apiErrorIssuesSchema = v.variant("kind", [
  v.looseObject({
    kind: v.literal("policy")
  }),
  v.looseObject({
    kind: v.picklist(["schema", "validation", "transformation"])
  })
])

type ApiErrorIssue = v.InferOutput<typeof apiErrorIssuesSchema>

export class ApiError extends Error {
  issues: ApiErrorIssue[] = []
  statusCode?: number

  constructor(message: string, issues: ApiErrorIssue[], statusCode?: number) {
    super(message)
    this.issues = issues
    this.statusCode = statusCode
  }
}
