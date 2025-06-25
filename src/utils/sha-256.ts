/**
 * Hashes an input string or array buffer using the SHA-256 algorithm.
 *
 * @param input - The input string or array buffer to hash.
 * @returns A promise that resolves to the SHA-256 hash of the input.
 */
export async function sha256(input: ArrayBuffer | string): Promise<string> {
  const data =
    typeof input === "string" ? new TextEncoder().encode(input) : input

  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
