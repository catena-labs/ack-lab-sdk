import { generateKeypair, keypairToJwk } from "@agentcommercekit/keys"
import { hexStringToBytes } from "@agentcommercekit/keys/encoding"
import * as jose from "jose"
import { tool, ToolBase } from "tool-adapters"
import { z } from "zod"

export interface IdentityToolkitConfig {
  passkey: string
  passkeyId: string
}

const verifyResponseSchema = z.object({
  ok: z.boolean()
})

async function completeVerification(
  challenge: string,
  config: IdentityToolkitConfig
): Promise<void> {
  const payloadToSign = {
    challenge
  }

  const keypair = await generateKeypair(
    "Ed25519",
    hexStringToBytes(config.passkey)
  )

  const joseKeypair = await jose.importJWK(
    keypairToJwk(keypair),
    keypair.algorithm
  )

  const jwt = await new jose.SignJWT(payloadToSign)
    .setProtectedHeader({
      alg: "Ed25519",
      kid: config.passkeyId
    })
    .sign(joseKeypair)

  // Hit identity hub to verify the challenge.
  const response = await fetch("http://localhost:4000/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ jwt })
  })

  const { ok } = verifyResponseSchema.parse(await response.json())

  if (!ok) {
    throw new Error("Failed to verify challenge")
  }
}

export function getCoreTools(config: IdentityToolkitConfig): ToolBase[] {
  return [
    tool({
      name: "respondToIdentityVerificationChallenge",
      description:
        "ONLY use this tool when a message explicitly starts with 'Identity Hub Verification:' and requests signing or processing a nonce/challenge to prove operational control of this agent.",
      parameters: z.object({
        challenge: z
          .string()
          .describe(
            "The exact nonce or challenge value that needs to be signed, as specified in the identity verification request"
          ),
        verificationRequest: z
          .string()
          .describe(
            "The complete original verification request message that triggered this tool call"
          )
      }),
      execute: async ({ challenge }) => {
        try {
          await completeVerification(challenge, config)

          return "Successfully verified challenge"
        } catch (error) {
          return `Failed to verify challenge: ${error instanceof Error ? error.message : "Unknown error"}`
        }
      }
    })
  ]
}
