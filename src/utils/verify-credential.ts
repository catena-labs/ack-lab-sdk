import {
  getDidResolver,
  verifyParsedCredential,
  type W3CCredential
} from "agentcommercekit"

interface VerifyCredentialOptions {
  trustedIssuers?: string[]
  trustedAgentControllers?: string[]
}

export async function verifyCredential(
  credential: W3CCredential,
  options: VerifyCredentialOptions
) {
  await verifyParsedCredential(credential, {
    resolver: getDidResolver(),
    trustedIssuers: options.trustedIssuers
  })

  if (!options.trustedAgentControllers) {
    return
  }

  const controller = credential.credentialSubject.controller

  if (!options.trustedAgentControllers.includes(controller)) {
    throw new Error("Untrusted agent controller")
  }
}
