import {
  getDidResolver,
  isDidUri,
  verifyParsedCredential,
  type DidUri,
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

  if (!isControllerCredential(credential)) {
    throw new Error("Credential subject does not have a controller")
  }

  const controller = credential.credentialSubject.controller

  if (!options.trustedAgentControllers.includes(controller)) {
    throw new Error("Untrusted agent controller")
  }
}

/**
 * Checks if a credential is a `ControllerCredential`, which includes a
 * `controller` property in the credential subject.
 */
export function isControllerCredential(
  credential: W3CCredential
): credential is W3CCredential<{ controller: DidUri; subject: DidUri }> {
  return (
    isDidUri(credential.credentialSubject.controller) &&
    isDidUri(credential.credentialSubject.subject)
  )
}
