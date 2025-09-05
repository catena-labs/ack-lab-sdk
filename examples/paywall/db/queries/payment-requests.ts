import { db } from "@/db"
import { paymentRequestsTable } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Gets a payment request token from the database
 * @param id
 * @returns
 */
export async function getDbPaymentRequest(id: string) {
  const token = await db
    .select()
    .from(paymentRequestsTable)
    .where(eq(paymentRequestsTable.id, id))

  if (token.length === 0) {
    return null
  }

  return token[0]
}
