import { beforeEach, describe, expect, it } from "vitest"
import { AckLabSdk } from "./client"

describe("sdk client", () => {
  let client: AckLabSdk

  beforeEach(() => {
    client = new AckLabSdk({
      clientId: "test",
      clientSecret: "test"
    })
  })

  describe("challenges", () => {
    it("generates a challenge for a given did", () => {
      const challenge = client.generateChallenge("did:web:agentA")
      expect(challenge).toBeTypeOf("string")

      expect(
        client.isValidChallengeForCounterparty("did:web:agentA", challenge)
      ).toBe(true)
      expect(
        client.isValidChallengeForCounterparty("did:web:agentB", challenge)
      ).toBe(false)
    })
  })
})
