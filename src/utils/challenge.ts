/**
 * Generate a random challenge
 * @returns A random challenge
 */
export function generateChallenge(): string {
  return crypto.randomUUID()
}
