import { db } from "@/db"
import { paymentRequestsTable } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Gets a payment request token from the database
 * @param id
 * @returns
 */
export async function getDbPaymentRequest(id: string) {
  const requests = await db
    .select()
    .from(paymentRequestsTable)
    .where(eq(paymentRequestsTable.id, id))

  if (requests.length === 0) {
    return null
  }

  return requests[0]
}
