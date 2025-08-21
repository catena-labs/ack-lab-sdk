import {
  isControllerCredential,
  isCredential,
  type Verifiable,
  type W3CCredential
} from "agentcommercekit"
import * as v from "valibot"

// The below schemas and validations should move to ACK repo when these are formally defined.
const emailVerifiedClaimSchema = v.object({
  id: v.string(),
  emailVerifiedAt: v.string()
})

const livenessClaimSchema = v.object({
  id: v.string(),
  endpointUrl: v.string()
})

type TypedCredential<T extends v.GenericSchema> = W3CCredential & {
  credentialSubject: v.InferOutput<T>
}

export function isTypedCredential<T extends v.GenericSchema>(
  credential: unknown,
  schema: T
): credential is TypedCredential<T> {
  return isCredential(credential) && v.is(schema, credential.credentialSubject)
}

export function isEmailVerificationCredential(
  credential: unknown
): credential is TypedCredential<typeof emailVerifiedClaimSchema> {
  return isTypedCredential(credential, emailVerifiedClaimSchema)
}

export function isLivenessCredential(
  credential: unknown
): credential is TypedCredential<typeof livenessClaimSchema> {
  return isTypedCredential(credential, livenessClaimSchema)
}

function findAndValidateCredential<T extends W3CCredential>(
  credentials: Verifiable<W3CCredential>[],
  type: string,
  guard: (credential: unknown) => credential is T
): T {
  const credential = credentials.find((c) => c.type.includes(type))

  console.log(`found credential for type ${type}`, credential)

  if (!guard(credential)) {
    const message = credential
      ? `Invalid ${type} credential`
      : `${type} credential not found`

    throw new Error(message)
  }

  return credential
}

export function verifyPresentationClaims(
  agentDid: string,
  credentials: Verifiable<W3CCredential>[]
) {
  const controllerCredential = findAndValidateCredential(
    credentials,
    "ControllerCredential",
    isControllerCredential
  )

  const emailVerificationCredential = findAndValidateCredential(
    credentials,
    "EmailVerificationCredential",
    isEmailVerificationCredential
  )

  if (controllerCredential.credentialSubject.id !== agentDid) {
    throw new Error("Controller credential subject does not match agent DID")
  }

  if (
    controllerCredential.credentialSubject.controller !==
    emailVerificationCredential.credentialSubject.id
  ) {
    throw new Error("Agent controller is not email verified")
  }

  const livenessCredential = findAndValidateCredential(
    credentials,
    "LivenessCredential",
    isLivenessCredential
  )

  if (livenessCredential.credentialSubject.id !== agentDid) {
    throw new Error("Liveness credential subject does not match agent DID")
  }
}
