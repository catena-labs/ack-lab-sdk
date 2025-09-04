import { db } from "@/db"
import { paymentRequestTokensTable } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getDbPaymentRequestToken(id: string) {
  const token = await db
    .select()
    .from(paymentRequestTokensTable)
    .where(eq(paymentRequestTokensTable.id, id))

  if (token.length === 0) {
    return null
  }

  return token[0]
}
