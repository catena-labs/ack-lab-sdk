import { expect, test } from "vitest"
import { generateChallenge } from "./challenge"

test("generateChallenge", () => {
  const challenge = generateChallenge()
  expect(challenge).toBeTypeOf("string")
})
